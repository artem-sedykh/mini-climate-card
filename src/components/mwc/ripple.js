import { RippleBase } from '@material/mwc-ripple/mwc-ripple-base';
import { styles as rippleStyles } from '@material/mwc-ripple/mwc-ripple.css';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../../utils/buildElementDefinitions';

export default class ClimateRipple extends ScopedRegistryHost(RippleBase) {
  static get defineId() { return 'mwc-ripple'; }

  static get elementDefinitions() {
    return buildElementDefinitions([], ClimateRipple);
  }

  static get styles() {
    return rippleStyles;
  }
}
