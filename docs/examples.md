# Examples

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md)

> I originally wrote a plugin for my air conditioner implementation using [esphome](https://github.com/esphome/esphome)
> if interested, you can source [esphome-mqtt-climate](https://github.com/artem-sedykh/esphome-mqtt-climate)
> the following is a configuration example for my air conditioner

```yaml
type: custom:mini-climate
entity: climate.dahatsu
name: Кондиционер
fan_mode:
  source:
    auto: Авто
    low: Слабый
    medium: Средний
    high: Сильный
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
      'off': Выкл
      horizontal: Вкл
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
        'on': 'вкл'
        'off': 'выкл'
    # localization of values
    mapper: value => this.source.values[value]
```

## Recipes

Five things this tracker has been asked for more than once, with the answer and
what it looks like.

Each is also a card in the bench's manifest and an assertion in
`test/e2e/answers.test.mjs`, so an answer that stops being true fails a run
rather than sitting here reading well.

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

### The mode icon coloured by what the unit is doing

`hvac_action` is what the unit is doing now - heating, cooling, idle - as
against `state`, which is what it was asked to do. The style template is handed
the entity, so both are available.

```yaml
hvac_mode:
  style: >
    (value, entity) => ({
      color: entity.attributes.hvac_action === 'cooling'
        ? 'blue'
        : entity.attributes.hvac_action === 'heating'
          ? 'red'
          : 'grey',
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
