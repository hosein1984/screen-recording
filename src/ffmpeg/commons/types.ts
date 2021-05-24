import { FfmpegCommand } from 'fluent-ffmpeg';
import { ChildProcess } from 'child_process';

export enum DeviceType {
  Audio = 'audio',
  Video = 'video',
}

export enum DeviceIOType {
  UNKNOWN = 'unknown',
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum Platform {
  WIN32 = 'win32',
  LINUX = 'linux',
  MAC = 'darwin',
}

export enum CaptureTargetType {
  ENTIRE_DISPLAY = 'entireDisplay',
  AREA = 'area',
  WINDOW = 'window',
}

export type CaptureTarget = {
  type: CaptureTargetType;
};

export type EntireScreenCaptureTarget = {
  type: CaptureTargetType.ENTIRE_DISPLAY;
} & CaptureTarget;

export type AreaCaptureTarget = {
  type: CaptureTargetType.AREA;
  x: number;
  y: number;
  width: number;
  height: number;
} & CaptureTarget;

export type WindowCaptureTarget = {
  type: CaptureTargetType.WINDOW;
  windowName: string;
} & CaptureTarget;

export type RecordScreenOptions = {
  platform: NodeJS.Platform;
  captureDesktopAudio: boolean;
  captureMicrophoneAudio: boolean;
  filePath: string;
  captureTarget:
    | EntireScreenCaptureTarget
    | AreaCaptureTarget
    | WindowCaptureTarget;
  ffmpegPath?: string;
};

export interface FfmpegCommandCallbacks {
  onStart?: (params: {
    ffmpegCommand: string;
    stop: () => void;
    kill: () => void;
  }) => void;
  onFinish?: () => void;
}

export interface FfmpegCommandExt extends FfmpegCommand {
  ffmpegProc?: ChildProcess;
}

export type FfmpegKillSignals =
  | 'SIGKILL' // Kill
  | 'SIGSTOP' // Stop (pause)
  | 'SIGCONT'; // Resume

export enum AudioCodec {
  libvoaacenc = 'libvoaacenc', // AAC
  libopus = 'libopus', // Opus
  libvorbis = 'libvorbis', // Vorbis
  libmp3lame = 'libmp3lame', // "MP3"
}

export enum VideoCodec {
  LIBX264 = 'libx264', // H.264 / x264
  LIBX265 = 'libx265', // H.265 / x265
  LIBVPX = 'libvpx', // VP8 (WebM)
  LIBVPX9 = 'libvpx_vp9', // VP9 (WebM)
  LIBXVID = 'libxvid', // MPEG-4 / Xvid
  H264_NVENC = 'h264_nvenc', // H.264 / NVENC
  HEVC_NVENC = 'hevc_nvenc', // HEVC / NVENC
  H264_AMF = 'h264_amf', // H.264 / AMF
  HEVC_AMF = 'hevc_amf', // HEVC / AMF
  H264_QSV = 'h264_qsv', // H.264 / Quick Sync
  HEVC_QSV = 'hevc_qsv', // HEVC / Quick Sync
  GIF = 'gif', // GIF
  LIBWEBP = 'libwebp', // WebP
  APNG = 'apng', // APNG
}

export enum FfmpegPreset {
  ULTRA_FAST = 'ultrafast',
  SUPER_FAST = 'superfast',
  VERY_FAST = 'veryfast',
  FASTER = 'faster',
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
  SLOWER = 'slower',
  VERY_SLOW = 'veryslow',
}

// Please see: https://trac.ffmpeg.org/wiki/Encode/H.264
export enum FfmpegTune {
  FILM = 'film', // use for high quality movie content; lowers deblocking
  ANIMATION = 'animation', // good for cartoons; uses higher deblocking and more reference frames
  GRAIN = 'grain', // preserves the grain structure in old, grainy film material
  STILL_IMAGE = 'stillimage', // good for slideshow-like content
  FAST_DECODE = 'fastdecode', // allows faster decoding by disabling certain filters
  ZERO_LATENCY = 'zerolatency', // good for fast encoding and low-latency streaming
  PSNR = 'psnr', // ignore this as it is only used for codec development (internal)
  SSIM = 'ssim', //  ignore this as it is only used for codec development (internal)
}

// https://trac.ffmpeg.org/wiki/Hardware/QuickSync
export enum FFmpegQSVPreset {
  VERY_FAST = 'veryfast',
  FASTER = 'faster',
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
  SLOWER = 'slower',
  VERY_SLOW = 'veryslow',
}

export enum FFmpegAMFQuality {
  SPEED = 0, // Prefer speed
  BALANCED = 1, // balanced
  QUALITY = 2, // Prefer quality
}

export type DeviceInfo = {
  id: string;
  name: string;
  alternativeName: string;
  type: DeviceType;
};
