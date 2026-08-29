# Tap action

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [AI assistants](ai-assistants.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

## tap action object

| Name            |  Type  |   Default   |                                    Options                                    | Description                                                                       |
|-----------------|:------:|:-----------:|:-----------------------------------------------------------------------------:|-----------------------------------------------------------------------------------|
| action          | string | `more-info` | `more-info` / `navigate` / `call-service` / `fire-dom-event` / `url` / `none` | Action to perform.                                                                |
| entity          | string |             |                                 Any entity id                                 | Override default entity of `more-info`, when  `action` is defined as `more-info`. |
| service         | string |             |                                  Any service                                  | Service to call (e.g. `fan.turn_on`) when `action` is defined as `call-service`   |
| service_data    | object |             |                               Any service data                                | Service data to include with the service call.                                    |
| navigation_path | string |             |                                   Any path                                    | Path to navigate to (e.g. `/lovelace/0/`) when `action` is defined as `navigate`. |
| url             | string |             |                                    Any URL                                    | URL to open when `action` is defined as `url`.                                    |

An action that needs nothing but its name can be written as a bare string:
`tap_action: none` and `tap_action: more-info` mean the same as
`tap_action: {action: none}` and `tap_action: {action: more-info}`. The same
shorthand works for an indicator's `tap_action`, and for the two temperature
readings below.

## where a tap_action can go

| Option                          | What it covers                                | Default     |
|---------------------------------|-----------------------------------------------|-------------|
| `tap_action`                    | the entity name                               | `more-info` |
| `indicators: name: tap_action`  | that indicator                                 | `none`      |
| `temperature: tap_action`       | the current temperature reading               | `none`      |
| `target_temperature: tap_action`| the target temperature reading                | `none`      |

## temperature and target temperature

The card's own `tap_action` covers the entity name. The two temperatures next
to it are separate options, off by default - a card that was never clickable
there stays that way until it is asked.

`more-info` opens the entity the reading comes from, which is the climate
entity unless a `source: entity` names another one. That is the case this
exists for: a current temperature taken from a separate sensor has its own
history, and nothing else on the card leads to it.

Everything the card's own `tap_action` can do works here too - `navigate`,
`call-service`, or a `fire-dom-event` popup as in the
[examples below](#tap-action-example).

```yaml
# the history of the sensor the reading comes from
type: custom:mini-climate
entity: climate.my_ac
temperature:
  source:
    entity: sensor.living_room_temperature
  tap_action: more-info

# both readings, and a target that opens something else entirely
type: custom:mini-climate
entity: climate.my_ac
temperature:
  tap_action: more-info
target_temperature:
  tap_action:
    action: navigate
    navigation_path: '/lovelace/climate'
```

## tap action example
```yaml
# toggle example
# call-service example
type: custom:mini-climate
entity: climate.my_ac
tap_action:
  action: call-service
  service: climate.set_hvac_mode
  service_data:
    entity_id: climate.my_ac
    hvac_mode: 'off'

# fire-dom-event + browser mod example
type: custom:mini-climate
entity: climate.my_ac
tap_action:
  action: fire-dom-event
  browser_mod:
    service: browser_mod.popup
    data:
      title: My title
      content: test

# navigate example
type: custom:mini-climate
entity: climate.my_ac
tap_action:
  action: navigate
  navigation_path: '/lovelace/4'

# navigate example
type: custom:mini-climate
entity: climate.my_ac
tap_action:
  action: url
  url: 'https://www.google.com/'

# none example - the shorthand for {action: none}
type: custom:mini-climate
entity: climate.my_ac
tap_action: none

# more-info for custom entity example
type: custom:mini-climate
entity: climate.my_ac
tap_action:
  action: more-info
  entity: sensor.humidity
```
