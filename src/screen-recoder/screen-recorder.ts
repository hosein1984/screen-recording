import {
  ScreenRecorderState,
  ScreenRecorderType,
} from './screen-recorder-types';
import { BrowserWindow } from 'electron';
import { TypedEmitter } from 'tiny-typed-emitter';

interface ScreenRecorderEvents {
  'state-changed': (state: ScreenRecorderState) => void;
}

export abstract class ScreenRecorder extends TypedEmitter<ScreenRecorderEvents> {
  public abstract state: ScreenRecorderState;
  public abstract readonly recorderType: ScreenRecorderType;
  public abstract readonly fileExtension: string;
  public abstract start(browserWindow: BrowserWindow): Promise<void>;
  public abstract stop(): Promise<void>;
  public abstract save(saveFilePath: string): Promise<void>;
}
