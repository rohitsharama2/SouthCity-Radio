import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLiveStream } from './useLiveStream.js';
import { setMediaActionHandler, setMediaMetadata, setMediaPlaybackState } from './mediaSession.js';
const AudioContext = createContext(null);
export const useAudio = () => useContext(AudioContext);
export function AudioProvider({ children }) {
  const audio = useRef(null),
    timer = useRef(null),
    selected = useRef(null);
  const attempt = useRef(0),
    wantsPlayback = useRef(false);
  const [station, setStation] = useState(null),
    [status, setStatus] = useState('paused'),
    // System media controls show from the first play until the listener stops from them.
    [session, setSession] = useState(false);
  const [volume, setVolume] = useState(0.7),
    [sleep, setSleep] = useState(0);
  // Only a selected live station subscribes; metadata never touches audio.src.
  const live = useLiveStream(Boolean(station?.live));
  function pause() {
    wantsPlayback.current = false;
    attempt.current += 1;
    audio.current?.pause();
    setStatus('paused');
  }
  function stop() {
    pause();
    setSession(false);
  }
  useEffect(() => {
    const element = new Audio();
    element.preload = 'none';
    audio.current = element;
    const listeners = {
      playing: () => {
        if (wantsPlayback.current && !element.paused) setStatus('playing');
      },
      waiting: () => {
        if (wantsPlayback.current) setStatus('buffering');
      },
      pause: () => {
        if (!wantsPlayback.current) setStatus('paused');
      },
      error: () => {
        if (wantsPlayback.current && element.error)
          setStatus(navigator.onLine ? 'connection error' : 'offline');
      },
      ended: () => {
        if (element.ended) {
          wantsPlayback.current = false;
          setStatus('station unavailable');
        }
      },
    };
    Object.entries(listeners).forEach(([name, fn]) => element.addEventListener(name, fn));
    const offline = () => {
      if (wantsPlayback.current) setStatus('offline');
    };
    window.addEventListener('offline', offline);
    return () => {
      attempt.current += 1;
      wantsPlayback.current = false;
      Object.entries(listeners).forEach(([name, fn]) => element.removeEventListener(name, fn));
      element.pause();
      element.removeAttribute('src');
      element.load();
      window.removeEventListener('offline', offline);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (!station) return;
    setMediaMetadata(
      station.live
        ? {
            title: live.data?.title || station.name,
            artist: live.data?.artist || 'SouthCity Radio',
            album: station.name,
          }
        : { title: 'SouthCity preview stream', artist: 'SomaFM', album: station.name },
    );
  }, [station, live.data?.title, live.data?.artist]);
  useEffect(() => {
    if (!station) return;
    const handlers = { play: () => play(selected.current), pause, stop };
    Object.entries(handlers).forEach(([action, fn]) => setMediaActionHandler(action, fn));
    return () => Object.keys(handlers).forEach((action) => setMediaActionHandler(action, null));
  }, [station]);
  useEffect(() => {
    setMediaPlaybackState(session ? (status === 'playing' ? 'playing' : 'paused') : 'none');
  }, [session, status]);
  async function play(next) {
    const player = audio.current;
    if (!player || !next) return;
    const currentAttempt = ++attempt.current;
    wantsPlayback.current = true;
    setSession(true);
    // A republished stream address for the same station also needs a fresh source.
    if (next.id !== selected.current?.id || next.stream !== selected.current?.stream) {
      player.pause();
      player.src = next.stream;
      selected.current = next;
      setStation(next);
    } else if (player.error) {
      player.load();
    }
    setStatus('connecting');
    try {
      await player.play();
    } catch (error) {
      if (
        currentAttempt === attempt.current &&
        wantsPlayback.current &&
        error.name !== 'AbortError'
      ) {
        setStatus(navigator.onLine ? 'connection error' : 'offline');
      }
    }
  }
  function toggle() {
    if (!selected.current) return;
    if (['playing', 'buffering', 'connecting'].includes(status)) pause();
    else play(selected.current);
  }
  function setSleepTimer(minutes) {
    clearTimeout(timer.current);
    setSleep(minutes);
    if (minutes)
      timer.current = setTimeout(() => {
        pause();
        setSleep(0);
      }, minutes * 60000);
  }
  return (
    <AudioContext.Provider
      value={{ station, status, play, toggle, volume, setVolume, sleep, setSleepTimer }}
    >
      {children}
    </AudioContext.Provider>
  );
}
