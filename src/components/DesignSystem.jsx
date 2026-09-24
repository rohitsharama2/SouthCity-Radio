import React, { useState } from 'react';
import { ArrowLeft, Play, Heart, Radio, Check, Sun, Moon } from 'lucide-react';
import {
  Brand,
  Button,
  IconButton,
  LiveBadge,
  Artwork,
  StationCard,
  SectionHeading,
  EmptyState,
  Modal,
  Skeleton,
  LoadingState,
  ErrorState,
} from './ui.jsx';
import { stations } from '../data/stations.js';
export default function DesignSystem({ onExit, theme, setTheme }) {
  const [modal, setModal] = useState(false),
    [favorite, setFavorite] = useState(false),
    [palette, setPalette] = useState('Terracotta'),
    [state, setState] = useState('Playing');
  const palettes = [
    { name: 'Terracotta', brand: '#ec622b', hover: '#ce4b19', soft: '#fae9de' },
    { name: 'Forest', brand: '#42735a', hover: '#315740', soft: '#e0eadf' },
    { name: 'Iris', brand: '#7761b5', hover: '#5a4395', soft: '#ece5f8' },
  ];
  const changePalette = (p) => {
    setPalette(p.name);
    document.documentElement.style.setProperty('--brand', p.brand);
    document.documentElement.style.setProperty('--brand-hover', p.hover);
    document.documentElement.style.setProperty(
      '--brand-soft',
      theme === 'dark' ? `color-mix(in srgb, ${p.brand} 23%, #161915)` : p.soft,
    );
  };
  return (
    <main className="design-system">
      <div className="design-topbar">
        <button className="back-link" onClick={onExit}>
          <ArrowLeft size={16} /> Back to SouthCity
        </button>
        <IconButton
          label="Toggle theme"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </IconButton>
      </div>
      <Brand />
      <div className="page-intro">
        <div className="eyebrow">THE SOUTHCITY DESIGN SYSTEM · V1.0</div>
        <h1>
          A shared language.
          <br />
          An unmistakable feeling.
        </h1>
        <p>One set of tokens. Every component. Every frequency.</p>
      </div>
      <section className="design-section">
        <SectionHeading
          title="01 / Color & personality"
          subtitle="Try a palette. Semantic tokens update the entire app in this session."
        />
        <div className="chips">
          {palettes.map((p) => (
            <button
              className={`chip ${palette === p.name ? 'selected' : ''}`}
              onClick={() => changePalette(p)}
              key={p.name}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="token-grid">
          {['brand', 'canvas', 'surface', 'surface-alt', 'ink', 'muted', 'line', 'success'].map(
            (t) => (
              <div key={t}>
                <span style={{ background: `var(--${t})` }} />
                <strong>--{t}</strong>
              </div>
            ),
          )}
        </div>
        <p className="preview-note">
          Permanent theme changes belong in src/styles/tokens.css. Station artwork retains its own
          editorial palette.
        </p>
      </section>
      <section className="design-section">
        <SectionHeading
          title="02 / Typography"
          subtitle="Manrope for a distinct voice. DM Sans for the details."
        />
        <div className="type-specimen">
          <h1>Find your frequency.</h1>
          <h2>Good sounds deserve another listen.</h2>
          <h3>Independent voices. A shared frequency.</h3>
          <p>Real people, handpicked music, and a place to belong.</p>
          <span className="eyebrow">RADIO, REIMAGINED.</span>
        </div>
      </section>
      <section className="design-section">
        <SectionHeading title="03 / Actions & controls" />
        <div className="component-row">
          <Button>
            <Play size={16} fill="currentColor" /> Listen live
          </Button>
          <Button variant="secondary" onClick={() => setFavorite(!favorite)}>
            {favorite ? <Check size={16} /> : <Heart size={16} />}{' '}
            {favorite ? 'Following' : 'Follow station'}
          </Button>
          <Button disabled>Unavailable</Button>
          <LiveBadge />
          <IconButton label="Toggle favorite" onClick={() => setFavorite(!favorite)}>
            <Heart fill={favorite ? 'currentColor' : 'none'} size={20} />
          </IconButton>
        </div>
      </section>
      <section className="design-section">
        <SectionHeading
          title="04 / Content cards"
          subtitle="Artwork provides the personality; shared structure provides the rhythm."
        />
        <div className="station-grid">
          {stations.slice(0, 4).map((s) => (
            <StationCard
              key={s.id}
              station={s}
              onOpen={() => setModal(true)}
              onPlay={() => setModal(true)}
              onFavorite={() => setFavorite(!favorite)}
              isFavorite={favorite}
            />
          ))}
        </div>
      </section>
      <section className="design-section">
        <SectionHeading
          title="05 / Audio & feedback states"
          subtitle="Always tell the listener what's happening—and how to recover."
        />
        <div className="chips">
          {[
            'Playing',
            'Paused',
            'Buffering',
            'Connecting',
            'Connection error',
            'Offline',
            'Station unavailable',
          ].map((s) => (
            <button
              className={`chip ${s === state ? 'selected' : ''}`}
              key={s}
              onClick={() => setState(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="state-preview">
          {['Buffering', 'Connecting'].includes(state) ? (
            <LoadingState label={`${state}…`} />
          ) : ['Connection error', 'Offline', 'Station unavailable'].includes(state) ? (
            <ErrorState
              title={state}
              description={
                state === 'Offline'
                  ? 'Reconnect to the internet to keep listening.'
                  : 'Choose another station or try reconnecting.'
              }
              onRetry={() => setState('Connecting')}
            />
          ) : (
            <div className="state-player">
              <Artwork station={stations[0]} />
              <div>
                <strong>SouthCity Originals</strong>
                <p>
                  {state === 'Playing' ? 'Playing preview audio' : 'Paused · Ready when you are'}
                </p>
              </div>
              <span className="status-label">{state}</span>
            </div>
          )}
        </div>
      </section>
      <section className="design-section">
        <SectionHeading title="06 / Loading, empty & overlays" />
        <div className="design-state-grid">
          <div className="skeleton-card" aria-label="Loading card example">
            <Skeleton height={170} />
            <Skeleton width="65%" />
            <Skeleton width="90%" height={12} />
          </div>
          <EmptyState
            title="A little space for something good"
            description="Your followed stations will appear here."
            action="Open a bottom sheet"
            onAction={() => setModal(true)}
          />
        </div>
      </section>
      <section className="design-section">
        <SectionHeading title="07 / Splash & welcome" />
        <div className="splash-specimen">
          <Brand />
          <div className="onboard-orbit">
            <Radio size={58} />
          </div>
          <h2>Find your frequency.</h2>
          <p>Your city. Your sound.</p>
        </div>
      </section>
      {modal && (
        <Modal title="Room for one good decision." onClose={() => setModal(false)}>
          <p className="modal-description">
            A reusable, keyboard-accessible dialog. Focus stays inside, Escape closes it, and focus
            returns to the original control.
          </p>
          <Button onClick={() => setModal(false)}>
            Sounds good <Check size={16} />
          </Button>
        </Modal>
      )}
      <footer className="page-footer">
        <span>Tokens → Shared components → Feature screens</span>
        <button className="text-button" onClick={onExit}>
          Back to the app <ArrowLeft size={14} />
        </button>
      </footer>
    </main>
  );
}
