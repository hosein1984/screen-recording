import {
  AreaCaptureTarget,
  CaptureTarget,
  Platform,
  CaptureTargetType,
  DeviceType,
  EntireScreenCaptureTarget,
  RecordScreenOptions,
  WindowCaptureTarget,
} from '../commons/types';

export type DeviceInfo = {
  id: string;
  name: string;
  alternativeName: string;
  type: DeviceType;
};

export type DirectShowDevices = {
  videoDevices: DeviceInfo[];
  audioDevices: DeviceInfo[];
};

export type Win32EntireScreenCaptureTarget = EntireScreenCaptureTarget;

export type Win32AreaCaptureTarget = AreaCaptureTarget;

export type Win32WindowCaptureTarget = WindowCaptureTarget;

export type Win32CaptureTargets =
  | Win32EntireScreenCaptureTarget
  | Win32AreaCaptureTarget
  | Win32WindowCaptureTarget;

export type Win32RecordScreenOptions = {
  platform: Platform.WIN32;
  captureTarget: Win32CaptureTargets;
} & RecordScreenOptions;
