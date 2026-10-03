import React, { useState, useEffect } from 'react';
import {
  Home,
  Compass,
  Radio,
  Library,
  User,
  Search,
  Bell,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Play,
  Pause,
  Heart,
  Plus,
  Headphones,
  Volume2,
  VolumeX,
  Maximize2,
  Clock,
  Share2,
  Check,
  Sun,
  Moon,
  LogOut,
  BarChart3,
  Menu,
  X,
  Signal,
  Globe,
  WifiOff,
  LoaderCircle,
  SkipForward,
  Mail,
  Shield,
  HelpCircle,
  Download,
  Music2,
  CheckCircle2,
} from 'lucide-react';
import {
  Brand,
  IconButton,
  Button,
  LiveBadge,
  Artwork,
  StationCard,
  SectionHeading,
  EmptyState,
  Modal,
} from './components/ui.jsx';
import { AudioProvider, useAudio } from './components/AudioProvider.jsx';
import {
  stations,
  genres,
  schedule,
  filterStations,
  demoStreamNote,
  liveStreamNote,
} from './data/stations.js';
import { useLiveStream } from './components/useLiveStream.js';
import {
  formatListeners,
  isBlockedMixedContent,
  nowPlayingText,
  streamDescription,
  withLiveConfig,
  withLiveMetadata,
} from './data/liveStream.js';
import Admin from './components/Admin.jsx';
import Advertisements from './components/Advertisements.jsx';
import AnnouncementTicker from './components/AnnouncementTicker.jsx';
import { workspacePorts } from './data/workspaces.js';
import { readLocal as readSaved, writeLocal, removeLocal } from './data/storage.js';
import DesignSystem from './components/DesignSystem.jsx';
import {
  useAccount,
  signOut,
  loadLibrary,
  addFollows,
  setFollow,
  clearFollows,
  updateDisplayName,
} from './components/useAccount.js';
import { SignInForm } from './components/SignIn.jsx';
import { mergeLibrary, roleLabels, validateDisplayName, isStaff } from './data/accounts.js';
import { androidApp, serverUrl } from './components/server.js';
const navigation = [
  { name: 'Home', icon: Home },
  { name: 'Discover', icon: Compass },
  { name: 'Live', icon: Radio },
  { name: 'Library', icon: Library },
  { name: 'Profile', icon: User },
];
export default function App() {
  return (
    <AudioProvider>
      <RadioApp />
    </AudioProvider>
  );
}
function RadioApp() {
  const audio = useAudio();
  const live = useLiveStream();
  const account = useAccount();
  const signedIn = account.phase === 'signed-in';
  const userId = account.user?.id ?? null;
  const withLive = (s) => withLiveMetadata(s, live.data, live.config);
  // Playback and selection use the catalog entry plus any published live settings.
  const baseStation = (s) => withLiveConfig(stations.find((x) => x.id === s.id) || s, live.config);
  const [page, setPage] = useState(import.meta.env.MODE === 'admin' ? 'Admin' : 'Home'),
    [selected, setSelected] = useState(stations[0]),
    [query, setQuery] = useState(''),
    [genre, setGenre] = useState('All sounds'),
    [language, setLanguage] = useState('All languages'),
    [modal, setModal] = useState(null),
    [profileSaving, setProfileSaving] = useState(false),
    [toast, setToast] = useState(''),
    [theme, setTheme] = useState(() => readSaved('sc-theme', 'light')),
    [favorites, setFavorites] = useState(() => readSaved('sc-favorites', ['southcity', 'jazz'])),
    [history, setHistory] = useState(() => readSaved('sc-history', [])),
    [followedShows, setFollowedShows] = useState(() => readSaved('sc-shows', [])),
    [libraryTab, setLibraryTab] = useState('Stations'),
    [mobileMenu, setMobileMenu] = useState(false),
    [onboardStep, setOnboardStep] = useState(0),
    [displayName, setDisplayName] = useState(() => readSaved('sc-name', 'Alex')),
    [notifications, setNotifications] = useState(() => readSaved('sc-notifications', true)),
    [quality, setQuality] = useState('Standard · 128 kbps'),
    [librarySync, setLibrarySync] = useState('idle'),
    [syncAttempt, setSyncAttempt] = useState(0),
    [previousUser, setPreviousUser] = useState(null);
  // Signed in, favorites and followed shows live in the account; this browser keeps a copy.
  // Signing in adds this device's collection to the account without removing anything.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLibrarySync('syncing');
    (async () => {
      try {
        const { library, missing } = mergeLibrary(
          { stations: favorites, shows: followedShows },
          await loadLibrary(),
        );
        await addFollows(missing);
        if (cancelled) return;
        setFavorites(library.stations);
        setFollowedShows(library.shows);
        setLibrarySync('synced');
        if (missing.length) setToast('Your saved stations and shows are now in your account');
      } catch (error) {
        if (cancelled) return;
        setLibrarySync('failed');
        setToast(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, syncAttempt]);
  // Leaving an account (sign-out here, elsewhere, or an expired session) removes its copy
  // from this browser; the account keeps it.
  if (previousUser !== userId) {
    setPreviousUser(userId);
    if (previousUser && !userId) {
      setFavorites([]);
      setFollowedShows([]);
      setLibrarySync('idle');
    }
  }
  const fullName = signedIn && account.profile ? account.profile.displayName : displayName;
  const firstName = fullName.split(/\s+/)[0];
  const memberLabel = signedIn
    ? account.profile && isStaff(account.profile.role)
      ? roleLabels[account.profile.role]
      : 'SouthCity member'
    : 'Curious listener';
  useEffect(() => {
    const warn = () =>
      setToast('Browser storage is unavailable. Changes last for this session only.');
    window.addEventListener('southcity:storage-unavailable', warn);
    return () => window.removeEventListener('southcity:storage-unavailable', warn);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeLocal('sc-theme', theme);
  }, [theme]);
  useEffect(() => {
    writeLocal('sc-favorites', favorites);
  }, [favorites]);
  useEffect(() => {
    writeLocal('sc-history', history);
  }, [history]);
  useEffect(() => {
    writeLocal('sc-shows', followedShows);
  }, [followedShows]);
  useEffect(() => {
    if (account.linkError) setToast(account.linkError);
  }, [account.linkError]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (import.meta.env.MODE === 'admin') return;
    // The Android listener app has no admin workspace; admin links there fall back to Home.
    const adminRoute = import.meta.env.MODE !== 'android';
    const hash = window.location.hash.slice(1);
    // Admin sign-in links return with ?workspace=admin (see authRedirectUrl).
    const url = new URL(window.location.href);
    if (adminRoute && url.searchParams.get('workspace') === 'admin') {
      url.searchParams.delete('workspace');
      url.hash = 'admin';
      history.replaceState(history.state, '', url.href);
      setPage('Admin');
    } else if (hash.startsWith('station/')) {
      const s = stations.find((s) => s.id === hash.split('/')[1]);
      if (s) {
        setSelected(s);
        setPage('Station');
      }
    } else if (adminRoute && hash === 'admin') setPage('Admin');
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (page !== 'Admin' && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPage('Discover');
        setTimeout(() => document.querySelector('.large-search input')?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);
  const go = (name) => {
    // Development workspaces have distinct origins and explicit entry screens.
    if (import.meta.env.DEV) {
      const targetPort = name === 'Admin' ? workspacePorts.admin : workspacePorts.app;
      if (
        Object.values(workspacePorts).includes(Number(location.port)) &&
        Number(location.port) !== targetPort
      ) {
        const destination = new URL(location.href);
        destination.port = String(targetPort);
        destination.hash = '';
        location.assign(destination.href);
        return;
      }
    }
    setPage(name);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openStation = (s) => {
    setSelected(baseStation(s));
    go('Station');
  };
  const play = (s) => {
    if (!signedIn) {
      setModal('sign-in');
      return;
    }
    s = baseStation(s);
    audio.play(s);
    setHistory((h) => [s.id, ...h.filter((id) => id !== s.id)].slice(0, 12));
  };
  // Signed in, a change shows at once and is undone if the account doesn't save it.
  const followChange = (kind, id, following, apply, message) => {
    apply(following);
    if (!signedIn) return message && setToast(message);
    setFollow(kind, id, following)
      .then(() => message && setToast(message))
      .catch((error) => {
        apply(!following);
        setToast(error.message);
      });
  };
  const toggleFavorite = (id) => {
    const exists = favorites.includes(id);
    followChange(
      'station',
      id,
      !exists,
      (on) =>
        setFavorites((f) => (on ? [...f.filter((x) => x !== id), id] : f.filter((x) => x !== id))),
      exists ? 'Station removed from your library' : 'Station added to your library',
    );
  };
  const toggleShow = (id) =>
    followChange('show', id, !followedShows.includes(id), (on) =>
      setFollowedShows((f) =>
        on ? [...f.filter((x) => x !== id), id] : f.filter((x) => x !== id),
      ),
    );
  const leaveAccount = () =>
    signOut()
      .then(() => setToast('Signed out. Your library is saved in your account.'))
      .catch((error) => setToast(error.message));
  const clearListeningData = async () => {
    if (signedIn) {
      try {
        await clearFollows();
      } catch (error) {
        return setToast(error.message);
      }
    }
    ['sc-favorites', 'sc-history', 'sc-shows', 'sc-name', 'sc-theme', 'sc-notifications'].forEach(
      (k) => removeLocal(k),
    );
    setFavorites([]);
    setHistory([]);
    setFollowedShows([]);
    setDisplayName('Alex');
    setNotifications(true);
    setTheme('light');
    setToast(
      signedIn
        ? 'Listening data cleared from your account and this browser'
        : 'Local profile and listening data cleared',
    );
    setModal(null);
  };
  const card = (s) => (
    <StationCard
      key={s.id}
      station={withLive(s)}
      onOpen={openStation}
      onPlay={play}
      onFavorite={toggleFavorite}
      isFavorite={favorites.includes(s.id)}
    />
  );
  const search = (value) => {
    setQuery(value);
    if (value && page !== 'Discover') setPage('Discover');
  };
  const share = async () => {
    const station = audio.station || selected;
    const url = `${location.origin}${location.pathname}#station/${station.id}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: station.name,
          text: 'Find your frequency on Radio South City',
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setToast('Station link copied');
      }
    } catch (e) {
      if (e.name !== 'AbortError')
        setToast('Could not share. Copy the station URL from your browser.');
    }
  };
  const activeStation = withLive(audio.station || stations[0]);
  const activeIndex = stations.findIndex((s) => s.id === activeStation.id);
  const current = withLive(selected);
  const liveOffAir = live.phase === 'ready' && !live.data.onAir;
  const insecureStream = (s) => isBlockedMixedContent(s.stream, location.protocol);
  const playing = ['playing', 'connecting', 'buffering'].includes(audio.status);
  const filtered = filterStations(stations.map(withLive), query, genre, language);
  if (page === 'Design System')
    return <DesignSystem onExit={() => go('Profile')} theme={theme} setTheme={setTheme} />;
  if (page === 'Admin')
    return <Admin onExit={() => go('Home')} theme={theme} setTheme={setTheme} />;
  return (
    <div className={`app-shell navigation-hidden ${page === 'Home' ? 'home-listening' : ''}`}>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <button
          className="brand-button"
          aria-label="Radio South City home"
          onClick={() => go('Home')}
        >
          <Brand />
        </button>
        <div className="sidebar-section-label">YOUR DAILY SOUNDTRACK</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={
                page === name || (name === 'Discover' && page === 'Station') ? 'active' : ''
              }
              onClick={() => go(name)}
            >
              <Icon size={20} />
              <span>{name}</span>
              {name === 'Live' && <i className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label saved-label">
          YOUR COLLECTION{' '}
          <button aria-label="Discover stations to follow" onClick={() => go('Discover')}>
            <Plus size={15} />
          </button>
        </div>
        <button
          className="collection-link"
          onClick={() => {
            setLibraryTab('Stations');
            go('Library');
          }}
        >
          <span className="collection-icon">
            <Heart size={16} />
          </span>
          <div>
            Favorite stations<small>{favorites.length} stations</small>
          </div>
        </button>
        <button
          className="collection-link"
          onClick={() => {
            setLibraryTab('Recently played');
            go('Library');
          }}
        >
          <span className="collection-icon">
            <Clock size={16} />
          </span>
          <div>
            Recently played<small>Your listening history</small>
          </div>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-spark">✳</span>
            <strong>
              A world of sound.
              <br />A place to belong.
            </strong>
            <p>
              Independent radio.
              <br />
              Endless discoveries.
            </p>
            <button
              onClick={() => {
                setOnboardStep(0);
                setModal('onboarding');
              }}
            >
              Find your frequency <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="sidebar-user" onClick={() => go('Profile')}>
            <span className="avatar">{firstName.slice(0, 1)}</span>
            <span>
              <strong>{fullName}</strong>
              <small>{memberLabel}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <IconButton label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu size={22} />
            </IconButton>
            <button
              className="brand-button"
              aria-label="Radio South City home"
              onClick={() => go('Home')}
            >
              <Brand />
            </button>
          </div>
          <div className="breadcrumb">
            Your city. <span>Your sound.</span>
          </div>
          <div className="topbar-actions">
            <label className="header-search">
              <Search size={17} />
              <input
                aria-label="Search stations, artists and shows"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search stations, artists, shows..."
              />
              <kbd>⌘ K</kbd>
            </label>
            <IconButton
              label="Toggle color theme"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
            <IconButton
              label="Notifications"
              className="notification-button"
              onClick={() => setModal('notifications')}
            >
              <Bell size={19} />
              {notifications && <i />}
            </IconButton>
            <button
              className="avatar small"
              aria-label="Your profile"
              onClick={() => go('Profile')}
            >
              {firstName.slice(0, 1)}
            </button>
          </div>
        </header>
        <main className="page-content">
          {page === 'Home' && (
            <>
              <div className="greeting-row">
                <div>
                  <div className="eyebrow greeting-eyebrow">
                    <Sun size={14} /> A LITTLE SOUND FOR YOUR DAY
                  </div>
                  <h1>
                    Good afternoon, {firstName}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>Old favorites. New frequencies. Something that feels like you.</p>
                </div>
                <span className="date-pill">
                  <span className="status-dot" /> Broadcasting good energy
                </span>
              </div>
              <AnnouncementTicker />
              <div className="hero-grid hero-grid-listening">
                <section className="hero">
                  <div className="hero-watermark" aria-hidden="true">
                    <Brand variant="badge" />
                  </div>
                  <div className="hero-content">
                    <div className="hero-buttons">
                      <Button onClick={() => play(stations[0])}>
                        <Play size={16} fill="currentColor" /> Start listening
                      </Button>
                      <div className="hero-listeners">
                        <Headphones size={16} aria-hidden="true" />
                        <span>
                          {live.phase === 'ready' && live.data?.listeners != null
                            ? `${formatListeners(live.data.listeners)} listening live`
                            : live.phase === 'idle' || live.phase === 'loading'
                              ? 'Listeners loading…'
                              : 'Listeners unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              <Advertisements />
            </>
          )}
          {(page === 'Discover' || page === 'Live') && (
            <>
              <div className="page-intro">
                <div className="eyebrow">
                  {page === 'Live' ? 'REAL PEOPLE. REAL-TIME RADIO.' : 'FOLLOW YOUR CURIOSITY'}
                </div>
                <h1>{page === 'Live' ? 'The city is live.' : 'Find your next frequency.'}</h1>
                <p>
                  {page === 'Live'
                    ? 'Somewhere, your next favorite song is playing right now.'
                    : 'The familiar, the unexpected, and everything in between.'}
                </p>
              </div>
              {page === 'Discover' && (
                <label className="large-search">
                  <Search size={23} />
                  <input
                    autoFocus
                    aria-label="Search all content"
                    placeholder="Stations, shows, songs, artists, hosts…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <IconButton label="Clear search" onClick={() => setQuery('')}>
                      <X size={18} />
                    </IconButton>
                  )}
                </label>
              )}
              <div className="filter-row">
                <div className="chips">
                  {genres.map((g) => (
                    <button
                      className={`chip ${genre === g ? 'selected' : ''}`}
                      onClick={() => setGenre(g)}
                      key={g}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Filter by language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>All languages</option>
                  <option>English</option>
                  <option>Instrumental</option>
                  <option>Multilingual</option>
                </select>
              </div>
              <SectionHeading
                title={
                  query
                    ? `Results for “${query}”`
                    : genre !== 'All sounds'
                      ? `${genre}, all day long`
                      : page === 'Live'
                        ? 'On air right now'
                        : 'Trending frequencies'
                }
                subtitle={`${filtered.length} independent stations. Endless possibility.`}
              />
              {filtered.length ? (
                <div className="station-grid browse-grid">{filtered.map(card)}</div>
              ) : (
                <EmptyState
                  title="No frequencies found"
                  description="Try another artist, station name, or genre."
                  action="Reset filters"
                  onAction={() => {
                    setQuery('');
                    setGenre('All sounds');
                    setLanguage('All languages');
                  }}
                />
              )}
              {page === 'Live' && (
                <section className="content-section">
                  <SectionHeading
                    title="Today's programming"
                    subtitle="Stay for the song. Come back for the show."
                  />
                  <Schedule
                    onShow={(show) => {
                      setSelected(
                        stations.find((s) => s.host === show.host) ||
                          stations.find((s) => s.id === 'southcity'),
                      );
                      go('Show');
                    }}
                  />
                </section>
              )}
            </>
          )}
          {page === 'Station' && (
            <>
              <button className="back-link" onClick={() => go('Discover')}>
                <ChevronLeft size={16} /> Back to discovery
              </button>
              <div className="detail-hero">
                <Artwork station={selected} />
                <div>
                  <LiveBadge />
                  <span className="detail-type">
                    {' '}
                    INDEPENDENT RADIO · {selected.genre.toUpperCase()}
                  </span>
                  <h1>{selected.name}</h1>
                  <p className="detail-tagline">{selected.tagline}</p>
                  <p>{selected.description}</p>
                  <div className="detail-listeners">
                    <Headphones size={15} /> {formatListeners(current.listeners)} tuned in{' '}
                    <span>·</span>
                    <Globe size={15} /> {selected.language}
                  </div>
                  <div className="detail-actions">
                    <Button onClick={() => play(selected)}>
                      <Play size={17} fill="currentColor" /> Listen live
                    </Button>
                    <Button variant="secondary" onClick={() => toggleFavorite(selected.id)}>
                      {favorites.includes(selected.id) ? <Check size={17} /> : <Plus size={17} />}{' '}
                      {favorites.includes(selected.id) ? 'Following' : 'Follow station'}
                    </Button>
                    <IconButton
                      label="Share station"
                      onClick={() => {
                        const url = `${location.origin}${location.pathname}#station/${selected.id}`;
                        navigator.clipboard
                          ?.writeText(url)
                          .then(() => setToast('Station link copied'))
                          .catch(() => setToast('Copy the current URL to share'));
                      }}
                    >
                      <Share2 size={20} />
                    </IconButton>
                  </div>
                </div>
              </div>
              <div className="now-on">
                <span className="equalizer">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <div>
                  <small>
                    {!current.live
                      ? 'ON AIR NOW · ILLUSTRATIVE PROGRAMMING'
                      : liveOffAir
                        ? 'OFF AIR · THE STATION IS NOT BROADCASTING'
                        : 'ON AIR NOW · FROM THE STATION SERVER'}
                  </small>
                  <strong>{current.live ? current.track || current.show : current.show}</strong>
                  <span>
                    {current.live ? current.artist || current.name : nowPlayingText(current)}
                  </span>
                </div>
                {!current.live && (
                  <button className="text-button" onClick={() => go('Show')}>
                    With {selected.host}
                    <ArrowUpRight size={17} />
                  </button>
                )}
              </div>
              {!current.live && (
                <>
                  <section className="content-section">
                    <SectionHeading
                      title="A day on this frequency"
                      subtitle="All times shown in India Standard Time (UTC+5:30)."
                    />
                    <Schedule
                      onShow={(show) => {
                        setSelected(stations.find((s) => s.host === show.host) || selected);
                        go('Show');
                      }}
                    />
                  </section>
                  <section className="content-section">
                    <SectionHeading title="Behind the microphone" />
                    <div className="host-card">
                      <img src="https://i.pravatar.cc/120?img=47" alt={selected.host} />
                      <div>
                        <h3>{selected.host}</h3>
                        <p>
                          Collector of records. Teller of stories. Your companion on the airwaves.
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => go('Show')}>
                        Explore the show <ArrowUpRight size={15} />
                      </Button>
                    </div>
                  </section>
                </>
              )}
              <section className="content-section">
                <SectionHeading
                  title="Recently on air"
                  subtitle={current.live ? 'From the station server' : 'Sample track history'}
                />
                {current.live && !live.history.length ? (
                  <p className="modal-description">
                    {live.phase === 'loading'
                      ? 'Checking the station for recent tracks…'
                      : 'Recent tracks aren’t available from the station right now.'}
                  </p>
                ) : (
                  <div className="track-list">
                    {(current.live
                      ? live.history.map((t) => ({
                          key: t.playedAt,
                          track: t.title,
                          artist: t.artist || current.name,
                          time: new Date(t.playedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                        }))
                      : [current, ...stations.filter((s) => s.id !== selected.id && !s.live)]
                          .slice(0, 4)
                          .map((s, i) => ({
                            key: s.id,
                            track: s.track,
                            artist: s.artist,
                            time: i === 0 ? 'Now' : `${i * 7} min ago`,
                          }))
                    ).map((t, i) => (
                      <div key={t.key}>
                        <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                        <Music2 size={18} />
                        <span>
                          <strong>{t.track}</strong>
                          <small>{t.artist}</small>
                        </span>
                        <time>{t.time}</time>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="content-section">
                <SectionHeading title="Keep the good sounds coming" />
                <div className="station-grid">
                  {stations
                    .filter((s) => s.id !== selected.id)
                    .slice(0, 4)
                    .map(card)}
                </div>
              </section>
            </>
          )}
          {page === 'Show' && (
            <>
              <button className="back-link" onClick={() => go('Station')}>
                <ChevronLeft size={16} /> Back to {selected.name}
              </button>
              <div className="show-detail">
                <div className="show-poster">
                  <div className="sun-art">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>SOUTHCITY PRESENTS</span>
                  <h2>{selected.show}</h2>
                  <p>WITH {selected.host.toUpperCase()}</p>
                </div>
                <div>
                  <div className="eyebrow">GOOD MUSIC. EVEN BETTER COMPANY.</div>
                  <h1>{selected.show}</h1>
                  <p>
                    A carefully selected soundtrack for the moments between everything else. Join{' '}
                    {selected.host} for fresh finds, timeless records, and stories behind the music.
                  </p>
                  <div className="detail-listeners">
                    <Clock size={16} /> Weekdays · 4–7 PM IST
                  </div>
                  <div className="detail-actions">
                    <Button onClick={() => play(selected)}>
                      <Play size={16} /> Listen to the station
                    </Button>
                    <Button variant="secondary" onClick={() => toggleShow(selected.id)}>
                      {followedShows.includes(selected.id) ? (
                        <Check size={16} />
                      ) : (
                        <Plus size={16} />
                      )}{' '}
                      {followedShows.includes(selected.id) ? 'Following' : 'Follow show'}
                    </Button>
                  </div>
                </div>
              </div>
              <section className="content-section">
                <SectionHeading title="Next time on air" />
                <div className="schedule-card">
                  <div className="calendar-block">
                    <small>TOMORROW</small>
                    <Clock size={28} />
                  </div>
                  <div>
                    <h3>{selected.show}</h3>
                    <p>16:00–19:00 IST · with {selected.host}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setNotifications(true);
                      writeLocal('sc-notifications', true);
                      setToast(
                        'In-app reminder preference saved. Push delivery requires backend setup.',
                      );
                    }}
                  >
                    <Bell size={15} /> Remind me
                  </Button>
                </div>
              </section>
              <SectionHeading title="Previous broadcasts" />
              <EmptyState
                title="The best things happen live"
                description="Recorded episodes will appear here when the station makes them available."
                action="Explore live radio"
                onAction={() => go('Live')}
              />
            </>
          )}
          {page === 'Library' && (
            <>
              <div className="page-intro">
                <div className="eyebrow">A LITTLE MORE YOU</div>
                <h1>Your corner of the airwaves.</h1>
                <p>All the sounds you keep coming back to, in one place.</p>
              </div>
              <div className="tabs">
                {['Stations', 'Shows', 'Saved episodes', 'Recently played', 'Downloads'].map(
                  (t) => (
                    <button
                      className={libraryTab === t ? 'active' : ''}
                      onClick={() => setLibraryTab(t)}
                      key={t}
                    >
                      {t}
                      {t === 'Stations' && <span>{favorites.length}</span>}
                    </button>
                  ),
                )}
              </div>
              {libraryTab === 'Stations' &&
                (favorites.length ? (
                  <div className="station-grid">
                    {stations.filter((s) => favorites.includes(s.id)).map(card)}
                  </div>
                ) : (
                  <EmptyState
                    title="Find your familiar frequencies"
                    action="Discover stations"
                    onAction={() => go('Discover')}
                  />
                ))}
              {libraryTab === 'Recently played' &&
                (history.length ? (
                  <div className="station-grid">
                    {history
                      .map((id) => stations.find((s) => s.id === id))
                      .filter(Boolean)
                      .map(card)}
                  </div>
                ) : (
                  <EmptyState
                    title="Your story starts with a song"
                    description="Play a station and we'll remember it here."
                    action="Listen live"
                    onAction={() => go('Live')}
                  />
                ))}
              {libraryTab === 'Shows' &&
                (followedShows.length ? (
                  <div className="followed-shows">
                    {stations
                      .filter((s) => followedShows.includes(s.id))
                      .map((s) => (
                        <button
                          className="followed-show"
                          key={s.id}
                          onClick={() => {
                            setSelected(s);
                            go('Show');
                          }}
                        >
                          <Artwork station={s} />
                          <span>
                            <strong>{s.show}</strong>
                            <small>With {s.host}</small>
                          </span>
                          <ChevronRight size={20} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Great hosts become good company"
                    description="Follow a show to keep it close."
                    action="Explore a show"
                    onAction={() => {
                      setSelected(stations[0]);
                      go('Show');
                    }}
                  />
                ))}
              {libraryTab === 'Saved episodes' && (
                <EmptyState
                  title="A place for your keepers"
                  description="Save recorded episodes here when on-demand content becomes available."
                />
              )}
              {libraryTab === 'Downloads' && (
                <EmptyState
                  title="Live is better connected"
                  description="Offline downloads are not yet supported. Your followed stations will be ready when you're back online."
                />
              )}
            </>
          )}
          {page === 'Profile' && (
            <>
              <div className="page-intro">
                <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                <h1>Your profile.</h1>
              </div>
              <div className="profile-hero">
                <div className="avatar large">{firstName.slice(0, 1)}</div>
                <div>
                  <h2>{fullName}</h2>
                  <p>{memberLabel} · SouthCity community</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setModal(signedIn ? 'edit-profile' : 'sign-in')}
                >
                  Edit profile
                </Button>
              </div>
              <AccountCard
                account={account}
                librarySync={librarySync}
                onSignIn={() => setModal('sign-in')}
                onSignOut={leaveAccount}
                onRetry={() => setSyncAttempt((n) => n + 1)}
              />
              <div className="profile-stats">
                <div>
                  <strong>{favorites.length}</strong>
                  <span>Favorite stations</span>
                </div>
                <div>
                  <strong>{history.length}</strong>
                  <span>Stations explored</span>
                </div>
                <div>
                  <strong>{followedShows.length}</strong>
                  <span>Shows followed</span>
                </div>
              </div>
              <div className="settings-list">
                <h3>Your listening experience</h3>
                <div>
                  <span>
                    <Bell size={19} /> In-app notifications
                  </span>
                  <button
                    role="switch"
                    aria-checked={notifications}
                    aria-label="In-app notifications"
                    className={`switch ${notifications ? 'on' : ''}`}
                    onClick={() => {
                      setNotifications(!notifications);
                      writeLocal('sc-notifications', !notifications);
                    }}
                  >
                    <i />
                  </button>
                </div>
                <div>
                  <span>
                    <Headphones size={19} /> Audio quality
                  </span>
                  <select
                    aria-label="Audio quality"
                    value={quality}
                    onChange={(e) => {
                      setQuality(e.target.value);
                      setToast(
                        'Preview streams support standard quality. Adaptive quality requires backend integration.',
                      );
                    }}
                  >
                    <option>Standard · 128 kbps</option>
                    <option>Data saver · preference only</option>
                  </select>
                </div>
                <div>
                  <span>
                    <Globe size={19} /> Language
                  </span>
                  <span className="setting-value">English</span>
                </div>
                <div>
                  <span>
                    <Sun size={19} /> Appearance
                  </span>
                  <select
                    aria-label="Appearance"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <button className="setting-button" onClick={() => setModal('privacy')}>
                  <span>
                    <Shield size={19} /> Privacy & your data
                  </span>
                  <ChevronRight size={18} />
                </button>
                <button className="setting-button" onClick={() => setModal('help')}>
                  <span>
                    <HelpCircle size={19} /> Help & support
                  </span>
                  <ChevronRight size={18} />
                </button>
                <button className="setting-button" onClick={() => go('Design System')}>
                  <span>
                    <Compass size={19} /> Design system & component gallery
                  </span>
                  <ArrowUpRight size={18} />
                </button>
                <button
                  className="setting-button"
                  onClick={() => {
                    setOnboardStep(0);
                    setModal('onboarding');
                  }}
                >
                  <span>
                    <Radio size={19} /> Welcome to SouthCity
                  </span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
          <footer className="page-footer">
            <Brand />
            <span>Independent voices. A shared frequency.</span>
            <small>
              © {new Date().getFullYear()} Radio South City <span>·</span> <PrivacyLink />{' '}
              <span>·</span> Interactive preview
            </small>
          </footer>
        </main>
      </div>
      <div className="player-bar">
        <button className="player-track" onClick={() => setModal('player')}>
          <Artwork station={activeStation} />
          <span>
            <strong>{activeStation.name}</strong>
            <small>
              {audio.station
                ? audio.status === 'playing'
                  ? activeStation.live
                    ? nowPlayingText(activeStation)
                    : 'SomaFM preview audio'
                  : audio.status.charAt(0).toUpperCase() + audio.status.slice(1)
                : 'Your next good listen starts here'}{' '}
              <span>·</span> {activeStation.genre}
            </small>
          </span>
        </button>
        <IconButton
          label={
            favorites.includes(activeStation.id)
              ? 'Unfollow current station'
              : 'Follow current station'
          }
          className={`player-heart ${favorites.includes(activeStation.id) ? 'is-favorite' : ''}`}
          onClick={() => toggleFavorite(activeStation.id)}
        >
          <Heart size={19} fill={favorites.includes(activeStation.id) ? 'currentColor' : 'none'} />
        </IconButton>
        <div className="player-middle">
          <IconButton
            label="Previous station"
            className="skip-button"
            onClick={() => play(stations[(activeIndex + stations.length - 1) % stations.length])}
          >
            <SkipForward size={18} className="flip" />
          </IconButton>
          <button
            className="main-play"
            aria-label={playing ? 'Pause audio' : 'Play audio'}
            onClick={() => (playing ? audio.toggle() : play(activeStation))}
          >
            {['connecting', 'buffering'].includes(audio.status) ? (
              <LoaderCircle size={22} className="spin" />
            ) : playing ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </button>
          <IconButton
            label="Next station"
            className="skip-button"
            onClick={() => play(stations[(activeIndex + 1) % stations.length])}
          >
            <SkipForward size={18} />
          </IconButton>
          <span className="player-live">
            <span className={playing ? 'status-dot' : ''} />
            {audio.station
              ? audio.status === 'playing'
                ? 'LIVE AUDIO'
                : audio.status.toUpperCase()
              : 'TUNE IN'}
          </span>
        </div>
        <div className="player-right">
          <span className="audio-quality">
            {activeStation.live
              ? ['LIVE', streamDescription(live.data)].filter(Boolean).join(' · ').toUpperCase()
              : 'PREVIEW · 128 KBPS'}
          </span>
          <IconButton
            label={audio.volume === 0 ? 'Unmute' : 'Mute'}
            onClick={() => audio.setVolume(audio.volume === 0 ? 0.7 : 0)}
          >
            {audio.volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </IconButton>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={audio.volume}
            aria-label="Volume"
            onChange={(e) => audio.setVolume(Number(e.target.value))}
          />
          <span className="player-separator" />
          <IconButton label="Sleep timer" onClick={() => setModal('sleep')}>
            <Clock size={18} />
            {audio.sleep > 0 && <span className="timer-dot" />}
          </IconButton>
          <IconButton label="Open full player" onClick={() => setModal('player')}>
            <Maximize2 size={18} />
          </IconButton>
        </div>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ name, icon: Icon }) => (
          <button className={page === name ? 'active' : ''} key={name} onClick={() => go(name)}>
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal === 'player' && (
        <Modal title="On your frequency" onClose={() => setModal(null)}>
          <div className="full-player">
            <div className="player-context">
              <Radio size={15} />{' '}
              {activeStation.live ? 'LIVE BROADCAST' : 'INDEPENDENT RADIO · PREVIEW'}
            </div>
            <Artwork station={activeStation} />
            <div className="full-player-title">
              <div>
                <h2>{activeStation.name}</h2>
                <p>
                  {activeStation.live
                    ? nowPlayingText(activeStation)
                    : `${activeStation.show} · with ${activeStation.host}`}
                </p>
              </div>
              <IconButton label="Toggle favorite" onClick={() => toggleFavorite(activeStation.id)}>
                <Heart
                  size={22}
                  fill={favorites.includes(activeStation.id) ? 'currentColor' : 'none'}
                />
              </IconButton>
            </div>
            <div className="full-player-status">
              <span className="status-dot" />
              {audio.station
                ? audio.status
                : activeStation.live && liveOffAir
                  ? 'Station is off air'
                  : 'Ready to connect'}
              <span>
                {activeStation.live
                  ? `${formatListeners(activeStation.listeners)} listening · ${
                      streamDescription(live.data) || 'Live stream'
                    }`
                  : '128 kbps · MP3'}
              </span>
            </div>
            {['connection error', 'offline', 'station unavailable'].includes(audio.status) && (
              <div className="error-state">
                <WifiOff size={19} />
                <p>
                  {audio.status === 'offline'
                    ? 'You’re offline. Reconnect to keep listening.'
                    : insecureStream(activeStation)
                      ? 'This station streams over HTTP, which browsers block on secure (HTTPS) pages. It needs an HTTPS stream address.'
                      : activeStation.live && liveOffAir
                        ? 'The station isn’t broadcasting right now. Try again shortly.'
                        : 'This stream couldn’t connect. Try again or choose another station.'}
                </p>
                <button onClick={() => play(activeStation)}>Retry</button>
              </div>
            )}
            <div className="full-player-controls">
              <IconButton label="Share station" onClick={share}>
                <Share2 size={22} />
              </IconButton>
              <button
                className="main-play large-play"
                aria-label={playing ? 'Pause audio' : 'Play audio'}
                onClick={() => (playing ? audio.toggle() : play(activeStation))}
              >
                {['connecting', 'buffering'].includes(audio.status) ? (
                  <LoaderCircle className="spin" />
                ) : playing ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" />
                )}
              </button>
              <IconButton label="Set sleep timer" onClick={() => setModal('sleep')}>
                <Moon size={23} />
              </IconButton>
            </div>
            <label className="full-volume">
              <Volume2 size={18} />
              <input
                type="range"
                aria-label="Full player volume"
                min="0"
                max="1"
                step="0.01"
                value={audio.volume}
                onChange={(e) => audio.setVolume(Number(e.target.value))}
              />
            </label>
            <button
              className="up-next"
              onClick={() => {
                setSelected(baseStation(activeStation));
                setModal(null);
                go('Station');
              }}
            >
              {activeStation.live ? (
                <span>
                  <small>FROM THE STATION</small>
                  <strong>Recently played</strong>
                </span>
              ) : (
                <span>
                  <small>UP NEXT · SAMPLE SCHEDULE</small>
                  <strong>
                    Blue Note Sessions <span>19:00 IST</span>
                  </strong>
                </span>
              )}
              <ChevronRight size={20} />
            </button>
            <p className="preview-note">{activeStation.live ? liveStreamNote : demoStreamNote}</p>
          </div>
        </Modal>
      )}
      {modal === 'sleep' && (
        <Modal title="Drift off. We'll take it from here." onClose={() => setModal(null)}>
          <p className="modal-description">Audio will pause when the timer ends.</p>
          <div className="timer-options">
            {[0, 15, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => {
                  audio.setSleepTimer(m);
                  setModal(null);
                  setToast(m ? `Sleep timer set for ${m} minutes` : 'Sleep timer turned off');
                }}
              >
                <Clock size={18} />
                {m ? `${m} minutes` : 'Off'}
                {audio.sleep === m && <Check size={18} />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'notifications' && (
        <Modal title="A little heads-up" onClose={() => setModal(null)}>
          <div className="notification-item">
            <span className="collection-icon">
              <Radio size={20} />
            </span>
            <div>
              <strong>Welcome to your new frequency</strong>
              <p>Follow a station or show to make SouthCity your own.</p>
              <small>From the SouthCity team</small>
            </div>
          </div>
          <p className="preview-note">
            Programming alerts will arrive here once the live service is connected.
          </p>
        </Modal>
      )}
      {modal === 'edit-profile' && (
        <Modal title="Make it yours" onClose={() => setModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const { value: name } = validateDisplayName(
                new FormData(e.currentTarget).get('name'),
              );
              if (!name) return;
              if (!signedIn) return setModal('sign-in');
              if (profileSaving) return;
              setProfileSaving(true);
              try {
                await updateDisplayName(name);
                setModal(null);
                setToast('Profile updated in your account');
              } catch (error) {
                setToast(error.message);
              } finally {
                setProfileSaving(false);
              }
            }}
          >
            <label className="form-label">
              Display name
              <input
                name="name"
                defaultValue={signedIn ? fullName : displayName}
                maxLength={30}
                required
                autoFocus
              />
            </label>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Modal>
      )}
      {modal === 'sign-in' && (
        <Modal title="Sign in to SouthCity" onClose={() => setModal(null)}>
          {signedIn ? (
            <>
              <p className="modal-description">You’re signed in as {account.user.email}.</p>
              <Button
                onClick={() => {
                  setModal(null);
                  play(activeStation);
                }}
              >
                Start listening
              </Button>
            </>
          ) : account.phase === 'unavailable' ? (
            <p className="modal-description" role="alert">
              Sign-in is required to listen, but accounts are currently unavailable. Please try
              again later.
            </p>
          ) : account.phase === 'idle' || account.phase === 'loading' ? (
            <p className="modal-description" role="status">
              Checking your sign-in…
            </p>
          ) : (
            <>
              <p className="modal-description">
                Sign in to listen and save your profile. We’ll email you a one-time link, so there’s
                no password to remember. New here? The same link creates your account.
              </p>
              <SignInForm workspace="app" />
            </>
          )}
        </Modal>
      )}
      {modal === 'onboarding' && (
        <Modal
          title={onboardStep === 0 ? 'Welcome to SouthCity.' : 'What’s your kind of sound?'}
          onClose={() => setModal(null)}
        >
          <div className="onboarding">
            <Brand variant={onboardStep === 0 ? 'badge' : 'lockup'} />
            <h2>
              {onboardStep === 0 ? 'Find your frequency.' : 'A soundtrack that feels like you.'}
            </h2>
            <p>
              {onboardStep === 0
                ? 'A home for independent voices, unexpected discoveries, and really good music.'
                : 'Choose a mood to start exploring. You can always find something new.'}
            </p>
            {onboardStep === 1 && (
              <div className="chips">
                {genres.slice(1).map((g) => (
                  <button
                    className={`chip ${genre === g ? 'selected' : ''}`}
                    key={g}
                    onClick={() => setGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            <Button
              onClick={() => {
                if (onboardStep === 0) setOnboardStep(1);
                else {
                  setModal(null);
                  go('Discover');
                }
              }}
            >
              {onboardStep === 0 ? 'Make yourself at home' : 'Find my sound'}
              <ArrowRight size={18} />
            </Button>
            <div className="step-dots">
              <i className={onboardStep === 0 ? 'active' : ''} />
              <i className={onboardStep === 1 ? 'active' : ''} />
            </div>
          </div>
        </Modal>
      )}
      {['about', 'privacy', 'help'].includes(modal) && (
        <Modal
          title={
            modal === 'about'
              ? 'Radio, reimagined.'
              : modal === 'privacy'
                ? 'Your listening. Your data.'
                : 'Here to help.'
          }
          onClose={() => setModal(null)}
        >
          <div className="info-modal">
            {modal === 'about' ? (
              <>
                <Brand variant="badge" />
                <p>
                  SouthCity brings independent radio into your everyday. Human curation, local
                  voices, and a world of music.
                </p>
                <p>
                  SouthCity Live plays the real station broadcast. Other stations use illustrative
                  programming and publicly accessible SomaFM streams.
                </p>
              </>
            ) : modal === 'privacy' ? (
              <>
                {signedIn ? (
                  <>
                    <p>
                      Your email, display name, favorite stations, and followed shows are saved to
                      your SouthCity account, hosted by Supabase. Recent stations, notification
                      preference, and theme stay in this browser.
                    </p>
                    <p>
                      Clearing removes your favorites and followed shows from your account and
                      clears this browser’s listening data. Your sign-in and name remain; deleting
                      an account isn’t available in the app yet.
                    </p>
                  </>
                ) : (
                  <p>
                    Your favorites, followed shows, recent stations, name, notification preference,
                    and theme are stored only in this browser.{' '}
                    {account.phase === 'signed-out'
                      ? 'If you sign in, your email, favorites, and followed shows are saved to a SouthCity account hosted by Supabase.'
                      : 'There is no account server for this preview.'}{' '}
                    There is no tracking analytics in this prototype.
                  </p>
                )}
                <p>
                  Preview audio and images load from external providers, who receive normal network
                  requests.
                </p>
                <p>
                  <PrivacyLink>Read the full privacy policy</PrivacyLink>
                </p>
                <Button variant="secondary" onClick={clearListeningData}>
                  {signedIn ? 'Clear my listening data' : 'Clear local listening data'}
                </Button>
              </>
            ) : (
              <>
                <h3>How do I listen?</h3>
                <p>
                  Choose a station and press play. Audio continues as you move around the app. Use
                  the mini-player to pause, change volume, or open the full player.
                </p>
                <h3>No sound?</h3>
                <p>
                  Check the volume and your connection, then retry from the full player. Some
                  networks may block external preview streams.
                </p>
                <h3>Accounts</h3>
                <p>
                  Sign in from your profile with a one-time email link. Your favorites and followed
                  shows then follow you to any browser where you sign in. Recent stations stay on
                  each device.
                </p>
                <h3>Native apps</h3>
                <p>
                  This is a web prototype. Native background playback and Centova Cast
                  administration require the integrations described in the README.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
// The policy is a page on the SouthCity server (public/privacy.html). The Android app opens it
// in the system browser so the app, and any playing audio, stays put.
const privacyUrl = serverUrl('/privacy.html');
function PrivacyLink({ children = 'Privacy policy' }) {
  const openInBrowser = (e) => {
    e.preventDefault();
    import('@capacitor/browser').then(({ Browser }) => Browser.open({ url: privacyUrl }));
  };
  return (
    <a
      href={privacyUrl}
      target="_blank"
      rel="noopener"
      onClick={androidApp ? openInBrowser : undefined}
    >
      {children}
    </a>
  );
}
function AccountCard({ account, librarySync, onSignIn, onSignOut, onRetry }) {
  if (account.phase === 'idle' || account.phase === 'loading') return null;
  if (account.phase === 'unavailable')
    return (
      <section className="account-card">
        <span className="collection-icon">
          <Shield size={18} />
        </span>
        <div>
          <strong>Your library lives in this browser</strong>
          <p>
            Accounts aren’t set up for this preview, so favorites and follows stay on this device.
          </p>
        </div>
      </section>
    );
  if (account.phase === 'signed-out')
    return (
      <section className="account-card">
        <span className="collection-icon">
          <Mail size={18} />
        </span>
        <div>
          <strong>Keep your library everywhere</strong>
          <p>
            Sign in to listen and save favorites and followed shows to your account. Anything you’ve
            saved in this browser comes with you.
          </p>
        </div>
        <Button onClick={onSignIn}>Sign in</Button>
      </section>
    );
  return (
    <section className="account-card">
      <span className="collection-icon">
        <CheckCircle2 size={18} />
      </span>
      <div>
        <strong>Signed in as {account.user.email}</strong>
        <p role="status">
          {account.profileError ??
            {
              syncing: 'Syncing your library…',
              synced: 'Favorites and followed shows are saved to your account.',
              failed: 'Your account couldn’t be reached. Changes may not be saved.',
            }[librarySync] ??
            'Connecting to your account…'}
          {librarySync === 'failed' && (
            <button className="text-button" onClick={onRetry}>
              Try again
            </button>
          )}
        </p>
      </div>
      <Button variant="secondary" onClick={onSignOut}>
        <LogOut size={15} /> Sign out
      </Button>
    </section>
  );
}
function Schedule({ onShow }) {
  return (
    <div className="schedule-list">
      {schedule.map((s) => (
        <button
          key={s.time}
          className={`schedule-row ${s.live ? 'current' : ''}`}
          onClick={() => onShow(s)}
        >
          <time>
            {s.time}
            <small>IST</small>
          </time>
          <span className="schedule-dot" />
          <span className="schedule-main">
            <strong>
              {s.title}
              {s.live && <LiveBadge />}
            </strong>
            <small>
              With {s.host} · {s.genre}
            </small>
          </span>
          <span className="schedule-duration">{s.duration}</span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  );
}
