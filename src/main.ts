import {$,clamp,lerp,smooth,rngf,hash,BPM,BEAT,BAR,TOTAL,bar,W,H,ERAS,eraAt,transAt,LYRICS,cv,dpr,ctx,lo1,lo2,lo3,scan,blit,readInput,clickOn,setClickOn,ensureAC,hat,drums,lastInputReal,clearEdges,HK,MOBILE,QUALITY,setQuality,lastTouch,ptr} from './core';
import {E1} from './era1';
import {E2} from './era2';
import {E3} from './era3';
import {E4} from './era4';
import {E5} from './era5';
import {E5GL} from './era5gl';
import {E3GL} from './era3gl';
import {E1GL} from './era1gl';
import {CRT} from './crt';
import {MUSIC} from './music';
import {SONG,loadSong,songTime,songSeek,songPlay,songPause,nudge,tap,clearTaps,saveTiming} from './song';

// ---------- transport, compositing, HUD ----------
let songT=0,playing=true,lastNow=performance.now(),ended=false,lastBeatT=-1,beatIdx=0,songArmed=false,seeks=0,etmUsed=false;
// lastBeatT/beatIdx are reset so the era-5 glitch (keyed off the last beat) does not depend on where we seeked from
function seek(t){seeks++;lineIdx=-1;songT=clamp(t,0,TOTAL);lastBeatT=-1;beatIdx=Math.floor(songT/BEAT);ensureGL(songT);E1.init(songT);E2.init(songT);E3.init(songT);E4.init(songT);E5.init(songT);ended=false;songSeek(songT)}
function setPlaying(v){playing=v;$('#play').textContent=playing?'PAUSE':'PLAY';if(playing)songPlay().then(ok=>{if(!ok)setPlaying(false)});else songPause()}
function togglePlay(){if(ended){seek(0);setPlaying(true)}else setPlaying(!playing)}
function toggleClick(){ensureAC();setClickOn(!clickOn);$('#click').textContent='SOUND: '+(clickOn?'ON':'OFF');$('#click').classList.toggle('on',clickOn)}
const AUTO_MODES=['idle','on','off'],AUTO_LABEL:any={idle:'AUTOPILOT: WHEN IDLE',on:'AUTOPILOT: ON',off:'AUTOPILOT: OFF'};let autoMode='idle';
function cycleAuto(){autoMode=AUTO_MODES[(AUTO_MODES.indexOf(autoMode)+1)%3];$('#autoBtn').textContent=AUTO_LABEL[autoMode];$('#autoBtn').classList.toggle('on',autoMode==='on')}
function isAuto(now){const last=eraAt(songT)===4?Math.max(lastInputReal,ptr.t):lastInputReal;return autoMode==='on'?true:autoMode==='off'?false:now-last>2000}
$('#qBtn').textContent='FX: '+QUALITY.toUpperCase();$('#qBtn').onclick=()=>setQuality(QUALITY==='low'?'high':'low');$('#rotate').onclick=()=>document.body.classList.add('pok');
$('#play').onclick=togglePlay;$('#restart').onclick=()=>{seek(0);setPlaying(true)};$('#click').onclick=toggleClick;$('#autoBtn').onclick=cycleAuto;
// a clicked button keeps focus, and the next Space (fire) would click it again (pause, sound, ...): drop focus after every click
for(const b of document.querySelectorAll('#bar button'))b.addEventListener('click',()=>(b as HTMLElement).blur());
const scrub=$('#scrub');let drag=false;const sc=e=>{const r=scrub.getBoundingClientRect();seek(clamp((e.clientX-r.left)/r.width,0,1)*TOTAL)};
// pointercancel (iOS edge swipe, notification shade) must end the drag too, or the next touch anywhere scrubs the song
scrub.addEventListener('pointerdown',e=>{drag=true;try{scrub.setPointerCapture(e.pointerId)}catch{}sc(e)});addEventListener('pointermove',e=>{if(drag)sc(e)});const endDrag=()=>{drag=false};addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);
for(const e of ERAS){const m=document.createElement('div');m.className='mark';m.style.left=(e.start/TOTAL*100)+'%';m.innerHTML='<span>'+e.name.split(' · ')[1]+'</span>';scrub.appendChild(m)}

function onBeat(b,t,auto){const e=eraAt(t);if(!SONG.has&&!(e===4&&t>=bar(94.5)))drums(e,b);MUSIC.beat(b,t,e,!SONG.has);E1.onBeat(b,t);E5.onBeat(b,t,auto)} // E4.onBeat/on8th are empty stubs (era4.ts:71-72)
function on8th(n,t,auto){const e=eraAt(t);if(!SONG.has&&clickOn&&e>=1&&!(e===4&&t>=bar(94.5)))hat(e===2&&n%2===1);MUSIC.eighth(n,t,e,!SONG.has);E1.on8th(n,t,auto);E5.on8th(n,t,auto)}
// E5GL (PMREM bake, Reflector, 300+ meshes, a third WebGL context) is not needed until the bar-73.5 transition: build it in
// idle time during the bridge, and synchronously at bar 73 at the latest (or straight away when seeking past it).
let e5State=0;
function ensureGL(t){if(e5State===2)return;const go=()=>{if(e5State!==2){e5State=2;E5GL.init()}};if(t>=bar(73)){go();return}
 if(e5State===0&&t>=bar(66)){e5State=1;const ric=(window as any).requestIdleCallback;if(ric)ric(go,{timeout:BAR*3000});else setTimeout(go,300)}}

function glitch(t){if(t-lastBeatT<0.07&&hash(beatIdx)>0.5){for(let i=0;i<3;i++){const y=Math.floor(hash(beatIdx*7+i)*H),h=10+hash(beatIdx*13+i)*40,dx=(hash(beatIdx*17+i)-0.5)*40;ctx.drawImage(cv,0,y*dpr,W*dpr,h*dpr,dx,y,W,h)}}}
function edge(x){const g=ctx.createLinearGradient(x-30,0,x+6,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');ctx.fillStyle=g;ctx.fillRect(x-30,0,36,H)}

function render(t,auto){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);const e=eraAt(t),tr=transAt(t);
 if(e===0){if(E1GL.ok)E1GL.draw(lo1.x,t);else E1.draw(lo1.x,t);if(tr){E2.draw(lo2.x,t);blitCRT(lo2,t);const ex=W*smooth(tr.p);ctx.save();ctx.beginPath();ctx.rect(ex,0,W-ex,H);ctx.clip();blitCRT(lo1,t);ctx.restore();edge(ex)}else blitCRT(lo1,t)}
 else if(e===1){E2.draw(lo2.x,t);if(tr){drawE3(t);const p=smooth(tr.p);ctx.save();ctx.globalAlpha=1-p;const hy=H*0.5;ctx.translate(W/2,hy);ctx.scale(1+p*0.6,1-p*0.98);ctx.translate(-W/2,-hy);blitCRT(lo2,t);ctx.restore()}else blitCRT(lo2,t)}
 else if(e===2){if(tr){E4.draw(ctx,t);ctx.globalAlpha=Math.pow(1-tr.p,1.5);drawE3(t);ctx.globalAlpha=1;scan(0.07*(1-tr.p))}else{drawE3(t);scan(0.07)}}
 else if(e===3){E4.draw(ctx,t);if(tr){const p=smooth(tr.p);ctx.save();ctx.translate(W*(1-p),0);ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();drawE5(t);ctx.restore();edge(W*(1-p))}}
 else{drawE5(t);const q=clamp((t-ERAS[4].start)/(BAR*8),0,1);scan(0.1*q);if(t<bar(76))glitch(t)}}
function blitCRT(lo,t){if(CRT.ok){CRT.render(lo,t,1);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(CRT.canvas(),0,0,W,H);ctx.restore()}else{blit(lo);scan(lo===lo1?0.55:0.3)}}
function drawE3(t){if(E3GL.ok){E3GL.render(t);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(E3GL.canvas(),0,0,W,H);ctx.restore();E3.overlay(ctx,t)}else{ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font="10px 'Press Start 2P',monospace";ctx.fillText('WEBGL REQUIRED FOR THE RACER',W/2-150,H/2)}}
function drawE5(t){if(E5GL.ok){E5GL.render(t);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(E5GL.canvas(),0,0,W,H);ctx.restore();E5.overlay(ctx,t)}else E5.draw(ctx,t)}

const CARD={name:'IAN GINN',program:"FOR THE DEPUTY'S MAXIMALISTS",title:'NEXT LEVEL',thesis:['My AI journey, told through five generations of games.','The tools got better. So did I.'],credit:'Built with AI agents, asking to build with people.',invite:'Imagine what we could build together.'};
function cards(t){ctx.setTransform(dpr,0,0,dpr,0,0);
 if(t<bar(2)){const a=t<0.5?t/0.5:Math.min(1,(bar(2)-t)/0.7);ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#ffe81f';ctx.font="11px 'Press Start 2P',monospace";ctx.fillText(CARD.title,W/2,H*0.30);ctx.fillStyle='#fff';ctx.font="30px 'Press Start 2P',monospace";ctx.fillText(CARD.name,W/2,H*0.44);ctx.fillStyle='#5bff5b';ctx.font="11px 'Press Start 2P',monospace";ctx.fillText(CARD.program,W/2,H*0.53);ctx.fillStyle='#cfd3dc';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(CARD.thesis[0],W/2,H*0.66);ctx.fillText(CARD.thesis[1],W/2,H*0.71);ctx.fillStyle='#8a8aa0';ctx.font="8px 'Press Start 2P',monospace";if(Math.floor(t*2)%2===0)ctx.fillText('PRESS START  ·  OR JUST WATCH',W/2,H*0.84);ctx.textAlign='left';ctx.restore()}
 // end card: the era-5 renderer builds the 3D finale card (era5gl.ts voxel title + era5.ts type layer); this flat card is the no-WebGL fallback
 if(t>=bar(94.9)&&!E5GL.ok){const a=Math.min(1,(t-bar(94.9))/0.8);ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.fillStyle='#ffe81f';ctx.font="12px 'Press Start 2P',monospace";ctx.fillText(CARD.title,W/2,H*0.30);ctx.fillStyle='#fff';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(CARD.credit,W/2,H*0.40);ctx.fillStyle='#cfd3dc';ctx.fillText(CARD.name+"  ·  "+CARD.program,W/2,H*0.47);ctx.fillStyle='#fff';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(CARD.invite,W/2,H*0.60);ctx.textAlign='left';ctx.restore()}}
const CHAPTERS=['1 · FIRST PROMPTS','2 · LEARNING TO ASK','3 · AT MY DESK','4 · IN MY POCKET','5 · DIRECTING AGENTS'];
function chapters(t){if(MOBILE&&innerWidth<700)return;for(let i=0;i<ERAS.length;i++){const s=i===0?bar(2):ERAS[i].start;const q=(t-s)/2.6;if(q<0||q>1)continue;const a=q<0.15?q/0.15:q>0.8?(1-q)/0.2:1;ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.font="8px 'Press Start 2P',monospace";const txt=CHAPTERS[i];const tw=ctx.measureText(txt).width+22;ctx.fillStyle='rgba(6,8,20,.72)';ctx.fillRect(W/2-tw/2,8,tw,18);ctx.fillStyle='#5bff5b';ctx.fillRect(W/2-tw/2,8,tw,1);ctx.fillStyle='#e8e8f0';ctx.fillText(txt,W/2,21);ctx.restore()}}
function touchHints(t){if(!MOBILE)return;const fresh=performance.now()-lastTouch<1500;if(!(t<bar(2)||fresh))return;const a=t<bar(2)?0.55:0.35*Math.max(0,1-(performance.now()-lastTouch)/1500);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#5bff5b';ctx.setLineDash([6,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*0.28,0);ctx.lineTo(W*0.28,H);ctx.moveTo(W*0.72,0);ctx.lineTo(W*0.72,H);ctx.moveTo(W*0.28,H*0.5);ctx.lineTo(W*0.72,H*0.5);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#5bff5b';ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText('< HOLD',W*0.14,H*0.5);ctx.fillText('LEFT',W*0.14,H*0.5+16);ctx.fillText('HOLD >',W*0.86,H*0.5);ctx.fillText('RIGHT',W*0.86,H*0.5+16);ctx.font="8px 'Press Start 2P',monospace";ctx.fillText('TAP · JUMP',W*0.5,H*0.12);ctx.fillText('TAP · FIRE',W*0.5,H*0.94);ctx.textAlign='left';ctx.restore()}
let lyricShown='',lineIdx=-1,captions=true,stepping=false;
function toggleCaptions(){captions=!captions;lyricShown=''}
function dispatchLine(i,t){const words=LYRICS[i][1].split(' ');E1.onLine(words,t);E2.onLine(words,t);E3.onLine(words,t);E4.onLine(words,t);E5.onLine(words,t)}
// HUD text is rewritten only when it changes: assigning textContent every frame replaces the text node and costs a
// style/layout pass per element per frame on phones.
const HEL:any={},HTX:any={};function setTxt(id:string,s:string){if(HTX[id]===s)return;HTX[id]=s;(HEL[id]||(HEL[id]=$('#'+id))).textContent=s}
function hud(t,auto){const e=eraAt(t),tr=transAt(t);document.body.classList.toggle('e1',e===0);document.body.classList.toggle('e4',e===3);setTxt('era',tr?ERAS[tr.from].name+'  >  '+ERAS[tr.to].name:ERAS[e].name);
 setTxt('clock','BAR '+(Math.floor(t/BAR)+1)+' · '+(Math.floor((t%BAR)/BEAT)+1)+'  ·  '+BPM+' BPM'+(SONG.has?'  ·  SONG '+(SONG.offset>=0?'+':'')+SONG.offset.toFixed(2)+'s'+(SONG.taps.length?'  ·  TAP '+SONG.taps.length+'/'+LYRICS.length:''):''));
 let line='',idx=-1;for(let i=0;i<LYRICS.length;i++){const s=bar(LYRICS[i][0]);if(t<s)break;idx=i;const nx=LYRICS[i+1]?bar(LYRICS[i+1][0]):1e9;if(t-s<Math.min(nx-s,bar(1.9)))line=LYRICS[i][1];else line=''}
 // only consume the line index when the line is actually dispatched: a seek/scrub while paused used to mark the line as
 // seen, so pressing PLAY afterwards never handed it to the era (no words until the next line)
 if(idx!==lineIdx&&(playing||stepping)){lineIdx=idx;if(idx>=0)dispatchLine(idx,t)}
 // the 3D finale card ends on its own READY WHEN YOU ARE prompt: the sung caption hands over to it (never both on screen)
 if(E5GL.ok&&t>=bar(E5.K.CARD.capOff))line='';
 if(line!==lyricShown){lyricShown=line;const el=$('#lyric');el.style.opacity=line&&captions?1:0;if(line)el.textContent=line}
 setTxt('auto',SONG.has&&!playing&&!ended&&t<1?'PRESS PLAY TO START THE SONG':autoMode==='on'?'AUTOPILOT · watching':autoMode==='off'?'MANUAL · you are playing':auto?'AUTOPILOT · press any key to play':'MANUAL · autopilot resumes after 2s idle');
 setTxt('time',Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+' / 3:00');const pw=(t/TOTAL*100).toFixed(2)+'%';if(HTX.prog!==pw){HTX.prog=pw;(HEL.prog||(HEL.prog=$('#prog'))).style.width=pw}}

function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-lastNow)/1000);lastNow=now;const inp=readInput();const auto=isAuto(now);
 // the song can finish buffering after the clock has started; then move the audio to the game clock and start it,
 // otherwise songTime() reads 0 from a paused element and the "never go backwards" clamp freezes the game for good
 if(SONG.has&&!songArmed){songArmed=true;if(songT<1)setPlaying(false);else{songSeek(songT);if(playing)setPlaying(true)}}
 ensureGL(songT);
 if(playing){const prev=songT;songT=SONG.has?(SONG.el.ended?TOTAL:songTime()):Math.min(TOTAL,songT+dt);if(SONG.has&&songT<prev)songT=prev;const pb=Math.floor(prev/BEAT),cb=Math.floor(songT/BEAT);if(cb!==pb){beatIdx=cb;lastBeatT=songT;onBeat(cb,songT,auto)}
  const p8=Math.floor(prev/(BEAT/2)),c8=Math.floor(songT/(BEAT/2));if(c8!==p8)on8th(c8,songT,auto);
  if(songT>=TOTAL){playing=false;ended=true;$('#play').textContent='REPLAY'}
  E1.update(dt,songT,inp,auto);E2.update(dt,songT,inp,auto);E3.update(dt,songT,inp,auto);E4.update(dt,songT,inp,auto);E5.update(dt,songT,inp,auto)}
 render(songT,auto);cards(songT);chapters(songT);touchHints(songT);hud(songT,auto);clearEdges()}
Object.assign(HK,{togglePlay,toggleClick,cycleAuto,toggleCaptions,seek,nudge,tap,clearTaps,saveTiming,now:()=>songT,toggleQuality:()=>setQuality(QUALITY==='low'?'high':'low')});loadSong();E3GL.init();E1GL.init();CRT.init(); // E5GL.init is deferred: see ensureGL
// step(secs, auto=true): `secs` is split into equal sub-steps of at most ~1/60 s that sum to exactly `secs` (the old
// `i<secs*60` loop overshot by up to a frame for e.g. 1/24 or 0.02 s steps, so record.mjs at 24/25 fps drifted).
// auto=false steps with the live keyboard/touch state (ETM.input()) instead of autopilot, for manual-play cases.
const NOINP={left:false,right:false,up:false,down:false,fire:false,fireHeld:false,jump:false,upEdge:false,mv:{x:0,y:0}};
(window as any).ETM={seek(t){etmUsed=true;seek(t)},step(secs,auto=true){etmUsed=true;stepping=true;try{const n=secs>0?Math.max(1,Math.round(secs*60)):0,dt=n?secs/n:0;for(let i=0;i<n;i++){const inp=auto?NOINP:readInput();const prev=songT;songT=Math.min(TOTAL,songT+dt);ensureGL(songT);const pb=Math.floor(prev/BEAT),cb=Math.floor(songT/BEAT);if(cb!==pb){beatIdx=cb;lastBeatT=songT;onBeat(cb,songT,auto)}const p8=Math.floor(prev/(BEAT/2)),c8=Math.floor(songT/(BEAT/2));if(c8!==p8)on8th(c8,songT,auto);hud(songT,auto);E1.update(dt,songT,inp,auto);E2.update(dt,songT,inp,auto);E3.update(dt,songT,inp,auto);E4.update(dt,songT,inp,auto);E5.update(dt,songT,inp,auto);if(!auto)clearEdges()}render(songT,auto);hud(songT,auto)}finally{stepping=false}},
 render(){render(songT,true);cards(songT)},input:()=>readInput(),now:()=>songT,lyrics:LYRICS,raw:{e1:()=>(E1 as any).S,e2:()=>(E2 as any).S,e3:()=>E3.S,e4:()=>E4.S,e5:()=>E5.S},errs:[] as any[],setAuto(m:string){autoMode=m;$('#autoBtn').textContent=AUTO_LABEL[autoMode]},setPlaying,
 probe(){const sum=(S:any)=>{if(!S||typeof S!=='object')return null;const o:any={},bad:string[]=[];const walk=(v:any,path:string,depth:number)=>{if(typeof v==='number'){if(!isFinite(v))bad.push(path)}else if(v&&typeof v==='object'&&depth<4){if(Array.isArray(v)){if(v.length<=64)v.forEach((x,i)=>walk(x,path+'['+i+']',depth+1))}else for(const k in v){if(k.startsWith('_')||k==='g'||k==='mesh'||k==='map')continue;walk(v[k],path+'.'+k,depth+1)}}};walk(S,'',0);for(const k in S){const v=S[k];if(typeof v==='number'||typeof v==='boolean'||typeof v==='string')o[k]=v;else if(Array.isArray(v))o[k+'#']=v.length;else if(v&&typeof v==='object'){const q:any={};for(const kk in v){const vv=v[kk];if(typeof vv==='number'||typeof vv==='boolean'||typeof vv==='string')q[kk]=vv}o[k]=q}}return{bad,...o}};
  return{t:songT,bar:songT/BAR,era:eraAt(songT),playing,ended,lyricIdx:lineIdx,caption:lyricShown,quality:QUALITY,mobile:MOBILE,gl:{e5:E5GL.ok,e3:E3GL.ok},e1:sum((E1 as any).S),e2:sum((E2 as any).S),e3:sum(E3.S),e4:sum(E4.S),e5:sum(E5.S)}}};
addEventListener('error',e=>(window as any).ETM.errs.push(String(e.message||e)));addEventListener('unhandledrejection',e=>(window as any).ETM.errs.push('rejection: '+String((e as any).reason)));
// E1-3: hold the clock until 'Press Start 2P' has loaded (3 s cap), or era 1/3/5 rasterise and cache fallback-font words.
// The stylesheet link is script-blocking, so the @font-face rule exists by now and fonts.load really waits for the file.
// A ?t= deep link is re-seeked once the font is in, unless the user or the harness has already moved the clock.
{const q=parseFloat(new URLSearchParams(location.search).get('t')||'0'),t0=isFinite(q)?q:0;seek(t0);
 const fonts=(document as any).fonts;const ready:Promise<any>=fonts&&fonts.load?Promise.race([fonts.load("16px 'Press Start 2P'"),new Promise(r=>setTimeout(r,3000))]).catch(()=>{}):Promise.resolve();
 ready.then(()=>{if(t0>0&&seeks===1&&!etmUsed)seek(t0);lastNow=performance.now();requestAnimationFrame(frame)})}
