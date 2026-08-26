import define from '../utils/define';
import { LitElement, html, css, type TemplateResult } from 'lit';
import ICON from '../const';
import type HvacModeObject from '../models/hvac-mode';
import type { SourceItem } from '../types';
import './dropdown-base';

export default class ClimateModeMenu extends LitElement {
  mode!: HvacModeObject;

  constructor() {
    super();
    this.mode = {} as HvacModeObject;
  }

  static override get properties() {
    return {
      mode: { type: Object },
    };
  }

  get calcIcon(): string {
    if (this.selected) {
      if (this.selected.icon) return this.selected.icon;

      if (this.selected.id !== undefined && this.selected.id !== null) {
        const id = this.selected.id.toString().toUpperCase();

        if (id in ICON) return ICON[id];
      }
    }

    return '';
  }

  get selected(): SourceItem {
    return this.mode.source.find(i => i.id === this.mode.state) || ({} as SourceItem);
  }

  get sources(): SourceItem[] {
    return this.mode.source
      .filter(s => !s.hide)
      .map(s => ({ name: s.name, id: s.id, type: 'source' }));
  }

  handleChange(e: CustomEvent): void {
    e.stopPropagation();
    const selected = e.detail.id;
    this.mode.handleChange(selected);
  }

  override render(): TemplateResult {
    return html`
      <mc-dropdown-base
        @change=${this.handleChange}
        .items=${this.sources}
        .icon=${this.calcIcon}
        .iconStyle=${this.mode.style}
        .active=${this.mode.isActive(this.mode.state)}
        .selected=${this.selected.id}>
      </mc-dropdown-base>
    `;
  }

  static override get styles() {
    return css`
      :host {
        min-width: calc(var(--mc-unit) * .85);
        --mc-dropdown-unit: calc(var(--mc-unit) * .75);
        --paper-item-min-height: var(--mc-unit);
      }
    `;
  }
}

define('mc-mode-menu', ClimateModeMenu);
