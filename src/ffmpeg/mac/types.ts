import { DeviceInfo } from '../commons/types';

export type AVFoundationDevices = {
  videoDevices: DeviceInfo[];
  audioDevices: DeviceInfo[];
};
