import { Decoder, Encoder, tools, Reader } from 'ts-ebml';

export async function capture_and_convert() {
  //   const params = new URLSearchParams(location.search);

  let recorder = true;
  let duration = 60 * 5;
  let codec = 'vp8';

  //   if (params.has('type') && params.get('type') == 'recorder') recorder = true;

  //   if (params.has('duration'))
  //     duration = parseInt(params.get('duration') || '60');

  //   if (params.has('codec')) codec = params.get('codec') || 'vp8';

  //   if (recorder) await main_from_recorder(duration, codec);
  //   else {
  //     const file = params.has('file')
  //       ? (params.get('file') as string)
  //       : './chrome57.webm';
  //     await main_from_file(file);
  //   }

  await main_from_recorder(duration, codec);
}

async function main_from_file(file: string) {
  const decoder = new Decoder();
  const reader = new Reader();
  reader.logging = true;
  reader.logGroup = 'Raw WebM file';
  reader.drop_default_duration = false;
  const webMBuf = await fetch(file).then((res) => res.arrayBuffer());
  const elms = decoder.decode(webMBuf);
  elms.forEach((elm) => {
    reader.read(elm);
  });
  reader.stop();
  const refinedMetadataBuf = tools.makeMetadataSeekable(
    reader.metadatas,
    reader.duration,
    reader.cues
  );
  const body = webMBuf.slice(reader.metadataSize);
  const refinedWebM = new Blob([refinedMetadataBuf, body], {
    type: 'video/webm',
  });
  const refined_video = document.createElement('video');
  refined_video.src = URL.createObjectURL(refinedWebM);
  refined_video.controls = true;
  document.body.appendChild(refined_video);

  // Log the refined WebM file structure.
  const refinedDecoder = new Decoder();
  const refinedReader = new Reader();
  refinedReader.logging = true;
  refinedReader.logGroup = 'Refined WebM file';
  const refinedBuf = await readAsArrayBuffer(refinedWebM);
  const refinedElms = refinedDecoder.decode(refinedBuf);
  refinedElms.forEach((elm) => {
    refinedReader.read(elm);
  });
  refinedReader.stop();
}

async function main_from_recorder(duration: number, codec: string) {
  const decoder = new Decoder();
  const reader = new Reader();
  reader.logging = true;
  reader.logGroup = 'Raw WebM Stream (not seekable)';

  let tasks: Promise<void> = Promise.resolve(void 0);
  let webM = new Blob([], { type: 'video/webm' });

  const devices = await navigator.mediaDevices.enumerateDevices();
  console.table(devices);

  const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  const rec = new MediaRecorder(stream, {
    mimeType: `video/webm; codecs="${codec}, opus"`,
  });

  const ondataavailable = (ev: BlobEvent) => {
    const chunk = ev.data;
    webM = new Blob([webM, chunk], { type: chunk.type });
    const task = async () => {
      const buf = await readAsArrayBuffer(chunk);
      const elms = decoder.decode(buf);
      elms.forEach((elm) => {
        reader.read(elm);
      });
    };
    tasks = tasks.then(() => task());
  };

  rec.addEventListener('dataavailable', ondataavailable);

  // if set timeslice, bug occur on firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1272371
  // rec.start(100);
  rec.start();

  console.log('Starting the recording at: ', new Date());

  await sleep(duration * 1000);

  rec.stop();

  let count = 0;
  while (webM.size === 0) {
    if (count > 10) {
      alert('MediaRecorder did not record anything');
      throw new Error('MediaRecorder did not record anything');
    }
    await sleep(1 * 1000); // wait dataavailable event
    count++;
  }

  rec.removeEventListener('dataavailable', ondataavailable);
  rec.stream.getTracks().map((track) => {
    track.stop();
  });

  await tasks; // wait data processing
  reader.stop();

  console.log('Recording has officially finished at: ', new Date());

  const raw_video = document.createElement('video');
  raw_video.src = URL.createObjectURL(webM);
  raw_video.controls = true;

  const rawVideoButton = document.createElement('button');
  rawVideoButton.textContent = 'Download Raw Video';
  rawVideoButton.addEventListener('click', () => {
    saveData(webM, 'raw.webm');
  });
  put(raw_video, 'Raw WebM Stream (not seekable)');
  document.body.appendChild(document.createElement('br'));
  document.body.appendChild(rawVideoButton);

  const infos = [
    //{duration: reader.duration, title: "add duration only (seekable but slow)"},
    //{cues: reader.cues, title: "add cues only (seekable file)"},
    {
      duration: reader.duration,
      cues: reader.cues,
      title: 'Refined WebM stream (seekable)',
    },
  ];

  console.log('Starting the refining process at: ', new Date());
  for (const info of infos) {
    const refinedMetadataBuf = tools.makeMetadataSeekable(
      reader.metadatas,
      reader.duration,
      reader.cues
    );
    console.log('Refining the buffers started at: ', new Date());
    const webMBuf = await readAsArrayBuffer(webM);
    const body = webMBuf.slice(reader.metadataSize);
    const refinedWebM = new Blob([refinedMetadataBuf, body], {
      type: webM.type,
    });

    // logging
    console.log(
      'Converting the refined buffer to array buffer at: ',
      new Date()
    );
    const refinedBuf = await readAsArrayBuffer(refinedWebM);
    const _reader = new Reader();
    _reader.logging = true;
    _reader.logGroup = info.title;
    console.log('Decoding the refined array buffer at: ', new Date());
    new Decoder().decode(refinedBuf).forEach((elm) => _reader.read(elm));
    _reader.stop();

    console.log('Creating the view elements at: ', new Date());
    const refined_video = document.createElement('video');
    refined_video.src = URL.createObjectURL(refinedWebM);
    refined_video.controls = true;
    const refinedVideoButton = document.createElement('button');
    refinedVideoButton.textContent = 'Download Refined Video';
    refinedVideoButton.addEventListener('click', () => {
      saveData(refinedWebM, 'refined.webm');
    });
    put(refined_video, info.title);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(refinedVideoButton);
  }

  console.log('Finished the refining process at: ', new Date());
}

function put(elm: HTMLElement, title: string): void {
  const h1 = document.createElement('h1');
  h1.appendChild(document.createTextNode(title));
  document.body.appendChild(h1);
  document.body.appendChild(elm);
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

function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

var saveData = (function () {
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.setAttribute('style', 'display: none');
  return function (blob: any, fileName: string) {
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
})();

// MediaRecorder API
// interface BlobEvent extends Event {
//   data: Blob;
// }

// interface MediaRecorderEventMap {
//   dataavailable: BlobEvent;
//   pause: Event;
//   resume: Event;
//   start: Event;
//   stop: Event;
//   error: Event;
// }

// declare class MediaRecorder extends EventTarget {
//   constructor(stream: MediaStream, opt: any);
//   start(timeslice?: number): void;
//   stop(): void;
//   mimeType: string;
//   state: 'inactive' | 'recording' | 'paused';
//   stream: MediaStream;
//   videoBitsPerSecond: number;
//   audioBitsPerSecond: number;
//   ondataavailable?: (ev: BlobEvent) => void;
//   onerror?: (ev: ErrorEvent) => void;
//   addEventListener<K extends keyof MediaRecorderEventMap>(
//     type: K,
//     listener: (this: MediaStream, ev: MediaRecorderEventMap[K]) => any,
//     useCapture?: boolean
//   ): void;
//   removeEventListener<K extends keyof MediaRecorderEventMap>(
//     type: K,
//     listener: (this: MediaStream, ev: MediaRecorderEventMap[K]) => any,
//     useCapture?: boolean
//   ): void;
//   addEventListener(
//     type: string,
//     listener: EventListenerOrEventListenerObject,
//     useCapture?: boolean
//   ): void;
//   requestData(): Blob;
// }
