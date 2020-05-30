const getLabel = (hass, labels, fallback = 'unknown') => {
  const lang = hass.selectedLanguage || hass.language;
  const resources = hass.resources[lang];
  if (!resources)
    return fallback;

  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (resources[label])
      return resources[label];
  }

  return fallback;
};

export default getLabel;
