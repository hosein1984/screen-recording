import { exec } from 'child_process';
import { AVFoundationDevices, parseAVFoundationDevices } from './parsers';

export function listDevices(ffmpegPath: string): Promise<AVFoundationDevices> {
  return new Promise((resolve, reject) => {
    const result = exec(
      `${ffmpegPath} -f avfoundation -list_devices true -i ""`,
      (error, stdout, stderr) => {
        resolve(parseAVFoundationDevices(stderr));
      }
    );
  });
}
