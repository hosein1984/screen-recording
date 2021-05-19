import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { test } from './screen-recoder/screen-recorder';
import { BrowserWindow, remote } from 'electron';
import { capture_and_convert } from './script';
const mainElement = document.createElement('div');
mainElement.setAttribute('id', 'root');
document.body.appendChild(mainElement);

const browserWindow = remote.BrowserWindow.getAllWindows()[0];

const App = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const startRecording = () => {};

  const stopRecording = () => {};

  useEffect(() => {
    // test();
    capture_and_convert();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });

  return (
    <div>
      <h1>Hello World</h1>
      <h3 style={{ color: 'white' }}>Current Time {currentTime.toString()}</h3>
      <div
        onClick={startRecording}
        style={{ color: 'green', cursor: 'pointer' }}
      >
        Start Recording
      </div>
      <div onClick={stopRecording} style={{ color: 'blue', cursor: 'pointer' }}>
        StopRecording
      </div>
    </div>
  );
};

render(<App />, mainElement);
