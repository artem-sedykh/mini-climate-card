const getLabel = (hass, labels, fallback = 'unknown') => {
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    const resourceLabel = hass.localize(label);

    if (resourceLabel !== '')
      return resourceLabel;
  }

  return fallback;
};

export default getLabel;
