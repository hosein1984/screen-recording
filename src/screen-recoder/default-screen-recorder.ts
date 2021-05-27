import fs from 'fs-extra';
import {
  getBestSupportedMediaRecorderVideoFormat,
  getTempRecordingFilePath,
  convertToSeekableBlob,
} from './screen-recorder-utils';
import { PromiseUtils } from '../utils/promise-utils';
import { BrowserWindow, desktopCapturer, remote } from 'electron';
import { ScreenRecorder } from './screen-recorder';
import {
  ScreenRecorderState,
  ScreenRecorderType,
} from './screen-recorder-types';
import * as FfmpegCommands from '../ffmpeg/commands';
import { createWriteStream, WriteStream } from 'fs';

const MEDIA_ACQUISITION_TIME_OUT = 2000;

/**
 * NOTE: Since this class uses MediaRecorder under the hood it can only be used in the renderer process.
 *
 * A few notes about how this Recorder works:
 * * It records the screen that the window the specified window belongs to
 * * It will save the recording in a streaming manner to reduce the memory pressure of recording
 *   (which can be huge. I had a recording of 25 min which had a size of 1GB. We don't want to keep all that buffer in memory)
 * * Since it is streaming the data to file, we will save them in a temp recording file.
 * * By default the recorded media by MediaRecorder is not seekable. Therefore we will remux the resulting temp recording with ffmpeg
 *   to the final recording file
 */
export class DefaultScreenRecorder extends ScreenRecorder {
  public readonly recorderType = ScreenRecorderType.DEFAULT;
  public readonly fileExtension: string;
  public readonly mimeType: string;

  public state = ScreenRecorderState.IDLE;

  private _mediaRecorder?: MediaRecorder;
  private _mediaStream?: MediaStream;
  private _tempFilePath?: string;
  private _tempFileStream?: WriteStream;
  private _tempFileWriteTasksQueue?: Promise<void>;

  constructor() {
    super();

    this.fileExtension = 'webm';
    this.mimeType = 'video/webm;codecs=vp8';
  }

  public async start(browserWindow: BrowserWindow) {
    console.log('Trying to start recording...');

    if (!this.canStartRecording()) {
      throw new Error(
        `Recording could not be started because the current state is: ${this.state}`
      );
    }

    // Clear previous recorded data
    this.initializeDate();
    this.setState(ScreenRecorderState.STARTING);

    // Acquire media streams
    const screenSourceId = await this.findSurroundingScreenMediaSourceId(
      browserWindow
    );

    // Contains both audio and video tracks
    const desktopStream = await this.getDesktopStream(screenSourceId);
    const microphoneAudioStream = await this.getMicrophoneAudioStream();

    const mixedAudioStream = this.mixAudioStreams(
      desktopStream,
      microphoneAudioStream
    );

    this._mediaStream = this.getMixedVideoAndAudioStream(
      desktopStream,
      mixedAudioStream
    );

    if (!this._mediaStream) {
      this.setState(ScreenRecorderState.IDLE);
      throw new Error('Could not acquire any media streams');
    }

    try {
      // Initialize media recorder
      console.log('Initializing MediaRecorder');
      this._mediaRecorder = new MediaRecorder(this._mediaStream, {
        mimeType: this.mimeType,
      });
      this.initializeRecorderEvents();
      console.log('MediaRecorder Initialized');
      //
      console.log('Starting media recorder');
      this._mediaRecorder.start(1000); // use 1 second time slices
    } catch (e) {
      this.setState(ScreenRecorderState.IDLE);
      throw new Error('Could not initialize and start media recorder');
    }
  }

  public stop(): Promise<void> {
    console.log('Trying to stop recording...');

    if (this.state !== ScreenRecorderState.RECORDING) {
      return Promise.reject(
        new Error(
          `Recording could not be stopped because the current state is: ${this.state}`
        )
      );
    }

    return new Promise((resolve, reject) => {
      this._mediaRecorder!.onstop = () => {
        this.logEvent('stop');

        this.closeMediaStream();

        this.setState(ScreenRecorderState.STOPPED);

        if (this._tempFileWriteTasksQueue) {
          this._tempFileWriteTasksQueue
            .then(() => {
              console.log('Closing the temp recording file stream');
              this._tempFileStream?.end();

              resolve();
            })
            .catch(reject);
        } else {
          reject(
            new Error('Nothing has been written to the temporary record file')
          );
        }
      };

      this._mediaRecorder!.onerror = (e) => {
        this.logEvent('error = ' + e.error);
        reject(e.error);
      };

      this.setState(ScreenRecorderState.STOPPING);
      this._mediaRecorder!.stop();
    });
  }

  public async save(filePath: string) {
    console.log('Trying to save recorded media...');

    if (!filePath) {
      throw new Error('The file path is empty!');
    }

    if (this.state !== ScreenRecorderState.STOPPED) {
      console.error();
      throw new Error(
        `The recorded media could not be saved because the current state is: ${this.state}`
      );
    }

    if (!this._tempFilePath) {
      throw new Error(
        'There is no temp recording file available. Something probably has gone wrong'
      );
    }

    this.setState(ScreenRecorderState.SAVING);

    try {
      console.log('Remuxing the recorded media using ffmpeg');
      await FfmpegCommands.remuxFile(this._tempFilePath, filePath); // This process is usually very fast

      console.log('Removing the temp recording file');
      await fs.remove(this._tempFilePath);

      console.log('Recorded media saved successfully');

      this._tempFilePath = undefined;

      this.setState(ScreenRecorderState.IDLE);
    } catch (err) {
      this.setState(ScreenRecorderState.IDLE);
      throw new Error(
        `An error occurred while saving recording meeting. The reason is: ${err}`
      );
    }
  }

  private initializeRecorderEvents() {
    if (!this._mediaRecorder) {
      return;
    }

    this._mediaRecorder.onstart = this.handleRecorderStartEvent;
    this._mediaRecorder.ondataavailable = this.handleRecorderDataAvailableEvent;
    this._mediaRecorder.onpause = () => this.logEvent('pause');
    this._mediaRecorder.onresume = () => this.logEvent('resume');
    this._mediaRecorder.onerror = (e) => this.logEvent('error = ' + e.error);
  }

  private handleRecorderStartEvent = () => {
    this.logEvent('start');
    this.setState(ScreenRecorderState.RECORDING);
  };

  private handleRecorderDataAvailableEvent = (e: BlobEvent) => {
    this.logEvent('data available with size: ' + e.data.size);

    /**
     * It might not be obvious what this is doing.
     * The functionality is pretty simple: convert the Blob -> ArrayBuffer -> Buffer -> Write it to temp file
     * But why is it wrapped in a task (promise). The reason is that we need a way to know when the
     * conversion and writing process is done to close the file when the user stops recording.
     * Therefore we queue each writeTask one after the other in a promise chain. So we can wait for all of them to finish in Stop method
     */
    const writeTask = async (): Promise<void> => {
      const arrayBuffer = await e.data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return new Promise((resolve, reject) => {
        this._tempFileStream?.write(buffer, (error) => {
          if (error) {
            reject(error);
          }
          resolve();
        });
      });
    };

    this._tempFileWriteTasksQueue?.then(writeTask);
  };

  private getMixedVideoAndAudioStream(
    videoStream?: MediaStream,
    audioStream?: MediaStream
  ) {
    if (videoStream && audioStream) {
      const mixed = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      return mixed;
    } else if (videoStream) {
      return videoStream;
    } else if (audioStream) {
      return audioStream;
    } else {
      return undefined;
    }
  }

  private mixAudioStreams(
    desktopStream?: MediaStream,
    microphoneAudioStream?: MediaStream
  ) {
    const audioContext = new AudioContext();
    const destinationStream = audioContext.createMediaStreamDestination();

    if (desktopStream) {
      const speakerGain = audioContext.createGain();
      speakerGain.gain.value = 1.0;
      audioContext
        .createMediaStreamSource(desktopStream)
        .connect(speakerGain)
        .connect(destinationStream);
    }

    if (microphoneAudioStream) {
      const microphoneGain = audioContext.createGain();
      microphoneGain.gain.value = 1.0;
      audioContext
        .createMediaStreamSource(microphoneAudioStream)
        .connect(microphoneGain)
        .connect(destinationStream);
    }

    return destinationStream.stream;
  }

  private async getDesktopStream(mediaSourceId: string) {
    // The reason that I didn't use MediaStreamConstraints here is that the "mandatory" property is
    // Chrome specific and thus does not exist on the typescript type definition.
    // Please refer to: https://github.com/microsoft/TypeScript/issues/22897#issuecomment-379207368
    const constraints: any = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: mediaSourceId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: mediaSourceId,
        },
      },
    };
    return await this.getMediaStream('Desktop Stream', constraints);
  }

  private async getMicrophoneAudioStream() {
    const constraints = {
      audio: {
        echoCancellation: true,
      },
      video: false,
    };
    return await this.getMediaStream('Microphone Audio', constraints);
  }

  private async getMediaStream(
    mediaName: string,
    constraints: MediaStreamConstraints
  ) {
    console.log(
      `Trying to acquire "${mediaName}" media stream with these constraints: `,
      constraints
    );

    let stream: MediaStream | undefined = undefined;
    try {
      stream = await PromiseUtils.promiseTimeout(
        MEDIA_ACQUISITION_TIME_OUT,
        navigator.mediaDevices.getUserMedia(constraints)
      );
      console.log(`"${mediaName}" media stream acquired for recording`);
    } catch (err) {
      console.error(
        `"${mediaName}" media stream could not be acquired because: ` + err
      );
    }

    return stream;
  }

  private setState(newState: ScreenRecorderState) {
    const oldState = this.state;
    this.state = newState;
    console.log(`Meeting recorder state changed: ${oldState} -> ${newState}`);
    this.emit('state-changed', newState);
  }

  private closeMediaStream() {
    if (!this._mediaStream) {
      return;
    }
    //
    const mediaTracks = this._mediaStream.getTracks();
    console.log(`Closing media stream with ${mediaTracks.length} tracks`);
    //
    for (const track of mediaTracks) {
      track.stop();
    }
    //
    console.log('Media stream closed completely');
    this._mediaStream = undefined;
  }

  private logEvent(event: string) {
    console.log('Media Recorder Event: ' + event);
  }

  private canStartRecording() {
    return (
      this.state === ScreenRecorderState.IDLE ||
      this.state === ScreenRecorderState.STOPPED
    );
  }

  private initializeDate() {
    this._mediaRecorder = undefined;
    this._tempFilePath = getTempRecordingFilePath(this.fileExtension);
    this._tempFileStream = createWriteStream(this._tempFilePath);
    this._tempFileWriteTasksQueue = Promise.resolve();
  }

  private async findSurroundingScreenMediaSourceId(
    browserWindow: BrowserWindow
  ) {
    const screenSources = await desktopCapturer.getSources({
      types: ['screen'],
    });

    const windowBounds = browserWindow.getBounds();
    const display = remote.screen.getDisplayMatching(windowBounds);

    // Per documentation the display_id of sources correspond to the id of the displays returned from screen API, so
    const result = screenSources.find((s) => s.display_id === `${display.id}`)!;

    return result.id;
  }
}
