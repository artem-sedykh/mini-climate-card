# Controls

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md)

## temperature

> Functions available:

| Name                       | Type     | execution context | arguments                                               | return type |
|----------------------------|----------|-------------------|---------------------------------------------------------|-------------|
| `hide_current_temperature` | function |                   | value, entity, target_entity, climate_entity, hvac_mode | boolean     |

`value` - temperature value  
`entity` - temperature entity  
`target_entity` - target temperature entity  
`climate_entity` - climate entity
`hvac_mode` - current hvac_mode

> Configuration example for the temperature:  
```yaml
type: custom:mini-climate
entity: climate.my_ac
hide_current_temperature: >
  (value) => value < 20
temperature:
  unit: '°C'
  round: 1
  # use an external temperature sensor
  source:
    entity: sensor.temperature
``` 

## target_temperature

> Functions available for the target_temperature:  

| Name            | Type     | execution context         | arguments                     | return type |
|-----------------|----------|---------------------------|-------------------------------|-------------|
| `change_action` | function | target_temperature config | value, entity, climate_entity | promise     |

`value` - target_temperature value  
`entity` - target_temperature entity  
`climate_entity` - climate entity

**execution context methods:**  

| Name           | arguments                 | description                                             | return type |
|----------------|---------------------------|---------------------------------------------------------|-------------|
| `toggle_state` | state                     | toggle state, example: `this.toggle_state('on') => off` | string      |
| `call_service` | domain, service, options, | call Home Assistant service                             | promise     |

> Configuration example for the target_temperature:  
```yaml
type: custom:mini-climate
entity: climate.my_ac
target_temperature:
  icons:
    up: mdi:chevron-up
    down: mdi:chevron-down
  unit: '°C'
  min: 16
  max: 31
  step: 0.5
  change_action: >
    (value, entity) => this.call_service('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: value })
``` 

## hvac_mode

> Functions available for the hvac_mode:  

| Name              | Type     | execution context | arguments                             | return type                          |
|-------------------|----------|-------------------|---------------------------------------|--------------------------------------|
| `state:mapper`    | function | hvac_mode config  | state, entity, climate_entity         | any                                  |
| `active`          | function | hvac_mode config  | state, entity, climate_entity         | boolean                              |
| `change_action`   | function | hvac_mode config  | selected, entity, climate_entity      | any                                  |
| `style`           | function | hvac_mode config  | value, entity, climate_entity         | object                               |
| `source:__filter` | function | hvac_mode config  | source, state, entity, climate_entity | object({ id..., name...,... }) array |
| `hide`            | function | hvac_mode config  | state, entity, climate_entity         | boolean                              |

`state` - current hvac state  
`selected` - selected value  
`entity` - hvac entity  
`climate_entity` - current climate entity  

**execution context methods:**  

| Name           | arguments                 | description                                             | return type |
|----------------|---------------------------|---------------------------------------------------------|-------------|
| `toggle_state` | state                     | toggle state, example: `this.toggle_state('on') => off` | string      |
| `call_service` | domain, service, options, | call Home Assistant service                             | promise     |

> Configuration example for the hvac_mode:  
```yaml
type: custom:mini-climate
entity: climate.my_ac
hvac_mode:
  style: "(value, entity) => ({ color: 'black !important' })"
  hide: >
    (state) => state === 'dry'
  source:
    'off':
      icon: mdi:power
      name: 'off'
    heat:
      icon: mdi:weather-sunny
      name: heat
    auto:
      icon: mdi:cached
      name: auto
    cool:
      icon: mdi:snowflake
      name: cool
    dry:
      icon: mdi:water
      name: dry
    fan_only:
      icon: mdi:fan
      name: fan
  change_action: >
    (selected, entity) => this.call_service('climate', 'set_hvac_mode', { entity_id: entity.entity_id, hvac_mode: selected })
``` 

The `!important` on that `color` is not decoration. While the climate entity is
on, the card marks the mode button active and paints it with a rule that
carries one already, so a plain `color` from the template is dropped - see
[style](functions.md#style).

## fan_mode

> Functions available for the fan_mode:  

| Name              | Type     | execution context | arguments                                         | return type                      |
|-------------------|----------|-------------------|---------------------------------------------------|----------------------------------|
| `state:mapper`    | function | button config     | state, entity, climate_entity, hvac_mode          | any                              |
| `source:__filter` | function | button config     | source, state, entity, climate_entity, hvac_mode  | object({ id..., name... }) array |
| `active`          | function | button config     | value, entity, climate_entity, hvac_mode          | boolean                          |
| `disabled`        | function | button config     | value, entity, climate_entity, hvac_mode          | boolean                          |
| `style`           | function | button config     | value, entity, climate_entity, hvac_mode          | object                           |
| `change_action`   | function | button config     | selected_value, entity, climate_entity, hvac_mode | promise                          |
| `hide`            | function | button config     | state, entity, climate_entity, hvac_mode          | boolean                          |

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

> Configuration example for the fan_mode:  
```yaml
type: custom:mini-climate
entity: climate.my_ac
fan_mode:
  hide: >
    (state) => state === 'low'
  icon: mdi:fan
  order: 0
  active: (state, entity) => entity.state !== 'off'
  source:
    auto: auto
    low: low
    medium: medium
    high: high
    # filter usage example
    __filter: >
      (source, state, entity) => entity.attributes
        .fan_modes_al.map(fan_mode => source.find(s => s.id === fan_mode))
        .filter(fan_mode=>fan_mode)
  change_action: >
    (selected, state, entity) => this.call_service('climate', 'set_fan_mode', { entity_id: entity.entity_id, fan_mode: selected })
```
