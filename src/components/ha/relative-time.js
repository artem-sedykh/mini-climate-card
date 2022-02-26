import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../../utils/buildElementDefinitions';

export default class ClimateRelativeTime extends ScopedRegistryHost(customElements.get('ha-relative-time')) {
  static get defineId() { return 'ha-relative-time'; }

  static get elementDefinitions() {
    return buildElementDefinitions();
  }
}
