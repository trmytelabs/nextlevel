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
export const ERAS=[
 {name:'1978 · ARCADE',start:bar(0)},
 {name:'1991 · 16-BIT',start:bar(19)},
 {name:'1997 · 32-BIT',start:bar(37)},
 {name:'2016 · SANDBOX',start:bar(56)},
 {name:'NOW · AGENTS',start:bar(75)}];
export const TRANS=BAR*1.5;
export const eraAt=t=>{let e=0;for(let i=0;i<ERAS.length;i++)if(t>=ERAS[i].start)e=i;return e};
export const transAt=t=>{for(let i=1;i<ERAS.length;i++){const s=ERAS[i].start;if(t>=s-TRANS&&t<s)return{from:i-1,to:i,p:(t-(s-TRANS))/TRANS}}return null};
export const LYRICS:[number,string][]=[[2,'One pixel, one life, one line to hold'],[4,'Green light on glass in a room gone cold'],[6,"Left, right, fire, that's all we knew"],[8,'A row of them falling, a little of me too'],[12,'But every wave came faster'],[14,'And every wave came new'],
[19,'Give me everything, then give me more'],[21,'Every screen I ever sat in front of'],[23,'Give me everything, then give me more'],[25,"I don't want the game, I want what it's made of"],
[27.5,"Now I've got legs and the ground's got springs"],[29.5,"Coins in the sky and the sky's got rings"],[31.5,"Jump on the beat, every block's a drum"],[33.5,"Wherever I land is where I'm from"],
[38,'Spin the world till it shows me a horizon'],[40,'Fog at the edge where the polygons quit'],[42,'Foot to the floor and the floor is a texture'],[44,'A thousand triangles chasing the light'],
[47,'Give me everything, then give me more'],[49,'Every screen I ever sat in front of'],[51,'Give me everything, then give me more'],[53,"I don't want the game, I want what it's made of"],
[57,'Now every brick I drop stays down'],[59,"I'm not just playing, I'm laying the town"],[61,'Shadows that bend and water that knows'],[63,'Whatever I picture is a place I can go'],
[66.5,"Wait, who's placing that?"],[68,"I didn't put that there"],[69.5,'I said what I wanted out loud'],[71,'And a hundred hands appeared'],
[75,'A hundred little hands and they all learned from mine'],[77,"Writing out a world while I'm still reading the line"],[79,"Spawn a sky, spawn a road, spawn a rule I don't know"],[81,"I'll play whatever you make me, just don't stop, go"],
[83,'Give me everything, then give me more'],[85,'Every game I ever played is in here'],[87,'Give me everything, then give me more'],[89,"Now the game is building a game, and it's building it for me"],
[94,'One pixel. One life.'],[95,'Press start.']];

// ---------- canvas ----------
export const cv:HTMLCanvasElement=$('#c');export const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;export const ctx=cv.getContext('2d');
export function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return{c,x,w,h}}
export const lo1=mk(192,108),lo2=mk(320,180),lo3=mk(320,180);
export function pix(x,pat,px,py,pal,s=1,flip=false){for(let r=0;r<pat.length;r++){const row=pat[r];for(let c=0;c<row.length;c++){const ch=row[flip?row.length-1-c:c];if(ch==='.')continue;x.fillStyle=typeof pal==='string'?pal:pal[ch];x.fillRect(px+c*s,py+r*s,s,s)}}}
export const scanPat=(()=>{const p=mk(1,3);p.x.fillStyle='rgba(0,0,0,.45)';p.x.fillRect(0,2,1,1);return ctx.createPattern(p.c,'repeat')})();
export function scan(a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=scanPat;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.75)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
export function blit(lo){ctx.drawImage(lo.c,0,0,W,H)}

// ---------- input ----------
export const keys:any={};export let fireEdge=false,jumpEdge=false;export const mv={x:0,y:0};export let lastInputReal=-1e9;
export function clearEdges(){fireEdge=false;jumpEdge=false;mv.x=0;mv.y=0}
addEventListener('keydown',e=>{const k=e.key;if(k==='p'||k==='P'||k==='Escape'){HK.togglePlay();return}if(k==='m'||k==='M'){HK.toggleClick();return}if(k==='q'||k==='Q'){HK.cycleAuto();return}if(k==='l'||k==='L'){HK.toggleCaptions();return}if(k>='1'&&k<='5'){HK.seek(ERAS[+k-1].start);return}
 if(e.repeat){if(k===' ')e.preventDefault();return}keys[k]=true;
 if(k===' '){fireEdge=true;e.preventDefault()}if(k==='ArrowUp'||k==='w'||k==='W'){jumpEdge=true;mv.y-=1}if(k==='ArrowDown'||k==='s'||k==='S')mv.y+=1;if(k==='ArrowLeft'||k==='a'||k==='A')mv.x-=1;if(k==='ArrowRight'||k==='d'||k==='D')mv.x+=1;
 if(k.startsWith('Arrow')||k===' '||'wasdWASD'.includes(k)){lastInputReal=performance.now();if(k.startsWith('Arrow'))e.preventDefault()}});
addEventListener('keyup',e=>{keys[e.key]=false});
export function readInput(){return{left:!!(keys.ArrowLeft||keys.a||keys.A),right:!!(keys.ArrowRight||keys.d||keys.D),up:!!(keys.ArrowUp||keys.w||keys.W),down:!!(keys.ArrowDown||keys.s||keys.S),fire:fireEdge,jump:jumpEdge||fireEdge,upEdge:jumpEdge,mv:{x:mv.x,y:mv.y}}}

// ---------- audio (optional click track) ----------
let AC:any=null,master:any=null,noiseBuf:any=null;export let clickOn=false;
export function setClickOn(v:boolean){clickOn=v}
export function ensureAC(){if(!AC){AC=new(window.AudioContext||(window as any).webkitAudioContext)();master=AC.createGain();master.gain.value=0.45;master.connect(AC.destination)}if(AC.state==='suspended')AC.resume()}
export function tone(freq,dur,type:OscillatorType='square',vol=0.2,slide=0){if(!clickOn||!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t0+dur);g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);o.connect(g);g.connect(master);o.start();o.stop(t0+dur+0.02)}
export function noise(dur,vol,hp){if(!clickOn||!AC)return;if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}const s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=AC.createGain(),t0=AC.currentTime;g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(t0+dur+0.02)}
export const kick=()=>tone(150,0.18,'sine',0.7,-120),snare=()=>{noise(0.12,0.3,1800);tone(200,0.1,'triangle',0.25,-80)},hat=o=>noise(o?0.09:0.03,0.16,7000),blip=(f,d=0.08,v=0.12)=>tone(f,d,'square',v);
export function drums(era,b){if(!clickOn)return;const q=b%4;if(era===0)return;if(era===1){if(q===0||q===2)kick();if(q===1||q===3)snare()}else if(era===2){if(q===0)kick();if(q===2)snare()}else{kick();if(q===1||q===3)snare();if(era===4)blip([110,98,87,82][q],0.1,0.08)}}
