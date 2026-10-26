import {LYRICS,TOTAL,BPM,clamp,SONGMAP} from './core';

// ---------- the loaded song (public/songs/<id>/<audio>) as the master clock ----------
// Song map times are seconds in the audio file, so game t = file time. `offset` is a per-song nudge (] / [ keys, remembered)
// for when the file and the map disagree by a few frames.
// Making a map for a new song by ear: play it, press T at the start of each of the lyric lines in order, then once more when
// the last line ends; Y saves map.json (bpm and duration come from the loaded map or the defaults; check them).
export const SONG:any={has:false,el:null,offset:0,taps:[],duration:0};
const key=()=>'etm.offset.'+(SONGMAP.id||'none');
export function loadSong(){if(!SONGMAP.id){SONG.has=false;return}
 const el=new Audio();el.preload='auto';el.src=import.meta.env.BASE_URL+'songs/'+encodeURIComponent(SONGMAP.id)+'/'+SONGMAP.audio;
 el.addEventListener('canplaythrough',()=>{SONG.has=true;SONG.duration=el.duration||0},{once:true});el.addEventListener('error',()=>{SONG.has=false});SONG.el=el;
 try{const o=localStorage.getItem(key());if(o!=null&&isFinite(parseFloat(o)))SONG.offset=parseFloat(o)}catch{}}
export const songTime=()=>clamp(SONG.el.currentTime-SONG.offset,0,TOTAL);
export function songSeek(t){if(!SONG.has)return;try{SONG.el.currentTime=clamp(t+SONG.offset,0,SONG.duration||1e9)}catch{}}
export function songPlay(){if(!SONG.has)return Promise.resolve(true);return SONG.el.play().then(()=>true).catch(()=>false)}
export function songPause(){if(SONG.has)SONG.el.pause()}
export function songMute(m:boolean){if(SONG.el)SONG.el.muted=m}
export function nudge(d){SONG.offset=Math.round((SONG.offset+d)*1000)/1000;try{localStorage.setItem(key(),String(SONG.offset))}catch{}}
export function tap(){if(!SONG.has)return;SONG.taps.push(Math.round(SONG.el.currentTime*1000)/1000)}
export function clearTaps(){SONG.taps=[]}
export function saveTiming(){const n=LYRICS.length,lines=SONG.taps.slice(0,n);if(lines.length<n)return;
 const j:any={title:SONGMAP.title||'',audio:SONGMAP.audio,bpm:SONGMAP.bpm||BPM,beat0:SONGMAP.beat0||0,duration:Math.round((SONG.duration||TOTAL)*1000)/1000,lines,lastLyricEnd:SONG.taps[n]??null};
 const blob=new Blob([JSON.stringify(j,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='map.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
