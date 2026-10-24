import {ERAS,BAR,BEAT,LYRICS,bar,rngf,clamp,lerp,blip,noise,mk,pix} from './core';

// ---------- ERA 1: arcade. Lyrics crawl toward you on a tilted plane; you chip the letters away ----------
export const E1=(()=>{
const LW=480,LH=270,GROUND=LH-26,FS=16,ROWW=300,BW=ROWW+24,TRAVEL=BAR*2.6,YEL='#ffe81f',VPX=LW/2,VPY=30;
// perspective: a point at depth z on the plane lands at screen y = VPY + F/z, with horizontal scale F2/z
const F=4000,F2=27,ROWD=0.56,ZFAR=112,ZNEAR=18;
const SHIP=['....X....','...XXX...','.XXXXXXX.','XXXXXXXXX'];
const shatterT=bar(17);
const K={LW,LH,GROUND,FS,ROWW,BW,TRAVEL,VPX,VPY,F,F2,ROWD,ZFAR,ZNEAR,shatterT};
let S:any;
function init(t){S={ship:{x:LW/2-9,y:GROUND-10,dead:false,deadT:-9,inv:0},bul:[],lines:[],debris:null,pops:[],score:0,chips:0,cool:0,rng:rngf(7),stars:[],pulse:0,seq:0,words:0,kills:0,deaths:0,oneShot:0,shots:0,n16:-1,park:null,K};
 const r=rngf(3);for(let i=0;i<150;i++)S.stars.push({a:r()*Math.PI*2,d:r()*LW*0.9,sp:0.4+r()*0.8,b:0.3+r()*0.7});
 // seek past bar 17: rebuild the lines that were still on the plane at the shatter (unchipped), shatter them and let the
 // debris fall for the time already elapsed, so a seek shows the same floor a play-through does (REVIEW-ERAS E1-4)
 if(t>=shatterT){let n=0,nw=0;LYRICS.forEach(([b,txt],i)=>{if(bar(b)>=shatterT)return;n=i+1;nw+=txt.split(' ').length;if(bar(b)+TRAVEL*1.5<shatterT)return;S.seq=i;onLine(txt.split(' '),bar(b))});
  S.seq=n;S.words=nw;shatter();const el=Math.min(t,ERAS[1].start)-shatterT;for(let k=0;k<Math.round(el*60);k++)fall(1/60);S.ship.x=lerp(S.ship.x,80/320*LW-9,1-Math.pow(0.02,el))}}
function fall(dt){for(const d of S.debris){if(d.y<d.land){d.vy+=220*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y>=d.land){d.y=d.land;d.vx=0}}}}
function makeWord(text){const c=mk(4,4);c.x.font=`${FS}px 'Press Start 2P',monospace`;const w=Math.ceil(c.x.measureText(text).width)+6,h=FS+8;c.c.width=w;c.c.height=h;c.x.imageSmoothingEnabled=false;c.x.font=`${FS}px 'Press Start 2P',monospace`;c.x.textBaseline='top';c.x.fillStyle=YEL;c.x.fillText(text,3,3);const img=c.x.getImageData(0,0,w,h);let n=0;for(let i=3;i<img.data.length;i+=4)if(img.data[i]>0)n++;return{text,c,img,w,h,total:Math.max(1,n),left:n,dead:false,bx:0,by:0,aim:-1}}
function layout(words){const gap=12,rows=[[]];let rw=0;for(const w of words){if(rw>0&&rw+gap+w.w>ROWW){rows.push([]);rw=0}const row=rows[rows.length-1];if(row.length)rw+=gap;w.bx=rw;row.push(w);rw+=w.w}
 const rh=FS+14;rows.forEach((row,ri)=>{const tw=row.reduce((a,w)=>a+w.w,0)+gap*(row.length-1);for(const w of row){w.bx=Math.round((BW-tw)/2+w.bx);w.by=6+ri*rh}});return rows.length*rh+10}
function onLine(words,t){if(t>=shatterT||t>=ERAS[1].start)return;const ws=words.map(makeWord);const bh=layout(ws);S.lines.push({words:ws,t0:t,bh,tex:mk(BW,bh),xo:(S.seq%2?1:-1)*10*(S.seq%3)});S.seq++;S.words+=ws.length}
const zOf=(ln,t)=>ZFAR-(t-ln.t0)/TRAVEL*(ZFAR-ZNEAR);
const rowZ=(ln,row,t)=>zOf(ln,t)+(ln.bh-row)*ROWD;
const alphaOf=(ln,t)=>clamp((ZFAR-zOf(ln,t))/18,0,1);
function compose(ln){const x=ln.tex.x;x.clearRect(0,0,BW,ln.bh);for(const w of ln.words)if(!w.dead)x.drawImage(w.c.c,w.bx,w.by)}
function toScreen(ln,u,row,t){const z=rowZ(ln,row,t);return{x:VPX+(u-BW/2+ln.xo)*F2/z,y:VPY+F/z,z}}
// one hit never takes more than 45% of a word, so even a far (R=14) hit on "I" leaves it standing
function chip(w,mx,my,R){const d=w.img.data,cap=Math.ceil(w.total*0.45);let n=0;for(let yy=-R;yy<=R&&n<cap;yy++)for(let xx=-R;xx<=R&&n<cap;xx++){if(xx*xx+yy*yy>R*R)continue;const px=mx+xx,py=my+yy;if(px<0||py<0||px>=w.w||py>=w.h)continue;const i=(py*w.w+px)*4+3;if(d[i]>0){d[i]=0;n++}}if(n){w.left-=n;w.aim=-1;w.c.x.putImageData(w.img,0,0)}return n}
function shatter(){S.debris=[];const r=rngf(99);for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const d=w.img.data;for(let py=0;py<w.h;py+=3)for(let px=0;px<w.w;px+=3){if(d[(py*w.w+px)*4+3]===0)continue;const sp=toScreen(ln,w.bx+px,w.by+py,shatterT);if(sp.z<2||sp.y>GROUND)continue;S.debris.push({x:sp.x,y:sp.y,vx:(r()-.5)*60,vy:-r()*40,land:GROUND-2-Math.floor(r()*6)})}}}S.lines=[];S.bul=[]}
function fire(){if(S.ship.dead)return;if(S.bul.length<3&&S.cool<=0){S.bul.push({x:S.ship.x+9,y:S.ship.y-2});S.cool=0.1;S.shots++;blip(880,0.05)}}
// autopilot aim point inside a word: the column with the most solid pixels left, ties to the centre (aiming at the
// centre put most shots through the gap between two letters once a shot has to land on a solid pixel); cached per chip
function aimCol(w){if(w.aim>=0)return w.aim;const d=w.img.data;let best=w.w>>1,bn=-1;for(let c=0;c<w.w;c++){let n=0;for(let r=0;r<w.h;r++)if(d[(r*w.w+c)*4+3]>0)n++;const sc=n-Math.abs(c-w.w/2)*0.01;if(sc>bn){bn=sc;best=c}}return w.aim=best}
// would a shot from screen column x meet a solid pixel of some live word right now (any row up to the vanishing point)?
function wouldHit(x,t){for(let y=S.ship.y-2;y>VPY+1;y--){const z=F/(y-VPY),sc=F2/z;for(const ln of S.lines){const row=ln.bh-(z-zOf(ln,t))/ROWD;if(row<0||row>=ln.bh)continue;const u=(x-VPX)/sc+BW/2-ln.xo;
  for(const w of ln.words){if(w.dead||u<w.bx||u>=w.bx+w.w||row<w.by||row>=w.by+w.h)continue;if(w.img.data[(Math.floor(row-w.by)*w.w+Math.floor(u-w.bx))*4+3]>0)return true}}}return false}
function target(t){let best=null,bz=1e9;for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const sp=toScreen(ln,w.bx+aimCol(w)+0.5,w.by+w.h/2,t);if(sp.z<3||sp.y>GROUND-4)continue;const score=sp.z-w.left/w.total*20;if(score<bz){bz=score;best=sp.x}}}return best}
// does the cannon sprite at (x,y) touch a remaining pixel of word w (of line ln) at time t?
function hitAt(ln,w,x,y,t){const zb=zOf(ln,t);for(let r=0;r<SHIP.length;r++)for(let c=0;c<SHIP[r].length;c++){if(SHIP[r][c]!=='X')continue;const px=x+c*2+1,py=y+r*2+1;if(py<=VPY+1)continue;const z=F/(py-VPY);const row=ln.bh-(z-zb)/ROWD;if(row<w.by||row>=w.by+w.h)continue;const u=(px-VPX)/(F2/z)+BW/2-ln.xo;if(u<w.bx||u>=w.bx+w.w)continue;if(w.img.data[(Math.floor(row-w.by)*w.w+Math.floor(u-w.bx))*4+3]>0)return true}return false}
// autopilot: if a word's remaining pixels will run over the cannon within ~0.45 s, the nearest x that stays clear (a chipped tunnel, a gap, or past the row's end), else null
// The cannon never moves vertically, so each sprite cell sits at a fixed depth z and plane column u; as the line crawls
// that cell sweeps a contiguous run of texture rows (bottom rows first: the row index falls as the line comes closer). `sweep` tests the whole run between t0 and t1 (exact and
// conservative: it is the union of every per-frame hitAt test), where sampling a few instants used to step over
// 2-px strokes near the bottom (rows pass the cannon at ~34 rows/s) and the autopilot drove into words it called safe.
const LOOK=0.45;
function sweep(ln,w,x,y,t0,t1){const za=zOf(ln,t0),zb=zOf(ln,t1),d=w.img.data;for(let r=0;r<SHIP.length;r++)for(let c=0;c<SHIP[r].length;c++){if(SHIP[r][c]!=='X')continue;
  const px=x+c*2+1,py=y+r*2+1,z=F/(py-VPY),col=Math.floor((px-VPX)/(F2/z)+BW/2-ln.xo-w.bx);if(col<0||col>=w.w)continue;
  const r0=Math.max(0,Math.floor(ln.bh-(z-zb)/ROWD-w.by)),r1=Math.min(w.h-1,Math.floor(ln.bh-(z-za)/ROWD-w.by));
  for(let row=r0;row<=r1;row++)if(d[(row*w.w+col)*4+3]>0)return true}return false}
// words whose rows can reach the cannon's depth band within LOOK seconds
function threats(t){const sh=S.ship,zs0=F/(sh.y+8-VPY),zs1=F/(sh.y-VPY),th:any=[];for(const ln of S.lines){const zn=zOf(ln,t+LOOK),zf=zOf(ln,t);
  for(const w of ln.words){if(w.dead)continue;if(zf+(ln.bh-w.by)*ROWD<zs0||zn+(ln.bh-w.by-w.h)*ROWD>zs1)continue;th.push([ln,w])}}th.t=t;return th}
const danger=(th,x)=>th.some(([ln,w])=>sweep(ln,w,x,S.ship.y,th.t,th.t+LOOK));
function dodge(th){const sh=S.ship;if(!th.length||!danger(th,sh.x))return null;
 for(let o=2;o<=120;o+=2){if(sh.x-o>=6&&!danger(th,sh.x-o))return sh.x-o;if(sh.x+o<=LW-24&&!danger(th,sh.x+o))return sh.x+o}return null}
function onBeat(_b,t){if(t>=ERAS[1].start)return;S.pulse=1;if(t>=shatterT&&!S.debris)shatter()}
function on8th(_n,_t,_auto){}
function update(dt,t,inp,auto){if(t>=ERAS[1].start)return;S.cool-=dt;S.pulse=Math.max(0,S.pulse-dt*3);const sh=S.ship;
 for(const st of S.stars){st.d+=st.sp*(10+st.d*0.25)*dt;if(st.d>LW*0.95){st.d=4+S.rng()*20;st.a=S.rng()*Math.PI*2}}
 sh.inv=Math.max(0,sh.inv-dt);if(sh.dead&&t-sh.deadT>0.7){sh.dead=false;sh.inv=2.6;sh.x=LW/2-9}
 if(S.park!==null){if(!sh.dead)sh.x=S.park}
 else if(t<shatterT&&!sh.dead){let dx=0;if(auto){const tx=target(t),th=threats(t);if(tx!==null)dx=clamp((tx-9-sh.x)*5,-220,220)*dt;const sx=dodge(th);if(sx!==null)dx=clamp((sx-sh.x)*8,-260,260)*dt;else if(dx&&th.length&&danger(th,sh.x+dx))dx=0;
   // autofire on every 16th note while a live word is lined up (on8th alone fired ~2 shots/s; held space gives ~6)
   const n16=Math.floor(t/(BEAT/4));if(n16!==S.n16){S.n16=n16;if(tx!==null&&(Math.abs(tx-(sh.x+9))<6||wouldHit(sh.x+9,t)))fire()}}
  else{if(inp.left)dx=-180*dt;if(inp.right)dx=180*dt;if(inp.fire||inp.fireHeld)fire()}sh.x=clamp(sh.x+dx,6,LW-24)}
 else if(t>=shatterT){if(!S.debris)shatter();sh.x=lerp(sh.x,80/320*LW-9,1-Math.pow(0.02,dt));sh.y=lerp(sh.y,GROUND-10,1-Math.pow(0.02,dt))}
 // a shot is tested on every screen row it crossed this frame: far away one screen row spans ~3.5 texture rows, so a
 // 5.5 px step jumped clean over whole (6 px tall) far words and most autofire hit nothing
 for(const b of S.bul){const y0=b.y;b.y-=330*dt;if(b.hit)continue;for(let by=Math.floor(y0);by>=b.y&&!b.hit;by--){if(by<=VPY+1)break;const z=F/(by-VPY),sc=F2/z;
  for(const ln of S.lines){const zb=zOf(ln,t);const row=ln.bh-(z-zb)/ROWD;if(row<0||row>=ln.bh)continue;const u=(b.x-VPX)/sc+BW/2-ln.xo;
   for(const w of ln.words){if(w.dead||u<w.bx||u>=w.bx+w.w||row<w.by||row>=w.by+w.h)continue;
    // the shot lands on the first solid pixel up its column (it used to chip the word's bottom padding: ~16 px a hit and
    // no word ever died); an open column (a tunnel already chipped through) lets it fly on to the next word
    const R=clamp(Math.round(10/sc),6,14),cu=Math.floor(u-w.bx),d=w.img.data;let hr=-1;for(let rr=Math.floor(row-w.by);rr>=0;rr--)if(d[(rr*w.w+cu)*4+3]>0){hr=rr;break}
    if(hr<0)continue;const n=chip(w,cu,Math.max(0,hr-(R>>1)),R);if(!n)continue;
    b.hit=true;S.chips++;S.score+=Math.min(50,n);blip(1200+S.rng()*400,0.04,0.08);for(let i=0;i<8;i++)S.pops.push({x:b.x,y:by,vx:(S.rng()-.5)*120,vy:-S.rng()*90,l:.5});
    if(w.left<w.total*0.16){w.dead=true;S.kills++;if(w.left+n===w.total)S.oneShot++;S.score+=100;noise(0.08,0.3,2000);const d=w.img.data;for(let py=0;py<w.h;py+=2)for(let px=0;px<w.w;px+=2){if(d[(py*w.w+px)*4+3]===0)continue;const sp=toScreen(ln,w.bx+px,w.by+py,t);S.pops.push({x:sp.x,y:sp.y,vx:(S.rng()-.5)*160,vy:(S.rng()-.9)*140,l:.7})}}
    break}if(b.hit)break}}}
 if(!sh.dead&&sh.inv<=0&&t<shatterT){let hitW:any=null,hitL:any=null;outer:for(const ln of S.lines){for(const w of ln.words){if(w.dead)continue;const spb=toScreen(ln,w.bx+w.w/2,w.by+w.h,t),spt=toScreen(ln,w.bx+w.w/2,w.by,t);if(spb.z<1.5||spb.y<sh.y-1||spt.y>sh.y+9)continue;
   if(hitAt(ln,w,sh.x,sh.y,t)){hitW=w;hitL=ln;break outer}}}
  if(hitW){const w=hitW,ln=hitL;sh.dead=true;sh.deadT=t;S.deaths++;S.score=Math.max(0,S.score-100);noise(0.2,0.5,600);blip(80,0.4,0.2);for(let i=0;i<40;i++)S.pops.push({x:sh.x+9,y:sh.y+4,vx:(S.rng()-.5)*260,vy:(S.rng()-.9)*220,l:.8,g:true});w.dead=true;const d=w.img.data;for(let py=0;py<w.h;py+=2)for(let px=0;px<w.w;px+=2){if(d[(py*w.w+px)*4+3]===0)continue;const q=toScreen(ln,w.bx+px,w.by+py,t);S.pops.push({x:q.x,y:q.y,vx:(S.rng()-.5)*160,vy:(S.rng()-.9)*140,l:.7})}}}
 S.bul=S.bul.filter(b=>!b.hit&&b.y>-10);
 S.lines=S.lines.filter(ln=>zOf(ln,t)+ln.bh*ROWD>2&&ln.words.some(w=>!w.dead));
 for(const p of S.pops){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.l-=dt}S.pops=S.pops.filter(p=>p.l>0);
 if(S.debris)fall(dt)}
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
return{init,onBeat,on8th,onLine,update,draw,SHIP,K,get S(){return S}}})();
