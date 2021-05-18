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
import { applyPreset, defaultPreset, libx264Preset } from '../commons/presets';
import { AudioDevice, DisplayInfo } from './types';
import { handleFfmpegEvents } from '../commons/event-handlers';

async function listDisplays(): Promise<DisplayInfo[]> {
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

async function addMonitorInfosToDisplays(
  displays: DisplayInfo[]
): Promise<void> {
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

async function listAudioDevices(): Promise<AudioDevice[]> {
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

export async function listDisplayDevices(): Promise<DisplayInfo[]> {
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
  const audioDevices = await listAudioDevices();

  const monitorAudioDevice =
    audioDevices.find((d) => d.isMonitor && d.io === DeviceIOType.OUTPUT)
      ?.name || '';
  const microphoneDevice =
    audioDevices.find((d) => d.io === DeviceIOType.INPUT)?.name || '';

  const isRecordingDesktopAudio = captureDesktopAudio && monitorAudioDevice;
  const isRecordingMicrophoneAudio = captureMicrophoneAudio && microphoneDevice;

  const command: FfmpegCommandExt = ffmpeg({});

  applyPreset(command, defaultPreset);

  const resultPromise = handleFfmpegEvents(command, callbacks);

  // Set screen recorder input
  // ffmpegCommand.input(`video=${screenCaptureRecorder}`).inputFormat('dshow');

  switch (captureTarget.type) {
    case CaptureTargetType.ENTIRE_DISPLAY: {
      // Done
      const firstDisplay = displays[displays.length - 1];
      const displayId = firstDisplay.id;
      const screenId = firstDisplay.defaultScreen;
      const defaultScreen = firstDisplay.screens.find(
        (s) => s.id === screenId
      )!;

      const primaryMonitor = defaultScreen.monitors.find((m) => m.isPrimary)!;
      const screenOffsetX = primaryMonitor.x;
      const screenOffsetY = primaryMonitor.y;

      command
        .input(`:${displayId}.${screenId}+${screenOffsetX},${screenOffsetY}`)
        .withOption(
          `-video_size ${defaultScreen.width}x${defaultScreen.height}`
        );
      break;
    }
    // case CaptureTargetType.SCREEN:
    //   command
    //     .input('desktop')
    //     .withOption(`-offset_x ${captureTarget.x}`)
    //     .withOption(`-offset_y ${captureTarget.y}`)
    //     .withOption(
    //       `-video_size ${captureTarget.width}x${captureTarget.height}`
    //     );
    //   break;
    // case CaptureTargetType.AREA: {
    //   command
    //     .input(`:${displayId}.${screenId}+${screenOffsetX},${screenOffsetY}`)
    //     .withOption(
    //       `-video_size ${defaultScreen.width}x${defaultScreen.height}`
    //   );
    // }
    // case CaptureTargetType.WINDOW: //
    //   command.input(`title=${captureTarget.windowName}`);
    //   break;
  }

  command.inputFormat('x11grab');
  applyPreset(command, libx264Preset);

  // Using default pulse source
  // ffmpegCommand.input(`default`).inputFormat('pulse').withOption('-ac 2');

  if (captureDesktopAudio) {
    command.input(monitorAudioDevice).inputFormat('pulse').withOption('-ac 2');
  }

  if (captureMicrophoneAudio) {
    command.input(microphoneDevice).inputFormat('pulse').withOption('-ac 2');
  }

  command.complexFilter([
    LIBX64_SIZE_FILTER,
    ...(isRecordingDesktopAudio && isRecordingMicrophoneAudio
      ? [MIX_AUDIO_SOURCES_FILTER]
      : []),
  ]);

  command.save(filePath);

  return resultPromise;
}
