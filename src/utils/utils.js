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

const compileTemplate = (template, context) => {
  try {
    // eslint-disable-next-line no-new-func
    return (new Function('', `return ${template}`)).call(context || {});
  } catch (e) {
    throw new Error(`\n[COMPILE ERROR]: [${e.toString()}]\n[SOURCE]: ${template}\n`);
  }
};

export {
  round,
  compileTemplate,
  getEntityValue,
  toggleState,
};
