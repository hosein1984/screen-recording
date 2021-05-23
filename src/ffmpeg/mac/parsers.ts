import { DEFAULT_DEVICE_INFO } from '../commons/constants';
import { DeviceType } from '../commons/types';
import { AVFoundationDevices } from './types';

export function parseAVFoundationDevices(input: string) {
  const DEVICE_INFO_PREFIX_PATTERN = /^\[AVFoundation/;
  const VIDEO_SECTION_HEADER_PATTERN = /AVFoundation\video\sdevices/;
  const AUDIO_SECTION_HEADER_PATTERN = /AVFoundation\saudio\sdevices/;
  const DEVICE_NAME_PATTERN = /^\[AVFoundation.*?\]\s\[(\d*?)\]\s(.*)$/;

  const isDeviceInfoLine = (line: string) =>
    line.search(DEVICE_INFO_PREFIX_PATTERN) > -1;

  const isVideoSectionHeaderLine = (line: string) =>
    line.search(VIDEO_SECTION_HEADER_PATTERN) > -1;

  const isAudioSectionHeaderLine = (line: string) =>
    line.search(AUDIO_SECTION_HEADER_PATTERN) > -1;

  const devices: AVFoundationDevices = {
    videoDevices: [],
    audioDevices: [],
  };

  let isVideo = true;

  for (const line of input.split('\n').filter(isDeviceInfoLine)) {
    if (isVideoSectionHeaderLine(line)) {
      isVideo = true;
      continue;
    }

    if (isAudioSectionHeaderLine(line)) {
      isVideo = false;
      continue;
    }

    const params = line.match(DEVICE_NAME_PATTERN);

    if (params) {
      const [, deviceIndex, deviceName] = params;

      const device = {
        ...DEFAULT_DEVICE_INFO,
        id: `${deviceIndex}`,
        name: deviceName,
        alternativeName: '',
        type: isVideo ? DeviceType.Video : DeviceType.Audio,
      };

      if (isVideo) {
        devices.videoDevices.push(device);
      } else {
        devices.audioDevices.push(device);
      }
    }
  }

  return devices;
}
