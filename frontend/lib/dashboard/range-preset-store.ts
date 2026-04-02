export type SharedRangePreset = 'focus' | '7' | '30' | 'all' | '90' | '180' | '365';

const RANGE_PRESET_STORAGE_KEY = 'search-flight.shared-range-preset.v1';

const SHARED_PRESETS: SharedRangePreset[] = ['focus', '7', '30', 'all', '90', '180', '365'];

function isSharedRangePreset(value: string): value is SharedRangePreset {
  return SHARED_PRESETS.includes(value as SharedRangePreset);
}

export function readSharedRangePreset(fallback: SharedRangePreset = 'focus'): SharedRangePreset {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(RANGE_PRESET_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    return isSharedRangePreset(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function writeSharedRangePreset(preset: SharedRangePreset) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(RANGE_PRESET_STORAGE_KEY, preset);
  } catch {
    // Ignore storage write failures.
  }
}
