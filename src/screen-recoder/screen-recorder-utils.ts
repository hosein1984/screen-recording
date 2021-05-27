import { chain } from 'lodash';
import { Decoder, Reader, tools } from 'ts-ebml';
import path from 'path';
import os from 'os';
import { format } from 'date-fns';

export type MediaRecorderVideoFormat = {
  containerName: string;
  mimeType: string;
  extension: string;
  codec: string;
};

/**
 * Note: The order of containers defined here is based on what the preferred extension is for us.
 * We prefer to have mp4, mkv, avi, webm, ogg respectively
 */
const VIDEO_CONTAINER_FORMATS = [
  // { name: 'mp4', extension: 'mp4' },
  // { name: 'x-matroska', extension: 'mkv' },
  // { name: 'avi', extension: 'avi' },
  // { name: 'mpeg', extension: 'mpeg' },
  // { name: 'mpg', extension: 'mpg' },
  // { name: 'wmv', extension: 'wmv' },
  { name: 'webm', extension: 'webm' },
  // { name: 'ogg', extension: 'ogg' },
];

const VIDEO_CODECS = [
  // 'vp9',
  // 'vp9.0',
  'vp8',
  // 'vp8.0',
  // 'avc1',
  // 'av1',
  // 'h265',
  // 'h.265',
  // 'h264',
  // 'h.264',
  // 'opus',
];

export function getSupportedMediaRecorderVideoFormats() {
  const allFormats: MediaRecorderVideoFormat[] = [];

  for (const containerFormat of VIDEO_CONTAINER_FORMATS) {
    const { name: containerName, extension } = containerFormat;

    const mimeType = `video/${containerName}`;

    for (const codec of VIDEO_CODECS) {
      const mimeTypeWithCodec = `${mimeType};codecs=${codec}`;
      if (MediaRecorder.isTypeSupported(mimeTypeWithCodec)) {
        allFormats.push({
          containerName: containerName,
          extension: extension,
          mimeType: mimeTypeWithCodec,
          codec: codec,
        });
      }
    }
    //
    if (MediaRecorder.isTypeSupported(mimeType)) {
      allFormats.push({
        containerName: containerName,
        extension: extension,
        mimeType: mimeType,
        codec: '',
      });
    }
  }
  //
  const formatWithBestCodecs = chain(allFormats)
    .groupBy((format) => format.containerName)
    .map((value) => value[0])
    .value();

  console.log(
    'All supported video formats for media recorder are: ',
    allFormats
  );
  console.log(
    'Supported video formats with best codecs for media recorder are: ',
    formatWithBestCodecs
  );

  return {
    allFormats,
    formatWithBestCodecs,
  };
}

export function getBestSupportedMediaRecorderVideoFormat() {
  return getSupportedMediaRecorderVideoFormats().formatWithBestCodecs[0];
}

function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onloadend = () => {
      resolve(<ArrayBuffer>reader.result);
    };
    reader.onerror = (ev) => {
      reject(ev);
    };
  });
}

export function getTempRecordingFilePath(fileExtension: string) {
  const formattedDate = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const tempFileName = `Fluxble Temp Recording - ${formattedDate}.${fileExtension}`;

  return path.resolve(os.tmpdir(), tempFileName);
}

// Please see: https://github.com/muaz-khan/RecordRTC/issues/147 and https://recordrtc.org/RecordRTC.js.html#line1903 for more details
export function convertToSeekableBlob(blob: Blob) {
  const decoder = new Decoder();
  const reader = new Reader();
  reader.logging = false;
  reader.drop_default_duration = false;

  return readAsArrayBuffer(blob).then((buffer) => {
    const elms = decoder.decode(buffer);
    elms.forEach((elm) => {
      reader.read(elm);
    });
    reader.stop();

    const refinedMetadataBuf = tools.makeMetadataSeekable(
      reader.metadatas,
      reader.duration,
      reader.cues
    );
    const body = buffer.slice(reader.metadataSize);

    const result = new Blob([refinedMetadataBuf, body], { type: blob.type });

    return result;
  });
}
