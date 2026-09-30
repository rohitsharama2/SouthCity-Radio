import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Image } from 'lucide-react';
import { SectionHeading } from './ui.jsx';
import {
  advertisementsPath,
  emptyAdvertisements,
  publicAdUrl,
  validateAdvertisements,
} from '../data/advertisements.js';
import { serverUrl } from './server.js';
import { accessToken } from './useAccount.js';

export async function loadAdvertisements(signal) {
  const response = await fetch(serverUrl(advertisementsPath), { cache: 'no-store', signal });
  const body = await response.json();
  const { value } = validateAdvertisements(body.cards);
  if (!response.ok || !value) throw new Error(body.error || 'Advertisements could not be loaded.');
  return value;
}
export async function publishAdvertisements(cards) {
  const token = await accessToken();
  const response = await fetch(serverUrl(advertisementsPath), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ cards }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Advertisements could not be published.');
  const { value } = validateAdvertisements(body.cards);
  if (!value) throw new Error('The server did not confirm the advertisements.');
  return value;
}
export function AdvertisementCard({ card, index }) {
  const [failedImage, setFailedImage] = useState('');
  const imageUrl = publicAdUrl(card.imageUrl);
  const linkUrl = publicAdUrl(card.linkUrl);
  const enabled = card.enabled && card.title && card.sponsor;
  return (
    <article className="sponsor-card">
      <div className={`sponsor-art sponsor-art-${index % 4}`}>
        {enabled && imageUrl && failedImage !== imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(imageUrl)}
          />
        ) : (
          <div className="sponsor-art-placeholder">
            <Image size={32} aria-hidden="true" />
            <span>{enabled ? card.sponsor : 'Your brand here'}</span>
          </div>
        )}
        <span className="sponsor-badge">{enabled ? 'Sponsored' : 'Ad space'}</span>
      </div>
      <h3>{enabled ? card.title : `Advertisement space ${index + 1}`}</h3>
      <p>{enabled ? card.description || card.sponsor : 'Available for your next campaign.'}</p>
      {enabled && linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`Visit ${card.sponsor} (opens in a new tab)`}
        >
          Visit {card.sponsor}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
export default function Advertisements() {
  const [cards, setCards] = useState(emptyAdvertisements);
  useEffect(() => {
    let stopped = false;
    let controller;
    const refresh = async () => {
      if (document.hidden) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), 8000);
      try {
        const value = await loadAdvertisements(current.signal);
        if (!stopped && controller === current) setCards(value);
      } catch {
        /* Keep the last published cards, or the explicitly empty slots. */
      } finally {
        clearTimeout(timeout);
      }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return (
    <section className="home-advertisement" aria-label="Advertisements">
      <SectionHeading title="Advertisements" subtitle="Space for brands on your frequency." />
      <div className="station-grid sponsor-grid">
        {cards.map((card, index) => (
          <AdvertisementCard key={index} card={card} index={index} />
        ))}
      </div>
    </section>
  );
}
