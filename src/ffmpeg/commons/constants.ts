import { DeviceInfo, DeviceType } from './types';

export const DEFAULT_REAL_TIME_BUFFER_SIZE = '150M';
export const DEFAULT_INPUT_FRAME_RATE = 30;
export const DEFAULT_OUTPUT_FRAME_RATE = 30;

export const DEFAULT_DEVICE_INFO: DeviceInfo = {
  id: '',
  name: '',
  alternativeName: '',
  type: DeviceType.Video,
};
