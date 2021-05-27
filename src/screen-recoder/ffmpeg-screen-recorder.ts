import { BrowserWindow } from 'electron';
import fs from 'fs-extra';
import {
  ScreenRecorderState,
  ScreenRecorderType,
} from './screen-recorder-types';
import {
  CaptureTargetType,
  RecordScreenOptions,
} from '../ffmpeg/commons/types';
import * as FfmpegCommands from '../ffmpeg/commands';
import { ScreenRecorder } from './screen-recorder';
import { getTempRecordingFilePath } from './screen-recorder-utils';
import { getSurroundingScreenBounds } from './utils';

export class FfmpegScreenRecorder extends ScreenRecorder {
  public readonly recorderType = ScreenRecorderType.FFMPEG;
  public readonly fileExtension = 'mp4';

  public state = ScreenRecorderState.IDLE;

  private _stopCallback?: () => void;
  private _recordingPromise?: Promise<void>;
  private _tempRecordingFilePath?: string;

  constructor() {
    super();

    console.log('Creating a new instance of the ScreenRecorder');
  }

  /** The current behavior is to capture the screen that the passed in window resides in. */
  public start = (browserWindow: BrowserWindow): Promise<void> => {
    const screenBounds = getSurroundingScreenBounds(browserWindow);

    if (
      this.state !== ScreenRecorderState.IDLE &&
      this.state !== ScreenRecorderState.STOPPED
    ) {
      console.log(
        'Recording could not be started because the current state is: ',
        this.state
      );

      throw new Error('There is already a recording in progress');
    }

    this.setState(ScreenRecorderState.STARTING);

    this._tempRecordingFilePath = getTempRecordingFilePath(this.fileExtension);

    const options: RecordScreenOptions = {
      platform: process.platform,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: this._tempRecordingFilePath!,
      captureTarget: {
        type: CaptureTargetType.AREA,
        ...screenBounds,
      },
    };

    return new Promise((resolve, reject) => {
      // Note: We don't want to return the _recordingPromise because that resolves when the recording has finished
      // We want to return as soon as recording has started;
      this._recordingPromise = FfmpegCommands.recordScreen(options, {
        onFinish: () => {
          console.log('Screen recording has finished');
          this.setState(ScreenRecorderState.STOPPED);
        },
        onStart: ({ stop }) => {
          this.setState(ScreenRecorderState.RECORDING);
          this._stopCallback = stop;
          resolve();
        },
      }).catch((error) => {
        console.error('Ffmpeg exited with error: ', error);
        this.setState(ScreenRecorderState.IDLE);
        reject(error);
      });
    });
  };

  public stop = () => {
    console.log('Stopping the recording');
    if (this.state !== ScreenRecorderState.RECORDING) {
      console.log(
        `Current recorder state is: ${this.state}. Cannot stop recorder at this state`
      );

      return Promise.resolve();
    }

    if (this._stopCallback) {
      this.setState(ScreenRecorderState.STOPPING);
      this._stopCallback();
      this._stopCallback = undefined;
    }

    return this._recordingPromise ?? Promise.resolve();
  };

  public save = async (saveFilePath: string) => {
    if (!this._tempRecordingFilePath) {
      console.error(
        "There is not temp file path available. It usually means that you called 'save' before calling 'stop'"
      );
      this.setState(ScreenRecorderState.IDLE);
      throw new Error(
        'Temp recording file path is not available. Something has probably gone wrong'
      );
    }

    if (!fs.existsSync(this._tempRecordingFilePath)) {
      console.error(
        'It seems that the temp recoding file path does not exist on file system. It seems something has went very wrong.'
      );
      this.setState(ScreenRecorderState.IDLE);
      throw new Error(
        'Could not find temp recoding file. Something has probably gone wrong'
      );
    }

    this.setState(ScreenRecorderState.SAVING);

    console.debug(
      `Trying to move temp recording file from '${this._tempRecordingFilePath}' to '${saveFilePath}'`
    );
    await fs.move(this._tempRecordingFilePath, saveFilePath, {
      overwrite: true,
    });

    this._tempRecordingFilePath = undefined;
    this.setState(ScreenRecorderState.IDLE);
  };

  private setState = (newState: ScreenRecorderState) => {
    const oldState = this.state;
    this.state = newState;
    this.emit('state-changed', newState);
    console.debug(`Screen recorder state changed: ${oldState} -> ${newState}`);
  };
}
