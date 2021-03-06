export const LIBX64_SIZE_FILTER = 'pad=ceil(iw/2)*2:ceil(ih/2)*2'; // libx264 needs the width and height of the capture area to be divisible by 2. Sometimes this is not the case for some windows
// export const MIX_AUDIO_SOURCES_FILTER = 'amix';
export const MIX_AUDIO_SOURCES_FILTER =
  '[1:a]volume=1.0,aresample=async=1[a1];[2:a]volume=4.0,aresample=async=1[a2];[a1][a2]amix'; // Mix audio from desktop and microphone sources together

export const COMMON_FILTERS = [LIBX64_SIZE_FILTER, MIX_AUDIO_SOURCES_FILTER];
