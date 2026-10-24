import * as THREE from 'three';
import {ERAS,TRANS,W,H,rngf,hash,clamp,lerp,blip,noise} from './core';

// ---------- ERA 3: arcade racer. Tri-oval with banked turns, traffic to overtake, lyrics floating above the cars ----------
export const E3=(()=>{
const start=ERAS[2].start,end=ERAS[3].start;
const ROADW=7,SPEED=72,NCARS=12,LANES=[-0.62,-0.21,0.21,0.62];
const PTS=[[0,0,0],[230,0,0],[330,0,-50],[355,0,-150],[280,0,-240],[130,0,-262],[-30,0,-245],[-125,0,-165],[-110,0,-55]].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
const curve=new THREE.CatmullRomCurve3(PTS,true,'centripetal',0.5);const L=curve.getLength();
const CARCOL=[0x2f6fe8,0xf2c230,0x2fb85a,0xffffff,0xff7a1a,0x8a3ad8,0x20c8c0,0xe83a7a,0x1a1a22,0x9ad8ff,0xc8c020,0x6a8a3a];
let S:any;
function frame(s:number){const u=(((s%L)+L)%L)/L;const p=curve.getPointAt(u),T=curve.getTangentAt(u);const u2=(((s+4)%L)+L)%L/L;const T2=curve.getTangentAt(u2);const cr=T.x*T2.z-T.z*T2.x;const bank=clamp(cr*2.2,-0.42,0.42);
 const up0=new THREE.Vector3(0,1,0),right0=new THREE.Vector3().crossVectors(T,up0).normalize();const right=right0.clone().multiplyScalar(Math.cos(bank)).add(up0.clone().multiplyScalar(Math.sin(bank)));const up=up0.clone().multiplyScalar(Math.cos(bank)).sub(right0.clone().multiplyScalar(Math.sin(bank)));return{p,T,right,up,bank,curv:cr}}
function init(t){const r=rngf(31);S={s:Math.max(0,t-start)*SPEED,x:0,vx:0,speedK:1,shake:0,flash:0,score:0,words:0,line:[],passes:0,bumps:0,cars:[],lap:0};
 for(let i=0;i<NCARS;i++){const x=LANES[Math.floor(r()*4)];S.cars.push({i,s:S.s+30+i*26+r()*8,x,tx:x,sp:SPEED*(0.9+r()*0.05),col:CARCOL[i%CARCOL.length],word:null,ahead:true,ph:r()*6,changeT:1+r()*3})}}
function rel(c){let d=c.s-S.s;d=((d+L/2)%L+L)%L-L/2;return d}
function onLine(words,t){if(t<start-TRANS||t>=end)return;S.line=[];const ahead=S.cars.filter(c=>rel(c)>8).sort((a,b)=>rel(a)-rel(b));for(const c of ahead)c.word=null;words.forEach((w,i)=>{if(ahead[i])ahead[i].word=w})}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=end)return;S.speedK=lerp(S.speedK,1,1-Math.pow(0.1,dt));S.s+=SPEED*S.speedK*dt;S.lap=Math.floor(S.s/L);const ox=S.x;
 if(auto){let best=-1e9,bl=S.x;for(const ln of LANES){let score=0;for(const c of S.cars){const d=rel(c);if(d>-4&&d<40)score-=Math.max(0,1-Math.abs(c.x-ln)/0.4)*(40-d);if(c.word&&d>0&&d<60&&Math.abs(c.x-ln)>0.35)score+=6}score-=Math.abs(ln-S.x)*4;if(score>best){best=score;bl=ln}}S.x+=(bl-S.x)*(1-Math.pow(0.03,dt))}
 else{if(inp.left)S.x-=1.4*dt;if(inp.right)S.x+=1.4*dt;S.x=clamp(S.x,-0.85,0.85)}
 S.vx=lerp(S.vx,(S.x-ox)/Math.max(dt,0.001),0.2);
 for(const c of S.cars){c.s+=c.sp*dt;c.changeT-=dt;if(c.changeT<=0){c.changeT=2+hash(c.i*7+Math.floor(t))*3;c.tx=LANES[Math.floor(hash(c.i*13+Math.floor(t*3))*4)]}c.x+=(c.tx-c.x)*(1-Math.pow(0.3,dt));
  const d=rel(c);const wasAhead=c.ahead;c.ahead=d>0;
  if(wasAhead&&!c.ahead&&d>-20){S.passes++;S.score+=100;S.flash=0.2;blip(1046,0.08,0.1);if(c.word){S.words++;S.line.push(c.word);S.score+=100;c.word=null;blip(1568,0.1,0.12)}}
  if(d<-45){c.s+=L*0.5+45;c.ahead=true;c.word=null}
  if(Math.abs(d)<3.2&&Math.abs(c.x-S.x)<0.3){const push=S.x<c.x?-1:1;S.x=clamp(S.x+push*2.2*dt,-0.9,0.9);if(S.shake<=0){S.bumps++;S.speedK=0.86;S.score=Math.max(0,S.score-30);noise(0.1,0.3,1200);blip(110,0.2,0.12)}S.shake=0.3}}
 S.shake=Math.max(0,S.shake-dt);S.flash=Math.max(0,S.flash-dt)}
function overlay(ctx,t){if(t<start-TRANS*0.3||t>=end)return;const a=clamp((t-(start-TRANS*0.3))/0.6,0,1);ctx.save();ctx.globalAlpha=a;
 const pos=1+S.cars.filter(c=>rel(c)>0).length;ctx.font="12px 'Press Start 2P',monospace";ctx.lineWidth=4;ctx.strokeStyle='#102040';ctx.fillStyle='#ffe066';ctx.strokeText('POS '+pos+'/'+(NCARS+1),20,86);ctx.fillText('POS '+pos+'/'+(NCARS+1),20,86);
 ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.strokeText('SCORE '+S.score,20,106);ctx.fillText('SCORE '+S.score,20,106);ctx.fillStyle='#5df2ff';ctx.strokeText('WORDS '+S.words+'   PASSES '+S.passes,20,124);ctx.fillText('WORDS '+S.words+'   PASSES '+S.passes,20,124);
 ctx.textAlign='right';ctx.font="14px 'Press Start 2P',monospace";ctx.fillStyle='#ffe066';const kmh=Math.round(288*S.speedK+Math.sin(t*20)*2);ctx.strokeText(kmh+' KM/H',W-20,90);ctx.fillText(kmh+' KM/H',W-20,90);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.strokeText('LAP '+(S.lap+1),W-20,108);ctx.fillText('LAP '+(S.lap+1),W-20,108);ctx.textAlign='left';
 if(S.line.length){ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#ffe066';ctx.strokeText(S.line.join(' '),W/2,H*0.86);ctx.fillText(S.line.join(' '),W/2,H*0.86);ctx.textAlign='left'}
 if(S.flash>0){ctx.fillStyle=`rgba(93,242,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}ctx.restore()}
return{init,onLine,update,overlay,frame,get S(){return S},K:{ROADW,L,SPEED,LANES,curve,start,end}}})();
