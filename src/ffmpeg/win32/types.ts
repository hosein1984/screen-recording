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
