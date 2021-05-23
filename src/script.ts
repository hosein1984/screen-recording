import { remote } from 'electron';
import { Decoder, Encoder, tools, Reader } from 'ts-ebml';

const MEDIA_ACQUISITION_TIME_OUT = 2000;

export async function capture_and_convert() {
  let duration = 60 * 0.5;
  let codec = 'vp8';

  await main_from_recorder(duration, codec);
}

async function getAdvancedStream() {
  const browserWindow = remote.getCurrentWindow();
  const windowMediaSourceId = browserWindow.getMediaSourceId();
  const windowVideoStream = await getWindowVideoStream(windowMediaSourceId);
  const speakerAudioStream = await getSpeakerAudioStream(windowMediaSourceId);
  const microphoneAudioStream = await getMicrophoneAudioStream();
  const mixedAudioStream = getMixedAudioStream(
    speakerAudioStream,
    microphoneAudioStream
  );
  const stream = getMixedVideoAndAudioStream(
    windowVideoStream,
    mixedAudioStream
  )!;

  return stream;
}

async function getBaseStream() {
  const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  return stream;
}

async function main_from_recorder(duration: number, codec: string) {
  // const decoder = new Decoder();
  // const reader = new Reader();
  // reader.logging = true;
  // reader.logGroup = 'Raw WebM Stream (not seekable)';

  let tasks: Promise<void> = Promise.resolve(void 0);
  let webM = new Blob([], { type: 'video/webm' });

  const stream = await getAdvancedStream();
  // const stream = await getBaseStream();

  const rec = new MediaRecorder(stream, {
    mimeType: `video/webm; codecs="${codec}, opus"`,
  });

  const ondataavailable = (ev: BlobEvent) => {
    const chunk = ev.data;
    webM = new Blob([webM, chunk], { type: chunk.type });
    // const task = async () => {
    //   const buf = await readAsArrayBuffer(chunk);
    //   const elms = decoder.decode(buf);
    //   elms.forEach((elm) => {
    //     reader.read(elm);
    //   });
    // };
    // tasks = tasks.then(() => task());
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
  // reader.stop();

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

  // const infos = [
  //   //{duration: reader.duration, title: "add duration only (seekable but slow)"},
  //   //{cues: reader.cues, title: "add cues only (seekable file)"},
  //   {
  //     duration: reader.duration,
  //     cues: reader.cues,
  //     title: 'Refined WebM stream (seekable)',
  //   },
  // ];

  // console.log('Starting the refining process at: ', new Date());
  // for (const info of infos) {
  //   const refinedMetadataBuf = tools.makeMetadataSeekable(
  //     reader.metadatas,
  //     reader.duration,
  //     reader.cues
  //   );
  //   console.log('Refining the buffers started at: ', new Date());
  //   const webMBuf = await readAsArrayBuffer(webM);
  //   const body = webMBuf.slice(reader.metadataSize);
  //   const refinedWebM = new Blob([refinedMetadataBuf, body], {
  //     type: webM.type,
  //   });

  //   // logging
  //   console.log(
  //     'Converting the refined buffer to array buffer at: ',
  //     new Date()
  //   );
  //   const refinedBuf = await readAsArrayBuffer(refinedWebM);
  //   const _reader = new Reader();
  //   _reader.logging = true;
  //   _reader.logGroup = info.title;
  //   console.log('Decoding the refined array buffer at: ', new Date());
  //   new Decoder().decode(refinedBuf).forEach((elm) => _reader.read(elm));
  //   _reader.stop();

  //   console.log('Creating the view elements at: ', new Date());
  //   const refined_video = document.createElement('video');
  //   refined_video.src = URL.createObjectURL(refinedWebM);
  //   refined_video.controls = true;
  //   const refinedVideoButton = document.createElement('button');
  //   refinedVideoButton.textContent = 'Download Refined Video';
  //   refinedVideoButton.addEventListener('click', () => {
  //     saveData(refinedWebM, 'refined.webm');
  //   });
  //   put(refined_video, info.title);
  //   document.body.appendChild(document.createElement('br'));
  //   document.body.appendChild(refinedVideoButton);
  // }

  // console.log('Finished the refining process at: ', new Date());
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

async function getWindowVideoStream(windowMediaSourceId: string) {
  // The reason that I didn't use MediaStreamConstraints here is that the "mandatory" property is
  // Chrome specific and thus does not exist on the typescript type definition.
  // Please refer to: https://github.com/microsoft/TypeScript/issues/22897#issuecomment-379207368
  const constraints: any = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        // chromeMediaSourceId: windowMediaSourceId,
      },
    },
  };
  return await getMediaStream('Window Video', constraints);
}

async function getSpeakerAudioStream(windowMediaSourceId: string) {
  // The reason that I didn't use MediaStreamConstraints here is that the "mandatory" property is
  // Chrome specific and thus does not exist on the typescript type definition.
  // Please refer to: https://github.com/microsoft/TypeScript/issues/22897#issuecomment-379207368
  const constraints: any = {
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: windowMediaSourceId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: windowMediaSourceId,
      },
    },
  };
  const stream = await getMediaStream('Speaker Audio', constraints);

  if (stream) {
    console.log('Removing video track from speaker stream');
    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.stop();
    stream.removeTrack(videoTrack);
    console.log('Video track removed from speaker stream');
  }

  return stream;
}
async function getMicrophoneAudioStream() {
  const constraints = {
    audio: {
      echoCancellation: true,
    },
    video: false,
  };
  return await getMediaStream('Microphone Audio', constraints);
}

function getMixedAudioStream(
  speakerAudioStream?: MediaStream,
  microphoneAudioStream?: MediaStream
) {
  if (speakerAudioStream && microphoneAudioStream) {
    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();
    audioContext.createMediaStreamSource(speakerAudioStream).connect(dest);
    audioContext.createMediaStreamSource(microphoneAudioStream).connect(dest);
    return dest.stream;
  } else if (speakerAudioStream) {
    return speakerAudioStream;
  } else if (microphoneAudioStream) {
    return microphoneAudioStream;
  } else {
    return undefined;
  }
}

function getMixedVideoAndAudioStream(
  videoStream?: MediaStream,
  audioStream?: MediaStream
) {
  if (videoStream && audioStream) {
    const videoTrack = videoStream.getVideoTracks()[0];
    const audioTrack = audioStream.getAudioTracks()[0];
    const mixed = new MediaStream();
    mixed.addTrack(videoTrack);
    mixed.addTrack(audioTrack);
    return mixed;
  } else if (videoStream) {
    return videoStream;
  } else if (audioStream) {
    return audioStream;
  } else {
    return undefined;
  }
}

async function getMediaStream(
  mediaName: string,
  constraints: MediaStreamConstraints
) {
  console.log(
    `Trying to acquire "${mediaName}" media stream with these constraints:\n${JSON.stringify(
      constraints
    )}`
  );

  let stream: MediaStream | undefined = undefined;
  try {
    stream = await promiseTimeout(
      MEDIA_ACQUISITION_TIME_OUT,
      navigator.mediaDevices.getUserMedia(constraints)
    );
    console.log(`"${mediaName}" media stream acquired for recording`);
  } catch (err) {
    console.debug(
      `"${mediaName}" media stream could not be acquired because: ` + err
    );
  }

  return stream;
}

function promiseTimeout<T>(
  milliseconds: number,
  promise: Promise<T>,
  message = 'Timed out'
) {
  // Create a promise that rejects in <ms> milliseconds
  let timerId: ReturnType<typeof setTimeout>;
  const timeout: Promise<undefined> = new Promise((resolve, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  //
  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
    }
  };
  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]).finally(clearTimer);
}
