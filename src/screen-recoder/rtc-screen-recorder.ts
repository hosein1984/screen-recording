import fs from 'fs-extra';
import {
  getBestSupportedMediaRecorderVideoFormat,
  getTempRecordingFilePath,
  convertToSeekableBlob,
} from './screen-recorder-utils';
import { PromiseUtils } from '../utils/promise-utils';
import { BrowserWindow } from 'electron';
import { ScreenRecorder } from './screen-recorder';
import {
  ScreenRecorderState,
  ScreenRecorderType,
} from './screen-recorder-types';
import * as FfmpegCommands from '../ffmpeg/commands';
import RecordRTC from 'recordrtc';

const MEDIA_ACQUISITION_TIME_OUT = 2000;

/**
 * NOTE: Since this class uses MediaRecorder under the hood it can only be used in the renderer process.
 */
export class RtcScreenRecorder extends ScreenRecorder {
  public readonly recorderType = ScreenRecorderType.DEFAULT;
  public readonly fileExtension: string;

  public state = ScreenRecorderState.IDLE;

  private _recordedChunks: Blob[] = [];
  private _saveFilePath = '';
  private _mimeType: string;
  private _mediaRecorder?: MediaRecorder;
  private _mediaStream?: MediaStream;

  constructor() {
    super();

    const mediaFormat = getBestSupportedMediaRecorderVideoFormat();

    this.fileExtension = mediaFormat.extension;
    this._mimeType = mediaFormat.mimeType;
  }

  public async start(window: BrowserWindow) {
    console.log('Trying to start recording...');

    if (
      this.state !== ScreenRecorderState.IDLE &&
      this.state !== ScreenRecorderState.STOPPED
    ) {
      console.error(
        'Recording could not be started because the current state is: ',
        this.state
      );
      return;
    }

    // Clear previous recorded data
    this._mediaRecorder = undefined;
    this._recordedChunks = [];
    this._saveFilePath = '';

    this.setState(ScreenRecorderState.STARTING);

    // Acquire media streams
    const windowMediaSourceId = window.getMediaSourceId();
    const windowVideoStream = await this.getWindowVideoStream(
      windowMediaSourceId
    );
    const speakerAudioStream = await this.getSpeakerAudioStream(
      windowMediaSourceId
    );
    const microphoneAudioStream = await this.getMicrophoneAudioStream();
    // const mixedAudioStream = this.getMixedAudioStream(
    //   speakerAudioStream,
    //   microphoneAudioStream
    // );
    // this._mediaStream = this.getMixedVideoAndAudioStream(
    //   windowVideoStream,
    //   mixedAudioStream
    // );

    // if (!this._mediaStream) {
    //   console.error('Could not acquire any media stream');
    //   this.setState(ScreenRecorderState.IDLE);
    //   return;
    // }

    try {
      // Initialize media recorder
      console.log('Initializing MediaRecorder');
      // this._mediaRecorder = new MediaRecorder(this._mediaStream, {
      //   mimeType: this._mimeType,
      // });
      // this.initializeRecorderEvents();
      // console.log('MediaRecorder Initialized');
      // //
      // console.log('Starting media recorder');
      // this._mediaRecorder.start();
      let recorder = new RecordRTC(
        [windowVideoStream, speakerAudioStream, microphoneAudioStream],
        {
          type: 'video',
          mimeType: 'video/webm',
          video: {
            width: 1080,
            height: 720,
          },
        }
      );

      recorder.startRecording();

      const sleep = (m: number) => new Promise((r) => setTimeout(r, m));
      await sleep(60 * 1000);

      recorder.stopRecording(function () {
        let blob = recorder.getBlob();
        RecordRTC.invokeSaveAsDialog(blob);
      });
    } catch (e) {
      console.log('Could not initialize and start media recorder');
      this.setState(ScreenRecorderState.IDLE);
    }
  }

  public stop(): Promise<void> {
    console.log('Trying to stop recording...');

    if (this.state != ScreenRecorderState.RECORDING) {
      console.error(
        'Recording could not be stopped because the current state is: ' +
          this.state
      );
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this._saveFilePath = '';

      this._mediaRecorder!.onstop = () => {
        this.logEvent('stop');

        this.closeMediaStream();

        this.setState(ScreenRecorderState.STOPPED);

        // TODO: Not sure why these are here. But commented for now. That either never worked or makes calling save from outside redundant
        // if (this._saveFilePath) {
        //   this.save(this._saveFilePath);
        //   this._saveFilePath = "";
        // }
        resolve();
      };

      this._mediaRecorder!.onerror = (e) => {
        this.logEvent('error = ' + e.error);
        reject(e.error);
      };

      this.setState(ScreenRecorderState.STOPPING);
      this._mediaRecorder!.stop();
    });
  }

  private initializeRecorderEvents() {
    if (!this._mediaRecorder) {
      return;
    }

    this._mediaRecorder.onstart = this.handleRecorderStartEvent;
    // TODO: Commented for now. Look at the stop method for more info
    // this._mediaRecorder.onstop = this.handleRecorderStopEvent;
    this._mediaRecorder.ondataavailable = this.handleRecorderDataAvailableEvent;
    this._mediaRecorder.onpause = () => this.logEvent('pause');
    this._mediaRecorder.onresume = () => this.logEvent('resume');
    this._mediaRecorder.onerror = (e) => this.logEvent('error = ' + e.error);
  }

  private handleRecorderStartEvent = () => {
    this.logEvent('start');
    this.setState(ScreenRecorderState.RECORDING);
  };

  private handleRecorderStopEvent = () => {
    this.logEvent('stop');

    this.closeMediaStream();

    this.setState(ScreenRecorderState.STOPPED);

    if (this._saveFilePath) {
      this.save(this._saveFilePath);
      this._saveFilePath = '';
    }
  };

  private handleRecorderDataAvailableEvent = (e: BlobEvent) => {
    this.logEvent('data available with size: ' + e.data.size);
    this._recordedChunks.push(e.data);
  };

  private getMixedVideoAndAudioStream(
    videoStream?: MediaStream,
    audioStream?: MediaStream
  ) {
    if (videoStream && audioStream) {
      const videoTrack = videoStream.getVideoTracks()[0];
      const audioTrack = audioStream.getAudioTracks()[0];
      const mixed = new MediaStream();
      mixed.addTrack(videoTrack);
      mixed.addTrack(audioTrack);
      return mixed;
    } else if (videoStream) {
      return videoStream;
    } else if (audioStream) {
      return audioStream;
    } else {
      return undefined;
    }
  }

  private getMixedAudioStream(
    speakerAudioStream?: MediaStream,
    microphoneAudioStream?: MediaStream
  ) {
    if (speakerAudioStream && microphoneAudioStream) {
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(speakerAudioStream).connect(dest);
      audioContext.createMediaStreamSource(microphoneAudioStream).connect(dest);
      return dest.stream;
    } else if (speakerAudioStream) {
      return speakerAudioStream;
    } else if (microphoneAudioStream) {
      return microphoneAudioStream;
    } else {
      return undefined;
    }
  }

  private async getWindowVideoStream(windowMediaSourceId: string) {
    // The reason that I didn't use MediaStreamConstraints here is that the "mandatory" property is
    // Chrome specific and thus does not exist on the typescript type definition.
    // Please refer to: https://github.com/microsoft/TypeScript/issues/22897#issuecomment-379207368
    const constraints: any = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: windowMediaSourceId,
        },
      },
    };
    return await this.getMediaStream('Window Video', constraints);
  }

  // Getting speaker audio stream is not possible. We should extract it from a full media stream.
  private async getSpeakerAudioStream(windowMediaSourceId: string) {
    // The reason that I didn't use MediaStreamConstraints here is that the "mandatory" property is
    // Chrome specific and thus does not exist on the typescript type definition.
    // Please refer to: https://github.com/microsoft/TypeScript/issues/22897#issuecomment-379207368
    const constraints: any = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: windowMediaSourceId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: windowMediaSourceId,
        },
      },
    };
    const stream = await this.getMediaStream('Speaker Audio', constraints);

    if (stream) {
      console.debug('Removing video track from speaker stream');
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.stop();
      stream.removeTrack(videoTrack);
      console.debug('Video track removed from speaker stream');
    }

    return stream;
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

  public async save(filePath: string) {
    console.log('Trying to save recorded media...');

    if (!filePath) {
      console.error('The file path is empty!');
      return;
    }

    if (this.state === ScreenRecorderState.STOPPING) {
      this._saveFilePath = filePath;
      console.log('The recorded media will be saved on stop event');
      return;
    }

    if (this.state !== ScreenRecorderState.STOPPED) {
      console.error(
        'The recorded media could not be saved because the current state is: ',
        this.state
      );
      return;
    }

    if (!this._recordedChunks || this._recordedChunks.length < 1) {
      console.error('There is no recording data to save!');
      return;
    }

    this.setState(ScreenRecorderState.SAVING);

    try {
      console.log(
        'The recorded media chunks count is: ' + this._recordedChunks.length
      );
      console.log('Writing recorded media to blob');
      let blob = new Blob(this._recordedChunks, {
        type: this._mimeType,
      });
      console.log('The blob size is: ' + blob.size);

      // if (false) {
      if (await FfmpegCommands.isFfmpegInstalled()) {
        // We will use ffmpeg to remux the generated file

        console.log('Writing recorded media to buffer');
        const arrayBuffer = await blob.arrayBuffer();
        console.log(
          'The array buffer byteLength is: ' + arrayBuffer.byteLength
        );
        //
        console.log('Converting array buffer to buffer');
        const buffer = Buffer.from(arrayBuffer);
        console.log('The buffer byteLength is: ' + buffer.byteLength);
        console.log('The buffer length is: ' + buffer.length);
        //

        // First we save the recording to a temp file and then convert it using ffmpeg to resolve the seekablity issue
        const tempFilePath = getTempRecordingFilePath(this.fileExtension);

        console.log('Writing recorded media to temp file: ' + tempFilePath);
        await fs.writeFile(tempFilePath, buffer);

        console.log('Remuxing the recorded media using ffmpeg');
        await FfmpegCommands.remuxFile(tempFilePath, filePath); // This process is usually very fast

        console.log('Removing the temp recording file');
        await fs.remove(tempFilePath);
      } else {
        // Otherwise we will use ts-ebml to inject meta data into the blob and make it seekable
        blob = await convertToSeekableBlob(blob);
        console.log('Writing recorded media to buffer');
        const arrayBuffer = await blob.arrayBuffer();
        console.log(
          'The array buffer byteLength is: ' + arrayBuffer.byteLength
        );
        //
        console.log('Converting array buffer to buffer');
        const buffer = Buffer.from(arrayBuffer);
        console.log('The buffer byteLength is: ' + buffer.byteLength);
        console.log('The buffer length is: ' + buffer.length);

        console.log('Writing recorded media to file: ' + filePath);
        await fs.writeFile(filePath, buffer);
      }

      console.log('Recorded media saved successfully');

      this.setState(ScreenRecorderState.IDLE);
    } catch (err) {
      console.error(
        'An error occurred while saving recording meeting. The reason is: ' +
          err
      );
      this.setState(ScreenRecorderState.IDLE);
    }
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
}
