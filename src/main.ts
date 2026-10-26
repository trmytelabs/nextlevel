import {$,clamp,lerp,smooth,rngf,hash,BPM,BEAT,BAR,TOTAL,bar,W,H,ERAS,eraAt,transAt,LYRICS,cv,dpr,ctx,lo1,lo2,lo3,scan,blit,readInput,clickOn,setClickOn,ensureAC,hat,drums,lastInputReal,clearEdges,HK,MOBILE,QUALITY,setQuality,lastTouch,ptr,padsShown,cb} from './core';
import {E1} from './era1';
import {E2} from './era2';
import {E3} from './era3';
import {E4} from './era4';
import {E5} from './era5';
import {E5GL} from './era5gl';
import {E3GL} from './era3gl';
import {E1GL} from './era1gl';
import {CRT} from './crt';
import {NOTES} from './patchnotes';
import {EGG,eggReset,eggToast,eggEndLine,eggCount} from './eggs';
import {START} from './startgl';
import {MUSIC} from './music';
import {SONG,loadSong,songTime,songSeek,songPlay,songPause,songMute,nudge,tap,clearTaps,saveTiming} from './song';

// ---------- transport, compositing, HUD ----------
let songT=0,playing=true,startUp=false,idleT=0,sway0=0,soundChosen=false,lastNow=performance.now(),ended=false,lastBeatT=-1,beatIdx=0,songArmed=false,seeks=0,etmUsed=false;
// lastBeatT/beatIdx are reset so the era-5 glitch (keyed off the last beat) does not depend on where we seeked from
function seek(t){if(t<0.5)eggReset();hideStart();seeks++;lineIdx=-1;songT=clamp(t,0,TOTAL);lastBeatT=-1;beatIdx=Math.floor(songT/BEAT);ensureGL(songT);E1.init(songT);E2.init(songT);E3.init(songT);E4.init(songT);E5.init(songT);ended=false;songSeek(songT)}
function setPlaying(v){playing=v;$('#play').textContent=playing?'PAUSE':'PLAY';if(playing)songPlay().then(ok=>{if(!ok)setPlaying(false)});else songPause()}
function togglePlay(){if(startUp){startGame();return}if(ended){seek(0);setPlaying(true)}else setPlaying(!playing)}
function toggleClick(){soundChosen=true;ensureAC();setClickOn(!clickOn);$('#click').textContent='SOUND: '+(clickOn?'ON':'OFF');$('#click').classList.toggle('on',clickOn)}
// phones get short labels: the side pads leave the control bar about 500 px wide
const AUTO_MODES=['idle','on','off'],AUTO_LABEL:any=MOBILE?{idle:'AUTO: IDLE',on:'AUTO: ON',off:'AUTO: OFF'}:{idle:'AUTOPILOT: WHEN IDLE',on:'AUTOPILOT: ON',off:'AUTOPILOT: OFF'};let autoMode='idle';if(MOBILE)$('#autoBtn').textContent=AUTO_LABEL.idle;if(MOBILE)$('#auto').textContent='AUTOPILOT · touch a pad to play';
function cycleAuto(){autoMode=AUTO_MODES[(AUTO_MODES.indexOf(autoMode)+1)%3];$('#autoBtn').textContent=AUTO_LABEL[autoMode];$('#autoBtn').classList.toggle('on',autoMode==='on')}
function isAuto(now){const last=eraAt(songT)===4?Math.max(lastInputReal,ptr.t):lastInputReal;return autoMode==='on'?true:autoMode==='off'?false:now-last>2000}
$('#qBtn').textContent='FX: '+QUALITY.toUpperCase();$('#qBtn').onclick=()=>setQuality(QUALITY==='low'?'high':'low');$('#rotate').onclick=()=>document.body.classList.add('pok');
// PATCH NOTES panel (end card and start screen): what was built and how. Keys are swallowed while it is open.
{const esc=(x:string)=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;');const nb=$('#notesBody'),np=$('#notes');
 nb.innerHTML='<div class="sub">'+esc(NOTES.sub)+'</div>'+NOTES.secs.map(s=>'<h3>'+esc(s.h)+'</h3><ul>'+s.items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>').join('');
 const close=()=>{np.hidden=true;$('#notesBtn').focus()};
 $('#notesBtn').onclick=()=>{np.hidden=false;nb.scrollTop=0;if(playing&&!ended)setPlaying(false);$('#notesX').focus()};$('#notesX').onclick=close;np.onclick=e=>{if(e.target===np)close()};
 addEventListener('keydown',e=>{if(np.hidden)return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close()}},true);
 (window as any).__notes={open:()=>$('#notesBtn').click(),close,count:()=>NOTES.secs.length}}
$('#play').onclick=togglePlay;$('#restart').onclick=()=>{seek(0);showStart()};$('#click').onclick=toggleClick;$('#autoBtn').onclick=cycleAuto;
// a clicked button keeps focus, and the next Space (fire) would click it again (pause, sound, ...): drop focus after every click
for(const b of document.querySelectorAll('#bar button'))b.addEventListener('click',()=>(b as HTMLElement).blur());
// ---------- start screen ----------
// Up on load (unless ?t= or ?autostart=1) and after RESTART: the clock is held at 0 and the title screen (startgl.ts) is
// drawn instead of the game. The first click, tap or key starts the song from 0 AND switches the sound on, inside that
// user gesture (ensureAC), so phones get audio. Scrubbing or any ETM seek/step/setPlaying/setAuto (harness, recorder)
// just dismisses it, paused, without starting audio.
function showStart(){startUp=true;idleT=0;soundChosen=false;playing=false;songPause();$('#play').textContent='PLAY';document.body.classList.add('start')}
function hideStart(){if(!startUp)return;startUp=false;document.body.classList.remove('start')}
// demo: nobody pressed start for ATTRACT_IDLE s, so the video plays itself on autopilot, muted (browsers allow muted playback
// only). The first key or tap restarts it from the top with sound, under the player's control; the demo loops via the title.
const ATTRACT_IDLE=12;let attract=false;
function startAttract(){attract=true;songMute(true);hideStart();seek(0);setPlaying(true);document.body.classList.add('attract')}
function endAttract(play:boolean){attract=false;songMute(false);document.body.classList.remove('attract');if(play){ensureAC();if(!clickOn)toggleClick();seek(0);setPlaying(true)}else showStart()}
for(const ev of ['keydown','pointerdown'])addEventListener(ev,(e:any)=>{if(!attract)return;if(ev==='keydown'&&ignoreKey(e.key))return;endAttract(true);e.stopImmediatePropagation()},true);
// Phones grant audio permission on the finger's lift (pointerup / touchend), not on the touch that starts the game: if the
// game is running but the song is not, start it (in sync) on the next lift or click.
const kickSong=()=>{if(playing&&!ended&&!startUp&&SONG.el&&SONG.el.paused){if(SONG.has)songSeek(songT);songPlay()}};
for(const ev of ['pointerup','touchend','click'])addEventListener(ev,kickSong,true);
function startGame(){if(!startUp)return;ensureAC();if(!clickOn&&!soundChosen)toggleClick();sway0=START.swayAt(idleT);hideStart();if(songT>0.01)seek(0);setPlaying(true)}
const ignoreKey=(k:string)=>/^(Shift|Control|Alt|Meta|Tab|CapsLock|F\d+|Unidentified|Dead|AudioVolume.*|Media.*)$/.test(k);
addEventListener('keydown',e=>{if(!startUp||e.repeat||ignoreKey(e.key))return;startGame();if(!/^[1-5]$/.test(e.key)){e.stopImmediatePropagation();if(e.key===' '||e.key.startsWith('Arrow'))e.preventDefault()}},true);
addEventListener('pointerdown',e=>{if(!startUp)return;const el=e.target as HTMLElement;if(el&&el.closest&&(el.closest('#rotate')||el.closest('#bar')||el.closest('#endbtns')||el.closest('#notes')))return;startGame();e.stopPropagation()},true);
const scrub=$('#scrub');let drag=false;const sc=e=>{const r=scrub.getBoundingClientRect();seek(clamp((e.clientX-r.left)/r.width,0,1)*TOTAL)};
// pointercancel (iOS edge swipe, notification shade) must end the drag too, or the next touch anywhere scrubs the song
scrub.addEventListener('pointerdown',e=>{drag=true;try{scrub.setPointerCapture(e.pointerId)}catch{}sc(e)});addEventListener('pointermove',e=>{if(drag)sc(e)});const endDrag=()=>{drag=false};addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);
for(const e of ERAS){const m=document.createElement('div');m.className='mark';m.style.left=(e.start/TOTAL*100)+'%';m.innerHTML='<span>'+e.name.split(' · ')[1]+'</span>';scrub.appendChild(m)}

function onBeat(b,t,auto){const e=eraAt(t);if(!SONG.has&&!(e===4&&t>=cb(94.5)))drums(e,b);MUSIC.beat(b,t,e,!SONG.has);E1.onBeat(b,t);E5.onBeat(b,t,auto)} // E4.onBeat/on8th are empty stubs (era4.ts:71-72)
function on8th(n,t,auto){const e=eraAt(t);if(!SONG.has&&clickOn&&e>=1&&!(e===4&&t>=cb(94.5)))hat(e===2&&n%2===1);MUSIC.eighth(n,t,e,!SONG.has);E1.on8th(n,t,auto);E5.on8th(n,t,auto)}
// E5GL (PMREM bake, Reflector, 300+ meshes, a third WebGL context) is not needed until the bar-73.5 transition: build it in
// idle time during the bridge, and synchronously at bar 73 at the latest (or straight away when seeking past it).
let e5State=0;
function ensureGL(t){if(e5State===2)return;const go=()=>{if(e5State!==2){e5State=2;E5GL.init()}};if(t>=cb(73)){go();return}
 if(e5State===0&&t>=cb(66)){e5State=1;const ric=(window as any).requestIdleCallback;if(ric)ric(go,{timeout:BAR*3000});else setTimeout(go,300)}}

function glitch(t){if(t-lastBeatT<0.07&&hash(beatIdx)>0.5){for(let i=0;i<3;i++){const y=Math.floor(hash(beatIdx*7+i)*H),h=10+hash(beatIdx*13+i)*40,dx=(hash(beatIdx*17+i)-0.5)*40;ctx.drawImage(cv,0,y*dpr,W*dpr,h*dpr,dx,y,W,h)}}}
function edge(x){const g=ctx.createLinearGradient(x-30,0,x+6,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');ctx.fillStyle=g;ctx.fillRect(x-30,0,36,H)}

function render(t,auto){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);const e=eraAt(t),tr=transAt(t);
 // transitions (the last TRANS before each stage), one per hand-off:
 // arcade -> 32-bit: a resolution upgrade (the arcade breaks into chunky pixels, the 32-bit world sharpens out of them)
 if(e===0){if(E1GL.ok)E1GL.draw(lo1.x,t);else E1.draw(lo1.x,t);if(tr){const p=tr.p;if(p<0.5)blitCRT(lo1,t);else{E2.draw(lo2.x,t);blitCRT(lo2,t)}
   const steps=[1,2,3,4,6,8,12,16,24],q=p<0.5?smooth(p/0.5):1-smooth((p-0.5)/0.5);pixelate(steps[Math.round(q*(steps.length-1))]);if(Math.abs(p-0.5)<0.06){ctx.fillStyle=`rgba(255,255,255,${0.5*(1-Math.abs(p-0.5)/0.06)})`;ctx.fillRect(0,0,W,H)}}else blitCRT(lo1,t)}
 // 32-bit -> 3D: the CRT powers off to a line, and the 3D race boots up out of the dark with a camera fly-in
 else if(e===1){E2.draw(lo2.x,t);if(tr){const z=smooth(clamp((tr.p-0.3)/0.7,0,1));ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);if(z>0){ctx.save();ctx.globalAlpha=Math.min(1,z*2);ctx.translate(W/2,H/2);ctx.scale(0.25+0.75*z,0.25+0.75*z);ctx.rotate((1-z)*0.35);ctx.translate(-W/2,-H/2);drawE3(t);ctx.restore()}
   const p=smooth(clamp(tr.p/0.55,0,1));if(p<1){ctx.save();const hy=H*0.5;ctx.translate(W/2,hy);ctx.scale(1+p*0.4,Math.max(0.004,1-p));ctx.translate(-W/2,-hy);blitCRT(lo2,t);ctx.restore();ctx.fillStyle=`rgba(255,255,255,${0.9*p})`;ctx.fillRect(0,hy-1,W*(1-p*0.7)+0,2)}}else blitCRT(lo2,t)}
 // 3D -> mobile: the race shrinks into the phone's screen: it was a game on the phone all along
 else if(e===2){if(tr){E4.draw(ctx,t);const p=smooth(tr.p),R=E4.screenRect(t),r={x:lerp(0,R.x,p),y:lerp(0,R.y,p),w:lerp(W,R.w,p),h:lerp(H,R.h,p)};
   ctx.save();ctx.globalAlpha=tr.p<0.72?1:Math.max(0,1-(tr.p-0.72)/0.28);ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,18*p);ctx.clip();const sc=Math.max(r.w/W,r.h/H);ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.scale(sc,sc);ctx.translate(-W/2,-H/2);drawE3(t);ctx.restore()}else{drawE3(t);scan(0.07)}}
 // mobile -> VR: the VR world opens out of the phone's screen while the agents fly out over everything
 else if(e===3){E4.draw(ctx,t);if(tr){const p=smooth(tr.p),R=E4.screenRect(t),r={x:lerp(R.x,-8,p),y:lerp(R.y,-8,p),w:lerp(R.w,W+16,p),h:lerp(R.h,H+16,p)};
   ctx.save();ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,18*(1-p));ctx.clip();drawE5(t);ctx.restore();ctx.save();ctx.strokeStyle=`rgba(91,255,91,${0.9*(1-p)})`;ctx.lineWidth=3;ctx.shadowColor='#5bff5b';ctx.shadowBlur=18;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,18*(1-p));ctx.stroke();ctx.restore()}
   E4.drawAgents(ctx,t)}
 else{drawE5(t);const q=clamp((t-ERAS[4].start)/(BAR*8),0,1);scan(0.1*q)}}
// chunky-pixel effect over the whole frame (k = pixel size in canvas px)
const PXC=document.createElement('canvas'),PXX=PXC.getContext('2d')!;
function pixelate(k:number){if(k<=1)return;const tw=Math.max(1,Math.round(W/k)),th=Math.max(1,Math.round(H/k));if(PXC.width!==tw||PXC.height!==th){PXC.width=tw;PXC.height=th}PXX.imageSmoothingEnabled=true;PXX.drawImage(cv,0,0,cv.width,cv.height,0,0,tw,th);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(PXC,0,0,tw,th,0,0,W,H);ctx.restore()}
function blitCRT(lo,t){if(CRT.ok){CRT.render(lo,t,1);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(CRT.canvas(),0,0,W,H);ctx.restore()}else{blit(lo);scan(lo===lo1?0.55:0.3)}}
function drawE3(t){if(E3GL.ok){E3GL.render(t);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(E3GL.canvas(),0,0,W,H);ctx.restore();E3.overlay(ctx,t)}else{ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font="10px 'Press Start 2P',monospace";ctx.fillText('WEBGL REQUIRED FOR THE RACER',W/2-150,H/2)}}
function drawE5(t){if(E5GL.ok){E5GL.render(t);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(E5GL.canvas(),0,0,W,H);ctx.restore();E5.overlay(ctx,t)}else E5.draw(ctx,t)}

const CARD={name:'IAN GINN',program:"FOR THE DEPUTY'S MAXIMALISTS",title:'NEXT LEVEL',thesis:['I leveled up the way gaming did.','Just a lot faster.'],credit:'Built with AI agents, asking to build with people.',invite:'Imagine what we could build together.'};
function cards(t){ctx.setTransform(dpr,0,0,dpr,0,0);
 if(startUp){START.drawStart(ctx,idleT);return}
 if(t<START.FL_END){START.drawFlourish(ctx,t,sway0);return}
 // (the old flat 2D title card is gone: startgl.ts draws the title screen and the flourish, with its own 2D fallback)
 // end card: the era-5 renderer builds the 3D finale card (era5gl.ts voxel title + era5.ts type layer); this flat card is the no-WebGL fallback
 if(t>=cb(94.9)&&!E5GL.ok){const a=Math.min(1,(t-cb(94.9))/0.8);ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.fillStyle='#ffe81f';ctx.font="12px 'Press Start 2P',monospace";ctx.fillText(CARD.title,W/2,H*0.30);ctx.fillStyle='#fff';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(CARD.credit,W/2,H*0.40);ctx.fillStyle='#cfd3dc';ctx.fillText(CARD.name+"  ·  "+CARD.program,W/2,H*0.47);ctx.fillStyle='#fff';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(CARD.invite,W/2,H*0.60);ctx.textAlign='left';ctx.restore()}}
const CHAPTERS=['1 · FIRST PROMPTS','2 · LEARNING TO ASK','3 · DIRECTING AGENTS','4 · WORKING FROM ANYWHERE','5 · FULL DEVELOPMENT'];
function chapters(t){if(MOBILE&&innerWidth<700)return;for(let i=0;i<ERAS.length;i++){const s=i===0?cb(2):ERAS[i].start;const q=(t-s)/2.6;if(q<0||q>1)continue;const a=q<0.15?q/0.15:q>0.8?(1-q)/0.2:1;ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.font="8px 'Press Start 2P',monospace";const txt=CHAPTERS[i];const tw=ctx.measureText(txt).width+22;ctx.fillStyle='rgba(6,8,20,.72)';ctx.fillRect(W/2-tw/2,8,tw,18);ctx.fillStyle='#5bff5b';ctx.fillRect(W/2-tw/2,8,tw,1);ctx.fillStyle='#e8e8f0';ctx.fillText(txt,W/2,21);ctx.restore()}}
function touchHints(t){if(!MOBILE||startUp||padsShown())return;const fresh=performance.now()-lastTouch<1500;if(!(t<cb(2)||fresh))return;const a=t<cb(2)?0.55:0.35*Math.max(0,1-(performance.now()-lastTouch)/1500);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#5bff5b';ctx.setLineDash([6,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*0.28,0);ctx.lineTo(W*0.28,H);ctx.moveTo(W*0.72,0);ctx.lineTo(W*0.72,H);ctx.moveTo(W*0.28,H*0.5);ctx.lineTo(W*0.72,H*0.5);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#5bff5b';ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText('< HOLD',W*0.14,H*0.5);ctx.fillText('LEFT',W*0.14,H*0.5+16);ctx.fillText('HOLD >',W*0.86,H*0.5);ctx.fillText('RIGHT',W*0.86,H*0.5+16);ctx.font="8px 'Press Start 2P',monospace";ctx.fillText('TAP · JUMP',W*0.5,H*0.12);ctx.fillText('TAP · FIRE',W*0.5,H*0.94);ctx.textAlign='left';ctx.restore()}
let lyricShown='',lineIdx=-1,captions=true,stepping=false;
function toggleCaptions(){captions=!captions;lyricShown=''}
function dispatchLine(i,t){const words=LYRICS[i][1].split(' ');E1.onLine(words,t);E2.onLine(words,t);E3.onLine(words,t);E4.onLine(words,t);E5.onLine(words,t)}
// HUD text is rewritten only when it changes: assigning textContent every frame replaces the text node and costs a
// style/layout pass per element per frame on phones.
const HEL:any={},HTX:any={};function setTxt(id:string,s:string){if(HTX[id]===s)return;HTX[id]=s;(HEL[id]||(HEL[id]=$('#'+id))).textContent=s}
// side-pad labels follow the stage (see #pads in index.html and the pad code in core.ts)
const PADL=['< MOVE >','< MOVE >\nPUSH UP · JUMP','< STEER >','TAP · FLAP','DRAG HERE\nTO AIM\nTHE SABER'],PADA=['FIRE','JUMP','','FLAP',''],PADR=['HOLD · RAPID FIRE','HOLD · JUMP HIGHER','','TAP · FLAP','DRAG HERE\nTO AIM\nTHE SABER'];let padE=-1;
function padLabels(e){if(e===padE||!MOBILE)return;padE=e;$('#padLl').textContent=PADL[e];$('#padA').textContent=PADA[e];$('#padRl').textContent=PADR[e];document.body.classList.toggle('noA',e===2);document.body.classList.toggle('aim',e===4)}
function hud(t,auto){const e=eraAt(t),tr=transAt(t);padLabels(e);
 // secrets: a short toast when one is found, and a line on the end card
 {const on=performance.now()-EGG.lastT<2600;if(on)setTxt('eggT',eggToast());(HEL.eggT||(HEL.eggT=$('#eggT'))).classList.toggle('on',on);setTxt('eggEnd',eggEndLine());document.body.classList.toggle('egg5',eggCount()===5)}
document.body.classList.toggle('e1',e===0);document.body.classList.toggle('e4',e===3);document.body.classList.toggle('endcard',t>=cb(94.9));document.body.classList.toggle('capoff',t>=cb(E5.K.CARD.capOff));setTxt('era',tr?ERAS[tr.from].name+'  >  '+ERAS[tr.to].name:ERAS[e].name);
 setTxt('clock','BAR '+(Math.floor(t/BAR)+1)+' · '+(Math.floor((t%BAR)/BEAT)+1)+'  ·  '+BPM+' BPM'+(SONG.has?'  ·  SONG '+(SONG.offset>=0?'+':'')+SONG.offset.toFixed(2)+'s'+(SONG.taps.length?'  ·  TAP '+SONG.taps.length+'/'+LYRICS.length:''):''));
 let line='',idx=-1;for(let i=0;i<LYRICS.length;i++){const s=bar(LYRICS[i][0]);if(t<s)break;idx=i;const nx=LYRICS[i+1]?bar(LYRICS[i+1][0]):1e9;if(t-s<Math.min(nx-s,bar(1.9)))line=LYRICS[i][1];else line=''}
 // only consume the line index when the line is actually dispatched: a seek/scrub while paused used to mark the line as
 // seen, so pressing PLAY afterwards never handed it to the era (no words until the next line)
 if(idx!==lineIdx&&(playing||stepping)){lineIdx=idx;if(idx>=0)dispatchLine(idx,t)}
 // the 3D finale card ends on its own READY WHEN YOU ARE prompt: the sung caption hands over to it (never both on screen)
 if(E5GL.ok&&t>=cb(E5.K.CARD.capOff))line='';
 if(line!==lyricShown){lyricShown=line;const el=$('#lyric');el.style.opacity=line&&captions?1:0;if(line)el.textContent=line}
 setTxt('auto',SONG.has&&!playing&&!ended&&t<1?'PRESS PLAY TO START THE SONG':autoMode==='on'?'AUTOPILOT · watching':autoMode==='off'?'MANUAL · you are playing':auto?(MOBILE?'AUTOPILOT · touch a pad to play':'AUTOPILOT · press any key to play'):'MANUAL · autopilot resumes after 2s idle');
 setTxt('time',Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+' / '+Math.floor(TOTAL/60)+':'+String(Math.floor(TOTAL%60)).padStart(2,'0'));const pw=(t/TOTAL*100).toFixed(2)+'%';if(HTX.prog!==pw){HTX.prog=pw;(HEL.prog||(HEL.prog=$('#prog'))).style.width=pw}}

function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-lastNow)/1000);lastNow=now;const inp=readInput();const auto=isAuto(now);
 // the song can finish buffering after the clock has started; then move the audio to the game clock and start it,
 // otherwise songTime() reads 0 from a paused element and the "never go backwards" clamp freezes the game for good
 if(SONG.has&&!songArmed){songArmed=true;songSeek(songT);if(playing)setPlaying(true)}
 if(attract&&ended)endAttract(false);
 if(startUp){if(!etmUsed){idleT+=dt;if(idleT>ATTRACT_IDLE&&!document.hidden){startAttract();return}}cards(songT);hud(songT,auto);clearEdges();return}
 ensureGL(songT);
 if(playing){const prev=songT;songT=SONG.has&&(SONG.el.ended||!SONG.el.paused)?(SONG.el.ended?TOTAL:songTime()):Math.min(TOTAL,songT+dt);if(SONG.has&&songT<prev)songT=prev;const pb=Math.floor(prev/BEAT),cb=Math.floor(songT/BEAT);if(cb!==pb){beatIdx=cb;lastBeatT=songT;onBeat(cb,songT,auto)}
  const p8=Math.floor(prev/(BEAT/2)),c8=Math.floor(songT/(BEAT/2));if(c8!==p8)on8th(c8,songT,auto);
  if(songT>=TOTAL){playing=false;ended=true;$('#play').textContent='REPLAY'}
  E1.update(dt,songT,inp,auto);E2.update(dt,songT,inp,auto);E3.update(dt,songT,inp,auto);E4.update(dt,songT,inp,auto);E5.update(dt,songT,inp,auto)}
 render(songT,auto);cards(songT);chapters(songT);touchHints(songT);hud(songT,auto);clearEdges()}
Object.assign(HK,{togglePlay,toggleClick,cycleAuto,toggleCaptions,seek,nudge,tap,clearTaps,saveTiming,now:()=>songT,toggleQuality:()=>setQuality(QUALITY==='low'?'high':'low')});loadSong();E3GL.init();E1GL.init();CRT.init(); // E5GL.init is deferred: see ensureGL
// step(secs, auto=true): `secs` is split into equal sub-steps of at most ~1/60 s that sum to exactly `secs` (the old
// `i<secs*60` loop overshot by up to a frame for e.g. 1/24 or 0.02 s steps, so record.mjs at 24/25 fps drifted).
// auto=false steps with the live keyboard/touch state (ETM.input()) instead of autopilot, for manual-play cases.
const NOINP={left:false,right:false,up:false,down:false,fire:false,fireHeld:false,jump:false,upEdge:false,mv:{x:0,y:0}};
(window as any).ETM={seek(t){etmUsed=true;seek(t)},step(secs,auto=true){etmUsed=true;hideStart();stepping=true;try{const n=secs>0?Math.max(1,Math.round(secs*60)):0,dt=n?secs/n:0;for(let i=0;i<n;i++){const inp=auto?NOINP:readInput();const prev=songT;songT=Math.min(TOTAL,songT+dt);ensureGL(songT);const pb=Math.floor(prev/BEAT),cb=Math.floor(songT/BEAT);if(cb!==pb){beatIdx=cb;lastBeatT=songT;onBeat(cb,songT,auto)}const p8=Math.floor(prev/(BEAT/2)),c8=Math.floor(songT/(BEAT/2));if(c8!==p8)on8th(c8,songT,auto);hud(songT,auto);E1.update(dt,songT,inp,auto);E2.update(dt,songT,inp,auto);E3.update(dt,songT,inp,auto);E4.update(dt,songT,inp,auto);E5.update(dt,songT,inp,auto);if(!auto)clearEdges()}render(songT,auto);hud(songT,auto)}finally{stepping=false}},
 render(){if(!startUp)render(songT,true);cards(songT)},showStart(){etmUsed=true;seek(0);showStart()},idle(dt:number){etmUsed=true;idleT+=dt},start:()=>startGame(),input:()=>readInput(),now:()=>songT,lyrics:LYRICS,eggs:EGG,ptr,raw:{e1:()=>(E1 as any).S,e2:()=>(E2 as any).S,e3:()=>E3.S,e4:()=>E4.S,e5:()=>E5.S},errs:[] as any[],setAuto(m:string){etmUsed=true;hideStart();autoMode=m;$('#autoBtn').textContent=AUTO_LABEL[autoMode]},setPlaying(v:boolean){etmUsed=true;hideStart();setPlaying(v)},
 probe(){const sum=(S:any)=>{if(!S||typeof S!=='object')return null;const o:any={},bad:string[]=[];const walk=(v:any,path:string,depth:number)=>{if(typeof v==='number'){if(!isFinite(v))bad.push(path)}else if(v&&typeof v==='object'&&depth<4){if(Array.isArray(v)){if(v.length<=64)v.forEach((x,i)=>walk(x,path+'['+i+']',depth+1))}else for(const k in v){if(k.startsWith('_')||k==='g'||k==='mesh'||k==='map')continue;walk(v[k],path+'.'+k,depth+1)}}};walk(S,'',0);for(const k in S){const v=S[k];if(typeof v==='number'||typeof v==='boolean'||typeof v==='string')o[k]=v;else if(Array.isArray(v))o[k+'#']=v.length;else if(v&&typeof v==='object'){const q:any={};for(const kk in v){const vv=v[kk];if(typeof vv==='number'||typeof vv==='boolean'||typeof vv==='string')q[kk]=vv}o[k]=q}}return{bad,...o}};
  return{t:songT,bar:songT/BAR,era:eraAt(songT),playing,ended,start:startUp,sound:clickOn,lyricIdx:lineIdx,caption:lyricShown,quality:QUALITY,mobile:MOBILE,gl:{e5:E5GL.ok,e3:E3GL.ok},e1:sum((E1 as any).S),e2:sum((E2 as any).S),e3:sum(E3.S),e4:sum(E4.S),e5:sum(E5.S)}}};
addEventListener('error',e=>(window as any).ETM.errs.push(String(e.message||e)));addEventListener('unhandledrejection',e=>(window as any).ETM.errs.push('rejection: '+String((e as any).reason)));
// E1-3: hold the clock until 'Press Start 2P' has loaded (3 s cap), or era 1/3/5 rasterise and cache fallback-font words.
// The stylesheet link is script-blocking, so the @font-face rule exists by now and fonts.load really waits for the file.
// A ?t= deep link is re-seeked once the font is in, unless the user or the harness has already moved the clock.
{const qs=new URLSearchParams(location.search),q=parseFloat(qs.get('t')||'0'),t0=isFinite(q)?q:0;seek(t0);
 if(!qs.has('t')&&qs.get('autostart')!=='1')showStart(); // deep links and ?autostart=1 skip the title screen
 const fonts=(document as any).fonts;const ready:Promise<any>=fonts&&fonts.load?Promise.race([fonts.load("16px 'Press Start 2P'"),new Promise(r=>setTimeout(r,3000))]).catch(()=>{}):Promise.resolve();
 ready.then(()=>{if(t0>0&&seeks===1&&!etmUsed)seek(t0);lastNow=performance.now();requestAnimationFrame(frame)})}
