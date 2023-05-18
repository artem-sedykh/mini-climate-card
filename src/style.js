import { css } from 'lit';

const style = css`
  :host {
    overflow: visible !important;
    display: block;
    --mc-scale: var(--mini-climate-scale, 1);
    --mc-unit: calc(var(--mc-scale) * 40px);
    --mc-name-font-weight: var(--mini-climate-name-font-weight, 400);
    --mc-info-font-weight: var(--mini-climate-info-font-weight, 300);
    --mc-entity-info-left-offset: 8px;
    --mc-accent-color: var(--mini-climate-accent-color, var(--accent-color, #f39c12));
    --mc-text-color: var(--mini-climate-base-color, var(--primary-text-color, #000));
    --mc-active-color: var(--mc-accent-color);
    --mc-button-color: var(--mini-climate-button-color, var(--paper-item-icon-color, #44739e));
    --mc-icon-color:
      var(--mini-climate-icon-color,
        var(--mini-climate-base-color,
          var(--paper-item-icon-color, #44739e)));
    --mc-icon-active-color: var(--state-binary_sensor-active-color, #ffc107);
    --mc-info-opacity: 1;
    --mc-bg-opacity: var(--mini-climate-background-opacity, 1);
    color: var(--mc-text-color);
    --mc-dropdown-unit: calc(var(--mc-unit) * .75);
    --paper-item-min-height: var(--mc-unit);
    --mdc-icon-button-size: calc(var(--mc-unit) * 0.75);
  }
  ha-card.--group {
    box-shadow: none;
  }
  ha-card.--bg {
    --mc-info-opacity: .75;
  }
  ha-card {
    cursor: default;
    display: flex;
    background: transparent;
    overflow: visible;
    padding: 0;
    position: relative;
    color: inherit;
    font-size: calc(var(--mc-unit) * 0.35);
    border: none;
  }
  ha-card:before {
    content: '';
    padding-top: 0px;
    transition: padding-top .5s cubic-bezier(.21,.61,.35,1);
    will-change: padding-top;
  }
  header {
    display: none;
  }
  .mc__bg {
    background: var(--ha-card-background, var(--card-background-color, var(--paper-card-background-color, white)));
    position: absolute;
    top: 0; right: 0; bottom: 0; left: 0;
    overflow: hidden;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    opacity: var(--mc-bg-opacity);
    box-shadow: var(--ha-card-box-shadow, none);
    box-sizing: border-box;
    border-radius: var(--ha-card-border-radius, 12px);
    border-width: var(--ha-card-border-width, 1px);
    border-style: solid;
    border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0) );
  }
  ha-card.--group .mc__bg {
    background: none;
    border: none;
  }
  .mc-climate {
    align-self: flex-end;
    box-sizing: border-box;
    position: relative;
    padding: 16px 16px 0px 16px;
    transition: padding .25s ease-out;
    width: 100%;
    will-change: padding;
  }
  .flex {
    display: flex;
    display: -ms-flexbox;
    display: -webkit-flex;
    flex-direction: row;
  }
  .mc-climate__core {
    position: relative;
    padding-right: 5px;
  }
  .entity__info {
    user-select: none;
    margin-left: var(--mc-entity-info-left-offset);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
  }
  .entity__icon {
    color: var(--mc-icon-color);
    white-space: nowrap;
  }
  .entity__icon[color] {
    color: var(--mc-icon-active-color);
  }
  .entity__icon {
    animation: fade-in .25s ease-out;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover;
    border-radius: 100%;
    height: var(--mc-unit);
    width: var(--mc-unit);
    min-width: var(--mc-unit);
    line-height: var(--mc-unit);
    margin-right: calc(var(--mc-unit) / 5);
    position: relative;
    text-align: center;
    will-change: border-color;
    transition: border-color .25s ease-out;
  }
  .entity__info__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: calc(var(--mc-unit) / 2);
    color: var(--mc-text-color);
    font-weight: var(--mc-name-font-weight);
  }
  .entity__secondary_info {
    margin-top: -2px;
  }
  ha-card.--initial .mc-climate {
    padding: 16px 16px 5px 16px;
  }
  ha-card.--unavailable .mc-climate {
    padding: 16px;
  }
  ha-card.--group .mc-climate {
    padding: 8px 0px 0px 0px;
  }
  .toggle-button {
    width: calc(var(--mc-unit) * .75);
    height: calc(var(--mc-unit) * .75);
    --mdc-icon-button-size: calc(var(--mc-unit) * .75);
    color: var(--mc-icon-color);
    margin-left: auto;
    margin-top: calc(var(--mc-unit) * -.125);
    margin-right: calc(var(--mc-unit) * .05);
    --ha-icon-display: flex;
  }
  .toggle-button.open {
     transform: rotate(180deg);
     color: var(--mc-active-color);
  }
  .wrap {
    display: flex;
    flex-direction: row;
  }
  .entity__controls {
    margin-left: auto;
    display: flex;
    white-space: nowrap;
    margin-top: calc(var(--mc-unit) * -.25);
  }
  .ctl-wrap {
    display: flex;
    flex-direction: row;
    margin-left: auto;
    margin-top: auto;
    margin-bottom: 0;
    --ha-icon-display: flex;
  }
  .bottom {
    margin-top: calc(var(--mc-unit) * .05);
    height: calc(var(--mc-unit) * .625);;
  }
  .entity__info__name_wrap {
    margin-right: 10px;
    max-width: calc(calc(var(--mc-card-width) - 191.3px) / 1.43);
    min-width: calc(var(--mc-unit) * 2.5);
    cursor: pointer;
    height: var(--mc-unit);
  }
  mc-buttons {
    width: 100%;
    justify-content: space-evenly;
    display: flex;
    --ha-icon-display: flex;
  }
  mc-temperature {
    min-width: 0;
  }
  .--unavailable .ctl-wrap {
    margin-left: auto;
    margin-top: auto;
    margin-bottom: auto;
  }
  .--unavailable .entity__info {
    margin-top: auto;
    margin-bottom: auto;
  }
  .mc-toggle_content {
    margin-top: calc(var(--mc-unit) * .05);
  }
  .ctl-wrap mc-dropdown, .ctl-wrap mc-button {
    min-width: calc(var(--mc-unit) * .75);
    margin-right: 3px;
  }
  .ctl-wrap mc-button {
    width: calc(var(--mc-unit) * 0.75);
    height: calc(var(--mc-unit) * 0.75);
  }
`;

export default style;
