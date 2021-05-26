import { exec } from 'child_process';
import {
  CaptureTargetType,
  FfmpegCommandCallbacks,
  FfmpegCommandExt,
  RecordScreenOptions,
} from '../commons/types';
import { parseAVFoundationDevices } from './parsers';
import { AVFoundationDevices } from './types';
import ffmpeg from 'fluent-ffmpeg';
import { applyPreset, defaultPreset,libx264Preset,commonVideoPreset } from '../commons/presets';
import { handleFfmpegEvents } from '../commons/event-handlers';

export function listAVFoundationDevices(
  ffmpegPath: string
): Promise<AVFoundationDevices> {
  return new Promise((resolve, reject) => {
    const result = exec(
      `${ffmpegPath} -f avfoundation -list_devices true -i ""`,
      (error, stdout, stderr) => {
        console.log(error, stdout, stderr)
        resolve(parseAVFoundationDevices(stderr));
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
      'ffmpeg path must be specified for screen recording on mac'
    );
  }

  const devices =  await listAVFoundationDevices(ffmpegPath);

  console.log('AV Foundation devices: ', devices);

  // TODO: Find out which devices we need

  const screenCaptureRecorder = devices.videoDevices.find(d=>d.name.includes("Capture"));
  const voiceRecorder = devices.audioDevices.find(item=>item.name.includes("Microphone"));

  // const isRecordingDesktopAudio = captureDesktopAudio && virtualAudioRecorder;
  // const isRecordingMicrophoneAudio = captureMicrophoneAudio && microphone;

  const command: FfmpegCommandExt = ffmpeg({});

  applyPreset(command, defaultPreset);

  const resultPromise = handleFfmpegEvents(command, callbacks);

  // Use "screen-capture-recorder" instead of "gdigrab"
  // ffmpegCommand.input(`video=${screenCaptureRecorder}`).inputFormat('dshow');

  switch (captureTarget.type) {
    case CaptureTargetType.ENTIRE_DISPLAY:
       command.input('desktop').inputFormat('avfoundation');
      break;
    case CaptureTargetType.AREA:
      // command
      //   .input('desktop')
      //   .inputFormat('gdigrab')
      //   .withInputOption(`-offset_x ${captureTarget.x}`)
      //   .withInputOption(`-offset_y ${captureTarget.y}`)
      //   .withInputOption(
      //     `-video_size ${captureTarget.width}x${captureTarget.height}`
      //   );
      command.input(`${screenCaptureRecorder}:${voiceRecorder}`).inputFormat('avfoundation');
      break;
    case CaptureTargetType.WINDOW:
     command.input(`title=${captureTarget.windowName}`).inputFormat('avfoundation');
      break;
  }

  // command.inputFormat('gdigrab');
   applyPreset(command, libx264Preset);
   applyPreset(command, commonVideoPreset);

  // if (isRecordingDesktopAudio) {
  //   command
  //     .input(`audio=${virtualAudioRecorder}`)
  //     .inputFormat('dshow')
  //     .withOption('-strict -2');
  //   applyPreset(command, commonVideoPreset);
  // }

  // if (isRecordingMicrophoneAudio) {
  //   command.input(`audio=${microphone}`).inputFormat('dshow');
  //   applyPreset(command, commonVideoPreset);
  // }

  // command.complexFilter([
  //   LIBX64_SIZE_FILTER,
  //   ...(isRecordingDesktopAudio && isRecordingMicrophoneAudio
  //     ? [MIX_AUDIO_SOURCES_FILTER]
  //     : []),
  // ]);

  // TODO: Uncomment this to actually start the recording
   command.save(filePath);

  return resultPromise;
}
