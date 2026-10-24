import {ERAS,TRANS,BAR,BEAT,bar,W,H,LYRICS,hash,clamp,lerp,smooth,blip,noise,ptr,MOBILE} from './core';

// ---------- ERA 5: NOW. A VR rhythm game (saber lane) with an AI co-pilot that builds the arena out of every word you cut ----------
// The whole lyric table is known, so blocks are planned up front: each word of each line is a block that reaches the
// hit plane on an 8th-note grid inside its line. Left-hand blocks are magenta, right-hand blocks are cyan, and you cut
// them with A / D (or tap left / right). The co-pilot turns every cut word into a piece of arena ahead of you.
// Deterministic: seek() replans from the table and rebuilds the arena pieces for everything already cut.
export const E5=(()=>{
const s5=ERAS[4].start,OUT=bar(94),TUNNEL=bar(89),SPD=13,LEAD=2.4,COLS=4,ROWS=3,WIN=0.18;
const MAG='#ff5be0',CYAN='#4df0ff',GRN='#5bff5b',YEL='#ffe14d';
const KINDS=['arch','pillar','panel','ring'];
// lane geometry shared with the renderer (world units): the hit plane is HIT ahead of the player, the camera sits BACK behind
// the player at eye height EYE looking slightly down; column c is at z=(c-1.5)*COLW, row r at y=ROW0+r*ROWH
const HIT=2.4,BACK=0.6,EYE=1.65,COLW=1.0,ROW0=0.85,ROWH=0.68,PITCH=-0.3/9.6;
// gameplay field of view at time t (the renderer's camera eases towards it): lens-open 60 -> 72, tunnel 84
const fovAt=(t:number)=>{let f=t>=TUNNEL?84:72;const b=t/BAR;if(b<76.3)f=lerp(f,60,1-smooth((b-75)/1.3));return f};
// pointer -> hand: put the saber tip exactly under the pointer by intersecting the pointer ray with the hit plane
function aim(t:number){const D=HIT+BACK,tv=Math.tan(fovAt(t)*Math.PI/360),nx=ptr.x*2-1,ny=1-ptr.y*2;const z=nx*D*tv*(W/H),y=EYE+D*PITCH+ny*D*tv;return{c:clamp(z/COLW+1.5,-0.45,COLS-0.55),r:clamp((y-ROW0)/ROWH,-0.45,ROWS-0.55)}}
let S:any;
function plan(){const out:any[]=[];LYRICS.forEach((l,li)=>{const b=l[0];if(b<75||b>=94)return;const words=l[1].replace(/[.,!?]/g,'').split(' ').filter(Boolean);const n=words.length;const step=Math.max(0.5,Math.floor(12/n)/2)*BEAT;const t0=bar(b)+BEAT*0.5;
 words.forEach((w,k)=>{const side=k%2?'R':'L';const col=side==='L'?(hash(li*31+k*7)<0.5?0:1):(hash(li*31+k*7)<0.5?2:3);const row=Math.floor(hash(li*17+k*3)*ROWS);out.push({id:li+'-'+k,li,k,word:w,hitT:t0+k*step,side,col,row,hit:0,missed:0,active:false})})});
 // tunnel run: after the last line the chorus words come back faster (every 8th) so the build keeps going to the stop
 const last=out[out.length-1];const echo=['MAXIMALIST','READY','DEPUTY','TURN','IT','UP','EVERYTHING','THEN','MORE','SPEED','OF','LIGHT'];let k=0;for(let tt=(last?last.hitT:bar(90))+BEAT*1.5;tt<bar(93.8);tt+=BEAT*0.5,k++){const side=k%2?'R':'L';out.push({id:'e-'+k,li:99,k,word:echo[k%echo.length],hitT:tt,side,col:side==='L'?(k%4<2?0:1):(k%4<2?3:2),row:Math.floor(hash(k*3.1)*ROWS),hit:0,missed:0,active:false,echo:true})}return out}
function piece(b:any,i:number){const kind=KINDS[Math.floor(hash(b.li*13+b.k*5)*KINDS.length)];const sideZ=b.side==='L'?-1:1;return{word:b.word,kind,x:0,z:sideZ,t:b.hit||b.hitT,i,side:b.side,li:b.li}}
function log(text:string,col:string){S.log.unshift({text,col});if(S.log.length>4)S.log.pop()}
function init(t){S={t,dist:Math.max(0,t-s5)*SPD,blocks:plan(),hits:0,misses:0,whiffs:0,spawned:0,score:0,combo:0,maxCombo:0,mult:1,line:[],lineLi:-1,built:[],log:[],slashL:-9,slashR:-9,flash:0,copilot:{status:'LINKING',since:t,pi:-1},tunnel:0,shake:0,hands:{L:{c:0.6,r:0.9},R:{c:2.4,r:0.9}},hint:0};
 // everything already past the hit plane counts as cut (autopilot history), so the arena behind you exists after a seek
 for(const b of S.blocks){if(b.hitT<t){b.active=true;S.spawned++;cut(b,b.hitT,true)}}if(S.built.length){S.copilot.pi=S.built.length-1;S.copilot.status='BUILDING';S.copilot.since=t}S.log=[]}
const xAt=(t:number)=>Math.max(0,Math.min(t,OUT+1.2)-s5)*SPD; // world x of the player at time t; you coast to a stop in the outro so the arena you built stays around you
function cut(b:any,t:number,silent=false){b.hit=t;S.hits++;S.combo++;S.maxCombo=Math.max(S.maxCombo,S.combo);S.mult=1+Math.min(3,Math.floor(S.combo/8));S.score+=100*S.mult;if(!silent)S.flash=Math.max(S.flash,0.18);
 if(b.li!==S.lineLi){S.lineLi=b.li;S.line=[]}S.line.push(b.word);if(b.echo&&S.line.length>5)S.line.shift();
 if(b.k%2===0||b.echo){const p=piece(b,S.built.length);p.x=xAt(b.hitT)+30+hash(b.li*7+b.k)*6;S.built.push(p);b.pieceI=p.i;b.cutN=S.hits;S.copilot.pi=p.i;S.copilot.status=(b.echo?'REMIXING ':['PLACING','GENERATING','COMPILING','TEXTURING'][Math.floor(hash(b.li*3+b.k)*4)]+' ')+p.kind.toUpperCase();S.copilot.since=t;log('AI > '+p.kind.toUpperCase()+' FROM "'+b.word.toUpperCase()+'"',b.side==='L'?MAG:CYAN);}else b.pieceI=-1;
 if(!silent){blip(b.side==='L'?880:1175,0.08,0.1);blip(b.side==='L'?1319:1760,0.12,0.06)}}
function slash(side:'L'|'R',t:number){if(side==='L')S.slashL=t;else S.slashR=t;let best:any=null,bd=WIN;for(const b of S.blocks){if(!b.active||b.hit||b.missed||b.side!==side)continue;const d=Math.abs(b.hitT-t);if(d<bd){bd=d;best=b}}if(best)cut(best,t);else{S.whiffs++;noise(0.05,0.12,3000)}}
function update(dt,t,inp,auto){if(t<s5-TRANS)return;S.t=t;S.dist=xAt(t);S.tunnel=t>=TUNNEL?clamp((t-TUNNEL)/(BAR*0.5),0,1):0;S.flash=Math.max(0,S.flash-dt);S.shake=Math.max(0,S.shake-dt);
 for(const b of S.blocks){if(!b.active&&t>=b.hitT-LEAD&&t<b.hitT+0.5){b.active=true;S.spawned++}}
 const H2=S.hands;const next=(side:string)=>{let best:any=null;for(const b of S.blocks){if(!b.active||b.hit||b.missed||b.side!==side)continue;if(b.hitT<t-0.1)continue;if(!best||b.hitT<best.hitT)best=b}return best};
 if(t>=s5&&t<OUT){
  if(auto){ // each hand winds up above its next block, then slashes down through it on the beat
   for(const side of['L','R']){const h=H2[side],nb=next(side);const lead=nb?nb.hitT-t:9;const tc=nb?nb.col:(side==='L'?0.6:2.4),tr=nb?nb.row+(lead<0.6?0.55*clamp(lead/0.3,0,1):0):0.9;const k=1-Math.pow(nb&&nb.hitT-t<0.5?0.00001:0.01,dt);h.c+=(tc-h.c)*k;h.r+=(tr-h.r)*k}
   for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&t>=b.hitT){if(b.side==='L')S.slashL=t;else S.slashR=t;cut(b,b.hitT)}}}
  else{const a=aim(t);const side=ptr.x<0.5?'L':'R',other=side==='L'?'R':'L';const h=H2[side],o=H2[other];const k=1-Math.pow(0.000001,dt);h.c+=(a.c-h.c)*k;h.r+=(a.r-h.r)*k;o.c+=((other==='L'?0.6:2.4)-o.c)*(1-Math.pow(0.05,dt));o.r+=(0.9-o.r)*(1-Math.pow(0.05,dt));
   for(const b of S.blocks){if(!b.active||b.hit||b.missed||Math.abs(b.hitT-t)>0.22)continue;for(const sd of['L','R']){const hh=H2[sd];if(Math.hypot(hh.c-b.col,hh.r-b.row)<0.7){if(sd==='L')S.slashL=t;else S.slashR=t;cut(b,t);break}}}}}
 for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&t>b.hitT+WIN){b.missed=t;S.misses++;S.combo=0;S.mult=1;S.shake=0.25;noise(0.1,0.25,900);blip(110,0.18,0.1)}}
 if(t>=OUT){if(S.copilot.status!=='ARENA COMPLETE'){S.copilot.status='ARENA COMPLETE';S.copilot.since=t}}
 else if(t-S.copilot.since>BEAT*3&&S.copilot.status!=='STANDING BY'){S.copilot.status='STANDING BY';S.copilot.since=t}}
const onBeat=(b,t,auto)=>{},on8th=onBeat,onLine=(words,t)=>{}; // no-ops: everything is planned from the lyric table
// ---- 2D fallback (no WebGL): lane, blocks, sabers ----
function draw(ctx,t){ctx.fillStyle='#07040f';ctx.fillRect(0,0,W,H);const cx=W/2,hy=H*0.42;ctx.strokeStyle='rgba(255,91,224,.5)';ctx.lineWidth=1;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*40,hy);ctx.lineTo(cx+i*260,H);ctx.stroke()}
 for(const b of S.blocks){if(!b.active||b.hit||b.missed)continue;const d=clamp((b.hitT-t)/LEAD,0,1);const sc=lerp(1,0.08,d);const x=cx+(b.col-1.5)*160*sc,y=hy+(1-d)*(H*0.45)-b.row*60*sc,s=46*sc;ctx.fillStyle=b.side==='L'?MAG:CYAN;ctx.fillRect(x-s/2,y-s/2,s,s);ctx.fillStyle='#fff';ctx.font=Math.max(5,10*sc)+"px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillText(b.word,x,y+3);ctx.textAlign='left'}}
// ---- HUD overlay (drawn over the GL frame) ----
function overlay(ctx,t){if(t<s5-TRANS*0.3)return;const pulse=1-((t/BEAT)%1);ctx.save();
 if(S.flash>0){ctx.fillStyle=`rgba(255,255,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}
 // headset on: two lenses open and merge into one view
 if(t<bar(76.3)){const q=clamp((t-s5)/(bar(76.3)-s5),0,1);const e=q*q*(3-2*q);const r=lerp(H*0.22,H*1.4,e),dx=lerp(W*0.23,0,e);ctx.fillStyle='#000';ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2-dx,H/2,r,0,Math.PI*2,true);ctx.fill();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2+dx,H/2,r,0,Math.PI*2,true);ctx.fill('evenodd')}
 // score, small
 ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='rgba(6,8,20,.55)';ctx.fillRect(16,64,196,46);ctx.fillStyle='#fff';ctx.fillText('SCORE '+String(S.score).padStart(6,'0'),26,84);ctx.fillStyle=YEL;ctx.fillText('COMBO x'+S.combo+'  '+S.mult+'x',26,102);
 // end card: dim the arena so the card over it is the most legible frame of the piece
 if(t>=bar(94.9)){ctx.fillStyle=`rgba(0,0,0,${0.62*clamp((t-bar(94.9))/0.8,0,1)})`;ctx.fillRect(0,0,W,H)}
 // one hint while the hands first appear, above the lane (not over the hit line or the captions)
 if(t>=bar(76.3)&&t<bar(78.3)){ctx.globalAlpha=Math.min(1,(bar(78.3)-t)/0.6,(t-bar(76.3))/0.3);ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";const l1=MOBILE?'SLIDE A FINGER THROUGH THE WORDS':'MOVE THE MOUSE THROUGH THE WORDS',y=H*0.13;const tw=ctx.measureText(l1).width+28;ctx.fillStyle='rgba(6,8,20,.6)';ctx.fillRect(W/2-tw/2,y,tw,40);ctx.fillStyle='#fff';ctx.fillText(l1,W/2,y+16);ctx.fillStyle='#8a8aa0';ctx.fillText('·',W/2,y+32);ctx.textAlign='right';ctx.fillStyle=MAG;ctx.fillText('LEFT HALF = MAGENTA',W/2-14,y+32);ctx.textAlign='left';ctx.fillStyle=CYAN;ctx.fillText('RIGHT HALF = CYAN',W/2+14,y+32);ctx.textAlign='left';ctx.globalAlpha=1}
 ctx.restore()}
return{init,update,draw,overlay,onBeat,on8th,onLine,get S(){return S},K:{SPD,LEAD,COLS,ROWS,TUNNEL,OUT,s5,WIN,HIT,BACK,EYE,COLW,ROW0,ROWH,fovAt}}})();
