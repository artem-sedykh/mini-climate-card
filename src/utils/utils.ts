import { STATES_OFF, UNAVAILABLE_STATES } from '../const';
import type { HassEntity, Source, TapAction, Template } from '../types';

const toggleState = (state: string): string => {
  if (!state) return state;

  if (!STATES_OFF.includes(state) && !UNAVAILABLE_STATES.includes(state)) return 'off';

  if (STATES_OFF.includes(state) && !UNAVAILABLE_STATES.includes(state)) return 'on';

  return state;
};

const getEntityValue = (entity?: HassEntity, config?: Source): any => {
  if (!entity) return undefined;

  if (!config) return entity.state;

  if (config.attribute && entity.attributes) return entity.attributes[config.attribute];

  return entity.state;
};

const round = (value: number | string, decimals?: number): number =>
  Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`);

/**
 * A reading arithmetic can be done on.
 *
 * `Number.isNaN(value) === false` was used for this and does not coerce, so
 * every text state - `unavailable` included - passed the guard, reached
 * `round()` and came back as `NaN`, which the card then drew (#298). A reading
 * that is not a number is left exactly as it came so an unavailable sensor
 * reads `unavailable`.
 *
 * Deliberately strict about what counts: booleans, `null`, whitespace and the
 * empty string are not numbers, though `Number()` is happy to turn most of
 * them into one.
 */
const isNumeric = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || value.trim() === '') return false;

  return Number.isFinite(Number(value));
};

/**
 * An action object, whichever of the two documented spellings was written.
 *
 * `tap_action: more-info` is the shorthand for `tap_action: {action: more-info}`,
 * and a string left as one reaches `handleClick`, which reads `.action` off it
 * and returns - a dead click (#234). Indicators have normalised it since the
 * first commit; the temperature options do it through here, and so does the
 * indicator, so there is one answer to what the shorthand means.
 *
 * The default is `none`: every place that calls this draws something that was
 * not clickable before, and `more-info` by default would hand a tap target to
 * dashboards that never asked for one. The card's own `tap_action` keeps its
 * `more-info` default and is normalised in `setConfig`.
 */
const normalizeTapAction = (value?: TapAction | string): TapAction =>
  typeof value === 'string' ? { action: value } : { action: 'none', ...(value || {}) };

const compileTemplate = (template: unknown, context?: unknown): Template => {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('', `return ${template}`).call(context || {});
  } catch (e) {
    // The message carries the original text because that is what reaches the
    // console; `cause` keeps the SyntaxError itself, and with it the stack.
    //
    // The cast rather than `String(e)`: what `new Function` throws is a
    // SyntaxError, and a cast erases where a call would not - this file is
    // part of a migration that has to leave the bundle where it found it.
    throw new Error(`\n[COMPILE ERROR]: [${(e as Error).toString()}]\n[SOURCE]: ${template}\n`, {
      cause: e,
    });
  }
};

export { round, isNumeric, compileTemplate, getEntityValue, normalizeTapAction, toggleState };
