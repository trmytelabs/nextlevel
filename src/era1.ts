import {ERAS,BAR,BEAT,bar,rngf,clamp,lerp,blip,noise,mk,pix} from './core';

// ---------- ERA 1: arcade. Lyrics crawl in from a vanishing point; you chip the letters away ----------
export const E1=(()=>{
const LW=480,LH=270,GROUND=LH-26,FS=16,ROWW=290,TRAVEL=BAR*2.6,YEL='#ffe81f',VPX=LW/2,VPY=34;
const SHIP=['....X....','...XXX...','.XXXXXXX.','XXXXXXXXX'];
const shatterT=bar(17);
let S:any;
function init(t){S={ship:{x:LW/2-9,y:GROUND-10},bul:[],lines:[],debris:null,pops:[],score:0,chips:0,cool:0,rng:rngf(7),stars:[],pulse:0,seq:0};
 const r=rngf(3);for(let i=0;i<150;i++)S.stars.push({a:r()*Math.PI*2,d:r()*LW*0.9,sp:0.4+r()*0.8,b:0.3+r()*0.7});
 if(t>=shatterT)S.debris=[]}
function makeWord(text){const c=mk(4,4);c.x.font=`${FS}px 'Press Start 2P',monospace`;const w=Math.ceil(c.x.measureText(text).width)+6,h=FS+8;c.c.width=w;c.c.height=h;c.x.imageSmoothingEnabled=false;c.x.font=`${FS}px 'Press Start 2P',monospace`;c.x.textBaseline='top';c.x.fillStyle=YEL;c.x.fillText(text,3,3);const img=c.x.getImageData(0,0,w,h);let n=0;for(let i=3;i<img.data.length;i+=4)if(img.data[i]>0)n++;return{text,c,img,w,h,total:Math.max(1,n),left:n,dead:false,ox:0,oy:0}}
function layout(words){const gap=12,rows=[[]];let rw=0;for(const w of words){if(rw>0&&rw+gap+w.w>ROWW){rows.push([]);rw=0}const row=rows[rows.length-1];if(row.length)rw+=gap;w.ox=rw;row.push(w);rw+=w.w}
 const rh=FS+12,bh=rows.length*rh;rows.forEach((row,ri)=>{const tw=row.reduce((a,w)=>a+w.w,0)+gap*(row.length-1);for(const w of row){w.ox=w.ox-tw/2;w.oy=ri*rh-bh/2}});return bh}
function onLine(words,t){if(t>=shatterT||t>=ERAS[1].start)return;const ws=words.map(makeWord);const bh=layout(ws);S.lines.push({words:ws,t0:t,bh,xo:(S.seq%2?1:-1)*12*(S.seq%3)});S.seq++}
const prog=(ln,t)=>clamp((t-ln.t0)/TRAVEL,0,1.2);
function geom(ln,t){const p=prog(ln,t),e=p*p*0.55+p*0.45;return{p,s:lerp(0.3,1.4,e),sy:lerp(0.3,1.4,e)*0.82,cx:VPX+ln.xo*e,cy:lerp(VPY+8,GROUND-14-ln.bh*0.58,e),a:Math.min(1,p*5)}}
function wordRect(w,g){return{x:g.cx+w.ox*g.s,y:g.cy+w.oy*g.sy,w:w.w*g.s,h:w.h*g.sy}}
function chip(w,mx,my,R){const d=w.img.data;let n=0;for(let yy=-R;yy<=R;yy++)for(let xx=-R;xx<=R;xx++){if(xx*xx+yy*yy>R*R)continue;const px=mx+xx,py=my+yy;if(px<0||py<0||px>=w.w||py>=w.h)continue;const i=(py*w.w+px)*4+3;if(d[i]>0){d[i]=0;n++}}if(n){w.left-=n;w.c.x.putImageData(w.img,0,0)}return n}
function shatter(){S.debris=[];const r=rngf(99);for(const ln of S.lines){const g=geom(ln,shatterT);for(const w of ln.words){if(w.dead)continue;const rc=wordRect(w,g);const d=w.img.data;for(let py=0;py<w.h;py+=3)for(let px=0;px<w.w;px+=3){if(d[(py*w.w+px)*4+3]===0)continue;S.debris.push({x:rc.x+px*g.s,y:rc.y+py*g.sy,vx:(r()-.5)*60,vy:-r()*40,land:GROUND-2-Math.floor(r()*6)})}}}S.lines=[];S.bul=[]}
function fire(){if(S.bul.length<3&&S.cool<=0){S.bul.push({x:S.ship.x+9,y:S.ship.y-2});S.cool=0.1;blip(880,0.05)}}
function target(t){let best=null,bp=-1;for(const ln of S.lines){const g=geom(ln,t);if(g.p>1.05)continue;for(const w of ln.words){if(w.dead)continue;const score=g.p+w.left/w.total*0.2;if(score>bp){bp=score;const rc=wordRect(w,g);best=rc.x+rc.w/2}}}return best}
function onBeat(b,t){S.pulse=1;if(t>=shatterT&&!S.debris)shatter()}
function on8th(n,t,auto){if(auto&&t<shatterT){const tx=target(t);if(tx!==null&&Math.abs(tx-(S.ship.x+9))<14)fire()}}
function update(dt,t,inp,auto){if(t>=ERAS[1].start)return;S.cool-=dt;S.pulse=Math.max(0,S.pulse-dt*3);const sh=S.ship;
 for(const st of S.stars){st.d+=st.sp*(10+st.d*0.25)*dt;if(st.d>LW*0.95){st.d=4+Math.random()*20;st.a=Math.random()*Math.PI*2}}
 if(t<shatterT){let dx=0;if(auto){const tx=target(t);if(tx!==null)dx=clamp((tx-9-sh.x)*5,-220,220)*dt}else{if(inp.left)dx=-180*dt;if(inp.right)dx=180*dt;if(inp.fire)fire()}sh.x=clamp(sh.x+dx,6,LW-24)}
 else{if(!S.debris)shatter();sh.x=lerp(sh.x,80/320*LW-9,1-Math.pow(0.02,dt));sh.y=lerp(sh.y,GROUND-10,1-Math.pow(0.02,dt))}
 for(const b of S.bul){b.y-=330*dt;if(b.hit)continue;
  for(const ln of S.lines){const g=geom(ln,t);if(g.p>1.05)continue;for(const w of ln.words){if(w.dead)continue;const rc=wordRect(w,g);if(b.x<rc.x||b.x>rc.x+rc.w||b.y<rc.y||b.y>rc.y+rc.h)continue;
   const mx=Math.floor((b.x-rc.x)/g.s),my=Math.floor((b.y-rc.y)/g.sy);const R=clamp(Math.round(7/g.s),4,14);const n=chip(w,mx,my,R);if(!n)continue;
   b.hit=true;S.chips++;S.score+=Math.min(50,n);blip(1200+Math.random()*400,0.04,0.08);for(let i=0;i<8;i++)S.pops.push({x:b.x,y:b.y,vx:(S.rng()-.5)*120,vy:-S.rng()*90,l:.5});
   if(w.left<w.total*0.16){w.dead=true;S.score+=100;noise(0.08,0.3,2000);const d=w.img.data;for(let py=0;py<w.h;py+=2)for(let px=0;px<w.w;px+=2){if(d[(py*w.w+px)*4+3]===0)continue;S.pops.push({x:rc.x+px*g.s,y:rc.y+py*g.sy,vx:(S.rng()-.5)*160,vy:(S.rng()-.9)*140,l:.7})}}
   break}if(b.hit)break}}
 S.bul=S.bul.filter(b=>!b.hit&&b.y>-10);
 S.lines=S.lines.filter(ln=>prog(ln,t)<1.2&&ln.words.some(w=>!w.dead));
 for(const p of S.pops){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.l-=dt}S.pops=S.pops.filter(p=>p.l>0);
 if(S.debris)for(const d of S.debris){if(d.y<d.land){d.vy+=220*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y>=d.land){d.y=d.land;d.vx=0}}}}
function draw(x,t){x.fillStyle='#000';x.fillRect(0,0,LW,LH);x.imageSmoothingEnabled=false;
 for(const st of S.stars){const sx=VPX+Math.cos(st.a)*st.d,sy=VPY+Math.sin(st.a)*st.d*0.7;if(sx<0||sx>LW||sy<0||sy>GROUND)continue;const b=Math.min(1,st.d/120)*st.b;x.fillStyle=`rgba(255,255,255,${b})`;x.fillRect(Math.round(sx),Math.round(sy),st.d>300?2:1,1)}
 const vg=x.createRadialGradient(VPX,VPY,0,VPX,VPY,70+S.pulse*20);vg.addColorStop(0,`rgba(255,232,31,${0.18+S.pulse*0.2})`);vg.addColorStop(1,'rgba(255,232,31,0)');x.fillStyle=vg;x.fillRect(VPX-100,VPY-100,200,200);
 if(t<bar(2)){const a=t<0.6?t/0.6:Math.min(1,(bar(2)-t)/0.8);x.globalAlpha=a;x.font="8px 'Press Start 2P',monospace";x.fillStyle='#4bd5ee';x.textAlign='center';x.fillText('A long time ago, at a desk far, far away....',LW/2,LH*0.42);x.textAlign='left';x.globalAlpha=1}
 const lines=S.lines.slice().sort((a,b)=>prog(a,t)-prog(b,t));
 for(const ln of lines){const g=geom(ln,t);if(g.p>1.1)continue;x.globalAlpha=g.a*(g.p>1?1-(g.p-1)*10:1);for(const w of ln.words){if(w.dead)continue;const rc=wordRect(w,g);x.drawImage(w.c.c,0,0,w.w,w.h,Math.round(rc.x),Math.round(rc.y),Math.max(1,Math.round(rc.w)),Math.max(1,Math.round(rc.h)))}}
 x.globalAlpha=1;
 for(const b of S.bul){x.fillStyle='rgba(255,255,255,.35)';x.fillRect(b.x-2,b.y-2,5,12);x.fillStyle='#fff';x.fillRect(b.x-0.5,b.y,2,8)}
 for(const p of S.pops){x.globalAlpha=Math.min(1,p.l*2);x.fillStyle=YEL;x.fillRect(p.x,p.y,2,2)}x.globalAlpha=1;
 if(S.debris){x.fillStyle=YEL;for(const d of S.debris)x.fillRect(d.x,d.y,2,2)}
 pix(x,SHIP,Math.round(S.ship.x),Math.round(S.ship.y),'#5bff5b',2);
 x.fillStyle='#5bff5b';x.fillRect(0,GROUND+8,LW,2);
 x.font="8px 'Press Start 2P',monospace";x.fillStyle=YEL;x.fillText('SCORE '+String(S.score).padStart(6,'0'),8,34);x.textAlign='right';x.fillText('CHIPS '+S.chips,LW-8,34);x.textAlign='left'}
return{init,onBeat,on8th,onLine,update,draw,SHIP}})();
