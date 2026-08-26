/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handleClick from '../src/utils/handleClick';

// `handleClick` is the whole of what `tap_action` does, and every branch of it
// either dispatches an event the frontend listens for or calls a service. All
// of that is observable without a card.
const listen = (target, type) => {
  const events = [];
  target.addEventListener(type, event => events.push(event));
  return events;
};

describe('handleClick', () => {
  let node;
  let hass;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
    hass = { callService: vi.fn() };
  });

  afterEach(() => {
    node.remove();
    vi.restoreAllMocks();
  });

  it('does nothing without a configuration', () => {
    const events = listen(node, 'hass-more-info');
    handleClick(node, hass, undefined, 'climate.x');
    expect(events).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  describe('more-info', () => {
    it('opens the dialog for the entity it was given', () => {
      const events = listen(node, 'hass-more-info');
      handleClick(node, hass, { action: 'more-info' }, 'climate.x');
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ entityId: 'climate.x' });
    });

    it('prefers the entity named in the action', () => {
      // Which is how a card can open a different entity than the one it shows.
      const events = listen(node, 'hass-more-info');
      handleClick(node, hass, { action: 'more-info', entity: 'sensor.y' }, 'climate.x');
      expect(events[0].detail).toEqual({ entityId: 'sensor.y' });
    });

    it('composes the event, so it crosses the card shadow root', () => {
      // Without `composed` the frontend never sees it: the listener is on the
      // document, and the click happens inside the card.
      const events = listen(node, 'hass-more-info');
      handleClick(node, hass, { action: 'more-info' }, 'climate.x');
      expect(events[0].composed).toBe(true);
    });
  });

  describe('navigate', () => {
    it('pushes the path and tells the frontend the location changed', () => {
      const events = listen(window, 'location-changed');
      handleClick(node, hass, { action: 'navigate', navigation_path: '/lovelace/1' }, 'climate.x');
      expect(window.location.pathname).toBe('/lovelace/1');
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ replace: false });
    });

    it('does nothing without a path', () => {
      const events = listen(window, 'location-changed');
      handleClick(node, hass, { action: 'navigate' }, 'climate.x');
      expect(events).toHaveLength(0);
    });
  });

  describe('call-service', () => {
    it('splits the service on the first dot and passes the data through', () => {
      handleClick(
        node,
        hass,
        { action: 'call-service', service: 'climate.set_hvac_mode', service_data: { a: 1 } },
        'climate.x',
      );
      expect(hass.callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', { a: 1 });
    });

    it('copies the service data rather than passing the configuration object', () => {
      // The configuration is shared with every other render of the card, so
      // handing it to a caller that might mutate it would be a leak.
      const config = { action: 'call-service', service: 'a.b', service_data: { x: 1 } };
      handleClick(node, hass, config, 'climate.x');
      const passed = hass.callService.mock.calls[0][2];
      expect(passed).toEqual({ x: 1 });
      expect(passed).not.toBe(config.service_data);
    });

    it('sends an empty payload when none is configured', () => {
      handleClick(node, hass, { action: 'call-service', service: 'a.b' }, 'climate.x');
      expect(hass.callService).toHaveBeenCalledWith('a', 'b', {});
    });

    it('does nothing without a service', () => {
      handleClick(node, hass, { action: 'call-service' }, 'climate.x');
      expect(hass.callService).not.toHaveBeenCalled();
    });
  });

  describe('fire-dom-event', () => {
    it('fires ll-custom with the whole configuration, and lets it bubble', () => {
      // This one has to bubble as well as compose: what listens for it is
      // browser_mod and friends, at the document.
      const events = listen(document, 'll-custom');
      handleClick(node, hass, { action: 'fire-dom-event', browser_mod: { foo: 1 } }, 'climate.x');
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ action: 'fire-dom-event', browser_mod: { foo: 1 } });
      expect(events[0].bubbles).toBe(true);
      expect(events[0].composed).toBe(true);
    });
  });

  describe('anything else', () => {
    it('does nothing for an action the card does not know', () => {
      const more = listen(node, 'hass-more-info');
      const custom = listen(document, 'll-custom');
      handleClick(node, hass, { action: 'teleport' }, 'climate.x');
      expect(more).toHaveLength(0);
      expect(custom).toHaveLength(0);
      expect(hass.callService).not.toHaveBeenCalled();
    });

    it('does nothing for `none`', () => {
      const more = listen(node, 'hass-more-info');
      handleClick(node, hass, { action: 'none' }, 'climate.x');
      expect(more).toHaveLength(0);
    });

    // Not tested here: a `tap_action` written as a plain string. Since #234
    // `setConfig` normalises it to `{ action: <string> }` before anything
    // dispatches a click, so a string no longer reaches this function - the
    // test that covers the shorthand lives where the normalising happens.
  });
});
