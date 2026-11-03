import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLiveStream } from './useLiveStream.js';
import { useAccount } from './useAccount.js';
import { setMediaActionHandler, setMediaMetadata, setMediaPlaybackState } from './mediaSession.js';
import { NativeRadio } from './nativeRadio.js';
const AudioContext = createContext(null);
export const useAudio = () => useContext(AudioContext);
export function AudioProvider({ children }) {
  const account = useAccount();
  const mayListen = account.phase === 'signed-in';
  const access = useRef(false);
  access.current = mayListen;
  const audio = useRef(null),
    timer = useRef(null),
    recoveryTimer = useRef(null),
    selected = useRef(null);
  const attempt = useRef(0),
    wantsPlayback = useRef(false),
    recoveryAttempts = useRef(0);
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
    NativeRadio?.pause().catch(() => {});
    setStatus('paused');
  }
  function stop() {
    pause();
    setSession(false);
    NativeRadio?.stop().catch(() => {});
  }
  function scheduleRecovery() {
    const player = audio.current;
    if (!player || !selected.current || !wantsPlayback.current || !navigator.onLine) return;
    clearTimeout(recoveryTimer.current);
    if (recoveryAttempts.current >= 3) {
      setStatus('connection error');
      return;
    }
    recoveryTimer.current = setTimeout(
      () => {
        if (!wantsPlayback.current || !selected.current || !navigator.onLine) return;
        recoveryAttempts.current += 1;
        const currentAttempt = ++attempt.current;
        player.load();
        setStatus('connecting');
        player.play().catch((error) => {
          if (
            currentAttempt === attempt.current &&
            wantsPlayback.current &&
            error.name !== 'AbortError'
          )
            scheduleRecovery();
        });
      },
      Math.min(1000 * 2 ** recoveryAttempts.current, 4000),
    );
  }
  useEffect(() => {
    const element = new Audio();
    element.preload = 'none';
    audio.current = element;
    const listeners = {
      playing: () => {
        if (wantsPlayback.current && !element.paused) {
          recoveryAttempts.current = 0;
          clearTimeout(recoveryTimer.current);
          setStatus('playing');
        }
      },
      waiting: () => {
        if (wantsPlayback.current) {
          setStatus('buffering');
          scheduleRecovery();
        }
      },
      stalled: () => {
        if (wantsPlayback.current) scheduleRecovery();
      },
      pause: () => {
        if (!wantsPlayback.current) setStatus('paused');
      },
      error: () => {
        if (wantsPlayback.current && element.error) {
          setStatus(navigator.onLine ? 'connection error' : 'offline');
          scheduleRecovery();
        }
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
      clearTimeout(recoveryTimer.current);
      if (wantsPlayback.current) setStatus('offline');
    };
    const online = () => {
      if (wantsPlayback.current) scheduleRecovery();
    };
    const visible = () => {
      if (document.visibilityState === 'visible' && wantsPlayback.current) scheduleRecovery();
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    return () => {
      attempt.current += 1;
      wantsPlayback.current = false;
      Object.entries(listeners).forEach(([name, fn]) => element.removeEventListener(name, fn));
      element.pause();
      element.removeAttribute('src');
      element.load();
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
      clearTimeout(timer.current);
      clearTimeout(recoveryTimer.current);
    };
  }, []);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (mayListen) return;
    stop();
    clearTimeout(timer.current);
    setSleep(0);
    audio.current?.removeAttribute('src');
    audio.current?.load();
    clearTimeout(recoveryTimer.current);
    selected.current = null;
  }, [mayListen]);
  useEffect(() => {
    if (!station) return;
    setMediaMetadata(
      station.live
        ? {
            title: live.data?.title || station.name,
            artist: live.data?.artist || 'Radio South City',
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
    if (!access.current) return;
    const player = audio.current;
    if (!player || !next) return;
    const currentAttempt = ++attempt.current;
    wantsPlayback.current = true;
    recoveryAttempts.current = 0;
    clearTimeout(recoveryTimer.current);
    setSession(true);
    if (NativeRadio) {
      selected.current = next;
      setStation(next);
      setStatus('connecting');
      try {
        await NativeRadio.play({
          url: next.stream,
          title: next.name,
          artist: 'Radio South City',
          album: next.name,
        });
        setStatus('playing');
      } catch {
        setStatus(navigator.onLine ? 'connection error' : 'offline');
      }
      return;
    }
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
        scheduleRecovery();
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
