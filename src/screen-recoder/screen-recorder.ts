import { BrowserWindow } from 'electron';
import { recordScreen } from '../ffmpeg/commands';
import {
  CaptureTargetType,
  RecordScreenOptions,
} from '../ffmpeg/commons/types';
import { RecorderState } from './types';
import { getSurroundingScreenBounds } from './utils';
import { EventEmitter } from 'events';

export class ScreenRecorder extends EventEmitter {
  private _state = RecorderState.IDLE;
  private _stopCallback?: () => void;
  private _recordingPromise?: Promise<void>;

  constructor() {
    super();

    console.log('Creating a new instance of the ScreenRecorder');
  }

  /** The current behavior is to capture the screen that the passed in window resides in. */
  public start = (browserWindow: BrowserWindow, saveFilePath: string) => {
    const screenBounds = getSurroundingScreenBounds(browserWindow);

    if (this._state !== RecorderState.IDLE) {
      console.log(
        'Recording could not be started because the current state is: ' +
          this._state
      );

      throw new Error('There is already a recording in progress');
    }

    this.setState(RecorderState.STARTING);

    const options: RecordScreenOptions = {
      platform: process.platform,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: './recording.mp4',
      captureTarget: {
        type: CaptureTargetType.AREA,
        ...screenBounds,
      },
    };

    this._recordingPromise = recordScreen(options, {
      onFinish: () => {
        console.log('Screen recording has finished');
        this.setState(RecorderState.IDLE);
      },
      onStart: (_ffmpegCommand, stop) => {
        this.setState(RecorderState.RECORDING);
        this._stopCallback = stop;
      },
    }).catch((error) => {
      console.error('Ffmpeg exited with error: ', error);
      this.setState(RecorderState.IDLE);
    });
  };

  public stop = () => {
    console.log('Stopping the recording');
    if (this._state !== RecorderState.RECORDING) {
      console.log(
        'Current recorder state is: ',
        this._state,
        ' Cannot stop recorder at this state'
      );

      return Promise.resolve();
    }

    if (this._stopCallback) {
      this.setState(RecorderState.STOPPING);
      this._stopCallback();
      this._stopCallback = undefined;
    }

    return this._recordingPromise || Promise.resolve();
  };

  private setState(newState: RecorderState) {
    const oldState = this._state;
    this._state = newState;
    this.emit('state-changed', newState);
    console.log(`Screen recorder state changed: ${oldState} -> ${newState}`);
  }
}
