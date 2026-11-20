import { readSetting, writeSetting } from './storage';

const SALON_KEY = 'nailsalon.salon';

/**
 * Whether the salon game is shown. It is not finished: `?salon=1` in the address turns it on for this browser (kept between visits),
 * `?salon=0` turns it off again. Everyone else, including the daughter, sees the free mode only.
 */
export function salonEnabled(search: string = window.location.search): boolean {
  const asked = new URLSearchParams(search).get('salon');
  if (asked === '1' || asked === '0') writeSetting(SALON_KEY, asked);
  return readSetting(SALON_KEY) === '1';
}
