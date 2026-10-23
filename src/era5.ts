import {ERAS,bar,BAR,BEAT,TRANS,W,H,rngf,hash,clamp,lerp,smooth,mk,cv,pix,blip,hat} from './core';
import {WD,CODE_RAIN} from './world';

// ---------- ERA 5: agents build a future city, left to right, while you play it ----------
export const E5=(()=>{
const s5=ERAS[4].start,T0=bar(77),CW=240,SPD=CW/BAR,GY=H*0.66,HZ=H*0.70,PX=300;
const RULES=[[77,'RUN + JUMP','< >  SPEED     ^  JUMP'],[79,'WEAPON ONLINE','SPACE  FIRE'],[83,'DOUBLE JUMP','^  AGAIN  MID-AIR'],[86,'LOW GRAVITY','FLOAT  BETWEEN  BEATS'],[89,'BOSS COMPILED','SHOOT  THE  WORDS']];
const DRONE=['..X..X..','.XXXXXX.','XX.XX.XX','XXXXXXXX','.X.XX.X.','X......X'];
const PAINT=BAR*0.35,POWER=BAR*0.3;
const wire=k=>k<=3?bar(75+k*0.5):bar(k+73.2),fill=k=>wire(k)+BAR*0.6,lit=k=>fill(k)+BAR*0.4,lightsOn=k=>lit(k)+POWER*0.5;
const camAt=t=>Math.max(0,t-T0)*SPD;
const CYAN='#4df0ff',MAG='#ff5be0',YEL='#ffe14d',ORG='#ff9a3c',GRN='#5bff5b';
const RGB={[CYAN]:'rgb(77,240,255)',[MAG]:'rgb(255,91,224)',[YEL]:'rgb(255,225,77)',[ORG]:'rgb(255,154,60)',[GRN]:'rgb(91,255,91)','#fff':'rgb(255,255,255)'};
const bloomC=mk(W/4,H/4);
let S:any;
function genChunk(k){const r=rngf(k*7919+13),x0=k*CW,c={k,x0,plats:[],pads:[],towers:[],lamps:[],speakers:[],drones:[],gate:null,orbs:[],type:'flat'};
 const nt=1+Math.floor(r()*2);for(let i=0;i<nt;i++){const w=54+r()*70;c.towers.push({x:x0+r()*(CW-w),w,h:110+r()*250,seed:Math.floor(r()*1e6),hue:r()<0.5?CYAN:MAG,holo:r()<0.6})}
 let type='flat';if(k>=4&&k<16){const u=r();type=u<0.28?'flat':u<0.5?'gap':u<0.7?'raised':u<0.85?'split':'gate'}c.type=type;
 if(type==='flat')c.plats.push({x0,x1:x0+CW,y:GY});
 else if(type==='gap'){c.plats.push({x0,x1:x0+70,y:GY});c.plats.push({x0:x0+CW-70,x1:x0+CW,y:GY});c.pads.push({x:x0+CW/2,y:GY-26})}
 else if(type==='raised'){c.plats.push({x0,x1:x0+40,y:GY});c.plats.push({x0:x0+60,x1:x0+CW,y:GY-56})}
 else if(type==='split'){c.plats.push({x0,x1:x0+CW,y:GY});c.plats.push({x0:x0+50,x1:x0+CW-50,y:GY-92,rail:true})}
 else{c.plats.push({x0,x1:x0+CW,y:GY});c.gate={x:x0+CW/2,low:r()<0.6,hit:false,passed:false}}
 if(r()<0.55&&type!=='gate')c.lamps.push({x:x0+20+r()*40});if(k%3===1)c.speakers.push({x:x0+CW-44});
 if(k>=6&&k<16&&k%2===0){const n=2+Math.floor(r()*3);c.drones.push({x:x0+40,y:GY-70-r()*60,n,alive:Array(n).fill(true),ph:r()*6})}
 if(type!=='gate'&&k>=4&&k<16)for(let i=0;i<4;i++)c.orbs.push({x:x0+CW/8+i*CW/4,y:GY-62-Math.sin((k*4+i)*0.8)*26,got:0});
 return c}
const chunk=k=>{let c=S.chunks.get(k);if(!c){c=genChunk(k);S.chunks.set(k,c)}return c};
function allPlats(x){const k=Math.floor(x/CW);const out=[];for(let i=k-1;i<=k+1;i++){if(i<0)continue;const c=chunk(i);out.push(...c.plats);for(const p of c.pads)out.push({x0:p.x-26,x1:p.x+26,y:p.y,pad:true})}return out}
const platUnder=(x,y)=>allPlats(x).find(p=>x>=p.x0-4&&x<=p.x1+4&&Math.abs(p.y-y)<1);
const platAt=x=>allPlats(x).filter(p=>x>=p.x0&&x<=p.x1).sort((a,b)=>b.y-a.y)[0];
function log(text,col){S.log.unshift({text,col});if(S.log.length>5)S.log.pop()}
function pick(role){const list=S.agents.filter(a=>a.role===role);if(!list.length)return null;return list.reduce((m,a)=>(a.job?1e9:a.lastT)<(m.job?1e9:m.lastT)?a:m)}
function job(role,j,text,panel){const a=pick(role);if(!a)return;a.lastT=j.start;a.job=j;a.status=text;if(panel)a.panel={t:j.start,lines:WD.CODE[role].map(l=>l.replace('${x}',j.k??0).replace('${y}',Math.round(GY)).replace('${z}',1))};log(WD.ROLE[role].n+' > '+text,a.col)}
function makeBoss(t){const plates=[];for(let r=0;r<8;r++)for(let c=0;c<11;c++)if(WD.INVPAT[r][c]==='X')plates.push({r,c,alive:true,word:null});S.boss={x:W-340,y:178,sx:W-340,sy:178,plates,wireT:bar(88.25),fillT:bar(89),hp:plates.length,dead:false};for(const w of S.bossWords)bossWord(w)}
function bossWord(w){const b=S.boss;if(!b)return;const free=b.plates.filter(p=>p.alive&&!p.word&&!b.plates.some(q=>q.word&&Math.max(Math.abs(q.r-p.r),Math.abs(q.c-p.c))<2));const pool=free.length?free:b.plates.filter(p=>p.alive&&!p.word);if(!pool.length)return;const p=pool[Math.floor(hash(S.bossWords.length*3+w.length)*pool.length)];p.word=w}
function tick(t,replay){const cam=camAt(t);
 for(let k=Math.max(0,Math.floor(cam/CW)-1);k<=Math.floor((cam+W)/CW)+3;k++){const c=chunk(k);const id=String(k).padStart(2,'0');
  if(t>=wire(k)&&!S.done.has('w'+k)){S.done.add('w'+k);if(!replay){job('G',{kind:'wire',k,start:wire(k),end:fill(k)},'WIRING SECTOR '+id,true);if(c.towers.length)job('G',{kind:'wiretower',k,start:wire(k),end:fill(k)},'FRAMING TOWER '+id,false)}}
  if(t>=fill(k)&&!S.done.has('f'+k)){S.done.add('f'+k);if(!replay){job('T',{kind:'paint',k,start:fill(k),end:fill(k)+PAINT},'PAINTING SECTOR '+id,false);if(c.speakers.length)job('A',{kind:'speaker',k,start:fill(k),end:fill(k)+PAINT},'SPEAKER '+id,false);blip(330+(k%5)*40,0.06,0.06)}}
  if(t>=lit(k)&&!S.done.has('l'+k)){S.done.add('l'+k);if(!replay&&(c.lamps.length||c.towers.length))job('L',{kind:'power',k,start:lit(k),end:lit(k)+POWER},'POWERING SECTOR '+id,false)}}
 RULES.forEach((r,i)=>{if(t>=bar(r[0])&&!S.done.has('rule'+i)){S.done.add('rule'+i);S.rules.push(i);S.ruleT=bar(r[0]);S.ruleIdx=i;if(!replay){job('R',{kind:'rule',k:i,start:bar(r[0]),end:bar(r[0])+BAR*1.5},'RULE: '+r[1],true);blip(523,0.1);blip(784,0.2,0.1)}if(i===4)makeBoss(t)}});
 if(t>=bar(88.25)&&!S.done.has('boss')){S.done.add('boss');if(!S.boss)makeBoss(t);if(!replay){for(const a of S.agents)if(a.role!=='R'){a.job={kind:'boss',start:bar(88.25),end:bar(89.2),seed:a.i};a.status='COMPILING BOSS'}log('SWARM > COMPILE BOSS.EXE',GRN)}}
 if(t>=bar(94)&&!S.done.has('retreat')){S.done.add('retreat');log('SWARM > DISENGAGE',CYAN)}}
function init(t){S={chunks:new Map(),signs:[],bullets:[],bolts:[],parts:[],agents:[],log:[],line:[],score:0,words:0,combo:0,rules:[],ruleT:-9,ruleIdx:-1,boss:null,flash:0,flashCol:'255,91,224',done:new Set(),bossWords:[],lastFire:-9,landFx:null,shots:0,beatT:-9};
 S.player={x:PX,off:0,y:-80,vy:0,ground:false,jumps:0,stun:0,trail:[]};
 for(let i=0;i<10;i++){const role='GTGLTGATGR'[i],R=WD.ROLE[role];S.agents.push({i,role,col:R.c,rgb:R.rgb,x:-160-i*40,y:90+i*26,vx:0,tx:0,ty:0,job:null,status:'ARRIVING',beam:null,panel:null,ph:i*1.3,alpha:1,lastT:-1})}
 const cam=camAt(t);for(let k=0;k<=Math.floor((cam+W)/CW)+3;k++)chunk(k);
 const p=S.player;p.x=cam+PX;if(t>=bar(76.9)){const pl=platAt(p.x);p.y=pl?pl.y:GY;p.ground=true}
 tick(t,true);for(const a of S.agents){idle(a,cam,t);a.x=a.tx;a.y=a.ty}}
function idle(a,cam,t){if(a.role==='R'){a.tx=S.player.x+44;a.ty=Math.min(S.player.y,GY)-112+Math.sin(t*1.5+a.ph)*6;a.status='ESCORT';return}const col=a.i%5,row=Math.floor(a.i/5);a.tx=cam+W-262+col*52-row*26+Math.sin(t*0.9+a.ph)*8;a.ty=128+row*74+Math.abs(col-2)*16+Math.sin(t*1.7+a.ph)*6;a.status='STANDBY'}
function fire(t){const p=S.player;if(t-S.lastFire<0.14)return;S.lastFire=t;S.bullets.push({x:p.x+12,y:p.y-22,vx:640});S.shots++;blip(1046,0.05,0.08)}
function burst(x,y,c,n,sp){for(let i=0;i<n;i++)S.parts.push({x,y,vx:(Math.random()-.5)*sp,vy:(Math.random()-.8)*sp,l:0.5+Math.random()*0.4,c})}
function targetsAhead(p,cam){const out=[];const k0=Math.floor(p.x/CW);for(let k=k0;k<=k0+3;k++){const c=chunk(k);for(const d of c.drones)d.alive.forEach((al,i)=>{if(al)out.push({x:d.x+i*36+8,y:d.y+8,kind:'drone'})})}
 for(const s of S.signs)if(!s.lit&&s.x>p.x)out.push({x:s.x,y:s.y-6,kind:'sign'});
 if(S.boss&&!S.boss.dead&&S.boss.fillT<=S.t){const b=S.boss;for(const q of b.plates)if(q.alive)out.push({x:cam+b.sx+q.c*14+7,y:b.sy+q.r*14+7,kind:'plate'})}return out}
function jobTarget(a,t,cam){const j=a.job;const pr=clamp((t-j.start)/(j.end-j.start),0,1);
 if(j.kind==='wire'||j.kind==='paint'){const c=chunk(j.k);const fx=c.x0+pr*CW;const pl=platAt(Math.min(fx,c.x0+CW-1))||{y:GY};a.tx=fx-(j.kind==='wire'?18:0);a.ty=pl.y-(j.kind==='wire'?96:120);a.beam={x:fx,y:pl.y+6};if(Math.random()<0.7)S.parts.push({x:fx,y:pl.y+Math.random()*14,vx:(Math.random()-.5)*50,vy:-40-Math.random()*90,l:0.35,c:a.col})}
 else if(j.kind==='wiretower'){const c=chunk(j.k),tw=c.towers[0];const ty=HZ-tw.h*pr;a.tx=tw.x+tw.w+26;a.ty=ty-30;a.beam={x:tw.x+tw.w/2,y:ty};if(Math.random()<0.5)S.parts.push({x:tw.x+Math.random()*tw.w,y:ty,vx:(Math.random()-.5)*40,vy:-30-Math.random()*60,l:0.3,c:a.col})}
 else if(j.kind==='power'){const c=chunk(j.k);const l=c.lamps[0],tw=c.towers[0];const x=l?l.x:tw.x+tw.w/2,y=l?GY-70:HZ-tw.h;a.tx=x+30;a.ty=y-60;a.beam={x,y}}
 else if(j.kind==='speaker'){const c=chunk(j.k),s=c.speakers[0];a.tx=s.x+15;a.ty=GY-110;a.beam={x:s.x+15,y:GY-21}}
 else if(j.kind==='rule'){a.tx=S.player.x+40;a.ty=Math.min(S.player.y,GY)-110;a.beam=pr<0.6?{x:S.player.x,y:S.player.y-20}:null}
 else if(j.kind==='boss'&&S.boss){const b=S.boss;const ang=j.seed*0.7+t*0.8;a.tx=cam+b.sx+77+Math.cos(ang)*120;a.ty=b.sy+56+Math.sin(ang)*80;const pl=b.plates[Math.floor(hash(Math.floor(t*5)+j.seed)*b.plates.length)];a.beam={x:cam+b.sx+pl.c*14+7,y:b.sy+pl.r*14+7}}
 return pr}
function update(dt,t,inp,auto){if(t<s5-TRANS)return;S.t=t;const cam=camAt(t);tick(t,false);
 for(let k=Math.max(0,Math.floor(cam/CW)-1);k<=Math.floor((cam+W)/CW)+3;k++)chunk(k);
 const p=S.player,lowG=S.rules.includes(3),canFire=S.rules.includes(1),dbl=S.rules.includes(2),g=lowG?620:1100,jv=lowG?-340:-440;
 if(t>=bar(76.5)&&t<bar(94)){
  let want=0;if(!auto)want=inp.right?1:inp.left?-1:0;p.off+=(want?want*120:-p.off*3)*dt;p.off=clamp(p.off,-150,150);p.x=cam+PX+p.off;
  const pl=platUnder(p.x,p.y);if(p.ground&&!pl)p.ground=false;
  const cur=platAt(p.x);let jump=false;
  if(auto){const tg=targetsAhead(p,cam);
   if(p.ground){if(cur&&p.x>cur.x1-46){const nxt=allPlats(p.x+120).find(q=>q.x0>=cur.x1-2&&q.x0<cur.x1+230);if(nxt||!cur.pad)jump=true}
    const c=chunk(Math.floor(p.x/CW));if(c.gate&&!c.gate.hit){const d=c.gate.x-p.x;if(c.gate.low&&d>0&&d<70)jump=true;if(!c.gate.low&&d>-30&&d<90)jump=false}
    else if(tg.some(q=>q.x-p.x>40&&q.x-p.x<260&&q.y<p.y-40&&q.y>p.y-150))jump=true;
    else if(S.boss&&!S.boss.dead&&t>=bar(89)&&Math.floor(t/BEAT)%4===0&&(t%BEAT)<dt*2)jump=true}
   else if(dbl&&p.jumps===1&&p.vy>60&&tg.some(q=>q.x-p.x>0&&q.x-p.x<300&&q.y<p.y-120))jump=true}
  else jump=inp.upEdge;
  if(jump){if(p.ground){p.vy=jv;p.ground=false;p.jumps=1;blip(660,0.07,0.07)}else if(dbl&&p.jumps===1){p.vy=jv*0.9;p.jumps=2;burst(p.x,p.y,CYAN,10,160);blip(880,0.07,0.07)}}
  if(!p.ground){const oy=p.y;p.vy+=g*dt;p.y+=p.vy*dt;if(p.vy>0)for(const q of allPlats(p.x)){if(p.x>=q.x0-4&&p.x<=q.x1+4&&oy<=q.y+0.01&&p.y>=q.y){p.y=q.y;p.vy=0;p.ground=true;p.jumps=0;S.landFx={x:p.x,y:p.y,t};hat(false);break}}}
  if(p.y>H+80){const nxt=allPlats(p.x+200).filter(q=>q.x0>p.x&&!q.pad).sort((a,b)=>a.x0-b.x0)[0]||{x0:p.x+60,y:GY};p.x=nxt.x0+24;p.off=clamp(p.x-cam-PX,-150,150);p.x=cam+PX+p.off;p.y=nxt.y-220;p.vy=0;p.ground=false;p.jumps=1;S.score=Math.max(0,S.score-50);S.combo=0;S.flash=0.35;S.flashCol='255,60,80'}
  const gc=chunk(Math.floor(p.x/CW));if(gc.gate){const gt=gc.gate;if(Math.abs(p.x-gt.x)<10&&!gt.hit&&!gt.passed){const blocked=gt.low?p.y>GY-46:(p.y-40)<GY-92;if(blocked){gt.hit=true;p.stun=0.5;S.score=Math.max(0,S.score-30);S.combo=0;S.flash=0.3;S.flashCol='255,60,80';blip(110,0.2,0.15)}else{gt.passed=true;S.score+=40;S.combo++;blip(1320,0.08,0.08)}}}
  for(const o of gc.orbs)if(!o.got&&Math.abs(o.x-p.x)<16&&Math.abs(o.y-(p.y-20))<24){o.got=t;S.score+=10;S.combo++;blip([523,659,784,1046][Math.floor(o.x/60)%4],0.1,0.08)}
  for(const s of S.signs)if(!s.lit&&Math.abs(s.x-p.x)<34&&Math.abs(s.y-(p.y-26))<40)litSign(s,t);
  const wantFire=auto?(S.autoFire&&canFire):(inp.fire&&canFire);if(wantFire)fire(t);S.autoFire=false;
  p.stun=Math.max(0,p.stun-dt);p.trail.push({x:p.x,y:p.y-18,l:0.35});if(p.trail.length>18)p.trail.shift()}
 else if(t<bar(76.5)){p.x=cam+PX;p.y=-80}
 for(const q of p.trail)q.l-=dt;p.trail=p.trail.filter(q=>q.l>0);
 for(const b of S.bullets){b.x+=b.vx*dt;const k=Math.floor(b.x/CW);
  for(let i=k-1;i<=k+1&&!b.hit;i++){if(i<0)continue;for(const d of chunk(i).drones)d.alive.forEach((al,j)=>{if(!al||b.hit)return;const dx=d.x+j*36,dy=d.y+Math.sin(t*3+d.ph+j)*4;if(b.x>dx-2&&b.x<dx+18&&b.y>dy-4&&b.y<dy+16){d.alive[j]=false;b.hit=true;S.score+=100;S.combo++;burst(dx+8,dy+6,MAG,16,220);blip(220,0.12,0.15)}})}
  for(const s of S.signs)if(!b.hit&&!s.lit&&b.x>s.x-s.text.length*4-6&&b.x<s.x+s.text.length*4+6&&b.y>s.y-14&&b.y<s.y+6){b.hit=true;litSign(s,t)}
  if(S.boss&&!S.boss.dead&&t>=S.boss.fillT&&!b.hit){const bo=S.boss,sx=b.x-cam;for(const q of bo.plates){if(!q.alive)continue;const px=bo.sx+q.c*14,py=bo.sy+q.r*14;if(sx>=px&&sx<=px+14&&b.y>=py&&b.y<=py+14){q.alive=false;b.hit=true;bo.hp--;if(q.word){S.words++;S.line.push(q.word);S.score+=100;burst(cam+px+7,py+7,GRN,18,260);blip(1568,0.12,0.12)}else{S.score+=20;burst(cam+px+7,py+7,MAG,8,160);blip(330,0.06,0.08)}S.combo++;break}}}}
 S.bullets=S.bullets.filter(b=>!b.hit&&b.x-cam<W+30);
 for(const b of S.bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;if(!b.hit&&p.stun<=0&&b.x>p.x-12&&b.x<p.x+12&&b.y>p.y-44&&b.y<p.y+2){b.hit=true;p.stun=0.5;S.score=Math.max(0,S.score-30);S.combo=0;S.flash=0.3;S.flashCol='255,60,80';burst(p.x,p.y-20,MAG,10,180);blip(110,0.2,0.15)}}
 S.bolts=S.bolts.filter(b=>!b.hit&&b.x-cam>-40&&b.x-cam<W+40&&b.y<H+40&&b.y>-40);
 for(const q of S.parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=200*dt;q.l-=dt}if(S.parts.length>400)S.parts.splice(0,S.parts.length-400);S.parts=S.parts.filter(q=>q.l>0);
 S.signs=S.signs.filter(s=>s.x>cam-200);S.flash=Math.max(0,S.flash-dt);
 for(const a of S.agents){if(a.job&&t>=a.job.end)a.job=null;
  if(t>=bar(94)){a.tx=cam-300-a.i*40;a.ty=120+a.i*20;a.beam=null;a.alpha=Math.max(0,1-(t-bar(94))/(BAR*0.8));a.status='RETURNING'}
  else if(a.job)jobTarget(a,t,cam);else{a.beam=null;idle(a,cam,t)}
  const ox=a.x,k=1-Math.pow(0.0005,dt);a.x+=(a.tx-a.x)*k;a.y+=(a.ty-a.y)*k;a.vx=lerp(a.vx,(a.x-ox)/Math.max(dt,0.001),0.2)}
 if(S.boss){const b=S.boss;b.sx=b.x+Math.sin(t*0.7)*26;b.sy=b.y+Math.sin(t*2)*16;if(!b.dead&&(t>=bar(94)||b.plates.every(q=>!q.alive))){b.dead=true;b.deadT=t;for(const q of b.plates)if(q.alive)burst(cam+b.sx+q.c*14+7,b.sy+q.r*14+7,GRN,2,200)}}}
function litSign(s,t){s.lit=t;S.words++;S.score+=50;S.combo++;S.line.push(s.text);burst(s.x,s.y-6,YEL,12,160);blip(1760,0.1,0.1)}
function onBeat(b,t,auto){if(t<s5)return;S.beatT=t;const cam=camAt(t),p=S.player,q=b%4;
 if(q===0&&t>=bar(79)&&t<bar(94)){const k0=Math.floor(cam/CW);for(let k=k0;k<=k0+4;k++){for(const d of chunk(k).drones){const idx=d.alive.findIndex(a=>a);if(idx<0)continue;const sx=d.x+idx*36+8,sy=d.y+8;if(sx-cam<W-40&&sx>p.x-40){const dx=p.x-sx,dy=p.y-20-sy,L=Math.hypot(dx,dy)||1;S.bolts.push({x:sx,y:sy,vx:dx/L*190,vy:dy/L*190})}}}}
 if(S.boss&&!S.boss.dead&&(q===0||q===2)&&t>=bar(89.5)&&t<bar(94)){const bo=S.boss,sx=cam+bo.sx+77,sy=bo.sy+112;for(let i=-1;i<=1;i++){const dx=p.x-sx,dy=p.y-20-sy,ang=Math.atan2(dy,dx)+i*0.22;S.bolts.push({x:sx,y:sy,vx:Math.cos(ang)*230,vy:Math.sin(ang)*230})}}}
function on8th(n,t,auto){if(t<bar(79)||t>=bar(94)||!auto||!S.player)return;const p=S.player,cam=camAt(t);const tg=targetsAhead(p,cam);if(tg.some(q=>q.x>p.x+20&&q.x-p.x<520&&Math.abs(q.y-(p.y-22))<(q.kind==='plate'?8:22)))S.autoFire=true}
function onLine(words,t){if(t<s5-TRANS)return;if(t>=bar(88.25)){S.bossWords.push(...words);if(S.boss)for(const w of words)bossWord(w);return}
 const k=Math.max(0,Math.round(t/BAR)-73);chunk(k);chunk(k+1);words.forEach((w,i)=>{const x=k*CW+30+i*((2*CW-60)/Math.max(1,words.length-1||1));const pl=platAt(x);const y=(pl?pl.y:GY)-104-(i%3)*34;S.signs.push({x,y,text:w,lit:0})})}

// ---------------- 3D agent models ----------------
const v3sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],v3dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],v3cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const LIGHT3=(()=>{const l=[-0.45,0.8,-0.5],n=Math.hypot(...l);return l.map(v=>v/n)})();
function mBox(cx,cy,cz,w,h,d,col,a=1){const v=[];for(let i=0;i<8;i++)v.push([cx+(i&1?w/2:-w/2),cy+(i&2?h/2:-h/2),cz+(i&4?d/2:-d/2)]);const F=[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]];return{v,f:F.map(i=>({i,c:col,a})),center:[cx,cy,cz]}}
function mPrism(cx,cy,cz,r,h,n,col,ang0=0,a=1){const v=[];for(let k=0;k<2;k++)for(let i=0;i<n;i++){const an=ang0+i*2*Math.PI/n;v.push([cx+Math.cos(an)*r,cy+(k?h/2:-h/2),cz+Math.sin(an)*r])}const f=[];for(let i=0;i<n;i++){const j=(i+1)%n;f.push({i:[i,j,n+j,n+i],c:col,a})}f.push({i:[...Array(n).keys()],c:col,a});f.push({i:[...Array(n).keys()].map(k=>n+k),c:col,a});return{v,f,center:[cx,cy,cz]}}
function mOcta(cx,cy,cz,r,col,a=1){const v=[[cx,cy+r,cz],[cx,cy-r,cz],[cx+r,cy,cz],[cx-r,cy,cz],[cx,cy,cz+r],[cx,cy,cz-r]];return{v,f:[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]].map(i=>({i,c:col,a})),center:[cx,cy,cz]}}
function rot3(p,rx,ry,rz){let[x,y,z]=p;let c=Math.cos(ry),s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rx);s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];return[x,y,z]}
function drawModel(ctx,meshes,sx,sy,scale,rx,ry,rz,alpha){const F=240/scale;const faces=[];
 for(const m of meshes){const tv=m.v.map(p=>rot3(p,rx,ry,rz)),tc=rot3(m.center,rx,ry,rz);const pv=tv.map(p=>{const k=F/(F+p[2]);return{x:sx+p[0]*scale*k,y:sy-p[1]*scale*k}});
  for(const f of m.f){const a=tv[f.i[0]],b=tv[f.i[1]],c=tv[f.i[2]];let n=v3cross(v3sub(b,a),v3sub(c,a));const fc=[0,1,2].map(k=>f.i.reduce((q,ix)=>q+tv[ix][k],0)/f.i.length);if(v3dot(n,v3sub(fc,tc))<0)n=n.map(v=>-v);const view=[-fc[0],-fc[1],-F-fc[2]];if(v3dot(n,view)<=0)continue;const L=Math.hypot(...n)||1;const sh=0.62+0.6*Math.max(0,v3dot(n.map(v=>v/L),LIGHT3));faces.push({pts:f.i.map(k=>pv[k]),col:`rgba(${Math.round(clamp(f.c[0]*sh,0,255))},${Math.round(clamp(f.c[1]*sh,0,255))},${Math.round(clamp(f.c[2]*sh,0,255))},${(f.a??1)*alpha})`,d:fc[2]})}}
 faces.sort((p,q)=>q.d-p.d);for(const f of faces){ctx.fillStyle=f.col;ctx.beginPath();ctx.moveTo(f.pts[0].x,f.pts[0].y);for(let k=1;k<f.pts.length;k++)ctx.lineTo(f.pts[k].x,f.pts[k].y);ctx.closePath();ctx.fill()}}
const SHELL=[74,86,150],SHELL2=[110,124,190],WHITE=[255,255,255];
function agentModel(rgb,t,working){const bright=rgb.map(v=>Math.min(255,v*0.85+40));const m=[mOcta(0,0,0,6.5,bright)];
 m.push(mBox(9.5,0,0,3,4.5,9,SHELL),mBox(-9.5,0,0,3,4.5,9,SHELL),mBox(0,0,9.5,9,4.5,3,SHELL),mBox(0,0,-9.5,9,4.5,3,SHELL));
 m.push(mBox(13.5,0,0,9,1.6,1.6,SHELL2),mBox(-13.5,0,0,9,1.6,1.6,SHELL2),mBox(0,0,13.5,1.6,1.6,9,SHELL2),mBox(0,0,-13.5,1.6,1.6,9,SHELL2));
 for(const[px,pz]of[[18,0],[-18,0],[0,18],[0,-18]]){m.push(mPrism(px,0,pz,3.2,3.2,6,SHELL2));m.push(mPrism(px,2.6,pz,6.8,0.5,8,rgb,t*(working?34:18)+px,0.4));m.push(mBox(px,-2.4,pz,1.5,1.5,1.5,rgb))}
 m.push(mBox(0,-1,-10.5,5,2,1.4,WHITE),mBox(0,-5,0,4,2.4,4,rgb));return m}
// ---------------- rendering ----------------
function neonLine(ctx,x1,y1,x2,y2,col,w,a){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=col;ctx.lineCap='round';ctx.globalAlpha=a*0.25;ctx.lineWidth=w*4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=a;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function glow(ctx,x,y,r,col,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col.replace(')',`,${a})`).replace('rgb(','rgba('));g.addColorStop(1,col.replace(')',',0)').replace('rgb(','rgba('));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function draw(ctx,t){const cam=camAt(t),pulse=1-((t/BEAT)%1),p=S.player;
 drawScene(ctx,cam,t,pulse,p);
 // post: bloom + grade + vignette
 const bx=bloomC.x;bx.save();bx.filter='blur(5px) saturate(1.6) brightness(1.05)';bx.clearRect(0,0,bloomC.w,bloomC.h);bx.drawImage(cv,0,0,bloomC.w,bloomC.h);bx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.45;ctx.imageSmoothingEnabled=true;ctx.drawImage(bloomC.c,0,0,W,H);ctx.restore();
 ctx.save();ctx.globalCompositeOperation='overlay';const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(77,160,255,.22)');gr.addColorStop(1,'rgba(255,80,200,.22)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);ctx.restore();
 const vg=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.9);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 if(S.flash>0){ctx.fillStyle=`rgba(${S.flashCol},${S.flash*0.5})`;ctx.fillRect(0,0,W,H)}
 drawHUD(ctx,t,pulse);
 if(t>=bar(94.5)){ctx.fillStyle=`rgba(0,0,0,${smooth((t-bar(94.5))/(BAR*0.5))})`;ctx.fillRect(0,0,W,H)}
 if(t>=bar(94.75)){const a=Math.min(1,(t-bar(94.75))/0.5)*(0.8+0.2*pulse);glow(ctx,W/2,H/2,40,'rgb(91,255,91)',a*0.5);ctx.fillStyle=`rgba(91,255,91,${a})`;ctx.fillRect(W/2-3,H/2-3,6,6)}
 if(t>=bar(95)&&Math.floor(t*2)%2===0){ctx.font="14px 'Press Start 2P',monospace";ctx.fillStyle=GRN;ctx.textAlign='center';ctx.fillText('PRESS START',W/2,H/2+50);ctx.textAlign='left'}}
function drawScene(ctx,cam,t,pulse,p){
 // sky
 const g=ctx.createLinearGradient(0,0,0,HZ);g.addColorStop(0,'#04030d');g.addColorStop(0.5,'#180a36');g.addColorStop(0.85,'#45175e');g.addColorStop(1,'#7a2a6a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let i=0;i<110;i++){const sx=(hash(i*3.1)*W*1.4-cam*0.02+W*1.4)%(W*1.4)-W*0.2,sy=hash(i*7.7)*HZ*0.75;ctx.fillStyle=`rgba(255,255,255,${0.25+0.6*Math.abs(Math.sin(t*2+i))})`;ctx.fillRect(sx,sy,hash(i)>0.85?2:1,hash(i)>0.85?2:1)}
 const sunX=W*0.72,sunY=HZ-78,R=130;const sg=ctx.createLinearGradient(0,sunY-R,0,sunY+R);sg.addColorStop(0,'#fff0a0');sg.addColorStop(0.45,'#ff7ab6');sg.addColorStop(1,'#8a2cff');ctx.save();ctx.beginPath();ctx.arc(sunX,sunY,R,0,7);ctx.clip();ctx.fillStyle=sg;ctx.fillRect(sunX-R,sunY-R,R*2,R*2);ctx.fillStyle='#180a36';for(let i=0;i<8;i++){const yy=sunY+6+i*15+(t*9%15);ctx.fillRect(sunX-R,yy,R*2,1.5+i*1.3)}ctx.restore();glow(ctx,sunX,sunY,R*2.4,'rgb(255,110,190)',0.4);
 // aurora bands
 ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const y=60+i*40;const ag=ctx.createLinearGradient(0,y-30,0,y+30);ag.addColorStop(0,'rgba(77,240,255,0)');ag.addColorStop(0.5,`rgba(${i%2?'255,91,224':'77,240,255'},${0.05+0.03*Math.sin(t+i)})`);ag.addColorStop(1,'rgba(77,240,255,0)');ctx.fillStyle=ag;ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=W;x+=40)ctx.lineTo(x,y+Math.sin(x*0.01+t*0.5+i)*18);ctx.lineTo(W,y+60);ctx.lineTo(0,y+60);ctx.fill()}ctx.restore();
 ctx.save();ctx.globalAlpha=0.07;ctx.fillStyle=GRN;ctx.font="9px ui-monospace,monospace";for(let c=0;c<12;c++){const x=30+c*80;const off=(t*(20+(c%4)*7)+c*140)%(HZ+200);for(let k=0;k<5;k++)ctx.fillText(CODE_RAIN[(c*3+k)%CODE_RAIN.length],x,HZ-((off+k*40)%(HZ+200))+100)}ctx.restore();
 // far city, three parallax layers
 for(const L of([[0.04,'#0f0828',0.5,78,0.25],[0.09,'#160c38',0.68,58,0.4],[0.16,'#1d1148',0.8,44,0.6]] as any[])){const sp=L[3];for(let i=Math.floor(cam*L[0]/sp)-1;i<Math.floor((cam*L[0]+W)/sp)+2;i++){const x=i*sp-cam*L[0],h=40+hash(i*1.7+L[0])*HZ*L[2]*0.62,w=sp-5;ctx.fillStyle=L[1];ctx.fillRect(x,HZ-h,w,h);
   const n=Math.floor(h/9);for(let j=0;j<n;j++)for(let m=0;m<3;m++){if(hash(i*91+j*7+m+L[0]*10)>0.74){ctx.fillStyle=hash(i+j+m)>0.5?`rgba(77,240,255,${L[4]})`:`rgba(255,200,120,${L[4]})`;ctx.fillRect(x+5+m*(w/3),HZ-h+4+j*9,3,3)}}
   if(hash(i*13+L[0])>0.7){ctx.fillStyle=Math.floor(t*2+i)%2?'#ff3050':'#400';ctx.fillRect(x+w/2,HZ-h-6,2,2)}}}
 // air traffic
 ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<7;i++){const y=50+i*28+Math.sin(t+i)*4,L=W+260,x=((t*(90+i*35)+i*300-cam*0.08)%L+L)%L-130,dir=i%2?1:-1;const tg=ctx.createLinearGradient(x,0,x+40*dir,0);tg.addColorStop(0,'rgba(255,255,255,0)');tg.addColorStop(1,i%2?'rgba(255,120,200,.9)':'rgba(120,230,255,.9)');ctx.strokeStyle=tg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40*dir,y);ctx.stroke()}ctx.restore();
 // haze band at horizon
 const hz=ctx.createLinearGradient(0,HZ-90,0,HZ+4);hz.addColorStop(0,'rgba(140,70,180,0)');hz.addColorStop(1,'rgba(160,80,200,.35)');ctx.fillStyle=hz;ctx.fillRect(0,HZ-90,W,94);
 // grid floor
 ctx.save();ctx.beginPath();ctx.rect(0,HZ,W,H-HZ);ctx.clip();const fg=ctx.createLinearGradient(0,HZ,0,H);fg.addColorStop(0,'#2a0f45');fg.addColorStop(1,'#07050f');ctx.fillStyle=fg;ctx.fillRect(0,HZ,W,H-HZ);
 ctx.strokeStyle='rgba(255,91,224,.35)';ctx.lineWidth=1;for(let i=-22;i<=22;i++){const xb=W/2+i*110-((cam*0.6)%110);ctx.beginPath();ctx.moveTo(W/2+(xb-W/2)*0.02,HZ);ctx.lineTo(xb,H+20);ctx.stroke()}
 for(let j=0;j<10;j++){const v=((j+t*1.6)%10)/10;const yy=HZ+(H-HZ)*v*v;ctx.globalAlpha=0.15+v*0.5;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke()}ctx.restore();
 // reflections
 ctx.save();ctx.beginPath();ctx.rect(0,HZ,W,H-HZ);ctx.clip();ctx.translate(0,2*HZ);ctx.scale(1,-1);ctx.globalAlpha=0.22;drawLevel(ctx,cam,t,pulse,true);drawBoss(ctx,cam,t,pulse,true);ctx.restore();
 const rg=ctx.createLinearGradient(0,HZ,0,H);rg.addColorStop(0,'rgba(8,6,20,0)');rg.addColorStop(1,'rgba(8,6,20,.95)');ctx.fillStyle=rg;ctx.fillRect(0,HZ,W,H-HZ);
 neonLine(ctx,0,HZ,W,HZ,MAG,1.5,0.7);
 drawLevel(ctx,cam,t,pulse,false);
 // embers
 ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<36;i++){const L=W*1.2,x=((hash(i)*L+t*(8+hash(i*2)*18)-cam*0.35)%L+L)%L-W*0.1,y=(hash(i*3)*H+Math.sin(t*0.7+i)*20+H)%H;glow(ctx,x,y,5,i%3?'rgb(77,240,255)':'rgb(255,91,224)',0.25+0.2*Math.sin(t*3+i))}ctx.restore();
 for(const q of S.parts){ctx.globalAlpha=Math.min(1,q.l*2);ctx.fillStyle=q.c;ctx.fillRect(q.x-cam-1.5,q.y-1.5,3,3)}ctx.globalAlpha=1;
 for(const b of S.bullets)neonLine(ctx,b.x-cam-16,b.y,b.x-cam,b.y,CYAN,3,1);
 for(const b of S.bolts)neonLine(ctx,b.x-cam-b.vx*0.04,b.y-b.vy*0.04,b.x-cam,b.y,MAG,3,1);
 if(t>=bar(76.5)&&t<bar(94))drawPlayer(ctx,cam,t,pulse,p);
 drawBoss(ctx,cam,t,pulse,false);
 drawAgents(ctx,cam,t,pulse)}

function drawPlayer(ctx,cam,t,pulse,p){const x=p.x-cam,y=p.y;
 for(const q of p.trail){ctx.fillStyle=`rgba(77,240,255,${q.l*0.6})`;ctx.fillRect(q.x-cam-2,q.y,4,4)}
 if(S.landFx&&t-S.landFx.t<0.3){const q=(t-S.landFx.t)/0.3;ctx.strokeStyle=`rgba(77,240,255,${1-q})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(S.landFx.x-cam,S.landFx.y,10+q*40,3+q*6,0,0,7);ctx.stroke()}
 if(p.stun>0&&Math.floor(t*30)%2)return;
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(x,(platAt(p.x)||{y:GY}).y+2,12,3,0,0,7);ctx.fill();
 ctx.save();ctx.translate(x,y);const run=p.ground?t*16:0;const lean=p.ground?0.12:0.25;ctx.rotate(lean);
 if(!p.ground){glow(ctx,-8,-20,22,'rgb(77,240,255)',0.8);ctx.fillStyle=`rgba(77,240,255,${0.6+0.4*Math.random()})`;ctx.beginPath();ctx.moveTo(-12,-18);ctx.lineTo(-8,4+Math.random()*10);ctx.lineTo(-4,-18);ctx.fill()}
 ctx.lineCap='round';ctx.strokeStyle='#161c40';ctx.lineWidth=5;
 for(const s of[1,-1]){const a=Math.sin(run)*s;const kx=a*7,ky=-9+Math.abs(a)*2,fx=a*13,fy=p.ground?Math.min(0,-Math.max(0,a)*6):4;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();ctx.strokeStyle=CYAN;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();ctx.strokeStyle='#161c40';ctx.lineWidth=5}
 ctx.fillStyle='#0d1024';ctx.fillRect(-13,-36,6,16);neonLine(ctx,-13,-36,-13,-20,MAG,1,0.8);
 ctx.fillStyle='#141a3a';rrect(ctx,-8,-40,16,24,5);ctx.fill();ctx.strokeStyle='#2a3570';ctx.lineWidth=1;ctx.stroke();neonLine(ctx,-2,-38,-2,-20,CYAN,1,0.7);neonLine(ctx,4,-34,4,-22,CYAN,1,0.4);
 for(const s of[1,-1]){const a=-Math.sin(run)*s;ctx.strokeStyle='#161c40';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(a*6+4,-28);ctx.lineTo(a*10+6,-22+Math.abs(a)*4);ctx.stroke()}
 ctx.fillStyle='#1b2250';ctx.beginPath();ctx.arc(1,-47,7.5,0,7);ctx.fill();ctx.strokeStyle='#2a3570';ctx.stroke();
 ctx.fillStyle=CYAN;ctx.fillRect(0,-49,8,3);glow(ctx,5,-48,12,'rgb(77,240,255)',0.7);
 ctx.restore()}

function drawLevel(ctx,cam,t,pulse,refl){const k0=Math.max(0,Math.floor(cam/CW)-1),k1=Math.floor((cam+W)/CW)+2;
 for(let k=k0;k<=k1;k++){if(t<wire(k))continue;const c=chunk(k);const wp=clamp((t-wire(k))/(fill(k)-wire(k)),0,1),fp=t<fill(k)?0:clamp((t-fill(k))/PAINT,0,1),on=t>=lightsOn(k);const sx0=c.x0-cam,frontier=sx0+wp*CW,sweep=sx0+fp*CW;
  // hologram plan of the whole sector, faint
  if(fp<1){ctx.save();ctx.globalAlpha=0.14*(1-fp);ctx.strokeStyle=CYAN;ctx.setLineDash([3,5]);ctx.lineWidth=1;
   for(const tw of c.towers)ctx.strokeRect(tw.x-cam,HZ-tw.h,tw.w,tw.h);for(const pl of c.plats)ctx.strokeRect(pl.x0-cam,pl.y,pl.x1-pl.x0,16);if(c.gate){ctx.strokeRect(c.gate.x-cam-44,GY-130,8,130);ctx.strokeRect(c.gate.x-cam+36,GY-130,8,130)}ctx.restore()}
  // wireframe pass, drawn progressively behind the GEOMETRY agent
  if(fp<1&&wp>0){ctx.save();ctx.beginPath();ctx.rect(sx0-2,-200,Math.max(0,frontier-sx0+2),H+400);ctx.clip();ctx.globalAlpha=1-fp*0.85;ctx.strokeStyle=CYAN;ctx.lineWidth=1;
   for(const tw of c.towers){const x=tw.x-cam,hp=Math.min(tw.h,tw.h*wp*1.15);ctx.strokeRect(x,HZ-hp,tw.w,hp);ctx.beginPath();for(let yy=HZ-hp;yy<HZ;yy+=24){ctx.moveTo(x,yy);ctx.lineTo(x+tw.w,yy)}ctx.moveTo(x,HZ-hp);ctx.lineTo(x+tw.w,HZ);ctx.stroke();ctx.fillStyle=CYAN;for(let yy=HZ-hp;yy<HZ;yy+=24){ctx.fillRect(x-1,yy-1,3,3);ctx.fillRect(x+tw.w-1,yy-1,3,3)}}
   for(const pl of c.plats){const x=pl.x0-cam,w=pl.x1-pl.x0;ctx.strokeRect(x,pl.y,w,16);ctx.beginPath();for(let xx=0;xx<w;xx+=40){ctx.moveTo(x+xx,pl.y+16);ctx.lineTo(x+xx+16,pl.y)}ctx.stroke();ctx.fillStyle=CYAN;for(let xx=0;xx<=w;xx+=40)ctx.fillRect(x+xx-1,pl.y-1,3,3)}
   for(const pd of c.pads){ctx.beginPath();ctx.ellipse(pd.x-cam,pd.y,26,7,0,0,7);ctx.stroke()}
   if(c.gate){const x=c.gate.x-cam;ctx.strokeRect(x-44,GY-130,8,130);ctx.strokeRect(x+36,GY-130,8,130)}
   for(const l of c.lamps){ctx.beginPath();ctx.moveTo(l.x-cam,GY);ctx.lineTo(l.x-cam,GY-70);ctx.stroke()}
   for(const d of c.drones)d.alive.forEach((al,i)=>{if(al)ctx.strokeRect(d.x+i*36-cam,d.y,16,12)});
   ctx.restore();
   if(wp<1&&!refl){neonLine(ctx,frontier,HZ-Math.max(...c.towers.map(tw=>tw.h),0)-10,frontier,HZ+6,CYAN,1.5,0.6+0.4*pulse)}}
  if(fp<=0)continue;
  // solid pass, clipped to the TEXTURE agent's paint sweep
  ctx.save();ctx.beginPath();ctx.rect(sx0-2,-200,Math.max(0,sweep-sx0+2),H+400);ctx.clip();
  for(const tw of c.towers){const x=tw.x-cam,y=HZ-tw.h;const tg=ctx.createLinearGradient(x,0,x+tw.w,0);tg.addColorStop(0,'#0c1026');tg.addColorStop(0.5,'#141a3c');tg.addColorStop(1,'#090c1e');ctx.fillStyle=tg;ctx.fillRect(x,y,tw.w,tw.h);
   ctx.fillStyle='#1c2450';ctx.fillRect(x,y,tw.w,4);neonLine(ctx,x,y,x,HZ,tw.hue,1,0.8);neonLine(ctx,x+tw.w,y,x+tw.w,HZ,tw.hue,1,0.5);neonLine(ctx,x,y,x+tw.w,y,tw.hue,1,0.9);
   if(on&&!refl){const cols=Math.floor(tw.w/12),rows=Math.floor(tw.h/12);for(let j=0;j<rows;j++)for(let m=0;m<cols;m++){const hv=hash(tw.seed+j*31+m*7);if(hv<0.45)continue;const bl=hv>0.9?0.4+0.6*pulse:1;ctx.fillStyle=hv>0.7?`rgba(77,240,255,${0.55*bl})`:`rgba(255,200,120,${0.5*bl})`;ctx.fillRect(x+5+m*12,y+8+j*12,5,5)}
    if(tw.holo&&tw.h>170){const hx=x+6,hy=y+16,hw=tw.w-12;ctx.fillStyle='rgba(10,10,30,.8)';ctx.fillRect(hx,hy,hw,26);ctx.save();ctx.globalCompositeOperation='lighter';for(let b=0;b<5;b++){const v=(Math.sin(t*3+b*1.3+tw.seed)*0.5+0.5);ctx.fillStyle=b%2?`rgba(255,91,224,${0.3+0.5*v})`:`rgba(77,240,255,${0.3+0.5*v})`;ctx.fillRect(hx+3+b*(hw-6)/5,hy+22-v*18,(hw-6)/5-2,v*18)}ctx.restore();neonLine(ctx,hx,hy,hx+hw,hy,tw.hue,1,0.5)}}
   if(tw.h>230){neonLine(ctx,x+tw.w/2,y,x+tw.w/2,y-26,'#99a',1,0.6);neonLine(ctx,x+tw.w/2-10,y-12,x+tw.w/2+10,y-12,'#99a',1,0.4);if(on&&Math.floor(t*2)%2===0)glow(ctx,x+tw.w/2,y-26,9,'rgb(255,60,80)',0.9)}}
  for(const pl of c.plats){const x=pl.x0-cam,w=pl.x1-pl.x0;ctx.fillStyle='#262f66';ctx.fillRect(x,pl.y,w,4);ctx.fillStyle='#0e1330';ctx.fillRect(x,pl.y+4,w,12);ctx.fillStyle='#070a1c';for(let xx=x+40;xx<x+w;xx+=40)ctx.fillRect(xx,pl.y+4,1,12);ctx.fillStyle=`rgba(77,240,255,${0.5+0.5*pulse})`;for(let xx=x+20;xx<x+w;xx+=40)ctx.fillRect(xx,pl.y+9,4,2);
   ctx.fillStyle='#ffd23f';for(let i=0;i<3;i++){ctx.fillRect(x+2+i*5,pl.y+1,2,2);ctx.fillRect(x+w-4-i*5,pl.y+1,2,2)}
   neonLine(ctx,x,pl.y,x+w,pl.y,CYAN,1.5,0.9);neonLine(ctx,x,pl.y+16,x+w,pl.y+16,MAG,1,0.6);
   if(pl.rail){neonLine(ctx,x+6,pl.y-14,x+w-6,pl.y-14,CYAN,1,0.5);for(let xx=x+6;xx<=x+w-6;xx+=48)neonLine(ctx,xx,pl.y,xx,pl.y-14,CYAN,1,0.5)}
   if(!refl)for(let xx=x+20;xx<x+w-10;xx+=48){glow(ctx,xx,pl.y+22,16,'rgb(255,91,224)',0.35+0.35*pulse);glow(ctx,xx,HZ,30,'rgb(255,91,224)',0.12)}}
  for(const pd of c.pads){const y=pd.y+Math.sin(t*3+pd.x)*3;ctx.fillStyle='rgba(77,240,255,.55)';ctx.beginPath();ctx.ellipse(pd.x-cam,y,26,7,0,0,7);ctx.fill();neonLine(ctx,pd.x-cam-26,y,pd.x-cam+26,y,CYAN,1,0.9);if(!refl)glow(ctx,pd.x-cam,y+8,20,'rgb(77,240,255)',0.4+0.3*pulse)}
  for(const l of c.lamps){const x=l.x-cam;ctx.fillStyle='#1a2040';ctx.fillRect(x-2,GY-70,4,70);neonLine(ctx,x,GY,x,GY-70,'#9aa',1,0.5);ctx.fillStyle='#1a2040';ctx.fillRect(x-7,GY-78,14,8);if(on){glow(ctx,x,GY-74,22,'rgb(255,225,77)',0.9);if(!refl){ctx.fillStyle='rgba(255,225,77,.10)';ctx.beginPath();ctx.moveTo(x-6,GY-70);ctx.lineTo(x+6,GY-70);ctx.lineTo(x+56,GY);ctx.lineTo(x-56,GY);ctx.fill();glow(ctx,x,GY,46,'rgb(255,225,77)',0.25)}}else{ctx.fillStyle='#333';ctx.fillRect(x-4,GY-75,8,3)}}
  for(const s of c.speakers){const x=s.x-cam;ctx.fillStyle='#141a3a';rrect(ctx,x,GY-42,30,42,4);ctx.fill();neonLine(ctx,x,GY-42,x+30,GY-42,ORG,1,0.8);ctx.strokeStyle=`rgba(255,154,60,${(1-pulse)*0.7})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+15,GY-21,6+pulse*22,0,7);ctx.stroke();ctx.fillStyle=ORG;ctx.beginPath();ctx.arc(x+15,GY-21,5+pulse*3,0,7);ctx.fill()}
  if(c.gate){const gt=c.gate,x=gt.x-cam,col=gt.passed?GRN:gt.hit?'#888':MAG;for(const px of[x-44,x+36]){ctx.fillStyle='#0e1330';ctx.fillRect(px,GY-130,8,130);ctx.fillStyle='#262f66';ctx.fillRect(px,GY-134,8,4);neonLine(ctx,px+4,GY-130,px+4,GY,col,1.5,0.9)}
   if(!gt.hit&&!gt.passed){const by=gt.low?GY-40:GY-124;const bg=ctx.createLinearGradient(x-40,0,x+40,0);bg.addColorStop(0,'rgba(255,60,80,.2)');bg.addColorStop(0.5,`rgba(255,120,80,${0.6+0.4*pulse})`);bg.addColorStop(1,'rgba(255,60,80,.2)');ctx.fillStyle=bg;ctx.fillRect(x-40,by,80,10);neonLine(ctx,x-40,by+5,x+40,by+5,ORG,2,0.6+0.4*pulse)}}
  for(const o of c.orbs){const x=o.x-cam;if(o.got){const q=(t-o.got)/0.4;if(q<1){ctx.strokeStyle=`rgba(255,255,255,${1-q})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,o.y,6+q*24,0,7);ctx.stroke()}continue}glow(ctx,x,o.y,16,'rgb(77,240,255)',0.5+0.5*pulse);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,o.y,4+pulse*1.5,0,7);ctx.fill()}
  if(!refl)for(const d of c.drones)d.alive.forEach((al,i)=>{if(!al)return;const x=d.x+i*36-cam+(Math.floor(t/BEAT)%2?4:-4),y=d.y+Math.sin(t*3+d.ph+i)*4;glow(ctx,x+8,y+6,22,'rgb(255,91,224)',0.5);pix(ctx,DRONE,x,y,MAG,2);ctx.fillStyle='#fff';ctx.fillRect(x+4,y+4,2,2);ctx.fillRect(x+10,y+4,2,2)});
  ctx.restore();
  if(fp<1&&!refl)neonLine(ctx,sweep,GY-150,sweep,HZ+6,MAG,2,0.7+0.3*pulse)}
 // signs
 ctx.font="8px 'Press Start 2P',monospace";ctx.textAlign='center';
 for(const s of S.signs){const k=Math.floor(s.x/CW);if(t<wire(k))continue;const x=s.x-cam,w=s.text.length*8+12;if(x<-w||x>W+w)continue;const solid=t>=fill(k);
  if(!solid){ctx.strokeStyle='rgba(77,240,255,.6)';ctx.lineWidth=1;ctx.strokeRect(x-w/2,s.y-14,w,20);ctx.strokeText(s.text,x,s.y+1);continue}
  const lit=s.lit?clamp((t-s.lit)/0.4,0,1):0;ctx.fillStyle='rgba(10,10,28,.85)';ctx.fillRect(x-w/2,s.y-14,w,20);const col=s.lit?YEL:CYAN;neonLine(ctx,x-w/2,s.y-14,x+w/2,s.y-14,col,1,0.9);neonLine(ctx,x-w/2,s.y+6,x+w/2,s.y+6,col,1,0.5);
  if(!refl)neonLine(ctx,x,s.y+6,x,(platAt(s.x)||{y:GY}).y,'#556',1,0.4);
  ctx.fillStyle=s.lit?'#fff':`rgba(77,240,255,${0.75+0.25*pulse})`;ctx.fillText(s.text,x,s.y+1);if(s.lit&&lit<1&&!refl){ctx.strokeStyle=`rgba(255,225,77,${1-lit})`;ctx.lineWidth=3;ctx.strokeRect(x-w/2-lit*20,s.y-14-lit*20,w+lit*40,20+lit*40)}}
 ctx.textAlign='left'}
function drawBoss(ctx,cam,t,pulse,refl){const b=S.boss;if(!b||t<b.wireT)return;if(b.dead&&t-b.deadT>0.6)return;const wireA=clamp((t-b.wireT)/0.3,0,1),fp=t<b.fillT?0:clamp((t-b.fillT)/(BAR*0.5),0,1);const sx=b.sx,sy=b.sy;
 ctx.save();if(b.dead)ctx.globalAlpha=1-(t-b.deadT)/0.6;
 if(fp<1){ctx.globalAlpha*=wireA*(1-fp);ctx.strokeStyle=GRN;ctx.lineWidth=1;for(const q of b.plates)ctx.strokeRect(sx+q.c*14,sy+q.r*14,14,14);ctx.globalAlpha=b.dead?1-(t-b.deadT)/0.6:1}
 if(fp>0){const rows=Math.floor(fp*8+0.999);for(const q of b.plates){if(!q.alive||q.r>=rows)continue;const px=sx+q.c*14,py=sy+q.r*14;ctx.fillStyle=q.word?`rgba(91,255,91,${0.75+0.25*pulse})`:'#2a1040';ctx.fillRect(px+1,py+1,12,12);ctx.strokeStyle=q.word?GRN:MAG;ctx.lineWidth=1;ctx.strokeRect(px+1.5,py+1.5,11,11)}
  if(!refl){glow(ctx,sx+77,sy+56,150,'rgb(255,91,224)',0.25+0.2*pulse);
   ctx.font="8px 'Press Start 2P',monospace";let i=0;for(const q of b.plates){if(!q.word)continue;const px=sx+q.c*14+7,py=sy+q.r*14+7,lx=sx+11*14+28,ly=sy-14+i*13;i++;ctx.strokeStyle=q.alive?'rgba(91,255,91,.35)':'rgba(120,120,120,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(lx-4,ly-3);ctx.stroke();ctx.fillStyle=q.alive?GRN:'#666';ctx.fillText(q.word,lx,ly);if(!q.alive)ctx.fillRect(lx,ly-3,q.word.length*8,1)}
   ctx.fillStyle='#fff';ctx.font="7px 'Press Start 2P',monospace";ctx.fillText('BOSS.EXE  HP '+b.hp,sx,sy-24);ctx.fillStyle='#2a1040';ctx.fillRect(sx,sy-18,154,4);ctx.fillStyle=MAG;ctx.fillRect(sx,sy-18,154*b.hp/b.plates.length,4)}}
 ctx.restore()}
function drawAgents(ctx,cam,t,pulse){for(const a of S.agents){if(a.alpha<=0)continue;const x=a.x-cam,y=a.y+Math.sin(t*4+a.ph)*3;if(x<-80||x>W+80)continue;const rgb=RGB[a.col]||'rgb(255,255,255)';ctx.save();ctx.globalAlpha=a.alpha;
  if(a.beam&&isFinite(a.beam.x)&&isFinite(a.beam.y)){const bx=a.beam.x-cam,by=a.beam.y;ctx.save();ctx.globalCompositeOperation='lighter';const cg=ctx.createLinearGradient(x,y,bx,by);cg.addColorStop(0,'rgba(255,255,255,0.3)');cg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=cg;ctx.globalAlpha=a.alpha*0.35;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(bx-16,by);ctx.lineTo(bx+16,by);ctx.closePath();ctx.fill();ctx.restore();
   const mx=(x+bx)/2+(Math.random()-.5)*8,my=(y+by)/2+(Math.random()-.5)*8;neonLine(ctx,x,y+6,mx,my,a.col,1.5,0.6+0.4*Math.random());neonLine(ctx,mx,my,bx,by,a.col,1.5,0.6+0.4*Math.random());
   glow(ctx,bx,by,26,rgb,0.8);ctx.fillStyle='#fff';for(let i=0;i<4;i++)ctx.fillRect(bx+(Math.random()-.5)*20,by+(Math.random()-.5)*10,2,2);
   ctx.strokeStyle=a.col;ctx.lineWidth=1;ctx.globalAlpha=a.alpha*(0.4+0.6*pulse);ctx.beginPath();ctx.arc(bx,by,8+pulse*10,0,7);ctx.stroke();ctx.globalAlpha=a.alpha}
  const tilt=clamp(a.vx/1200,-0.45,0.45);ctx.translate(x,y);
  glow(ctx,0,0,44,rgb,0.4);glow(ctx,0,6,14,rgb,0.5+0.4*pulse);
  drawModel(ctx,agentModel(a.rgb,t,!!a.job),0,0,1.35,0.42,t*1.1+a.ph,-tilt*0.8,a.alpha);
  ctx.save();ctx.globalCompositeOperation='lighter';glow(ctx,0,-1,9,rgb,0.6+0.4*pulse);ctx.restore();
  if(a.job){const pr=clamp((t-a.job.start)/(a.job.end-a.job.start),0,1);ctx.strokeStyle=a.col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,31,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.arc(0,0,31,0,7);ctx.stroke()}
  ctx.font="6px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle=a.col;ctx.fillText(WD.ROLE[a.role].n,0,-36);ctx.fillStyle=a.job?'#fff':'#8890b0';ctx.font="5px 'Press Start 2P',monospace";ctx.fillText(a.status||'',0,-28);ctx.textAlign='left';
  if(a.panel&&t-a.panel.t<2.2){const age=t-a.panel.t,fa=age>1.8?1-(age-1.8)/0.4:1;ctx.globalAlpha=a.alpha*fa;const px=clamp(x+30,4,W-192)-x,py=Math.max(4,y-70)-y;ctx.fillStyle='rgba(8,8,14,.88)';ctx.fillRect(px,py,186,42);ctx.strokeStyle=a.col;ctx.lineWidth=1;ctx.strokeRect(px,py,186,42);ctx.font="8px ui-monospace,monospace";let chars=Math.floor(age*46);for(let i=0;i<3;i++){const l=a.panel.lines[i],n=clamp(chars,0,l.length);ctx.fillStyle=i===2?'#fff':'#cfd8e3';ctx.fillText(l.slice(0,n)+(n<l.length?'_':''),px+6,py+13+i*12);chars-=l.length+4}}
  ctx.restore()}}
function drawHUD(ctx,t,pulse){if(t<s5||t>=bar(94.5))return;const a=clamp((t-s5)/0.6,0,1);ctx.save();ctx.globalAlpha=a;
 ctx.fillStyle='rgba(6,8,20,.7)';rrect(ctx,16,64,204,64,4);ctx.fill();neonLine(ctx,16,64,220,64,CYAN,1,0.8);ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.fillText('SCORE '+String(S.score).padStart(6,'0'),26,84);ctx.fillStyle=YEL;ctx.fillText('WORDS '+S.words,26,100);ctx.fillStyle=S.combo>4?GRN:'#9aa';ctx.fillText('COMBO x'+S.combo,26,116);
 // build front meter
 const cam=camAt(t),front=Math.floor((cam+W)/CW)+2;ctx.font="6px 'Press Start 2P',monospace";ctx.fillStyle='#8890b0';ctx.fillText('BUILD FRONT  SECTOR '+String(Math.max(0,front)).padStart(2,'0')+'   '+S.agents.filter(x=>x.job).length+' AGENTS WORKING',26,140);
 const rx=W-236,ry=H-104-S.rules.length*14;ctx.fillStyle='rgba(6,8,20,.7)';rrect(ctx,rx,ry,220,26+S.rules.length*14,4);ctx.fill();neonLine(ctx,rx,ry,rx+220,ry,GRN,1,0.8);ctx.fillStyle='#9aa';ctx.font="7px 'Press Start 2P',monospace";ctx.fillText('RULES  (written by agents)',rx+10,ry+16);S.rules.forEach((ri,i)=>{const fresh=ri===S.ruleIdx&&t-S.ruleT<BAR*2;ctx.fillStyle=fresh?GRN:'#dfe';ctx.fillText((fresh?'> ':'  ')+RULES[ri][1],rx+10,ry+32+i*14)});
 ctx.font="7px 'Press Start 2P',monospace";S.log.forEach((l,i)=>{ctx.globalAlpha=a*(1-i*0.18);ctx.fillStyle=l.col;ctx.fillText(l.text,16,H-30-i*12)});ctx.globalAlpha=a;
 if(S.ruleIdx>=0&&t-S.ruleT<BAR*1.5){const q=t-S.ruleT,s=q<0.3?smooth(q/0.3):1,fo=q>BAR*1.2?1-(q-BAR*1.2)/(BAR*0.3):1;ctx.globalAlpha=a*s*fo;const r=RULES[S.ruleIdx];ctx.textAlign='center';ctx.font="16px 'Press Start 2P',monospace";ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(W/2-240,118,480,56);neonLine(ctx,W/2-240,118,W/2+240,118,GRN,1.5,1);ctx.fillStyle=GRN;ctx.fillText('NEW RULE: '+r[1],W/2,144);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.fillText(r[2],W/2,164);ctx.textAlign='left'}
 if(S.line.length){ctx.globalAlpha=a;ctx.textAlign='center';ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle=YEL;ctx.fillText(S.line.slice(-10).join(' '),W/2,H*0.86);ctx.textAlign='left'}
 ctx.restore()}
return{init,update,draw,onBeat,on8th,onLine,get S(){return S}}})();
