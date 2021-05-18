import { FfmpegCommand } from 'fluent-ffmpeg';

export type PresetFunc = (command: FfmpegCommand) => void;

export function applyPreset(command: FfmpegCommand, presetFunc: PresetFunc) {
  presetFunc(command);
}

export const libx264Preset: PresetFunc = (command) => {
  command
    .addInputOption('-framerate 30')
    .videoCodec('libx264')
    .addOption('-pix_fmt yuv420p') // -pix_fmt yuv420p required otherwise can't stream in Chrome
    .addOption('-crf 28') // 0 is lossless and 51 if the worst. Sane range is 17-28
    .addOption('-tune zerolatency')
    .addOption('-preset ultrafast');
};

export const defaultPreset: PresetFunc = (command) => {
  command
    .withOption('-rtbufsize 150M')
    // .withOutputFormat('mp4')
    .outputFPS(30);
  // .addOption('-loglevel error');
};
