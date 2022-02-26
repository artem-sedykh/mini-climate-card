import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../../utils/buildElementDefinitions';
import ClimateSvgIcon from './svg-icon';

export default class ClimateIcon extends ScopedRegistryHost(customElements.get('ha-icon')) {
  static get defineId() { return 'ha-icon'; }

  static get elementDefinitions() {
    return buildElementDefinitions([ClimateSvgIcon]);
  }
}
