export const LIBX64_SIZE_FILTER = 'pad=ceil(iw/2)*2:ceil(ih/2)*2'; // libx264 needs the width and height of the capture area to be divisible by 2. Sometimes this is not the case for some windows
export const MIX_AUDIO_SOURCES_FILTER = 'aresample=async=1,amix'; // Mix audio from desktop and microphone sources together
// export const MIX_AUDIO_SOURCES_FILTER =  "[1]aresample=async=1[a1],[2]aresample=async=1[a2],[a1][a2]amix";

export const COMMON_FILTERS = [LIBX64_SIZE_FILTER, MIX_AUDIO_SOURCES_FILTER];
