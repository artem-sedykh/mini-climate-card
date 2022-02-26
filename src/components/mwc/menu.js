import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { MenuBase } from '@material/mwc-menu/mwc-menu-base';
import { styles as menuStyles } from '@material/mwc-menu/mwc-menu.css';
import ClimateMenuSurface from './menu-surface';
import ClimateList from './list';

export default class ClimateMenu extends ScopedRegistryHost(MenuBase) {
  static get defineId() { return 'mwc-menu'; }

  static get elementDefinitions() {
    return {
      [ClimateMenuSurface.defineId]: ClimateMenuSurface,
      [ClimateList.defineId]: ClimateList,
    };
  }

  static get styles() {
    return menuStyles;
  }
}
