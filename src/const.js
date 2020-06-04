
const ICON = {
  DEFAULT: 'mdi:air-conditioner',
  FAN: 'mdi:fan',
  OFF: 'mdi:power',
  HEAT: 'mdi:weather-sunny',
  AUTO: 'mdi:cached',
  COOL: 'mdi:snowflake',
  DRY: 'mdi:water',
  FAN_ONLY: 'mdi:fan',
  TOGGLE: 'mdi:dots-horizontal',
  UP: 'mdi:chevron-up',
  DOWN: 'mdi:chevron-down',
};

export default ICON;
export const STATES_OFF = ['closed', 'locked', 'off'];
export const UNAVAILABLE = 'unavailable';
export const UNKNOWN = 'unknown';
export const UNAVAILABLE_STATES = [UNAVAILABLE, UNKNOWN];
export const ACTION_TIMEOUT = 2000;
