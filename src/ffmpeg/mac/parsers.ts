import { DeviceType } from '../commons/types';
import { DEFAULT_DEVICE_INFO } from '../win32/constants';
import { DeviceInfo } from '../win32/types';

// TODO: Complete the patterns
const DEVICE_INFO_PREFIX_PATTERN = /^\[AVFoundation/;
const VIDEO_SECTION_HEADER_PATTERN = /AVFoundation\video\sdevices/;
const AUDIO_SECTION_HEADER_PATTERN = /AVFoundation\saudio\sdevices/;
const DEVICE_NAME_PATTERN = /^\[AVFoundation.*?\]\s\[(\d*?)\]\s(.*)$/;

function isDeviceInfoLine(line: string) {
  return line.search(DEVICE_INFO_PREFIX_PATTERN) > -1;
}

function isVideoSectionHeaderLine(line: string) {
  return line.search(VIDEO_SECTION_HEADER_PATTERN) > -1;
}

function isAudioSectionHeaderLine(line: string) {
  return line.search(AUDIO_SECTION_HEADER_PATTERN) > -1;
}

export type AVFoundationDevices = {
  videoDevices: DeviceInfo[];
  audioDevices: DeviceInfo[];
};

export function parseAVFoundationDevices(input: string) {
  const devices: AVFoundationDevices = {
    videoDevices: [],
    audioDevices: [],
  };

  let isVideo = true;
  let deviceIndex = 0;

  for (const line of input.split('\n').filter(isDeviceInfoLine)) {
    if (isVideoSectionHeaderLine(line)) {
      isVideo = true;
      deviceIndex = 0;
      continue;
    }

    if (isAudioSectionHeaderLine(line)) {
      isVideo = false;
      deviceIndex = 0;
      continue;
    }

    const params = line.match(DEVICE_NAME_PATTERN);

    if (params) {
      const deviceName = params[1];

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

      deviceIndex++;
    }
  }

  return devices;
}
