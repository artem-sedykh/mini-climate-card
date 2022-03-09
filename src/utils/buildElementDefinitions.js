const buildElementDefinitions = (elements, constructor) => elements.reduce(
  (aggregate, element) => {
    if (element.defineId) {
      // eslint-disable-next-line no-param-reassign
      aggregate[element.defineId] = element;
    } else {
      element.promise.then((clazz) => {
        if (constructor.registry.get(element.name) === undefined) {
          constructor.registry.define(element.name, clazz);
        }
      });
    }
    return aggregate;
  }, {},
);

export default buildElementDefinitions;
