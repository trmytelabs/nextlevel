// ---------- core: constants, utils, canvas, input, audio ----------
// Hotkey handlers are filled in by main.ts (togglePlay, toggleClick, cycleAuto, toggleCaptions, seek).
export const HK:any={};
// ---------- core constants ----------
export const $=(s:string):any=>document.querySelector(s);
export const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function rngf(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const hash=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export const BPM=128,BEAT=60/BPM,BAR=BEAT*4,TOTAL=96*BAR;
export const bar=n=>n*BAR;
export const W=960,H=540;
// ---------- device + quality tier ----------
export const MOBILE=matchMedia('(pointer: coarse)').matches;
const qp=new URLSearchParams(location.search).get('q');let qs='';try{qs=localStorage.getItem('etm.q')||''}catch{}
export const QUALITY:'high'|'low'=(qp==='low'||qp==='high')?qp:(qs==='low'||qs==='high')?(qs as any):(MOBILE||(navigator.hardwareConcurrency||8)<=4)?'low':'high';
export function setQuality(q:'high'|'low'){try{localStorage.setItem('etm.q',q)}catch{}const u=new URL(location.href);u.searchParams.set('q',q);u.searchParams.set('t',(HK.now?HK.now():0).toFixed(2));location.href=u.toString()}
export let lastTouch=-1e9;
export const ERAS=[
 {name:'1 · ARCADE',start:bar(0)},
 {name:'2 · 16-BIT',start:bar(19)},
 {name:'3 · 3D',start:bar(37)},
 {name:'4 · MOBILE',start:bar(56)},
 {name:'5 · VR',start:bar(75)}];
export const TRANS=BAR*1.5;
export const eraAt=t=>{let e=0;for(let i=0;i<ERAS.length;i++)if(t>=ERAS[i].start)e=i;return e};
export const transAt=t=>{for(let i=1;i<ERAS.length;i++){const s=ERAS[i].start;if(t>=s-TRANS&&t<s)return{from:i-1,to:i,p:(t-(s-TRANS))/TRANS}}return null};
export const LYRICS:[number,string][]=[
[2,"One prompt, one box, one line to hold"],
[4,"Green text on glass, half right, half wrong"],
[6,"Ask, read, retry, take another turn"],
[8,"It made things up, and that's how I learned"],
[12,"But I wanted it faster"],
[14,"And it kept getting new"],
[19,"Turn it all the way up, then a little bit more"],
[21,"That's the only setting I've been looking for"],
[23,"Turn it all the way up, let the whole thing run"],
[25,"I don't do a little, I do everything, then some"],
[27.5,"Then the box talked back, and I talked back too"],
[29.5,"Taught myself the questions till the answers came true"],
[31.5,"Ask on the beat, every answer's a drum"],
[33.5,"I was learning in weeks what took years to come"],
[38,"Back at my desk, and I built me a crew"],
[40,"One sums up the meetings, one gets the inbox through"],
[42,"I call out the turns and they race down the line"],
[44,"Every lap they come back, and I check what they find"],
[47,"Turn it all the way up, then a little bit more"],
[49,"That's the only setting I've been looking for"],
[51,"Turn it all the way up, let the whole thing run"],
[53,"I don't do a little, I do everything, then some"],
[57,"Now the whole toolbox fits in my hand"],
[59,"Coaching on the bus, a deck before I land"],
[61,"Every week I'm evolving, every week it grows"],
[63,"The office is anywhere my signal goes"],
[66.5,"Wait, what if I built it?"],
[68,"Not a draft, the real thing"],
[69.5,"I said what I wanted out loud"],
[71,"And it came back running"],
[75,"From the plan to the push, every call is mine"],
[77,"Maximalist at heart, I don't wait in line"],
[79,"Brief the team, plan the sprint, code the fix on the fly"],
[81,"Write the tests, ship the build, and I still ask why"],
[83,"Turn it all the way up, then a little bit more"],
[85,"Every tool I ever learned, now I know what it's for"],
[87,"Turn it all the way up, let the whole thing run"],
[89,"Deputy, I'm ready, next level, here I come"],
[94,"Imagine what we could build."],
[95,"Ready when you are. Press start."]];

// ---------- canvas ----------
export const cv:HTMLCanvasElement=$('#c');export const dpr=QUALITY==='low'?1:Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;export const ctx=cv.getContext('2d');
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return{c,x,w,h}}
export const lo1=mk(480,270),lo2=mk(320,180),lo3=mk(480,270);
export function pix(x,pat,px,py,pal,s=1,flip=false){for(let r=0;r<pat.length;r++){const row=pat[r];for(let c=0;c<row.length;c++){const ch=row[flip?row.length-1-c:c];if(ch==='.')continue;x.fillStyle=typeof pal==='string'?pal:pal[ch];x.fillRect(px+c*s,py+r*s,s,s)}}}
export const scanPat=(()=>{const p=mk(1,3);p.x.fillStyle='rgba(0,0,0,.45)';p.x.fillRect(0,2,1,1);return ctx.createPattern(p.c,'repeat')})();
let vigGrad:CanvasGradient=null; // constant, built once (scan runs every frame in eras 3-5)
export function scan(a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=scanPat;ctx.fillRect(0,0,W,H);if(!vigGrad){vigGrad=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);vigGrad.addColorStop(0,'rgba(0,0,0,0)');vigGrad.addColorStop(1,'rgba(0,0,0,.75)')}ctx.fillStyle=vigGrad;ctx.fillRect(0,0,W,H);ctx.restore()}
export function blit(lo){ctx.drawImage(lo.c,0,0,W,H)}

// ---------- input ----------
export const keys:any={};export let fireEdge=false,jumpEdge=false;export const mv={x:0,y:0};export let lastInputReal=-1e9;
export function clearEdges(){fireEdge=false;jumpEdge=false;mv.x=0;mv.y=0}
// letters are stored lower-case: with Shift (or Caps Lock toggled) between keydown 'A' and keyup 'a', keys.A stayed true and the player kept moving
const normKey=(k:string)=>k.length===1?k.toLowerCase():k;
addEventListener('keydown',e=>{const k=normKey(e.key);if(k==='p'||k==='P'||k==='Escape'){HK.togglePlay?.();return}if(k==='m'||k==='M'){HK.toggleClick?.();return}if(k==='q'||k==='Q'){HK.cycleAuto?.();return}if(k==='l'||k==='L'){HK.toggleCaptions?.();return}if(k==='g'||k==='G'){HK.toggleQuality?.();return}if(k==='['){HK.nudge?.(-0.05);return}if(k===']'){HK.nudge?.(0.05);return}if(k==='t'||k==='T'){HK.tap?.();return}if(k==='y'||k==='Y'){HK.saveTiming?.();return}if(k==='u'||k==='U'){HK.clearTaps?.();return}if(k>='1'&&k<='5'){HK.seek?.(ERAS[+k-1].start);return}
 if(e.repeat){if(k===' ')e.preventDefault();return}keys[k]=true;
 if(k===' '){fireEdge=true;e.preventDefault()}if(k==='ArrowUp'||k==='w'||k==='W'){jumpEdge=true;mv.y-=1}if(k==='ArrowDown'||k==='s'||k==='S')mv.y+=1;if(k==='ArrowLeft'||k==='a'||k==='A')mv.x-=1;if(k==='ArrowRight'||k==='d'||k==='D')mv.x+=1;
 if(k.startsWith('Arrow')||k===' '||'wasdWASD'.includes(k)){lastInputReal=performance.now();if(k.startsWith('Arrow'))e.preventDefault()}});
addEventListener('keyup',e=>{keys[normKey(e.key)]=false});
// touch: hold the left or right edge to move, tap the upper middle to jump, tap the lower middle to fire
const tz=new Map<number,string>();let tzFire=0;cv.style.touchAction='none';
export const padsShown=()=>{const L=$('#padL');return !!L&&L.getBoundingClientRect().width>0};
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||padsShown())return;const r=cv.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;lastInputReal=performance.now();lastTouch=lastInputReal;if(clickOn)ensureAC();let z='';if(fx<0.28){z='L';keys.ArrowLeft=true;mv.x-=1}else if(fx>0.72){z='R';keys.ArrowRight=true;mv.x+=1}else if(fy<0.5){jumpEdge=true;mv.y-=1}else{fireEdge=true;z='F';tzFire++}tz.set(e.pointerId,z);e.preventDefault()},{passive:false});
// iOS only unlocks/resumes audio from touchend-class gestures, so retry ensureAC on release as well as on press
const tup=e=>{if(e.type==='pointerup'&&clickOn)ensureAC();if(!tz.has(e.pointerId))return;const z=tz.get(e.pointerId);if(z==='L')keys.ArrowLeft=false;if(z==='R')keys.ArrowRight=false;if(z==='F')tzFire=Math.max(0,tzFire-1);tz.delete(e.pointerId)};cv.addEventListener('pointerup',tup);cv.addEventListener('pointercancel',tup);cv.addEventListener('pointerleave',tup);
// a key or finger held while the tab/app loses focus never gets its keyup/pointerup: release everything
const releaseAll=()=>{for(const k in keys)keys[k]=false;tz.clear();tzFire=0;pad.left=pad.right=pad.up=pad.down=false};addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
if(matchMedia('(pointer: coarse)').matches){const h=$('#help');if(h)h.textContent='LEFT PAD MOVES · RIGHT BUTTON FIRES / JUMPS · FINALE: DRAG A PAD TO AIM'}
// pointer (mouse or finger) position over the canvas, 0..1, for the finale's hands
export const ptr={x:0.5,y:0.55,t:-1e9};
const ptrSet=(e:PointerEvent)=>{const r=cv.getBoundingClientRect();if(!r.width)return;ptr.x=clamp((e.clientX-r.left)/r.width,0,1);ptr.y=clamp((e.clientY-r.top)/r.height,0,1);ptr.t=performance.now()};
cv.addEventListener('pointermove',ptrSet);cv.addEventListener('pointerdown',ptrSet);
// side pads (touch screens, see #pads in index.html). Left: a floating thumb stick (move/steer, push up to jump). Right: the
// action button (fire, jump, flap). In the finale (era 5) both pads are trackpads that move the saber. In the flyer (era 4)
// a touch on either pad flaps. While the pads are shown the game screen itself only takes the finale's direct finger aim.
export const pad={left:false,right:false,up:false,down:false};
const padEra=()=>eraAt(HK.now?HK.now():0);
const padTouch=()=>{lastInputReal=performance.now();lastTouch=lastInputReal;if(clickOn)ensureAC()};
const AIMX=1/130,AIMY=1/95;
{const L=$('#padL'),R=$('#padR'),ring=$('#padRing'),knob=$('#padKnob'),A=$('#padA');
 if(L&&R){
  let lp:any=null,rp:any=null;
  const aim=(p,e)=>{ptr.x=clamp(ptr.x+(e.clientX-p.px)*AIMX,0,1);ptr.y=clamp(ptr.y+(e.clientY-p.py)*AIMY,0,1);ptr.t=performance.now();p.px=e.clientX;p.py=e.clientY};
  const knobAt=(dx,dy)=>{knob.style.transform=`translate(${dx}px,${dy}px)`};
  const ringHome=()=>{ring.style.left='50%';ring.style.top='50%';knobAt(0,0);L.classList.remove('on')};
  L.addEventListener('pointerdown',e=>{e.preventDefault();try{L.setPointerCapture(e.pointerId)}catch{}padTouch();const r=L.getBoundingClientRect(),era=padEra();
   lp={id:e.pointerId,ox:e.clientX,oy:e.clientY,px:e.clientX,py:e.clientY};L.classList.add('on');
   if(era===3){fireEdge=true;return}if(era===4){ptr.t=performance.now();return}
   ring.style.left=(e.clientX-r.left)+'px';ring.style.top=(e.clientY-r.top)+'px';knobAt(0,0)},{passive:false});
  L.addEventListener('pointermove',e=>{if(!lp||e.pointerId!==lp.id)return;e.preventDefault();const era=padEra();if(era===3)return;padTouch();if(era===4){aim(lp,e);return}
   let dx=e.clientX-lp.ox,dy=e.clientY-lp.oy;const RAD=34,d=Math.hypot(dx,dy);
   if(d>RAD){lp.ox+=dx*(1-RAD/d);lp.oy+=dy*(1-RAD/d);dx=e.clientX-lp.ox;dy=e.clientY-lp.oy;const r=L.getBoundingClientRect();ring.style.left=(lp.ox-r.left)+'px';ring.style.top=(lp.oy-r.top)+'px'}
   pad.left=dx<-10;pad.right=dx>10;const up=dy<-18;if(up&&!pad.up){jumpEdge=true;mv.y-=1}pad.up=up;pad.down=dy>18;knobAt(dx,dy)},{passive:false});
  const lup=e=>{if(!lp||e.pointerId!==lp.id)return;lp=null;pad.left=pad.right=pad.up=pad.down=false;ringHome()};
  L.addEventListener('pointerup',lup);L.addEventListener('pointercancel',lup);
  R.addEventListener('pointerdown',e=>{e.preventDefault();try{R.setPointerCapture(e.pointerId)}catch{}padTouch();rp={id:e.pointerId,px:e.clientX,py:e.clientY,fire:false};
   if(padEra()===4){ptr.t=performance.now();return}fireEdge=true;tzFire++;rp.fire=true;A.classList.add('on')},{passive:false});
  R.addEventListener('pointermove',e=>{if(!rp||e.pointerId!==rp.id)return;e.preventDefault();if(padEra()===4){padTouch();aim(rp,e)}},{passive:false});
  const rup=e=>{if(!rp||e.pointerId!==rp.id)return;if(rp.fire)tzFire=Math.max(0,tzFire-1);rp=null;A.classList.remove('on')};
  R.addEventListener('pointerup',rup);R.addEventListener('pointercancel',rup);
  // the portrait layout puts the pads between the game and the control bar, whose height depends on how its buttons wrap
  const barH=()=>{const b=$('#bar');if(b)document.documentElement.style.setProperty('--barH',Math.ceil(b.getBoundingClientRect().height)+'px')};
  addEventListener('resize',barH);setTimeout(barH,0);setTimeout(barH,500);
 }}
export function readInput(){return{left:!!(keys.ArrowLeft||keys.a||keys.A||pad.left),right:!!(keys.ArrowRight||keys.d||keys.D||pad.right),up:!!(keys.ArrowUp||keys.w||keys.W||pad.up),down:!!(keys.ArrowDown||keys.s||keys.S||pad.down),fire:fireEdge,fireHeld:!!keys[' ']||tzFire>0,jump:jumpEdge||fireEdge,upEdge:jumpEdge,mv:{x:mv.x,y:mv.y}}}

// ---------- audio (optional click track) ----------
let AC:any=null,master:any=null,noiseBuf:any=null;export let clickOn=false;
export function setClickOn(v:boolean){clickOn=v}
export function getAC(){return {AC,master}}
// master -> soft limiter -> out. The finale stacks ~2.2 of summed peak amplitude before the 0.45 master gain, which can touch 0 dBFS on snare beats; the limiter catches that instead of hard-clipping.
export function ensureAC(){if(!AC){AC=new(window.AudioContext||(window as any).webkitAudioContext)();master=AC.createGain();master.gain.value=0.45;const lim=AC.createDynamicsCompressor();lim.threshold.value=-8;lim.knee.value=4;lim.ratio.value=6;lim.attack.value=0.002;lim.release.value=0.12;master.connect(lim);lim.connect(AC.destination)}if(AC.state!=='running')Promise.resolve(AC.resume()).catch(()=>{})} // iOS also reports 'interrupted' after a call/Siri; resume from any non-running state
export function tone(freq,dur,type:OscillatorType='square',vol=0.2,slide=0){if(!clickOn||!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t0+dur);g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);o.connect(g);g.connect(master);o.start();o.stop(t0+dur+0.02)}
export function noise(dur,vol,hp){if(!clickOn||!AC)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}const s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=AC.createGain(),t0=AC.currentTime;g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(t0+dur+0.02)}
export const kick=()=>tone(150,0.18,'sine',0.7,-120),snare=()=>{noise(0.12,0.3,1800);tone(200,0.1,'triangle',0.25,-80)},hat=o=>noise(o?0.09:0.03,0.16,7000),blip=(f,d=0.08,v=0.12)=>tone(f,d,'square',v);
export function drums(era,b){if(!clickOn)return;const q=b%4;if(era===0)return;if(era===1){if(q===0||q===2)kick();if(q===1||q===3)snare()}else if(era===2){if(q===0)kick();if(q===2)snare()}else{kick();if(q===1||q===3)snare();if(era===4)blip([110,98,87,82][q],0.1,0.08)}}
