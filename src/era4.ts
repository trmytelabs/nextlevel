import {ERAS,TRANS,BAR,BEAT,bar,W,H,LYRICS,hash,clamp,lerp,smooth,blip,noise,cb} from './core';
import {eggFind} from './eggs';

// ---------- ERA 4: mobile. A phone on a desk running a one-thumb flapping game ----------
export const E4=(()=>{
const s4=ERAS[3].start,s5=ERAS[4].start;
const PW=262,PH=516,PX0=W/2-PW/2,PY0=12;           // phone body
const SX=W/2-115,SY=58,GW=230,GH=424,SB=20;         // screen and status bar
const GY0=SY+SB,GAH=GH-SB,GROUND=GAH-46;            // game area and ground line
const V=130,SPACING=V*BEAT*3,GAP=130,PWD=52,BX=GW*0.3,PIPE0=GW+60;
const G=1500,FLAP=-400;
const F=px=>px+"px 'Press Start 2P',monospace";
const GREEN='#5bff5b';                              // co-pilot green (the ghosts, the agents, the AI notifications)
// notifications beside the phone: the AI arriving in his pocket and getting better every week, then taking over the task
const NOTES:[number,string,string,number,string][]=[
 [56.6,'ASSISTANT','Now in your pocket. Ask me.',0,GREEN],
 [58.5,'ASSISTANT','Your 9:00 brief is ready',1,GREEN],
 [60.5,'UPDATE','New this week: reads PDFs',0,'#5fc9e0'],
 [62.5,'UPDATE','New this week: sees photos',1,'#5fc9e0'],
 [64.4,'WEEKLY','You asked 212 times. Nice.',0,'#f7d33c'],
 [66.5,'ASSISTANT','Drafting a reply for you...',1,GREEN],
 [68.2,'ASSISTANT','Draft ready. Review it?',0,GREEN],
 [69.7,'VOICE','Heard: "plan the sprint"',1,'#ff5be0'],
 [71,'HELPERS','100 helpers joined your task',0,GREEN],
 [73,'HANDOFF','Moving to your headset...',0,GREEN]];
// ghost slots: spread across the screen (x offset from the bird, y offset inside the gap) so they read as a flock
const GX=i=>-44+((i*53)%176),GDY=i=>[-26,14,-12,28][i%4];
let S:any,PIPEG:any=null,BOKEH:any=null;const WRAP=new Map<string,string[]>();
const pipeX=(k,t)=>PIPE0+k*SPACING-Math.max(0,t-s4)*V;
const gapY=k=>178+81*Math.sin(k*0.7)+25*(hash(k*3.7+0.5)-0.5);   // 84..272, step between neighbours <= ~80 px
// secret 4: a gold star in the open air between two pipes, reached around bar 64.5, a little above the line between the two
// gaps (one easy flap). A player who flies through it finds it; the autopilot flies its own line and never counts.
const KSTAR=Math.round(((cb(64.5)-s4)*V+BX-PIPE0-PWD-(SPACING-PWD)/2)/SPACING);
const starX=t=>pipeX(KSTAR,t)+PWD+(SPACING-PWD)/2,starY=(gapY(KSTAR)+gapY(KSTAR+1))/2-26;
function drawStar(ctx,x,y,r,rot){ctx.beginPath();for(let i=0;i<10;i++){const a=rot+i*Math.PI/5-Math.PI/2,rr=i%2?r*0.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}
function init(t){S={starGot:false,starT:-9,starY,starAt:s4+(PIPE0+KSTAR*SPACING+PWD+(SPACING-PWD)/2-BX)/V,bird:{y:GAH/2,vy:0,alive:true,deadT:-9,flapT:-9,inv:0,hover:false,bornT:-9},score:0,best:0,counted:new Set(),words:new Map(),line:[],got:0,ghosts:[],agents:[],ripples:[],flash:0,started:false,parts:[],total:0,signs:0,deaths:0,agentsOut:0,planned:new Set()};
 const k0=firstPipe(t);for(let k=0;k<k0;k++)S.counted.add(k);
 // seek == play: plan every era-4 line that has already started (onLine is a pure function of (words, line start)),
 // then count the pipes already behind the bird as flown through, as an uninterrupted play-through would have
 if(t>s4){for(const [lb,txt] of LYRICS){const lt=bar(lb);if(lt>=s4&&lt<s5&&lt<=t)onLine(txt.split(' '),lt)}
  for(const [k,w] of [...S.words])if(k<k0){S.words.delete(k);S.got+=w.split(' ').length;S.line.push(w)}
  S.signs=S.words.size;S.score=k0;S.started=t>s4+0.3}}
const firstPipe=t=>{let k=0;while(pipeX(k,t)+PWD<BX-10)k++;return k};
function flap(t){const b=S.bird;b.vy=FLAP;b.flapT=t;b.hover=false;S.started=true;S.ripples.push({t});blip(880,0.05,0.08)}
function autoFlap(y,vy,k,t,lastFlap){let c=gapY(k);if(pipeX(k,t)+PWD/2<BX)c+=clamp(gapY(k+1)-c,0,20);return y>c+16&&vy>-80&&t-lastFlap>0.1}
function onLine(words,t){if(t<s4||t>=s5)return;const cur=LYRICS.filter(l=>bar(l[0])<=t+0.01).pop();if(!cur||bar(cur[0])<s4)return;
 if(S.planned.has(cur[0]))return;S.planned.add(cur[0]);const lt=bar(cur[0]);   // idempotent per line: a seek plans it in init, then the HUD re-dispatches it
 const nx=LYRICS.find(l=>bar(l[0])>lt+0.01),tn=Math.min(nx?bar(nx[0]):s5,s5),n=Math.max(1,firstPipe(tn)-firstPipe(lt));S.total+=words.length;
 for(let j=0,k=firstPipe(lt)+1;j<n;j++){const a=Math.floor(j*words.length/n),b=Math.floor((j+1)*words.length/n);if(b>a)S.words.set(k++,words.slice(a,b).join(' '))}S.signs=S.words.size}
function respawn(t,k){const b=S.bird;b.alive=true;b.hover=true;b.bornT=t;b.y=gapY(k);b.vy=0;b.inv=BEAT*4;S.score=0;
 for(let i=0;i<k;i++){S.counted.add(i);S.words.delete(i)}S.signs=S.words.size}   // the pipe the bird respawns into keeps its words
function update(dt,t,inp,auto){if(t<s4-TRANS||t>=s5)return;const b=S.bird;
 if(t>=s4){const k=firstPipe(t),tap=inp.upEdge||inp.fire;
  if(b.alive){if(auto&&b.hover&&t-b.bornT>0.25)b.hover=false;const want=auto?(!S.started||autoFlap(b.y,b.vy,k,t,b.flapT)):tap;if(want)flap(t);
   if(b.hover){b.y=lerp(b.y,gapY(k)+Math.sin(t*6)*4,1-Math.pow(0.02,dt));b.vy=0}   // "get ready": hover in the gap until the first tap, still invulnerable
   else if(S.started){b.vy+=G*dt;b.y+=b.vy*dt}else b.y=GAH/2+Math.sin(t*4)*6;
   if(b.y<8){b.y=8;b.vy=0}
   // collisions: pipes only while vulnerable; the ground kills only when vulnerable and before the hand-off, otherwise bounces
   if(!b.hover)b.inv=Math.max(0,b.inv-dt);let hit=false;
   if(b.y>GROUND-12){if(b.inv>0||t>=cb(74.4)){b.y=GROUND-12;b.vy=FLAP*0.8}else hit=true}
   if(!hit&&b.inv<=0)for(let i=k;i<k+2;i++){const px=pipeX(i,t);if(BX+10>px&&BX-10<px+PWD){const c=gapY(i);if(b.y-9<c-GAP/2||b.y+9>c+GAP/2)hit=true}}
   if(hit&&t<cb(74.4)){b.alive=false;b.deadT=t;b.vy=-150;S.deaths++;S.flash=0.3;S.best=Math.max(S.best,S.score);noise(0.15,0.4,900);blip(110,0.25,0.15)}
   if(!S.starGot&&!auto&&!hit){const sx=starX(t);if(Math.abs(sx-BX)<16&&Math.abs(b.y-starY)<18){S.starGot=true;S.starT=t;S.score+=5;eggFind(3,false)}}
   for(let i=k-1;i<k+1;i++){if(i<0||S.counted.has(i))continue;if(pipeX(i,t)+PWD<BX-10){S.counted.add(i);S.score++;const w=S.words.get(i);if(w){S.line.push(w);S.got+=w.split(' ').length;S.words.delete(i);S.signs=S.words.size;S.parts.push({t,w,y:gapY(i)});blip(1568,0.08,0.1)}else blip(1046,0.06,0.08)}}}
  else{b.vy+=G*dt;b.y=Math.min(GROUND-12,b.y+b.vy*dt);const age=t-b.deadT;if(age>BEAT*2||(!auto&&tap&&age>0.45))respawn(t,k)}   // auto-retry after two beats, or tap to retry
  // ghosts: perfect players that fly in from the right during the bridge, one every two beats
  const n=t>=cb(73)?0:t>=cb(66.5)?Math.min(14,Math.floor((t-cb(66.5))/(BEAT*2))+1):0;
  while(S.ghosts.length<n){const i=S.ghosts.length;S.ghosts.push({i,x:GW+20-BX,y:gapY(k),xo:GX(i),dy:GDY(i),col:GREEN,ph:i*1.7})}
  for(const g of S.ghosts){g.x=lerp(g.x,g.xo,1-Math.pow(0.05,dt));const kg=firstPipe(t+(-g.x)/V);const target=gapY(kg)+g.dy+Math.sin(t*5+g.ph)*4;g.y=lerp(g.y,target,1-Math.pow(0.002,dt));
   if(Math.floor((t+g.ph)/(BEAT*2))!==Math.floor((t+g.ph-dt)/(BEAT*2)))S.ripples.push({t,ghost:true,x:BX+g.x,y:g.y})}
  // at bar 73 the ghosts become agents and leave the phone to the right, into the finale
  if(t>=cb(73)&&S.agents.length===0)for(let i=0;i<14;i++){const g=S.ghosts[i]||{x:GX(i),y:gapY(k)+GDY(i)};S.agents.push({sx:SX+BX+g.x,sy:GY0+g.y,ty:110+(i%7)*48,born:cb(73)+i*0.05})}
  S.agentsOut=0;for(const a of S.agents)if(agentPos(a,t)[0]>W)S.agentsOut++;
  if(t>=cb(73))S.ghosts=[]}
 S.flash=Math.max(0,S.flash-dt);S.ripples=S.ripples.filter(r=>t-r.t<0.5);S.parts=S.parts.filter(p=>t-p.t<0.7)}
const AGENT_T=0.9;   // seconds from leaving the phone to crossing the right edge (all out by ~bar 73.85)
function agentPos(a,t){const u=clamp((t-a.born)/AGENT_T,0,1),e=u*u;return[lerp(a.sx,W+40,e),lerp(a.sy,a.ty,smooth(u))-Math.sin(u*Math.PI)*50,u]}
function onBeat(_b,_t,_auto){}
function on8th(_n,_t,_auto){}

// ---------------- rendering ----------------
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function wrap(w){let r=WRAP.get(w);if(r)return r;r=[];for(const word of w.split(' ')){const l=r[r.length-1];if(l&&l.length+1+word.length<=10)r[r.length-1]=l+' '+word;else r.push(word)}WRAP.set(w,r);return r}
function draw(ctx,t){const appear=smooth((t-(s4-TRANS))/TRANS),pulse=1-((t/BEAT)%1),b=S.bird;const slide=(1-appear)*640;
 // desk and bokeh (gradients built once; the twinkle is a globalAlpha)
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c0e1c');bg.addColorStop(1,'#1c1230');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(!BOKEH){BOKEH=[];for(let i=0;i<14;i++){const x=hash(i*1.9)*W,y=hash(i*4.1)*H,r=30+hash(i*7.3)*70;const c=['95,201,224','247,211,60','108,204,60','255,120,180'][i%4];const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${c},0.15)`);g.addColorStop(1,`rgba(${c},0)`);BOKEH.push({x,y,r,g})}}
 ctx.save();ctx.globalCompositeOperation='lighter';BOKEH.forEach((k,i)=>{ctx.globalAlpha=appear*(0.10+0.05*Math.sin(t+i))/0.15;ctx.fillStyle=k.g;ctx.fillRect(k.x-k.r,k.y-k.r,k.r*2,k.r*2)});ctx.restore();
 ctx.save();ctx.translate(0,slide);
 // phone shadow and body
 ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(W/2,PY0+PH+6,PW*0.62,16,0,0,7);ctx.fill();
 const pg=ctx.createLinearGradient(PX0,0,PX0+PW,0);pg.addColorStop(0,'#2a2a32');pg.addColorStop(0.5,'#101016');pg.addColorStop(1,'#26262e');ctx.fillStyle=pg;rrect(ctx,PX0,PY0,PW,PH,38);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle='#000';rrect(ctx,PX0+10,PY0+10,PW-20,PH-20,30);ctx.fill();
 ctx.fillStyle='#1c1c24';rrect(ctx,W/2-22,PY0+30,44,5,2.5);ctx.fill();ctx.fillStyle='#0a1a2a';ctx.beginPath();ctx.arc(W/2-40,PY0+32,4,0,7);ctx.fill();ctx.fillStyle='#2a4a6a';ctx.beginPath();ctx.arc(W/2-41,PY0+31,1.5,0,7);ctx.fill();
 ctx.strokeStyle='#2a2a34';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2,PY0+PH-26,15,0,7);ctx.stroke();ctx.strokeStyle='#3a3a46';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W/2-6,PY0+PH-32);ctx.lineTo(W/2+6,PY0+PH-32);ctx.lineTo(W/2+6,PY0+PH-20);ctx.lineTo(W/2-6,PY0+PH-20);ctx.closePath();ctx.stroke();
 // screen
 ctx.save();rrect(ctx,SX,SY,GW,GH,22);ctx.clip();
 drawGame(ctx,t,pulse);
 // status bar
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(SX,SY,GW,SB);ctx.font=F(8);ctx.fillStyle='#fff';ctx.fillText('9:41',SX+10,SY+14);for(let i=0;i<5;i++){ctx.fillStyle=i<4?'#fff':'rgba(255,255,255,.35)';ctx.fillRect(SX+56+i*5,SY+8+(4-i),3,3+i)}ctx.font=F(6);ctx.fillText('LTE',SX+86,SY+13);
 ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(SX+GW-34,SY+6,22,9);ctx.fillStyle='#fff';ctx.fillRect(SX+GW-11,SY+8.5,2,4);ctx.fillStyle=S.bird.alive?'#4cd964':'#ff3b30';ctx.fillRect(SX+GW-32,SY+8,18*(0.55+0.45*Math.sin(t*0.1)**2),5);
 // screen glare
 const gl=ctx.createLinearGradient(SX,SY,SX+GW*0.6,SY+GH);gl.addColorStop(0,'rgba(255,255,255,.08)');gl.addColorStop(0.5,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.fillRect(SX,SY,GW,GH);
 ctx.restore();
 // thumb: presses in toward the screen on every flap and eases back
 const tap=smooth(1-(t-b.flapT)/0.16);const ty=PY0+PH-70-tap*12,tx=W/2+72-tap*4;ctx.save();ctx.translate(tx,ty);ctx.rotate(-0.6);ctx.fillStyle=`rgba(0,0,0,${0.35-tap*0.12})`;rrect(ctx,-14+tap*3,-6+tap*3,40,120,16);ctx.fill();const sk=ctx.createLinearGradient(-16,0,24,0);sk.addColorStop(0,'#e8b894');sk.addColorStop(1,'#c58f6c');ctx.fillStyle=sk;rrect(ctx,-18,-14,38,130,17);ctx.fill();ctx.fillStyle='rgba(255,255,255,.18)';rrect(ctx,-12,-10,10,40,5);ctx.fill();ctx.fillStyle='#f3d9c4';ctx.beginPath();ctx.ellipse(-2,-6,10,7,0,0,7);ctx.fill();ctx.restore();
 for(const r of S.ripples){if(r.ghost)continue;const q=(t-r.t)/0.5;ctx.strokeStyle=`rgba(255,255,255,${(1-q)*0.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(tx-12,ty-10,6+q*36,0,7);ctx.stroke()}
 ctx.restore();
 // notifications beside the phone
 NOTES.forEach(([nb,title,body,side,col],i)=>{const tb=cb(nb);if(t<tb||t>tb+BAR*2.5)return;const age=t-tb,fin=smooth(age/0.35),fout=age>BAR*2.1?1-(age-BAR*2.1)/(BAR*0.4):1;const NW=290,x=side?W-20-NW+(1-fin)*140:20-(1-fin)*140,y=70+(i%4)*62;
  ctx.save();ctx.globalAlpha=fout*appear*fin;ctx.fillStyle='rgba(28,28,38,.94)';rrect(ctx,x,y,NW,50,12);ctx.fill();ctx.strokeStyle=col===GREEN?'rgba(91,255,91,.35)':'rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=col;rrect(ctx,x+10,y+10,30,30,7);ctx.fill();ctx.fillStyle='#0c1a10';ctx.font=F(12);ctx.textAlign='center';ctx.fillText(title[0],x+25,y+31);ctx.textAlign='left';
  ctx.fillStyle='#fff';ctx.font=F(9);ctx.fillText(title,x+50,y+22);ctx.fillStyle='#b4bacc';ctx.font=F(8);ctx.fillText(body,x+50,y+38);ctx.restore()});
 // agents leaving the phone: green sparks with a short trail
 for(const a of S.agents){if(t<a.born)continue;const [x,y,u]=agentPos(a,t);if(u>=1)continue;const [px,py]=agentPos(a,t-0.08);
  ctx.strokeStyle=hexa(GREEN,0.45);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
  const g=ctx.createRadialGradient(x,y,2,x,y,24);g.addColorStop(0,hexa(GREEN,0.55));g.addColorStop(1,hexa(GREEN,0));ctx.fillStyle=g;ctx.fillRect(x-24,y-24,48,48);
  ctx.save();ctx.translate(x,y);ctx.scale(1.3,1.3);drawBird(ctx,0,0,-0.15,t,GREEN,1,a.born*7);ctx.restore()}
 if(S.flash>0){ctx.fillStyle=`rgba(255,255,255,${S.flash*0.6})`;ctx.fillRect(SX,SY,GW,GH)}}
function hexa(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`}
function drawGame(ctx,t,pulse){const b=S.bird,run=Math.max(0,t-s4);ctx.save();ctx.translate(SX,GY0);
 // sky
 const sg=ctx.createLinearGradient(0,0,0,GAH);sg.addColorStop(0,'#4fb6d8');sg.addColorStop(0.7,'#9fe0ee');sg.addColorStop(1,'#c9f0f5');ctx.fillStyle=sg;ctx.fillRect(0,0,GW,GAH);
 // clouds
 ctx.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<6;i++){const cx=((hash(i*2.2)*400-run*12)%(GW+120)+GW+120)%(GW+120)-60,cy=40+hash(i*5.5)*120,r=14+hash(i*3.3)*12;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.arc(cx+r*0.9,cy+4,r*0.8,0,7);ctx.arc(cx-r*0.9,cy+5,r*0.7,0,7);ctx.fill()}
 // city silhouette
 ctx.fillStyle='#bfe9d6';for(let i=-1;i<9;i++){const x=i*30-((run*25)%30),h=30+hash(i+Math.floor((run*25)/30))*50;ctx.fillRect(x,GROUND-h,26,h);ctx.fillStyle='#d7f3e6';ctx.fillRect(x+6,GROUND-h+6,5,5);ctx.fillRect(x+15,GROUND-h+6,5,5);ctx.fillStyle='#bfe9d6'}
 ctx.fillStyle='#8fd96a';for(let i=-1;i<10;i++){const x=i*26-((run*45)%26);ctx.beginPath();ctx.arc(x+13,GROUND+2,16,Math.PI,0);ctx.fill()}
 // pipes (one shared gradient, drawn in pipe-local coordinates)
 if(!PIPEG){PIPEG=ctx.createLinearGradient(0,0,PWD,0);PIPEG.addColorStop(0,'#5fb83a');PIPEG.addColorStop(0.35,'#8fe06a');PIPEG.addColorStop(1,'#4e9f30')}
 const k0=firstPipe(t);for(let k=Math.max(0,k0-1);k<k0+3;k++){const x=pipeX(k,t);if(x>GW+10||x+PWD<-10)continue;const c=gapY(k);
  ctx.save();ctx.translate(x,0);ctx.fillStyle=PIPEG;ctx.strokeStyle='#2f6a1c';ctx.lineWidth=2;
  for(const top of[true,false]){const y0=top?-10:c+GAP/2,y1=top?c-GAP/2:GROUND+10;ctx.fillRect(0,y0,PWD,y1-y0);ctx.strokeRect(0,y0,PWD,y1-y0);const cy=top?y1-22:y0;ctx.fillRect(-4,cy,PWD+8,22);ctx.strokeRect(-4,cy,PWD+8,22)}
  ctx.restore();
  // the lyric sign hanging in the gap: 10 px type, wrapped to <= 10 characters a line so it stays inside one pipe spacing
  const w=S.words.get(k);if(w){const L=wrap(w),fs=10,lh=13,tw=Math.max(...L.map(s=>s.length))*fs+12,th=L.length*lh+7,top=c-th/2,cx=x+PWD/2;
   ctx.strokeStyle='rgba(47,106,28,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,c-GAP/2);ctx.lineTo(cx,top);ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.95)';rrect(ctx,cx-tw/2,top,tw,th,5);ctx.fill();ctx.strokeStyle='#2f6a1c';ctx.stroke();
   ctx.font=F(fs);ctx.fillStyle='#1f3a12';ctx.textAlign='center';L.forEach((s,i)=>ctx.fillText(s,cx+1,top+4+fs+i*lh));ctx.textAlign='left'}}
 // the gold star (secret 4), and its burst once taken
 {const sx=starX(t);if(!S.starGot&&sx>-20&&sx<GW+20){const r=11+Math.sin(t*8)*1.5;ctx.save();ctx.shadowColor='#ffd23f';ctx.shadowBlur=14;ctx.fillStyle='#ffd23f';drawStar(ctx,sx,starY,r,t*1.5);ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#a86a08';ctx.stroke();ctx.fillStyle='#fff6c0';drawStar(ctx,sx-2,starY-2,r*0.35,t*1.5);ctx.fill();ctx.restore()}
  const age=t-S.starT;if(S.starGot&&age<0.6){ctx.save();ctx.globalAlpha=1-age/0.6;ctx.strokeStyle='#ffd23f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(BX,S.bird.y,10+age*90,0,7);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle='#fff2a0';drawStar(ctx,BX+Math.cos(a)*age*120,S.bird.y+Math.sin(a)*age*120,5,age*6);ctx.fill()}ctx.restore()}}
 // ground
 ctx.fillStyle='#ddd894';ctx.fillRect(0,GROUND,GW,GAH-GROUND);ctx.fillStyle='#73c84e';ctx.fillRect(0,GROUND,GW,8);ctx.fillStyle='#5aa83a';ctx.fillRect(0,GROUND+8,GW,2);ctx.fillStyle='#c9c07a';for(let i=-1;i<GW/14+1;i++){const x=i*14-((run*V)%14);ctx.beginPath();ctx.moveTo(x,GROUND+10);ctx.lineTo(x+7,GROUND+10);ctx.lineTo(x+14,GAH);ctx.lineTo(x+7,GAH);ctx.fill()}
 // ghosts: co-pilot green birds with a glow, and green taps from hands that are not yours
 for(const r of S.ripples){if(!r.ghost)continue;const q=(t-r.t)/0.5;ctx.strokeStyle=hexa(GREEN,(1-q)*0.7);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,8+q*18,0,7);ctx.stroke()}
 for(const g of S.ghosts){const x=BX+g.x;ctx.fillStyle=hexa(GREEN,0.22);ctx.beginPath();ctx.arc(x,g.y,17,0,7);ctx.fill();drawBird(ctx,x,g.y,-0.2,t,GREEN,0.8,g.i)}
 // bird
 if(b.alive||t-b.deadT<BAR){const rot=b.hover?0:clamp(b.vy/600,-0.5,1.2);const blink=b.inv>0&&Math.floor(t*20)%2;if(!blink)drawBird(ctx,BX,b.y,rot,t,null,1,0)}
 // score and prompts
 ctx.font=F(18);ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#2f3a44';ctx.strokeText(String(S.score),GW/2,52);ctx.fillStyle='#fff';ctx.fillText(String(S.score),GW/2,52);
 if((!S.started||(b.alive&&b.hover))&&Math.floor(t*3)%2===0){ctx.font=F(10);ctx.lineWidth=4;ctx.strokeText(S.started?'TAP!':'TAP TO FLY',GW/2,GAH*0.62);ctx.fillStyle='#f7d33c';ctx.fillText(S.started?'TAP!':'TAP TO FLY',GW/2,GAH*0.62)}
 if(!b.alive){const q=smooth((t-b.deadT)/0.25),cy=GAH*0.3;ctx.save();ctx.globalAlpha=q;ctx.translate(0,(1-q)*30);ctx.fillStyle='#f3e4b0';rrect(ctx,GW/2-90,cy,180,118,8);ctx.fill();ctx.strokeStyle='#8a6a2a';ctx.lineWidth=2;ctx.stroke();
  ctx.textAlign='center';ctx.font=F(13);ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.strokeText('GAME OVER',GW/2,cy+26);ctx.fillStyle='#e06a1a';ctx.fillText('GAME OVER',GW/2,cy+26);
  ctx.font=F(8);ctx.fillStyle='#6a5a2a';ctx.textAlign='left';ctx.fillText('SCORE',GW/2+4,cy+46);ctx.fillText('BEST',GW/2+4,cy+72);ctx.textAlign='right';ctx.fillStyle='#2f3a44';ctx.font=F(10);ctx.fillText(String(S.score),GW/2+80,cy+60);ctx.fillText(String(S.best),GW/2+80,cy+86);
  const mg=ctx.createRadialGradient(GW/2-46,cy+62,2,GW/2-46,cy+62,20);mg.addColorStop(0,'#ffe9a0');mg.addColorStop(1,S.score>=10?'#e0b020':'#b08050');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(GW/2-46,cy+62,20,0,7);ctx.fill();
  // auto-retry: the bar fills over the two beats before the bird comes back
  const p=clamp((t-b.deadT)/(BEAT*2),0,1);ctx.fillStyle='rgba(138,106,42,.25)';ctx.fillRect(GW/2-70,cy+96,140,6);ctx.fillStyle='#e06a1a';ctx.fillRect(GW/2-70,cy+96,140*p,6);
  ctx.font=F(8);ctx.textAlign='center';ctx.fillStyle='#6a5a2a';ctx.fillText('TAP TO RETRY',GW/2,cy+113);ctx.restore()}
 ctx.textAlign='left';
 ctx.restore()}
function drawBird(ctx,x,y,rot,t,tint,alpha,seed){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rot);
 const body=tint||'#f7d33c',dark=tint?hexa(tint,0.9):'#d9a51c';ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,12,9,0,0,7);ctx.fill();ctx.strokeStyle=tint?'rgba(255,255,255,.6)':'#5a4010';ctx.lineWidth=1.5;ctx.stroke();
 const wing=Math.sin(t*22+seed)*0.6;ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(-3,2,7,4,wing,0,7);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-3,4,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(6.5,-3,1.8,0,7);ctx.fill();
 ctx.fillStyle=tint?'#fff':'#f0652a';ctx.beginPath();ctx.moveTo(8,1);ctx.lineTo(16,3);ctx.lineTo(8,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
return{init,update,draw,onBeat,on8th,onLine,get S(){return S}}})();
