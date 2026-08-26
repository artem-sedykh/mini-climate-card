// Stand-ins for the Home Assistant elements the card renders.
//
// Neither `ha-card`, `ha-icon` nor `ha-icon-button` exists outside a running
// Home Assistant frontend, and the card only ever passes properties into them
// and reads nothing back. What the tests need is that they exist and that they
// occupy space.

const define = (name, element) => {
  if (!customElements.get(name)) customElements.define(name, element);
};

// The real elements bring their own `display`, and the card's styles size them
// on the strength of it - an inline stand-in collapses, and anything that
// measures the layout then measures nothing.
const shadow = (element, styles) => {
  if (!element.shadowRoot)
    element.attachShadow({ mode: 'open' }).innerHTML = `<style>${styles}</style><slot></slot>`;
};

class HaCard extends HTMLElement {
  connectedCallback() {
    shadow(this, ':host { display: block; }');
  }
}

class HaIcon extends HTMLElement {
  connectedCallback() {
    shadow(this, ':host { display: inline-block; width: 24px; height: 24px; }');
  }
}

class HaIconButton extends HTMLElement {
  connectedCallback() {
    shadow(this, ':host { display: inline-flex; align-items: center; justify-content: center; }');
    // The real one wraps a <button>, so it takes focus. Without this the card
    // can hand focus back to it and nothing happens, which is a difference
    // worth not having in a test.
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
  }

  // `?disabled=${...}` reflects an attribute; the real element stops responding
  // to a press because of it. Nothing here needs to reproduce that, but a test
  // asking whether a control is disabled should read the same thing a user
  // would experience.
  get disabled() {
    return this.hasAttribute('disabled');
  }
}

export const defineHaElements = () => {
  define('ha-card', HaCard);
  define('ha-icon', HaIcon);
  define('ha-icon-button', HaIconButton);
};
