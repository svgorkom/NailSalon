/** Reads a setting kept between visits; null when it is missing or storage is blocked. */
export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Keeps a setting between visits; storage can be blocked, the setting then lasts until the page closes. */
export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do: see above.
  }
}
