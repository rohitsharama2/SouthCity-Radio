export const stations = [
  { id: 'southcity', name: 'SouthCity Originals', genre: 'Eclectic', language: 'English', tagline: 'The sound of right here.', track: 'Tadow', artist: 'Masego & FKJ', show: 'The Golden Hour', host: 'Ananya Rao', listeners: 1248, color: '#df602f', art: 'originals', description: 'Independent sounds. Familiar streets. A handpicked mix of soul, jazz, and everything in between, broadcasting from the heart of the city.', stream: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { id: 'jazz', name: 'Jazz After Hours', genre: 'Jazz', language: 'English', tagline: 'Good company. Better jazz.', track: 'Blue in Green', artist: 'Miles Davis', show: 'Blue Note Sessions', host: 'Marcus Reed', listeners: 842, color: '#344f48', art: 'jazz', description: 'Pull up a chair. From the golden age of jazz to its next great voices, this is the soundtrack to slowing down.', stream: 'https://ice1.somafm.com/sonicuniverse-128-mp3' },
  { id: 'indie', name: 'Indie Avenue', genre: 'Indie', language: 'English', tagline: 'A little off the beaten track.', track: 'The Less I Know the Better', artist: 'Tame Impala', show: 'Off the Record', host: 'Alex Chen', listeners: 2106, color: '#b5bedc', art: 'indie', description: 'Fresh discoveries, cult classics, and the artists doing things their own way. Your new favorite is just one song away.', stream: 'https://ice1.somafm.com/indiepop-128-mp3' },
  { id: 'lofi', name: 'Lo-Fi Lounge', genre: 'Chill', language: 'Instrumental', tagline: 'Less noise. More focus.', track: 'A Walk', artist: 'Tycho', show: 'Soft Focus', host: 'Nina Park', listeners: 1832, color: '#ddbf94', art: 'lofi', description: 'A softer space in a loud world. Unwind, focus, or simply watch the city go by with warm beats and mellow textures.', stream: 'https://ice1.somafm.com/defcon-128-mp3' },
  { id: 'soul', name: 'Soul & the City', genre: 'Soul', language: 'English', tagline: 'Straight from the heart.', track: 'Time Moves Slow', artist: 'BADBADNOTGOOD', show: 'Soul Stories', host: 'Zoya Khan', listeners: 967, color: '#bb6547', art: 'soul', description: 'Deep grooves and honest voices. Soul, R&B, and a little magic to put some feeling into your everyday.', stream: 'https://ice1.somafm.com/seventies-128-mp3' },
  { id: 'electronic', name: 'Frequency / 024', genre: 'Electronic', language: 'English', tagline: 'Stay on the same wavelength.', track: 'Kerala', artist: 'Bonobo', show: 'Night Shift', host: 'Dev Mehta', listeners: 1534, color: '#b3c785', art: 'electronic', description: 'Forward-thinking electronic music, from ambient explorations to late-night dance floors. Tune in to something different.', stream: 'https://ice1.somafm.com/cliqhop-128-mp3' }
];
export const genres = ['All sounds', 'Indie', 'Jazz', 'Chill', 'Soul', 'Electronic', 'Eclectic'];
export const schedule = [
  {time: '07:00', title: 'Morning, SouthCity', host: 'Riya Kapoor', genre: 'Easy listening', duration: '3 hours'},
  {time: '10:00', title: 'Off the Record', host: 'Alex Chen', genre: 'Indie & alternative', duration: '3 hours'},
  {time: '13:00', title: 'The Daily Blend', host: 'Dev Mehta', genre: 'Eclectic', duration: '3 hours'},
  {time: '16:00', title: 'The Golden Hour', host: 'Ananya Rao', genre: 'Soul, jazz & good energy', duration: '3 hours', live: true},
  {time: '19:00', title: 'Blue Note Sessions', host: 'Marcus Reed', genre: 'Jazz', duration: '3 hours'},
  {time: '22:00', title: 'After Dark', host: 'Zoya Khan', genre: 'Downtempo', duration: '3 hours'}
];
export function filterStations(items, query = '', genre = 'All sounds', language = 'All languages') {
  const term = query.trim().toLowerCase();
  return items.filter(s => (genre === 'All sounds' || s.genre === genre) && (language === 'All languages' || s.language === language) && [s.name,s.genre,s.track,s.artist,s.show,s.host].join(' ').toLowerCase().includes(term));
}
export const demoStreamNote = 'Preview audio is provided by SomaFM. Station names, programming, and track metadata shown here are illustrative and do not describe the preview stream.';
