import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { remote } from 'electron';
import { ScreenRecorder } from './screen-recoder/screen-recorder';
import { RecorderState } from './screen-recoder/types';
import { useBeforeunload } from 'react-beforeunload';

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
    screenRecorder.current.start(remote.getCurrentWindow(), './recording.mp4');
  };

  const stopRecording = () => {
    screenRecorder.current.stop();
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

  return (
    <div>
      <h1 style={{ color: 'white' }}>Screen Recorder Playground</h1>
      <h3 style={{ color: 'white' }}>Current Time {currentTime.toString()}</h3>
      <h4 style={{ color: 'yellow' }}>{recorderState}</h4>
      <span
        onClick={startRecording}
        style={{
          margin: '10px',
          ...(recorderState === RecorderState.IDLE
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
