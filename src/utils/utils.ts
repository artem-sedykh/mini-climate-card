import { STATES_OFF, UNAVAILABLE_STATES } from '../const';
import type { HassEntity, Source, Template } from '../types';

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

export { round, compileTemplate, getEntityValue, toggleState };
