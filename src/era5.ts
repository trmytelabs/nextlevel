import {ERAS,TRANS,BAR,BEAT,bar,W,H,LYRICS,hash,clamp,lerp,smooth,blip,noise,ptr,MOBILE} from './core';

// ---------- ERA 5: NOW. A VR rhythm game (saber lane) with an AI co-pilot that builds the arena out of every word you cut ----------
// The whole lyric table is known, so blocks are planned up front: each word of each line is a block that reaches the
// hit plane on an 8th-note grid inside its line. ONE saber follows the mouse or finger anywhere on screen and cuts any
// block it passes through. Consecutive blocks are always neighbours (one column over, at most one row), ping-ponging
// between two columns on 8th notes, so a single cursor can reach every block on the beat. Each lyric line has its own
// colour (looks only). The co-pilot turns every other cut word into a piece of arena ahead of you.
// Deterministic: seek() replans from the table and rebuilds the arena pieces for everything already cut.
export const E5=(()=>{
const s5=ERAS[4].start,OUT=bar(94),TUNNEL=bar(89),SPD=13,LEAD=2.4,COLS=4,ROWS=3,WIN=0.18,HITWIN=0.22,RZ=0.48,RY=0.36; // RZ/RY: half-size (world units) of the cut zone around a block's centre, a little larger than the block face
const MAG='#ff5be0',CYAN='#4df0ff',GRN='#5bff5b',YEL='#ffe14d',VIO='#b07cff';
const HUES=[MAG,CYAN,VIO]; // block colour per lyric line (looks only, not a hand)
const KINDS=['arch','pillar','panel','ring'];
// lane geometry shared with the renderer (world units): the hit plane is HIT ahead of the player, the camera sits BACK behind
// the player at eye height EYE looking slightly down; column c is at z=(c-1.5)*COLW, row r at y=ROW0+r*ROWH
const HIT=2.4,BACK=0.6,EYE=1.65,COLW=1.0,ROW0=0.85,ROWH=0.68,PITCH=-0.3/9.6;
// gameplay field of view at time t (the renderer's camera eases towards it): lens-open 60 -> 72, tunnel 84
const fovAt=(t:number)=>{let f=t>=TUNNEL?84:72;const b=t/BAR;if(b<76.3)f=lerp(f,60,1-smooth((b-75)/1.3));return f};
// pointer -> saber tip: put the tip exactly under the pointer by intersecting the pointer ray with the hit plane
function aim(t:number){const D=HIT+BACK,tv=Math.tan(fovAt(t)*Math.PI/360),nx=ptr.x*2-1,ny=1-ptr.y*2;const z=nx*D*tv*(W/H),y=EYE+D*PITCH+ny*D*tv;return{c:clamp(z/COLW+1.5,-0.45,COLS-0.55),r:clamp((y-ROW0)/ROWH,-0.45,ROWS-0.55)}}
// inverse of aim (tests and tools): where on the canvas (0..1) a lane cell sits at time t
function screenOf(c:number,r:number,t:number){const D=HIT+BACK,tv=Math.tan(fovAt(t)*Math.PI/360);const nx=(c-1.5)*COLW/(D*tv*(W/H)),ny=(ROW0+r*ROWH-EYE-D*PITCH)/(D*tv);return{x:(nx+1)/2,y:(1-ny)/2}}
let S:any;
// one-column step for the next block: ping-pong between two neighbouring columns on 8ths (sometimes drifting on),
// wander either way on slower notes; never off the lane and never the same cell twice in a row
function stepCol(col:number,dir:number,fast:boolean,h:number){let d=fast?(h<0.4?dir:-dir):(h<0.5?-1:1);if(col+d<0||col+d>COLS-1)d=-d;return d}
const stepRow=(row:number,fast:boolean,h:number)=>clamp(row+(fast?(h<0.6?0:h<0.8?-1:1):(h<0.34?-1:h<0.67?0:1)),0,ROWS-1);
function plan(){const out:any[]=[];LYRICS.forEach((l,li)=>{const b=l[0];if(b<75||b>=94)return;const words=l[1].replace(/[.,!?]/g,'').split(' ').filter(Boolean);const n=words.length;const step=Math.max(0.5,Math.floor(12/n)/2)*BEAT;const t0=bar(b)+BEAT*0.5;const fast=step<BEAT;
  let col=Math.min(COLS-1,Math.floor(hash(li*31)*COLS)),row=Math.floor(hash(li*17)*ROWS),dir=hash(li*5)<0.5?-1:1;const hue=out.length?(out[out.length-1].hue+1)%HUES.length:0;
  words.forEach((w,k)=>{if(k>0){dir=stepCol(col,dir,fast,hash(li*31+k*7));col+=dir;row=stepRow(row,fast,hash(li*17+k*3))}out.push({id:li+'-'+k,li,k,word:w,hitT:t0+k*step,hue,col,row,hit:0,missed:0,active:false})})});
 // tunnel run: after the last line the chorus words come back faster (every 8th) so the build keeps going to the stop
 const last=out[out.length-1];const echo=['MAXIMALIST','READY','DEPUTY','TURN','IT','UP','EVERYTHING','THEN','MORE','SPEED','OF','LIGHT'];let k=0,col=last?last.col:1,row=last?last.row:1,dir=1;
 for(let tt=(last?last.hitT:bar(90))+BEAT*1.5;tt<bar(93.8);tt+=BEAT*0.5,k++){dir=stepCol(col,dir,true,hash(k*5.7));col+=dir;row=stepRow(row,true,hash(k*3.1));out.push({id:'e-'+k,li:99,k,word:echo[k%echo.length],hitT:tt,hue:Math.floor(k/4)%HUES.length,col,row,hit:0,missed:0,active:false,echo:true})}return out}
// arena pieces rise on the side of the lane the word was cut on
function piece(b:any,i:number){const kind=KINDS[Math.floor(hash(b.li*13+b.k*5)*KINDS.length)];return{word:b.word,kind,x:0,t:b.hit||b.hitT,i,side:b.col<1.5?'L':'R',hue:b.hue,li:b.li}}
function log(text:string,col:string){S.log.unshift({text,col});if(S.log.length>4)S.log.pop()}
function init(t){S={t,dist:Math.max(0,t-s5)*SPD,blocks:plan(),hits:0,misses:0,whiffs:0,spawned:0,score:0,combo:0,maxCombo:0,mult:1,line:[],lineLi:-1,built:[],log:[],slashT:-9,flash:0,copilot:{status:'LINKING',since:t,pi:-1},tunnel:0,shake:0,saber:{c:1.5,r:1,pc:1.5,pr:1,hue:0},hint:0};
 // everything already past the hit plane counts as cut (autopilot history), so the arena behind you exists after a seek
 for(const b of S.blocks){if(b.hitT<t){b.active=true;S.spawned++;cut(b,b.hitT,true)}}if(S.built.length){S.copilot.pi=S.built.length-1;S.copilot.status='BUILDING';S.copilot.since=t}S.log=[];S.slashT=-9}
const xAt=(t:number)=>Math.max(0,Math.min(t,OUT+1.2)-s5)*SPD; // world x of the player at time t; you coast to a stop in the outro so the arena you built stays around you
function cut(b:any,t:number,silent=false){b.hit=t;S.hits++;S.combo++;S.maxCombo=Math.max(S.maxCombo,S.combo);S.mult=1+Math.min(3,Math.floor(S.combo/8));S.score+=100*S.mult;S.slashT=t;S.saber.hue=b.hue;if(!silent)S.flash=Math.max(S.flash,0.18);
 if(b.li!==S.lineLi){S.lineLi=b.li;S.line=[]}S.line.push(b.word);if(b.echo&&S.line.length>5)S.line.shift();
 if(b.k%2===0||b.echo){const p=piece(b,S.built.length);p.x=xAt(b.hitT)+30+hash(b.li*7+b.k)*6;S.built.push(p);b.pieceI=p.i;b.cutN=S.hits;S.copilot.pi=p.i;S.copilot.status=(b.echo?'REMIXING ':['PLACING','GENERATING','COMPILING','TEXTURING'][Math.floor(hash(b.li*3+b.k)*4)]+' ')+p.kind.toUpperCase();S.copilot.since=t;log('AI > '+p.kind.toUpperCase()+' FROM "'+b.word.toUpperCase()+'"',HUES[b.hue]);}else b.pieceI=-1;
 if(!silent){const f=1+b.col*0.08+b.row*0.05;blip(880*f,0.08,0.1);blip(1319*f,0.12,0.06)}}
// autopilot saber: a pure function of time. It rests a little above the last cut, then swings: winds up above the next
// block and slashes down through it exactly on its beat (the renderer adds the follow-through below the block)
function autoSaber(t:number){let pv:any=null,nb:any=null;for(const b of S.blocks){if(b.hitT<=t){if(!pv||b.hitT>pv.hitT)pv=b}else if(!nb||b.hitT<nb.hitT)nb=b}
 const sb=S.saber;if(!pv&&!nb){sb.c=1.5;sb.r=1;return}const fc=pv?pv.col:1.5,ft=pv?pv.hitT:-9;
 if(!nb){const q=clamp((t-ft)/0.4,0,1);sb.c=fc;sb.r=pv.row+0.35*smooth(q);return}
 const SW=Math.min(0.42,nb.hitT-(pv?pv.hitT:nb.hitT-0.42)),ts=nb.hitT-SW;const fr=(pv?pv.row:1)+0.3*clamp((Math.min(t,ts)-ft)/0.25,0,1);
 if(t<ts){sb.c=fc;sb.r=fr+Math.sin(t*4)*0.03;return}const u=clamp((t-ts)/SW,0,1),e=u*u*(3-2*u);sb.c=lerp(fc,nb.col,e);sb.r=lerp(fr,nb.row,u*u)+0.75*Math.sin(Math.PI*Math.pow(u,0.75))}
// how far the saber's path this frame passes from block cell (bc,br), in cut-zone units (<1 = through the block)
function sweepDist(bc:number,br:number,c0:number,r0:number,c1:number,r1:number){const ax=(c0-bc)*COLW/RZ,ay=(r0-br)*ROWH/RY,dx=(c1-c0)*COLW/RZ,dy=(r1-r0)*ROWH/RY;const l2=dx*dx+dy*dy;const u=l2>1e-9?clamp(-(ax*dx+ay*dy)/l2,0,1):0;return Math.hypot(ax+dx*u,ay+dy*u)}
function update(dt,t,inp,auto){if(t<s5-TRANS)return;S.t=t;S.dist=xAt(t);S.tunnel=t>=TUNNEL?clamp((t-TUNNEL)/(BAR*0.5),0,1):0;S.flash=Math.max(0,S.flash-dt);S.shake=Math.max(0,S.shake-dt);
 for(const b of S.blocks){if(!b.active&&t>=b.hitT-LEAD&&t<b.hitT+0.5){b.active=true;S.spawned++}}
 const sb=S.saber;sb.pc=sb.c;sb.pr=sb.r;
 {let nb:any=null;for(const b of S.blocks){if(b.hit||b.missed||b.hitT<t-0.1)continue;if(!nb||b.hitT<nb.hitT)nb=b}if(nb&&nb.hitT-t<0.6&&t-S.slashT>0.12)sb.hue=nb.hue} // the blade takes the colour of the block it is about to cut (after the last cut's flash)
 if(t>=s5&&t<OUT){
  if(auto){autoSaber(t);for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&t>=b.hitT)cut(b,b.hitT)}}
  else{const a=aim(t);const k=1-Math.pow(0.000001,dt);sb.c+=(a.c-sb.c)*k;sb.r+=(a.r-sb.r)*k;
   // any block near its beat that the saber passes through this frame is cut (a fast swipe counts along its whole path)
   for(const b of S.blocks){if(!b.active||b.hit||b.missed||Math.abs(b.hitT-t)>HITWIN)continue;if(sweepDist(b.col,b.row,sb.pc,sb.pr,sb.c,sb.r)<1)cut(b,t)}}}
 for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&t>b.hitT+HITWIN){b.missed=t;S.misses++;S.combo=0;S.mult=1;S.shake=0.25;noise(0.1,0.25,900);blip(110,0.18,0.1)}}
 if(t>=OUT){if(S.copilot.status!=='ARENA COMPLETE'){S.copilot.status='ARENA COMPLETE';S.copilot.since=t}}
 else if(t-S.copilot.since>BEAT*3&&S.copilot.status!=='STANDING BY'){S.copilot.status='STANDING BY';S.copilot.since=t}}
const onBeat=(b,t,auto)=>{},on8th=onBeat,onLine=(words,t)=>{}; // no-ops: everything is planned from the lyric table
// ---- 2D fallback (no WebGL): lane, blocks, saber ----
function draw(ctx,t){ctx.fillStyle='#07040f';ctx.fillRect(0,0,W,H);const cx=W/2,hy=H*0.42;ctx.strokeStyle='rgba(255,91,224,.5)';ctx.lineWidth=1;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*40,hy);ctx.lineTo(cx+i*260,H);ctx.stroke()}
 for(const b of S.blocks){if(!b.active||b.hit||b.missed)continue;const d=clamp((b.hitT-t)/LEAD,0,1);const sc=lerp(1,0.08,d);const x=cx+(b.col-1.5)*160*sc,y=hy+(1-d)*(H*0.45)-b.row*60*sc,s=46*sc;ctx.fillStyle=HUES[b.hue];ctx.fillRect(x-s/2,y-s/2,s,s);ctx.fillStyle='#fff';ctx.font=Math.max(5,10*sc)+"px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillText(b.word,x,y+3);ctx.textAlign='left'}
 if(t>=bar(75.6)&&t<OUT){const sx=cx+(S.saber.c-1.5)*160,sy=hy+H*0.45-S.saber.r*60;ctx.strokeStyle=HUES[S.saber.hue];ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx+60,H);ctx.lineTo(sx,sy);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}}
// ---- HUD overlay (drawn over the GL frame) ----
function overlay(ctx,t){if(t<s5-TRANS*0.3)return;ctx.save();
 if(S.flash>0){ctx.fillStyle=`rgba(255,255,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}
 // headset on: two lenses open and merge into one view
 if(t<bar(76.3)){const q=clamp((t-s5)/(bar(76.3)-s5),0,1);const e=q*q*(3-2*q);const r=lerp(H*0.22,H*1.4,e),dx=lerp(W*0.23,0,e);ctx.fillStyle='#000';ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2-dx,H/2,r,0,Math.PI*2,true);ctx.fill();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2+dx,H/2,r,0,Math.PI*2,true);ctx.fill('evenodd')}
 // score, small
 ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='rgba(6,8,20,.55)';ctx.fillRect(16,64,196,46);ctx.fillStyle='#fff';ctx.fillText('SCORE '+String(S.score).padStart(6,'0'),26,84);ctx.fillStyle=YEL;ctx.fillText('COMBO x'+S.combo+'  '+S.mult+'x',26,102);
 // end card: dim the arena so the card over it is the most legible frame of the piece
 if(t>=bar(94.9)){ctx.fillStyle=`rgba(0,0,0,${0.62*clamp((t-bar(94.9))/0.8,0,1)})`;ctx.fillRect(0,0,W,H)}
 // one hint line while the saber first appears, above the lane (not over the hit line or the captions)
 if(t>=bar(76.3)&&t<bar(78.3)){ctx.globalAlpha=Math.min(1,(bar(78.3)-t)/0.6,(t-bar(76.3))/0.3);ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";const l1=MOBILE?'DRAG THE SABER THROUGH THE WORDS':'MOVE THE SABER THROUGH THE WORDS',y=H*0.13;const tw=ctx.measureText(l1).width+28;ctx.fillStyle='rgba(6,8,20,.6)';ctx.fillRect(W/2-tw/2,y,tw,26);ctx.fillStyle='#fff';ctx.fillText(l1,W/2,y+17);ctx.textAlign='left';ctx.globalAlpha=1}
 ctx.restore()}
return{init,update,draw,overlay,onBeat,on8th,onLine,get S(){return S},K:{SPD,LEAD,COLS,ROWS,TUNNEL,OUT,s5,WIN,HITWIN,RZ,RY,HIT,BACK,EYE,COLW,ROW0,ROWH,PITCH,HUES,fovAt,screenOf}}})();
