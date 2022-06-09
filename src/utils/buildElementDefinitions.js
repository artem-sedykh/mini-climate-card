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
    Promise.all(promises)
      .then(() => {
        // eslint-disable-next-line no-param-reassign
        constructor.elementDefinitionsLoaded = true;
      });
  }
  return definitions;
};

export default buildElementDefinitions;
