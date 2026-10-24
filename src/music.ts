import {BEAT,BAR,bar,getAC,clickOn} from './core';

// ---------- generative score that follows the 128 BPM clock, era by era ----------
// Chord loop: Am F C G. Arcade = square waves. 16-bit = FM bass and chimes. Racer = breakbeat and hoovers.
// Mobile = plucks and sidechain. Finale = everything stacked. Outro = one square note.
const NOTE=(n:number)=>440*Math.pow(2,(n-69)/12);
const CHORDS=[[57,60,64],[53,57,60],[60,64,67],[55,59,62]]; // A3 C4 E4 | F3 A3 C4 | C4 E4 G4 | G3 B3 D4
const LEAD=[[76,79,81,84,81,79,76,72],[77,81,84,77,81,84,81,77],[79,84,88,84,79,76,79,84],[79,83,86,83,79,74,79,83]];
let duck=0;
function osc(type:OscillatorType,freq:number,t0:number,dur:number,vol:number,opts:any={}){const {AC,master}=getAC();if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(freq,t0);if(opts.detune)o.detune.value=opts.detune;if(opts.slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*opts.slide),t0+dur);
 let dest:AudioNode=master;if(opts.lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(opts.lp,t0);if(opts.lpEnd)f.frequency.exponentialRampToValueAtTime(opts.lpEnd,t0+dur);f.Q.value=opts.q||1;g.connect(f);f.connect(master);dest=null as any}
 const a=opts.attack||0.005;g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+a);g.gain.setValueAtTime(vol,t0+Math.max(a,dur*(opts.hold||0.3)));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g);if(dest)g.connect(dest);o.start(t0);o.stop(t0+dur+0.05)}
function fm(freq:number,t0:number,dur:number,vol:number,ratio=2,index=120){const {AC,master}=getAC();if(!AC)return;const c=AC.createOscillator(),m=AC.createOscillator(),mg=AC.createGain(),g=AC.createGain();c.type='sine';m.type='sine';c.frequency.value=freq;m.frequency.value=freq*ratio;mg.gain.setValueAtTime(index,t0);mg.gain.exponentialRampToValueAtTime(1,t0+dur);m.connect(mg);mg.connect(c.frequency);g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);c.connect(g);g.connect(master);c.start(t0);m.start(t0);c.stop(t0+dur+0.05);m.stop(t0+dur+0.05)}
function pad(chord:number[],t0:number,dur:number,vol:number,type:OscillatorType='sawtooth',lp=1800){for(const n of chord)for(const d of[-7,7])osc(type,NOTE(n),t0,dur,vol/3,{detune:d,lp,attack:0.25,hold:0.7})}
export const MUSIC={
 beat(b:number,t:number,era:number,active:boolean){if(!clickOn||!active)return;const {AC}=getAC();if(!AC)return;const t0=AC.currentTime+0.01,q=b%4,barI=Math.floor(b/4),chord=CHORDS[barI%4],root=chord[0]-12;
  const bridge=t>=bar(66.5)&&t<bar(75),outro=t>=bar(94),drop=t>=bar(75)&&t<bar(76);
  if(outro){if(q===0&&t<bar(95.2))osc('square',NOTE(57),t0,0.6,0.08);return}
  if(era===0){ // arcade: square bass on every beat, octave bounce
   osc('square',NOTE(root+(q%2?12:0)),t0,BEAT*0.5,0.07,{lp:1200});if(q===0)osc('triangle',NOTE(chord[0]),t0,BEAT*0.9,0.05)}
  else if(era===1){ // 16-bit: FM bass, chord stabs on 2 and 4, chimes
   fm(NOTE(root),t0,BEAT*0.6,0.16,2,160);if(q===1||q===3)for(const n of chord)osc('triangle',NOTE(n),t0,BEAT*0.5,0.045,{lp:2600});if(q===0)osc('sine',NOTE(chord[2]+12),t0,BEAT,0.04)}
  else if(era===2){ // racer: driving saw bass, hoover stab on 1, pad
   osc('sawtooth',NOTE(root),t0,BEAT*0.45,0.11,{lp:600,lpEnd:200});osc('sawtooth',NOTE(root),t0+BEAT*0.5,BEAT*0.4,0.08,{lp:500,lpEnd:180});
   if(q===0){for(const n of chord)for(const d of[-12,0,12])osc('sawtooth',NOTE(n),t0,BEAT*1.6,0.03,{detune:d,lp:2200,lpEnd:900,slide:0.985})}
   if(q===0)pad(chord,t0,BAR,0.05,'sawtooth',1400)}
  else if(era===3){ // mobile: plucks and sidechained pad; the bridge thins to a heartbeat
   if(bridge){if(q===0||q===2)osc('sine',NOTE(root),t0,0.25,0.12,{slide:0.5});if(q===0)pad(chord,t0,BAR,0.035,'triangle',900);return}
   duck=t0;osc('triangle',NOTE(root),t0,BEAT*0.5,0.12);if(q===0)pad(chord,t0,BAR,0.06,'sawtooth',1600);if(q===1||q===3)osc('sine',NOTE(chord[1]+12),t0,BEAT*0.5,0.05)}
  else{ // finale: everything at once
   osc('sawtooth',NOTE(root),t0,BEAT*0.45,0.12,{lp:700,lpEnd:220});fm(NOTE(root),t0,BEAT*0.5,0.1,2,120);osc('square',NOTE(root+12*(q%2)),t0,BEAT*0.4,0.04,{lp:1500});
   if(q===0)pad(chord,t0,BAR,0.07,'sawtooth',2200);if(q===0&&t>=bar(89))for(const n of chord)for(const d of[-14,0,14])osc('sawtooth',NOTE(n+12),t0,BEAT*1.8,0.03,{detune:d,lp:3000,lpEnd:1200});
   if(drop&&q===0)osc('sawtooth',NOTE(45),t0,BAR,0.14,{lp:400,lpEnd:3000})}}, // one riser per bar; firing it on every beat stacked three 0.14 saws on top of the full finale mix
 eighth(n8:number,t:number,era:number,active:boolean){if(!clickOn||!active)return;const {AC}=getAC();if(!AC)return;const t0=AC.currentTime+0.01,step=n8%8,barI=Math.floor(n8/8),lead=LEAD[barI%4],chord=CHORDS[barI%4];
  const bridge=t>=bar(66.5)&&t<bar(75),outro=t>=bar(94);if(outro||bridge)return;
  if(era===0){osc('square',NOTE(lead[step]),t0,BEAT*0.35,0.045,{lp:3000})}
  else if(era===1){if(step%2===0)osc('square',NOTE(lead[step]),t0,BEAT*0.3,0.04,{lp:3400});else osc('triangle',NOTE(chord[step%3]+12),t0,BEAT*0.25,0.03)}
  else if(era===2){if(step===3||step===7)osc('sawtooth',NOTE(lead[step]-12),t0,BEAT*0.3,0.05,{lp:1800,lpEnd:600})}
  else if(era===3){osc('triangle',NOTE(lead[step]),t0,BEAT*0.22,0.07,{lp:4000,lpEnd:800});if(step%4===2)osc('sine',NOTE(lead[step]+12),t0,BEAT*0.2,0.03)}
  else{osc('square',NOTE(lead[step]+12),t0,BEAT*0.3,0.035,{lp:5000});osc('triangle',NOTE(lead[(step+2)%8]),t0,BEAT*0.22,0.05,{lp:3000,lpEnd:900})}}};
