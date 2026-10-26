import * as THREE from 'three';
import {ERAS,TRANS,W,H,rngf,hash,clamp,lerp,blip,noise,bar,cb} from './core';
import {eggFind} from './eggs';

// ---------- ERA 3: arcade racer. Tri-oval with banked turns, traffic to overtake, each lyric line an overhead gantry you drive under ----------
export const E3=(()=>{
const start=ERAS[2].start,end=ERAS[3].start;
const ROADW=11,SPEED=72,NCARS=12,LANES=[-0.62,-0.21,0.21,0.62];
// contact box in track units: cars are ~4.7 long and ~2 wide (lane spacing 0.41*ROADW = 4.5)
const HIT_S=4.7,HIT_X=0.2;
const PTS=[[0,0,0],[230,0,0],[330,0,-50],[355,0,-150],[280,0,-240],[130,0,-262],[-30,0,-245],[-125,0,-165],[-110,0,-55]].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
const curve=new THREE.CatmullRomCurve3(PTS,true,'centripetal',0.5);const L=curve.getLength();
const CARCOL=[0x2f6fe8,0xf2c230,0x2fb85a,0xffffff,0xff7a1a,0x8a3ad8,0x20c8c0,0xe83a7a,0x1a1a22,0x9ad8ff,0xc8c020,0x6a8a3a];
let S:any;
// track frame at arc length s. Banking comes from the heading change over +-12 units (smooth, so the chase camera does
// not wobble), with a dead zone so the straights stay flat. The road pivots on its inner edge: p is lifted so the
// low curb sits on the ground and the outside edge rises (the renderer adds an embankment under it).
// Pass `out` to reuse vectors (the renderer calls this ~20x per frame).
const UP=new THREE.Vector3(0,1,0),_Ta=new THREE.Vector3(),_Tb=new THREE.Vector3();
const wrapU=(s:number)=>(((s%L)+L)%L)/L;
function newFrame(){return{p:new THREE.Vector3(),T:new THREE.Vector3(),right:new THREE.Vector3(),up:new THREE.Vector3(),right0:new THREE.Vector3(),bank:0,curv:0,lift:0}}
function frame(s:number,out=newFrame()){const u=wrapU(s);curve.getPointAt(u,out.p);curve.getTangentAt(u,out.T);
 curve.getTangentAt(wrapU(s-12),_Ta);curve.getTangentAt(wrapU(s+12),_Tb);const cr=_Ta.x*_Tb.z-_Ta.z*_Tb.x; // cr<0 in the (left-hand) turns: bank>0 lifts the right (outside) edge
 const bank=clamp(-Math.sign(cr)*Math.max(0,Math.abs(cr)-0.08)*1.3,-0.3,0.3),c=Math.cos(bank),sn=Math.sin(bank);
 const r0=out.right0.crossVectors(out.T,UP).normalize();out.right.copy(r0).multiplyScalar(c).addScaledVector(UP,sn);out.up.copy(UP).multiplyScalar(c).addScaledVector(r0,-sn);
 out.lift=Math.abs(sn)*ROADW*1.14+0.02;out.p.y+=out.lift;out.bank=bank;out.curv=cr;return out}
function init(t){const r=rngf(31);S={s:Math.max(0,t-(start-TRANS))*SPEED,x:0,vx:0,speedK:1,shake:0,flash:0,score:0,words:0,spawned:0,missed:0,line:[],passes:0,overtakes:0,bumps:0,cars:[],lap:0,lyr:[],planT:0,planLane:null,
  // secret 3: a rainbow pad in the left lane, reached at bar 46 (just after the "every lap" gate). A player who drives over it finds it.
  padS:(cb(46)-(start-TRANS))*SPEED,padX:LANES[0],padGot:false,rainbow:0};
 for(let i=0;i<NCARS;i++){const x=LANES[Math.floor(r()*4)];S.cars.push({i,s:S.s+30+i*26+r()*8,x,tx:x,sp:SPEED*(0.9+r()*0.05),col:CARCOL[i%CARCOL.length],word:null,ahead:true,passed:false,ph:r()*6,changeT:1+r()*3})}}
function rel(c){let d=c.s-S.s;d=((d+L/2)%L+L)%L-L/2;return d}
function gap(a,b){let d=b.s-a.s;d=((d+L/2)%L+L)%L-L/2;return d}
// each lyric line is one overhead gantry, placed to arrive 2 s ahead (one every two bars), with the racing line lit on one lane.
// drive under it in the lit lane to take the line. The lane is picked where the pack will not be when you get there:
// for each lane the planner below checks there is a clean way into it through the forecast traffic (plus a little variety).
function onLine(words,t){if(t<start-TRANS||t>=end)return;S.line=[];const ta=2.0,sAt=S.s+ta*SPEED;let bi=1,bs=-1e9;
 for(let k=0;k<4;k++){const sc=-plan(t,{x:LANES[k],s:sAt}).cost+hash(t*7.3+k)*6;if(sc>bs){bs=sc;bi=k}}
 S.spawned++;S.lyr.push({text:words.join(' '),s:sAt,x:LANES[bi],lane:bi,t0:t,got:0,missed:false,id:'L'+S.spawned})}
// a lane is free for car c if no other car is (or is heading) there within 9 units
function laneFree(c,ln,cars=S.cars){for(const o of cars){if(o===c)continue;if((Math.abs(o.x-ln)<0.25||Math.abs(o.tx-ln)<0.25)&&Math.abs(gap(c,o))<9)return false}return true}
// traffic: follow the car in front instead of driving through it, and only change into a free lane. Shared by the sim
// and the autopilot's traffic forecast (which runs it on copies of the cars).
function moveCar(c,cars,dt,t){let sp=c.sp;for(const o of cars){if(o===c)continue;const g=gap(c,o);if(g>0&&g<HIT_S+2.5&&Math.abs(o.x-c.x)<0.3){sp=Math.min(sp,o.sp*(g<HIT_S+0.5?0.9:0.99));c.changeT=Math.min(c.changeT,0.4)}}
 c.s+=sp*dt;c.changeT-=dt;if(c.changeT<=0){c.changeT=2+hash(c.i*7+Math.floor(t))*3;const k0=Math.floor(hash(c.i*13+Math.floor(t*3))*4);for(let j=0;j<4;j++){const ln=LANES[(k0+j)%4];if(ln===c.tx||laneFree(c,ln,cars)){c.tx=ln;break}}}c.x+=(c.tx-c.x)*(1-Math.pow(0.3,dt))}
// ---- autopilot planner. Traffic does not react to the player, so it can be forecast by running moveCar on copies of
// the cars. A beam search then picks a target lane every 0.25 s over the next 2.5 s: hitting a car costs most, missing
// the pending gantry's lit lane next (a line is never worth a bump; every sub-step of contact costs more, so a plan that
// is already touching a car gets out fastest), and changing lanes / hugging cars costs a little. The first lane
// of the best plan is steered for, and the plan is redone every 0.1 s. Deterministic: no randomness, fixed sub-steps.
const PDT=0.05,PSUB=5,PND=10,PBEAM=16,PK=Math.pow(0.03,PDT),PV=Math.pow(0.1,PDT);
// Two forecasts: as the sim will run it, and with nobody starting a new lane change (the coarse forecast can get the
// moment of a lane change slightly wrong), so the plan stays clear of a car under either story.
let fc:Float64Array=new Float64Array(0),fc2:Float64Array=new Float64Array(0);
function forecastInto(t,out:Float64Array,hold:boolean){const cs=S.cars.map(c=>({i:c.i,s:c.s,x:c.x,tx:c.tx,sp:c.sp,changeT:hold?1e9:c.changeT})),n=PND*PSUB,m=cs.length;
 for(let k=0;k<=n;k++){for(let j=0;j<m;j++){out[(k*m+j)*2]=cs[j].s;out[(k*m+j)*2+1]=cs[j].x}if(k<n)for(const c of cs)moveCar(c,cs,PDT,t+(k+1)*PDT)}return m}
function forecast(t){const sz=(PND*PSUB+1)*S.cars.length*2;if(fc.length<sz){fc=new Float64Array(sz);fc2=new Float64Array(sz)}forecastInto(t,fc2,true);return forecastInto(t,fc,false)}
function plan(t,wo:any=null){const m=forecast(t),FCS=[fc,fc2];const w=wo||S.lyr.find(q=>!q.got&&!q.missed&&q.s>S.s);
 let beam=[{x:S.x,s:S.s,k:S.speedK,cost:0,first:-1,last:-1,hit:false}];
 for(let d=0;d<PND;d++){const next=[];
  for(const b of beam)for(let l=0;l<4;l++){const tgt=LANES[l];let x=b.x,s=b.s,k=b.k,cost=b.cost+(b.last>=0&&b.last!==l?0.6:0)+Math.abs(tgt-b.x)*0.8,hit=b.hit;
   for(let u=1;u<=PSUB;u++){const ps=s;x+=(tgt-x)*(1-PK);k=k+(1-k)*(1-PV);s+=SPEED*k*PDT;const base=((d*PSUB+u)*m)*2;
    for(const F of FCS)for(let j=0;j<m;j++){let dd=F[base+j*2]-s;dd=((dd+L/2)%L+L)%L-L/2;const dx=Math.abs(F[base+j*2+1]-x);
     if(Math.abs(dd)<HIT_S+1.2&&dx<HIT_X+0.07){cost+=hit?300:3000-d*50;if(!hit)k=0.86;hit=true}
     else if(dd>-HIT_S&&dd<HIT_S+8&&dx<0.32)cost+=(0.32-dx)*6*(1-Math.max(0,dd-HIT_S)/10)}
    if(w&&ps<w.s&&s>=w.s){const e=Math.abs(x-w.x);cost+=e<0.36?e*30:800}
    cost+=Math.abs(x)*0.01}
   next.push({x,s,k,cost,first:b.first<0?l:b.first,last:l,hit})}
  next.sort((a,b)=>a.cost-b.cost);beam=[];const seen=new Set<string>();for(const n of next){const key=n.last+':'+Math.round(n.x*25)+':'+n.first;if(seen.has(key))continue;seen.add(key);beam.push(n);if(beam.length>=PBEAM)break}}
 return beam[0]}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=end)return;// the autopilot plans from the state at the start of the frame (player and cars at the same instant)
 if(auto){S.planT-=dt;if(S.planT<=0||S.planLane==null){S.planT=0.1;S.planLane=plan(t-dt).first}}
 S.speedK=lerp(S.speedK,1,1-Math.pow(0.1,dt));const ps=S.s;S.s+=SPEED*S.speedK*dt;S.lap=Math.floor(S.s/L);const ox=S.x;
 if(auto)S.x+=(LANES[S.planLane]-S.x)*(1-Math.pow(0.03,dt));
 else{S.planT=0;if(inp.left)S.x-=1.4*dt;if(inp.right)S.x+=1.4*dt;S.x=clamp(S.x,-0.85,0.85)}
 S.vx=lerp(S.vx,(S.x-ox)/Math.max(dt,0.001),1-Math.pow(1.5e-6,dt));
 for(const c of S.cars){
  // traffic: follow the car in front instead of driving through it, and only change into a free lane
  moveCar(c,S.cars,dt,t);
  const d=rel(c);const wasAhead=c.ahead;c.ahead=d>0;
  // POS is honest: a car counts once when you get past it and is taken back if it re-passes you
  if(wasAhead&&!c.ahead&&d>-20){S.overtakes++;S.score+=100;S.flash=0.2;blip(1046,0.08,0.1);if(!c.passed){c.passed=true;S.passes++}}
  else if(!wasAhead&&c.ahead&&d<20&&c.passed){c.passed=false;S.passes--}
  if(d<-45){c.s+=L*0.5+45;c.ahead=true} // recycled half a lap away (as lapped traffic it keeps its passed flag)
  if(Math.abs(d)<HIT_S&&Math.abs(c.x-S.x)<HIT_X){const push=S.x<c.x?-1:1;S.x=clamp(S.x+push*2.2*dt,-0.9,0.9);if(d>0)S.s-=Math.min(HIT_S-d,SPEED*dt)*0.5;if(S.shake<=0){S.bumps++;S.speedK=0.86;S.score=Math.max(0,S.score-30);noise(0.1,0.3,1200);blip(110,0.2,0.12)}S.shake=0.3}}
 for(const w of S.lyr){const before=w.s-ps,after=w.s-S.s;if(!w.got&&!w.missed&&before>0&&after<=0){if(Math.abs(S.x-w.x)<0.36){w.got=t;S.words++;S.score+=300;S.line=[w.text];S.flash=Math.max(S.flash,0.3);blip(1568,0.1,0.12);blip(2093,0.16,0.08)}else{w.missed=true;S.missed++;blip(220,0.12,0.08)}}}
 if(!S.padGot&&!auto){const before=S.padS-ps,after=S.padS-S.s;if(before>0&&after<=0&&Math.abs(S.x-S.padX)<0.4){S.padGot=true;S.rainbow=1.8;S.speedK=1.3;S.flash=0.5;S.score+=500;eggFind(2,false)}}
 S.rainbow=Math.max(0,S.rainbow-dt);
 if(S.lyr.length&&S.lyr[0].s-S.s<=-70)S.lyr=S.lyr.filter(w=>(w.s-S.s)>-70);
 S.shake=Math.max(0,S.shake-dt);S.flash=Math.max(0,S.flash-dt)}
function hudText(ctx,s,x,y){ctx.strokeText(s,x,y);ctx.fillText(s,x,y)}
function overlay(ctx,t){if(t<start-TRANS*0.3||t>=end)return;const a=clamp((t-(start-TRANS*0.3))/0.6,0,1);ctx.save();ctx.globalAlpha=a;
 const pos=clamp(1+NCARS-S.passes,1,NCARS+1);ctx.font="12px 'Press Start 2P',monospace";ctx.lineWidth=4;ctx.strokeStyle='#102040';ctx.fillStyle='#ffe066';hudText(ctx,'POS '+pos+'/'+(NCARS+1),20,86);
 ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#fff';hudText(ctx,'SCORE '+S.score,20,106);ctx.fillStyle='#5df2ff';hudText(ctx,'LINES '+S.words+'/'+S.spawned+'   PASSES '+S.overtakes,20,124);
 ctx.textAlign='right';ctx.font="14px 'Press Start 2P',monospace";ctx.fillStyle='#ffe066';const kmh=Math.round(288*S.speedK+Math.sin(t*20)*2);hudText(ctx,kmh+' KM/H',W-20,90);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';hudText(ctx,'LAP '+(S.lap+1),W-20,108);ctx.textAlign='left';
 if(S.rainbow>0){ctx.textAlign='center';ctx.font="18px 'Press Start 2P',monospace";const tx='RAINBOW BOOST!';let x0=W/2-ctx.measureText(tx).width/2;ctx.textAlign='left';for(let i=0;i<tx.length;i++){ctx.fillStyle=`hsl(${(i*28+t*400)%360},100%,62%)`;hudText(ctx,tx[i],x0,H*0.3);x0+=ctx.measureText(tx[i]).width}}
 if(S.flash>0){ctx.fillStyle=`rgba(93,242,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}ctx.restore()}
return{init,onLine,update,overlay,frame,newFrame,get S(){return S},K:{ROADW,L,SPEED,LANES,curve,start,end}}})();
