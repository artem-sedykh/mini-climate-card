import { LitElement, html, css } from 'lit';

// The menu behind every dropdown on the card: a list of options, one of which
// is the current one, opened against an anchor element.
//
// This replaces `@material/mwc-menu` and `@material/mwc-list`, which were
// wrapped in src/components/mwc/ so the card's copies would not collide with
// Home Assistant's. Those packages are end of life on lit 2 while the card is
// on lit 3, so the bundle carried both - four copies of lit 2, one per
// package, for a list of modes.
//
// The interface is the one the call sites already used: set `anchor`, call
// `show()`, listen for `selected` with the index in its detail.
//
// An item is `{ id, name }`: `id` is what goes back to the device, `name` is
// what the user reads.
const MENU_MARGIN = 8;

export default class ClimateMenu extends LitElement {
  static get defineId() {
    return 'mc-menu';
  }

  static get properties() {
    return {
      items: { type: Array },
      selected: { type: String },
      open: { type: Boolean, state: true },
    };
  }

  constructor() {
    super();
    this.items = [];
    this.open = false;
    this.anchor = null;
    this.onDocumentPointerDown = event => this.handleDocumentPointerDown(event);
    this.onDocumentKeydown = event => this.handleDocumentKeydown(event);
    this.onViewportChange = () => this.close();
  }

  disconnectedCallback() {
    // The listeners below live on the document, so a card removed while its
    // menu is open would leave them behind.
    this.stopListening();
    super.disconnectedCallback();
  }

  get selectedIndex() {
    if (this.selected === undefined || this.selected === null) return -1;

    return this.items.map(item => item.id).indexOf(this.selected);
  }

  get surface() {
    return this.shadowRoot && this.shadowRoot.getElementById('surface');
  }

  get options() {
    return this.surface ? [...this.surface.querySelectorAll('.mc-menu__item')] : [];
  }

  show() {
    this.open = true;
  }

  close() {
    if (!this.open) return;

    this.open = false;
  }

  select(index) {
    this.close();

    if (!this.items[index]) return;

    this.dispatchEvent(new CustomEvent('selected', { detail: { index } }));
  }

  // Keys inside the menu. The anchor's own Enter and Space are its business,
  // not this element's.
  handleKeydown(event) {
    const { options } = this;
    const current = options.indexOf(this.shadowRoot.activeElement);

    const focus = index => {
      event.preventDefault();
      const option = options[(index + options.length) % options.length];
      if (option) option.focus();
    };

    switch (event.key) {
      case 'ArrowDown':
        focus(current + 1);
        break;
      case 'ArrowUp':
        focus(current - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(options.length - 1);
        break;
      case 'Tab':
        // Let the focus go where it was going, but not back into a menu that
        // is no longer on screen.
        this.close();
        break;
      default:
        break;
    }
  }

  handleDocumentKeydown(event) {
    if (event.key !== 'Escape') return;

    event.stopPropagation();
    this.close();
    if (this.anchor && this.anchor.focus) this.anchor.focus();
  }

  handleDocumentPointerDown(event) {
    // `composedPath` sees through the shadow root, which a click target does
    // not: without it every click looks like it came from the card. The anchor
    // is checked as well, because it lives in another shadow root and its own
    // click handler is what opens the menu.
    const path = event.composedPath();
    if (path.includes(this) || (this.anchor && path.includes(this.anchor))) return;

    this.close();
  }

  startListening() {
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.addEventListener('keydown', this.onDocumentKeydown, true);
    // Closing beats following the anchor around: a menu is a decision, and the
    // page moving under it means the user is doing something else.
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  stopListening() {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  // Position and focus, after the surface is in the DOM and can be measured.
  updated(changedProps) {
    if (!changedProps.has('open')) return;

    if (!this.open) {
      this.stopListening();
      return;
    }

    const { surface } = this;
    if (!surface) return;

    this.showAsPopover(surface);
    this.position();
    this.startListening();

    const option = this.options[this.selectedIndex] || this.options[0];
    if (option) option.focus();
  }

  // The top layer, where the browser offers it. It is worth having because a
  // dashboard being edited puts a transformed ancestor above this menu, and a
  // transformed ancestor is what `position: fixed` cannot escape.
  //
  // The care here is about the failure, not the feature. `popover="manual"` is
  // on the surface from the moment it renders, and in an engine that honours
  // the attribute an element carrying it is `display: none` until
  // `showPopover` puts it in the top layer. So a call that does not land does
  // not leave the menu merely un-layered - it leaves it invisible, with the
  // hand positioning underneath unable to help. `showPopover` can refuse: it
  // throws on an element that is already showing, and engines have refused it
  // in other states.
  //
  // An engine that has never heard of the attribute needs none of this - an
  // unknown attribute is inert, and the surface is an ordinary fixed box. It
  // is the half-way case this guards.
  showAsPopover(surface) {
    if (!surface.showPopover) return;

    try {
      surface.showPopover();
    } catch {
      // Stop claiming to be something the browser just refused to show, and go
      // back to being the fixed box the stylesheet already describes.
      surface.removeAttribute('popover');
    }
  }

  position() {
    const { surface, anchor } = this;
    if (!surface || !anchor) return;

    const box = anchor.getBoundingClientRect();
    const { width, height } = surface.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    // Right edges aligned and the menu drawn over the anchor, which is where
    // the menu this replaces put it (`menuCorner: END`, `corner: TOP_RIGHT`).
    const left = Math.min(
      Math.max(MENU_MARGIN, box.right - width),
      Math.max(MENU_MARGIN, viewport.width - width - MENU_MARGIN),
    );
    const flip = box.top + height > viewport.height - MENU_MARGIN;
    const top = flip ? Math.max(MENU_MARGIN, box.bottom - height) : Math.max(MENU_MARGIN, box.top);

    surface.style.left = `${left}px`;
    surface.style.top = `${top}px`;
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div
        id="surface"
        class="mc-menu"
        role="listbox"
        popover="manual"
        @keydown=${this.handleKeydown}
      >
        ${this.items.map(
          (item, index) => html`
            <button
              type="button"
              role="option"
              class="mc-menu__item"
              data-value=${item.id}
              aria-selected=${index === this.selectedIndex ? 'true' : 'false'}
              @click=${() => this.select(index)}
            >
              <span class="mc-menu__item__label ellipsis">${item.name}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  static get styles() {
    return css`
      /* The surface. The colours are Home Assistant's own menu colours, so
         this follows the theme the same way the menu it replaces did. */
      .mc-menu {
        position: fixed;
        inset: auto;
        z-index: 9;
        box-sizing: border-box;
        margin: 0;
        padding: 8px 0;
        border: none;
        border-radius: 4px;
        min-width: 112px;
        max-width: 280px;
        max-height: 60vh;
        overflow-y: auto;
        background: var(
          --mdc-theme-surface,
          var(--card-background-color, var(--ha-card-background, #fff))
        );
        color: var(--primary-text-color, #212121);
        box-shadow:
          0 5px 5px -3px rgba(0, 0, 0, 0.2),
          0 8px 10px 1px rgba(0, 0, 0, 0.14),
          0 3px 14px 2px rgba(0, 0, 0, 0.12);
      }
      .mc-menu__item {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        min-height: 48px;
        margin: 0;
        padding: 0 16px;
        border: none;
        background: none;
        color: inherit;
        font-family: inherit;
        font-size: 16px;
        text-align: start;
        cursor: pointer;
        /* No 300ms wait for a second tap that is not coming. */
        touch-action: manipulation;
        -webkit-appearance: none;
        appearance: none;
      }
      .mc-menu__item:hover,
      .mc-menu__item:focus {
        outline: none;
        background: rgba(127, 127, 127, 0.12);
      }
      .mc-menu__item[aria-selected='true'] {
        color: var(--mc-active-color);
      }
      .mc-menu__item__label {
        pointer-events: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
  }
}
