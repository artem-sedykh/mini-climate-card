# Mini Climate Card - Visual Editor Parameters

The following parameters are configurable via the built-in visual (UI) editor.  
Parameters that require JavaScript function strings (`change_action`, `active`, `style`, etc.) remain YAML-only.

---

## Basic

| Parameter | Type | Description |
|---|---|---|
| `entity` | entity picker | Required. Climate or fan entity (`climate.*` / `fan.*`) |
| `name` | text | Optional override for the entity's friendly name |
| `icon` | icon picker | Custom MDI icon (e.g. `mdi:air-conditioner`) |
| `group` | toggle | Remove card background, padding and box-shadow |
| `scale` | number (0.5 - 3) | UI scale modifier (affects `--mc-unit` CSS variable) |
| `swap_temperatures` | toggle | Swap the current and target temperature positions |
| `hide_current_temperature` | toggle | Hide the current temperature reading |

---

## Tap Action

| Parameter | Type | Description |
|---|---|---|
| `tap_action.action` | select | Action on name/icon tap: `more-info`, `navigate`, `call-service`, `url`, `fire-dom-event`, `none` |
| `tap_action.navigation_path` | text | Path to navigate to (used when action = `navigate`, e.g. `/lovelace/0/`) |
| `tap_action.url` | text | URL to open (used when action = `url`) |

---

## Secondary Info

| Parameter | Type | Description |
|---|---|---|
| `secondary_info.type` | select | Display type: `fan-mode`, `fan-mode-dropdown`, `hvac-mode`, `hvac-action`, `last-changed`, `last-updated` |
| `secondary_info.hide` | toggle | Hide the secondary info row |
| `secondary_info.icon` | icon picker | Custom icon shown next to the secondary info text |

---

## Toggle Panel Button

Controls the `...` button that expands/collapses the bottom button panel.

| Parameter | Type | Description |
|---|---|---|
| `toggle.hide` | toggle | Hide the toggle button entirely |
| `toggle.default` | toggle | Start with the button panel expanded by default |
| `toggle.icon` | icon picker | Custom icon for the toggle button (default `mdi:dots-horizontal`) |

---

## Temperature Display

| Parameter | Type | Description |
|---|---|---|
| `temperature.unit` | select / text | Display unit: `°C` or `°F` (custom value supported) |
| `temperature.round` | number (0 - 5) | Number of decimal places to round the displayed value |

---

## Target Temperature

| Parameter | Type | Description |
|---|---|---|
| `target_temperature.unit` | select / text | Display unit: `°C` or `°F` (custom value supported) |
| `target_temperature.min` | number | Minimum allowed set-point (overrides entity `min_temp`) |
| `target_temperature.max` | number | Maximum allowed set-point (overrides entity `max_temp`) |
| `target_temperature.step` | number (0.1 - 5) | Temperature change step (overrides entity `target_temp_step`) |
| `target_temperature.icons.up` | icon picker | Icon for the increase-temperature button (default `mdi:chevron-up`) |
| `target_temperature.icons.down` | icon picker | Icon for the decrease-temperature button (default `mdi:chevron-down`) |

---

## HVAC Mode

| Parameter | Type | Description |
|---|---|---|
| `hvac_mode.hide` | toggle | Hide the HVAC mode dropdown |

---

## Fan Mode

| Parameter | Type | Description |
|---|---|---|
| `fan_mode.icon` | icon picker | Custom icon for the fan mode button (default `mdi:fan`) |
| `fan_mode.hide` | toggle | Hide the fan mode button |
| `fan_mode.location` | select | Where the button appears: `bottom` (toggle panel) or `main` (top control row) |

---

## Parameters NOT available in the UI (YAML only)

The following require JavaScript function strings and must be configured in YAML:

- All `change_action`, `toggle_action`, `active`, `disabled`, `style`, `mapper`, `hide` **(function form)** on any object
- `hvac_mode.source` - per-mode icon/name/order/hide customisation
- `fan_mode.source` / `fan_mode.source.__filter`
- `target_temperature.change_action`
- `secondary_info.source` - per-hvac-action icon/name customisation
- `buttons` - custom button/dropdown definitions
- `indicators` - sensor chip definitions
- `temperature.source.entity` / `temperature.source.attribute`
- `target_temperature.source.entity` / `target_temperature.source.attribute`

