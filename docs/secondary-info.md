# Secondary info

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md)

## secondary info functions

| Name   | Type     | execution context     | arguments                 | return type |
|--------|----------|-----------------------|---------------------------|-------------|
| `hide` | function | secondary info config | climate_entity, hvac_mode | boolean     |

`climate_entity` - climate entity  
`hvac_mode` - current hvac_mode

```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info: last-changed

type: custom:mini-climate
entity: climate.dahatsu
secondary_info:
  type: fan-mode
  icon: 'mdi:fan'
  hide: >
    (climate_entity) => !climate_entity.attributes.turbo_al

type: custom:mini-climate
entity: climate.dahatsu
secondary_info: hvac-mode
```

## hvac-action type

By default, translations from the [Home Assistant frontend](https://github.com/home-assistant/frontend/blob/master/src/translations/en.json)
```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info:
  type: hvac-action
```
but you can customize your translations
```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info:
  type: hvac-action
  source:
    cooling: Cooling
```
You can set your own icon for each hvac-action
```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info:
  type: hvac-action
  source:
    cooling:
      icon: 'mdi:snowflake'
      name: Cooling
```
Or you can use one permanent icon
```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info:
  type: hvac-action
  icon: 'mdi:cached'
```

## fan-mode-dropdown

```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info: fan-mode-dropdown
```
![image](https://user-images.githubusercontent.com/861063/84180244-d80d0a80-aa8f-11ea-8275-f4e3db85fd31.png)
