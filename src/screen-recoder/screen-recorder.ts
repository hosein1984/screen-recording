import { BrowserWindow } from 'electron';
import { recordScreen } from '../ffmpeg/commands';
import {
  CaptureTargetType,
  RecordScreenOptions,
} from '../ffmpeg/commons/types';
import { RecorderState } from './types';
import { getSurroundingScreenBounds } from './utils';
import { EventEmitter } from 'events';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { format } from 'date-fns';
import { reject } from 'lodash';
import { existsSync } from 'original-fs';
import { move } from 'fs-extra';

export class ScreenRecorder extends EventEmitter {
  private _state = RecorderState.IDLE;
  private _stopCallback?: () => void;
  private _recordingPromise?: Promise<void>;
  private _tempRecordingFilePath?: string;

  constructor() {
    super();

    console.log('Creating a new instance of the ScreenRecorder');
  }

  /** The current behavior is to capture the screen that the passed in window resides in. */
  public start = (browserWindow: BrowserWindow) => {
    const screenBounds = getSurroundingScreenBounds(browserWindow);

    if (
      this._state !== RecorderState.IDLE &&
      this._state !== RecorderState.STOPPED
    ) {
      console.log(
        'Recording could not be started because the current state is: ' +
          this._state
      );

      throw new Error('There is already a recording in progress');
    }

    this.setState(RecorderState.STARTING);

    this._tempRecordingFilePath = resolve(
      tmpdir(),
      `Fluxble Recording - ${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.mp4`
    );

    const options: RecordScreenOptions = {
      platform: process.platform,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: this._tempRecordingFilePath,
      captureTarget: {
        type: CaptureTargetType.AREA,
        ...screenBounds,
      },
    };

    this._recordingPromise = recordScreen(options, {
      onFinish: () => {
        console.log('Screen recording has finished');
        this.setState(RecorderState.STOPPED);
      },
      onStart: ({ stop, kill }) => {
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

  public save = async (saveFilePath: string) => {
    if (!this._tempRecordingFilePath) {
      this.setState(RecorderState.IDLE);
      throw new Error(
        'Temp recording file path is not available. Something has probably gone wrong'
      );
    }

    if (!existsSync(this._tempRecordingFilePath)) {
      this.setState(RecorderState.IDLE);
      throw new Error(
        'Could not find temp recoding file. Something has probably gone wrong'
      );
    }

    this.setState(RecorderState.SAVING);

    await move(this._tempRecordingFilePath, saveFilePath, {
      overwrite: true,
    });

    this._tempRecordingFilePath = undefined;
    this.setState(RecorderState.IDLE);
  };

  private setState = (newState: RecorderState) => {
    const oldState = this._state;
    this._state = newState;
    this.emit('state-changed', newState);
    console.log(`Screen recorder state changed: ${oldState} -> ${newState}`);
  };
}
