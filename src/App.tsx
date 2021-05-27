import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { remote } from 'electron';
import { FfmpegScreenRecorder } from './screen-recoder/ffmpeg-screen-recorder';
import { useBeforeunload } from 'react-beforeunload';
import { capture_and_convert } from './script';
import { exec } from 'child_process';
import sudo from 'sudo-prompt';
import { ScreenRecorder } from './screen-recoder/screen-recorder';
import { ScreenRecorderState } from './screen-recoder/screen-recorder-types';
import { DefaultScreenRecorder } from './screen-recoder/default-screen-recorder';
import RecordRTC from 'recordrtc';
import { RtcScreenRecorder } from './screen-recoder/rtc-screen-recorder';
import { getFfmpegVersion } from './ffmpeg/commands';

const mainElement = document.createElement('div');
mainElement.setAttribute('id', 'root');
document.body.appendChild(mainElement);

const App = () => {
  const screenRecorder = useRef<ScreenRecorder>(null!);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recorderState, setRecorderState] = useState<ScreenRecorderState>(
    ScreenRecorderState.IDLE
  );

  const startRecording = () => {
    screenRecorder.current.start(remote.getCurrentWindow());
  };

  const stopRecording = async () => {
    await screenRecorder.current.stop();

    const result = await remote.dialog.showSaveDialog(
      remote.getCurrentWindow(),
      {
        filters: [
          {
            name: 'Video files',
            extensions: [screenRecorder.current.fileExtension],
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
    // const _screenRecorder = new FfmpegScreenRecorder();
    const _screenRecorder = new DefaultScreenRecorder();
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
    getFfmpegVersion().then((version) =>
      console.log('Ffmpeg version is ', version)
    );
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
          ...(recorderState === ScreenRecorderState.IDLE ||
          recorderState === ScreenRecorderState.STOPPED
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
          ...(recorderState === ScreenRecorderState.RECORDING
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
