import { BrowserWindow, remote } from 'electron';

export function getSurroundingScreenBounds(browserWindow: BrowserWindow) {
  const screen = remote.screen.getDisplayMatching(browserWindow.getBounds());

  return screen.bounds;
}
