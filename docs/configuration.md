# Configuration

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

## Options

### Card options
| Name                                      | Type                                | Default      | Since  | Description                                                                                                   |
|-------------------------------------------|-------------------------------------|--------------|--------|---------------------------------------------------------------------------------------------------------------|
| type                                      | string                              | **required** | v1.0.1 | `custom:mini-climate`                                                                                         |
| entity                                    | string                              | **required** | v1.0.1 | An entity_id from an entity within the `climate` domain                                                       |
| name                                      | string                              | optional     | v1.0.1 | Override the entities friendly name                                                                           |
| group                                     | boolean                             | optional     | v1.0.2 | Removes border, paddings, background color and box-shadow                                                     |
| icon                                      | string                              | optional     | v1.0.1 | Specify a custom icon from any of the available mdi icons                                                     |
| swap_temperatures                         | boolean                             | optional     | V2.1.1 | Swap the current and the target temperature in the card                                                       |
| hide_icon                                 | boolean                             | optional     | v3.0.0 | Hide the entity icon on the left, default value `False`                                                       |
| hide_icon                                 | function                            | optional     | v3.0.0 | Custom hide the entity icon function, see [hide_icon](#hide_icon)                                             |
| hide_current_temperature                  | boolean                             | optional     | V2.1.2 | Hide the current temperature in the card                                                                      |
| hide_current_temperature                  | function                            | optional     | V2.5.0 | Custom hide the current temperature in the card function                                                      |
| **toggle**                                | object                              | optional     | v1.0.2 | Show/hide bottom buttons toggle button                                                                        |
| toggle: `icon`                            | string                              | optional     | v1.0.2 | Custom icon, default value `mdi:dots-horizontal`                                                              |
| toggle: `hide`                            | boolean                             | optional     | v1.0.2 | Hide toggle button, default value `False`                                                                     |
| toggle: `hide`                            | function                            | optional     | v2.5.0 | Custom hide toggle button function                                                                            |
| toggle: `default`                         | boolean                             | optional     | v1.0.2 | Default toggle button state, default value `False`                                                            |
| **secondary_info**                        | object                              | optional     | v1.1.0 | secondary_info config. [secondary info examples](secondary-info.md)                                             |
| secondary_info: `type`                    | string                              | optional     | v1.1.0 | Available types: `last-changed, last-updated (v2.2.0), fan-mode, fan-mode-dropdown, hvac-mode, hvac-action`   |
| secondary_info: `icon`                    | string                              | optional     | v1.1.0 | Icon for types: `fan-mode, fan-mode-dropdown, hvac-mode`, `hvac-action`                                       |
| secondary_info: `hide`                    | boolean                             | optional     | v2.3.0 | Hide secondary_info, default value `False`                                                                    |
| secondary_info: `hide`                    | function                            | optional     | v2.5.0 | Custom hide secondary_info function.                                                                          |
| secondary_info: `source`                  | object                              | optional     | v1.2.1 | Source available types: `hvac-action`                                                                         |
| secondary_info: `source:{item_name}`      | object                              | optional     | v1.2.1 | Source item name                                                                                              |
| secondary_info: `source:{item_name}:icon` | object                              | optional     | v1.2.1 | Specify a custom icon from any of the available mdi icons                                                     |
| secondary_info: `source:{item_name}:name` | object                              | optional     | v1.2.1 | Display name                                                                                                  |
| **temperature**                           | object                              | optional     | v1.0.1 | Current temperature configuration. [temperature examples](controls.md#temperature)                                       |
| temperature: `unit`                       | string                              | optional     | v1.0.1 | Display unit, default `°C`                                                                                    |
| temperature: `round or fixed`             | number                              | optional     | v1.2.2 | Rounding or fixed value, default `round: 1`                                                                   |
| temperature: `source`                     | object                              | optional     | v1.0.1 | Data source for target temperature                                                                            |
| temperature: `source:entity`              | string                              | optional     | v1.0.1 | entity_id, default current climate entity_id                                                                  |
| temperature: `source:attribute`           | string                              | optional     | v1.0.1 | Default `current_temperature`                                                                                 |
| **target_temperature**                    | object                              | optional     | v1.0.1 | Target temperature configuration. [target_temperature examples](controls.md#target_temperature)                          |
| target_temperature: `icons`               | object                              | optional     | v1.0.1 | Icons for temperature change buttons                                                                          |
| target_temperature: `icons:up`            | string                              | optional     | v1.0.1 | Up icon, default `mdi:chevron-up`                                                                             |
| target_temperature: `icons:down`          | string                              | optional     | v1.0.1 | Down icon, default `mdi:chevron-down`                                                                         |
| target_temperature: `unit`                | string                              | optional     | v1.0.1 | Display unit, default `°C`                                                                                    |
| target_temperature: `min`                 | number                              | optional     | v1.0.1 | Minimum temperature, the default value is taken from the attribute `min_temp` of the given entity             |
| target_temperature: `max`                 | number                              | optional     | v1.0.1 | Maximum temperature, the default value is taken from the attribute `max_temp` of the given entity             |
| target_temperature: `step`                | number                              | optional     | v1.0.1 | Temperature change step, the default value is taken from the attribute `target_temp_step` of the given entity |
| target_temperature: `source`              | object                              | optional     | v1.0.1 | Data source for target temperature                                                                            |
| target_temperature: `source:entity`       | string                              | optional     | v1.0.1 | entity_id, default current climate entity_id                                                                  |
| target_temperature: `source:attribute`    | string                              | optional     | v1.0.1 | Default `temperature`                                                                                         |
| target_temperature: `change_action`       | function                            | optional     | v1.0.1 | Custom temperature change function                                                                            |
| **hvac_mode**                             | object                              | optional     | v1.0.1 | HVAC mode. [hvac_mode examples](controls.md#hvac_mode)                                                                   |
| hvac_mode: `style`                        | function                            | optional     | v1.0.1 | Custom style                                                                                                  |
| hvac_mode: `change_action`                | function                            | optional     | v1.0.1 | Custom hvac_mode change function                                                                              |
| hvac_mode: `state`                        | object                              | optional     | v1.0.1 | Config to get hvac_mode state                                                                                 |
| hvac_mode: `hide`                         | boolean                             | optional     | v1.2.3 | Hide hvac_mode, default value `False`                                                                         |
| hvac_mode: `hide`                         | function                            | optional     | v2.5.0 | Custom hide hvac_mode function                                                                                |
| hvac_mode: `state:entity`                 | string                              | optional     | v1.1.0 | hvac_mode entity_id                                                                                           |
| hvac_mode: `state:attribute`              | string                              | optional     | v1.1.0 | hvac_mode attribute                                                                                           |
| hvac_mode: `state:mapper`                 | function                            | optional     | v1.1.0 | State processing function                                                                                     |
| hvac_mode: `active`                       | function                            | optional     | v1.1.0 | Active function                                                                                               |
| hvac_mode: `source`                       | object                              | optional     | v1.0.1 | Data                                                                                                          |
| hvac_mode: `source:__filter`              | function                            | optional     | v1.1.0 | [Filter function](functions.md#source__filter)                                                                                               |
| hvac_mode: `source:item`                  | object                              | optional     | v1.0.1 | `item` - mode name e.g. cool, heat, off, etc.                                                                 |
| hvac_mode: `source:item:icon`             | string                              | optional     | v1.0.1 | Specify a custom icon from any of the available mdi icons                                                     |
| hvac_mode: `source:item:name`             | string                              | optional     | v1.0.1 | Display name                                                                                                  |
| hvac_mode: `source:item:hide`             | boolean                             | optional     | v2.5.0 | Hide source, default value `False`                                                                            |
| hvac_mode: `source:item:order`            | number                              | optional     | v1.2.5 | Sort order                                                                                                    |
| **fan_mode**                              | object                              | optional     | v1.0.1 | Fan operation for climate device. [fan_mode examples](controls.md#fan_mode)                                              |
| fan_mode: `icon`                          | string                              | optional     | v1.0.1 | Specify a custom icon from any of the available mdi icons                                                     |
| fan_mode: `icon`                          | string or function                  | optional     | v3.1.0 | A `template` function as in [icons](indicators.md#icon-template); the dropdown under the name uses this too, see [fan-mode-dropdown](secondary-info.md#fan-mode-dropdown) |
| fan_mode: `order`                         | number                              | optional     | v1.0.1 | Sort order, default value `0`                                                                                 |
| fan_mode: `location`                      | string                              | optional     | v1.0.1 | Allows you to display buttons on the main panel, types `main, bottom`, default `bottom`                       |
| fan_mode: `hide`                          | number                              | optional     | v1.0.1 | Hide button, default value `False`                                                                            |
| fan_mode: `hide`                          | function                            | optional     | v2.5.0 | Custom hide button function                                                                                   |
| fan_mode: `style`                         | function                            | optional     | v1.0.1 | Style                                                                                                         |
| fan_mode: `disabled`                      | function                            | optional     | v1.0.1 | Disabled function                                                                                             |
| fan_mode: `active`                        | function                            | optional     | v1.0.1 | Active                                                                                                        |
| fan_mode: `change_action`                 | function                            | optional     | v1.0.1 | Custom fan_mode change function                                                                               |
| fan_mode: `state`                         | object                              | optional     | v1.0.1 | Config to get fan_mode state                                                                                  |
| fan_mode: `state:entity`                  | string                              | optional     | v1.0.1 | fan_mode entity_id                                                                                            |
| fan_mode: `state:attribute`               | string                              | optional     | v1.0.1 | fan_mode attribute, default `fan_mode`                                                                        |
| fan_mode: `source`                        | object                              | optional     | v1.0.1 | Source for drop down list                                                                                     |
| fan_mode: `source:item`                   | string                              | optional     | v1.0.1 | `item` - mode name e.g. auto, low, medium...                                                                  |
| fan_mode: `source:__filter`               | function                            | optional     | v1.0.1 | [Source filter](functions.md#source__filter)                                                                                                 |
| **indicators**                            | object                              | optional     | v1.0.1 | Any indicators, [examples](indicators.md)                                                                       |
| indicators: `name`                        | object                              | optional     | v1.0.1 | The name of your indicator see [examples](indicators.md)                                                        |
| indicators: `name:icon`                   | string                              | optional     | v1.0.1 | Specify a custom icon from any of the available mdi icons                                                     |
| indicators: `name:icon`                   | object                              | optional     | v1.0.1 | Icon object                                                                                                   |
| indicators: `name:icon:template`          | function                            | optional     | v1.0.1 | Icon template function                                                                                        |
| indicators: `name:icon:style`             | function                            | optional     | v1.0.1 | Styles                                                                                                        |
| indicators: `name:value`                  | object                              | optional     | v1.0.1 | Value object                                                                                                  |
| indicators: `name:value:style`            | function                            | optional     | v1.0.1 | Styles                                                                                                        |
| indicators: `name:unit`                   | string                              | optional     | v1.0.1 | Display unit                                                                                                  |
| indicators: `name:unit`                   | function                            | optional     | v3.1.0 | [Unit template](functions.md#unit_template)                                                                   |
| indicators: `name:round`                  | number                              | optional     | v1.0.1 | Rounding number value                                                                                         |
| indicators: `name:hide`                   | boolean                             | optional     | v2.5.0 | Hide indicator, default value `False`                                                                         |
| indicators: `name:hide`                   | function                            | optional     | v2.5.0 | Custom hide indicator function                                                                                |
| indicators: `name:source`                 | number                              | optional     | v1.0.1 | Data source                                                                                                   |
| indicators: `name:source:entity`          | string                              | optional     | v1.0.1 | Indicator entity_id                                                                                           |
| indicators: `name:source:attribute`       | string                              | optional     | v1.0.1 | Entity attribute                                                                                              |
| indicators: `name:source:mapper`          | function                            | optional     | v1.0.1 | Value processing function                                                                                     |
| indicators: `name:tap_action`             | [action object](tap-action.md#tap-action-object) | true         | v1.1.0 | Action on click/tap                                                                                           |
| **buttons**                               | object                              | optional     | v1.0.1 | Any buttons, [example](buttons.md)                                                                              |
| buttons: `name`                           | object                              | optional     | v1.0.1 | The name of your button see examples                                                                          |
| buttons: `name:icon`                      | string                              | optional     | v1.0.1 | Specify a custom icon from any of the available mdi icons                                                     |
| buttons: `name:icon`                      | string or function                  | optional     | v3.1.0 | Specify a custom icon from any of the available mdi icons, or a `template` function as in [icons](indicators.md#icon-template) |
| buttons: `name:type`                      | string                              | optional     | v1.0.1 | `dropdown` or `button` default `button`                                                                       |
| buttons: `name:order`                     | number                              | optional     | v1.0.1 | Sort order                                                                                                    |
| buttons: `name:location`                  | string                              | optional     | v1.2.1 | Allows you to display buttons on the main panel, types `main, bottom`, default `bottom`                       |
| buttons: `name:state`                     | object                              | optional     | v1.0.1 | Config to get button state                                                                                    |
| buttons: `name:state:entity`              | string                              | optional     | v1.0.1 | Button entity_id                                                                                              |
| buttons: `name:state:attribute`           | string                              | optional     | v1.0.1 | Entity attribute                                                                                              |
| buttons: `name:state:mapper`              | function                            | optional     | v1.0.1 | State processing function                                                                                     |
| buttons: `name:disabled`                  | function                            | optional     | v1.0.1 | Calc disabled button                                                                                          |
| buttons: `name:hide`                      | boolean                             | optional     | v2.5.0 | Hide button, default value `False`                                                                            |
| buttons: `name:hide`                      | function                            | optional     | v2.5.0 | Custom hide button function                                                                                   |
| buttons: `name:active`                    | function                            | optional     | v1.0.1 | For type `dropdown`                                                                                           |
| buttons: `name:source`                    | object                              | optional     | v1.0.1 | For type `dropdown`                                                                                           |
| buttons: `name:source:item`               | string                              | optional     | v1.0.1 | Source item, format horizontal: horizontal                                                                    |
| buttons: `name:source:__filter`           | function                            | optional     | v1.0.1 | [Filter function](functions.md#source__filter)                                                                                               |
| buttons: `name:change_action`             | function                            | optional     | v1.0.1 | For type `dropdown`                                                                                           |
| buttons: `name:toggle_action`             | function                            | optional     | v1.0.1 | For type `button`                                                                                             |
| buttons: `name:style`                     | function                            | optional     | v1.0.1 | Styles                                                                                                        |
| tap_action                                | [action object](tap-action.md#tap-action-object) | true         | v1.0.4 | Action on click/tap, [tap_action](tap-action.md#tap-action-example)                                                        |
| scale                                     | number                              | optional     | v1.0.1 | UI scale modifier, default is `1`                                                                             |

### hide_icon

Hides the entity icon on the left of the card and gives the space to the name.

| Name        | Type     | execution context | arguments                 | return type |
|-------------|----------|-------------------|---------------------------|-------------|
| `hide_icon` | function | card config       | climate_entity, hvac_mode | boolean     |

`climate_entity` - climate entity  
`hvac_mode` - current hvac_mode

```yaml
# always
type: custom:mini-climate
entity: climate.my_ac
hide_icon: true

# only while the unit is off
type: custom:mini-climate
entity: climate.my_ac
hide_icon: >
  (climate_entity) => climate_entity.state === 'off'
```

### toggle

#### toggle functions

| Name   | Type     | execution context | arguments                 | return type |
|--------|----------|-------------------|---------------------------|-------------|
| `hide` | function | toggle config     | climate_entity, hvac_mode | boolean     |

`climate_entity` - climate entity  
`hvac_mode` - current hvac_mode

```yaml
type: custom:mini-climate
entity: climate.dahatsu
toggle:
  default: true
  icon: 'mdi:fan'
  hide: >
    (climate_entity) => !climate_entity.attributes.turbo_al
```

## Theme variables
The following variables are available and can be set in your theme to change the appearence of the card.
Can be specified by color name, hexadecimal, rgb, rgba, hsl, hsla, basically anything supported by CSS.

| name                            | Default                                                               | Description                     |
|---------------------------------|-----------------------------------------------------------------------|---------------------------------|
| mini-climate-name-font-weight   | 400                                                                   | Font weight of the entity name  |
| mini-climate-info-font-weight   | 300                                                                   | Font weight of the states       |
| mini-climate-icon-color         | --mini-humidifier-base-color, var(--paper-item-icon-color, #44739e)   | The color for icons             |
| mini-climate-button-color       | --mini-humidifier-button-color, var(--paper-item-icon-color, #44739e) | The color for buttons icons     |
| mini-climate-accent-color       | var(--accent-color)                                                   | The accent color of UI elements |
| mini-climate-base-color         | var(--primary-text-color) & var(--paper-item-icon-color)              | The color of base text          |
| mini-climate-background-opacity | 1                                                                     | Opacity of the background       |
| mini-climate-scale              | 1                                                                     | Scale of the card               |
| mini-climate-card-box-shadow    | var(--ha-card-box-shadow, none)                                       | The card shadow                 |
