import {ERAS,TRANS,BAR,BEAT,rngf,hash,clamp,lerp,blip} from './core';

// ---------- ERA 3: 32-bit racer ----------
export const E3=(()=>{
const LW=320,LH=180,start=ERAS[2].start;
const SEGL=100,ROADW=900,CAMH=700,CAMD=1/Math.tan(50*Math.PI/180),DRAW=110,SPB=32,SPEED=SEGL*SPB/BAR,PLAYERZ=CAMH*CAMD*1.35,NSEG=SPB*26,FOG='#2a1a44';
// --- tiny flat-shaded polygon renderer (PS1 style) ---
const LIGHT=(()=>{const l=[0.45,0.8,-0.4],n=Math.hypot(...l);return l.map(v=>v/n)})();
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const shade=(c,m)=>`rgb(${Math.round(clamp(c[0]*m,0,255))},${Math.round(clamp(c[1]*m,0,255))},${Math.round(clamp(c[2]*m,0,255))})`;
// box centred at (cx,cy,cz); cols = [-z,+z,-y,+y,-x,+x] or a single colour
function box(cx,cy,cz,w,h,d,cols){const v=[];for(let i=0;i<8;i++)v.push([cx+(i&1?w/2:-w/2),cy+(i&2?h/2:-h/2),cz+(i&4?d/2:-d/2)]);const F=[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]];const c=Array.isArray(cols[0])?cols:F.map(()=>cols);return{v,f:F.map((i,k)=>({i,c:c[k]})),center:[cx,cy,cz]}}
function pyramid(cx,cy,cz,r,h,col){const v=[[cx,cy+h,cz],[cx-r,cy,cz-r],[cx+r,cy,cz-r],[cx+r,cy,cz+r],[cx-r,cy,cz+r]];return{v,f:[{i:[0,1,2],c:col},{i:[0,2,3],c:col},{i:[0,3,4],c:col},{i:[0,4,1],c:col}],center:[cx,cy+h*0.3,cz]}}
function xform(m,yaw,roll,tx,ty,tz){const cy_=Math.cos(yaw),sy=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);const T=p=>{let[x,y,z]=p;[x,y]=[x*cr-y*sr,x*sr+y*cr];[x,z]=[x*cy_+z*sy,-x*sy+z*cy_];return[x+tx,y+ty,z+tz]};return{v:m.v.map(T),f:m.f,center:T(m.center)}}
function drawMeshes(x,meshes,cam){const faces=[];const C=[cam.x,cam.y,cam.z];
 for(const m of meshes){const pv=m.v.map(p=>proj(p[0],p[1],p[2],cam.x,cam.y,cam.z));if(pv.some(p=>p.cz<=CAMD*2))continue;
  for(const f of m.f){const a=m.v[f.i[0]],b=m.v[f.i[1]],c=m.v[f.i[2]];let n=cross(sub(b,a),sub(c,a));const fc=[0,1,2].map(k=>f.i.reduce((s,ix)=>s+m.v[ix][k],0)/f.i.length);if(dot(n,sub(fc,m.center))<0)n=n.map(v=>-v);const view=sub(fc,C);if(dot(n,view)>0)continue;const L=Math.hypot(...n)||1;const sh=0.5+0.5*Math.max(0,dot(n.map(v=>v/L),LIGHT));faces.push({pts:f.i.map(k=>pv[k]),col:shade(f.c,sh),d:view[2]})}}
 faces.sort((p,q)=>q.d-p.d);for(const f of faces){x.fillStyle=f.col;x.beginPath();x.moveTo(f.pts[0].x,f.pts[0].y);for(let k=1;k<f.pts.length;k++)x.lineTo(f.pts[k].x,f.pts[k].y);x.closePath();x.fill()}}
const RED=[216,38,58],DRED=[150,22,40],GLASS=[120,200,240],TIRE=[22,22,28],RIM=[160,160,170],YEL=[255,225,100],TAIL=[255,60,60];
const CAR_PARTS=[box(0,50,0,300,90,520,[TAIL,RED,DRED,RED,RED,RED]),box(0,125,-50,220,70,230,[GLASS,GLASS,RED,RED,GLASS,GLASS]),box(0,135,-255,290,12,50,DRED),box(-145,105,-255,12,50,12,DRED),box(145,105,-255,12,50,12,DRED),
 box(-100,65,262,60,26,12,YEL),box(100,65,262,60,26,12,YEL),box(-110,70,-262,60,20,8,TAIL),box(110,70,-262,60,20,8,TAIL),
 box(-150,42,170,52,84,90,[TIRE,TIRE,TIRE,TIRE,RIM,TIRE]),box(150,42,170,52,84,90,[TIRE,TIRE,TIRE,TIRE,TIRE,RIM]),box(-150,42,-170,52,84,90,[TIRE,TIRE,TIRE,TIRE,RIM,TIRE]),box(150,42,-170,52,84,90,[TIRE,TIRE,TIRE,TIRE,TIRE,RIM])];
const carMesh=(tx,ty,tz,yaw,roll)=>CAR_PARTS.map(m=>xform(m,yaw,roll,tx,ty,tz));
const treeMesh=(tx,ty,tz,sc)=>[box(tx,ty+60*sc,tz,60*sc,120*sc,60*sc,[58,36,20]),pyramid(tx,ty+90*sc,tz,230*sc,620*sc,[23,85,45])];
const CYAN=[93,242,255];const gateMesh=(wx,wy,wz,lane)=>[box(wx+(lane-0.38)*ROADW,wy+175,wz,40,350,40,CYAN),box(wx+(lane+0.38)*ROADW,wy+175,wz,40,350,40,CYAN),box(wx+lane*ROADW,wy+360,wz,0.76*ROADW+40,30,40,CYAN)];
let segs:any=null,S:any;
function build(){segs=[];const r=rngf(3);let i=0;while(i<NSEG){const len=20+Math.floor(r()*40);const c=(r()-0.5)*4;for(let k=0;k<len&&i<NSEG;k++,i++){const e=Math.min(1,k/10,(len-k)/10);segs.push({i,curve:c*e,y:Math.sin(i*0.04)*500+Math.sin(i*0.013)*900,trees:[]})}}
 for(const s of segs){s.gate=(s.i%SPB===0&&s.i>0)?[-0.55,0,0.55][Math.floor(hash(s.i)*3)]:null;s.boost=(s.i%SPB===8||s.i%SPB===24);const rr=rngf(s.i*7+1);if(s.i%3===0){const side=rr()<0.5?-1:1;s.trees.push({x:side*(1.5+rr()*1.6),sc:0.7+rr()*0.9})}}}
function init(t){if(!segs)build();S={x:0,px:0,steer:0,z:Math.max(0,t-start)*SPEED,score:0,shake:0,flash:0,boostT:0,lines:[],lastSeg:undefined,gates:0,words:new Map(),got:0,line:[]}}
function onLine(words,t){if(t<start-TRANS||t>=ERAS[3].start)return;S.words.clear();S.line=[];let seg=Math.floor(S.z/SEGL)+5;words.forEach(w=>{const gate=Math.ceil(seg/SPB)*SPB;const lane=segs[gate%NSEG].gate??0;S.words.set(seg%NSEG,{text:w,lane,got:false});seg+=3})}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=ERAS[3].start)return;S.z=Math.max(0,t-start)*SPEED;const seg=segs[Math.floor(S.z/SEGL)%NSEG];
 let target=null;for(let k=1;k<=SPB;k++){const s=segs[(seg.i+k)%NSEG];if(s.gate!==null){target=s.gate;break}}
 if(auto){if(target!==null)S.x=lerp(S.x,target,1-Math.pow(0.02,dt))}else{if(inp.left)S.x-=1.6*dt;if(inp.right)S.x+=1.6*dt;S.x=clamp(S.x,-1.1,1.1)}
 if(S.lastSeg!==undefined&&seg.i!==S.lastSeg){let i=S.lastSeg;let guard=0;while(i!==seg.i&&guard++<64){i=(i+1)%NSEG;const s=segs[i];
  if(s.gate!==null){if(Math.abs(S.x-s.gate)<0.33){S.score+=100;S.gates++;S.flash=0.25;blip(880,0.1);blip(1320,0.15)}else{S.shake=0.3;blip(110,0.2)}}
  const wd=S.words.get(i);if(wd&&!wd.got){if(Math.abs(S.x-wd.lane)<0.4){wd.got=true;S.got++;S.score+=50;S.line.push(wd.text);S.flash=Math.max(S.flash,0.15);blip(1568,0.08,0.1)}else S.words.delete(i)}
  if(s.boost&&Math.abs(S.x)<0.35){S.boostT=0.4;S.score+=25;for(let k=0;k<14;k++)S.lines.push({a:Math.random()*Math.PI*2,l:0.4,r:20+Math.random()*40})}}}
 S.steer=lerp(S.steer,clamp((S.x-S.px)/Math.max(dt,0.001),-2,2),0.15);S.px=S.x;S.lastSeg=seg.i;S.shake=Math.max(0,S.shake-dt);S.flash=Math.max(0,S.flash-dt);S.boostT=Math.max(0,S.boostT-dt);for(const l of S.lines)l.l-=dt;S.lines=S.lines.filter(l=>l.l>0)}
function proj(wx,wy,wz,camX,camY,camZ){const cz=wz-camZ;const sc=CAMD/cz;return{x:Math.round(LW/2+sc*(wx-camX)*LW/2),y:Math.round(LH/2-sc*(wy-camY)*LH/2),w:Math.round(sc*ROADW*LW/2),cz}}
function poly(x,a,b,c,d,col){x.fillStyle=col;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.lineTo(c[0],c[1]);x.lineTo(d[0],d[1]);x.closePath();x.fill()}
function draw(x,t){const base=Math.floor(S.z/SEGL)%NSEG,bs=segs[base],pct=(S.z%SEGL)/SEGL,ns=segs[(base+1)%NSEG];const camY=CAMH+lerp(bs.y,ns.y,pct),camZ=S.z-PLAYERZ,camX=S.x*ROADW;
 x.save();if(S.shake>0)x.translate(Math.round((Math.random()-.5)*6),Math.round((Math.random()-.5)*6));
 const g=x.createLinearGradient(0,0,0,LH*0.6);g.addColorStop(0,'#0e0724');g.addColorStop(0.6,'#4a1f6b');g.addColorStop(1,'#c2456f');x.fillStyle=g;x.fillRect(-8,-8,LW+16,LH+16);
 let xo=0,dx=-(bs.curve*pct);const vis=[];const cam={x:camX,y:camY,z:camZ};
 for(let n=0;n<DRAW;n++){const idx=(base+n)%NSEG,s=segs[idx],wrap=idx<base?NSEG*SEGL:0,z1=idx*SEGL+wrap;const wx=xo;const p1=proj(xo,s.y,z1,camX,camY,camZ),p2=proj(xo+dx,segs[(idx+1)%NSEG].y,z1+SEGL,camX,camY,camZ);xo+=dx;dx+=s.curve;vis.push({s,p1,p2,n,wx,z1,hid:p1.cz<=CAMD||p2.y>=p1.y})}
 { // fill the strip between the nearest segment and the bottom edge
  const v0=vis.find(v=>!v.hid);if(v0){const{p1,p2,s}=v0;const k=(LH+2-p1.y)/Math.max(1,p1.y-p2.y);const alt=Math.floor(s.i/4)%2;const ex=p1.x-(p2.x-p1.x)*k,ew=p1.w+(p1.w-p2.w)*k;x.fillStyle=alt?'#1f6b3a':'#1a5c32';x.fillRect(-8,p1.y,LW+16,LH+2-p1.y);poly(x,[ex-ew*1.12,LH+2],[ex+ew*1.12,LH+2],[p1.x+p1.w*1.12,p1.y],[p1.x-p1.w*1.12,p1.y],alt?'#e8e8f0':'#c0294a');poly(x,[ex-ew,LH+2],[ex+ew,LH+2],[p1.x+p1.w,p1.y],[p1.x-p1.w,p1.y],alt?'#5a5a66':'#50505c');if(alt)poly(x,[ex-ew*0.03,LH+2],[ex+ew*0.03,LH+2],[p1.x+p1.w*0.03,p1.y],[p1.x-p1.w*0.03,p1.y],'#e8e8f0')}}
 const mo=-xo/60;x.fillStyle='#1b0f38';x.beginPath();x.moveTo(-8,LH);for(let sx=-8;sx<=LW+8;sx+=6){const wx=sx+mo+S.z*0.001;x.lineTo(sx,LH*0.5-Math.abs(Math.sin(wx*0.021)*22+Math.sin(wx*0.053)*9))}x.lineTo(LW+8,LH);x.fill();
 for(let n=vis.length-1;n>=0;n--){const v=vis[n];if(v.hid)continue;const{s,p1,p2}=v;const alt=Math.floor(s.i/4)%2;
  x.fillStyle=alt?'#1f6b3a':'#1a5c32';x.fillRect(-8,p2.y,LW+16,p1.y-p2.y+1);
  poly(x,[p1.x-p1.w*1.12,p1.y],[p1.x+p1.w*1.12,p1.y],[p2.x+p2.w*1.12,p2.y],[p2.x-p2.w*1.12,p2.y],alt?'#e8e8f0':'#c0294a');
  poly(x,[p1.x-p1.w,p1.y],[p1.x+p1.w,p1.y],[p2.x+p2.w,p2.y],[p2.x-p2.w,p2.y],alt?'#5a5a66':'#50505c');
  if(alt)poly(x,[p1.x-p1.w*0.03,p1.y],[p1.x+p1.w*0.03,p1.y],[p2.x+p2.w*0.03,p2.y],[p2.x-p2.w*0.03,p2.y],'#e8e8f0');
  if(s.boost){x.fillStyle='#ffe066';x.beginPath();x.moveTo(p1.x-p1.w*0.3,p1.y);x.lineTo(p1.x+p1.w*0.3,p1.y);x.lineTo(p2.x,p2.y);x.fill()}
  for(const tr of s.trees)drawMeshes(x,treeMesh(v.wx+tr.x*ROADW,s.y,v.z1,tr.sc),cam);
  const wd=S.words.get(s.i);if(wd&&!wd.got){const fs=clamp(p1.w*0.055,2,16);const wx=p1.x+wd.lane*p1.w,wy=p1.y-p1.w*0.18;x.font=fs.toFixed(1)+"px 'Press Start 2P',monospace";x.textAlign='center';const tw=wd.text.length*fs;x.fillStyle='rgba(0,0,0,.5)';x.fillRect(wx-tw/2-2,wy-fs-1,tw+4,fs+4);x.fillStyle=Math.floor(t/(BEAT/2))%2?'#ffe066':'#fff';x.fillText(wd.text,wx,wy);x.textAlign='left';x.fillStyle='#ffe066';x.fillRect(Math.round(wx),Math.round(wy+2),1,Math.max(1,Math.round(p1.w*0.15)))}
  if(s.gate!==null){const h=Math.max(3,p1.w*0.55),pw=Math.max(1,Math.round(p1.w*0.035));const l=Math.round(p1.x+(s.gate-0.38)*p1.w),r=Math.round(p1.x+(s.gate+0.38)*p1.w);x.fillStyle='rgba(220,40,80,.45)';x.fillRect(Math.round(p1.x-p1.w),Math.round(p1.y-h),l-Math.round(p1.x-p1.w),Math.round(h));x.fillRect(r,Math.round(p1.y-h),Math.round(p1.x+p1.w)-r,Math.round(h));drawMeshes(x,gateMesh(v.wx,s.y,v.z1,s.gate),cam)}
  const fa=1-Math.exp(-Math.pow(v.n/DRAW,2)*4.5);if(fa>0.01){x.globalAlpha=fa;x.fillStyle=FOG;x.fillRect(-8,p2.y,LW+16,p1.y-p2.y+1);x.globalAlpha=1}}
 for(const l of S.lines){x.strokeStyle=`rgba(255,255,255,${l.l})`;x.lineWidth=1;x.beginPath();const r0=l.r+(0.4-l.l)*200;x.moveTo(LW/2+Math.cos(l.a)*r0,LH/2+Math.sin(l.a)*r0);x.lineTo(LW/2+Math.cos(l.a)*(r0+30),LH/2+Math.sin(l.a)*(r0+30));x.stroke()}
 { const py=camY-CAMH,cx=camX+S.steer*40,yaw=clamp(S.steer*0.25,-0.4,0.4),roll=-yaw*0.35,bounce=Math.abs(Math.sin(t*22))*3+(S.boostT>0?Math.sin(t*60)*2:0);
   const sh=[[-170,120],[170,120],[200,-300],[-200,-300]].map(([ox,oz])=>proj(cx+ox,py+1,S.z+oz,camX,camY,camZ));x.fillStyle='rgba(0,0,0,.38)';x.beginPath();x.moveTo(sh[0].x,sh[0].y);for(let k=1;k<4;k++)x.lineTo(sh[k].x,sh[k].y);x.closePath();x.fill();
   drawMeshes(x,carMesh(cx,py+bounce,S.z,yaw,roll),cam)}
 if(S.flash>0){x.fillStyle=`rgba(93,242,255,${S.flash*0.5})`;x.fillRect(-8,-8,LW+16,LH+16)}
 x.restore();
 x.font="6px 'Press Start 2P',monospace";x.fillStyle='#fff';x.fillText('SCORE '+S.score,6,26);x.fillStyle='#5df2ff';x.fillText('GATES '+S.gates+'  WORDS '+S.got,6,36);if(S.line.length){x.textAlign='center';x.fillStyle='#ffe066';x.fillText(S.line.join(' '),LW/2,48);x.textAlign='left'}x.fillStyle='#ffe066';x.textAlign='right';x.fillText(Math.round(214+S.boostT*160)+' KM/H',LW-6,26);x.textAlign='left'}
return{init,onLine,update,draw}})();
