// The visual config editor (`mini-climate-editor`), the element
// `getConfigElement()` returns. Its job is to hand `ha-form` a schema and the
// data it describes, and to turn the form's `value-changed` back into a
// `config-changed` on the element so Home Assistant can save it.
//
// `ha-form` and `ha-expansion-panel` are Home Assistant elements that do not
// exist outside a frontend; the stubs in `helpers/ha-elements.js` record what
// was handed in and expose `fire()` for a test to drive the handler the real
// form would. `mountEditor` lives in `helpers/card.js` so this file reaches
// `src/main` the same way the card's own tests do.
import { expect } from '@open-wc/testing';
import { mountEditor } from './helpers/card.js';
import { ENTITY_ID } from './helpers/hass.js';

// The editor lays out one `ha-form` per option group, each inside an
// `ha-expansion-panel`, plus a single top-level form for the basic options.
const sectionForm = (editor, schemaName) =>
  [...editor.shadowRoot.querySelectorAll('ha-expansion-panel')]
    .map(panel => panel.querySelector('ha-form'))
    .find(form => form.schema.some(entry => entry.name === schemaName));

const basicForm = editor =>
  [...editor.shadowRoot.querySelectorAll('ha-form')].find(
    form => !form.closest('ha-expansion-panel'),
  );

describe('the visual config editor', () => {
  it('hands the basic options to ha-form as schema and data', async () => {
    const { editor } = await mountEditor();

    const form = basicForm(editor);
    expect(form).to.exist;

    const names = form.schema.map(entry => entry.name);
    // The options a person actually reaches in the picker. `collapse` is
    // deliberately absent: the card has no such option, and the editor must
    // not teach a dead config key.
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
    const { editor } = await mountEditor();

    const headers = [...editor.shadowRoot.querySelectorAll('ha-expansion-panel')].map(
      panel => panel.header,
    );
    expect(headers).to.include('Tap action');
    expect(headers).to.include('Secondary info');
    expect(headers).to.include('Toggle panel button');

    const tap = sectionForm(editor, 'action');
    const actions = tap.schema.find(entry => entry.name === 'action').selector.select.options;
    expect(actions.map(option => option.value)).to.include('more-info');
    expect(actions.map(option => option.value)).to.include('none');
  });

  it('rebuilds tap_action without stale keys when the action changes', async () => {
    const { editor } = await mountEditor({
      config: {
        entity: ENTITY_ID,
        tap_action: { action: 'navigate', navigation_path: '/lovelace/1' },
      },
    });

    let changed;
    editor.addEventListener('config-changed', event => {
      changed = event.detail.config;
    });

    sectionForm(editor, 'action').fire({ action: 'more-info' });

    // Switching away from navigate must drop navigation_path - a stale field
    // would ride along into a saved config that no longer uses it.
    expect(changed.tap_action).to.deep.equal({ action: 'more-info' });
    expect(changed.tap_action).to.not.have.property('navigation_path');
  });

  it('merges target_temperature icons back into the icons object', async () => {
    const { editor } = await mountEditor({
      config: {
        entity: ENTITY_ID,
        target_temperature: { unit: '°C', icons: { up: 'mdi:arrow-up' } },
      },
    });

    let changed;
    editor.addEventListener('config-changed', event => {
      changed = event.detail.config;
    });

    // ha-form reports every field of the section, in the editor's flat shape;
    // the editor's handler merges those back into the config's object shape.
    const target = sectionForm(editor, 'icon_up');
    target.fire({
      unit: '°C',
      min: undefined,
      max: undefined,
      step: undefined,
      icon_up: 'mdi:arrow-up',
      icon_down: 'mdi:arrow-down',
    });

    expect(changed.target_temperature.icons.up).to.equal('mdi:arrow-up');
    expect(changed.target_temperature.icons.down).to.equal('mdi:arrow-down');
  });
});
