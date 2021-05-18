import { exec } from 'child_process';
import { parseDirectShowDevices } from './parsers';
import {
  CaptureTargetType,
  FfmpegCommandExt,
  FfmpegCommandCallbacks,
  RecordScreenOptions,
} from '../commons/types';
import ffmpeg from 'fluent-ffmpeg';
import { DirectShowDevices } from './types';
import {
  LIBX64_SIZE_FILTER,
  MIX_AUDIO_SOURCES_FILTER,
} from '../commons/filters';
import { applyPreset, defaultPreset, libx264Preset } from '../commons/presets';
import { handleFfmpegEvents } from '../commons/event-handlers';

export function listDirectShowDevices(
  ffmpegPath: string
): Promise<DirectShowDevices> {
  return new Promise((resolve, reject) => {
    const result = exec(
      `${ffmpegPath} -f dshow -list_devices true -i ""`,
      (error, stdout, stderr) => {
        // Note: This command outputs are written to stderr and the following use of stderr is intentional
        resolve(parseDirectShowDevices(stderr));
      }
    );
  });
}

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

  const devices = await listDirectShowDevices(ffmpegPath);

  const screenCaptureRecorder =
    devices.videoDevices.find((d) => d.name.includes('screen-capture-recorder'))
      ?.name || '';
  const virtualAudioRecorder =
    devices.audioDevices.find((d) => d.name.includes('virtual-audio-capturer'))
      ?.name || '';
  const microphone =
    devices.audioDevices.find((d) =>
      d.name.toLowerCase().includes('microphone')
    )?.name || '';

  const isRecordingDesktopAudio = captureDesktopAudio && virtualAudioRecorder;
  const isRecordingMicrophoneAudio = captureMicrophoneAudio && microphone;

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

  if (isRecordingDesktopAudio) {
    command
      .input(`audio=${virtualAudioRecorder}`)
      .inputFormat('dshow')
      .withOption('-strict -2');
  }

  if (isRecordingMicrophoneAudio) {
    command.input(`audio=${microphone}`).inputFormat('dshow');
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
