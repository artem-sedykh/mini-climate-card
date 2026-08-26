import type { HomeAssistant } from '../types';

const getLabel = (hass: HomeAssistant, labels: string[], fallback = 'unknown'): string => {
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    const resourceLabel = hass.localize(label);

    if (resourceLabel !== '') return resourceLabel;
  }

  return fallback;
};

export default getLabel;
