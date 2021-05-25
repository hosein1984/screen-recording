import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { remote } from 'electron';
import { ScreenRecorder } from './screen-recoder/screen-recorder';
import { RecorderState } from './screen-recoder/types';
import { useBeforeunload } from 'react-beforeunload';
import { capture_and_convert } from './script';
import { exec } from 'child_process';
import sudo from 'sudo-prompt';

const mainElement = document.createElement('div');
mainElement.setAttribute('id', 'root');
document.body.appendChild(mainElement);

const App = () => {
  const screenRecorder = useRef<ScreenRecorder>(null!);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recorderState, setRecorderState] = useState<RecorderState>(
    RecorderState.IDLE
  );

  const startRecording = () => {
    screenRecorder.current.start(remote.getCurrentWindow());
  };

  const stopRecording = async () => {
    await screenRecorder.current.stop();

    const dialogOptions = {
      filters: [
        {
          name: 'Video files',
          extensions: ['mp4'],
        },
      ],
    };
    const result = await remote.dialog.showSaveDialog(
      remote.getCurrentWindow(),
      {
        filters: [
          {
            name: 'Video files',
            extensions: ['mp4'],
          },
        ],
      }
    );

    if (!result.canceled) {
      const filePath = result.filePath;
      if (filePath) {
        console.log('FilePath', filePath);
        await screenRecorder.current.save(filePath);
      }
    } else {
      // TODO Dispose
    }
  };

  useEffect(() => {
    const _screenRecorder = new ScreenRecorder();
    screenRecorder.current = _screenRecorder;
    _screenRecorder.on('state-changed', (newState) =>
      setRecorderState(newState)
    );
  }, []);

  useBeforeunload(() => {
    // Since screen recorder spawns a child process make sure we need to make sure that process is closed
    // when refreshing the page to avoid memory leaks
    screenRecorder.current.removeAllListeners();
    screenRecorder.current.stop();
  });

  useEffect(() => {
    // test();
    // capture_and_convert();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then(function (devices) {
        console.table(devices);
      })
      .catch(function (err) {
        console.log(err.name + ': ' + err.message);
      });
  }, []);

  const isFfmpegInstalled = () => {
    return new Promise((resolve, reject) => {
      exec('ffmpeg -version', (error, stdout, stderr) => {
        console.log(error, stderr);
        if (error) {
          if (stderr.includes('ffmpeg: not found')) {
            resolve(false);
          }
        }

        resolve(true);
      });
    });
  };

  useEffect(() => {
    // isFfmpegInstalled().then((isInstalled) => {
    //   console.log('Is ffmpeg installed: ', isInstalled);
    //   if (!isInstalled) {
    //     sudo.exec(
    //       'apt update && apt install ffmpeg',
    //       {
    //         name: 'Screen Recorder Playground',
    //       },
    //       (error, stdout, stderr) => {
    //         console.log('error', error);
    //         console.log('stderr', stderr);
    //         console.log('stdout', stdout);
    //       }
    //     );
    //   }
    // });
  }, []);

  return (
    <div>
      <h1 style={{ color: 'white' }}>Screen Recorder Playground</h1>
      <h3 style={{ color: 'white' }}>Current Time {currentTime.toString()}</h3>
      <h4 style={{ color: 'yellow' }}>{recorderState}</h4>
      <span
        onClick={startRecording}
        style={{
          margin: '10px',
          ...(recorderState === RecorderState.IDLE ||
          recorderState === RecorderState.STOPPED
            ? { color: 'green', cursor: 'pointer' }
            : { color: 'gray', cursor: 'unset' }),
        }}
      >
        Start Recording
      </span>
      <span
        onClick={stopRecording}
        style={{
          margin: '10px',
          ...(recorderState === RecorderState.RECORDING
            ? { color: 'blue', cursor: 'pointer' }
            : { color: 'gray', cursor: 'unset' }),
        }}
      >
        Stop Recording
      </span>
    </div>
  );
};

render(<App />, mainElement);
