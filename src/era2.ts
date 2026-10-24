import {ERAS,TRANS,BEAT,rngf,hash,clamp,lerp,blip,hat,noise} from './core';

// ---------- ERA 2: 32-bit 2D platformer. Crystal islands at dusk, a scarfed runner, chompers to stomp, wisps to dodge ----------
export const E2=(()=>{
const VW=320,VH=180,SC=1.5,B=16,SPEED=64/BEAT,PX=80,G=900,JV=-330;const start=ERAS[1].start,end=ERAS[2].start;
let S:any;
function gen(to){while(S.genX<to){const r=S.rng;
 if(S.plats.length===0){S.plats.push({x:-200,y:VH-48,w:200+PX+B*9,f:0,kind:'ground'});S.genX=S.plats[0].x+S.plats[0].w;S.lastTop=VH-48;continue}
 const idx=S.plats.length;const w=(3+Math.floor(r()*6))*B;let top=clamp(S.lastTop+(Math.floor(r()*5)-2)*B,VH-112,VH-32);
 const dh=(S.lastTop-top)/B;const gap=(dh>=2?1:1+Math.floor(r()*3))*B;const x=S.genX+gap;const kind=top>=VH-48?'ground':(r()<0.5?'crystal':'moss');
 S.plats.push({x,y:top,w,f:0,kind});
 if(kind==='ground'&&w>=6*B&&r()<0.45){const px=x+B*2+Math.floor(r()*((w-4*B)/B))*B;const ph=(1+Math.floor(r()*2))*B;S.plats.push({x:px,y:top-ph,w:2*B,f:0,kind:'pillar',h:ph})}
 if(w>=5*B&&r()<0.55&&idx>2)S.foes.push({t:'walk',x:x+B,y:top,x0:x+4,x1:x+w-20,dir:1,alive:true,sq:0,ph:r()*6});
 if(r()<0.3&&idx>3)S.foes.push({t:'fly',x:x+w/2,y:top-60-r()*30,base:top-60-r()*30,ph:r()*6,alive:true,sq:0});
 S.genX=x+w;S.lastTop=top}
 S.plats=S.plats.filter(p=>p.x+p.w>S.camX-400);S.foes=S.foes.filter(f=>f.x>S.camX-120)}
function init(t){S={rng:rngf(21),plats:[],coins:[],foes:[],line:[],genX:0,lastTop:VH-48,score:0,coinsGot:0,stomps:0,camX:Math.max(0,t-start)*SPEED,pops:[],shake:0};gen(S.camX+VW+64);
 const px=S.camX+PX;const p=S.plats.filter(q=>q.kind!=='pillar'&&px>=q.x&&px<=q.x+q.w)[0]||S.plats[0];S.pl={x:px,y:p.y,vy:0,ground:true,sq:0,stun:0}}
function onLine(words,t){if(t<start-TRANS||t>=end)return;let x=S.camX+VW-30;gen(x+700);S.coins=S.coins.filter(c=>c.got||c.x>S.camX-50);S.line=[];words.forEach((w,i)=>{const wd=w.length*6;const pl=S.plats.filter(q=>q.kind!=='pillar'&&x+wd/2>=q.x&&x+wd/2<=q.x+q.w)[0];const top=pl?pl.y:S.lastTop;S.coins.push({x,y:top-30-(i%2)*14,w:wd,text:w,got:0});x+=wd+26})}
const under=(x)=>S.plats.filter(q=>x+2>=q.x&&x-2<=q.x+q.w);
function update(dt,t,inp,auto){if(t<start-TRANS||t>=end)return;const sp=SPEED*(inp.right?1.25:inp.left?.8:1);S.camX+=sp*dt;gen(S.camX+VW+64);const p=S.pl;p.x=S.camX+PX;p.stun=Math.max(0,p.stun-dt);S.shake=Math.max(0,S.shake-dt);
 const u=under(p.x);if(p.ground&&!u.find(q=>Math.abs(q.y-p.y)<1))p.ground=false;
 let want=false;
 if(auto){const cur=u.filter(q=>Math.abs(q.y-p.y)<1).sort((a,b)=>a.y-b.y)[0];
  if(p.ground&&cur){const next=S.plats.find(q=>q.kind!=='pillar'&&q.x>cur.x&&q.x>p.x);const toEdge=cur.x+cur.w-p.x;if(toEdge<28&&next&&next.y<=cur.y+B*2)want=true;if(next&&next.y<cur.y&&next.x-p.x<40&&toEdge<48)want=true;
   if(S.plats.find(q=>q.kind==='pillar'&&q.x>p.x&&q.x-p.x<44))want=true;
   if(S.foes.find(f=>f.alive&&!f.sq&&f.t==='walk'&&f.x>p.x&&f.x-p.x<46&&Math.abs(f.y-p.y)<20))want=true;
   if(!want&&S.coins.some(c=>!c.got&&c.x+c.w/2>p.x&&c.x+c.w/2-p.x<34&&c.y<p.y-26))want=true}}
 else if(inp.jump)want=true;
 if(want&&p.ground){p.vy=JV;p.ground=false;blip(660,0.08)}
 if(!p.ground){const oy=p.y;p.vy+=G*dt;p.y+=p.vy*dt;if(p.vy>0)for(const q of u){if(oy<=q.y+0.01&&p.y>=q.y){p.y=q.y;p.vy=0;p.ground=true;q.f=0.25;p.sq=0.15;hat(false);break}}}
 if(p.y>VH+30){const next=S.plats.find(q=>q.kind!=='pillar'&&q.x>p.x)||S.plats[S.plats.length-1];p.y=next.y-40;p.vy=0;S.camX=next.x+8-PX;p.x=S.camX+PX}
 for(const f of S.foes){if(!f.alive)continue;if(f.sq){f.sq+=dt;if(f.sq>0.4)f.alive=false;continue}
  if(f.t==='walk'){f.x+=f.dir*22*dt;if(f.x<f.x0){f.x=f.x0;f.dir=1}if(f.x>f.x1){f.x=f.x1;f.dir=-1}}else{f.y=f.base+Math.sin(t*2.2+f.ph)*18;f.x-=10*dt}
  const fw=16,fh=f.t==='walk'?14:10,fx=f.x,fy=f.y-fh;
  if(p.x+6>fx&&p.x-6<fx+fw&&p.y>fy&&p.y-24<fy+fh){
   if(p.vy>80&&p.y-fy<10){f.sq=0.001;S.score+=200;S.stomps++;p.vy=-230;p.ground=false;noise(0.06,0.3,1500);blip(330,0.08,0.12);for(let i=0;i<10;i++)S.pops.push({x:fx+8,y:fy+6,vx:(Math.random()-.5)*90,vy:-Math.random()*80,l:.5,c:f.t==='walk'?'#e070ff':'#9af0ff'})}
   else if(p.stun<=0){p.stun=1.0;S.score=Math.max(0,S.score-50);S.shake=0.3;p.vy=-160;p.ground=false;blip(110,0.25,0.15)}}}
 for(const c of S.coins){if(!c.got&&p.x>c.x-6&&p.x<c.x+c.w+6&&Math.abs(c.y-(p.y-12))<14){c.got=0.001;S.coinsGot++;S.score+=10;S.line.push(c.text);blip(1320,0.06)}if(c.got)c.got+=dt}
 S.coins=S.coins.filter(c=>c.x+c.w>S.camX-50&&c.got<0.4);for(const q of S.plats)q.f=Math.max(0,q.f-dt);p.sq=Math.max(0,p.sq-dt);
 for(const q of S.pops){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=300*dt;q.l-=dt}S.pops=S.pops.filter(q=>q.l>0)}
// ---------------- drawing (vector sprites with gradients, 32-bit pre-rendered feel) ----------------
function rr(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath()}
function lg(x,x0,y0,x1,y1,stops){const g=x.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>g.addColorStop(o,c));return g}
function hero(x,cx,fy,t,ground,sq,vy){const run=ground?t*14:0;const legA=Math.sin(run)*0.9,legB=-legA;const bob=ground?Math.abs(Math.sin(run))*1.5:0;const y=fy-bob;x.save();x.translate(cx,y);x.lineWidth=1;x.strokeStyle='#1a1430';
 // scarf
 x.fillStyle=lg(x,-14,0,0,0,[[0,'rgba(255,140,40,0)'],[0.3,'#ff8c28'],[1,'#ffb050']]);x.beginPath();x.moveTo(-3,-19);for(let i=0;i<=5;i++){const px=-3-i*3.2,py=-19+Math.sin(t*12+i)*1.6+i*0.6;x.lineTo(px,py-1.6)}for(let i=5;i>=0;i--){const px=-3-i*3.2,py=-19+Math.sin(t*12+i)*1.6+i*0.6;x.lineTo(px,py+1.6)}x.closePath();x.fill();
 // legs
 for(const[a,side]of[[legA,-1],[legB,1]]){x.save();x.translate(side*2,-10);x.rotate(ground?a*0.6:(side<0?0.5:-0.3));x.fillStyle=lg(x,0,0,0,10,[[0,'#2b3b6e'],[1,'#1a2448']]);rr(x,-2.2,0,4.4,9,2);x.fill();x.stroke();x.fillStyle='#4a2a16';rr(x,-2.6,7.5,5.2,3.2,1.5);x.fill();x.stroke();x.restore()}
 // torso
 x.fillStyle=lg(x,-5,-21,5,-9,[[0,'#2fd8d0'],[0.6,'#1fa8b0'],[1,'#146878']]);rr(x,-5,-21,10,12,3);x.fill();x.stroke();x.fillStyle='rgba(255,255,255,.35)';rr(x,-3.5,-20,2,9,1);x.fill();
 // arms
 for(const[a,side]of[[-legA,-1],[-legB,1]]){x.save();x.translate(side*5,-19);x.rotate(ground?a*0.7:-1.2);x.fillStyle='#1fa8b0';rr(x,-1.6,0,3.2,8,1.6);x.fill();x.stroke();x.fillStyle='#f3c08e';x.beginPath();x.arc(0,8.5,1.8,0,7);x.fill();x.stroke();x.restore()}
 // head
 x.fillStyle=lg(x,-5,-30,5,-20,[[0,'#ffd9b0'],[1,'#e8a878']]);x.beginPath();x.arc(0,-26,5.5,0,7);x.fill();x.stroke();
 // hair
 x.fillStyle=lg(x,-6,-34,6,-26,[[0,'#3af0e0'],[1,'#15b0a8']]);x.beginPath();x.moveTo(-6,-27);x.lineTo(-7,-33);x.lineTo(-3,-30);x.lineTo(-1,-35);x.lineTo(2,-30);x.lineTo(5,-34);x.lineTo(6,-27);x.quadraticCurveTo(0,-32,-6,-27);x.closePath();x.fill();x.stroke();
 // goggles
 x.fillStyle='#1a1430';rr(x,-6,-29,12,3.6,1.5);x.fill();x.fillStyle='#8af0ff';rr(x,-5,-28.6,4,2.6,1);x.fill();rr(x,1,-28.6,4,2.6,1);x.fill();x.fillStyle='rgba(255,255,255,.7)';x.fillRect(-4.4,-28.3,1.2,0.8);x.fillRect(1.6,-28.3,1.2,0.8);
 // mouth
 x.fillStyle='#8a3a3a';rr(x,0.5,-23.6,2.4,1,0.5);x.fill();
 x.restore()}
function chomper(x,cx,fy,t,dir,ph){x.save();x.translate(cx+8,fy);x.scale(dir,1);x.lineWidth=1;x.strokeStyle='#2a0f3a';const bounce=Math.abs(Math.sin(t*8+ph))*1.5;
 for(const s of[-1,1]){x.fillStyle='#3a1a4e';rr(x,s*4-2.5,-3+bounce*(s<0?1:0),5,3.5,1.5);x.fill();x.stroke()}
 x.fillStyle=lg(x,-8,-16,8,-2,[[0,'#f070ff'],[0.5,'#b040e0'],[1,'#6a1aa0']]);x.beginPath();x.arc(0,-9-bounce*0.5,8,0,7);x.fill();x.stroke();
 x.fillStyle='#8a2ad0';for(const sx of[-5,-1.5,2,5.5]){x.beginPath();x.moveTo(sx-1.5,-15);x.lineTo(sx,-19.5-bounce*0.5);x.lineTo(sx+1.5,-15);x.closePath();x.fill();x.stroke()}
 x.fillStyle='#2a0f3a';x.beginPath();x.ellipse(1.5,-7,5.2,2.6+Math.abs(Math.sin(t*6+ph))*1.2,0,0,7);x.fill();x.fillStyle='#fff';for(const sx of[-2,0.5,3]){x.beginPath();x.moveTo(sx,-9.2);x.lineTo(sx+1,-6.8);x.lineTo(sx+2,-9.2);x.closePath();x.fill()}
 x.fillStyle='#fff';x.beginPath();x.arc(-2,-12,2,0,7);x.arc(3,-12,2,0,7);x.fill();x.fillStyle='#2a0f3a';x.beginPath();x.arc(-1.5,-12,1,0,7);x.arc(3.5,-12,1,0,7);x.fill();x.lineWidth=1.2;x.beginPath();x.moveTo(-4.5,-15);x.lineTo(-0.5,-13.5);x.moveTo(5.5,-15);x.lineTo(1.5,-13.5);x.stroke();x.restore()}
function squashed(x,cx,fy){x.save();x.translate(cx+8,fy);x.fillStyle='#b040e0';x.strokeStyle='#2a0f3a';x.beginPath();x.ellipse(0,-2.5,10,2.6,0,0,7);x.fill();x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(-3,-3,1.3,0,7);x.arc(3,-3,1.3,0,7);x.fill();x.restore()}
function wisp(x,cx,cy,t,ph){x.save();x.translate(cx+8,cy);const flap=Math.sin(t*10+ph);x.strokeStyle='#1a4a6a';x.lineWidth=1;
 for(let i=1;i<=3;i++){x.fillStyle=`rgba(154,240,255,${0.35-i*0.09})`;x.beginPath();x.ellipse(-i*4,Math.sin(t*6+i)*1.5,4-i*0.8,2.5-i*0.5,0,0,7);x.fill()}
 x.fillStyle=lg(x,0,-8,0,6,[[0,'#dffcff'],[1,'#58c8ff']]);x.beginPath();x.ellipse(0,0,6,5,0,0,7);x.fill();x.stroke();
 x.fillStyle='rgba(154,240,255,.85)';for(const s of[-1,1]){x.beginPath();x.moveTo(s*4,-2);x.quadraticCurveTo(s*12,-9+flap*4,s*13,-1+flap*3);x.quadraticCurveTo(s*9,0,s*4,1);x.closePath();x.fill();x.stroke()}
 x.fillStyle='#1a2a4a';x.beginPath();x.arc(-2,-1,1.2,0,7);x.arc(2,-1,1.2,0,7);x.fill();x.restore()}
function platform(x,q,sx,t){const w=q.w,top=q.y;const h=q.kind==='pillar'?q.h:VH-top+6;
 if(q.kind==='ground'){x.fillStyle=lg(x,0,top,0,top+h,[[0,'#6c5a84'],[0.5,'#3d3050'],[1,'#241c30']]);x.fillRect(sx,top+4,w,h);x.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<w/18;i++){const bx=sx+hash(q.x+i)*w,by=top+10+hash(q.x*3+i)*(h-14);x.beginPath();x.ellipse(bx,by,3+hash(i)*3,1.5,0,0,7);x.fill()}
  for(let i=0;i<w/40;i++){const bx=sx+8+hash(q.x*7+i)*(w-16),by=top+16+hash(q.x*9+i)*(Math.max(4,h-30));x.fillStyle=`rgba(120,240,255,${0.5+0.4*Math.sin(t*3+i)})`;x.beginPath();x.moveTo(bx,by-4);x.lineTo(bx+2.5,by);x.lineTo(bx,by+4);x.lineTo(bx-2.5,by);x.closePath();x.fill()}
  x.fillStyle=lg(x,0,top,0,top+7,[[0,'#8af06a'],[0.5,'#4fb848'],[1,'#2d7a34']]);rr(x,sx,top,w,7,3);x.fill();x.fillStyle='#b8ff8a';for(let gx=sx+3;gx<sx+w-2;gx+=6){x.beginPath();x.moveTo(gx,top);x.lineTo(gx+1.5,top-3.5-hash(gx)*2);x.lineTo(gx+3,top);x.fill()}
  x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;x.strokeRect(sx+0.5,top+0.5,w-1,h-1)}
 else if(q.kind==='crystal'){x.fillStyle=lg(x,sx,top,sx+w,top+18,[[0,'rgba(120,230,255,.85)'],[0.5,'rgba(70,170,230,.85)'],[1,'rgba(40,100,190,.9)']]);x.beginPath();x.moveTo(sx,top);x.lineTo(sx+w,top);x.lineTo(sx+w-6,top+14);x.lineTo(sx+w/2,top+20);x.lineTo(sx+6,top+14);x.closePath();x.fill();x.strokeStyle='#dffcff';x.lineWidth=1;x.stroke();
  x.strokeStyle='rgba(255,255,255,.45)';for(let i=1;i<w/24;i++){x.beginPath();x.moveTo(sx+i*24,top+1);x.lineTo(sx+i*24-5,top+13);x.stroke()}x.fillStyle=`rgba(200,255,255,${0.5+0.3*Math.sin(t*4+q.x)})`;x.fillRect(sx,top,w,1.5)}
 else if(q.kind==='moss'){x.fillStyle=lg(x,0,top,0,top+20,[[0,'#5a4a6e'],[1,'#2a2238']]);rr(x,sx,top+3,w,17,4);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.stroke();x.fillStyle=lg(x,0,top,0,top+6,[[0,'#7adf5a'],[1,'#2f8a3a']]);rr(x,sx-1,top,w+2,6,3);x.fill();
  x.strokeStyle='#2f8a3a';x.lineWidth=1.2;for(let i=0;i<w/14;i++){const vx=sx+6+i*14;x.beginPath();x.moveTo(vx,top+20);x.quadraticCurveTo(vx+2,top+26+hash(vx)*8,vx-1,top+30+hash(vx*3)*10);x.stroke()}}
 else{x.fillStyle=lg(x,sx,0,sx+w,0,[[0,'#8a7aa0'],[0.5,'#5a4a70'],[1,'#3a2e50']]);x.fillRect(sx+3,top+6,w-6,h);x.fillStyle=lg(x,0,top,0,top+8,[[0,'#a898c0'],[1,'#6a5a84']]);rr(x,sx,top,w,8,2);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=1;x.strokeRect(sx+0.5,top+0.5,w-1,8);x.strokeRect(sx+3.5,top+6.5,w-7,h-6)}
 if(q.f>0){x.fillStyle=`rgba(255,255,255,${q.f*2})`;x.fillRect(sx,top,w,4)}}
function mountains(x,cam,base,sp,amp,col1,col2,seed){x.fillStyle=lg(x,0,base-amp*2,0,base,[[0,col1],[1,col2]]);x.beginPath();x.moveTo(-4,base+20);for(let sx=-4;sx<=VW+4;sx+=4){const wx=sx+cam*sp;x.lineTo(sx,base-Math.abs(Math.sin(wx*0.012+seed)*amp+Math.sin(wx*0.031+seed*2)*amp*0.45))}x.lineTo(VW+4,base+20);x.fill()}
function draw(x,t){const cam=S.camX;x.save();x.scale(SC,SC);if(S.shake>0)x.translate((Math.random()-.5)*3,(Math.random()-.5)*3);
 x.fillStyle=lg(x,0,0,0,VH,[[0,'#1a0f4a'],[0.45,'#6a2a8a'],[0.75,'#ff7a6a'],[1,'#ffd27a']]);x.fillRect(-4,-4,VW+8,VH+8);
 const mg=x.createRadialGradient(250,46,6,250,46,40);mg.addColorStop(0,'rgba(255,245,210,1)');mg.addColorStop(0.5,'rgba(255,230,180,.9)');mg.addColorStop(0.55,'rgba(255,230,180,.25)');mg.addColorStop(1,'rgba(255,230,180,0)');x.fillStyle=mg;x.fillRect(200,0,110,100);x.fillStyle='rgba(220,200,170,.5)';for(const[dx,dy,r]of[[-6,-4,3],[5,6,4],[8,-8,2]]){x.beginPath();x.arc(250+dx,46+dy,r,0,7);x.fill()}
 for(let i=-1;i<6;i++){const cx=i*110-((cam*0.08)%110)+hash(i)*40,cy=30+hash(i*5)*40;x.fillStyle=lg(x,0,cy-10,0,cy+8,[[0,'rgba(255,220,240,.95)'],[1,'rgba(230,140,200,.6)']]);x.beginPath();x.ellipse(cx,cy,26,7,0,0,7);x.ellipse(cx+14,cy-5,16,8,0,0,7);x.ellipse(cx-12,cy-3,14,6,0,0,7);x.fill()}
 mountains(x,cam,VH-30,0.1,34,'#5a2a7a','#2a1a4a',1);mountains(x,cam,VH-24,0.2,26,'#3a2a6a','#1e1640',7);
 for(let i=-1;i<4;i++){const wx=i*180-((cam*0.2)%180)+60;x.fillStyle='rgba(200,240,255,.55)';x.fillRect(wx,VH-70,3,46);x.fillStyle='rgba(255,255,255,.7)';x.fillRect(wx+1,VH-70+((t*60)%12),1,6)}
 mountains(x,cam,VH-14,0.36,18,'#2a3a5a','#141c34',3);
 x.fillStyle=lg(x,0,VH-20,0,VH,[[0,'#3a3050'],[1,'#1a1428']]);x.fillRect(-4,VH-18,VW+8,22);
 for(const q of S.plats){const sx=q.x-cam;if(sx>VW||sx+q.w<0)continue;platform(x,q,sx,t)}
 for(const f of S.foes){if(!f.alive)continue;const sx=f.x-cam;if(sx<-24||sx>VW+24)continue;if(f.sq){squashed(x,sx,f.y);continue}if(f.t==='walk')chomper(x,sx,f.y,t,f.dir,f.ph);else wisp(x,sx,f.y-5,t,f.ph)}
 x.font="6px 'Press Start 2P',monospace";for(const c of S.coins){const sx=c.x-cam;if(sx>VW||sx+c.w<0)continue;if(c.got){x.globalAlpha=1-c.got/0.4;x.fillStyle='#fff';x.fillText(c.text,sx,c.y-c.got*50);x.globalAlpha=1;continue}const bob=Math.sin(t*6+c.x*0.05)*2;x.fillStyle='rgba(20,10,40,.6)';rr(x,sx-4,c.y-8+bob,c.w+8,11,3);x.fill();x.strokeStyle='rgba(154,240,255,.7)';x.lineWidth=1;x.stroke();x.fillStyle=Math.floor(t/(BEAT/2))%2?'#ffd23f':'#fff2a0';x.fillText(c.text,sx,c.y+bob)}
 const p=S.pl;if(!(p.stun>0&&Math.floor(t*24)%2)){x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(p.x-cam,p.y+1,7,2,0,0,7);x.fill();hero(x,p.x-cam,p.y+(p.sq>0?1.5:0),t,p.ground,p.sq,p.vy)}
 for(const q of S.pops){x.globalAlpha=Math.min(1,q.l*2);x.fillStyle=q.c;x.fillRect(q.x-cam,q.y,2,2)}x.globalAlpha=1;
 x.fillStyle='#120c20';for(let i=-1;i<VW/12+1;i++){const gx=i*12-((cam*1.2)%12);x.beginPath();x.moveTo(gx,VH+2);x.lineTo(gx+3,VH-8-hash(i)*6);x.lineTo(gx+6,VH+2);x.fill()}
 x.restore();
 x.font="9px 'Press Start 2P',monospace";x.lineWidth=3;x.strokeStyle='#1a0f3a';x.fillStyle='#fff';x.strokeText('SCORE '+S.score,10,40);x.fillText('SCORE '+S.score,10,40);x.fillStyle='#ffd23f';x.strokeText('WORDS '+S.coinsGot,VW*SC-124,40);x.fillText('WORDS '+S.coinsGot,VW*SC-124,40);x.fillStyle='#e070ff';x.strokeText('STOMPS '+S.stomps,10,56);x.fillText('STOMPS '+S.stomps,10,56);
 if(S.line.length){x.textAlign='center';x.fillStyle='#fff2a0';x.strokeText(S.line.join(' '),VW*SC/2,70);x.fillText(S.line.join(' '),VW*SC/2,70);x.textAlign='left'}}
return{init,onLine,update,draw}})();
