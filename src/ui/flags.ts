import { readSetting, writeSetting } from './storage';

const SALON_KEY = 'nailsalon.salon';

/**
 * Whether the salon game is shown. It is on by default; `?salon=0` in the address turns it off for this browser (kept between visits),
 * `?salon=1` turns it on again.
 */
export function salonEnabled(search: string = window.location.search): boolean {
  const asked = new URLSearchParams(search).get('salon');
  if (asked === '1' || asked === '0') writeSetting(SALON_KEY, asked);
  return readSetting(SALON_KEY) !== '0';
}
