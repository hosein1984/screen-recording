import { FfmpegCommand } from 'fluent-ffmpeg';
import { ChildProcess } from 'child_process';

export enum DeviceType {
  Audio = 'audio',
  Video = 'video',
}

export enum DeviceIOType {
  UNKNOWN = 'unknown',
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum Platform {
  WIN32 = 'win32',
  LINUX = 'linux',
  MAC = 'mac',
}

export enum CaptureTargetType {
  ENTIRE_DISPLAY = 'entireDisplay',
  AREA = 'area',
  WINDOW = 'window',
}

export type CaptureTarget = {
  type: CaptureTargetType;
};

export type EntireScreenCaptureTarget = {
  type: CaptureTargetType.ENTIRE_DISPLAY;
} & CaptureTarget;

export type AreaCaptureTarget = {
  type: CaptureTargetType.AREA;
  x: number;
  y: number;
  width: number;
  height: number;
} & CaptureTarget;

export type WindowCaptureTarget = {
  type: CaptureTargetType.WINDOW;
  windowName: string;
} & CaptureTarget;

export type RecordScreenOptions = {
  platform: Platform;
  captureDesktopAudio: boolean;
  captureMicrophoneAudio: boolean;
  filePath: string;
  captureTarget: CaptureTarget;
  ffmpegPath?: string;
};

export interface FfmpegCommandCallbacks {
  onStart?: (ffmpegCommand: string, stop: () => void) => void;
  onFinish?: () => void;
}

export interface FfmpegCommandExt extends FfmpegCommand {
  ffmpegProc?: ChildProcess;
}

export type FfmpegKillSignals =
  | 'SIGKILL' // Kill
  | 'SIGSTOP' // Stop (pause)
  | 'SIGCONT'; // Resume
