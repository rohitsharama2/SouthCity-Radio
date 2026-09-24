import React, {createContext,useContext,useEffect,useRef,useState} from 'react';
const AudioContext=createContext(null);
export const useAudio=()=>useContext(AudioContext);
export function AudioProvider({children}) {
 const audio=useRef(null),timer=useRef(null);
 const [station,setStation]=useState(null),[status,setStatus]=useState('paused'),[volume,setVolume]=useState(.7),[sleep,setSleep]=useState(0);
 useEffect(()=>{const element=new Audio();element.preload='none';audio.current=element;const listeners={playing:()=>setStatus('playing'),waiting:()=>setStatus('buffering'),pause:()=>setStatus('paused'),error:()=>setStatus(navigator.onLine?'connection error':'offline'),ended:()=>setStatus('station unavailable')};Object.entries(listeners).forEach(([name,fn])=>element.addEventListener(name,fn));const offline=()=>setStatus('offline');window.addEventListener('offline',offline);return()=>{element.pause();Object.entries(listeners).forEach(([name,fn])=>element.removeEventListener(name,fn));window.removeEventListener('offline',offline);clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
 useEffect(()=>{if(!station||!('mediaSession' in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:'SouthCity preview stream',artist:'SomaFM',album:station.name});navigator.mediaSession.setActionHandler('play',()=>{audio.current.play().catch(()=>setStatus('connection error'));});navigator.mediaSession.setActionHandler('pause',()=>audio.current.pause());},[station]);
 async function play(next){const player=audio.current;if(!player)return;if(next?.id!==station?.id){player.pause();player.src=next.stream;setStation(next);}setStatus('connecting');try{await player.play();}catch(error){if(error.name!=='AbortError')setStatus(navigator.onLine?'connection error':'offline');}}
 function toggle(){if(!station)return;if(['playing','buffering','connecting'].includes(status))audio.current.pause();else play(station);}
 function setSleepTimer(minutes){clearTimeout(timer.current);setSleep(minutes);if(minutes)timer.current=setTimeout(()=>{audio.current.pause();setSleep(0);},minutes*60000);}
 return <AudioContext.Provider value={{station,status,play,toggle,volume,setVolume,sleep,setSleepTimer}}>{children}</AudioContext.Provider>;
}
