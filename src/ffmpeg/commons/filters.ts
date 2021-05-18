export const LIBX64_SIZE_FILTER = 'pad=ceil(iw/2)*2:ceil(ih/2)*2'; // libx264 needs the width and height of the capture area to be divisible by 2. Sometimes this is not the case for some windows
export const MIX_AUDIO_SOURCES_FILTER =
  'amix=inputs=2:duration=first:dropout_transition=3'; // Mix audio from desktop and microphone sources together

export const COMMON_FILTERS = [LIBX64_SIZE_FILTER, MIX_AUDIO_SOURCES_FILTER];
