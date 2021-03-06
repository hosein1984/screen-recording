import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import {
  CaptureTargetType,
  DeviceIOType,
  FfmpegCommandExt,
  FfmpegCommandCallbacks,
  RecordScreenOptions,
} from '../commons/types';
import {
  parseXdpyinfoOutput,
  parseXrandrOutput,
  parsePacmdOutput,
} from './parsers';
import {
  LIBX64_SIZE_FILTER,
  MIX_AUDIO_SOURCES_FILTER,
} from '../commons/filters';
import {
  applyPreset,
  commonAudioPreset,
  commonVideoPreset,
  defaultPreset,
  libx264Preset,
} from '../commons/presets';
import { AudioDevice, Display } from './types';
import { handleFfmpegEvents } from '../commons/event-handlers';
import sudo from 'sudo-prompt';
import { PulseDeviceUtils } from './pulse-device-utils';

async function listDisplays(): Promise<Display[]> {
  return new Promise((resolve, reject) => {
    /**
     * xdpyinfo can be used to get the different types of screens, visuals, and X11
     * protocol extensions that are available.
     *
     * In case there are multiple screens (monitors) attached, xdpyinfo will
     * detect all of the as a single screen with the dimensions reported as a (somewhat)
     * aggregated value of all monitors. To have more fine grained information we
     * next use xranr command to add more detail to xdpyinfo report
     */
    exec(`xdpyinfo`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      resolve(parseXdpyinfoOutput(stdout));
    });
  });
}

async function addMonitorInfosToDisplays(displays: Display[]): Promise<void> {
  return new Promise((resolve, reject) => {
    /**
     * xrandr provides automatic discovery of modes (resolutions,
     * refresh rates, etc.) of screens and monitors
     */
    exec(`xrandr`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      parseXrandrOutput(stdout, displays);
      resolve();
    });
  });
}

export async function listDisplayDevices(): Promise<Display[]> {
  const displays = await listDisplays();
  await addMonitorInfosToDisplays(displays);
  return displays;
}

export async function recordScreen(
  options: RecordScreenOptions,
  callbacks: FfmpegCommandCallbacks
): Promise<void> {
  const {
    captureDesktopAudio = true,
    captureMicrophoneAudio = true,
    captureTarget,
    filePath,
  } = options;

  const displays = await listDisplayDevices();

  const audioDevices = await PulseDeviceUtils.listDevices();

  // For now we just use the first display and its first screen. That makes the API more lean
  const defaultDisplay = displays[0];
  const defaultDisplayId = defaultDisplay.id;
  const defaultScreenId = defaultDisplay.defaultScreenId;
  const defaultScreen = defaultDisplay.screens.find(
    (s) => s.id === defaultScreenId
  )!;

  const defaultDesktopAudioDevice = await PulseDeviceUtils.getDefaultDesktopAudioDevice(
    audioDevices
  );
  const defaultInputAudioDevice = await PulseDeviceUtils.getDefaultInputAudioDevice(
    audioDevices
  );

  const isRecordingDesktopAudio =
    captureDesktopAudio && Boolean(defaultDesktopAudioDevice);
  const isRecordingMicrophoneAudio =
    captureMicrophoneAudio && Boolean(defaultInputAudioDevice);

  const command: FfmpegCommandExt = ffmpeg({});

  applyPreset(command, defaultPreset);

  const resultPromise = handleFfmpegEvents(command, callbacks);

  switch (captureTarget.type) {
    case CaptureTargetType.ENTIRE_DISPLAY: {
      command
        .input(`${defaultDisplayId}.${defaultScreenId}+${0},${0}`)
        .withInputOption(
          `-video_size ${defaultScreen.width}x${defaultScreen.height}`
        );
      break;
    }
    case CaptureTargetType.AREA: {
      const { height, width, x, y } = captureTarget;
      command
        .input(`${defaultDisplayId}.${defaultScreenId}+${x},${y}`)
        .withInputOption(`-video_size ${width}x${height}`);
      break;
    }
    case CaptureTargetType.WINDOW: {
      throw new Error('Window capture target is not supported on Linux');
    }
  }

  command.inputFormat('x11grab');
  applyPreset(command, libx264Preset);
  applyPreset(command, commonVideoPreset);

  // Using default pulse source
  // command.input(`default`).inputFormat('pulse').withOption('-ac 2');
  // applyPreset(command, commonAudioPreset);

  // Using the following two caused non-monotonous results for me but the default worked fine.
  // TODO: Need another linux device to test these more
  if (isRecordingDesktopAudio && defaultDesktopAudioDevice) {
    command
      .input(defaultDesktopAudioDevice.name)
      .inputFormat('pulse')
      .withInputOption(`-channels ${defaultDesktopAudioDevice.spec.channels}`)
      .withInputOption(
        `-sample_rate ${defaultDesktopAudioDevice.spec.sampleRate}`
      );
    applyPreset(command, commonAudioPreset);
  }

  if (captureMicrophoneAudio && defaultInputAudioDevice) {
    command
      .input(defaultInputAudioDevice.name)
      .inputFormat('pulse')
      .withInputOption(`-channels ${defaultInputAudioDevice.spec.channels}`)
      .withInputOption(
        `-sample_rate ${defaultInputAudioDevice.spec.sampleRate}`
      );
    applyPreset(command, commonAudioPreset);
  }

  if (captureDesktopAudio || captureMicrophoneAudio) {
    // command.withOption('-c:a libmp3lame').withOption('-b:a 32k');
    command.withOption('-ac 2');
  }

  command.complexFilter([
    LIBX64_SIZE_FILTER,
    ...(isRecordingDesktopAudio && isRecordingMicrophoneAudio
      ? // ? [MIX_AUDIO_SOURCES_FILTER]
        [
          '[1:a]volume=1.0,aresample=async=1[a1]',
          '[2:a]volume=5.0,aresample=async=1[a2]',
          '[a1][a2]amix',
        ]
      : []),
  ]);

  command.withOption('-threads 4');

  command.save(filePath);

  return resultPromise;
}

async function isFfmpegInstalled() {
  return new Promise((resolve, reject) => {
    exec('ffmpeg -version', (error, stdout, stderr) => {
      console.log(error, stderr);
      if (error) {
        if (stderr.includes('ffmpeg: not found')) {
          resolve(false);
        }
      }

      resolve(true);
    });
  });
}

async function installFfmpeg() {
  sudo.exec(
    'apt update && apt install ffmpeg',
    // also install pulseaudio to be on the safe side
    {
      name: 'Screen Recorder Playground',
    },
    (error, stdout, stderr) => {
      console.log('error', error);
      console.log('stderr', stderr);
      console.log('stdout', stdout);
    }
  );
}
