const toggleState = (state) => {
  if (!state)
    return state;

  if (state.toString().trim().toUpperCase() === 'ON')
    return 'OFF';

  if (state.toString().trim().toUpperCase() === 'OFF')
    return 'ON';

  return state;
};

const getEntityValue = (entity, config) => {
  if (!entity)
    return undefined;

  if (!config)
    return entity.state;

  if (config.attribute)
    return entity.attributes[config.attribute];

  return entity.state;
};

const round = (value, decimals) => Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`);

// eslint-disable-next-line no-new-func
const compileTemplate = (template, context) => (new Function('', `return ${template}`)).call(context || {});

export {
  round,
  compileTemplate,
  getEntityValue,
  toggleState,
};
