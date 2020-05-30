import { css } from 'lit-element';

const sharedStyle = css`
  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label {
    margin: 0 8px;
  }
  ha-icon {
    width: calc(var(--mc-unit) * .6);
    height: calc(var(--mc-unit) * .6);
  }
  ha-icon-button {
    width: calc(var(--mc-unit));
    height: calc(var(--mc-unit));
    --mdc-icon-button-size: calc(var(--mc-unit));
    color: var(--mc-button-color);
    transition: color .25s;
  }
  ha-icon-button[color] {
    color: var(--mc-icon-active-color) !important;
    opacity: 1 !important;
  }
  ha-icon-button[inactive] {
    opacity: .5;
  }
`;

export default sharedStyle;
