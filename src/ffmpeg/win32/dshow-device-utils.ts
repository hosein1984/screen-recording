import { exec } from 'child_process';
import { DeviceInfo } from '../commons/types';
import { DirectShowDevices } from './types';
import { parseDirectShowDevices } from './parsers';

export function listDevices(ffmpegPath: string): Promise<DirectShowDevices> {
  return new Promise((resolve, reject) => {
    const result = exec(
      `${ffmpegPath} -f dshow -list_devices true -i ""`,
      (error, stdout, stderr) => {
        console.log(stderr);
        // Note: This command outputs are written to stderr and the following use of stderr is intentional
        resolve(parseDirectShowDevices(stderr));
      }
    );
  });
}

async function getDefaultDesktopAudioDevice(audioDevices: DeviceInfo[]) {
  let result: DeviceInfo | undefined;
  // 1. Default to using the virtual-audio-capturer device
  result = audioDevices.find((d) =>
    d.name.toLowerCase().includes('virtual-audio-capturer')
  );

  // 2. If virtual-audio-capturerer was not found then try to find stereo mix device
  if (!result) {
    result = audioDevices.find((d) =>
      d.name.toLowerCase().includes('stereo mix')
    );
  }

  // 3. We have no other defaults
  if (!result) {
    console.error("Couldn't find a default device for recording screen audio");
  }

  return result;
}

async function getDefaultInputAudioDevice(audioDevices: DeviceInfo[]) {
  const mediaDevices = await navigator.mediaDevices.enumerateDevices();

  const defaultAudioOutputMediaDevice = mediaDevices.find(
    (d) => d.kind === 'audioinput' && d.deviceId === 'default'
  );

  let result: DeviceInfo | undefined;

  // 1. Use the default input device of OS. Correlate that with navigator
  if (defaultAudioOutputMediaDevice) {
    let defaultDeviceName = defaultAudioOutputMediaDevice.label;

    if (defaultDeviceName.startsWith('Default - ')) {
      defaultDeviceName = defaultDeviceName
        .substring('Default - '.length)
        .trim();
    }

    result = audioDevices.find((d) => d.name === defaultDeviceName);
    console.log('result', result);
  }

  // 2. Use any device that have microphone in its name
  if (!result) {
    result = audioDevices.find((d) =>
      d.name.toLowerCase().includes('microphone')
    );
  }

  // 3. We have no other defaults
  if (!result) {
    console.error('Could not find a default device for recording input audio');
  }

  return result;
}

async function getDefaultDesktopVideoDevice(videoDevices: DeviceInfo[]) {
  let result: DeviceInfo | undefined;
  // 1. Use screen capture recorder
  result = result = videoDevices.find((d) =>
    d.name.toLowerCase().includes('screen-capture-recorder')
  );

  // 2. We have no other defaults
  if (!result) {
    console.error(
      'Could not find a default device for recording the screen video'
    );
  }

  return result;
}

export const DshowDeviceUtils = {
  listDevices,
  getDefaultDesktopAudioDevice,
  getDefaultInputAudioDevice,
  getDefaultDesktopVideoDevice,
};
