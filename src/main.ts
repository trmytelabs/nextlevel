import {$,clamp,lerp,smooth,rngf,hash,BPM,BEAT,BAR,TOTAL,bar,W,H,ERAS,eraAt,transAt,LYRICS,cv,dpr,ctx,lo1,lo2,lo3,scan,blit,readInput,clickOn,setClickOn,ensureAC,hat,drums,lastInputReal,clearEdges,HK} from './core';
import {E1} from './era1';
import {E2} from './era2';
import {E3} from './era3';
import {E4} from './era4';
import {E5} from './era5';
import {SONG,loadSong,songTime,songSeek,songPlay,songPause,nudge,tap,clearTaps,saveTiming} from './song';

// ---------- transport, compositing, HUD ----------
let songT=0,playing=true,lastNow=performance.now(),ended=false,lastBeatT=-1,beatIdx=0,songArmed=false;
function seek(t){lineIdx=-1;songT=clamp(t,0,TOTAL);E1.init(songT);E2.init(songT);E3.init(songT);E4.init(songT);E5.init(songT);ended=false;songSeek(songT)}
function setPlaying(v){playing=v;$('#play').textContent=playing?'PAUSE':'PLAY';if(playing)songPlay().then(ok=>{if(!ok)setPlaying(false)});else songPause()}
function togglePlay(){if(ended){seek(0);setPlaying(true)}else setPlaying(!playing)}
function toggleClick(){ensureAC();setClickOn(!clickOn);$('#click').textContent='SOUND: '+(clickOn?'ON':'OFF');$('#click').classList.toggle('on',clickOn)}
const AUTO_MODES=['idle','on','off'],AUTO_LABEL:any={idle:'AUTOPILOT: WHEN IDLE',on:'AUTOPILOT: ON',off:'AUTOPILOT: OFF'};let autoMode='idle';
function cycleAuto(){autoMode=AUTO_MODES[(AUTO_MODES.indexOf(autoMode)+1)%3];$('#autoBtn').textContent=AUTO_LABEL[autoMode];$('#autoBtn').classList.toggle('on',autoMode==='on')}
function isAuto(now){return autoMode==='on'?true:autoMode==='off'?false:now-lastInputReal>2000}
$('#play').onclick=togglePlay;$('#restart').onclick=()=>{seek(0);setPlaying(true)};$('#click').onclick=toggleClick;$('#autoBtn').onclick=cycleAuto;
const scrub=$('#scrub');let drag=false;const sc=e=>{const r=scrub.getBoundingClientRect();seek(clamp((e.clientX-r.left)/r.width,0,1)*TOTAL)};
scrub.addEventListener('pointerdown',e=>{drag=true;sc(e)});addEventListener('pointermove',e=>{if(drag)sc(e)});addEventListener('pointerup',()=>drag=false);
for(const e of ERAS){const m=document.createElement('div');m.className='mark';m.style.left=(e.start/TOTAL*100)+'%';m.innerHTML='<span>'+e.name.split(' · ')[1]+'</span>';scrub.appendChild(m)}

function onBeat(b,t,auto){const e=eraAt(t);if(!SONG.has&&!(e===4&&t>=bar(94.5)))drums(e,b);E1.onBeat(b,t);E4.onBeat(b,t,auto);E5.onBeat(b,t,auto)}
function on8th(n,t,auto){const e=eraAt(t);if(!SONG.has&&clickOn&&e>=1&&!(e===4&&t>=bar(94.5)))hat(e===2&&n%2===1);E1.on8th(n,t,auto);E4.on8th(n,t,auto);E5.on8th(n,t,auto)}

function glitch(t){if(t-lastBeatT<0.07&&hash(beatIdx)>0.5){for(let i=0;i<3;i++){const y=Math.floor(hash(beatIdx*7+i)*H),h=10+hash(beatIdx*13+i)*40,dx=(hash(beatIdx*17+i)-0.5)*40;ctx.drawImage(cv,0,y*dpr,W*dpr,h*dpr,dx,y,W,h)}}}
function edge(x){const g=ctx.createLinearGradient(x-30,0,x+6,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');ctx.fillStyle=g;ctx.fillRect(x-30,0,36,H)}

function render(t,auto){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);const e=eraAt(t),tr=transAt(t);
 if(e===0){E1.draw(lo1.x,t);if(tr){E2.draw(lo2.x,t);blit(lo2);const ex=W*smooth(tr.p);ctx.save();ctx.beginPath();ctx.rect(ex,0,W-ex,H);ctx.clip();blit(lo1);ctx.restore();edge(ex);scan(0.55*(1-tr.p))}else{blit(lo1);scan(0.55)}}
 else if(e===1){E2.draw(lo2.x,t);if(tr){E3.draw(lo3.x,t);blit(lo3);const p=smooth(tr.p);ctx.save();ctx.globalAlpha=1-p;const hy=H*0.5;ctx.translate(W/2,hy);ctx.scale(1+p*0.6,1-p*0.98);ctx.translate(-W/2,-hy);blit(lo2);ctx.restore();scan(0.3*(1-p))}else{blit(lo2);scan(0.3)}}
 else if(e===2){E3.draw(lo3.x,t);if(tr){E4.draw(ctx,t);ctx.globalAlpha=Math.pow(1-tr.p,1.5);blit(lo3);ctx.globalAlpha=1;scan(0.07*(1-tr.p))}else{blit(lo3);scan(0.07)}}
 else if(e===3){E4.draw(ctx,t);if(tr){const p=smooth(tr.p);ctx.save();ctx.translate(W*(1-p),0);ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();E5.draw(ctx,t);ctx.restore();edge(W*(1-p))}}
 else{E5.draw(ctx,t);const q=clamp((t-ERAS[4].start)/(BAR*8),0,1);scan(0.22*q);glitch(t)}}

let lyricShown='',lineIdx=-1,captions=true;
function toggleCaptions(){captions=!captions;lyricShown=''}
function dispatchLine(i,t){const words=LYRICS[i][1].split(' ');E1.onLine(words,t);E2.onLine(words,t);E3.onLine(words,t);E4.onLine(words,t);E5.onLine(words,t)}
function hud(t,auto){const e=eraAt(t),tr=transAt(t);$('#era').textContent=tr?ERAS[tr.from].name+'  >  '+ERAS[tr.to].name:ERAS[e].name;
 $('#clock').textContent='BAR '+(Math.floor(t/BAR)+1)+' · '+(Math.floor((t%BAR)/BEAT)+1)+'  ·  '+BPM+' BPM'+(SONG.has?'  ·  SONG '+(SONG.offset>=0?'+':'')+SONG.offset.toFixed(2)+'s'+(SONG.taps.length?'  ·  TAP '+SONG.taps.length+'/'+LYRICS.length:''):'');
 let line='',idx=-1;for(let i=0;i<LYRICS.length;i++){const s=bar(LYRICS[i][0]);if(t<s)break;idx=i;const nx=LYRICS[i+1]?bar(LYRICS[i+1][0]):1e9;if(t-s<Math.min(nx-s,bar(1.9)))line=LYRICS[i][1];else line=''}
 if(idx!==lineIdx){lineIdx=idx;if(idx>=0&&playing)dispatchLine(idx,t)}
 if(line!==lyricShown){lyricShown=line;const el=$('#lyric');el.style.opacity=line&&captions?1:0;if(line)el.textContent=line}
 $('#auto').textContent=autoMode==='on'?'AUTOPILOT · watching':autoMode==='off'?'MANUAL · you are playing':auto?'AUTOPILOT · press any key to play':'MANUAL · autopilot resumes after 2s idle';
 $('#time').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+' / 3:00';$('#prog').style.width=(t/TOTAL*100)+'%'}

function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-lastNow)/1000);lastNow=now;const inp=readInput();const auto=isAuto(now);
 if(SONG.has&&!songArmed){songArmed=true;if(songT<1){setPlaying(false);$('#auto').textContent='PRESS PLAY TO START THE SONG'}}
 if(playing){const prev=songT;songT=SONG.has?(SONG.el.ended?TOTAL:songTime()):Math.min(TOTAL,songT+dt);if(SONG.has&&songT<prev)songT=prev;const pb=Math.floor(prev/BEAT),cb=Math.floor(songT/BEAT);if(cb!==pb){beatIdx=cb;lastBeatT=songT;onBeat(cb,songT,auto)}
  const p8=Math.floor(prev/(BEAT/2)),c8=Math.floor(songT/(BEAT/2));if(c8!==p8)on8th(c8,songT,auto);
  if(songT>=TOTAL){playing=false;ended=true;$('#play').textContent='REPLAY'}
  E1.update(dt,songT,inp,auto);E2.update(dt,songT,inp,auto);E3.update(dt,songT,inp,auto);E4.update(dt,songT,inp,auto);E5.update(dt,songT,inp,auto)}
 render(songT,auto);hud(songT,auto);clearEdges()}
Object.assign(HK,{togglePlay,toggleClick,cycleAuto,toggleCaptions,seek,nudge,tap,clearTaps,saveTiming});loadSong();
seek(0);requestAnimationFrame(frame);
