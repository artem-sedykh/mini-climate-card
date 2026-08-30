# Secondary info

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Visual editor](visual-editor-parameters.md) | [Examples](examples.md) | [AI assistants](ai-assistants.md) | [Development](development.md)

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

By default the card shows Home Assistant's own string for the action, in the
language the dashboard is in - the same one the thermostat card shows. They
come from the [climate integration](https://github.com/home-assistant/core/blob/dev/homeassistant/components/climate/strings.json),
and the modes and fan speeds elsewhere on the card work the same way.
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
![the fan mode dropdown open, with the current mode highlighted](https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/fan-mode-dropdown.png)

The dropdown under the name draws `fan_mode`'s icon. A template can pick a
different glyph per mode; `items` is data the template reads back through
`this` as `this.icon.items`, because the context is the whole `fan_mode`
option, not the nested `icon` object. See [`this`](functions.md#this). Hide
the fan_mode button so the same control is not on the card twice.

A string on `secondary_info.icon` replaces this and freezes the glyph, which
is why that key is left off here.

```yaml
type: custom:mini-climate
entity: climate.dahatsu
secondary_info: fan-mode-dropdown
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
  source:
    auto: Automatic
    low: Gentle
    medium: Middling
    high: Strong
```
