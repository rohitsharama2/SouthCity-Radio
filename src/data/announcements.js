export const announcementsPath = '/api/announcements';
export const defaultAnnouncements = () => ({
  enabled: true,
  messages: ['Welcome to Radio South City — your city, your sound.'],
});
export function validateAnnouncements(input) {
  if (
    !input ||
    typeof input.enabled !== 'boolean' ||
    !Array.isArray(input.messages) ||
    input.messages.length > 6
  )
    return { error: 'Use an enabled setting and up to six announcements.' };
  if (
    input.messages.some(
      (message) =>
        typeof message !== 'string' ||
        !message.trim() ||
        message.trim().length > 200 ||
        /[\r\n]/.test(message),
    )
  )
    return { error: 'Each announcement must be one line of 1–200 characters.' };
  if (input.enabled && !input.messages.length)
    return { error: 'Add a message before enabling the ticker.' };
  return {
    value: { enabled: input.enabled, messages: input.messages.map((message) => message.trim()) },
  };
}
