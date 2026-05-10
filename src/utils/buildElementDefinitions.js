const buildElementDefinitions = (elements, constructor) => {
  const promises = [];
  const definitions = elements.reduce(
    (aggregate, element) => {
      if (typeof element === 'string') {
        const clazz = customElements.get(element);
        if (clazz) {
          // eslint-disable-next-line no-param-reassign
          aggregate[element] = clazz;
        } else {
          promises.push(customElements.whenDefined(element).then(() => {
            if (constructor.registry.get(element) === undefined) {
              constructor.registry.define(element, customElements.get(element));
            }
          }));
        }
      } else {
        // eslint-disable-next-line no-param-reassign
        aggregate[element.defineId] = element;
      }
      return aggregate;
    }, {},
  );
  // eslint-disable-next-line no-param-reassign
  constructor.elementDefinitionsLoaded = promises.length === 0;
  if (!constructor.elementDefinitionsLoaded) {
    if (!constructor.__lazyLoadPatched) {
      // eslint-disable-next-line no-param-reassign
      constructor.__lazyLoadPatched = true;
      const originalConnectedCallback = constructor.prototype.connectedCallback;
      // eslint-disable-next-line no-param-reassign
      constructor.prototype.connectedCallback = function connectedCallback() {
        if (originalConnectedCallback) {
          originalConnectedCallback.call(this);
        }
        if (!constructor.elementDefinitionsLoaded) {
          if (!constructor.__instances) {
            // eslint-disable-next-line no-param-reassign
            constructor.__instances = new Set();
          }
          constructor.__instances.add(this);
        }
      };
    }

    Promise.all(promises)
      .then(() => {
        // eslint-disable-next-line no-param-reassign
        constructor.elementDefinitionsLoaded = true;
        if (constructor.__instances) {
          constructor.__instances.forEach(inst => inst.requestUpdate && inst.requestUpdate());
          constructor.__instances.clear();
        }
      });
  }
  return definitions;
};

export default buildElementDefinitions;
