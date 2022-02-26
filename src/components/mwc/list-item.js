import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';
import { styles as listItemStyles } from '@material/mwc-list/mwc-list-item.css';
import ClimateRipple from './ripple';

export default class ClimateListItem extends ScopedRegistryHost(ListItemBase) {
  static get defineId() { return 'mwc-list-item'; }

  static get elementDefinitions() {
    return {
      [ClimateRipple.defineId]: ClimateRipple,
    };
  }

  static get styles() {
    return listItemStyles;
  }
}
