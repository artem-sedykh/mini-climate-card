# Functions

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [AI assistants](ai-assistants.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

A card configuration is YAML, but several options are **functions**, written as
arrow functions in the YAML. The card parses their text, binds a context to
`this`, and calls them at the right moment - when an indicator value changes,
when a button is pressed, when a mode list is assembled.

Every function gets the same four arguments, in this order, whatever it is:

| argument | what it is |
|---|---|
| `state` | the value as the card reads it - for an indicator its current value, for a button its state (after `state:mapper`, if any) |
| `entity` | the entity the option reads (the button's own entity, or the climate one) |
| `climate_entity` | the card's climate entity |
| `hvac_mode` | the mode the card is showing (`{ id, name }`, or nothing if none is selected) |

Functions that take something instead of, or in addition to, `state` are noted
below. What `this` is - the option's own YAML, extra keys included - is
[`this`](#this).

## `this` {#this}

`this` is the option the function belongs to - the YAML, as written. A key the
card does not recognise is data, not an error: a topic, a price, a lookup
table. That is the extension point, and it is why `icon.items` works.

Because the context is the **whole** option, a nested map keeps its path.
`this.items` would look on the button, where there is no such key:

```yaml
type: custom:mini-climate
entity: climate.dahatsu
fan_mode:
  hide: true
  icon:
    items:
      auto: 'mdi:fan-auto'
      low: 'mdi:fan-speed-1'
      medium: 'mdi:fan-speed-2'
      high: 'mdi:fan-speed-3'
    template: >
      (state) => this.icon.items[state] || 'mdi:fan'
```

The exception is the card's own `icon`: there `this` is the icon object, so
extra keys are `this.items`. See [fan-mode-dropdown](secondary-info.md#fan-mode-dropdown)
and [icon](configuration.md#icon).

The card then adds three names of its own:

| name | what it is | on |
|---|---|---|
| `toggle_state(state)` | the opposite of `on` / `off` | buttons, indicators, target temperature |
| `call_service(domain, service, options)` | a Home Assistant service call | buttons and target temperature |
| `entity_config` | the whole card configuration | the same, and the entity icon |

An indicator does not get `call_service`: it displays. A `secondary_info` or
`toggle` hide function sees only its own YAML.

## source:__filter {#source__filter}

The list a dropdown shows comes from `source`. `source:__filter` is a function
that takes that list and returns a **filtered** one.

| argument | what it is |
|---|---|
| `source` | the configured options, as an array of `{ id, name }` |
| `state` | the current state (after `state:mapper`) |
| `entity`, `climate_entity`, `hvac_mode` | as above |

Returns an array of `{ id, name }` - the options that stay.

### Why it is there

The list is not always valid as configured. A climate entity reports the modes
its integration knows; the ones that make sense for the current state are not
always all of them. Filtering by the state is how a card shows only the options
that apply now.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  swing_mode:
    type: dropdown
    icon: mdi:approximately-equal
    state:
      attribute: swing_mode
    source:
      'off': Off
      horizontal: On
      vertical: Auto
      __filter: source => source.filter(option => option.id !== 'vertical')
    change_action: >
      (selected, state, entity) => this.call_service('climate', 'set_swing_mode', { entity_id: entity.entity_id, swing_mode: selected })
```

## state:mapper {#state_mapper}

Turns the raw value a button or indicator reads into the value its functions
then see. This is how a switch's `on`/`off` becomes a boolean, or how a sensor
reading is shortened before it is shown.

| argument | what it is |
|---|---|
| `state` | the raw state or attribute value |

Returns the mapped value.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  turbo:
    icon: mdi:weather-hurricane
    state:
      attribute: turbo
      mapper: state => (state ? 'on' : 'off')
```

## icon:template {#icon_template}

The icon an indicator or button shows, computed from the value. This is the
option behind [#49](https://github.com/artem-sedykh/mini-climate-card/issues/49):
an icon that follows the state rather than being fixed. `fan_mode` is a button,
so the same form applies there - including the dropdown under the name, see
[fan-mode-dropdown](secondary-info.md#fan-mode-dropdown).

The card's own `icon` takes the same object. Arguments there are
`(climate_entity, hvac_mode)`, matching `hide_icon`, because the left icon has
no value of its own. See [icon](configuration.md#icon).

| argument | what it is |
|---|---|
| `state` | the value the option reads (mapped, for a button) |

Returns an `mdi:` icon name.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  preset_mode:
    type: dropdown
    icon:
      template: >
        (state) => state === 'boost' ? 'mdi:fan-chevron-up'
           : state === 'eco'   ? 'mdi:fan-chevron-down'
           : 'mdi:fan-speed-3'
    state:
      attribute: preset_mode
    active: state => state !== 'none'
    source:
      none: Plain
      boost: Turbo
      eco: Quiet
    change_action: >
      (selected, state, entity) => this.call_service('climate', 'set_preset_mode', { entity_id: entity.entity_id, preset_mode: selected })
```

## icon:style {#icon_style}

CSS to apply to the icon element, by the value.

```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  power:
    icon: mdi:power-plug
    icon:
      style: (value) => value === 'on' ? { color: 'green' } : {}
    source:
      entity: switch.ac_power
```

## value:style {#value_style}

CSS to apply to the indicator's value element, by the value. This is how a
value is hidden or coloured without `card_mod`.

```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    icon: mdi:water
    unit: '%'
    source:
      entity: sensor.ac_humidity
    value:
      style: value => value > 70 ? { color: 'red' } : {}
```

## hide

Whether the option is shown at all. Returns a boolean.

| argument | what it is |
|---|---|
| `state` | the value (mapped, for a button) |

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  turbo:
    icon: mdi:weather-hurricane
    hide: (state, entity) => !entity.attributes.turbo_al
```

## disabled

Whether the button does not react to a press. Returns a boolean.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  turbo:
    icon: mdi:weather-hurricane
    disabled: (state, entity) => !entity.attributes.turbo_al
```

## active

Whether a button is highlighted as the current choice. Returns a boolean.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  preset_mode:
    type: dropdown
    state:
      attribute: preset_mode
    active: state => state !== 'none'
    source:
      none: Plain
      boost: Turbo
```

## style

CSS to apply to the button element, by the state.

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  power:
    icon: mdi:power-plug
    style: (state) => state === 'on' ? { background: 'green' } : {}
```

**`color` and `opacity` need an `!important` of their own.** While a control is
on the card paints it with rules that already carry one, so those two
properties coming from a template are dropped and the icon keeps the accent
colour instead. Every other property - the `background` above included -
applies as written.

This bites exactly where it is least expected, because a style written for the
`on` state and the card's own rule become active at the same moment.

```yaml
buttons:
  power:
    icon: mdi:power-plug
    style: >
      (state) => (state === 'on'
        ? { background: 'green', color: 'white !important' }
        : {})
```

The same holds for `hvac_mode` and `fan_mode`, whose icons are drawn by the
same element - see [Controls](controls.md) for those.

## toggle_action

What happens when a `button` is pressed. The `switch.toggle` service is the
default when this is absent - write it to do something else. `this.toggle_state`
gives the opposite of the current state.

| argument | what it is |
|---|---|
| `state` | the current state; see `state:mapper` |

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  turbo:
    icon: mdi:weather-hurricane
    toggle_action: >
      (state) => this.call_service('mqtt', 'publish', { payload: this.toggle_state(state), topic: 'my_ac/turbo/set', retain: false, qos: 1 })
```

## change_action

What happens when a dropdown option is chosen. `selected_value` is the chosen
option's `id`.

| argument | what it is |
|---|---|
| `selected_value` | the configuration name of the chosen option |
| `state`, `entity`, `climate_entity`, `hvac_mode` | as above |

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  swing_mode:
    type: dropdown
    state:
      attribute: swing_mode
    source:
      'off': Off
      horizontal: On
    change_action: >
      (selected, state, entity) => this.call_service('climate', 'set_swing_mode', { entity_id: entity.entity_id, swing_mode: selected })
```

## unit:template {#unit_template}

The unit of an indicator, computed from the value. This is how the unit
follows the reading: the value a sensor reports is often plain, and the unit
depends on the threshold.

| argument | what it is |
|---|---|
| `mapped_value` | the value the indicator shows - what `state:mapper` returned |
| `value` | the value as the sensor reported it, **before** the mapper |

The first argument is what the card draws; the second is what decides the
unit. That split is what makes an auto-switching unit accurate: the mapper
divides the raw reading, the template reads the raw one to choose.

```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  power:
    icon: mdi:flash
    source:
      entity: sensor.ac_power
      mapper: value => value > 1000 ? value / 1000 : value
    unit:
      template: (mapped_value, value) => (value > 1000 ? 'kW' : 'W')
```

A sensor reporting `1500` shows **`1.5 kW`** - the mapper divided it, the unit
template picked `kW` from the raw `1500`.
