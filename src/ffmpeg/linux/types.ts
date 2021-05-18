import {
  AreaCaptureTarget,
  Platform,
  DeviceIOType,
  EntireScreenCaptureTarget,
  RecordScreenOptions,
} from '../commons/types';

/**
 * In linux terminology:
 * Display at least one screen, a keyboard and a pointing device.
 * A display can be composed of many screens but normally we only have one.
 * The current active display is available under "DISPLAY" environment variable.
 * eg: echo "$DISPLAY"
 */
export type Display = {
  id: string;
  defaultScreenId?: string;
  screens: Screen[];
};

/**
 * Screen is a collection of all your monitors.
 * If you have multiple monitors, all of the monitors must fit into your current screen.
 * Screens could be virtual as well.
 */
export type Screen = {
  id: string;
  width: number;
  height: number;
  monitors: Monitor[];
};

/**
 * The thing that we normally call a "screen" or the physical monitor
 * is called a Monitor.
 */
export type Monitor = {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
};

export type AudioDevice = {
  id: number;
  name: string;
  io: DeviceIOType;
  isDefault: boolean;
  isMonitor: boolean;
};
