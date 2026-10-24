import {BAR,LYRICS,ERAS,TOTAL,clamp} from './core';

// ---------- optional Suno track as the master clock, with offset nudge and tap-to-sync ----------
// Drop the track at public/song.mp3. `offset` is the time in the audio file where the game's t=0 sits.
// Optional public/timing.json: {"offset":0.4,"lines":[seconds per lyric line],"eras":[seconds per era start]}.
export const SONG:any={has:false,el:null,offset:0,taps:[],duration:0};
const KEY='etm.offset';
export function loadSong(){const el=new Audio();el.preload='auto';el.src=import.meta.env.BASE_URL+'song.mp3';
 el.addEventListener('canplaythrough',()=>{SONG.has=true;SONG.duration=el.duration||0},{once:true});el.addEventListener('error',()=>{SONG.has=false});SONG.el=el;
 try{const o=localStorage.getItem(KEY);if(o!=null&&isFinite(parseFloat(o)))SONG.offset=parseFloat(o)}catch{}
 fetch(import.meta.env.BASE_URL+'timing.json').then(r=>r.ok?r.json():null).then(j=>{if(j)applyTiming(j)}).catch(()=>{})}
export function applyTiming(j){if(typeof j.offset==='number')SONG.offset=j.offset;
 if(Array.isArray(j.lines))j.lines.forEach((sec,i)=>{if(typeof sec==='number'&&LYRICS[i])LYRICS[i][0]=(sec-SONG.offset)/BAR});
 if(Array.isArray(j.eras))j.eras.forEach((sec,i)=>{if(typeof sec==='number'&&ERAS[i]&&i>0)ERAS[i].start=sec-SONG.offset})}
export const songTime=()=>clamp(SONG.el.currentTime-SONG.offset,0,TOTAL);
export function songSeek(t){if(!SONG.has)return;try{SONG.el.currentTime=clamp(t+SONG.offset,0,SONG.duration||1e9)}catch{}}
export function songPlay(){if(!SONG.has)return Promise.resolve(true);return SONG.el.play().then(()=>true).catch(()=>false)}
export function songPause(){if(SONG.has)SONG.el.pause()}
export function nudge(d){SONG.offset=Math.round((SONG.offset+d)*1000)/1000;try{localStorage.setItem(KEY,String(SONG.offset))}catch{}}
export function tap(){if(!SONG.has)return;SONG.taps.push(Math.round(SONG.el.currentTime*1000)/1000)}
export function clearTaps(){SONG.taps=[]}
export function saveTiming(){const lines=SONG.taps.slice(0,LYRICS.length);const j:any={offset:SONG.offset,lines};
 if(lines.length>=31)j.eras=[SONG.offset,lines[6],lines[14]-BAR,lines[22]-BAR,lines[30]];
 const blob=new Blob([JSON.stringify(j,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='timing.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
