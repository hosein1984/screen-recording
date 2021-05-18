import { flatten } from 'lodash';
import { DeviceIOType } from '../commons/types';
import { AudioDevice, Display, Screen } from './types';

/**
 * Parses the xdpyinfo command output and extract the display and screen info from there.
 * Note: When you have several monitors attached xdpyinfo only returns a single screen (usually)
 * with the size reported as the aggregated of the display sizes. So no monitor specific info is accessible for that
 * we are going to use xrandr
 * @param input xdpyinfo command output
 * @returns
 */
export function parseXdpyinfoOutput(input: string): Display[] {
  const DISPLAY_ID_PATTERN = /^name\sof\sdisplay:\s+(.*)/;
  const DEFAULT_SCREEN_ID_PATTERN = /^default\sscreen\snumber:\s+(.*)/;
  const SCREEN_ID_PATTERN = /^screen\s#(.*):/;
  const SCREEN_DIMENSIONS_PATTERN = /^\s+dimensions:\s+([0-9]+x[0-9]+)\spixels/;

  const isDisplayIdLine = (line: string) =>
    line.search(DISPLAY_ID_PATTERN) > -1;

  const isDefaultScreenIdLine = (line: string) =>
    line.search(DEFAULT_SCREEN_ID_PATTERN) > -1;

  const isScreenIdLine = (line: string) => line.search(SCREEN_ID_PATTERN) > -1;

  const isScreenDimensionsLine = (line: string) =>
    line.search(SCREEN_DIMENSIONS_PATTERN) > -1;

  const displays: Display[] = [];

  for (const line of input.split('\n')) {
    if (isDisplayIdLine(line)) {
      const matchResults = line.match(DISPLAY_ID_PATTERN);

      if (matchResults) {
        const [, displayId] = matchResults;

        displays.push({
          id: displayId,
          screens: [],
        });
      }

      continue;
    }

    if (isDefaultScreenIdLine(line) && displays.length > 0) {
      const lastDisplay = displays[displays.length - 1];
      const matchResults = line.match(DEFAULT_SCREEN_ID_PATTERN);

      if (matchResults) {
        const [, defaultScreenId] = matchResults;

        lastDisplay.defaultScreenId = defaultScreenId;
      }

      continue;
    }

    if (isScreenIdLine(line) && displays.length > 0) {
      const lastDisplay = displays[displays.length - 1];
      const matchResults = line.match(SCREEN_ID_PATTERN);

      if (matchResults) {
        const [, screenId] = matchResults;

        lastDisplay.screens.push({
          id: screenId,
          width: 0,
          height: 0,
          monitors: [],
        });
      }

      continue;
    }

    if (isScreenDimensionsLine(line) && displays.length > 0) {
      const lastDisplay = displays[displays.length - 1];

      const matchResults = line.match(SCREEN_DIMENSIONS_PATTERN);

      if (matchResults && lastDisplay.screens.length > 0) {
        const lastScreen = lastDisplay.screens[lastDisplay.screens.length - 1];

        const [, dimensions] = matchResults;

        const dimensionParts = dimensions.split('x');

        const width = +dimensionParts[0];
        const height = +dimensionParts[1];

        lastScreen.width = width;
        lastScreen.height = height;
      }

      continue;
    }
  }

  return displays;
}

/**
 * Adds the monitor information to the screens to increase the accuracy of the reported data
 * @param input xrandr command output
 * @param displays the list of displays that we already have from xdpyinfo
 * @returns
 */
export function parseXrandrOutput(input: string, displays: Display[]): void {
  const SCREEN_ID_PATTERN = /^Screen\s([0-9]+):/;
  const CONNECTED_MONITOR_PATTERN = /^([\w'-]+)\sconnected\s?(primary)?\s([0-9]+x[0-9]+)\+([0-9]+\+[0-9]+)/;

  const isScreenIdLine = (line: string) => line.search(SCREEN_ID_PATTERN) > -1;
  const isConnectedMonitorLine = (line: string) =>
    line.search(CONNECTED_MONITOR_PATTERN) > -1;

  let currentScreen: Screen | undefined;

  for (const line of input.split('\n')) {
    if (isScreenIdLine(line)) {
      const matchResults = line.match(SCREEN_ID_PATTERN);

      if (matchResults) {
        const [, screenId] = matchResults;

        const screen = flatten(displays.map((d) => d.screens)).find(
          (s) => s.id === screenId
        );

        currentScreen = screen;
      }

      continue;
    }

    if (isConnectedMonitorLine(line) && currentScreen) {
      const matchResults = line.match(CONNECTED_MONITOR_PATTERN);

      if (matchResults) {
        const [, monitorName, isPrimary, dimensions, offsets] = matchResults;

        const dimensionParts = dimensions.split('x');
        const offsetParts = offsets.split('+');

        const width = +dimensionParts[0];
        const height = +dimensionParts[1];
        const x = +offsetParts[0];
        const y = +offsetParts[1];

        currentScreen.monitors.push({
          name: monitorName,
          width,
          height,
          x,
          y,
          isPrimary: Boolean(isPrimary),
        });
      }

      continue;
    }
  }
}

export function parsePacmdOutput(input: string): AudioDevice[] {
  const DEVICE_INDEX_PATTERN = /^\s+(\*)?\sindex:\s([0-9]+)/;
  const DEVICE_NAME_PATTERN = /^\s+name:\s<(.*)>/;

  const isDeviceIndexLine = (line: string) =>
    line.search(DEVICE_INDEX_PATTERN) > -1;
  const isDeviceNameLine = (line: string) =>
    line.search(DEVICE_NAME_PATTERN) > -1;

  const devices: AudioDevice[] = [];

  for (const line of input.split('\n')) {
    if (isDeviceIndexLine(line)) {
      const matchResults = line.match(DEVICE_INDEX_PATTERN);

      if (matchResults) {
        const [, isDefault, deviceId] = matchResults;

        devices.push({
          id: +deviceId,
          isDefault: Boolean(isDefault),
          name: '',
          io: DeviceIOType.UNKNOWN,
          isMonitor: false,
        });
      }

      continue;
    }

    if (isDeviceNameLine(line) && devices.length > 0) {
      const lastDevice = devices[devices.length - 1];

      const matchResults = line.match(DEVICE_NAME_PATTERN);

      if (matchResults) {
        const [, deviceName] = matchResults;

        lastDevice.name = deviceName;
        lastDevice.io = deviceName.includes('input')
          ? DeviceIOType.INPUT
          : deviceName.includes('output')
          ? DeviceIOType.OUTPUT
          : DeviceIOType.UNKNOWN;
        lastDevice.isMonitor = deviceName.includes('monitor');
      }

      continue;
    }
  }

  return devices;
}
