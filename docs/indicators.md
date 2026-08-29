# Indicators

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [AI assistants](ai-assistants.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

> The indicators display additional information on the card, for example, you can display humidity, consumption, etc.  
> Adding a simple indicator:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    icon: mdi:water
    unit: '%'
    round: 1
    source:
      entity: sensor.humidity
```

## indicator functions

> Consider configuring an indicator using javascript
> Functions available for the indicator:  

| Name            | Type     | execution context | arguments                                | return type |
|-----------------|----------|-------------------|------------------------------------------|-------------|
| [`source:mapper`](functions.md#state_mapper) | function | indicator config  | value, entity, climate_entity, hvac_mode | any         |
| [`icon:template`](functions.md#icon_template) | function | indicator config  | value, entity, climate_entity, hvac_mode | string      |
| [`icon:style`](functions.md#icon_style)    | function | indicator config  | value, entity, climate_entity, hvac_mode | object      |
| [`value:style`](functions.md#value_style)   | function | indicator config  | value, entity, climate_entity, hvac_mode | object      |
| [`unit:template`](functions.md#unit_template) | function | indicator config  | mapped_value, value, entity, climate_entity, hvac_mode | string |
| [`hide`](functions.md#hide)          | function | indicator config  | value, entity, climate_entity, hvac_mode | boolean     |

`value` - current indicator value  
`entity` - indicator entity  
`climate_entity` - climate entity
`hvac_mode` - current hvac_mode  

## source mapper

> Using the mapper function, you can change the indicator value:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  power:
    icon: mdi:power-plug
    source:
      values:
        'on': 'power is on!'
        'off': 'power is off!'
      entity: switch.ac_power
      # since the current execution context is an indicator config, we can use this.source.values to get values
      mapper: value => this.source.values[value]
      # example of using all function arguments
      # mapper: >
      #   (value, entity, climate_entity, hvac_mode) => {
      #     console.log(value);
      #     console.log(entity);
      #     console.log(climate_entity);
      #     console.log(hvac_mode);
      #     console.log(this);
      #     return ...
      #   }
```

## icon template

> The indicator icon can be calculated dynamically
  for example:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    icon:
      template: >
        (value) => (value > 30 ? 'mdi:weather-rainy' : 'mdi:water')
    unit: '%'
    round: 1
    source:
      entity: sensor.humidity
```

## icon style

> You can also set custom styles.
  for example:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    icon:
      template: () => 'mdi:water'
      style: >
        (value) => (value > 30 ? { color: 'red'} : {})
    unit: '%'
    round: 1
    source:
      entity: sensor.humidity
```

## value style

> You can also set custom styles.
  for example:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    value:
      style: >
        (value) => (value > 30 ? { color: 'red'} : {})
    unit: '%'
    round: 1
    source:
      entity: sensor.humidity
```

## Hide

> You can also hide based on state.
  for example:
```yaml
type: custom:mini-climate
entity: climate.my_ac
indicators:
  humidity:
    hide: >
      (value) => value < 20
    unit: '%'
    round: 1
    source:
      entity: sensor.humidity
```
