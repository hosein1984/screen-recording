import { DeviceType } from '../commons/types';
import { DEFAULT_DEVICE_INFO } from './constants';
import { DirectShowDevices } from './types';

export function parseDirectShowDevices(input: string) {
  const DEVICE_INFO_PREFIX_PATTERN = /\[dshow @ \w+\]/;
  const VIDEO_SECTION_HEADER_PATTERN = /\[dshow @ \w+\]\sDirectShow\svideo\sdevices/;
  const AUDIO_SECTION_HEADER_PATTERN = /\[dshow @ \w+\]\sDirectShow\saudio\sdevices/;
  const DEVICE_NAME_PATTERN = /\[dshow @ \w+\]\s+\"(.*?)\"/;
  const ALTERNATIVE_DEVICE_NAME_PATTERN = /\[dshow @ \w+\]\s+Alternative\sname\s*?\"(.*?)\"/;

  const isDeviceInfoLine = (line: string) =>
    line.search(DEVICE_INFO_PREFIX_PATTERN) > -1;

  const isVideoSectionHeaderLine = (line: string) =>
    line.search(VIDEO_SECTION_HEADER_PATTERN) > -1;

  const isAudioSectionHeaderLine = (line: string) =>
    line.search(AUDIO_SECTION_HEADER_PATTERN) > -1;

  const isAlternativeDeviceNameLine = (line: string) =>
    line.search(ALTERNATIVE_DEVICE_NAME_PATTERN) > -1;

  const devices: DirectShowDevices = {
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

    if (isAlternativeDeviceNameLine(line)) {
      const lastDevice = isVideo
        ? devices.videoDevices[devices.videoDevices.length - 1]
        : devices.audioDevices[devices.audioDevices.length - 1];

      const matchResults = line.match(ALTERNATIVE_DEVICE_NAME_PATTERN);

      if (matchResults) {
        const [, alternativeName] = matchResults;

        lastDevice.alternativeName = alternativeName;
      }

      continue;
    }

    const params = line.match(DEVICE_NAME_PATTERN);

    if (params) {
      const [, deviceName] = params;

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
