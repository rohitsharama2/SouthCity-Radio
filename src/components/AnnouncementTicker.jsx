import React, { useEffect, useState } from 'react';
import { Megaphone, Pause, Play } from 'lucide-react';
import { IconButton } from './ui.jsx';
import { serverUrl } from './server.js';
import { accessToken } from './useAccount.js';
import {
  announcementsPath,
  defaultAnnouncements,
  validateAnnouncements,
} from '../data/announcements.js';

export async function announcementRequest(settings, signal) {
  const token = settings ? await accessToken() : null;
  const response = await fetch(serverUrl(announcementsPath), {
    method: settings ? 'PUT' : 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(settings && { body: JSON.stringify({ settings }) }),
    signal: signal ?? AbortSignal.timeout(10000),
  });
  const body = await response.json();
  const { value } = validateAnnouncements(body.settings);
  if (!response.ok || !value)
    throw new Error(body.error || 'Announcements could not be loaded or saved.');
  return value;
}
export function Ticker({ settings }) {
  const [paused, setPaused] = useState(false);
  if (!settings.enabled || !settings.messages.length) return null;
  const text = settings.messages.join('   •   ');
  return (
    <section
      className={`announcement-ticker ${paused ? 'is-paused' : ''}`}
      aria-label="Announcements"
    >
      <span className="ticker-label">
        <Megaphone size={16} aria-hidden="true" />
        <span>Announcements</span>
      </span>
      <div className="ticker-window">
        <p className="ticker-reader">{text}</p>
        <div
          className="ticker-track"
          aria-hidden="true"
          style={{ '--ticker-duration': `${Math.max(22, text.length / 5)}s` }}
        >
          <span>{text}</span>
          <span className="ticker-copy">{text}</span>
        </div>
      </div>
      <IconButton
        label={paused ? 'Resume announcements' : 'Pause announcements'}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </IconButton>
    </section>
  );
}
export default function AnnouncementTicker() {
  const [settings, setSettings] = useState(defaultAnnouncements);
  useEffect(() => {
    let active = true,
      controller;
    const refresh = async () => {
      if (document.hidden) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), 8000);
      try {
        const value = await announcementRequest(null, current.signal);
        if (active && controller === current) setSettings(value);
      } catch {
        /* Retain the last published ticker or the station welcome. */
      } finally {
        clearTimeout(timeout);
      }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return <Ticker settings={settings} />;
}
