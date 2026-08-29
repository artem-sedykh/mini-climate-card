import { css } from 'lit';

// The `ha-icon` rule below sets three properties, and the third is the fix for
// #287 (raised out of #162). The width and height size the *element*; `ha-icon`
// draws its glyph at `--mdc-icon-size`, which nothing set. So the box scaled
// with the card and the drawing inside it stayed at the browser's 24px default,
// and `scale` grew everything except the icons. At scale 1 it showed as a 24px
// glyph in a 17px box; at scale 2.5, as a 35px name beside 24px chevrons.
//
// `.6` is not a new choice - it is the ratio the width and height already used,
// which is what makes this no change at all at the default: .6 of a 40px unit
// is exactly the 24px that was being drawn anyway. The components that want a
// different size - indicators, secondary info, the fan mode dropdown in it -
// set `--mdc-icon-size` on a class of their own and keep winning on
// specificity, so they do not move either.
//
// `--ha-icon-size` is deliberately not set beside it. Measured on 2026.8.3
// rather than assumed, because #188 was exactly this kind of rename: `ha-icon`
// honours `--mdc-icon-size` (48px in, 48px out) and ignores `--ha-icon-size`
// (64px in, 24px out). It was the icon *button* size that moved, not this one.
//
// The rationale lives out here rather than in the stylesheet because everything
// inside the template is a string that ships to every user.
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
    --mdc-icon-size: calc(var(--mc-unit) * .6);
  }
  ha-icon-button {
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
