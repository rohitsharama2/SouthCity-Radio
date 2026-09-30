export const advertisementsPath = '/api/advertisements';
export const emptyAdvertisements = () =>
  Array.from({ length: 4 }, () => ({
    title: '',
    sponsor: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    enabled: false,
  }));

export function publicAdUrl(value) {
  if (typeof value !== 'string' || value.length > 1000) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function validateAdvertisements(input) {
  if (!Array.isArray(input) || input.length !== 4)
    return { error: 'Provide exactly four advertisement slots.' };
  const cards = [];
  for (const [index, card] of input.entries()) {
    if (!card || typeof card !== 'object' || typeof card.enabled !== 'boolean')
      return { error: `Card ${index + 1} is invalid.` };
    const value = { enabled: card.enabled };
    for (const [key, limit] of Object.entries({
      title: 80,
      sponsor: 60,
      description: 160,
      imageUrl: 1000,
      linkUrl: 1000,
    })) {
      if (typeof card[key] !== 'string' || card[key].trim().length > limit)
        return { error: `Card ${index + 1}: ${key} must be text of at most ${limit} characters.` };
      value[key] = card[key].trim();
    }
    if (value.enabled && (!value.title || !value.sponsor))
      return { error: `Card ${index + 1} needs a title and sponsor before enabling it.` };
    for (const key of ['imageUrl', 'linkUrl']) {
      if (value[key] && !publicAdUrl(value[key]))
        return { error: `Card ${index + 1}: use an HTTPS address without embedded credentials.` };
    }
    cards.push(value);
  }
  return { value: cards };
}
