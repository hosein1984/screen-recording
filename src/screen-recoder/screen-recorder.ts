import { recordScreen } from '../ffmpeg/commands';
import { remote } from 'electron';
import { Platform, CaptureTargetType } from '../ffmpeg/commons/types';

export function test() {
  const browserWindow = remote.BrowserWindow.getAllWindows()[0];
  const windowName = browserWindow.title;
  const platform = process.platform;

  switch (platform) {
    case 'win32':
      // Note: All tests passed
      // win32RecordEntireScreenTest();
      // win32RecordAreaTest();
      // win32RecordWindowTest();
      break;
    case 'linux':
      // linuxRecordEntireScreenTest();
      // linuxRecordAreaTest();
      break;
    case 'darwin':
      // TODO:
      break;
  }
}

function win32RecordEntireScreenTest() {
  recordScreen(
    {
      platform: Platform.WIN32,
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

function win32RecordAreaTest() {
  const currentWindow = remote.getCurrentWindow();
  const screen = remote.screen.getDisplayMatching(currentWindow.getBounds());

  const bounds = { ...screen.bounds };

  // const bounds = {
  //   x: screen.bounds.x + 200,
  //   y: screen.bounds.y + 200,
  //   width: screen.bounds.width - 400,
  //   height: screen.bounds.height - 400,
  // };

  recordScreen(
    {
      platform: Platform.WIN32,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: './recording.mp4',
      captureTarget: {
        type: CaptureTargetType.AREA,
        ...bounds,
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

function win32RecordWindowTest() {
  const currentWindow = remote.getCurrentWindow();

  recordScreen(
    {
      platform: Platform.WIN32,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: './recording.mp4',
      captureTarget: {
        type: CaptureTargetType.WINDOW,
        windowName: currentWindow.title,
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

function linuxRecordEntireScreenTest() {
  recordScreen(
    {
      platform: Platform.LINUX,
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

function linuxRecordAreaTest() {
  const currentWindow = remote.getCurrentWindow();
  const screen = remote.screen.getDisplayMatching(currentWindow.getBounds());

  // const bounds = { ...screen.bounds };

  const bounds = {
    x: screen.bounds.x + 200,
    y: screen.bounds.y + 200,
    width: screen.bounds.width - 400,
    height: screen.bounds.height - 400,
  };

  recordScreen(
    {
      platform: Platform.LINUX,
      captureDesktopAudio: true,
      captureMicrophoneAudio: true,
      filePath: './recording.mp4',
      captureTarget: {
        type: CaptureTargetType.AREA,
        ...bounds,
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
