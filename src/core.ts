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
 {name:'1978 · ARCADE',start:bar(0)},
 {name:'1991 · 16-BIT',start:bar(19)},
 {name:'1995 · SATURN 3D',start:bar(37)},
 {name:'2013 · MOBILE',start:bar(56)},
 {name:'NOW · AGENTS',start:bar(75)}];
export const TRANS=BAR*1.5;
export const eraAt=t=>{let e=0;for(let i=0;i<ERAS.length;i++)if(t>=ERAS[i].start)e=i;return e};
export const transAt=t=>{for(let i=1;i<ERAS.length;i++){const s=ERAS[i].start;if(t>=s-TRANS&&t<s)return{from:i-1,to:i,p:(t-(s-TRANS))/TRANS}}return null};
export const LYRICS:[number,string][]=[
[2,"One form, one desk, one line to hold"],
[4,"Green text on glass in a room gone cold"],
[6,"Type, print, file, that's how I learned"],
[8,"A stack of them waiting, and I waited my turn"],
[12,"But I wanted it faster"],
[14,"I wanted something new"],
[19,"Turn it all the way up, then a little bit more"],
[21,"That's the only setting I've been looking for"],
[23,"Turn it all the way up, let the whole thing run"],
[25,"I don't do a little, I do everything, then some"],
[27.5,"Then the box talked back, and I talked back too"],
[29.5,"Taught myself the questions till the answers came true"],
[31.5,"Ask on the beat, every answer's a drum"],
[33.5,"I was learning in weeks what took years to come"],
[38,"Brought it back to my desk at the speed of light"],
[40,"Fog at the edge where the backlog quits"],
[42,"Foot to the floor and the floor is a pipeline"],
[44,"A thousand problems, and I'm solving them tonight"],
[47,"Turn it all the way up, then a little bit more"],
[49,"That's the only setting I've been looking for"],
[51,"Turn it all the way up, let the whole thing run"],
[53,"I don't do a little, I do everything, then some"],
[57,"Now the whole toolbox fits in my hand"],
[59,"One thumb, one prompt, and it's solved again"],
[61,"Every week I'm evolving, I don't slow down"],
[63,"Wherever I ask is a place I can go"],
[66.5,"Wait, who's drafting that?"],
[68,"I didn't write that there"],
[69.5,"I said what I needed out loud"],
[71,"And a hundred hands appeared"],
[75,"A hundred little hands and they all learned from mine"],
[77,"Maximalist by trade, I don't wait in line"],
[79,"Spawn a plan, spawn a form, spawn a fix on the fly"],
[81,"I point at the problem, it's solved by the time I blink"],
[83,"Turn it all the way up, then a little bit more"],
[85,"Every tool I ever learned is in here"],
[87,"Turn it all the way up, let the whole thing run"],
[89,"Deputy, I'm ready, make me a Maximalist"],
[94,"One desk. One job."],
[95,"Ready when you are. Press start."]];

// ---------- canvas ----------
export const cv:HTMLCanvasElement=$('#c');export const dpr=QUALITY==='low'?1:Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;export const ctx=cv.getContext('2d');
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return{c,x,w,h}}
export const lo1=mk(480,270),lo2=mk(320,180),lo3=mk(480,270);
export function pix(x,pat,px,py,pal,s=1,flip=false){for(let r=0;r<pat.length;r++){const row=pat[r];for(let c=0;c<row.length;c++){const ch=row[flip?row.length-1-c:c];if(ch==='.')continue;x.fillStyle=typeof pal==='string'?pal:pal[ch];x.fillRect(px+c*s,py+r*s,s,s)}}}
export const scanPat=(()=>{const p=mk(1,3);p.x.fillStyle='rgba(0,0,0,.45)';p.x.fillRect(0,2,1,1);return ctx.createPattern(p.c,'repeat')})();
export function scan(a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=scanPat;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.75)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
export function blit(lo){ctx.drawImage(lo.c,0,0,W,H)}

// ---------- input ----------
export const keys:any={};export let fireEdge=false,jumpEdge=false;export const mv={x:0,y:0};export let lastInputReal=-1e9;
export function clearEdges(){fireEdge=false;jumpEdge=false;mv.x=0;mv.y=0}
addEventListener('keydown',e=>{const k=e.key;if(k==='p'||k==='P'||k==='Escape'){HK.togglePlay();return}if(k==='m'||k==='M'){HK.toggleClick();return}if(k==='q'||k==='Q'){HK.cycleAuto();return}if(k==='l'||k==='L'){HK.toggleCaptions();return}if(k==='g'||k==='G'){HK.toggleQuality();return}if(k==='['){HK.nudge(-0.05);return}if(k===']'){HK.nudge(0.05);return}if(k==='t'||k==='T'){HK.tap();return}if(k==='y'||k==='Y'){HK.saveTiming();return}if(k==='u'||k==='U'){HK.clearTaps();return}if(k>='1'&&k<='5'){HK.seek(ERAS[+k-1].start);return}
 if(e.repeat){if(k===' ')e.preventDefault();return}keys[k]=true;
 if(k===' '){fireEdge=true;e.preventDefault()}if(k==='ArrowUp'||k==='w'||k==='W'){jumpEdge=true;mv.y-=1}if(k==='ArrowDown'||k==='s'||k==='S')mv.y+=1;if(k==='ArrowLeft'||k==='a'||k==='A')mv.x-=1;if(k==='ArrowRight'||k==='d'||k==='D')mv.x+=1;
 if(k.startsWith('Arrow')||k===' '||'wasdWASD'.includes(k)){lastInputReal=performance.now();if(k.startsWith('Arrow'))e.preventDefault()}});
addEventListener('keyup',e=>{keys[e.key]=false});
// touch: hold the left or right edge to move, tap the upper middle to jump, tap the lower middle to fire
const tz=new Map<number,string>();cv.style.touchAction='none';
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const r=cv.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;lastInputReal=performance.now();lastTouch=lastInputReal;if(clickOn)ensureAC();let z='';if(fx<0.28){z='L';keys.ArrowLeft=true;mv.x-=1}else if(fx>0.72){z='R';keys.ArrowRight=true;mv.x+=1}else if(fy<0.5){jumpEdge=true;mv.y-=1}else{fireEdge=true}tz.set(e.pointerId,z);e.preventDefault()},{passive:false});
const tup=e=>{const z=tz.get(e.pointerId);if(z==='L')keys.ArrowLeft=false;if(z==='R')keys.ArrowRight=false;tz.delete(e.pointerId)};cv.addEventListener('pointerup',tup);cv.addEventListener('pointercancel',tup);cv.addEventListener('pointerleave',tup);
if(matchMedia('(pointer: coarse)').matches){const h=$('#help');if(h)h.textContent='HOLD LEFT / RIGHT EDGE TO MOVE · TAP UPPER MIDDLE TO JUMP · TAP LOWER MIDDLE TO FIRE'}
export function readInput(){return{left:!!(keys.ArrowLeft||keys.a||keys.A),right:!!(keys.ArrowRight||keys.d||keys.D),up:!!(keys.ArrowUp||keys.w||keys.W),down:!!(keys.ArrowDown||keys.s||keys.S),fire:fireEdge,jump:jumpEdge||fireEdge,upEdge:jumpEdge,mv:{x:mv.x,y:mv.y}}}

// ---------- audio (optional click track) ----------
let AC:any=null,master:any=null,noiseBuf:any=null;export let clickOn=false;
export function setClickOn(v:boolean){clickOn=v}
export function getAC(){return {AC,master}}
export function ensureAC(){if(!AC){AC=new(window.AudioContext||(window as any).webkitAudioContext)();master=AC.createGain();master.gain.value=0.45;master.connect(AC.destination)}if(AC.state==='suspended')AC.resume()}
export function tone(freq,dur,type:OscillatorType='square',vol=0.2,slide=0){if(!clickOn||!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t0+dur);g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);o.connect(g);g.connect(master);o.start();o.stop(t0+dur+0.02)}
export function noise(dur,vol,hp){if(!clickOn||!AC)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}const s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=AC.createGain(),t0=AC.currentTime;g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(t0+dur+0.02)}
export const kick=()=>tone(150,0.18,'sine',0.7,-120),snare=()=>{noise(0.12,0.3,1800);tone(200,0.1,'triangle',0.25,-80)},hat=o=>noise(o?0.09:0.03,0.16,7000),blip=(f,d=0.08,v=0.12)=>tone(f,d,'square',v);
export function drums(era,b){if(!clickOn)return;const q=b%4;if(era===0)return;if(era===1){if(q===0||q===2)kick();if(q===1||q===3)snare()}else if(era===2){if(q===0)kick();if(q===2)snare()}else{kick();if(q===1||q===3)snare();if(era===4)blip([110,98,87,82][q],0.1,0.08)}}
