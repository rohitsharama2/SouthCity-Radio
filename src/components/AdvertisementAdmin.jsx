import React, { useEffect, useState } from 'react';
import { Button } from './ui.jsx';
import { AdvertisementCard, loadAdvertisements, publishAdvertisements } from './Advertisements.jsx';
import { emptyAdvertisements, validateAdvertisements } from '../data/advertisements.js';
import { readLocal, writeLocal, removeLocal } from '../data/storage.js';

const draftKey = 'sc-admin-advertisements';
export default function AdvertisementAdmin({ allowed }) {
  const [cards, setCards] = useState(emptyAdvertisements);
  const [slot, setSlot] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState('Loading advertisements…');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let active = true;
    const draft = validateAdvertisements(readLocal(draftKey, [])).value;
    if (draft) setCards(draft);
    loadAdvertisements(controller.signal)
      .then((published) => {
        if (!active) return;
        if (!draft) setCards(published);
        setMessage(
          draft
            ? 'Local draft restored. Publish to update Home.'
            : 'Published cards loaded. Edits stay here until you publish.',
        );
      })
      .catch((failure) => {
        if (active) {
          setError(failure.message);
          setMessage('You can still edit and save a local draft.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setPhase('ready');
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  const update = (key, value) => {
    setCards((current) =>
      current.map((card, index) => (index === slot ? { ...card, [key]: value } : card)),
    );
    setMessage('Unpublished changes');
    setError('');
  };
  const save = async (publish) => {
    setError('');
    const result = validateAdvertisements(cards);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!publish) {
      setMessage(
        writeLocal(draftKey, result.value)
          ? 'Draft saved in this browser. Home is unchanged.'
          : 'Draft could not be saved in this browser.',
      );
      return;
    }
    setPhase('publishing');
    setMessage('Publishing advertisements…');
    try {
      const published = await publishAdvertisements(result.value);
      setCards(published);
      removeLocal(draftKey);
      setMessage('Published to Home. Open listener apps refresh within 15 seconds.');
    } catch (failure) {
      setMessage('Not published. Your changes are still here.');
      setError(failure.message || 'Publishing failed. Your changes are still here.');
    } finally {
      setPhase('ready');
    }
  };
  const busy = phase === 'loading' || phase === 'publishing';
  return (
    <section className="admin-panel sponsor-editor">
      <div className="panel-heading">
        <div>
          <h2>Home advertisement cards</h2>
          <p>Four positions, shown left to right. Disabled cards show an available ad space.</p>
        </div>
      </div>
      <div className="sponsor-editor-grid">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(true);
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Card position
              <select value={slot} onChange={(event) => setSlot(Number(event.target.value))}>
                {cards.map((_, index) => (
                  <option key={index} value={index}>
                    Card {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sponsor name
              <input
                value={cards[slot].sponsor}
                maxLength={60}
                onChange={(event) => update('sponsor', event.target.value)}
              />
            </label>
            <label>
              Advertisement title
              <input
                value={cards[slot].title}
                maxLength={80}
                onChange={(event) => update('title', event.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                value={cards[slot].description}
                maxLength={160}
                rows={3}
                onChange={(event) => update('description', event.target.value)}
              />
            </label>
            <label>
              Image URL
              <input
                type="url"
                placeholder="https://example.com/banner.jpg"
                value={cards[slot].imageUrl}
                onChange={(event) => update('imageUrl', event.target.value)}
              />
            </label>
            <small>
              Use a publicly hosted HTTPS image. Square artwork works best. Files are not uploaded
              here.
            </small>
            <label>
              Destination URL
              <input
                type="url"
                placeholder="https://example.com"
                value={cards[slot].linkUrl}
                onChange={(event) => update('linkUrl', event.target.value)}
              />
            </label>
            <label className="sponsor-enabled">
              <input
                type="checkbox"
                checked={cards[slot].enabled}
                onChange={(event) => update('enabled', event.target.checked)}
              />{' '}
              Enable this advertisement
            </label>
          </fieldset>
          <p role="status">{message}</p>
          {error && (
            <p className="sponsor-error" role="alert">
              {error}
            </p>
          )}
          {!allowed && <p>Only station managers and administrators can publish advertisements.</p>}
          <div className="sponsor-editor-actions">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => save(false)}>
              Save local draft
            </Button>
            <Button type="submit" disabled={busy || !allowed}>
              {phase === 'publishing' ? 'Publishing…' : 'Publish advertisements'}
            </Button>
          </div>
        </form>
        <div className="sponsor-preview">
          <h3>Card preview</h3>
          <AdvertisementCard card={cards[slot]} index={slot} />
        </div>
      </div>
    </section>
  );
}
