import {ERAS,TRANS,BAR,BEAT,bar,W,H,LYRICS,hash,clamp,lerp,smooth,blip,noise,ptr,MOBILE,TOTAL,cb,cbInv} from './core';
import {eggFind} from './eggs';
import {plate,drawPlate} from './startgl';

// ---------- ERA 5: NOW. A VR rhythm game (saber lane) with an AI co-pilot that builds the arena out of every word you cut ----------
// The whole lyric table is known, so blocks are planned up front: each word of each line is a block that reaches the
// hit plane on an 8th-note grid inside its line. ONE saber follows the mouse or finger anywhere on screen and cuts any
// block it passes through. Consecutive blocks are always neighbours (one column over, at most one row), ping-ponging
// between two columns on 8th notes, so a single cursor can reach every block on the beat. Each lyric line has its own
// colour (looks only). The co-pilot turns every other cut word into a piece of arena ahead of you.
// Deterministic: seek() replans from the table and rebuilds the arena pieces for everything already cut.
export const E5=(()=>{
const s5=ERAS[4].start,OUT=cb(94),TUNNEL=cb(89),SPD=13,LEAD=2.4,COLS=4,ROWS=3,WIN=0.18,HITWIN=0.22,RZ=0.48,RY=0.36; // RZ/RY: half-size (world units) of the cut zone around a block's centre, a little larger than the block face
const MAG='#ff5be0',CYAN='#4df0ff',GRN='#5bff5b',YEL='#ffe14d',VIO='#b07cff';
const HUES=[MAG,CYAN,VIO]; // block colour per lyric line (looks only, not a hand)
const KINDS=['arch','pillar','panel','ring'];
// lane geometry shared with the renderer (world units): the hit plane is HIT ahead of the player, the camera sits BACK behind
// the player at eye height EYE looking slightly down; column c is at z=(c-1.5)*COLW, row r at y=ROW0+r*ROWH
const HIT=2.4,BACK=0.6,EYE=1.65,COLW=1.0,ROW0=0.85,ROWH=0.68,PITCH=-0.3/9.6;
// gameplay field of view at time t (the renderer's camera eases towards it): lens-open 60 -> 72, tunnel 84
const fovAt=(t:number)=>{let f=t>=TUNNEL?84:72;const b=cbInv(t);if(b<76.3)f=lerp(f,60,1-smooth((b-75)/1.3));return f};
// pointer -> saber tip: put the tip exactly under the pointer by intersecting the pointer ray with the hit plane
function aim(t:number){const D=HIT+BACK,tv=Math.tan(fovAt(t)*Math.PI/360),nx=ptr.x*2-1,ny=1-ptr.y*2;const z=nx*D*tv*(W/H),y=EYE+D*PITCH+ny*D*tv;return{c:clamp(z/COLW+1.5,-0.45,COLS-0.55),r:clamp((y-ROW0)/ROWH,-0.45,ROWS-0.55)}}
// inverse of aim (tests and tools): where on the canvas (0..1) a lane cell sits at time t
function screenOf(c:number,r:number,t:number){const D=HIT+BACK,tv=Math.tan(fovAt(t)*Math.PI/360);const nx=(c-1.5)*COLW/(D*tv*(W/H)),ny=(ROW0+r*ROWH-EYE-D*PITCH)/(D*tv);return{x:(nx+1)/2,y:(1-ny)/2}}
let S:any;
// one-column step for the next block: ping-pong between two neighbouring columns on 8ths (sometimes drifting on),
// wander either way on slower notes; never off the lane and never the same cell twice in a row
function stepCol(col:number,dir:number,fast:boolean,h:number){let d=fast?(h<0.4?dir:-dir):(h<0.5?-1:1);if(col+d<0||col+d>COLS-1)d=-d;return d}
const stepRow=(row:number,fast:boolean,h:number)=>clamp(row+(fast?(h<0.6?0:h<0.8?-1:1):(h<0.34?-1:h<0.67?0:1)),0,ROWS-1);
function plan(){const out:any[]=[];LYRICS.forEach((l,li)=>{const b=l[0];if(li<30||li>37)return;const words=l[1].replace(/[.,!?]/g,'').split(' ').filter(Boolean);const n=words.length;const t0=bar(b)+BEAT*0.5,nx=LYRICS[li+1]?bar(LYRICS[li+1][0]):t0+BAR*2;const step=Math.min(Math.max(0.5,Math.floor(12/n)/2)*BEAT,Math.max(BEAT*0.5,(nx-t0-BEAT*0.5)/Math.max(1,n-1)));const fast=step<BEAT;
  let col=Math.min(COLS-1,Math.floor(hash(li*31)*COLS)),row=Math.floor(hash(li*17)*ROWS),dir=hash(li*5)<0.5?-1:1;const hue=out.length?(out[out.length-1].hue+1)%HUES.length:0;
  words.forEach((w,k)=>{if(k>0){dir=stepCol(col,dir,fast,hash(li*31+k*7));col+=dir;row=stepRow(row,fast,hash(li*17+k*3))}out.push({id:li+'-'+k,li,k,word:w,hitT:t0+k*step,hue,col,row,hit:0,missed:0,active:false})})});
 // tunnel run: after the last line the chorus words come back faster (every 8th) so the build keeps going to the stop
 const last=out[out.length-1];const echo=['MAXIMALIST','READY','DEPUTY','TURN','IT','UP','EVERYTHING','THEN','MORE','SPEED','OF','LIGHT'];let k=0,col=last?last.col:1,row=last?last.row:1,dir=1;
 for(let tt=(last?last.hitT:cb(90))+BEAT*1.5;tt<cb(93.8);tt+=BEAT*0.5,k++){dir=stepCol(col,dir,true,hash(k*5.7));col+=dir;row=stepRow(row,true,hash(k*3.1));out.push({id:'e-'+k,li:99,k,word:echo[k%echo.length],hitT:tt,hue:Math.floor(k/4)%HUES.length,col,row,hit:0,missed:0,active:false,echo:true})}
 // secret 5: one golden block in the gap after "turn it up to eleven" (bar 84.7), top-left, away from the path. A player who
 // cuts it finds it; the autopilot leaves it, and missing it costs nothing (no combo break, not counted as spawned or missed)
 out.push({id:'gold',li:-1,k:0,word:'?',hitT:cb(84.7),hue:3,col:0,row:2,hit:0,missed:0,active:false,gold:true});
 return out}
// arena pieces rise on the side of the lane the word was cut on
function piece(b:any,i:number){const kind=KINDS[Math.floor(hash(b.li*13+b.k*5)*KINDS.length)];return{word:b.word,kind,x:0,t:b.hit||b.hitT,i,side:b.col<1.5?'L':'R',hue:b.hue,li:b.li}}
function log(text:string,col:string){S.log.unshift({text,col});if(S.log.length>4)S.log.pop()}
function init(t){S={t,dist:Math.max(0,t-s5)*SPD,blocks:plan(),hits:0,misses:0,whiffs:0,spawned:0,score:0,combo:0,maxCombo:0,mult:1,line:[],lineLi:-1,built:[],log:[],slashT:-9,flash:0,copilot:{status:'LINKING',since:t,pi:-1},tunnel:0,shake:0,saber:{c:1.5,r:1,pc:1.5,pr:1,hue:0},hint:0};
 // everything already past the hit plane counts as cut (autopilot history), so the arena behind you exists after a seek
 for(const b of S.blocks){if(b.hitT<t){b.active=true;if(b.gold){b.missed=b.hitT;continue}S.spawned++;cut(b,b.hitT,true)}}if(S.built.length){S.copilot.pi=S.built.length-1;S.copilot.status='BUILDING';S.copilot.since=t}S.log=[];S.slashT=-9}
const xAt=(t:number)=>Math.max(0,Math.min(t,OUT+1.2)-s5)*SPD; // world x of the player at time t; you coast to a stop in the outro so the arena you built stays around you
function cut(b:any,t:number,silent=false){if(b.gold){b.hit=t;S.slashT=t;S.flash=0.45;S.score+=1000;eggFind(4,false);blip(1568,0.1,0.12);blip(2093,0.16,0.1);return}b.hit=t;S.hits++;S.combo++;S.maxCombo=Math.max(S.maxCombo,S.combo);S.mult=1+Math.min(3,Math.floor(S.combo/8));S.score+=100*S.mult;S.slashT=t;S.saber.hue=b.hue;if(!silent)S.flash=Math.max(S.flash,0.18);
 if(b.li!==S.lineLi){S.lineLi=b.li;S.line=[]}S.line.push(b.word);if(b.echo&&S.line.length>5)S.line.shift();
 if(b.k%2===0||b.echo){const p=piece(b,S.built.length);p.x=xAt(b.hitT)+30+hash(b.li*7+b.k)*6;S.built.push(p);b.pieceI=p.i;b.cutN=S.hits;S.copilot.pi=p.i;S.copilot.status=(b.echo?'REMIXING ':['PLACING','GENERATING','COMPILING','TEXTURING'][Math.floor(hash(b.li*3+b.k)*4)]+' ')+p.kind.toUpperCase();S.copilot.since=t;log('AI > '+p.kind.toUpperCase()+' FROM "'+b.word.toUpperCase()+'"',HUES[b.hue]);}else b.pieceI=-1;
 if(!silent){const f=1+b.col*0.08+b.row*0.05;blip(880*f,0.08,0.1);blip(1319*f,0.12,0.06)}}
// autopilot saber: a pure function of time. It rests a little above the last cut, then swings: winds up above the next
// block and slashes down through it exactly on its beat (the renderer adds the follow-through below the block)
function autoSaber(t:number){let pv:any=null,nb:any=null;for(const b of S.blocks){if(b.gold)continue;if(b.hitT<=t){if(!pv||b.hitT>pv.hitT)pv=b}else if(!nb||b.hitT<nb.hitT)nb=b}
 const sb=S.saber;if(!pv&&!nb){sb.c=1.5;sb.r=1;return}const fc=pv?pv.col:1.5,ft=pv?pv.hitT:-9;
 if(!nb){const q=clamp((t-ft)/0.4,0,1);sb.c=fc;sb.r=pv.row+0.35*smooth(q);return}
 const SW=Math.min(0.42,nb.hitT-(pv?pv.hitT:nb.hitT-0.42)),ts=nb.hitT-SW;const fr=(pv?pv.row:1)+0.3*clamp((Math.min(t,ts)-ft)/0.25,0,1);
 if(t<ts){sb.c=fc;sb.r=fr+Math.sin(t*4)*0.03;return}const u=clamp((t-ts)/SW,0,1),e=u*u*(3-2*u);sb.c=lerp(fc,nb.col,e);sb.r=lerp(fr,nb.row,u*u)+0.75*Math.sin(Math.PI*Math.pow(u,0.75))}
// how far the saber's path this frame passes from block cell (bc,br), in cut-zone units (<1 = through the block)
function sweepDist(bc:number,br:number,c0:number,r0:number,c1:number,r1:number){const ax=(c0-bc)*COLW/RZ,ay=(r0-br)*ROWH/RY,dx=(c1-c0)*COLW/RZ,dy=(r1-r0)*ROWH/RY;const l2=dx*dx+dy*dy;const u=l2>1e-9?clamp(-(ax*dx+ay*dy)/l2,0,1):0;return Math.hypot(ax+dx*u,ay+dy*u)}
function update(dt,t,inp,auto){if(t<s5-TRANS)return;S.t=t;S.dist=xAt(t);S.tunnel=t>=TUNNEL?clamp((t-TUNNEL)/(BAR*0.5),0,1):0;S.flash=Math.max(0,S.flash-dt);S.shake=Math.max(0,S.shake-dt);
 for(const b of S.blocks){if(!b.active&&t>=b.hitT-LEAD&&t<b.hitT+0.5){b.active=true;if(!b.gold)S.spawned++}}
 const sb=S.saber;sb.pc=sb.c;sb.pr=sb.r;
 {let nb:any=null;for(const b of S.blocks){if(b.hit||b.missed||b.hitT<t-0.1)continue;if(!nb||b.hitT<nb.hitT)nb=b}if(nb&&nb.hitT-t<0.6&&t-S.slashT>0.12)sb.hue=nb.hue} // the blade takes the colour of the block it is about to cut (after the last cut's flash)
 if(t>=s5&&t<OUT){
  if(auto){autoSaber(t);for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&!b.gold&&t>=b.hitT)cut(b,b.hitT)}}
  else{const a=aim(t);const k=1-Math.pow(0.000001,dt);sb.c+=(a.c-sb.c)*k;sb.r+=(a.r-sb.r)*k;
   // any block near its beat that the saber passes through this frame is cut (a fast swipe counts along its whole path)
   for(const b of S.blocks){if(!b.active||b.hit||b.missed||Math.abs(b.hitT-t)>HITWIN)continue;if(sweepDist(b.col,b.row,sb.pc,sb.pr,sb.c,sb.r)<1)cut(b,t)}}}
 for(const b of S.blocks){if(b.active&&!b.hit&&!b.missed&&t>b.hitT+HITWIN){b.missed=t;if(b.gold)continue;S.misses++;S.combo=0;S.mult=1;S.shake=0.25;noise(0.1,0.25,900);blip(110,0.18,0.1)}}
 if(t>=OUT){if(S.copilot.status!=='ARENA COMPLETE'){S.copilot.status='ARENA COMPLETE';S.copilot.since=t}}
 else if(t-S.copilot.since>BEAT*3&&S.copilot.status!=='STANDING BY'){S.copilot.status='STANDING BY';S.copilot.since=t}}
// ---- finale card (bars 94-96), shared with the renderer. The cut words stream out of the arena and assemble into a
// voxel NEXT LEVEL (era5gl.ts) that locks on the bar-95 downbeat; then this 2D type layer drops the name in with a light
// sweep, types the invite word by word on 16ths and pulses the prompt. The caption hides at capOff (main.ts) so the sung
// "Ready when you are. Press start." and the card's prompt are never on screen together. Times in bars.
const CARD={fly:94.0,lock:95.0,name:95.0,nameIn:0.125,prog:95.19,invite:95.3,credit:95.45,capOff:95.5,prompt:95.625,
 nameY:0.48,progY:0.567,inviteY:0.64,creditY:0.69,promptY:0.80,nameFont:40,progFont:11,copilotX:0.875}; // layout: canvas fractions / px
const CT={name:'IAN GINN',sep:'  ·  ',prog:"INSPIRED BY THE DEPUTY'S MAXIMALISTS",invite:'Imagine what we could build together.',credit:'Built with AI agents, asking to build with people.',prompt:'READY WHEN YOU ARE  ·  PRESS START'};
const ease3=(x:number)=>1-Math.pow(1-clamp(x,0,1),3);
function card(ctx:CanvasRenderingContext2D,t:number){const b=cbInv(t);if(b<CARD.fly)return;const dpr=ctx.getTransform().a||1;
 // the hold after the song ends keeps the prompt alive on the wall clock (t stops at TOTAL)
 const tp=t>=TOTAL-1e-3?performance.now()/1000:t;
 // white-hot frame on the lock downbeat
 const sinceLock=t-cb(CARD.lock);if(sinceLock>=0&&sinceLock<0.5){ctx.fillStyle=`rgba(255,240,255,${0.32*Math.exp(-sinceLock*14)})`;ctx.fillRect(0,0,W,H)}
 if(b<CARD.name)return;
 // a soft dark bed under the type block (the floor reflects the title right where the lines sit)
 const bed=smooth(clamp((b-CARD.name)/0.25,0,1));if(bed>0){const y0=H*0.40,y1=H*0.86;const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'rgba(4,2,12,0)');g.addColorStop(0.18,`rgba(4,2,12,${0.62*bed})`);g.addColorStop(0.8,`rgba(4,2,12,${0.62*bed})`);g.addColorStop(1,'rgba(4,2,12,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,y1-y0)}
 ctx.save();ctx.textBaseline='middle';
 // 1) name: IAN GINN on its own line as a voxel plate (white tiles, violet extrusion, cyan glow; startgl.ts, shared with the
 // title screen), the second-largest thing on the card. Drops in from above with weight, squashes as it lands on the 8th
 // after the lock, then a light sweep runs across it. The program line follows, smaller, with an underline drawing out.
 {const p=plate(CT.name,CARD.nameFont),q=clamp((b-CARD.name)/CARD.nameIn,0,1),e=q*q,land=b-(CARD.name+CARD.nameIn),cy=H*CARD.nameY,dy=-46*(1-e);
  const squash=land>=0&&land<0.12?Math.sin(land/0.12*Math.PI)*0.28*(1-land/0.12):0;
  if(q<1)drawPlate(ctx,p,W/2,cy+dy-14*(1-q),{a:0.3*q,sy:1.5}); // speed smear on the way down
  drawPlate(ctx,p,W/2,cy+dy,{a:Math.min(1,q*1.6),sx:1+squash*0.6,sy:1-squash,sweep:land/0.3});
  if(b>=CARD.prog){const a=smooth(clamp((b-CARD.prog)/0.1,0,1)),py=H*CARD.progY+(1-a)*4;ctx.globalAlpha=a;ctx.textAlign='center';ctx.font=`${CARD.progFont}px 'Press Start 2P',monospace`;
   ctx.fillStyle='#000';ctx.fillText(CT.prog,W/2+1,py+1);ctx.fillStyle='#5bff5b';ctx.fillText(CT.prog,W/2,py);
   const tw=ctx.measureText(CT.prog).width,u=ease3((b-CARD.prog)/0.2);ctx.fillStyle='rgba(91,255,91,.6)';ctx.fillRect(W/2-u*tw*0.5,H*CARD.progY+CARD.progFont*0.5+6,u*tw,1);ctx.globalAlpha=1}}
 // 2) invite: types on word by word on 16ths, with a block cursor
 if(b>=CARD.invite){ctx.font="11px 'Press Start 2P',monospace";ctx.textAlign='left';const words=CT.invite.split(' ');const full=ctx.measureText(CT.invite).width,x0=W/2-full/2,cy=H*CARD.inviteY;let x=x0,last=-1;
  for(let k=0;k<words.length;k++){const tk=cb(CARD.invite+k*0.0625),pre=words.slice(0,k).join(' ')+(k?' ':'');const wx=x0+ctx.measureText(pre).width;if(t<tk)break;last=k;const a=clamp((t-tk)/0.07,0,1);ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.fillText(words[k],wx+1,cy+1+(1-a)*5);ctx.fillStyle=k===words.length-1?'#ffe14d':'#ffffff';ctx.fillText(words[k],wx,cy+(1-a)*5);x=wx+ctx.measureText(words[k]).width}
  ctx.globalAlpha=1;const done=last===words.length-1&&t-cb(CARD.invite+last*0.0625)>0.15;if(!done||Math.floor(tp*2.4)%2===0){ctx.fillStyle=done?'rgba(255,225,77,.8)':'#ffffff';ctx.fillRect(x+5,cy-6,8,12)}}
 // 3) the credit, small, as a quiet footnote under the invite
 if(b>=CARD.credit){const a=smooth(clamp((b-CARD.credit)/0.12,0,1));ctx.globalAlpha=a;ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#000';ctx.fillText(CT.credit,W/2+1,H*CARD.creditY+1);ctx.fillStyle='#a9aec4';ctx.fillText(CT.credit,W/2,H*CARD.creditY);ctx.globalAlpha=1}
 // 4) the prompt: pops in on the off-beat after the caption has gone, then pulses on the beat
 if(b>=CARD.prompt){const q=clamp((b-CARD.prompt)/0.08,0,1),pop=1+0.35*(1-ease3(q));const ph=(tp/BEAT)%1,pulse=0.5+0.5*Math.cos(ph*Math.PI*2);
  ctx.font="11px 'Press Start 2P',monospace";ctx.textAlign='center';const pw=ctx.measureText(CT.prompt).width,cy=H*CARD.promptY;
  ctx.save();ctx.translate(W/2,cy);ctx.scale(pop,pop);ctx.globalAlpha=q;
  const bw=pw+64,bh=26;ctx.fillStyle='rgba(6,4,16,.78)';ctx.fillRect(-bw/2,-bh/2,bw,bh);ctx.fillStyle=`rgba(255,225,77,${0.35+0.65*pulse})`;ctx.fillRect(-bw/2,-bh/2,bw,2);ctx.fillRect(-bw/2,bh/2-2,bw,2);
  ctx.shadowColor='#ffe14d';ctx.shadowBlur=6+10*pulse;ctx.fillStyle=`rgba(255,232,120,${0.72+0.28*pulse})`;ctx.fillText(CT.prompt,0,1);ctx.shadowBlur=0;
  const ax=bw/2-16,s=5+pulse*1.5;ctx.beginPath();ctx.moveTo(-ax-s,-s);ctx.lineTo(-ax+s*0.6,0);ctx.lineTo(-ax-s,s);ctx.closePath();ctx.moveTo(ax+s,-s);ctx.lineTo(ax-s*0.6,0);ctx.lineTo(ax+s,s);ctx.closePath();ctx.fill();ctx.restore()}
 ctx.restore()}
const onBeat=(b,t,auto)=>{},on8th=onBeat,onLine=(words,t)=>{}; // no-ops: everything is planned from the lyric table
// ---- 2D fallback (no WebGL): lane, blocks, saber ----
function draw(ctx,t){ctx.fillStyle='#07040f';ctx.fillRect(0,0,W,H);const cx=W/2,hy=H*0.42;ctx.strokeStyle='rgba(255,91,224,.5)';ctx.lineWidth=1;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*40,hy);ctx.lineTo(cx+i*260,H);ctx.stroke()}
 for(const b of S.blocks){if(!b.active||b.hit||b.missed)continue;const d=clamp((b.hitT-t)/LEAD,0,1);const sc=lerp(1,0.08,d);const x=cx+(b.col-1.5)*160*sc,y=hy+(1-d)*(H*0.45)-b.row*60*sc,s=46*sc;ctx.fillStyle=HUES[b.hue]||'#ffc21a';ctx.fillRect(x-s/2,y-s/2,s,s);ctx.fillStyle='#fff';ctx.font=Math.max(5,10*sc)+"px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillText(b.word,x,y+3);ctx.textAlign='left'}
 if(t>=cb(75.6)&&t<OUT){const sx=cx+(S.saber.c-1.5)*160,sy=hy+H*0.45-S.saber.r*60;ctx.strokeStyle=HUES[S.saber.hue];ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx+60,H);ctx.lineTo(sx,sy);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}}
// ---- HUD overlay (drawn over the GL frame) ----
function overlay(ctx,t){if(t<s5-TRANS*0.3)return;ctx.save();
 if(S.flash>0){ctx.fillStyle=`rgba(255,255,255,${S.flash*0.35})`;ctx.fillRect(0,0,W,H)}
 // (no separate headset-on reveal: the VR world already opens out of the phone in the mobile -> VR transition, main.ts)
 // score, small
 ctx.globalAlpha=1-clamp((t-OUT)/0.6,0,1);if(ctx.globalAlpha>0){ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='rgba(6,8,20,.55)';ctx.fillRect(16,64,196,46);ctx.fillStyle='#fff';ctx.fillText('SCORE '+String(S.score).padStart(6,'0'),26,84);ctx.fillStyle=YEL;ctx.fillText('COMBO x'+S.combo+'  '+S.mult+'x',26,102)}ctx.globalAlpha=1;
 // the finale card's type layer (the voxel title itself is 3D, in era5gl.ts)
 card(ctx,t);
 // one hint line while the saber first appears, above the lane (not over the hit line or the captions)
 if(t>=cb(76.3)&&t<cb(78.3)){ctx.globalAlpha=Math.min(1,(cb(78.3)-t)/0.6,(t-cb(76.3))/0.3);ctx.textAlign='center';ctx.font="9px 'Press Start 2P',monospace";const l1=MOBILE?'DRAG THE SABER THROUGH THE WORDS':'MOVE THE SABER THROUGH THE WORDS',y=H*0.13;const tw=ctx.measureText(l1).width+28;ctx.fillStyle='rgba(6,8,20,.6)';ctx.fillRect(W/2-tw/2,y,tw,26);ctx.fillStyle='#fff';ctx.fillText(l1,W/2,y+17);ctx.textAlign='left';ctx.globalAlpha=1}
 ctx.restore()}
return{init,update,draw,overlay,onBeat,on8th,onLine,get S(){return S},K:{SPD,LEAD,COLS,ROWS,TUNNEL,OUT,s5,WIN,HITWIN,RZ,RY,HIT,BACK,EYE,COLW,ROW0,ROWH,PITCH,HUES,fovAt,screenOf,CARD}}})();
