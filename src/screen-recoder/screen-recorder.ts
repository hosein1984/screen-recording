import { recordScreen } from '../ffmpeg/commands';
import { BrowserWindow, desktopCapturer, remote } from 'electron';
import { CaptureTargetType } from '../ffmpeg/commons/types';

export function test() {
  const browserWindow = remote.BrowserWindow.getAllWindows()[0];
  const windowName = browserWindow.title;

  recordScreen(
    {
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: './recording.mp4',
      captureTarget: {
        type: CaptureTargetType.ENTIRE_DISPLAY,
      },
    },
    {
      onFinish: () => console.log('[Test] Screen recoding has finished'),
      onStart: (command, stop) => {
        console.log('[Test] Screen recoding has started');

        setTimeout(() => {
          console.log('[Test] Stopping the recoding');
          stop();
        }, 30000);
      },
    }
  );
}
