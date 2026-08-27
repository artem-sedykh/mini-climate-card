# Buttons

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md)

> You can add various buttons, supported types: button and dropdown

## buttons functions

| Name              | Type     | execution context | arguments                                         | return type                      |
|-------------------|----------|-------------------|---------------------------------------------------|----------------------------------|
| `state:mapper`    | function | button config     | state, entity, climate_entity, hvac_mode          | any                              |
| `source:__filter` | function | button config     | source, state, entity, climate_entity, hvac_mode  | object({ id..., name... }) array |
| `active`          | function | button config     | value, entity, climate_entity, hvac_mode          | boolean                          |
| `disabled`        | function | button config     | value, entity, climate_entity, hvac_mode          | boolean                          |
| `style`           | function | button config     | value, entity, climate_entity, hvac_mode          | object                           |
| `toggle_action`   | function | button config     | state, entity, climate_entity, hvac_mode          | promise                          |
| `change_action`   | function | button config     | selected_value, entity, climate_entity, hvac_mode | promise                          |
| `hide`            | function | button config     | state, entity, climate_entity, hvac_mode          | boolean                          |
| `icon`            | function | button config     | state, entity, climate_entity, hvac_mode          | string                           |

`state` - current button state value  
`entity` - button entity  
`climate_entity` - climate entity  
`hvac_mode` - current hvac_mode  
`source` - dropdown source object array: [ { id: 'id', name: 'name' }, ... ]  
`selected_value` -  selected dropdown value  

**execution context methods:**  

| Name           | arguments                 | description                                             | return type |
|----------------|---------------------------|---------------------------------------------------------|-------------|
| `toggle_state` | sate                      | toggle state, example: `this.toggle_state('on') => off` | string      |
| `call_service` | domain, service, options, | call Home Assistant service                             | promise     |

## dropdown
> Consider an example swing_mode configuration:

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  swing_mode:
    type: dropdown
    icon: mdi:approximately-equal
    state:
      attribute: swing_mode
    active: state => state !== 'off'
    source:
      'off': Off
      horizontal: On
    change_action: >
      (selected, state, entity) => this.call_service('climate', 'set_swing_mode', { entity_id: entity.entity_id, swing_mode: selected })
```

A `dropdown` button can also take an `icon` template, the same way an indicator
can: the icon it shows then follows the button state, which is what a preset
mode a user picks against two or three modes wants.

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

## button
> Consider the example of adding buttons:
```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  power:
    icon: mdi:power-plug
    state:
      entity: switch.ac_power
# for the button type, if no toggle_action is specified, the switch.toggle method is called
```

```yaml
type: custom:mini-climate
entity: climate.my_ac
buttons:
  turbo:
    icon: mdi:weather-hurricane
    hide: >
      (state, entity) => !entity.attributes.turbo_al
    state:
      attribute: turbo
      mapper: "state => (state ? 'on': 'off')"
    disabled: (state, entity) => !entity.attributes.turbo_al
    toggle_action: >
      (state) => this.call_service('mqtt', 'publish', { payload: this.toggle_state(state), topic: 'my_ac/turbo/set', retain: false, qos: 1 })
```
