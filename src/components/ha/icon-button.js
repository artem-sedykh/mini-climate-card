if (!customElements.get('ha-icon-button')) {
  customElements.define(
    'ha-icon-button',
    class extends customElements.get('paper-icon-button') {},
  );
}

export default class HumidifierIconButton extends customElements.get('ha-icon-button') {
  static get defineId() { return 'ha-icon-button'; }
}
