import {ERAS,TRANS,BAR,BEAT,bar,W,H,LYRICS,hash,clamp,lerp,smooth,blip,noise} from './core';

// ---------- ERA 4: mobile. A phone on a desk running a one-thumb flapping game ----------
export const E4=(()=>{
const s4=ERAS[3].start,s5=ERAS[4].start;
const PW=262,PH=516,PX0=W/2-PW/2,PY0=12;           // phone body
const SX=W/2-115,SY=58,GW=230,GH=424,SB=20;         // screen and status bar
const GY0=SY+SB,GAH=GH-SB,GROUND=GAH-46;            // game area and ground line
const V=130,SPACING=V*BEAT*2,GAP=118,PWD=52,BX=GW*0.3,PIPE0=GW+60;
const G=1500,FLAP=-400;
const ROLES=[['#4df0ff','GEOMETRY'],['#ff5be0','TEXTURE'],['#ffe14d','LIGHTING'],['#ff9a3c','AUDIO'],['#5bff5b','RULES']];
const NOTES=[[56.6,'FLAP!','Game Center connected',0],[58,'★ 4.8','Rate FLAP! on the store',1],[60.5,'▲ 1,204','players online right now',0],[62.5,'◉ Best','New personal best!',1],[65,'♥ 7 days','Daily streak kept',0],[67,'ghost_01','joined your run',1],[69,'+12','ghosts are watching',0],[71,'swarm','a hundred hands appeared',1],[73,'handoff','session moved to agents',0]];
let S:any;
const pipeX=(k,t)=>PIPE0+k*SPACING-Math.max(0,t-s4)*V;
const gapY=k=>178+81*Math.sin(k*0.7)+25*(hash(k*3.7+0.5)-0.5);   // 84..272, step between neighbours <= ~80 px
function init(t){S={bird:{y:GAH/2,vy:0,alive:true,deadT:-9,flapT:-9,inv:0},score:0,best:0,counted:new Set(),words:new Map(),line:[],got:0,ghosts:[],agents:[],ripples:[],flash:0,started:false,parts:[],total:0,signs:0,deaths:0,agentsOut:0};
 const k0=firstPipe(t);for(let k=0;k<k0;k++)S.counted.add(k)}
const firstPipe=t=>{let k=0;while(pipeX(k,t)+PWD<BX-10)k++;return k};
function flap(t){const b=S.bird;b.vy=FLAP;b.flapT=t;S.started=true;S.ripples.push({t});blip(880,0.05,0.08)}
function autoFlap(y,vy,k,t,lastFlap){let c=gapY(k);if(pipeX(k,t)+PWD/2<BX)c+=clamp(gapY(k+1)-c,0,20);return y>c+16&&vy>-80&&t-lastFlap>0.1}
function onLine(words,t){if(t<s4||t>=s5)return;const cur=LYRICS.filter(l=>bar(l[0])<=t+0.01).pop();if(cur&&bar(cur[0])<s4)return;const nx=LYRICS.find(l=>bar(l[0])>t+0.01),tn=Math.min(nx?bar(nx[0]):s5,s5),n=Math.max(1,firstPipe(tn)-firstPipe(t));S.total+=words.length;
 for(let j=0,k=firstPipe(t)+1;j<n;j++){const a=Math.floor(j*words.length/n),b=Math.floor((j+1)*words.length/n);if(b>a)S.words.set(k++,words.slice(a,b).join(' '))}S.signs=S.words.size}
function update(dt,t,inp,auto){if(t<s4-TRANS||t>=s5)return;const b=S.bird;
 if(t>=s4){const k=firstPipe(t);
  if(b.alive){const want=auto?(!S.started||autoFlap(b.y,b.vy,k,t,b.flapT)):(inp.upEdge||inp.fire);if(want)flap(t);
   if(S.started){b.vy+=G*dt;b.y+=b.vy*dt}else b.y=GAH/2+Math.sin(t*4)*6;
   if(b.y<8){b.y=8;b.vy=0}
   // collisions
   b.inv=Math.max(0,b.inv-dt);let hit=b.y>GROUND-12;if(!hit&&b.inv<=0)for(let i=k;i<k+2;i++){const px=pipeX(i,t);if(BX+10>px&&BX-10<px+PWD){const c=gapY(i);if(b.y-9<c-GAP/2||b.y+9>c+GAP/2)hit=true}}
   if(hit&&t<bar(74.4)){b.alive=false;b.deadT=t;b.vy=-150;S.deaths++;S.flash=0.3;S.best=Math.max(S.best,S.score);noise(0.15,0.4,900);blip(110,0.25,0.15)}
   for(let i=k-1;i<k+1;i++){if(i<0||S.counted.has(i))continue;if(pipeX(i,t)+PWD<BX-10){S.counted.add(i);S.score++;const w=S.words.get(i);if(w){S.line.push(w);S.got+=w.split(' ').length;S.words.delete(i);S.signs=S.words.size;blip(1568,0.08,0.1)}else blip(1046,0.06,0.08)}}}
  else{b.vy+=G*dt;b.y=Math.min(GROUND-12,b.y+b.vy*dt);if(t-b.deadT>BEAT*2){b.alive=true;b.y=gapY(k);b.vy=0;b.inv=BEAT*4;S.score=0;for(let i=0;i<=k;i++){S.counted.add(i);S.words.delete(i)}S.signs=S.words.size}}
  // ghosts: perfect players that appear during the bridge
  const n=t>=bar(73)?0:t>=bar(66.5)?Math.min(14,Math.floor((t-bar(66.5))/(BEAT*2))+1):0;while(S.ghosts.length<n){const i=S.ghosts.length;S.ghosts.push({i,y:GAH/2,xo:-(i+1)*13-8,col:'#5bff5b',ph:i*1.7});S.ripples.push({t,ghost:true,i})}
  for(const g of S.ghosts){const kg=firstPipe(t+(-g.xo)/V);const target=gapY(kg)-6+Math.sin(t*5+g.ph)*5;g.y=lerp(g.y,target,1-Math.pow(0.002,dt));if(Math.floor((t+g.ph)/(BEAT*2))!==Math.floor((t+g.ph-dt)/(BEAT*2)))S.ripples.push({t,ghost:true,i:g.i})}
  // ghosts become agents and leave the phone to the right
  if(t>=bar(73)&&S.agents.length===0)for(let i=0;i<14;i++){const g=S.ghosts[i]||{xo:-(i+1)*13-8,y:gapY(k),col:'#5bff5b'};S.agents.push({x:SX+BX+g.xo,y:GY0+g.y,tx:W+120+i*26,ty:70+(i%5)*40+Math.floor(i/5)*22,col:g.col,name:ROLES[i%5][1],born:t+i*0.06})}
  S.agentsOut=0;for(const a of S.agents){if(t<a.born)continue;const k2=1-Math.pow(0.004,dt);a.x+=(a.tx-a.x)*k2;a.y+=(a.ty-a.y)*k2;if(a.x>W)S.agentsOut++}
  if(t>=bar(73))S.ghosts=[]}
 S.flash=Math.max(0,S.flash-dt);S.ripples=S.ripples.filter(r=>t-r.t<0.5)}
function onBeat(_b,_t,_auto){}
function on8th(_n,_t,_auto){}

// ---------------- rendering ----------------
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function draw(ctx,t){const appear=smooth((t-(s4-TRANS))/TRANS),pulse=1-((t/BEAT)%1),b=S.bird;const slide=(1-appear)*640;
 // desk and bokeh
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c0e1c');bg.addColorStop(1,'#1c1230');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.globalAlpha=appear;ctx.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const x=hash(i*1.9)*W,y=hash(i*4.1)*H,r=30+hash(i*7.3)*70;const c=['95,201,224','247,211,60','108,204,60','255,120,180'][i%4];const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${c},${0.10+0.05*Math.sin(t+i)})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}ctx.restore();
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
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(SX,SY,GW,SB);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.fillText('9:41',SX+10,SY+14);for(let i=0;i<5;i++){ctx.fillStyle=i<4?'#fff':'rgba(255,255,255,.35)';ctx.fillRect(SX+56+i*5,SY+8+(4-i),3,3+i)}ctx.font="6px 'Press Start 2P',monospace";ctx.fillText('LTE',SX+86,SY+13);
 ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(SX+GW-34,SY+6,22,9);ctx.fillStyle='#fff';ctx.fillRect(SX+GW-11,SY+8.5,2,4);ctx.fillStyle=S.bird.alive?'#4cd964':'#ff3b30';ctx.fillRect(SX+GW-32,SY+8,18*(0.55+0.45*Math.sin(t*0.1)**2),5);
 // screen glare
 const gl=ctx.createLinearGradient(SX,SY,SX+GW*0.6,SY+GH);gl.addColorStop(0,'rgba(255,255,255,.08)');gl.addColorStop(0.5,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.fillRect(SX,SY,GW,GH);
 ctx.restore();
 // thumb
 const tap=t-b.flapT<0.12?1:0;const ty=PY0+PH-70-tap*10,tx=W/2+72;ctx.save();ctx.translate(tx,ty);ctx.rotate(-0.6);ctx.fillStyle='rgba(0,0,0,.35)';rrect(ctx,-14,-6,40,120,16);ctx.fill();const sk=ctx.createLinearGradient(-16,0,24,0);sk.addColorStop(0,'#e8b894');sk.addColorStop(1,'#c58f6c');ctx.fillStyle=sk;rrect(ctx,-18,-14,38,130,17);ctx.fill();ctx.fillStyle='rgba(255,255,255,.18)';rrect(ctx,-12,-10,10,40,5);ctx.fill();ctx.fillStyle='#f3d9c4';ctx.beginPath();ctx.ellipse(-2,-6,10,7,0,0,7);ctx.fill();ctx.restore();
 for(const r of S.ripples){if(r.ghost)continue;const q=(t-r.t)/0.5;ctx.strokeStyle=`rgba(255,255,255,${(1-q)*0.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(tx-12,ty-10,6+q*36,0,7);ctx.stroke()}
 ctx.restore();
 // notifications around the phone
 ctx.font="7px 'Press Start 2P',monospace";NOTES.forEach(([nb,title,body,side],i)=>{const tb=bar(nb as number);if(t<tb||t>tb+BAR*2.5)return;const age=t-tb,fin=smooth(age/0.35),fout=age>BAR*2.1?1-(age-BAR*2.1)/(BAR*0.4):1;const x=side?W-20-250+(1-fin)*120:20-(1-fin)*120,y=70+(i%4)*62;ctx.save();ctx.globalAlpha=fout*appear;ctx.fillStyle='rgba(28,28,38,.92)';rrect(ctx,x,y,250,48,12);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=['#f7d33c','#6ccc3c','#5fc9e0','#ff5be0'][i%4];rrect(ctx,x+10,y+10,28,28,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(title as string,x+48,y+20);ctx.fillStyle='#9aa0b4';ctx.fillText(body as string,x+48,y+36);ctx.restore()});
 // agents leaving the phone
 for(const a of S.agents){if(t<a.born)continue;const g=ctx.createRadialGradient(a.x,a.y,2,a.x,a.y,24);g.addColorStop(0,hexa(a.col,0.5));g.addColorStop(1,hexa(a.col,0));ctx.fillStyle=g;ctx.fillRect(a.x-24,a.y-24,48,48);const bg2=ctx.createLinearGradient(a.x,a.y-8,a.x,a.y+8);bg2.addColorStop(0,'#fff');bg2.addColorStop(1,a.col);ctx.fillStyle=bg2;ctx.beginPath();ctx.moveTo(a.x,a.y-8);ctx.lineTo(a.x+7,a.y);ctx.lineTo(a.x,a.y+8);ctx.lineTo(a.x-7,a.y);ctx.closePath();ctx.fill();ctx.font="5px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle=a.col;ctx.fillText(a.name,a.x,a.y-13);ctx.textAlign='left'}
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
 // pipes
 const k0=firstPipe(t);for(let k=Math.max(0,k0-1);k<k0+3;k++){const x=pipeX(k,t);if(x>GW+10||x+PWD<-10)continue;const c=gapY(k);
  for(const top of[true,false]){const y0=top?-10:c+GAP/2,y1=top?c-GAP/2:GROUND+10;const pgc=ctx.createLinearGradient(x,0,x+PWD,0);pgc.addColorStop(0,'#5fb83a');pgc.addColorStop(0.35,'#8fe06a');pgc.addColorStop(1,'#4e9f30');ctx.fillStyle=pgc;ctx.fillRect(x,y0,PWD,y1-y0);ctx.strokeStyle='#2f6a1c';ctx.lineWidth=2;ctx.strokeRect(x,y0,PWD,y1-y0);
   const cy=top?y1-22:y0;ctx.fillStyle=pgc;ctx.fillRect(x-4,cy,PWD+8,22);ctx.strokeRect(x-4,cy,PWD+8,22)}
  const w=S.words.get(k);if(w){const fs=w.length>12?6:7;ctx.font=fs+"px 'Press Start 2P',monospace";const tw=w.length*fs+12;ctx.fillStyle='rgba(255,255,255,.92)';rrect(ctx,x+PWD/2-tw/2,c-9,tw,18,5);ctx.fill();ctx.strokeStyle='#2f6a1c';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#2f4a1c';ctx.textAlign='center';ctx.fillText(w,x+PWD/2,c+3);ctx.textAlign='left';ctx.strokeStyle='rgba(47,106,28,.6)';ctx.beginPath();ctx.moveTo(x+PWD/2,c-GAP/2);ctx.lineTo(x+PWD/2,c-9);ctx.stroke()}}
 // ground
 ctx.fillStyle='#ddd894';ctx.fillRect(0,GROUND,GW,GAH-GROUND);ctx.fillStyle='#73c84e';ctx.fillRect(0,GROUND,GW,8);ctx.fillStyle='#5aa83a';ctx.fillRect(0,GROUND+8,GW,2);ctx.fillStyle='#c9c07a';for(let i=-1;i<GW/14+1;i++){const x=i*14-((run*V)%14);ctx.beginPath();ctx.moveTo(x,GROUND+10);ctx.lineTo(x+7,GROUND+10);ctx.lineTo(x+14,GAH);ctx.lineTo(x+7,GAH);ctx.fill()}
 // ghosts
 for(const g of S.ghosts){drawBird(ctx,BX+g.xo,g.y,-0.2,t,g.col,0.55,g.i)}
 // bird
 if(b.alive||t-b.deadT<BAR){const rot=clamp(b.vy/600,-0.5,1.2);const blink=b.inv>0&&Math.floor(t*20)%2;if(!blink)drawBird(ctx,BX,b.y,rot,t,null,1,0)}
 // score and prompts
 ctx.font="18px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#2f3a44';ctx.strokeText(String(S.score),GW/2,52);ctx.fillStyle='#fff';ctx.fillText(String(S.score),GW/2,52);
 if(!S.started&&Math.floor(t*2)%2===0){ctx.font="9px 'Press Start 2P',monospace";ctx.strokeText('TAP TO FLY',GW/2,GAH*0.62);ctx.fillStyle='#f7d33c';ctx.fillText('TAP TO FLY',GW/2,GAH*0.62)}
 if(!b.alive){const q=smooth((t-b.deadT)/0.3);ctx.save();ctx.globalAlpha=q;ctx.fillStyle='#f3e4b0';rrect(ctx,GW/2-88,GAH*0.3,176,110,8);ctx.fill();ctx.strokeStyle='#8a6a2a';ctx.lineWidth=2;ctx.stroke();ctx.font="11px 'Press Start 2P',monospace";ctx.fillStyle='#e06a1a';ctx.fillText('GAME OVER',GW/2,GAH*0.3+24);ctx.font="7px 'Press Start 2P',monospace";ctx.fillStyle='#6a5a2a';ctx.textAlign='left';ctx.fillText('SCORE',GW/2+8,GAH*0.3+48);ctx.fillText('BEST',GW/2+8,GAH*0.3+76);ctx.textAlign='right';ctx.fillStyle='#2f3a44';ctx.font="10px 'Press Start 2P',monospace";ctx.fillText(String(S.score),GW/2+80,GAH*0.3+50);ctx.fillText(String(S.best),GW/2+80,GAH*0.3+78);
  const mg=ctx.createRadialGradient(GW/2-48,GAH*0.3+62,2,GW/2-48,GAH*0.3+62,20);mg.addColorStop(0,'#ffe9a0');mg.addColorStop(1,S.score>=10?'#e0b020':'#b08050');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(GW/2-48,GAH*0.3+62,20,0,7);ctx.fill();ctx.font="6px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle='#fff';if(Math.floor(t*2)%2===0)ctx.fillText('TAP TO RETRY',GW/2,GAH*0.3+100);ctx.restore()}
 ctx.textAlign='left';
 // collected lyric line
 if(S.line.length){ctx.font="6px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.9)';ctx.strokeStyle='rgba(47,58,68,.8)';ctx.lineWidth=2;let s='';for(let i=S.line.length-1;i>=0&&s.length+S.line[i].length<36;i--)s=S.line[i]+(s?' '+s:'');ctx.strokeText(s,GW/2,GROUND-8);ctx.fillText(s,GW/2,GROUND-8);ctx.textAlign='left'}
 ctx.restore()}
function drawBird(ctx,x,y,rot,t,tint,alpha,seed){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rot);
 const body=tint||'#f7d33c',dark=tint?hexa(tint,0.9):'#d9a51c';ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,12,9,0,0,7);ctx.fill();ctx.strokeStyle=tint?'rgba(255,255,255,.6)':'#5a4010';ctx.lineWidth=1.5;ctx.stroke();
 const wing=Math.sin(t*22+seed)*0.6;ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(-3,2,7,4,wing,0,7);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-3,4,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(6.5,-3,1.8,0,7);ctx.fill();
 ctx.fillStyle=tint?'#fff':'#f0652a';ctx.beginPath();ctx.moveTo(8,1);ctx.lineTo(16,3);ctx.lineTo(8,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
return{init,update,draw,onBeat,on8th,onLine,get S(){return S}}})();
