const buildElementDefinitions = (elements = []) => elements.reduce((aggregate, element) => {
  // eslint-disable-next-line no-param-reassign
  aggregate[element.defineId] = element;
  return aggregate;
}, {});

export default buildElementDefinitions;
