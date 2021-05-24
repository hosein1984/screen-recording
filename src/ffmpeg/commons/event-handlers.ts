import {
  FfmpegCommandExt,
  FfmpegKillSignals,
  FfmpegCommandCallbacks,
} from './types';

const MAX_QUIT_RETRY_COUNT = 3;

function quitCommand(command: FfmpegCommandExt) {
  console.log('Quitting the ffmpeg command');
  command.ffmpegProc?.stdin?.write('q');
}

function killCommand(
  command: FfmpegCommandExt,
  signal: FfmpegKillSignals = 'SIGKILL'
) {
  console.log('Killing the ffmpeg command');
  /**
   * When the ffmpeg process is killed (not matter what the signal value) the saved mp4 file
   * will be corrupted and cannot be opened by the media players.
   * The graceful way to shutdown the process is to send "q" to the process stdin. See the above quit function
   *
   * Note: Calling "kill" would cause the "error" event to be fired and NOT the "end" event
   */
  command.kill(signal);
}

export function handleFfmpegEvents(
  command: FfmpegCommandExt,
  callbacks: FfmpegCommandCallbacks
): Promise<void> {
  const { onStart, onFinish } = callbacks;

  // It is possible that the quit command fails. So we try it for a few times and then give up and kill the process
  let quitRetryCount = 0;

  return new Promise((resolve, reject) => {
    command
      .on('start', (commandLine: string) => {
        console.log('Spawned ffmpeg with command: ' + commandLine);
        onStart &&
          onStart({
            ffmpegCommand: commandLine,
            stop: () => {
              if (command.ffmpegProc && command.ffmpegProc.stdin) {
                if (quitRetryCount < MAX_QUIT_RETRY_COUNT) {
                  quitCommand(command);
                  quitRetryCount += 1;
                } else {
                  killCommand(command);
                }
              } else {
                // Panic: There is no proper way to stop the recoding :(
                killCommand(command);
              }
            },
            kill: () => {
              killCommand(command);
            },
          });
      })
      .on('error', (err, stdout, stderr) => {
        console.log('Ffmpeg errored: ', err, stdout, stderr);
        reject(err);
      })
      .on('end', (stdout, stderr) => {
        console.log('Ffmpeg finished: ', stdout, stderr);
        onFinish && onFinish();
        resolve();
      });
  });
}
