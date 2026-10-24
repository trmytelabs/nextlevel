import * as THREE from 'three';
import {ERAS,TRANS,W,H,rngf,hash,clamp,lerp,blip,noise} from './core';

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
function init(t){const r=rngf(31);S={s:Math.max(0,t-(start-TRANS))*SPEED,x:0,vx:0,speedK:1,shake:0,flash:0,score:0,words:0,spawned:0,missed:0,line:[],passes:0,overtakes:0,bumps:0,cars:[],lap:0,lyr:[]};
 for(let i=0;i<NCARS;i++){const x=LANES[Math.floor(r()*4)];S.cars.push({i,s:S.s+30+i*26+r()*8,x,tx:x,sp:SPEED*(0.9+r()*0.05),col:CARCOL[i%CARCOL.length],word:null,ahead:true,passed:false,ph:r()*6,changeT:1+r()*3})}}
function rel(c){let d=c.s-S.s;d=((d+L/2)%L+L)%L-L/2;return d}
function gap(a,b){let d=b.s-a.s;d=((d+L/2)%L+L)%L-L/2;return d}
// each lyric line is one overhead gantry, placed to arrive 2 s ahead (one every two bars), with the racing line lit on one lane.
// drive under it in the lit lane to take the line. The lane is picked where the pack will not be when you get there.
function onLine(words,t){if(t<start-TRANS||t>=end)return;S.line=[];const ta=2.0,sAt=S.s+ta*SPEED;let bi=1,bs=-1e9;
 for(let k=0;k<4;k++){let m=40;for(const c of S.cars)if(Math.abs(c.tx-LANES[k])<0.3||Math.abs(c.x-LANES[k])<0.3){const d=rel(c)+(c.sp-SPEED)*ta;if(d>-6)m=Math.min(m,Math.abs(d))}const sc=m-Math.abs(LANES[k]-S.x)*6+hash(t*7.3+k)*2;if(sc>bs){bs=sc;bi=k}}
 S.spawned++;S.lyr.push({text:words.join(' '),s:sAt,x:LANES[bi],lane:bi,t0:t,got:0,missed:false,id:'L'+S.spawned})}
// a lane is free for car c if no other car is (or is heading) there within 9 units
function laneFree(c,ln){for(const o of S.cars){if(o===c)continue;if((Math.abs(o.x-ln)<0.25||Math.abs(o.tx-ln)<0.25)&&Math.abs(gap(c,o))<9)return false}return true}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=end)return;S.speedK=lerp(S.speedK,1,1-Math.pow(0.1,dt));const ps=S.s;S.s+=SPEED*S.speedK*dt;S.lap=Math.floor(S.s/L);const ox=S.x;
 if(auto){let best=-1e9,bl=S.x;for(const ln of LANES){let score=0;for(const c of S.cars){const d=rel(c);if(d>-5&&d<30){const near=Math.max(1-Math.abs(c.x-ln)/0.4,1-Math.abs(c.tx-ln)/0.4);if(near>0){const ttc=d<4?0:(d-4)/Math.max(1.5,SPEED*S.speedK-c.sp);score-=near*(ttc<=0?60:30*Math.max(0,1-ttc/2.5))}}}for(const w of S.lyr){const d=w.s-S.s;if(!w.got&&!w.missed&&d>0&&d<110&&Math.abs(w.x-ln)<0.25)score+=18*(1-d/130)}score-=Math.abs(ln-S.x)*4;if(score>best){best=score;bl=ln}}S.x+=(bl-S.x)*(1-Math.pow(0.03,dt))}
 else{if(inp.left)S.x-=1.4*dt;if(inp.right)S.x+=1.4*dt;S.x=clamp(S.x,-0.85,0.85)}
 S.vx=lerp(S.vx,(S.x-ox)/Math.max(dt,0.001),1-Math.pow(1.5e-6,dt));
 for(const c of S.cars){
  // traffic: follow the car in front instead of driving through it, and only change into a free lane
  let sp=c.sp;for(const o of S.cars){if(o===c)continue;const g=gap(c,o);if(g>0&&g<HIT_S+2.5&&Math.abs(o.x-c.x)<0.3){sp=Math.min(sp,o.sp*(g<HIT_S+0.5?0.9:0.99));c.changeT=Math.min(c.changeT,0.4)}}
  c.s+=sp*dt;c.changeT-=dt;if(c.changeT<=0){c.changeT=2+hash(c.i*7+Math.floor(t))*3;const k0=Math.floor(hash(c.i*13+Math.floor(t*3))*4);for(let j=0;j<4;j++){const ln=LANES[(k0+j)%4];if(ln===c.tx||laneFree(c,ln)){c.tx=ln;break}}}c.x+=(c.tx-c.x)*(1-Math.pow(0.3,dt));
  const d=rel(c);const wasAhead=c.ahead;c.ahead=d>0;
  // POS is honest: a car counts once when you get past it and is taken back if it re-passes you
  if(wasAhead&&!c.ahead&&d>-20){S.overtakes++;S.score+=100;S.flash=0.2;blip(1046,0.08,0.1);if(!c.passed){c.passed=true;S.passes++}}
  else if(!wasAhead&&c.ahead&&d<20&&c.passed){c.passed=false;S.passes--}
  if(d<-45){c.s+=L*0.5+45;c.ahead=true} // recycled half a lap away (as lapped traffic it keeps its passed flag)
  if(Math.abs(d)<HIT_S&&Math.abs(c.x-S.x)<HIT_X){const push=S.x<c.x?-1:1;S.x=clamp(S.x+push*2.2*dt,-0.9,0.9);if(d>0)S.s-=Math.min(HIT_S-d,SPEED*dt)*0.5;if(S.shake<=0){S.bumps++;S.speedK=0.86;S.score=Math.max(0,S.score-30);noise(0.1,0.3,1200);blip(110,0.2,0.12)}S.shake=0.3}}
 for(const w of S.lyr){const before=w.s-ps,after=w.s-S.s;if(!w.got&&!w.missed&&before>0&&after<=0){if(Math.abs(S.x-w.x)<0.36){w.got=t;S.words++;S.score+=300;S.line=[w.text];S.flash=Math.max(S.flash,0.3);blip(1568,0.1,0.12);blip(2093,0.16,0.08)}else{w.missed=true;S.missed++;blip(220,0.12,0.08)}}}
 if(S.lyr.length&&S.lyr[0].s-S.s<=-70)S.lyr=S.lyr.filter(w=>(w.s-S.s)>-70);
 S.shake=Math.max(0,S.shake-dt);S.flash=Math.max(0,S.flash-dt)}
function hudText(ctx,s,x,y){ctx.strokeText(s,x,y);ctx.fillText(s,x,y)}
function overlay(ctx,t){if(t<start-TRANS*0.3||t>=end)return;const a=clamp((t-(start-TRANS*0.3))/0.6,0,1);ctx.save();ctx.globalAlpha=a;
 const pos=clamp(1+NCARS-S.passes,1,NCARS+1);ctx.font="12px 'Press Start 2P',monospace";ctx.lineWidth=4;ctx.strokeStyle='#102040';ctx.fillStyle='#ffe066';hudText(ctx,'POS '+pos+'/'+(NCARS+1),20,86);
 ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#fff';hudText(ctx,'SCORE '+S.score,20,106);ctx.fillStyle='#5df2ff';hudText(ctx,'LINES '+S.words+'/'+S.spawned+'   PASSES '+S.overtakes,20,124);
 ctx.textAlign='right';ctx.font="14px 'Press Start 2P',monospace";ctx.fillStyle='#ffe066';const kmh=Math.round(288*S.speedK+Math.sin(t*20)*2);hudText(ctx,kmh+' KM/H',W-20,90);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';hudText(ctx,'LAP '+(S.lap+1),W-20,108);ctx.textAlign='left';
 if(S.line.length){ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#ffe066';hudText(ctx,S.line.join(' '),W/2,H*0.86);ctx.textAlign='left'}
 if(S.flash>0){ctx.fillStyle=`rgba(93,242,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}ctx.restore()}
return{init,onLine,update,overlay,frame,newFrame,get S(){return S},K:{ROADW,L,SPEED,LANES,curve,start,end}}})();
