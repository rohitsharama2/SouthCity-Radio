export const advertisementsPath = '/api/advertisements';
export const maxAdvertisements = 20;
export const newAdvertisement = () => ({
  title: '',
  sponsor: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  whatsappNumber: '',
  enabled: false,
});
export const emptyAdvertisements = () => [];

export function publicAdUrl(value) {
  if (typeof value !== 'string' || value.length > 1000) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
export function publicWhatsAppUrl(value) {
  if (typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && digits === value.replace(/[\s()+-]/g, '')
    ? `https://wa.me/${digits}`
    : '';
}

export function validateAdvertisements(input) {
  if (!Array.isArray(input) || input.length > maxAdvertisements)
    return { error: `Provide up to ${maxAdvertisements} advertisements.` };
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
      whatsappNumber: 30,
    })) {
      const raw = card[key] ?? '';
      if (typeof raw !== 'string' || raw.trim().length > limit)
        return { error: `Card ${index + 1}: ${key} must be text of at most ${limit} characters.` };
      value[key] = raw.trim();
    }
    if (value.enabled && (!value.title || !value.sponsor))
      return { error: `Card ${index + 1} needs a title and sponsor before enabling it.` };
    for (const key of ['imageUrl', 'linkUrl']) {
      if (value[key] && !publicAdUrl(value[key]))
        return { error: `Card ${index + 1}: use an HTTPS address without embedded credentials.` };
    }
    if (value.whatsappNumber && !publicWhatsAppUrl(value.whatsappNumber))
      return { error: `Card ${index + 1}: enter a valid WhatsApp number with country code.` };
    cards.push(value);
  }
  return { value: cards };
}
