import { FfmpegCommand } from 'fluent-ffmpeg';
import {
  DEFAULT_INPUT_FRAME_RATE,
  DEFAULT_OUTPUT_FRAME_RATE,
  DEFAULT_REAL_TIME_BUFFER_SIZE,
} from './constants';
import { FfmpegPreset, FfmpegTune } from './types';

export type PresetFunc = (command: FfmpegCommand) => void;

export function applyPreset(command: FfmpegCommand, presetFunc: PresetFunc) {
  presetFunc(command);
}

export const commonVideoPreset: PresetFunc = (command) => {
  command
    // .withInputOption('-probesize 50M')
    .withInputOption(`-rtbufsize ${DEFAULT_REAL_TIME_BUFFER_SIZE}`)
    .withInputOption('-thread_queue_size 512')
    .addInputOption(`-framerate ${DEFAULT_INPUT_FRAME_RATE}`);
};

export const commonAudioPreset: PresetFunc = (command) => {
  command
    .withInputOption(`-rtbufsize ${DEFAULT_REAL_TIME_BUFFER_SIZE}`)
    .withInputOption('-thread_queue_size 512');
};

export const libx264Preset: PresetFunc = (command) => {
  command
    .videoCodec('libx264')
    .addOption('-pix_fmt yuv420p') // -pix_fmt yuv420p required otherwise can't stream in Chrome
    .addOption('-crf 28') // 0 is lossless and 51 if the worst. Sane range is 17-28
    .addOption(`-tune ${FfmpegTune.ZERO_LATENCY}`)
    .addOption(`-preset ${FfmpegPreset.ULTRA_FAST}`);
};

export const defaultPreset: PresetFunc = (command) => {
  command
    .withOption(`-rtbufsize ${DEFAULT_REAL_TIME_BUFFER_SIZE}`)
    // .withOutputFormat('mp4')
    // .addOption('-loglevel error')
    .outputFPS(DEFAULT_OUTPUT_FRAME_RATE);
};
