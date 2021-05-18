import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { test } from './screen-recoder/screen-recorder';
import { BrowserWindow, remote } from 'electron';
const mainElement = document.createElement('div');
mainElement.setAttribute('id', 'root');
document.body.appendChild(mainElement);

const browserWindow = remote.BrowserWindow.getAllWindows()[0];

const App = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    test();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(interval);
  });

  return (
    <div>
      <h1>Hello World</h1>
      <h3 style={{ color: 'white' }}>Current Time {currentTime.toString()}</h3>
    </div>
  );
};

render(<App />, mainElement);
