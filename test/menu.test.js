/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ClimateMenu from '../src/components/menu';

// The menu is a component, so most of it belongs to a browser. What is
// testable here is the part that fails silently: when it opens, when it
// closes, and what it says when an option is picked. Positioning is not -
// jsdom measures every element as zero.
beforeAll(() => {
  // The card registers this in its scoped registry rather than globally, so
  // the test defines it under a name of its own.
  customElements.define('mc-menu-under-test', ClimateMenu);
});

const items = [
  { id: 'auto', name: 'Auto' },
  { id: 'low', name: 'Low' },
  { id: 'high', name: 'High' },
];

const mount = async (props = {}) => {
  const menu = document.createElement('mc-menu-under-test');
  menu.items = items;
  Object.assign(menu, props);
  document.body.appendChild(menu);
  await menu.updateComplete;
  return menu;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('opening and closing', () => {
  it('renders nothing until it is shown', async () => {
    const menu = await mount();
    expect(menu.shadowRoot.getElementById('surface')).toBeNull();
  });

  it('renders one option per item when shown', async () => {
    const menu = await mount();
    menu.show();
    await menu.updateComplete;
    expect(menu.options.map(o => o.dataset.value)).toEqual(['auto', 'low', 'high']);
  });

  it('marks the selected option, and only that one', async () => {
    const menu = await mount({ selected: 'low' });
    menu.show();
    await menu.updateComplete;
    expect(menu.options.map(o => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('marks nothing when the current value is not one of the options', async () => {
    const menu = await mount({ selected: 'turbo' });
    menu.show();
    await menu.updateComplete;
    expect(menu.selectedIndex).toBe(-1);
    expect(menu.options.some(o => o.getAttribute('aria-selected') === 'true')).toBe(false);
  });

  it('closes and stops rendering the surface', async () => {
    const menu = await mount();
    menu.show();
    await menu.updateComplete;
    menu.close();
    await menu.updateComplete;
    expect(menu.shadowRoot.getElementById('surface')).toBeNull();
  });
});

describe('picking an option', () => {
  it('reports the index and closes', async () => {
    const menu = await mount();
    const events = [];
    menu.addEventListener('selected', e => events.push(e.detail));
    menu.show();
    await menu.updateComplete;

    menu.options[2].click();
    await menu.updateComplete;

    expect(events).toEqual([{ index: 2 }]);
    expect(menu.open).toBe(false);
  });

  it('reports the current option too, and lets the caller decide', async () => {
    // The menu this replaced did the same. Whether picking what is already
    // picked is worth a command is the dropdown's decision, not the menu's.
    const menu = await mount({ selected: 'low' });
    const events = [];
    menu.addEventListener('selected', e => events.push(e.detail));
    menu.show();
    await menu.updateComplete;

    menu.options[1].click();
    expect(events).toEqual([{ index: 1 }]);
  });

  it('closes without reporting anything for an index that is not there', async () => {
    const menu = await mount();
    const events = [];
    menu.addEventListener('selected', e => events.push(e.detail));
    menu.show();
    await menu.updateComplete;

    menu.select(9);
    expect(events).toEqual([]);
    expect(menu.open).toBe(false);
  });
});

describe('dismissal', () => {
  // `popover="manual"` means the browser does not dismiss this, so all of it
  // is the card's own - and every one of these is a way to leave a menu stuck
  // open over a dashboard.
  const open = async props => {
    const menu = await mount(props);
    menu.show();
    await menu.updateComplete;
    return menu;
  };

  it('closes on a press outside itself', async () => {
    const menu = await open();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(menu.open).toBe(false);
  });

  it('stays open for a press on itself', async () => {
    const menu = await open();
    menu.options[0].dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(menu.open).toBe(true);
  });

  it('stays open for a press on its anchor', async () => {
    // Otherwise the anchor's own click handler reopens what this just closed,
    // and the menu cannot be dismissed by pressing the button again.
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const menu = await open({ anchor });
    anchor.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(menu.open).toBe(true);
  });

  it('closes on Escape and returns the focus to the anchor', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const menu = await open({ anchor });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(anchor);
  });

  it('ignores any other key', async () => {
    const menu = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(menu.open).toBe(true);
  });

  it('closes when the page scrolls under it', async () => {
    const menu = await open();
    window.dispatchEvent(new Event('scroll'));
    expect(menu.open).toBe(false);
  });

  it('closes when the window is resized', async () => {
    const menu = await open();
    window.dispatchEvent(new Event('resize'));
    expect(menu.open).toBe(false);
  });

  it('takes its listeners with it when the card is removed', async () => {
    // A card removed with its menu open would otherwise leave four listeners
    // on the document, and they would keep the element alive.
    const removed = vi.spyOn(document, 'removeEventListener');
    const menu = await open();
    menu.remove();
    const types = removed.mock.calls.map(call => call[0]);
    expect(types).toContain('pointerdown');
    expect(types).toContain('keydown');
  });
});

describe('keyboard inside the menu', () => {
  const openAndFocus = async () => {
    const menu = await mount();
    menu.show();
    await menu.updateComplete;
    return menu;
  };

  const press = (menu, key) =>
    menu.surface.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('moves down the list', async () => {
    const menu = await openAndFocus();
    menu.options[0].focus();
    press(menu, 'ArrowDown');
    expect(menu.shadowRoot.activeElement.dataset.value).toBe('low');
  });

  it('wraps around at the end', async () => {
    const menu = await openAndFocus();
    menu.options[2].focus();
    press(menu, 'ArrowDown');
    expect(menu.shadowRoot.activeElement.dataset.value).toBe('auto');
  });

  it('moves up, and wraps at the start', async () => {
    const menu = await openAndFocus();
    menu.options[0].focus();
    press(menu, 'ArrowUp');
    expect(menu.shadowRoot.activeElement.dataset.value).toBe('high');
  });

  it('jumps to the first and last with Home and End', async () => {
    const menu = await openAndFocus();
    menu.options[1].focus();
    press(menu, 'End');
    expect(menu.shadowRoot.activeElement.dataset.value).toBe('high');
    press(menu, 'Home');
    expect(menu.shadowRoot.activeElement.dataset.value).toBe('auto');
  });

  it('closes on Tab rather than leaving focus in a menu nobody can see', async () => {
    const menu = await openAndFocus();
    press(menu, 'Tab');
    expect(menu.open).toBe(false);
  });
});
