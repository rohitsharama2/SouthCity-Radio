import React, { useEffect, useState } from 'react';
import { Button } from './ui.jsx';
import { Ticker, announcementRequest } from './AnnouncementTicker.jsx';
import { defaultAnnouncements, validateAnnouncements } from '../data/announcements.js';
import { readLocal, writeLocal, removeLocal } from '../data/storage.js';
const draftKey = 'sc-admin-announcements';
export default function AnnouncementAdmin({ allowed }) {
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState(defaultAnnouncements().messages.join('\n'));
  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState('Loading announcements…');
  const [error, setError] = useState('');
  const settings = {
    enabled,
    messages: text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  };
  const apply = (value) => {
    setEnabled(value.enabled);
    setText(value.messages.join('\n'));
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const draft = validateAnnouncements(readLocal(draftKey, {})).value;
    if (draft) apply(draft);
    announcementRequest(null, controller.signal)
      .then((value) => {
        if (!active) return;
        if (!draft) apply(value);
        setMessage(
          draft
            ? 'Local draft restored. Publish to update Home.'
            : 'Published announcements loaded.',
        );
      })
      .catch((failure) => {
        if (active) {
          setError(failure.message);
          setMessage('You can still save a local draft.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setPhase('ready');
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);
  const changed = () => {
    setError('');
    setMessage('Unpublished changes');
  };
  const save = async (publish) => {
    setError('');
    const { value, error: invalid } = validateAnnouncements(settings);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!publish) {
      setMessage(
        writeLocal(draftKey, value)
          ? 'Draft saved in this browser. Home is unchanged.'
          : 'Draft could not be saved.',
      );
      return;
    }
    if (!allowed) return;
    setPhase('publishing');
    setMessage('Publishing announcements…');
    try {
      const saved = await announcementRequest(value);
      apply(saved);
      removeLocal(draftKey);
      setMessage('Published to Home. Open listener apps refresh within 15 seconds.');
    } catch (failure) {
      setError(failure.message);
      setMessage('Not published. Your changes are still here.');
    } finally {
      setPhase('ready');
    }
  };
  const busy = phase !== 'ready';
  return (
    <section className="admin-panel sponsor-editor announcement-editor">
      <div className="panel-heading">
        <div>
          <h2>Home announcement ticker</h2>
          <p>Messages scroll in order. Listeners can pause them at any time.</p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(true);
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Announcement messages
            <textarea
              rows={7}
              value={text}
              aria-describedby="announcement-help"
              onChange={(event) => {
                setText(event.target.value);
                changed();
              }}
            />
          </label>
          <small id="announcement-help">
            One announcement per line. Up to six messages, 200 characters each.
          </small>
          <label className="sponsor-enabled">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked);
                changed();
              }}
            />{' '}
            Show announcement ticker
          </label>
        </fieldset>
        <div className="announcement-preview">
          <h3>Preview</h3>
          {enabled && settings.messages.length ? (
            <Ticker settings={settings} />
          ) : (
            <p>The ticker is hidden.</p>
          )}
        </div>
        <p role="status">{message}</p>
        {error && (
          <p className="sponsor-error" role="alert">
            {error}
          </p>
        )}
        {!allowed && <p>Only station managers and administrators can publish announcements.</p>}
        <div className="sponsor-editor-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => save(false)}>
            Save local draft
          </Button>
          <Button type="submit" disabled={busy || !allowed}>
            {phase === 'publishing' ? 'Publishing…' : 'Publish announcements'}
          </Button>
        </div>
      </form>
    </section>
  );
}
