import {
  CaptureTargetType,
  FfmpegCommandExt,
  FfmpegCommandCallbacks,
  RecordScreenOptions,
} from '../commons/types';
import ffmpeg from 'fluent-ffmpeg';
import {
  applyPreset,
  commonAudioPreset,
  commonVideoPreset,
  defaultPreset,
  libx264Preset,
} from '../commons/presets';
import { handleFfmpegEvents } from '../commons/event-handlers';
import { LIBX64_SIZE_FILTER } from '../commons/filters';
import { DshowDeviceUtils } from './dshow-device-utils';

export async function recordScreen(
  options: RecordScreenOptions,
  callbacks: FfmpegCommandCallbacks
): Promise<void> {
  const {
    captureDesktopAudio = true,
    captureMicrophoneAudio = true,
    captureTarget,
    ffmpegPath,
    filePath,
  } = options;

  if (!ffmpegPath) {
    throw new Error(
      'ffmpeg path must be specified for screen recording on windows'
    );
  }

  const devices = await DshowDeviceUtils.listDevices(ffmpegPath);

  const defaultDesktopVideoDevice = await DshowDeviceUtils.getDefaultDesktopVideoDevice(
    devices.videoDevices
  );
  const defaultDesktopAudioDevice = await DshowDeviceUtils.getDefaultDesktopAudioDevice(
    devices.audioDevices
  );
  const defaultInputAudioDevice = await DshowDeviceUtils.getDefaultInputAudioDevice(
    devices.audioDevices
  );

  const isRecordingDesktopAudio =
    captureDesktopAudio && Boolean(defaultDesktopAudioDevice);
  const isRecordingMicrophoneAudio =
    captureMicrophoneAudio && Boolean(defaultInputAudioDevice);

  const command: FfmpegCommandExt = ffmpeg({});

  applyPreset(command, defaultPreset);

  const resultPromise = handleFfmpegEvents(command, callbacks);

  // Use "screen-capture-recorder" instead of "gdigrab"
  // ffmpegCommand.input(`video=${screenCaptureRecorder}`).inputFormat('dshow');

  switch (captureTarget.type) {
    case CaptureTargetType.ENTIRE_DISPLAY:
      command.input('desktop').inputFormat('gdigrab');
      break;
    case CaptureTargetType.AREA:
      command
        .input('desktop')
        .inputFormat('gdigrab')
        .withInputOption(`-offset_x ${captureTarget.x}`)
        .withInputOption(`-offset_y ${captureTarget.y}`)
        .withInputOption(
          `-video_size ${captureTarget.width}x${captureTarget.height}`
        );
      break;
    case CaptureTargetType.WINDOW:
      command.input(`title=${captureTarget.windowName}`).inputFormat('gdigrab');
      break;
  }

  // command.inputFormat('gdigrab');
  applyPreset(command, libx264Preset);
  applyPreset(command, commonVideoPreset);

  if (isRecordingDesktopAudio) {
    command
      .input(`audio=${defaultDesktopAudioDevice!.name}`)
      .inputFormat('dshow')
      .withOption('-strict -2');
    applyPreset(command, commonAudioPreset);
  }

  if (isRecordingMicrophoneAudio) {
    command
      .input(`audio=${defaultInputAudioDevice!.name}`)
      .inputFormat('dshow');
    applyPreset(command, commonAudioPreset);
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

  command.save(filePath);

  return resultPromise;
}
