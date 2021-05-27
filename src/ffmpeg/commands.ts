import { exec, execFile } from 'child_process';
import sudo from 'sudo-prompt';
import { remote } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import {
  FfmpegCommandCallbacks,
  RecordScreenOptions,
  Platform,
} from './commons/types';
import is from 'electron-is';
import * as win32Commands from './win32/commands';
import * as linuxCommands from './linux/commands';
import * as macCommands from './mac/commands';

function getFfmpegPath() {
  let basePath = '';

  if (is.dev()) {
    basePath = remote.app.getAppPath();
  } else {
    basePath = path.resolve(remote.app.getAppPath(), '..');
  }

  console.log('Base path is: ', basePath);

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
    case Platform.MAC:
      return macCommands.recordScreen(options, callbacks);
    default:
      console.log(
        'Screen recoding is not supported for the platform: ',
        platform
      );
  }
}

export async function isFfmpegInstalled() {
  return new Promise((resolve) => {
    exec(`${getFfmpegPath()} -version`, (error, stdout, stderr) => {
      console.log(
        `Ffmpeg version:\n\t` +
          `error: ${JSON.stringify(error)}\n\t` +
          `stdout: ${stdout}\n\t` +
          `stderr: ${stderr}`
      );
      if (error) {
        resolve(false);
      }

      resolve(true);
    });
  });
}

export async function installFfmpeg(): Promise<void> {
  // ffmpeg should be available on win32 and mac by default. We only install in on mac
  switch (process.platform) {
    case 'win32':
      console.log('Ffmpeg should already be installed on windows');
      return Promise.resolve();
    case 'darwin':
      console.log('Ffmpeg should already be installed on mac');
      return Promise.resolve();
    case 'linux':
      console.log('Ffmpeg should already be installed on linux');
      return new Promise((resolve, reject) => {
        sudo.exec(
          'apt update && apt install pulseaudio && apt install ffmpeg',
          {
            name: 'Screen Recorder Playground',
          },
          (error, stdout, stderr) => {
            console.log(
              'Installing ffmpeg:\n\t' +
                `error: ${JSON.stringify(error)}\n\t` +
                `stdout: ${stdout}\n\t` +
                `stderr: ${stderr}`
            );

            if (error) {
              reject(error);
            }

            resolve();
          }
        );
      });
  }
}

export async function remuxFile(
  sourceFilePath: string,
  targetFilePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(sourceFilePath)
      .withOption('-c copy')
      .withOption('-strict 2')

      .on('start', (commandLine: string) => {
        console.log('Spawned ffmpeg with command:\n' + commandLine);
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve();
      })

      .save(targetFilePath);
  });
}

export async function getFfmpegVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(getFfmpegPath(), ['-version'], (error, stdout) => {
      if (error) {
        reject(error);
      }

      console.log(stdout);

      const lines = stdout.split('\n');

      const VERSION_PATTERN = /^ffmpeg\sversion\s(\d+\.)?(\d+\.)?(\*|\d+)/;

      const versionLine = lines.find(
        (line) => line.search(VERSION_PATTERN) > -1
      );

      if (!versionLine) {
        reject(
          new Error(
            `Could not find the version from ffmpeg output which was:\n${stdout}`
          )
        );
        return;
      }

      const match = versionLine.match(VERSION_PATTERN)!;
      console.log('versionLine', versionLine);
      console.log('match', match);
      resolve('version');
    });
  });
}

initializeFfmpeg();
