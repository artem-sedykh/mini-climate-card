import { describe, expect, it } from 'vitest';
import getLabel from '../src/utils/getLabel';

const hassWith = resources => ({ localize: key => resources[key] || '' });

describe('getLabel', () => {
  it('answers the first key Home Assistant knows', () => {
    const hass = hassWith({ 'state.climate.cool': 'Cooling' });
    expect(getLabel(hass, ['state.climate.cool'], 'cool')).toBe('Cooling');
  });

  it('walks the list in order, so an old key can be tried after a new one', () => {
    // The card asks for `state.climate.<mode>` and then
    // `component.climate.state._.<mode>` - the frontend moved the keys, and
    // both spellings are alive across the versions the card supports.
    const hass = hassWith({ 'component.climate.state._.cool': 'Cooling' });
    expect(getLabel(hass, ['state.climate.cool', 'component.climate.state._.cool'], 'cool')).toBe(
      'Cooling',
    );
  });

  it('falls back to what it was given when no key resolves', () => {
    // Which is how a mode the frontend has no translation for still reads as
    // itself rather than as a blank.
    expect(getLabel(hassWith({}), ['state.climate.turbo'], 'turbo')).toBe('turbo');
  });

  it('answers "unknown" when there is no fallback either', () => {
    expect(getLabel(hassWith({}), ['nope'])).toBe('unknown');
  });

  it('treats an empty answer as unknown rather than as a translation', () => {
    // localize answers '' for a key it does not have, so an empty string can
    // never be a valid label here.
    const hass = hassWith({ 'state.climate.cool': '' });
    expect(getLabel(hass, ['state.climate.cool'], 'cool')).toBe('cool');
  });
});
