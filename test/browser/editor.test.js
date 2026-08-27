// The visual config editor (`mini-climate-editor`), the element
// `getConfigElement()` returns. Its job is to hand `ha-form` a schema and the
// data it describes, and to turn the form's `value-changed` back into a
// `config-changed` on the element so Home Assistant can save it.
//
// `ha-form` and `ha-expansion-panel` are Home Assistant elements that do not
// exist outside a frontend; the stubs in `helpers/ha-elements.js` record what
// was handed in and expose `fire()` for a test to drive the handler the real
// form would.
import { expect, fixture, nextFrame } from '@open-wc/testing';
import { defineHaElements } from './helpers/ha-elements.js';
import { createHass, ENTITY_ID } from './helpers/hass.js';
import '../../../src/components/editor';
import '../../../src/main';

const mountEditor = async (config = { entity: ENTITY_ID }) => {
  defineHaElements();

  const editor = document.createElement('mini-climate-editor');
  editor.hass = createHass();
  editor.setConfig(config);

  const el = await fixture(editor);
  await el.updateComplete;
  await nextFrame();

  return el;
};

// Every `ha-form` in the editor's shadow tree, keyed by its section. The basic
// form is the only one rendered outside an expansion panel.
const forms = root => {
  const walk = node => {
    const found = [];
    for (const child of node.querySelectorAll('*')) {
      if (child.localName === 'ha-form') found.push(child);
      if (child.shadowRoot) walk(child.shadowRoot);
    }
    walk(node.shadowRoot || node);
    return found;
  };
  return walk(root).filter(form => form.isConnected);
};

const basicForm = editor =>
  [...editor.shadowRoot.querySelectorAll('ha-form')].find(
    form => !form.closest('ha-expansion-panel'),
  );

describe('the visual config editor', () => {
  it('hands the basic options to ha-form as schema and data', async () => {
    const editor = await mountEditor();

    const form = basicForm(editor);
    expect(form).to.exist;

    const names = form.schema.map(entry => entry.name);
    // The options a person actually reaches in the picker: the card-level ones
    // plus the sections below. `collapse` is deliberately absent - the card
    // has no such option, and the editor must not teach a dead config key.
    expect(names).to.include.members([
      'entity',
      'name',
      'icon',
      'group',
      'scale',
      'swap_temperatures',
      'hide_current_temperature',
    ]);
    expect(names).to.not.include('collapse');

    expect(form.data.entity).to.equal(ENTITY_ID);
  });

  it('renders one form per option group and shows the tap action actions', async () => {
    const editor = await mountEditor();

    const sections = [...editor.shadowRoot.querySelectorAll('ha-expansion-panel')];
    const headers = sections.map(section => section.header);
    expect(headers).to.include('Tap action');
    expect(headers).to.include('Secondary info');
    expect(headers).to.include('Toggle panel button');

    const tap = forms(editor)[1];
    const actions = tap.schema.find(entry => entry.name === 'action').selector.select.options;
    expect(actions.map(option => option.value)).to.include('more-info');
    expect(actions.map(option => option.value)).to.include('none');
  });

  it('rebuilds tap_action without stale keys when the action changes', async () => {
    const editor = await mountEditor({
      entity: ENTITY_ID,
      tap_action: { action: 'navigate', navigation_path: '/lovelace/1' },
    });

    let changed;
    editor.addEventListener('config-changed', event => {
      changed = event.detail.config;
    });

    const tap = forms(editor)[1];
    tap.fire({ action: 'more-info' });

    // Switching away from navigate must drop navigation_path - a stale field
    // would ride along into a saved config that no longer uses it.
    expect(changed.tap_action).to.deep.equal({ action: 'more-info' });
    expect(changed.tap_action).to.not.have.property('navigation_path');
  });

  it('merges target_temperature icons back into the icons object', async () => {
    const editor = await mountEditor({
      entity: ENTITY_ID,
      target_temperature: { unit: '°C', icons: { up: 'mdi:arrow-up' } },
    });

    let changed;
    editor.addEventListener('config-changed', event => {
      changed = event.detail.config;
    });

    const target = forms(editor).find(form => form.schema.some(entry => entry.name === 'icon_up'));
    target.fire({ icon_down: 'mdi:arrow-down' });

    expect(changed.target_temperature.icons.up).to.equal('mdi:arrow-up');
    expect(changed.target_temperature.icons.down).to.equal('mdi:arrow-down');
  });
});
