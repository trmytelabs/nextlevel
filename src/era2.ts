import {ERAS,TRANS,BAR,BEAT,rngf,hash,clamp,lerp,blip,hat,noise,pix} from './core';

// ---------- ERA 2: 16-bit platformer. Autorun, stomp the walkers, dodge the flyers, collect the words ----------
export const E2=(()=>{
const LW=320,LH=180,B=16,SPEED=50/BEAT,PX=80,G=900,JV=-380;const start=ERAS[1].start,end=ERAS[2].start;
const PAL={K:'#2a1a2e',R:'#e8402c',r:'#a82418',S:'#f6c89a',s:'#d49a6a',B:'#2f5fd6',b:'#1d3f98',W:'#ffffff',Y:'#ffd23f',N:'#7a4a1e',P:'#9a4ad8',p:'#6a2aa8',C:'#58b8ff',c:'#2a78c8',G:'#6ad24a',g:'#3a9a2a'};
// runner: 16 x 24, three run frames and a jump frame
const TOP=['.....KKKKKK.....','....KRRRRRRK....','...KRRRRRRRRK...','...KRrRRRRRRK...','...KSSSKSSSK....','..KSSSSSSSSSK...','..KSSWKSSSSSK...','..KSSSSSSSSSK...','...KSsSSSSsK....','....KSSSSSK.....','...KRRRRRRRK....','..KRRRRRRRRRK...','..KRRRYRRRRRK...','..KBBBBBBBBBK...','..K.KBBBBBK.K...','....KBBBBBK.....'];
const LEGS=[['....KBBKBBK.....','....KBBKBBK.....','....KBBK.BBK....','...KNNK..KNNK...','..KNNNK..KNNNK..','..KKKK....KKKK..','................','................'],
 ['....KBBBBBK.....','...KBBKKBBK.....','..KBBK..KBBK....','.KNNK....KNNK...','KNNNK....KNNNK..','KKKK......KKKK..','................','................'],
 ['....KBBKBBK.....','.....KBBBBK.....','.....KBBBBK.....','....KNNNNNK.....','...KNNNNNNNK....','...KKKKKKKKK....','................','................'],
 ['....KBBKBBK.....','...KBBK.KBBK....','..KBBK...KBBK...','..KNNK...KNNK...','.KNNNK...KNNNK..','.KKKK.....KKKK..','................','................']];
const RUN=LEGS.map(l=>TOP.concat(l));
const WALK=[['....KKKKKKKK....','..KKPPPPPPPPKK..','.KPPPPPPPPPPPPK.','.KPPKPPPPPPKPPK.','KPPPKKPPPPKKPPPK','KPPWWKPPPPKWWPPK','KPPWKKPPPPKKWPPK','KPPPPPPPPPPPPPPK','.KPPPKKKKKKPPPK.','.KKPPPPPPPPPPKK.','...KKKKKKKKKK...','....KNNK.KNNK...','...KNNNK.KNNNK..','...KKKK...KKKK..'],
 ['....KKKKKKKK....','..KKPPPPPPPPKK..','.KPPPPPPPPPPPPK.','.KPPKPPPPPPKPPK.','KPPPKKPPPPKKPPPK','KPPWWKPPPPKWWPPK','KPPWKKPPPPKKWPPK','KPPPPPPPPPPPPPPK','.KPPPKKKKKKPPPK.','.KKPPPPPPPPPPKK.','...KKKKKKKKKK...','.....KNNKNNK....','....KNNNKNNNK...','....KKKK.KKKK...']];
const SQUASH=['..KKKKKKKKKKKK..','.KPPPPPPPPPPPPK.','KPPWKPPPPPPKWPPK','KPPPPPPPPPPPPPPK','.KKKKKKKKKKKKKK.'];
const FLY=[['KK............KK','KCCK........KCCK','.KCCCK....KCCCK.','..KCCCKKKKCCCK..','...KCCcccCCCK...','....KcWccWcK....','.....KcccccK....','......KKKKK.....'],
 ['................','................','.....KKKKKK.....','...KKCCCCCCKK...','.KCCCCcccCCCCCK.','KCCK.KcWccWcK.KCCK'.slice(0,16),'KK...KcccccK...K','......KKKKK.....']];
let S:any;
function gen(to){while(S.genX<to){const r=S.rng;
 if(S.plats.length===0){S.plats.push({x:-200,y:LH-48,w:200+PX+B*10,f:0,kind:'ground'});S.genX=S.plats[0].x+S.plats[0].w;S.lastTop=LH-48;continue}
 const idx=S.plats.filter(q=>q.kind==='ground'||q.kind==='grass').length;const roll=r();let top=LH-48,w=(6+Math.floor(r()*8))*B,gap=0;
 if(idx>2&&roll<0.13)gap=(2+Math.floor(r()*2))*B;                       // a pit, two or three tiles
 else if(idx>2&&roll<0.22){top=LH-80;w=(3+Math.floor(r()*3))*B}        // a raised grass step
 const x=S.genX+gap,kind=top>=LH-48?'ground':'grass';S.plats.push({x,y:top,w,f:0,kind});
 if(kind==='ground'&&w>=8*B&&r()<0.25){const px=x+B*2+Math.floor(r()*((w-4*B)/B))*B;const ph=(1+Math.floor(r()*2))*B;S.plats.push({x:px,y:top-ph,w:2*B,f:0,kind:'pipe',h:ph})}
 // brick row: 3-6 single tiles, four tiles above the ground; words are put into them as the lines arrive
 if(kind==='ground'&&w>=5*B&&idx>1&&r()<0.8){const n=3+Math.floor(r()*4);const bx=x+B*(1+Math.floor(r()*Math.max(1,w/B-n-1)));for(let i=0;i<n;i++)S.plats.push({x:bx+i*B,y:top-56,w:B,h:B,f:0,kind:'brick',word:null,used:false})}
 if(w>=5*B&&r()<0.38&&idx>2)S.foes.push({t:'walk',x:x+B,y:top,x0:x+4,x1:x+w-20,dir:1,alive:true,sq:0});
 if(r()<0.16&&idx>3)S.foes.push({t:'fly',x:x+w/2,y:top-100-r()*20,base:top-100-r()*20,ph:r()*6,alive:true,sq:0});
 S.genX=x+w;S.lastTop=top}
 S.plats=S.plats.filter(p=>p.x+p.w>S.camX-400);S.foes=S.foes.filter(f=>f.x>S.camX-120)}
const under=(x)=>S.plats.filter(q=>q.kind!=='brick'&&x+2>=q.x&&x-2<=q.x+q.w);
// landing oracle for the autopilot: runs the exact movement rules of update() at 60 Hz from (x,y,vy,ground) at speed sp; true if the runner lands (or stays) on a platform within n frames
function safe(x,y,vy,g,sp,n=80){const dt=1/60;for(let i=0;i<n;i++){x+=sp*dt;const u=under(x);if(g&&!u.find(q=>Math.abs(q.y-y)<1))g=false;if(g)continue;const oy=y;vy+=G*dt;y+=vy*dt;if(vy>0)for(const q of u)if(oy<=q.y+0.01&&y>=q.y)return true;if(y>LH-14)return false}return g}
function init(t){S={rng:rngf(21),plats:[],coins:[],foes:[],line:[],genX:0,lastTop:LH-48,score:0,coinsGot:0,coinsAll:0,stomps:0,deaths:0,camX:Math.max(0,t-(start-TRANS))*SPEED,pops:[],shake:0,steer:1};gen(S.camX+LW+64);
 let px=S.camX+PX;const p=S.plats.filter(q=>q.kind!=='pipe'&&q.kind!=='brick').sort((a,b)=>Math.max(0,a.x-px,px-a.x-a.w)-Math.max(0,b.x-px,px-b.x-b.w))[0];if(px<p.x+8||px>p.x+p.w-24){S.camX=clamp(px,p.x+8,p.x+p.w-24)-PX;px=S.camX+PX}S.pl={x:px,y:p.y,vy:0,ground:true,sq:0,stun:0,face:1,dead:false,deadT:-9,dy:0,deadX:0}}
function onLine(words,t){if(t<start-TRANS||t>=end)return;S.coins=S.coins.filter(c=>c.got);S.line=[];const ahead=S.camX+LW-20,far=ahead+420;gen(far+240);
 // the line's phrases go into blocks inside the next 420 px (what the runner covers while the line is sung), one jump apart
 const taken=(q,sp)=>S.plats.some(o=>o!==q&&o.kind==='brick'&&(o.word||o.used)&&Math.abs(o.x-q.x)<sp);
 const calm=(q)=>!S.plats.some(o=>o.kind==='pipe'&&Math.abs(o.x+B-q.x-8)<60)&&!S.foes.some(f=>f.t==='walk'&&f.alive&&q.x+8>f.x0-24&&q.x+8<f.x1+40);
 const pick=(filt,sp)=>{const out:any[]=[];let last=-1e9;for(const q of S.plats.filter(q=>q.kind==='brick'&&!q.word&&!q.used&&q.x>ahead&&q.x<far&&filt(q)&&!taken(q,sp)).sort((a,b)=>a.x-b.x)){if(q.x-last>=sp){out.push(q);last=q.x}}return out};
 const want=Math.min(4,words.length);let chosen=pick(calm,90);if(chosen.length<want)chosen=pick(()=>true,64);
 for(let x=ahead+60;chosen.length<want&&x<far;x+=96){const g=S.plats.find(q=>q.kind==='ground'&&q.x<=x&&q.x+q.w>=x+B);if(!g||S.plats.some(q=>q.kind==='brick'&&Math.abs(q.x-x)<48)||chosen.some(q=>Math.abs(q.x-x)<64))continue;const nb={x,y:g.y-56,w:B,h:B,f:0,kind:'brick',word:null,used:false};S.plats.push(nb);chosen.push(nb)}
 chosen.sort((a,b)=>a.x-b.x);const n=Math.max(1,Math.min(chosen.length,words.length));
 for(let j=0;j<n;j++){const a=Math.floor(j*words.length/n),bb=Math.floor((j+1)*words.length/n);const q=chosen[j];if(q&&bb>a){q.word=words.slice(a,bb).join(' ');S.coinsAll++}}}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=end)return;const p=S.pl;
 // autopilot steers in the air with the same speed control a player has (hold right = 1.25x, left = 0.8x) to reach a landing
 let mul=inp.right?1.25:inp.left?.8:1;if(auto&&mul===1&&!p.ground&&!p.dead)mul=[1,1.25,.8].find(k=>safe(p.x,p.y,p.vy,false,SPEED*k))||1;S.steer=mul;
 const sp=SPEED*mul;S.camX+=sp*dt;gen(S.camX+LW+64);p.x=S.camX+PX;p.stun=Math.max(0,p.stun-dt);S.shake=Math.max(0,S.shake-dt);
 if(p.dead){p.vy+=G*dt;p.dy+=p.vy*dt;if(t-p.deadT>0.9){const q=S.plats.find(q=>q.kind!=='pipe'&&q.kind!=='brick'&&q.x+q.w>p.x+40&&safe(p.x,q.y-120,0,false,sp));if(q){p.dead=false;p.y=q.y-120;p.vy=0;p.ground=false;p.stun=2.6;for(let i=0;i<12;i++)S.pops.push({x:p.x,y:p.y-8,vx:(hash(t*31+i)-.5)*80,vy:(hash(t*17+i)-.5)*80,l:.5});blip(880,0.08,0.08)}}}
 const u=under(p.x);if(!p.dead&&p.ground&&!u.find(q=>Math.abs(q.y-p.y)<1))p.ground=false;
 let want=false;
 if(auto){const cur=u.filter(q=>Math.abs(q.y-p.y)<1).sort((a,b)=>a.y-b.y)[0];
  if(p.ground&&cur){const jumpOK=safe(p.x,p.y,JV,false,sp);const next=S.plats.find(q=>q.kind!=='pipe'&&q.kind!=='brick'&&q.x>cur.x&&q.x>p.x);const toEdge=cur.x+cur.w-p.x;
   if(toEdge<28&&((next&&next.y<cur.y&&jumpOK)||!safe(p.x,p.y,0,true,sp)))want=true; // at the edge: jump up to a higher platform, or jump when running off would not land; otherwise just run off
   const wbSoon=S.plats.some(q=>q.kind==='brick'&&q.word&&!q.used&&q.x+8-p.x>14&&q.x+8-p.x<90&&q.y<p.y-30); // a word block is coming: stay on the ground for it
   if(jumpOK){if(!wbSoon&&next&&next.y<cur.y&&next.x-p.x<40&&toEdge<48)want=true;
    const pipe=S.plats.find(q=>q.kind==='pipe'&&q.x>p.x&&q.x-p.x<44);if(pipe&&(!wbSoon||pipe.x-p.x<30))want=true;
    const foe=S.foes.find(f=>f.alive&&!f.sq&&f.t==='walk'&&f.x>p.x&&f.x-p.x<46&&Math.abs(f.y-p.y)<20);if(foe&&(!wbSoon||foe.x-p.x<30))want=true;
    const fly=S.foes.find(f=>f.alive&&!f.sq&&f.t==='fly'&&f.x>p.x-8&&f.x-p.x<60&&f.y>p.y-80&&f.y<p.y+10);
    if(!want&&!fly&&S.plats.some(q=>q.kind==='brick'&&q.word&&!q.used&&q.x+8-p.x>-4&&q.x+8-p.x<14*mul&&q.y<p.y-30))want=true}}}
 else if(inp.jump)want=true;
 if(!p.dead&&want&&p.ground){p.vy=JV;p.ground=false;blip(660,0.08)}
 if(!p.dead&&!p.ground){const oy=p.y;p.vy+=G*dt;p.y+=p.vy*dt;if(p.vy>0)for(const q of u){if(oy<=q.y+0.01&&p.y>=q.y){p.y=q.y;p.vy=0;p.ground=true;q.f=0.25;p.sq=0.15;hat(false);break}}
  else{for(const q of S.plats){if(q.kind!=='brick'||(q.used&&!q.word))continue;const bottom=q.y+(q.h||16);if(p.x+6>q.x&&p.x-6<q.x+q.w&&oy-24>=bottom-7&&p.y-24<bottom){p.y=bottom+24;p.vy=90;q.f=0.3;
    if(q.word){S.coins.push({x:q.x,y:q.y-6,w:q.word.length*6,text:q.word,got:0.001});S.coinsGot++;S.score+=10;S.line.push(q.word);q.word=null;q.used=true;blip(1320,0.06);blip(1760,0.08,0.08)}
    else{q.broken=true;S.score+=5;for(let i=0;i<6;i++)S.pops.push({x:q.x+8,y:q.y+8,vx:(hash(t*7+i)-.5)*120,vy:-60-hash(t*11+i)*120,l:.6});noise(0.08,0.25,900);blip(220,0.06,0.1)}break}}
   S.plats=S.plats.filter(q=>!q.broken)}}
 if(!p.dead&&p.y>LH-14){p.dead=true;S.deaths++;p.deadT=t;p.dy=LH-14;p.vy=-330;p.deadX=p.x-S.camX;p.ground=false;S.score=Math.max(0,S.score-50);S.shake=0.3;noise(0.12,0.3,700);blip(196,0.35,0.15)}
 // enemies
 for(const f of S.foes){if(!f.alive)continue;if(f.sq){f.sq+=dt;if(f.sq>0.4)f.alive=false;continue}
  if(f.t==='walk'){f.x+=f.dir*22*dt;if(f.x<f.x0){f.x=f.x0;f.dir=1}if(f.x>f.x1){f.x=f.x1;f.dir=-1}}else{f.y=f.base+Math.sin(t*2.2+f.ph)*18;f.x-=10*dt}
  const fw=16,fh=f.t==='walk'?14:8,fx=f.x,fy=f.y-fh;
  if(!p.dead&&p.x+6>fx&&p.x-6<fx+fw&&p.y>fy&&p.y-22<fy+fh){
   if(p.vy>80&&p.y-fy<10){f.sq=0.001;S.score+=200;S.stomps++;p.vy=auto?([-230,-330,-160].find(v=>safe(p.x,p.y,v,false,sp))||-230):inp.jump?-330:-230;p.ground=false;/* SMW: hold jump on a stomp for a higher bounce; autopilot picks the bounce that lands */noise(0.06,0.3,1500);blip(330,0.08,0.12);for(let i=0;i<8;i++)S.pops.push({x:fx+8,y:fy+6,vx:(hash(t*13+i)-.5)*90,vy:-hash(t*29+i)*80,l:.5})}
   else if(p.stun<=0){p.stun=2.0;S.score=Math.max(0,S.score-50);S.shake=0.3;p.vy=-160;p.ground=false;blip(110,0.25,0.15)}}}
 for(const c of S.coins){if(!p.dead&&!c.got&&p.x>c.x-6&&p.x<c.x+c.w+6&&p.y>c.y-8&&p.y-24<c.y+2){c.got=0.001;S.coinsGot++;S.score+=10;S.line.push(c.text);blip(1320,0.06)}if(c.got)c.got+=dt}
 S.coins=S.coins.filter(c=>c.x+c.w>S.camX-50&&c.got<0.4);for(const q of S.plats)q.f=Math.max(0,q.f-dt);p.sq=Math.max(0,p.sq-dt);
 for(const q of S.pops){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=300*dt;q.l-=dt}S.pops=S.pops.filter(q=>q.l>0)}
// ---------------- drawing ----------------
function cloud(x,cx,cy,s){x.fillStyle='#ffffff';x.beginPath();x.arc(cx,cy,8*s,0,7);x.arc(cx+9*s,cy-3*s,10*s,0,7);x.arc(cx+20*s,cy,8*s,0,7);x.arc(cx+10*s,cy+4*s,9*s,0,7);x.fill();x.fillStyle='#cfe8ff';x.fillRect(cx-6*s,cy+6*s,32*s,2*s);x.strokeStyle='#5aa0e0';x.lineWidth=1;x.beginPath();x.arc(cx,cy,8*s,Math.PI*0.5,Math.PI*1.5);x.stroke()}
function hill(x,cx,base,w,h,col,hi){x.fillStyle=col;x.beginPath();x.moveTo(cx-w,base);x.quadraticCurveTo(cx,base-h*2,cx+w,base);x.fill();x.fillStyle=hi;x.beginPath();x.moveTo(cx-w*0.55,base);x.quadraticCurveTo(cx-w*0.2,base-h*1.5,cx+w*0.1,base-h*0.6);x.lineTo(cx+w*0.1,base);x.fill();x.strokeStyle='#1c6a2c';x.beginPath();x.moveTo(cx-w,base);x.quadraticCurveTo(cx,base-h*2,cx+w,base);x.stroke()}
function tileGround(x,sx,sy,w,h,seed){x.fillStyle='#8c5a2b';x.fillRect(sx,sy,w,h);for(let i=0;i<w*h/40;i++){const px=sx+Math.floor(hash(seed+i*3.1)*w),py=sy+6+Math.floor(hash(seed+i*7.7)*Math.max(1,h-8));x.fillStyle=hash(seed+i)>0.5?'#6e4420':'#a86f3a';x.fillRect(px,py,2,1)}
 x.fillStyle='#3f9a2e';x.fillRect(sx,sy,w,5);x.fillStyle='#7ee05a';x.fillRect(sx,sy,w,2);x.fillStyle='#2f7a22';x.fillRect(sx,sy+5,w,1);for(let gx=sx+3;gx<sx+w;gx+=7){x.fillStyle='#7ee05a';x.fillRect(gx,sy-2,1,2);x.fillRect(gx+2,sy-1,1,1)}
 x.fillStyle='#4a2a12';x.fillRect(sx,sy+h-1,w,1);x.fillRect(sx,sy,1,h);x.fillRect(sx+w-1,sy,1,h)}
function tileBrick(x,sx,sy,w,h){x.fillStyle='#c8642c';x.fillRect(sx,sy,w,h);x.fillStyle='#e8905a';for(let r=0;r<h;r+=8){const off=(r/8)%2?8:0;for(let c=off;c<w;c+=16)x.fillRect(sx+c+1,sy+r+1,14,3)}x.fillStyle='#7a3a16';for(let r=0;r<=h;r+=8)x.fillRect(sx,sy+r,w,1);for(let r=0;r<h;r+=8){const off=(r/8)%2?8:0;for(let c=off;c<=w;c+=16)x.fillRect(sx+c,sy+r,1,8)}x.fillStyle='#4a2a12';x.fillRect(sx,sy,w,1);x.fillRect(sx,sy+h-1,w,1)}
function tileGrass(x,sx,sy,w,h){x.fillStyle='#5ab446';x.fillRect(sx,sy,w,h);x.fillStyle='#9af07a';x.fillRect(sx+1,sy+1,w-2,2);x.fillStyle='#2f7a22';x.fillRect(sx,sy+h-2,w,2);x.fillStyle='#8adc66';for(let c=4;c<w;c+=12)x.fillRect(sx+c,sy+5,4,1);x.fillStyle='#1c6a2c';x.fillRect(sx,sy,w,1);x.fillRect(sx,sy,1,h);x.fillRect(sx+w-1,sy,1,h)}
function pipe(x,sx,sy,h){x.fillStyle='#2fa63a';x.fillRect(sx+2,sy+6,28,h-6);x.fillStyle='#7ee05a';x.fillRect(sx+6,sy+6,4,h-6);x.fillStyle='#1c6a2c';x.fillRect(sx+22,sy+6,6,h-6);x.fillRect(sx+2,sy+6,1,h-6);x.fillRect(sx+29,sy+6,1,h-6);x.fillStyle='#2fa63a';x.fillRect(sx,sy,32,7);x.fillStyle='#7ee05a';x.fillRect(sx+4,sy+1,5,5);x.fillStyle='#1c6a2c';x.fillRect(sx+24,sy+1,7,5);x.strokeStyle='#124a1c';x.lineWidth=1;x.strokeRect(sx+0.5,sy+0.5,31,6)}
function arm(x,px,py,swing,back){const dir=back?-swing:swing;for(let k=0;k<3;k++){const ax=px+Math.round(dir*k*1.2),ay=py+k*2;x.fillStyle=PAL.K;x.fillRect(ax-1,ay-1,4,4);x.fillStyle=k<2?PAL.R:PAL.S;x.fillRect(ax,ay,2,2)}}
function draw(x,t){const cam=S.camX,pulse=1-((t/BEAT)%1);x.save();if(S.shake>0)x.translate(Math.round((hash(t*60)-.5)*4),Math.round((hash(t*61)-.5)*4));
 const sg=x.createLinearGradient(0,0,0,LH);sg.addColorStop(0,'#2a66e8');sg.addColorStop(0.55,'#5fb0ff');sg.addColorStop(1,'#bfe8ff');x.fillStyle=sg;x.fillRect(-4,-4,LW+8,LH+8);
 for(let i=-1;i<6;i++){const cx=i*96-((cam*0.12)%96)+hash(i+Math.floor(cam*0.12/96))*30;cloud(x,cx,24+hash(i*5)*30,1+hash(i*3)*0.5)}
 for(let i=-1;i<5;i++){const base=LH-20;const cx=i*140-((cam*0.25)%140);hill(x,cx,base,70,24,'#3fa84a','#6ad24a')}
 for(let i=-1;i<7;i++){const base=LH-20;const cx=i*70-((cam*0.4)%70)+20;hill(x,cx,base,26,12,'#2f9a3c','#5ac448')}
 x.fillStyle='#8c5a2b';x.fillRect(-4,LH-20,LW+8,24);tileGround(x,-4,LH-20,LW+8,24,999);
 for(const q of S.plats){const sx=Math.round(q.x-cam);if(sx>LW||sx+q.w<0)continue;const h=q.kind==='pipe'?q.h:LH-q.y;
  if(q.kind==='ground')tileGround(x,sx,q.y,q.w,h+4,q.x);else if(q.kind==='brick'){if(q.word){x.fillStyle='#f0b020';x.fillRect(sx,q.y,16,16);x.fillStyle='#8a5a10';x.fillRect(sx,q.y,16,1);x.fillRect(sx,q.y+15,16,1);x.fillRect(sx,q.y,1,16);x.fillRect(sx+15,q.y,1,16);x.fillStyle='#fff6c0';x.font="8px 'Press Start 2P',monospace";x.fillText('?',sx+4,q.y+12)}else if(q.used){x.fillStyle='#8a5a30';x.fillRect(sx,q.y,16,16);x.fillStyle='#5a3a18';x.fillRect(sx,q.y,16,1);x.fillRect(sx,q.y+15,16,1);x.fillRect(sx,q.y,1,16);x.fillRect(sx+15,q.y,1,16)}else tileBrick(x,sx,q.y,q.w,q.h||Math.min(h,32))}else if(q.kind==='grass')tileGrass(x,sx,q.y,q.w,Math.min(h,20));else pipe(x,sx,q.y,h);
  if(q.f>0){x.fillStyle=`rgba(255,255,255,${q.f*2})`;x.fillRect(sx,q.y,q.w,3)}}
 for(const f of S.foes){if(!f.alive)continue;const sx=Math.round(f.x-cam);if(sx<-20||sx>LW+20)continue;if(f.sq){pix(x,SQUASH,sx,Math.round(f.y-5),PAL);continue}
  if(f.t==='walk')pix(x,WALK[Math.floor(t/(BEAT/2))%2],sx,Math.round(f.y-14),PAL,1,f.dir<0);else pix(x,FLY[Math.floor(t*6)%2],sx,Math.round(f.y-8),PAL)}
 x.font="6px 'Press Start 2P',monospace";for(const c of S.coins){const sx=Math.round(c.x-cam);if(sx>LW||sx+c.w<0)continue;if(c.got){x.globalAlpha=1-c.got/0.4;x.fillStyle='#fff';x.fillText(c.text,sx,c.y-c.got*50);x.globalAlpha=1;continue}const bob=Math.sin(t*6+c.x*0.05)*2;x.fillStyle='rgba(60,30,10,.55)';x.fillRect(sx-3,c.y-8+bob,c.w+6,11);x.fillStyle=Math.floor(t/(BEAT/2))%2?'#ffd23f':'#fff2a0';x.fillText(c.text,sx,c.y+bob)}
 const p=S.pl;if(p.dead){if(p.dy<LH+40){x.save();x.translate(Math.round(p.deadX),Math.round(p.dy-12));x.rotate(Math.PI);pix(x,RUN[3],-8,-12,PAL);x.restore()}}else if(!(p.stun>0&&Math.floor(t*24)%2)){const ph=t/(BEAT/3);const frame=!p.ground?3:Math.floor(ph)%3;const sx=Math.round(p.x-cam-8),sy=Math.round(p.y-24+(p.sq>0?2:0));x.fillStyle='rgba(0,0,0,.25)';x.fillRect(Math.round(p.x-cam-6),Math.round(p.y)-1,12,2);const swing=p.ground?Math.sin(ph*Math.PI*2/3):-1.2;arm(x,sx+1,sy+11,swing*2,true);pix(x,RUN[frame],sx,sy,PAL);arm(x,sx+12,sy+11,swing*2,false)}
 for(const q of S.pops){x.globalAlpha=Math.min(1,q.l*2);x.fillStyle='#e0b0ff';x.fillRect(q.x-cam,q.y,2,2)}x.globalAlpha=1;
 x.restore();
 x.font="6px 'Press Start 2P',monospace";x.fillStyle='#fff';x.strokeStyle='#1c3a6a';x.lineWidth=2;x.strokeText('SCORE '+S.score,6,26);x.fillText('SCORE '+S.score,6,26);x.fillStyle='#ffd23f';x.strokeText('WORDS '+S.coinsGot,LW-76,26);x.fillText('WORDS '+S.coinsGot,LW-76,26);x.fillStyle='#e0b0ff';x.strokeText('STOMPS '+S.stomps,6,36);x.fillText('STOMPS '+S.stomps,6,36);
 if(S.line.length){x.textAlign='center';x.fillStyle='#fff2a0';x.strokeText(S.line.join(' '),LW/2,46);x.fillText(S.line.join(' '),LW/2,46);x.textAlign='left'}}
return{init,onLine,update,draw,DUDE:RUN,PAL,get S(){return S}}})();
