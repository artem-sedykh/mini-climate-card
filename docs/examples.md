# Examples

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

> This is a configuration example for my air conditioner, built on [esphome](https://github.com/esphome/esphome).

```yaml
type: custom:mini-climate
entity: climate.dahatsu
name: Air conditioner
fan_mode:
  source:
    auto: Auto
    low: Low
    medium: Medium
    high: High
    # for my implementation fan_modes_al is an array of available fan modes of the selected hvac mode
    __filter: >
      (source, state, entity) => entity.attributes
        .fan_modes_al.map(fan_mode => source.find(s => s.id === fan_mode))
        .filter(fan_mode => fan_mode)
buttons:
  swing_mode:
    type: dropdown
    icon: mdi:approximately-equal
    state:
      attribute: swing_mode
    # the drop-down list will remain active until swing_mode is off
    active: state => state !== 'off'
    source:
      'off': Off
      horizontal: On
    change_action: >
      (selected, state, entity) => this.call_service('climate', 'set_swing_mode', { entity_id: entity.entity_id, swing_mode: selected })
  # turbo air conditioning button
  turbo:
    icon: mdi:weather-hurricane
    # control topic
    topic: 'dahatsu/turbo/set'
    state:
      attribute: turbo
      # for my device, the turbo attribute returns boolean type, convert it to on or off
      mapper: "(state, entity) => state ? 'on': 'off'"
    # turbo button is not available for all modes, block it when it is not available
    disabled: (state, entity) => !entity.attributes.turbo_al
    # when you click on the button, send the event to mqtt
    toggle_action: >
      (state) => this.call_service('mqtt', 'publish', { payload: this.toggle_state(state), topic: this.topic, retain: false, qos: 1 })
  # eco button configuration is the same as for turbo button
  eco:
    icon: mdi:leaf
    topic: 'dahatsu/eco/set'
    state:
      attribute: eco
      mapper: "(state, entity) => state ? 'on': 'off'"
    disabled: (state, entity) => !entity.attributes.eco_al
    toggle_action: >
      (state) => this.call_service('mqtt', 'publish', { payload: this.toggle_state(state), topic: this.topic, retain: false, qos: 1 })
  # health button configuration is the same as for turbo button
  health:
    icon: mdi:emoticon-happy-outline
    topic: 'dahatsu/health/set'
    state:
      attribute: health
      mapper: "(state, entity) => state ? 'on': 'off'"
    disabled: (state, entity) => !entity.attributes.health_al
    toggle_action: >
      (state) => this.call_service('mqtt', 'publish', { payload: this.toggle_state(state), topic: this.topic, retain: false, qos: 1  })
  # power off button
  power_switch:
    icon: mdi:power-plug
    state:
      entity: switch.air_conditioner_kitchen_switch_l1
indicators:
  # humidity indicator
  humidity:
    icon: mdi:water
    unit: '%'
    round: 1
    source:
      entity: sensor.sensor_temp_hum_pre_kitchen_humidity
  # power consumption indicator
  power_consumption:
    icon: mdi:flash
    unit: 'W'
    round: 1
    source:
      entity: sensor.dahatsu_power
  # power indicator
  power:
    icon: mdi:power-plug
    source:
      entity: switch.air_conditioner_kitchen_switch_l1
      values:
        'on': 'on'
        'off': 'off'
    # localization of values
    mapper: value => this.source.values[value]
```

## Recipes

Things this tracker has been asked for more than once, with the answer and
what it looks like.

Each is also a card on the bench and an assertion in `test/e2e/`, so an answer
that stops being true fails a run rather than sitting here reading well.

### A card with nothing but the temperature

Everything that can be hidden, hidden - the icon, the name, the fan mode, the
secondary info line and the toggle. What is left is the temperature and the
buttons that change it.

```yaml
type: custom:mini-climate
entity: climate.bedroom
name: ' '
hide_icon: true
toggle:
  hide: true
fan_mode:
  hide: true
secondary_info:
  hide: '() => true'
```

![a card showing only the temperature and its buttons](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/minimal-card.png)

### An indicator with an icon and no value

There is no option for this, and none is needed: the value carries a `style`,
and a style can hide it. The unit goes with it.

```yaml
indicators:
  window:
    source:
      entity: binary_sensor.bedroom_window
    icon:
      template: "(value) => (value === 'on' ? 'mdi:window-open' : 'mdi:window-closed')"
      style: "(value) => (value === 'on' ? { color: 'orange' } : {})"
    value:
      style: "() => ({ display: 'none' })"
```

![an indicator drawn as an icon alone](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/icon-only.png)

### A shortened value

A `mapper` runs on every value the indicator reads, so anything that is a
string can be cut, rounded or relabelled on the way to the card.

```yaml
indicators:
  clock:
    icon: mdi:clock-outline
    source:
      entity: sensor.bedroom_clock
      mapper: "value => (typeof value === 'string' ? value.slice(0, 5) : value)"
```

![an indicator showing hh:mm out of hh:mm:ss](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/shortened-value.png)

### The mode icon coloured by the mode it shows

`hvac_mode.style` receives the mode as the first argument (`value`) and the
entity as the second. Colour the icon by the mode - `cool`/`heat`/anything
else - so the icon and its colour always agree.

**The `!important` is what makes this work on a unit that is running.** While
the climate entity is on, the card marks the mode button active and paints it
with a rule of its own that is already `!important`; an inline style without
one loses to it, and the colour appears only while the unit is off.

```yaml
hvac_mode:
  style: >
    (value, entity) => ({
      color: value === 'cool'
        ? 'blue !important'
        : value === 'heat'
          ? 'red !important'
          : 'grey !important',
    })
```

![the mode icon drawn as a blue snowflake while the unit is cooling](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/mode-icon-by-state.png)

### The mode icon coloured by what the unit is doing

`hvac_action` is what the unit is doing now - heating, cooling, idle - as
against the mode above, which is what it was asked to do. A style template is
handed the entity as its second argument, so both are in reach: colour by
`hvac_action` when the question is what is happening rather than what was set.

The `!important` is needed for the same reason as above, and note that
`hvac_action` is optional - an entity that does not report it leaves every
branch here on the fallback.

```yaml
hvac_mode:
  style: >
    (value, entity) => ({
      color: entity.attributes.hvac_action === 'cooling'
        ? 'blue !important'
        : entity.attributes.hvac_action === 'heating'
          ? 'red !important'
          : 'grey !important',
    })
```

![the mode icon drawn in blue while the unit is cooling](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/mode-icon-by-action.png)

### An indicator coloured by the mode

The third argument every template gets is the **climate entity**, whatever
entity the indicator itself is reading. That is what to reach for here: an
indicator on a floor sensor has no `hvac_action` of its own.

```yaml
indicators:
  floor:
    source:
      entity: binary_sensor.floor_demand
    unit: '%'
    icon:
      template: "() => 'mdi:heating-coil'"
      style: >
        (value, entity, climate_entity) => ({
          color: climate_entity.state === 'cool' ? 'blue' : 'red',
        })
```

![an indicator icon drawn red while the climate entity is not cooling](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/indicator-by-mode.png)

### A row of preset buttons

One climate entity holds **one** preset at a time, so a row of preset buttons
is a set of switches rather than a list. Each button maps the attribute to
on/off and sends the chosen value on press; `active` decides which one is lit.

```yaml
type: custom:mini-climate
entity: climate.pass_actuator_3
buttons:
  eco:
    icon: mdi:leaf
    state:
      attribute: preset_mode
      mapper: state => state === 'eco' ? 'on' : 'off'
    active: state => state === 'on'
    toggle_action: >
      (state, entity) => this.call_service('climate', 'set_preset_mode', { entity_id: entity.entity_id, preset_mode: state === 'on' ? 'none' : 'eco' })
  boost:
    icon: mdi:weather-hurricane
    state:
      attribute: preset_mode
      mapper: state => state === 'boost' ? 'on' : 'off'
    active: state => state === 'on'
    toggle_action: >
      (state, entity) => this.call_service('climate', 'set_preset_mode', { entity_id: entity.entity_id, preset_mode: state === 'on' ? 'none' : 'boost' })
```

Two things worth knowing:

- the buttons sit behind the toggle, like every other button;
- after pressing one there is a moment where no button is lit - the old preset
  goes out before the new one comes in. On a slow connection that is visible;
  it settles.

To show the selected preset's **name** as well, add an indicator reading
`attribute: preset_mode` - that is [A shortened value](#a-shortened-value)'s
`values` + `mapper`, applied to `preset_mode`.

![a row of preset buttons with the active one lit](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/preset-buttons.png)

### A spacer that keeps the slot

`hide` takes a button out of the row, and the ones that remain slide together.
A shared template across several climate entities - some of which have an extra
button and some of which do not - then fails to line up.

There is no spacer option. A dummy button that stays in the row, with its icon
hidden, keeps the slot. The names are keys in `buttons:`, so two spacers need
two names:

```yaml
buttons:
  spacer_1:
    style: "() => ({ visibility: 'hidden' })"
  spacer_2:
    style: "() => ({ visibility: 'hidden' })"
```

The extra parentheses around the object are required: without them the arrow's
braces are a block, the function returns nothing, and the icon stays visible.
`hide` is the wrong tool here - it is what collapses the row.

![a card whose button row keeps empty slots so the remaining buttons line up](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/button-spacer.png)

### A translucent card

Setting `background` on `ha-card` is the obvious way to do this, it is what
works on other cards, and here it does nothing visible. The card does not paint
its background on `ha-card` - it leaves that transparent and paints a layer of
its own over it. The rule applies; the layer covers it.

What the layer reads is `--ha-card-background`, along with Home Assistant's
other card variables. In a theme:

```yaml
glass:
  # something for the card to be translucent against
  lovelace-background: 'linear-gradient(135deg, #3a6186 0%, #89253e 100%)'
  ha-card-background: 'rgba(0, 0, 0, 0.5)'
  ha-card-border-width: 0
  ha-card-border-radius: 10px
  mini-climate-card-box-shadow: none
  # the card's own text and icons, which stop being readable on a dark card
  mini-climate-base-color: '#ffffff'
  mini-climate-icon-color: '#ffffff'
  mini-climate-button-color: '#ffffff'
```

Themes apply to a dashboard, a view or a user. For a single card the same
variables go on the card itself, which needs
[card_mod](https://github.com/thomasloven/lovelace-card-mod) - note `:host`,
not `ha-card`:

```yaml
type: custom:mini-climate
entity: climate.bedroom
card_mod:
  style: |
    :host {
      --ha-card-background: rgba(0, 0, 0, 0.5);
      --ha-card-border-width: 0;
      --mini-climate-base-color: #ffffff;
    }
```

`--mini-climate-background-opacity` is a second knob on the same layer, and it
multiplies with the alpha above rather than replacing it. Set one or the other.

The theme is the half that is on the bench; the `card_mod` half is not, because
`card_mod` is not installed there.

![a translucent card over a gradient dashboard](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/answers/translucent-card.png)
