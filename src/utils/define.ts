// `customElements.define`, minus the throw when the name is already taken.
//
// The card's elements are registered globally, which they were not while it
// mounted them through scoped registries. A page that somehow loads the bundle
// twice - two dashboard resources pointing at the same card with different
// cache-busting query strings is the way that happens - would otherwise throw
// halfway through the second copy's module evaluation. Keeping the definitions
// that arrived first leaves that page with a working card rather than a broken
// one.
const define = (name: string, element: CustomElementConstructor): void => {
  if (!customElements.get(name)) customElements.define(name, element);
};

export default define;
