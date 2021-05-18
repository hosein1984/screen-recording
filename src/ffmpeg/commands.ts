import { remote } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import {
  FfmpegCommandCallbacks,
  RecordScreenOptions,
  Platform,
} from './commons/types';
import * as win32Commands from './win32/commands';
import * as linuxCommands from './linux/commands';

function getFfmpegPath() {
  const basePath = remote.app.getAppPath();

  const platform = process.platform;
  const isWindows = platform === 'win32';

  return path.resolve(
    basePath,
    `./extra/${process.platform}/ffmpeg/ffmpeg${isWindows ? '.exe' : ''}`
  );
}

function initializeFfmpeg() {
  ffmpeg.setFfmpegPath(getFfmpegPath());
}

export async function recordScreen(
  options: RecordScreenOptions,
  callbacks: FfmpegCommandCallbacks
) {
  const platform = process.platform;

  options.ffmpegPath = options.ffmpegPath || getFfmpegPath();

  switch (options.platform) {
    case Platform.WIN32:
      return win32Commands.recordScreen(options, callbacks);
    case Platform.LINUX:
      return linuxCommands.recordScreen(options, callbacks);
    default:
      console.log(
        'Screen recoding is not supported for the platform: ',
        platform
      );
  }
}

initializeFfmpeg();
