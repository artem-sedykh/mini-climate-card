import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../../utils/buildElementDefinitions';

export default class ClimateCard extends ScopedRegistryHost(customElements.get('ha-card')) {
  static get defineId() { return 'ha-card'; }

  static get elementDefinitions() {
    return buildElementDefinitions();
  }
}
