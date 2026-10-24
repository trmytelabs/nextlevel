import {ERAS,BAR,bar,rngf,clamp,lerp,blip,noise,mk,pix} from './core';

// ---------- ERA 1: arcade. Lyrics crawl toward you on a tilted plane; you chip the letters away ----------
export const E1=(()=>{
const LW=480,LH=270,GROUND=LH-26,FS=16,ROWW=300,BW=ROWW+24,TRAVEL=BAR*2.6,YEL='#ffe81f',VPX=LW/2,VPY=30;
// perspective: a point at depth z on the plane lands at screen y = VPY + F/z, with horizontal scale F2/z
const F=4000,F2=27,ROWD=0.56,ZFAR=112,ZNEAR=18;
const SHIP=['....X....','...XXX...','.XXXXXXX.','XXXXXXXXX'];
const shatterT=bar(17);
let S:any;
function init(t){S={ship:{x:LW/2-9,y:GROUND-10,dead:false,deadT:-9,inv:0},bul:[],lines:[],debris:null,pops:[],score:0,chips:0,cool:0,rng:rngf(7),stars:[],pulse:0,seq:0,words:0,kills:0,deaths:0,oneShot:0};
 const r=rngf(3);for(let i=0;i<150;i++)S.stars.push({a:r()*Math.PI*2,d:r()*LW*0.9,sp:0.4+r()*0.8,b:0.3+r()*0.7});
 if(t>=shatterT)S.debris=[]}
function makeWord(text){const c=mk(4,4);c.x.font=`${FS}px 'Press Start 2P',monospace`;const w=Math.ceil(c.x.measureText(text).width)+6,h=FS+8;c.c.width=w;c.c.height=h;c.x.imageSmoothingEnabled=false;c.x.font=`${FS}px 'Press Start 2P',monospace`;c.x.textBaseline='top';c.x.fillStyle=YEL;c.x.fillText(text,3,3);const img=c.x.getImageData(0,0,w,h);let n=0;for(let i=3;i<img.data.length;i+=4)if(img.data[i]>0)n++;return{text,c,img,w,h,total:Math.max(1,n),left:n,dead:false,bx:0,by:0}}
function layout(words){const gap=12,rows=[[]];let rw=0;for(const w of words){if(rw>0&&rw+gap+w.w>ROWW){rows.push([]);rw=0}const row=rows[rows.length-1];if(row.length)rw+=gap;w.bx=rw;row.push(w);rw+=w.w}
 const rh=FS+14;rows.forEach((row,ri)=>{const tw=row.reduce((a,w)=>a+w.w,0)+gap*(row.length-1);for(const w of row){w.bx=Math.round((BW-tw)/2+w.bx);w.by=6+ri*rh}});return rows.length*rh+10}
function onLine(words,t){if(t>=shatterT||t>=ERAS[1].start)return;const ws=words.map(makeWord);const bh=layout(ws);S.lines.push({words:ws,t0:t,bh,tex:mk(BW,bh),xo:(S.seq%2?1:-1)*10*(S.seq%3)});S.seq++;S.words+=ws.length}
const zOf=(ln,t)=>ZFAR-(t-ln.t0)/TRAVEL*(ZFAR-ZNEAR);
const rowZ=(ln,row,t)=>zOf(ln,t)+(ln.bh-row)*ROWD;
const alphaOf=(ln,t)=>clamp((ZFAR-zOf(ln,t))/18,0,1);
function compose(ln){const x=ln.tex.x;x.clearRect(0,0,BW,ln.bh);for(const w of ln.words)if(!w.dead)x.drawImage(w.c.c,w.bx,w.by)}
function toScreen(ln,u,row,t){const z=rowZ(ln,row,t);return{x:VPX+(u-BW/2+ln.xo)*F2/z,y:VPY+F/z,z}}
function chip(w,mx,my,R){const d=w.img.data;let n=0;for(let yy=-R;yy<=R;yy++)for(let xx=-R;xx<=R;xx++){if(xx*xx+yy*yy>R*R)continue;const px=mx+xx,py=my+yy;if(px<0||py<0||px>=w.w||py>=w.h)continue;const i=(py*w.w+px)*4+3;if(d[i]>0){d[i]=0;n++}}if(n){w.left-=n;w.c.x.putImageData(w.img,0,0)}return n}
function shatter(){S.debris=[];const r=rngf(99);for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const d=w.img.data;for(let py=0;py<w.h;py+=3)for(let px=0;px<w.w;px+=3){if(d[(py*w.w+px)*4+3]===0)continue;const sp=toScreen(ln,w.bx+px,w.by+py,shatterT);if(sp.z<2||sp.y>GROUND)continue;S.debris.push({x:sp.x,y:sp.y,vx:(r()-.5)*60,vy:-r()*40,land:GROUND-2-Math.floor(r()*6)})}}}S.lines=[];S.bul=[]}
function fire(){if(S.ship.dead)return;if(S.bul.length<3&&S.cool<=0){S.bul.push({x:S.ship.x+9,y:S.ship.y-2});S.cool=0.1;blip(880,0.05)}}
function target(t){let best=null,bz=1e9;for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const sp=toScreen(ln,w.bx+w.w/2,w.by+w.h/2,t);if(sp.z<3||sp.y>GROUND-4)continue;const score=sp.z-w.left/w.total*20;if(score<bz){bz=score;best=sp.x}}}return best}
// does the cannon sprite at (x,y) touch a remaining pixel of word w (of line ln) at time t?
function hitAt(ln,w,x,y,t){const zb=zOf(ln,t);for(let r=0;r<SHIP.length;r++)for(let c=0;c<SHIP[r].length;c++){if(SHIP[r][c]!=='X')continue;const px=x+c*2+1,py=y+r*2+1;if(py<=VPY+1)continue;const z=F/(py-VPY);const row=ln.bh-(z-zb)/ROWD;if(row<w.by||row>=w.by+w.h)continue;const u=(px-VPX)/(F2/z)+BW/2-ln.xo;if(u<w.bx||u>=w.bx+w.w)continue;if(w.img.data[(Math.floor(row-w.by)*w.w+Math.floor(u-w.bx))*4+3]>0)return true}return false}
// autopilot: if a word's remaining pixels will run over the cannon within ~0.45 s, the nearest x that stays clear (a chipped tunnel, a gap, or past the row's end), else null
function dodge(t){const sh=S.ship,th:any[]=[];for(const ln of S.lines)for(const w of ln.words){if(w.dead)continue;for(let k=1;k<=6;k++){const tf=t+k*0.075,spb=toScreen(ln,w.bx+w.w/2,w.by+w.h,tf),spt=toScreen(ln,w.bx+w.w/2,w.by,tf);if(spb.z>=1.5&&spb.y>=sh.y-1&&spt.y<=sh.y+9)th.push([ln,w,tf])}}
 if(!th.length)return null;const danger=x=>th.some(([ln,w,tf])=>hitAt(ln,w,x,sh.y,tf));if(!danger(sh.x))return null;
 for(let o=2;o<=120;o+=2){if(sh.x-o>=6&&!danger(sh.x-o))return sh.x-o;if(sh.x+o<=LW-24&&!danger(sh.x+o))return sh.x+o}return null}
function onBeat(_b,t){if(t>=ERAS[1].start)return;S.pulse=1;if(t>=shatterT&&!S.debris)shatter()}
function on8th(_n,t,auto){if(auto&&t<shatterT){const tx=target(t);if(tx!==null&&Math.abs(tx-(S.ship.x+9))<16)fire()}}
function update(dt,t,inp,auto){if(t>=ERAS[1].start)return;S.cool-=dt;S.pulse=Math.max(0,S.pulse-dt*3);const sh=S.ship;
 for(const st of S.stars){st.d+=st.sp*(10+st.d*0.25)*dt;if(st.d>LW*0.95){st.d=4+Math.random()*20;st.a=Math.random()*Math.PI*2}}
 sh.inv=Math.max(0,sh.inv-dt);if(sh.dead&&t-sh.deadT>0.7){sh.dead=false;sh.inv=2.6;sh.x=LW/2-9}
 if(t<shatterT&&!sh.dead){let dx=0;if(auto){const tx=target(t);if(tx!==null)dx=clamp((tx-9-sh.x)*5,-220,220)*dt;const sx=dodge(t);if(sx!==null)dx=clamp((sx-sh.x)*8,-260,260)*dt}else{if(inp.left)dx=-180*dt;if(inp.right)dx=180*dt;if(inp.fire)fire()}sh.x=clamp(sh.x+dx,6,LW-24)}
 else if(t>=shatterT){if(!S.debris)shatter();sh.x=lerp(sh.x,80/320*LW-9,1-Math.pow(0.02,dt));sh.y=lerp(sh.y,GROUND-10,1-Math.pow(0.02,dt))}
 for(const b of S.bul){b.y-=330*dt;if(b.hit||b.y<=VPY+1)continue;const z=F/(b.y-VPY),sc=F2/z;
  for(const ln of S.lines){const zb=zOf(ln,t);const row=ln.bh-(z-zb)/ROWD;if(row<0||row>=ln.bh)continue;const u=(b.x-VPX)/sc+BW/2-ln.xo;
   for(const w of ln.words){if(w.dead||u<w.bx||u>=w.bx+w.w||row<w.by||row>=w.by+w.h)continue;
    const R=clamp(Math.round(7/sc),3,14);const n=chip(w,Math.floor(u-w.bx),Math.floor(row-w.by),R);if(!n)continue;
    b.hit=true;S.chips++;S.score+=Math.min(50,n);blip(1200+Math.random()*400,0.04,0.08);for(let i=0;i<8;i++)S.pops.push({x:b.x,y:b.y,vx:(S.rng()-.5)*120,vy:-S.rng()*90,l:.5});
    if(w.left<w.total*0.16){w.dead=true;S.kills++;if(w.left+n===w.total)S.oneShot++;S.score+=100;noise(0.08,0.3,2000);const d=w.img.data;for(let py=0;py<w.h;py+=2)for(let px=0;px<w.w;px+=2){if(d[(py*w.w+px)*4+3]===0)continue;const sp=toScreen(ln,w.bx+px,w.by+py,t);S.pops.push({x:sp.x,y:sp.y,vx:(S.rng()-.5)*160,vy:(S.rng()-.9)*140,l:.7})}}
    break}if(b.hit)break}}
 if(!sh.dead&&sh.inv<=0&&t<shatterT){let hitW:any=null,hitL:any=null;outer:for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const spb=toScreen(ln,w.bx+w.w/2,w.by+w.h,t),spt=toScreen(ln,w.bx+w.w/2,w.by,t);if(spb.z<1.5||spb.y<sh.y-1||spt.y>sh.y+9)continue;
   if(hitAt(ln,w,sh.x,sh.y,t)){hitW=w;hitL=ln;break outer}}}
  if(hitW){const w=hitW,ln=hitL;sh.dead=true;sh.deadT=t;S.deaths++;S.score=Math.max(0,S.score-100);noise(0.2,0.5,600);blip(80,0.4,0.2);for(let i=0;i<40;i++)S.pops.push({x:sh.x+9,y:sh.y+4,vx:(S.rng()-.5)*260,vy:(S.rng()-.9)*220,l:.8,g:true});w.dead=true;const d=w.img.data;for(let py=0;py<w.h;py+=2)for(let px=0;px<w.w;px+=2){if(d[(py*w.w+px)*4+3]===0)continue;const q=toScreen(ln,w.bx+px,w.by+py,t);S.pops.push({x:q.x,y:q.y,vx:(S.rng()-.5)*160,vy:(S.rng()-.9)*140,l:.7})}}}
 S.bul=S.bul.filter(b=>!b.hit&&b.y>-10);
 S.lines=S.lines.filter(ln=>zOf(ln,t)+ln.bh*ROWD>2&&ln.words.some(w=>!w.dead));
 for(const p of S.pops){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.l-=dt}S.pops=S.pops.filter(p=>p.l>0);
 if(S.debris)for(const d of S.debris){if(d.y<d.land){d.vy+=220*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y>=d.land){d.y=d.land;d.vx=0}}}}
function draw(x,t){x.fillStyle='#000';x.fillRect(0,0,LW,LH);x.imageSmoothingEnabled=false;
 for(const st of S.stars){const sx=VPX+Math.cos(st.a)*st.d,sy=VPY+Math.sin(st.a)*st.d*0.7;if(sx<0||sx>LW||sy<0||sy>GROUND)continue;const b=Math.min(1,st.d/120)*st.b;x.fillStyle=`rgba(255,255,255,${b})`;x.fillRect(Math.round(sx),Math.round(sy),st.d>300?2:1,1)}
 const vg=x.createRadialGradient(VPX,VPY,0,VPX,VPY,70+S.pulse*20);vg.addColorStop(0,`rgba(255,232,31,${0.18+S.pulse*0.2})`);vg.addColorStop(1,'rgba(255,232,31,0)');x.fillStyle=vg;x.fillRect(VPX-100,VPY-100,200,200);
 // faint plane lines converging on the vanishing point
 x.strokeStyle='rgba(255,232,31,.06)';x.lineWidth=1;for(let i=-5;i<=5;i++){x.beginPath();x.moveTo(VPX,VPY);x.lineTo(VPX+i*130,GROUND+8);x.stroke()}
 if(t>=bar(2)&&t<bar(3.8)){const a=t<bar(2)+0.5?(t-bar(2))/0.5:Math.min(1,(bar(3.8)-t)/0.8);x.globalAlpha=a;x.font="8px 'Press Start 2P',monospace";x.fillStyle='#4bd5ee';x.textAlign='center';x.fillText('A long time ago, at a desk far, far away....',LW/2,LH*0.42);x.textAlign='left';x.globalAlpha=1}
 // text blocks on the tilted plane, far to near, one screen row at a time
 const lines=S.lines.slice().sort((a,b)=>zOf(b,t)-zOf(a,t));
 for(const ln of lines){compose(ln);const zb=zOf(ln,t),a=alphaOf(ln,t);if(a<=0)continue;x.globalAlpha=a;
  const yTop=Math.max(VPY+2,Math.ceil(VPY+F/(zb+ln.bh*ROWD))),yBot=Math.min(GROUND+6,Math.floor(zb>0.5?VPY+F/zb:LH));
  for(let y=yTop;y<=yBot;y++){const z=F/(y-VPY);const row=ln.bh-(z-zb)/ROWD;if(row<0||row>=ln.bh)continue;const sc=F2/z,dw=BW*sc;x.drawImage(ln.tex.c,0,Math.floor(row),BW,1,VPX+ln.xo*sc-dw/2,y,dw,1.05)}}
 x.globalAlpha=1;
 for(const b of S.bul){x.fillStyle='rgba(255,255,255,.35)';x.fillRect(b.x-2,b.y-2,5,12);x.fillStyle='#fff';x.fillRect(b.x-0.5,b.y,2,8)}
 for(const p of S.pops){x.globalAlpha=Math.min(1,p.l*2);x.fillStyle=p.g?'#5bff5b':YEL;x.fillRect(p.x,p.y,2,2)}x.globalAlpha=1;
 if(S.debris){x.fillStyle=YEL;for(const d of S.debris)x.fillRect(d.x,d.y,2,2)}
 if(!S.ship.dead&&!(S.ship.inv>0&&Math.floor(t*20)%2))pix(x,SHIP,Math.round(S.ship.x),Math.round(S.ship.y),'#5bff5b',2);
 x.fillStyle='#5bff5b';x.fillRect(0,GROUND+8,LW,2);
 x.font="8px 'Press Start 2P',monospace";x.fillStyle=YEL;x.fillText('SCORE '+String(S.score).padStart(6,'0'),8,34);x.textAlign='right';x.fillText('CHIPS '+S.chips,LW-8,34);x.textAlign='left'}
return{init,onBeat,on8th,onLine,update,draw,SHIP,get S(){return S}}})();
