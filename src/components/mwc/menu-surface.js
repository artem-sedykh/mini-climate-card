import { MenuSurfaceBase } from '@material/mwc-menu/mwc-menu-surface-base';
import { styles as menuSurfaceStyles } from '@material/mwc-menu/mwc-menu-surface.css';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { css } from 'lit';
import buildElementDefinitions from '../../utils/buildElementDefinitions';

export default class ClimateMenuSurface extends ScopedRegistryHost(MenuSurfaceBase) {
  static get defineId() { return 'mwc-menu-surface'; }

  static get elementDefinitions() {
    return buildElementDefinitions([], ClimateMenuSurface);
  }

  static get styles() {
    return [
      menuSurfaceStyles,
      css`
        .mdc-menu-surface {
          position: fixed!important;
        }
      `,
    ];
  }
}
