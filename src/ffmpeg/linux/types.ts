import {
  AreaCaptureTarget,
  Platform,
  DeviceIOType,
  EntireScreenCaptureTarget,
  RecordScreenOptions,
} from '../commons/types';

export type Monitor = {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
};

export type Screen = {
  id: number;
  width: number;
  height: number;

  monitors: Monitor[];
};

export type DisplayInfo = {
  id: number;
  defaultScreen?: number;
  screens: Screen[];
};

export type AudioDevice = {
  id: number;
  name: string;
  io: DeviceIOType;
  isDefault: boolean;
  isMonitor: boolean;
};

export type LinuxEntireScreenCaptureTarget = {
  displayId: number;
} & EntireScreenCaptureTarget;

export type LinuxAreaCaptureTarget = {
  displayId: number;
  screenId: number;
} & AreaCaptureTarget;

export type LinuxCaptureTargets =
  | LinuxEntireScreenCaptureTarget
  | LinuxAreaCaptureTarget;

export type LinuxRecordScreenOptions = {
  platform: Platform.LINUX;
  captureTarget: LinuxCaptureTargets;
} & RecordScreenOptions;
