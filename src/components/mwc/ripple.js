import { RippleBase } from '@material/mwc-ripple/mwc-ripple-base';
import { styles as rippleStyles } from '@material/mwc-ripple/mwc-ripple.css';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

export default class ClimateRipple extends ScopedRegistryHost(RippleBase) {
  static get defineId() { return 'mwc-ripple'; }

  static get elementDefinitions() {
    return { };
  }

  static get styles() {
    return rippleStyles;
  }
}
