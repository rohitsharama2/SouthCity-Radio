import React, { useState } from 'react';
import {
  LayoutDashboard,
  Radio,
  Signal,
  Disc3,
  ListMusic,
  FolderOpen,
  CalendarDays,
  Mic2,
  Users,
  BarChart3,
  Settings,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Activity,
  Clock,
  Play,
  Pause,
  Download,
  Upload,
  X,
  Check,
  Sun,
  Moon,
  ExternalLink,
  RefreshCw,
  Menu,
  Trash2,
  Copy,
  Code2,
} from 'lucide-react';
import { Brand, Button, IconButton, Modal, Artwork, LiveBadge, EmptyState } from './ui.jsx';
import { stations, schedule } from '../data/stations.js';
import '../styles/admin.css';
import { readLocal as saved, writeLocal } from '../data/storage.js';
import { useLiveStream, refreshLiveStream, publishLiveStation } from './useLiveStream.js';
import {
  publicStatsUrl,
  stationGenres,
  stationLanguages,
  validateLiveStation,
  withLiveConfig,
  formatListeners,
  formatUptime,
  nowPlayingText,
  streamDescription,
  withLiveMetadata,
} from '../data/liveStream.js';
const nav = [
  ['Dashboard', LayoutDashboard],
  ['Stations', Radio],
  ['Live Streams', Signal],
  ['AutoDJ', Disc3],
  ['Playlists', ListMusic],
  ['Media', FolderOpen],
  ['Schedule', CalendarDays],
  ['DJs', Mic2],
  ['Users', Users],
  ['Analytics', BarChart3],
  ['Settings', Settings],
];
const initialPlaylists = [
  {
    name: 'Morning rotation',
    genre: 'Eclectic',
    tracks: 48,
    duration: '3h 12m',
    rotation: 'Heavy',
  },
  {
    name: 'Golden hour essentials',
    genre: 'Soul & jazz',
    tracks: 36,
    duration: '2h 46m',
    rotation: 'Medium',
  },
  { name: 'After dark', genre: 'Downtempo', tracks: 62, duration: '4h 08m', rotation: 'Light' },
];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export default function Admin({ onExit, theme, setTheme }) {
  const [view, setView] = useState('Dashboard'),
    [station, setStation] = useState(stations[0]),
    [tab, setTab] = useState('Overview'),
    [query, setQuery] = useState(''),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(''),
    [range, setRange] = useState('Last 7 days'),
    [day, setDay] = useState('Thu'),
    [menu, setMenu] = useState(false),
    [autoDJ, setAutoDJ] = useState(() => saved('sc-admin-autodj', true)),
    [drafts, setDrafts] = useState(() => saved('sc-admin-stations', {})),
    [playlists, setPlaylists] = useState(() => saved('sc-admin-playlists', initialPlaylists)),
    [events, setEvents] = useState(() => saved('sc-admin-schedule', [])),
    [media, setMedia] = useState([]),
    [dismissed, setDismissed] = useState(false),
    [activity, setActivity] = useState([]),
    [djs, setDjs] = useState(() =>
      saved(
        'sc-admin-djs',
        stations.map((s, i) => ({
          name: s.host,
          email: `host${i + 1}@example.com`,
          role: 'DJ',
          station: s.name,
        })),
      ),
    ),
    [users, setUsers] = useState(() =>
      saved('sc-admin-users', [
        { name: 'Alex Morgan', email: 'alex@example.com', role: 'Listener', station: '—' },
        {
          name: 'SouthCity Operations',
          email: 'ops@example.com',
          role: 'Admin',
          station: 'All stations',
        },
      ]),
    );
  const live = useLiveStream();
  const liveState =
    live.phase === 'ready'
      ? live.data.onAir
        ? 'On air'
        : 'Off air'
      : live.phase === 'error'
        ? 'Unreachable'
        : 'Checking';
  // One status model for the table, monitor, and station header: real for the live station,
  // local drafts for sample stations.
  const streamRow = (s) => {
    if (s.live)
      return {
        status: liveState,
        active: liveState === 'On air',
        listeners: formatListeners(live.data?.listeners),
        format: streamDescription(live.data) || 'Live stream',
        nowPlaying: nowPlayingText(withLiveMetadata(s, live.data, live.config)),
        source: 'From the station server',
        health: liveState === 'On air' ? 'Connected' : liveState,
      };
    const paused = drafts[s.id]?.paused;
    return {
      status: paused ? 'Paused' : 'Live',
      active: !paused,
      listeners: paused ? '—' : s.listeners.toLocaleString(),
      format: '128 kbps',
      nowPlaying: s.show,
      source: s.host,
      health: paused ? 'Standby' : 'Excellent',
    };
  };
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const notify = (message) => {
    setToast(message);
    setActivity((a) =>
      [
        {
          message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...a,
      ].slice(0, 5),
    );
  };
  const changeView = (name) => {
    setView(name);
    setQuery('');
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const openStation = (s) => {
    setStation(s);
    setTab('Overview');
    changeView('Station Management');
  };
  const persist = (key, value, setter) => {
    setter(value);
    writeLocal(key, value);
  };
  const stationName = (s) =>
    s.live ? withLiveConfig(s, live.config).name : drafts[s.id]?.name || s.name;
  const filtered = stations.filter((s) =>
    [stationName(s), s.genre, s.host].join(' ').toLowerCase().includes(query.toLowerCase()),
  );
  const exportReport = () => {
    const csv =
      'station,genre,listeners,status\n' +
      stations
        .map(
          (s) =>
            `"${stationName(s).replaceAll('"', '""')}",${s.genre},${s.live ? (live.data?.listeners ?? '') : s.listeners},${s.live ? liveState.toLowerCase() : drafts[s.id]?.paused ? 'paused' : 'healthy'}`,
        )
        .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'southcity-demo-listeners.csv';
    link.click();
    URL.revokeObjectURL(url);
    notify('Sample listener report exported');
  };
  const toggleStation = (s) => {
    const value = { ...drafts, [s.id]: { ...drafts[s.id], paused: !drafts[s.id]?.paused } };
    persist('sc-admin-stations', value, setDrafts);
    notify(`${stationName(s)} ${value[s.id].paused ? 'paused' : 'resumed'} in local preview`);
  };
  const stationTable = () => (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Station</th>
            <th>Status</th>
            <th>Listeners</th>
            <th>Now broadcasting</th>
            <th>Stream health</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => {
            const row = streamRow(s);
            return (
              <tr key={s.id}>
                <td>
                  <button className="table-station" onClick={() => openStation(s)}>
                    <Artwork station={s} />
                    <span>
                      <strong>{stationName(s)}</strong>
                      <small>
                        {s.genre} · {row.format}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className={`status-label ${row.active ? '' : 'muted'}`}>
                    <i />
                    {row.status}
                  </span>
                </td>
                <td>
                  <span className="table-listeners">
                    <Headphones size={13} />
                    {row.listeners}
                  </span>
                </td>
                <td>
                  <span className="table-show">
                    {row.nowPlaying}
                    <small>{row.source}</small>
                  </span>
                </td>
                <td>
                  <span className="health-bars">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="health-label">{row.health}</span>
                </td>
                <td>
                  <IconButton label={`Manage ${s.name}`} onClick={() => openStation(s)}>
                    <ChevronRight size={17} />
                  </IconButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!filtered.length && (
        <EmptyState
          title="No stations found"
          description="Try a different station name or genre."
        />
      )}
    </div>
  );
  const scheduleView = () => (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Broadcast calendar</h2>
          <p>Weekly programming · India Standard Time (UTC+5:30)</p>
        </div>
        <Button onClick={() => setModal('schedule')}>
          <Plus size={15} /> Add broadcast
        </Button>
      </div>
      <div className="day-tabs">
        {weekdays.map((d) => (
          <button key={d} className={day === d ? 'active' : ''} onClick={() => setDay(d)}>
            {d}
          </button>
        ))}
      </div>
      <div className="admin-schedule">
        {[
          ...schedule.map((s) => ({ ...s, station: 'SouthCity Originals' })),
          ...events.filter((e) => e.day === day),
        ]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((s, i) => (
            <div key={`${s.title}-${i}`} className={s.live && day === 'Thu' ? 'on-air' : ''}>
              <time>
                {s.time}
                <small>IST</small>
              </time>
              <div className="broadcast-color" />
              <div>
                <span className="broadcast-station">{s.station}</span>
                <h3>{s.title}</h3>
                <p>
                  {s.host} · {s.duration || '1 hour'}
                </p>
              </div>
              {s.live && day === 'Thu' ? (
                <LiveBadge />
              ) : (
                <span className="status-label muted">Scheduled</span>
              )}
            </div>
          ))}
      </div>
    </>
  );
  const playlistView = () => (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Curated rotations</h2>
          <p>{playlists.length} playlists · Local preview drafts</p>
        </div>
        <Button onClick={() => setModal('playlist')}>
          <Plus size={15} /> Create playlist
        </Button>
      </div>
      <div className="playlist-grid">
        {playlists.map((p, i) => (
          <article className="playlist-card" key={`${p.name}-${i}`}>
            <div className={`playlist-cover cover-${i % 3}`}>
              <ListMusic size={45} />
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{p.name}</h3>
            <p>
              {p.genre} · {p.tracks} tracks · {p.duration}
            </p>
            <div>
              <span className="admin-tag">{p.rotation} rotation</span>
              <IconButton
                label={`Delete ${p.name}`}
                onClick={() => setModal({ type: 'delete-playlist', index: i })}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </>
  );
  const mediaView = () => (
    <>
      <div className="admin-section-header">
        <div>
          <h2>Media library</h2>
          <p>Demo catalog and files selected on this device</p>
        </div>
        <label className="button primary upload-button">
          <Upload size={15} /> Select audio files
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []).map((f) => ({
                name: f.name,
                size: f.size,
                type: f.type,
              }));
              setMedia((m) => [...m, ...files]);
              notify(`${files.length} files added to this session. No files were uploaded.`);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Track / file</th>
              <th>Artist / source</th>
              <th>Type</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {media.map((f, i) => (
              <tr key={`local-${i}`}>
                <td>
                  <span className="media-title">
                    <Disc3 size={19} />
                    {f.name}
                  </span>
                </td>
                <td>This device</td>
                <td>{(f.size / 1024 / 1024).toFixed(1)} MB</td>
                <td>
                  <span className="admin-tag">Local selection</span>
                </td>
              </tr>
            ))}
            {stations
              .filter((s) => !s.live)
              .map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="media-title">
                      <Disc3 size={19} />
                      {s.track}
                    </span>
                  </td>
                  <td>{s.artist}</td>
                  <td>Catalog sample</td>
                  <td>
                    <span className="admin-tag">Metadata only</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="admin-info">
        <FolderOpen size={18} />
        <p>
          Selected files remain on your device. Server upload, storage, and transcoding require the
          media service integration.
        </p>
      </div>
    </>
  );
  const analyticsView = () => (
    <>
      <div className="metric-grid">
        {[
          ['Total listening hours', '12,684', '+18.6%', Headphones],
          ['Unique listeners', '8,529', '+12.4%', Users],
          ['Average session', '42m 18s', '+6.8%', Clock],
          ['Peak concurrent', '2,486', '+22.1%', Activity],
        ].map(([label, value, change, Icon]) => (
          <Metric key={label} label={label} value={value} change={change} icon={Icon} />
        ))}
      </div>
      <ListenerChart range={range} />
      <div className="analytics-lower">
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Where they're tuning in</h2>
            <span>Sample distribution</span>
          </div>
          {[
            ['India', 64],
            ['United States', 18],
            ['United Kingdom', 10],
            ['Rest of the world', 8],
          ].map(([country, value]) => (
            <div className="country-row" key={country}>
              <span>{country}</span>
              <div>
                <i style={{ width: `${value}%` }} />
              </div>
              <strong>{value}%</strong>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Listening devices</h2>
          </div>
          <div className="device-chart">
            <div className="donut">
              <span>
                <strong>8.5k</strong>
                <small>LISTENERS</small>
              </span>
            </div>
            <div className="device-legend">
              <span>
                <i /> Mobile <strong>68%</strong>
              </span>
              <span>
                <i /> Desktop <strong>24%</strong>
              </span>
              <span>
                <i /> Other <strong>8%</strong>
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
        <button className="brand-button" onClick={onExit}>
          <Brand />
        </button>
        <span className="admin-workspace-label">BROADCAST WORKSPACE</span>
        <button
          className="workspace-selector"
          onClick={() => notify('SouthCity Network is the only workspace in this preview.')}
        >
          <span className="workspace-avatar">S</span>
          <span>
            <strong>SouthCity Network</strong>
            <small>Platform operations</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <nav aria-label="Admin navigation">
          {nav.map(([name, Icon]) => (
            <button
              className={
                view === name || (view === 'Station Management' && name === 'Stations')
                  ? 'active'
                  : ''
              }
              key={name}
              onClick={() => changeView(name)}
            >
              <Icon size={18} />
              {name}
              {name === 'Live Streams' && (
                <span className="nav-count">
                  {stations.filter((s) => streamRow(s).active).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="backend-status">
            <span className="status-dot" />
            <div>
              Preview environment<small>Centova Cast not connected</small>
            </div>
          </div>
          <button onClick={onExit}>
            <ArrowLeft size={16} /> Back to listening
          </button>
          <div className="admin-user">
            <span className="avatar">A</span>
            <span>
              <strong>Alex Morgan</strong>
              <small>Workspace administrator</small>
            </span>
            <Settings size={16} />
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="admin-scrim"
          aria-label="Close admin navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <IconButton
            label="Toggle admin navigation"
            className="admin-menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={21} />
          </IconButton>
          <div className="admin-breadcrumb">
            Workspace <ChevronRight size={13} /> <strong>{view}</strong>
          </div>
          <div className="admin-topbar-right">
            <span className="preview-pill">DEMO DATA</span>
            <IconButton
              label="Toggle theme"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
            <span className="avatar small">A</span>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <div className="eyebrow">SOUTHCITY OPERATIONS</div>
              <h1>
                {view === 'Dashboard'
                  ? 'Good afternoon, Alex.'
                  : view === 'Station Management'
                    ? stationName(station)
                    : view === 'Live Streams'
                      ? 'Live monitoring'
                      : view === 'Schedule'
                        ? 'Keep the city on schedule.'
                        : view === 'Analytics'
                          ? 'Every listener tells a story.'
                          : view}
              </h1>
              <p>
                {view === 'Dashboard'
                  ? 'Your network at a glance. Keep the good sounds flowing.'
                  : view === 'Station Management'
                    ? 'One station. Everything you need to keep it on air.'
                    : view === 'Live Streams'
                      ? 'A clear view of every frequency in your network.'
                      : 'Your independent radio network, thoughtfully managed.'}
              </p>
            </div>
            <div className="admin-heading-actions">
              {['Dashboard', 'Analytics'].includes(view) ? (
                <>
                  <select
                    aria-label="Report date range"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                  >
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Today</option>
                  </select>
                  <Button variant="secondary" onClick={exportReport}>
                    <Download size={15} /> Export report
                  </Button>
                </>
              ) : view === 'Stations' ? (
                <Button onClick={() => setModal('station')}>
                  <Plus size={15} /> Add station
                </Button>
              ) : view === 'Live Streams' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    refreshLiveStream();
                    notify('SouthCity Live status refreshed. Sample streams remain illustrative.');
                  }}
                >
                  <RefreshCw size={15} /> Refresh status
                </Button>
              ) : null}
            </div>
          </div>
          <div className="admin-preview-notice">
            <Signal size={14} />
            <span>
              Interactive operations preview. Changes are local drafts and do not control live
              Centova Cast servers.
            </span>
          </div>
          {view === 'Dashboard' && (
            <>
              <div className="metric-grid">
                <Metric
                  label="Active stations"
                  value={`${stations.filter((s) => !drafts[s.id]?.paused).length}`}
                  change="Across your network"
                  icon={Radio}
                />
                <Metric
                  label="Live streams"
                  value={`${stations.filter((s) => !drafts[s.id]?.paused).length}`}
                  change="All systems ready"
                  icon={Signal}
                />
                <Metric
                  label="Current listeners"
                  value="8,529"
                  change="+12.4% vs. last period"
                  icon={Headphones}
                />
                <Metric
                  label="Stream uptime"
                  value="99.98%"
                  change="Looking good"
                  icon={Activity}
                />
              </div>
              <ListenerChart range={range} />
              <section className="admin-panel stations-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      On air across your network{' '}
                      <span className="count-badge">{stations.length}</span>
                    </h2>
                    <p>The people and sounds keeping your city company.</p>
                  </div>
                  <button className="text-button" onClick={() => changeView('Stations')}>
                    Manage stations <ArrowUpRight size={15} />
                  </button>
                </div>
                {stationTable()}
              </section>
              <div className="dashboard-lower">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Recent activity</h2>
                    <Clock size={16} />
                  </div>
                  {[
                    ...activity,
                    ...[
                      { message: 'The Golden Hour started broadcasting', time: '16:00' },
                      { message: 'Morning rotation playlist updated', time: '15:42' },
                      { message: 'Indie Avenue reached 2,000 listeners', time: '15:30' },
                    ],
                  ]
                    .slice(0, 4)
                    .map((a, i) => (
                      <div className="activity-row" key={i}>
                        <span className="activity-icon">
                          <Radio size={15} />
                        </span>
                        <div>
                          <strong>{a.message}</strong>
                          <small>SouthCity Network</small>
                        </div>
                        <time>{a.time}</time>
                      </div>
                    ))}
                </section>
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Network health</h2>
                    <span className="status-label">Sample telemetry</span>
                  </div>
                  <div className="health-summary">
                    <CheckCircle2 size={31} />
                    <div>
                      <h3>Good sounds. Healthy streams.</h3>
                      <p>The sample streams are operating normally in this preview.</p>
                    </div>
                  </div>
                  {!dismissed ? (
                    <div className="admin-alert">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Storage is getting a little full</strong>
                        <p>Media storage is at 78% of the sample limit.</p>
                      </div>
                      <IconButton label="Dismiss storage alert" onClick={() => setDismissed(true)}>
                        <X size={15} />
                      </IconButton>
                    </div>
                  ) : (
                    <p className="alert-dismissed">No outstanding alerts.</p>
                  )}
                </section>
              </div>
            </>
          )}
          {view === 'Stations' && (
            <section className="admin-panel">
              <div className="panel-heading">
                <h2>
                  Your stations <span className="count-badge">{stations.length}</span>
                </h2>
                <label className="admin-search">
                  <Search size={16} />
                  <input
                    aria-label="Search admin stations"
                    placeholder="Find a station…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              {stationTable()}
            </section>
          )}
          {view === 'Station Management' && (
            <>
              <button className="back-link" onClick={() => changeView('Stations')}>
                <ArrowLeft size={14} /> All stations
              </button>
              <div className="station-admin-header">
                <Artwork station={station} />
                <div>
                  <span className={`status-label ${streamRow(station).active ? '' : 'muted'}`}>
                    <i />
                    {station.live
                      ? liveState
                      : drafts[station.id]?.paused
                        ? 'Paused in preview'
                        : 'Live in preview'}
                  </span>
                  <h2>{stationName(station)}</h2>
                  <p>
                    {withLiveConfig(station, live.config).genre} ·{' '}
                    {station.live
                      ? streamDescription(live.data) || 'Live stream'
                      : 'MP3 · 128 kbps · Stereo'}
                  </p>
                </div>
                {station.live ? (
                  <Button variant="secondary" onClick={() => setTab('Embed')}>
                    <Code2 size={15} /> Embed
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => toggleStation(station)}>
                    {drafts[station.id]?.paused ? <Play size={15} /> : <Pause size={15} />}{' '}
                    {drafts[station.id]?.paused ? 'Resume draft' : 'Pause draft'}
                  </Button>
                )}
              </div>
              <div className="tabs">
                {[
                  'Overview',
                  'Configuration',
                  'AutoDJ',
                  'Playlists',
                  'Schedule',
                  'Media',
                  'DJs',
                  'Analytics',
                  ...(station.live ? ['Embed'] : []),
                ].map((t) => (
                  <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'Overview' && (
                <>
                  <div className="metric-grid">
                    {station.live ? (
                      <>
                        <Metric
                          label="Current listeners"
                          value={formatListeners(live.data?.listeners)}
                          change="From the station server"
                          icon={Headphones}
                        />
                        <Metric
                          label="Bitrate"
                          value={live.data?.bitrateKbps ? `${live.data.bitrateKbps} kbps` : '—'}
                          change={live.data?.codec || 'Format unknown'}
                          icon={Signal}
                        />
                        <Metric
                          label="Stream uptime"
                          value={formatUptime(live.data?.uptimeSeconds)}
                          change={liveState}
                          icon={Activity}
                        />
                      </>
                    ) : (
                      <>
                        <Metric
                          label="Current listeners"
                          value={station.listeners.toLocaleString()}
                          change="Sample listener count"
                          icon={Headphones}
                        />
                        <Metric
                          label="Bitrate"
                          value="128 kbps"
                          change="MP3 · Stereo"
                          icon={Signal}
                        />
                        <Metric
                          label="Buffer health"
                          value="100%"
                          change="No interruptions"
                          icon={Activity}
                        />
                      </>
                    )}
                    <Metric
                      label="Broadcast mode"
                      value={autoDJ ? 'AutoDJ' : 'Live DJ'}
                      change="Preview mode"
                      icon={Disc3}
                    />
                  </div>
                  <ListenerChart range={range} />
                  <div className="admin-info">
                    <Radio size={20} />
                    <p>
                      {station.live ? (
                        <>
                          <strong>Now playing</strong>
                          <br />
                          {nowPlayingText(withLiveMetadata(station, live.data, live.config))} ·{' '}
                          {liveState === 'On air'
                            ? 'From the station server'
                            : `Station status: ${liveState}`}
                        </>
                      ) : (
                        <>
                          <strong>{station.show}</strong>
                          <br />
                          {station.track} — {station.artist} · Hosted by {station.host}
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
              {tab === 'Embed' && station.live && (
                <EmbedPanel
                  notify={notify}
                  streamUrl={withLiveConfig(station, live.config).stream}
                />
              )}
              {tab === 'Configuration' && station.live && (
                // Remount once when the published settings first arrive.
                <LiveStationForm
                  key={live.config ? 'published' : 'defaults'}
                  station={withLiveConfig(station, live.config)}
                  notify={notify}
                />
              )}
              {tab === 'Configuration' && !station.live && (
                <StationForm
                  station={station}
                  draft={drafts[station.id]}
                  onSave={(data) => {
                    persist(
                      'sc-admin-stations',
                      { ...drafts, [station.id]: { ...drafts[station.id], ...data } },
                      setDrafts,
                    );
                    notify('Station configuration saved locally');
                  }}
                />
              )}
              {tab === 'AutoDJ' && (
                <AutoDJ
                  enabled={autoDJ}
                  onToggle={() => {
                    persist('sc-admin-autodj', !autoDJ, setAutoDJ);
                    notify('AutoDJ draft mode updated');
                  }}
                  onPlaylist={() => setTab('Playlists')}
                />
              )}{' '}
              {tab === 'Playlists' && playlistView()}
              {tab === 'Schedule' && scheduleView()}
              {tab === 'Media' && mediaView()}
              {tab === 'DJs' && (
                <PeopleTable
                  people={djs.filter((d) => d.station === station.name)}
                  onAdd={() => setModal('dj')}
                />
              )}{' '}
              {tab === 'Analytics' && analyticsView()}
            </>
          )}
          {view === 'Live Streams' && (
            <>
              <div className="monitor-summary">
                <span className="status-dot" />
                <strong>SouthCity Live: {liveState}</strong>
                <span>
                  Live telemetry for SouthCity Live · Other stations show sample telemetry
                </span>
              </div>
              <div className="monitor-grid">
                {stations.map((s) => {
                  const row = streamRow(s);
                  return (
                    <article className="monitor-card" key={s.id}>
                      <div className="monitor-title">
                        <Artwork station={s} />
                        <div>
                          <h3>{stationName(s)}</h3>
                          <span className={`status-label ${row.active ? '' : 'muted'}`}>
                            <i />
                            {s.live ? liveState : row.active ? 'Healthy' : 'Paused'}
                          </span>
                        </div>
                        <IconButton label={`Configure ${s.name}`} onClick={() => openStation(s)}>
                          <Settings size={17} />
                        </IconButton>
                      </div>
                      <div
                        className={`waveform ${row.active ? '' : 'paused'}`}
                        aria-label="Illustrative audio waveform"
                      >
                        {Array.from({ length: 40 }, (_, i) => (
                          <i
                            key={i}
                            style={{ height: `${15 + Math.abs(Math.sin(i * 1.8)) * 65}%` }}
                          />
                        ))}
                      </div>
                      <div className="monitor-metrics">
                        <span>
                          <small>LISTENERS</small>
                          <strong>{row.listeners}</strong>
                        </span>
                        <span>
                          <small>BITRATE</small>
                          <strong>
                            {s.live ? (live.data?.bitrateKbps ?? '—') : 128} <em>kbps</em>
                          </strong>
                        </span>
                        <span>
                          <small>UPTIME</small>
                          <strong>
                            {s.live ? (
                              formatUptime(live.data?.uptimeSeconds)
                            ) : (
                              <>
                                99.98<em>%</em>
                              </>
                            )}
                          </strong>
                        </span>
                      </div>
                      <div className="monitor-bottom">
                        <span>
                          <strong>{row.nowPlaying}</strong>
                          <small>{row.source}</small>
                        </span>
                        {s.live ? (
                          <IconButton
                            label={`Embed ${s.name}`}
                            onClick={() => {
                              openStation(s);
                              setTab('Embed');
                            }}
                          >
                            <Code2 size={17} />
                          </IconButton>
                        ) : (
                          <IconButton
                            label={`${row.active ? 'Pause' : 'Resume'} ${s.name} draft`}
                            onClick={() => toggleStation(s)}
                          >
                            {row.active ? <Pause size={17} /> : <Play size={17} />}
                          </IconButton>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {view === 'AutoDJ' && (
            <AutoDJ
              enabled={autoDJ}
              onToggle={() => {
                persist('sc-admin-autodj', !autoDJ, setAutoDJ);
                notify('AutoDJ draft mode updated');
              }}
              onPlaylist={() => changeView('Playlists')}
            />
          )}
          {view === 'Playlists' && playlistView()}
          {view === 'Media' && mediaView()}
          {view === 'Schedule' && scheduleView()}
          {view === 'Analytics' && analyticsView()}
          {view === 'DJs' && <PeopleTable people={djs} onAdd={() => setModal('dj')} />}
          {view === 'Users' && <PeopleTable people={users} onAdd={() => setModal('user')} users />}
          {view === 'Settings' && (
            <div className="admin-settings">
              <section className="admin-panel">
                <div className="panel-heading">
                  <h2>Workspace preferences</h2>
                </div>
                <div className="settings-list">
                  <div>
                    <span>Appearance</span>
                    <select
                      value={theme}
                      aria-label="Admin appearance"
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <span>Workspace</span>
                    <strong>SouthCity Network</strong>
                  </div>
                  <div>
                    <span>Schedule timezone</span>
                    <strong>Asia/Kolkata · UTC+5:30</strong>
                  </div>
                  <div>
                    <span>Environment</span>
                    <span className="preview-pill">LOCAL PREVIEW</span>
                  </div>
                </div>
              </section>
              <section className="admin-panel connection-panel">
                <Signal size={27} />
                <h2>Connect your broadcast infrastructure</h2>
                <p>
                  The consumer app and admin workspace communicate with a secure application API.
                  Centova Cast credentials belong on your server and should never be entered into
                  this browser prototype.
                </p>
                <div className="connection-steps">
                  <span>
                    <i>1</i> Deploy your server-side Centova Cast adapter
                  </span>
                  <span>
                    <i>2</i> Configure authentication and role permissions
                  </span>
                  <span>
                    <i>3</i> Connect metadata, stream health, and management endpoints
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setModal('integration')}>
                  View integration contract <ArrowUpRight size={15} />
                </Button>
              </section>
            </div>
          )}
          <footer className="admin-footer">
            <span>
              SouthCity Operations <span>·</span> Built for the people behind the sound.
            </span>
            <span>Local preview environment</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast admin-toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal === 'playlist' && (
        <Modal title="Create a playlist" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              persist(
                'sc-admin-playlists',
                [...playlists, { ...data, tracks: 0, duration: '0m' }],
                setPlaylists,
              );
              setModal(null);
              notify('Empty playlist created locally');
            }}
          >
            <label className="form-label">
              Playlist name
              <input name="name" required maxLength={60} placeholder="A new kind of soundtrack" />
            </label>
            <label className="form-label">
              Genre
              <input name="genre" required placeholder="e.g. Soul & jazz" />
            </label>
            <label className="form-label">
              Rotation weight
              <select name="rotation">
                <option>Medium</option>
                <option>Heavy</option>
                <option>Light</option>
              </select>
            </label>
            <Button type="submit">Create local draft</Button>
          </form>
        </Modal>
      )}
      {modal?.type === 'delete-playlist' && (
        <Modal title="Remove this playlist draft?" onClose={() => setModal(null)}>
          <p className="modal-description">
            “{playlists[modal.index]?.name}” will be removed from this local preview.
          </p>
          <div className="detail-actions">
            <Button
              onClick={() => {
                persist(
                  'sc-admin-playlists',
                  playlists.filter((_, i) => i !== modal.index),
                  setPlaylists,
                );
                setModal(null);
                notify('Playlist removed locally');
              }}
            >
              Remove playlist
            </Button>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Keep playlist
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'schedule' && (
        <Modal title="Schedule a broadcast" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              persist('sc-admin-schedule', [...events, { ...data, duration: '1 hour' }], setEvents);
              setDay(data.day);
              setModal(null);
              notify('Broadcast added to the local schedule');
            }}
          >
            <label className="form-label">
              Show name
              <input name="title" required maxLength={80} />
            </label>
            <div className="form-columns">
              <label className="form-label">
                Day
                <select name="day" defaultValue={day}>
                  {weekdays.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Start time · IST
                <input type="time" name="time" defaultValue="17:00" required />
              </label>
            </div>
            <label className="form-label">
              Station
              <select name="station">
                {stations.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Host
              <input name="host" required maxLength={60} />
            </label>
            <Button type="submit">Save local broadcast</Button>
          </form>
        </Modal>
      )}
      {['dj', 'user'].includes(modal) && (
        <Modal
          title={modal === 'dj' ? 'Add a DJ draft' : 'Add a user draft'}
          onClose={() => setModal(null)}
        >
          <p className="modal-description">
            This creates a local record only. No invitation or email will be sent.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              if (modal === 'dj') persist('sc-admin-djs', [...djs, data], setDjs);
              else persist('sc-admin-users', [...users, data], setUsers);
              setModal(null);
              notify('Local person record saved. No invitation sent.');
            }}
          >
            <label className="form-label">
              Name
              <input name="name" required maxLength={60} />
            </label>
            <label className="form-label">
              Email
              <input name="email" type="email" required />
            </label>
            <label className="form-label">
              Role
              <select name="role">
                {(modal === 'dj' ? ['DJ', 'Guest host'] : ['Listener', 'Editor', 'Admin']).map(
                  (r) => (
                    <option key={r}>{r}</option>
                  ),
                )}
              </select>
            </label>
            <label className="form-label">
              Station
              <select name="station">
                {stations.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Save local record</Button>
          </form>
        </Modal>
      )}
      {modal === 'station' && (
        <Modal title="Add a station" onClose={() => setModal(null)}>
          <div className="connection-panel">
            <Radio size={32} />
            <h3>Ready for your next frequency.</h3>
            <p>
              New station provisioning needs a connected Centova Cast server. This preview includes
              six stations whose configuration you can edit and save locally.
            </p>
            <Button
              onClick={() => {
                setModal(null);
                openStation(stations[0]);
                setTab('Configuration');
              }}
            >
              Explore station configuration <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'integration' && (
        <Modal title="A secure connection, by design" onClose={() => setModal(null)}>
          <div className="info-modal">
            <p>
              Public station data comes from <code>GET /api/stations</code>. Metadata updates arrive
              through <code>/api/events</code> using Server-Sent Events.
            </p>
            <p>
              Protected mutations use <code>/api/admin/*</code> with authenticated roles, audit
              logs, and validation on the server.
            </p>
            <p>
              Full schemas, security boundaries, and implementation requirements are documented in{' '}
              <strong>docs/INTEGRATION.md</strong>.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Metric({ label, value, change, icon: Icon }) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <small>
        {change.startsWith('+') && <ArrowUpRight size={12} />} {change}
      </small>
    </article>
  );
}
function ListenerChart({ range }) {
  const values =
    range === 'Today'
      ? [12, 10, 9, 7, 6, 9, 20, 29, 35, 43, 38, 46, 50, 59, 48, 63, 73, 66, 84, 77, 58, 47, 31, 23]
      : range === 'Last 30 days'
        ? [
            20, 27, 18, 35, 31, 42, 38, 49, 40, 56, 50, 63, 52, 67, 60, 72, 67, 79, 68, 85, 75, 89,
            79, 92,
          ]
        : [
            20, 24, 20, 35, 31, 44, 41, 33, 47, 43, 59, 52, 67, 55, 62, 57, 74, 65, 80, 68, 83, 77,
            91, 85,
          ];
  const points = values.map((v, i) => `${45 + i * 31},${165 - v * 1.5}`).join(' ');
  return (
    <section className="admin-panel listener-chart">
      <div className="panel-heading">
        <div>
          <h2>Listeners over time</h2>
          <p>A little more company on every frequency.</p>
        </div>
        <span className="chart-legend">
          <i /> Total listeners <span>· {range}</span>
        </span>
      </div>
      <div className="chart-container">
        <svg
          viewBox="0 0 790 200"
          role="img"
          aria-label={`Illustrative listener trend for ${range.toLowerCase()}`}
        >
          <defs>
            <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity=".16" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 75, 120, 165].map((y, i) => (
            <g key={y}>
              <line x1="45" y1={y} x2="763" y2={y} stroke="var(--line)" strokeDasharray="3 4" />
              <text x="0" y={y + 4} fill="var(--muted)" fontSize="9">
                {['10k', '7.5k', '5k', '2.5k'][i]}
              </text>
            </g>
          ))}
          <polygon points={`45,165 ${points} 758,165`} fill="url(#chart-area)" />
          <polyline
            points={points}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {(range === 'Today'
            ? ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00']
            : range === 'Last 30 days'
              ? ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30']
              : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          ).map((d, i) => (
            <text
              key={d}
              x={45 + i * 118}
              y="192"
              fill="var(--muted)"
              fontSize="9"
              textAnchor={i === 0 ? 'start' : i === 6 ? 'end' : 'middle'}
            >
              {d}
            </text>
          ))}
        </svg>
      </div>
      <div className="chart-footnote">
        Illustrative trend · Connect listener statistics for real-time reporting
      </div>
    </section>
  );
}
function AutoDJ({ enabled, onToggle, onPlaylist }) {
  return (
    <div className="autodj-layout">
      <section className="admin-panel autodj-panel">
        <div className="autodj-symbol">
          <Disc3 size={42} />
        </div>
        <h2>Keep your frequency flowing.</h2>
        <p>
          AutoDJ keeps your station on air between live shows, with playlists and rotations that
          sound unmistakably like you.
        </p>
        <div className="autodj-switch">
          <div>
            <strong>AutoDJ</strong>
            <small>{enabled ? 'Enabled in local draft' : 'Disabled in local draft'}</small>
          </div>
          <button
            className={`switch ${enabled ? 'on' : ''}`}
            role="switch"
            aria-label="AutoDJ draft mode"
            aria-checked={enabled}
            onClick={onToggle}
          >
            <i />
          </button>
        </div>
        <div className="autodj-settings">
          <span>
            Fallback behavior<strong>Return to rotation</strong>
          </span>
          <span>
            Crossfade<strong>4 seconds</strong>
          </span>
          <span>
            Replay gain<strong>Track normalization</strong>
          </span>
        </div>
        <Button onClick={onPlaylist}>
          <ListMusic size={16} /> Manage rotations
        </Button>
      </section>
      <section className="admin-panel rotation-panel">
        <div className="panel-heading">
          <h2>Sample rotation queue</h2>
        </div>
        {stations.slice(0, 5).map((s, i) => (
          <div className="queue-row" key={s.id}>
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <Artwork station={s} />
            <div>
              <strong>{s.track}</strong>
              <small>{s.artist}</small>
            </div>
            <span>{i === 0 ? 'UP NEXT' : `${3 + i}:24`}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
function EmbedPanel({ notify, streamUrl }) {
  const secure = streamUrl.startsWith('https:');
  const snippets = [
    ['Stream URL', 'For media players, radio directories, and the SouthCity apps.', streamUrl],
    [
      'Website player',
      'Paste into any web page to add a play button for the live stream.',
      `<audio controls preload="none" src="${streamUrl}"></audio>`,
    ],
    [
      'Now playing data',
      'Current song, listeners, and bitrate as JSON. Read it server-side; browsers can’t fetch it cross-site.',
      publicStatsUrl(streamUrl),
    ],
  ];
  const copy = (label, value) =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => notify(`${label} copied`))
      .catch(() => notify('Copy failed. Select the text and copy it manually.'));
  return (
    <section className="admin-panel embed-panel">
      <div className="panel-heading">
        <div>
          <h2>Embed & share</h2>
          <p>Public listener addresses. They never contain Centova Cast credentials.</p>
        </div>
      </div>
      {!secure && (
        <div className="admin-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>This stream is HTTP-only</strong>
            <p>
              Browsers block HTTP audio on HTTPS websites, including a deployed SouthCity app.
              Enable SSL for the stream or serve it through an HTTPS proxy, then publish the HTTPS
              address from the Configuration tab.
            </p>
          </div>
        </div>
      )}
      {snippets.map(([label, hint, value]) => (
        <div className="embed-row" key={label}>
          <div>
            <strong>{label}</strong>
            <small>{hint}</small>
          </div>
          <code>{value}</code>
          <Button variant="secondary" onClick={() => copy(label, value)}>
            <Copy size={15} /> Copy
          </Button>
        </div>
      ))}
    </section>
  );
}
function LiveStationForm({ station, notify }) {
  const [state, setState] = useState({ phase: 'idle' }),
    [streamUrl, setStreamUrl] = useState(station.stream);
  const publish = async (input, force = false) => {
    const { value, error } = validateLiveStation(input);
    if (error) return setState({ phase: 'failed', error });
    setState({ phase: 'publishing' });
    try {
      await publishLiveStation(value, { force });
      setState({ phase: 'published' });
      notify(`${value.name} published to the SouthCity app`);
    } catch (e) {
      setState({ phase: 'failed', error: e.message, unreachable: e.unreachable, value });
    }
  };
  return (
    <form
      className="admin-panel configuration-form"
      onSubmit={(e) => {
        e.preventDefault();
        publish(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <h2>Station configuration</h2>
      <p>
        Publishing updates the SouthCity app for everyone using this local server. Listeners get a
        new stream address the next time they press play.
      </p>
      <label className="form-label">
        Station name
        <input name="name" defaultValue={station.name} required maxLength={80} />
      </label>
      <label className="form-label">
        Description
        <textarea
          name="description"
          rows="3"
          defaultValue={station.description}
          required
          maxLength={400}
        />
      </label>
      <div className="form-columns">
        <label className="form-label">
          Genre
          <select name="genre" defaultValue={station.genre}>
            {stationGenres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Language
          <select name="language" defaultValue={station.language}>
            {stationLanguages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-label">
        Public stream URL
        <input
          name="streamUrl"
          type="url"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          required
        />
        <small>
          {streamUrl.startsWith('http:')
            ? 'HTTP streams play in this local preview but are blocked on HTTPS websites. Use an HTTPS address before deploying.'
            : 'The public listener address from Centova Cast. Never include admin credentials.'}
        </small>
      </label>
      {state.phase === 'failed' && (
        <div className="admin-alert form-alert" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Not published</strong>
            <p>{state.error}</p>
          </div>
          {state.unreachable && (
            <Button type="button" variant="secondary" onClick={() => publish(state.value, true)}>
              Publish anyway
            </Button>
          )}
        </div>
      )}
      {state.phase === 'published' && (
        <p className="form-success" role="status">
          <CheckCircle2 size={15} /> Published. The SouthCity app picks this up within 15 seconds.
        </p>
      )}
      <Button type="submit" disabled={state.phase === 'publishing'}>
        {state.phase === 'publishing' ? (
          <>
            <RefreshCw size={16} className="spin" /> Checking stream & publishing…
          </>
        ) : (
          <>
            <Upload size={16} /> Publish to app
          </>
        )}
      </Button>
    </form>
  );
}
function StationForm({ station, draft, onSave }) {
  return (
    <form
      className="admin-panel configuration-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <h2>Station configuration</h2>
      <p>Changes are saved on this device as a draft.</p>
      <label className="form-label">
        Station name
        <input name="name" defaultValue={draft?.name || station.name} required maxLength={80} />
      </label>
      <label className="form-label">
        Description
        <textarea
          name="description"
          rows="3"
          defaultValue={draft?.description || station.description}
          required
        />
      </label>
      <div className="form-columns">
        <label className="form-label">
          Genre
          <select name="genre" defaultValue={draft?.genre || station.genre}>
            {stationGenres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Language
          <select name="language" defaultValue={draft?.language || station.language}>
            {stationLanguages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-label">
        Public stream URL
        <input
          name="stream"
          type="url"
          defaultValue={draft?.stream || station.stream}
          required
          pattern="https://.*"
        />
        <small>HTTPS public URL only. Never include admin credentials.</small>
      </label>
      <Button type="submit">
        <Check size={16} /> Save local configuration
      </Button>
    </form>
  );
}
function PeopleTable({ people, onAdd, users = false }) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>{users ? 'Your community' : 'Voices behind the frequency'}</h2>
          <p>
            {people.length} {users ? 'user' : 'host'} records · Preview directory
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus size={15} /> Add {users ? 'user' : 'DJ'} draft
        </Button>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Station</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p, i) => (
              <tr key={`${p.email}-${i}`}>
                <td>
                  <span className="person-name">
                    <span className="avatar small">{p.name.slice(0, 1)}</span>
                    {p.name}
                  </span>
                </td>
                <td>{p.email}</td>
                <td>
                  <span className="admin-tag">{p.role}</span>
                </td>
                <td>{p.station}</td>
                <td>
                  <span className="status-label muted">Local record</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!people.length && (
        <EmptyState
          title="No hosts assigned yet"
          description="Add a DJ draft to this station to start planning."
        />
      )}
    </section>
  );
}
