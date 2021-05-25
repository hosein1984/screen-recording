import { exec } from 'child_process';
import { DeviceIOType } from '../commons/types';
import { parsePacmdOutput } from './parsers';
import { AudioDevice } from './types';

async function listDevices(): Promise<AudioDevice[]> {
  return new Promise((resolve, reject) => {
    /**
     * pacmd can be used to introspect or reconfigure a running PulseAudio sound server during runtime.
     */
    exec(`pacmd list-sources`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      resolve(parsePacmdOutput(stdout));
    });
  });
}

async function getDefaultDesktopAudioDevice(audioDevices: AudioDevice[]) {
  return audioDevices.find((d) => d.isMonitor && d.io === DeviceIOType.OUTPUT);
}

async function getDefaultInputAudioDevice(audioDevices: AudioDevice[]) {
  return audioDevices.find((d) => d.io === DeviceIOType.INPUT);
}

export const PulseDeviceUtils = {
  listDevices,
  getDefaultDesktopAudioDevice,
  getDefaultInputAudioDevice,
};
