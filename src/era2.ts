import {ERAS,TRANS,BEAT,rngf,hash,clamp,blip,hat,noise} from './core';

// ---------- ERA 2: 16-bit platformer. Free movement (SMW-style walk / run / skid / variable jump); "?" blocks pop the lyric ----------
export const E2=(()=>{
const LW=320,LH=180,B=16,SPEED=50/BEAT,PX=80;const start=ERAS[1].start,end=ERAS[2].start,T0=start-TRANS;
// Physics runs in fixed 60 Hz ticks (px, s) so the autopilot's simulator is frame-exact. SMW-like: walk speed, a run meter that
// fills after ~0.5 s at walk speed (then run speed), a skid when turning at speed, variable jump (lower gravity while the button
// is held and rising; letting go cuts the rise), a jump buffer and coyote frames.
const DT=1/60,WALK=96,RUN=156,ACC=420,RACC=170,FRIC=330,SKID=720,AACC=300,PMAX=0.5,G=900,GH=640,JV=320,JVK=0.1,CUT=170,MAXF=400,HW=5,PH=24,DIE=LH-14,COY=5,BUF=6,BUMPV=40;
const PAL:any={K:'#2a1a2e',R:'#e8402c',r:'#a82418',h:'#ff8a66',S:'#f6c89a',s:'#d49a6a',H:'#6a3a1a',B:'#2f5fd6',b:'#1d3f98',l:'#6a9cff',W:'#ffffff',Y:'#ffd23f',N:'#7a4a1e',n:'#4a2a10',
 P:'#9a4ad8',p:'#6a2aa8',q:'#c88af0',C:'#58b8ff',c:'#2a78c8',e:'#b8e8ff',T:'#f0c890',t:'#c09060',G:'#6ad24a',g:'#3a9a2a',O:'#ff9a2a'};
let S:any;

// ---------------- sprites: silhouettes get an automatic outline, a shade on the lower-right edge and a highlight on top ----------------
const SHADE:any={R:'r',S:'s',B:'b',N:'n',P:'p',C:'c',T:'t'},HILITE:any={R:'h',B:'l',P:'q',C:'e'};
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function build(rows:string[],flip=false){const h=rows.length,w=rows[0].length,c=mkc(w+2,h+2),x=c.getContext('2d')!;
 const at=(r,k)=>r<0||r>=h||k<0||k>=w?'.':rows[r][flip?w-1-k:k];
 for(let r=-1;r<=h;r++)for(let k=-1;k<=w;k++){let ch=at(r,k);
  if(ch==='.'){if(at(r-1,k)!=='.'||at(r+1,k)!=='.'||at(r,k-1)!=='.'||at(r,k+1)!=='.'){x.fillStyle=PAL.K;x.fillRect(k+1,r+1,1,1)}continue}
  if(SHADE[ch]&&(at(r,k+1)==='.'||at(r+1,k)==='.'))ch=SHADE[ch];else if(HILITE[ch]&&at(r-1,k)==='.')ch=HILITE[ch];
  x.fillStyle=PAL[ch];x.fillRect(k+1,r+1,1,1)}
 return c}
const swapDepth=(rows:string[])=>rows.map(r=>r.replace(/[bBnN]/g,c=>(({b:'B',B:'b',n:'N',N:'n'}) as any)[c]));
const dark=(rows:string[])=>rows.map(r=>r.replace(/R/g,'r').replace(/S/g,'s'));
// the runner: head (10 rows) + torso (6) + legs (8, last one empty for the outline) = 16 x 24, facing right
const HEAD=['.....RRRRR......','...RRRRRRRRR....','..RRRRRRRRRRR...','..RRRRRRRRRRRRR.','..HHHSSSSWKS....','.HHsSSSSSWKSS...','.HHsSSSSSSSSSSS.','..HSSSSSSSSSSS..','...SSSSSSSKKS...','....SSSSSSSS....'];
const HEAD_BL=HEAD.map((r,i)=>i===4?r.slice(0,9)+'SS'+r.slice(11):i===5?r.slice(0,9)+'KK'+r.slice(11):r);
const HEAD_OW=HEAD.map((r,i)=>i===4?r.slice(0,9)+'KS'+r.slice(11):i===5?r.slice(0,9)+'SK'+r.slice(11):i===8?'...SSSSSSKKKS...':r);
const TORSO=['.....RRRRRR.....','....RRBRRBRR....','....RRBRRBRR....','....BBBBBBBB....','....BBYBBYBB....','....BBBBBBBB....'];
const E8='................';
const L_STAND=['....BBBBBBBB....','.....BBBBBB.....','.....bbbBBB.....','.....bbbBBB.....','.....bbbBBB.....','....nnnNNNNN....','....nnnNNNNNN...',E8];
const L_W1=['....BBBBBBBB....','....BBBBBBBBB...','...bbbb..BBBB...','..bbb.....BBB...','.bbb......BBB...','nnn.......NNNN..','nn........NNNNN.',E8];
const L_W2=['....BBBBBBBB....','....bbBBBBBB....','...bbb.BBBB.....','..nnn..BBBB.....','..nn...BBB......','......NNNNN.....','......NNNNNN....',E8];
const L_R1=['....BBBBBBBB....','...bbBBBBBBBBB..','..bbb.....BBBB..','.bbb.......BBBB.','nnn.........NNNN','nn..........NNN.',E8,E8];
const L_R2=['....BBBBBBBB....','....bbbBBBBBB...','...bbb..BBBBB...','..nnnb...BBB....','..nnn...NNNN....','........NNNNN...',E8,E8];
const L_JUMP=['....BBBBBBBB....','...bbbBBBBBBBB..','..bbb...BBBBBB..','.bbb.....BBNNNN.','.nnn......NNNN..','nnn.............',E8,E8];
const L_FALL=['....BBBBBBBB....','....BBBBBBBB....','...bbbb.BBBB....','..bbb....BBB....','..nnn....NNNN...','.nnn......NNNN..',E8,E8];
const L_SKID=['....BBBBBBBB....','....BBBBBBBBB...','....bbb..BBBBB..','...bbb.....BBBB.','..nnnn......BBB.','..nnnnn....NNNNN',E8,E8];
const A_DOWN=['RR','RR','RR','SS','SS'],A_FWD=['RR...','.RR..','..RRS','...SS'],A_BACK=['...RR','..RR.','SRR..','SS...'],A_UP=['...SS','..RSS','.RR..','RR...'],A_OUT=['RRRSS','RRRSS'],A_OUTB=['SSRRR','SSRRR'];
const body=(head,legs,lean=0,torso=TORSO)=>{const sh=r=>lean>0?'.'+r.slice(0,15):lean<0?r.slice(1)+'.':r;return head.map(sh).concat(torso.map(sh),legs)};
const OX=3,OY=2,FW=22,FH=28;
// a frame = [facing right, facing left]; arms are separate outlined parts (the back arm darker, behind the body)
function frame(rows:string[],front?:any[],back?:any[]){return [0,1].map(fl=>{const c=mkc(FW,FH),x=c.getContext('2d')!;
 const put=(pat,dx,dy)=>{const w=pat[0].length;x.drawImage(build(pat,!!fl),OX-1+(fl?16-dx-w:dx),OY-1+dy)};
 if(back)put(dark(back[0]),back[1],back[2]);put(rows,0,0);if(front)put(front[0],front[1],front[2]);return c})}
const DEATH=['.....RRRRRR.....','...RRRRRRRRRR...','..RRRRRRRRRRRR..','..RRRRRRRRRRRR..','SSRRRRRRRRRRRRSS','SSHSSSSSSSSSSHSS','.RHSWKSSSSKWSHR.','.RSSWKSSSSKWSSR.','.RRSSSSSSSSSSRR.','..RSSSKKKKSSSR..','..RRSSSKKSSSRR..','...RRRRRRRRRR...','...RRBRRRRBRR...','....BBBBBBBB....','....BYBBBBYB....','....BBBBBBBB....','....BBBBBBBB....','....BBB..BBB....','....BBB..BBB....','....BBB..BBB....','...NNNN..NNNN...','..NNNNN..NNNNN..',E8,E8];
// walker (a caterpillar: green segments, yellow spots, red-tipped antennae), 16 x 15, faces right, three crawl frames
// where the hump travels along the body and the legs ripple, plus a squash; flyer (a blue moth), 16 x 8, three wing beats
const CAT_HEAD=['...........R..R.','............g.g.','...........GGGG.','..........GGGGGG'];
const CAT_TAIL=['GGGGGGGGGGGGGGKG','GGGGGGGGGGGGGGG.','gGGGGGGGGGGGGGG.','.gggggggggggggg.'];
const WK=[
 [E8,E8,E8,...CAT_HEAD,'.GG....GG.GGGWWG','GGGG..GGGGGGGWKG','GYGG..GYGGGGGGGG',...CAT_TAIL,'.n.n.n.n.n.n.n..'],
 [E8,E8,E8,...CAT_HEAD,'....GGG...GGGWWG','...GGGGG..GGGWKG','GG.GGYGG.GGGGGGG',...CAT_TAIL,'n.n.n.n.n.n.n.n.'],
 [E8,E8,E8,...CAT_HEAD,'.GG....GG.GGGWWG','GGGG..GGGGGGGWKG','GYGG..GYGGGGGGGG',...CAT_TAIL,'.n..n..n..n..n..']];
const WK_SQ=[E8,E8,'..........GGGG..','.GGGGGGGGGGGKKG.','GYGGYGGYGGGGGGGG','gggggggggggggggg','n.n.n.n.n.n.n.n.'];
const FLY=[['CC............CC','CCC..........CCC','.CCC........CCC.','..CCCC.cc.CCCC..','...CCCccccCCC...','....cWKccKWc....','.....cccccc.....','......OOOO......'],
 [E8,E8,E8,'.CCCCC.cc.CCCCC.','CCCCCCccccCCCCCC','....cWKccKWc....','.....cccccc.....','......OOOO......'],
 [E8,E8,E8,'......cccc......','...CCccccccCC...','.CCCcWKccKWcCCC.','CCC..cccccc..CCC','CC....OOOO....CC']];
let SPR:any=null;
function sprites(){if(SPR)return SPR;const st=body(HEAD,L_STAND);const land=body(HEAD,L_STAND);land.splice(17,1);land.splice(12,1);land.unshift(E8,E8);
 SPR={idle:frame(st,[A_DOWN,8,11]),blink:frame(body(HEAD_BL,L_STAND),[A_DOWN,8,11]),land:frame(land,[A_DOWN,8,13]),
  walk:[frame(body(HEAD,L_W1),[A_FWD,8,11],[A_BACK,3,11]),frame(body(HEAD,L_W2),[A_DOWN,8,11]),frame(body(HEAD,swapDepth(L_W1)),[A_BACK,4,11],[A_FWD,8,11]),frame(body(HEAD,swapDepth(L_W2)),[A_DOWN,7,11])],
  run:[frame(body(HEAD,L_R1,1),[A_OUT,10,11],[A_BACK,3,11]),frame(body(HEAD,L_R2,1),[A_FWD,9,11],[A_FWD,6,12]),frame(body(HEAD,swapDepth(L_R1),1),[A_BACK,4,11],[A_OUT,10,11])],
  jump:frame(body(HEAD,L_JUMP),[A_UP,10,8],[A_BACK,3,11]),fall:frame(body(HEAD,L_FALL),[A_OUT,10,11],[A_OUTB,1,11]),
  skid:frame(body(HEAD,L_SKID,-1),[A_FWD,9,11],[A_FWD,7,12]),bump:frame(body(HEAD_OW,L_FALL),[A_UP,10,8],[A_UP,7,9]),
  death:frame(DEATH)[0],
  wk:WK.map(f=>[build(f),build(f,true)]),wsq:build(WK_SQ),fly:FLY.map(f=>build(f)),flyDead:build(FLY[1].slice().reverse())};
 tiles();return SPR}
// ---------------- tiles (pre-rendered) ----------------
let T:any=null;
function tiles(){T={};const px=(x,c,a,b,w=1,h=1)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
 // dirt: warm brown with darker rounded pebbles and light specks (tiles seamlessly at 16 px)
 for(const [k,base,dk,lt] of [['dirt','#c07a3a','#8e5226','#e0a062'],['dirt2','#b0703a','#7e4a22','#d49a5e']] as any){const c=mkc(16,16),x=c.getContext('2d')!;px(x,base,0,0,16,16);
  if(k==='dirt2')for(let i=-16;i<16;i+=8)for(let r=0;r<16;r++){const cx=((i+r)%16+16)%16;px(x,'#a4652f',cx,r,3,1)}
  for(let i=0;i<5;i++){const a=Math.floor(hash(i*3.7+(k==='dirt'?1:9))*12)+1,b=Math.floor(hash(i*5.3+2)*12)+1;px(x,dk,a,b+1,3,2);px(x,dk,a+1,b,1,1);px(x,lt,a,b,1,1)}
  for(let i=0;i<4;i++)px(x,lt,Math.floor(hash(i*9.1+4)*16),Math.floor(hash(i*2.9+7)*16));T[k]=c}
 // grass cap: dark outline on top, a bright lip, a scalloped lower edge
 {const c=mkc(16,10),x=c.getContext('2d')!;px(x,'#1a4a1a',0,0,16,1);px(x,'#b8f890',0,1,16,1);px(x,'#6ad24a',0,2,16,3);px(x,'#4cb43a',0,5,16,1);
  for(let i=0;i<16;i++){const d=[0,1,1,2,2,1,1,0][i&7];px(x,'#3a9a2a',i,6,1,d);px(x,'#1a4a1a',i,6+d,1,1)}
  for(const i of [3,11])px(x,'#e0ffc8',i,1,2,1);T.grass=c}
 // brick: two courses of offset bricks, each with a light top-left and a dark bottom-right
 {const c=mkc(16,16),x=c.getContext('2d')!;px(x,'#4a2010',0,0,16,16);
  for(let r=0;r<2;r++)for(const bx of r?[-4,4,12]:[0,8]){const by=r*8,x0=Math.max(0,bx),x1=Math.min(16,bx+8),w=x1-x0-(x1===bx+8?1:0);if(w<1)continue;
   px(x,'#c8642c',x0,by+1,w,7);px(x,'#f0a070',x0,by+1,w,1);if(x0===bx)px(x,'#f0a070',x0,by+1,1,7);px(x,'#8a3a14',x0,by+7,w,1);if(x1===bx+8)px(x,'#8a3a14',x0+w-1,by+1,1,7)}
  T.brick=c}
 // used block: flat brown with rivets
 {const c=mkc(16,16),x=c.getContext('2d')!;px(x,'#4a2a10',0,0,16,16);px(x,'#a86a30',1,1,14,14);px(x,'#c8884a',1,1,14,1);px(x,'#c8884a',1,1,1,14);px(x,'#7a4a20',1,14,14,1);px(x,'#7a4a20',14,1,1,14);
  for(const [a,b] of [[3,3],[12,3],[3,12],[12,12]])px(x,'#5a3410',a,b);T.used=c}
 // "?" block: four glyph colours (the SMW colour cycle); the moving glint is drawn live
 const Q=['.XXXX.','XX..XX','....XX','...XX.','..XX..','..XX..','......','..XX..'];
 T.q=['#ffffff','#fff0b0','#ffd860','#fff0b0'].map(gc=>{const c=mkc(16,16),x=c.getContext('2d')!;px(x,'#5a3008',1,0,14,16);px(x,'#5a3008',0,1,16,14);px(x,'#f8b818',1,1,14,14);
  px(x,'#ffe890',1,1,14,1);px(x,'#ffe890',1,1,1,14);px(x,'#c07808',1,14,14,1);px(x,'#c07808',14,1,1,14);for(const [a,b] of [[2,2],[13,2],[2,13],[13,13]])px(x,'#8a5008',a,b);
  for(let r=0;r<8;r++)for(let k=0;k<6;k++)if(Q[r][k]==='X'){px(x,'#8a5008',5+k+1,4+r+1)}
  for(let r=0;r<8;r++)for(let k=0;k<6;k++)if(Q[r][k]==='X')px(x,gc,5+k,4+r);return c});
 // pipe: one body row (stretched) and the rim
 const PC=['#103c18','#2a9a36','#2a9a36','#7ee05a','#7ee05a','#7ee05a','#d0ffc0','#7ee05a','#7ee05a','#3cb444','#3cb444','#3cb444','#3cb444','#3cb444','#3cb444','#3cb444','#3cb444','#2a9a36','#2a9a36','#2a9a36','#2a9a36','#2a9a36','#1c7a2a','#1c7a2a','#1c7a2a','#1c7a2a','#145a20','#103c18'];
 {const c=mkc(28,1),x=c.getContext('2d')!;PC.forEach((col,i)=>px(x,col,i,0));T.pipe=c}
 {const c=mkc(32,9),x=c.getContext('2d')!;for(let i=0;i<32;i++)px(x,PC[Math.min(27,Math.max(0,Math.round(i*27/31)))],i,0,1,9);px(x,'#103c18',0,0,32,1);px(x,'#103c18',0,8,32,1);px(x,'#103c18',0,0,1,9);px(x,'#103c18',31,0,1,9);px(x,'#e0ffd0',4,1,6,1);px(x,'#1c7a2a',1,7,30,1);T.rim=c}
}

// ---------------- level ----------------
function gen(to){while(S.genX<to){const r=S.rng;
 if(S.plats.length===0){const w=200+PX+B*10;S.plats.push({x:-200,y:LH-48,w,h:88,f:0,kind:'ground'});S.nGround=1;S.genX=-200+w;S.lastTop=LH-48;continue}
 const idx=S.nGround;const roll=r();let top=LH-48,w=(6+Math.floor(r()*8))*B,gap=0;
 if(idx>2&&roll<0.13)gap=(2+Math.floor(r()*2))*B;                       // a pit, two or three tiles
 else if(idx>2&&roll<0.22){top=LH-80;w=(3+Math.floor(r()*3))*B}        // a raised grass step (solid down to the bottom)
 const x=S.genX+gap,kind=top>=LH-48?'ground':'grass';if(kind==='grass')S.plats=S.plats.filter(q=>q.kind!=='brick'||q.word||q.used||q.x+B<x-48);const after=S.lastTop<top?x+48:gap>0?x+40:-1e9;
 S.plats.push({x,y:top,w,h:LH+40-top,f:0,kind});S.nGround++;let pipeX=-1e9;
 if(kind==='ground'&&w>=8*B&&r()<0.25){const px=x+B*2+Math.floor(r()*((w-4*B)/B))*B;const ph=(1+Math.floor(r()*2))*B;S.plats.push({x:px,y:top-ph,w:2*B,h:ph,f:0,kind:'pipe'});pipeX=px}
 // brick row: 3-6 single tiles, floating 56 px over the ground; words are put into them as the lines arrive
 if(kind==='ground'&&w>=5*B&&idx>1&&r()<0.8){const n=3+Math.floor(r()*4);const bx=x+B*(1+Math.floor(r()*Math.max(1,w/B-n-1)));for(let i=0;i<n;i++){const k=bx+i*B;if(k+B>pipeX-40&&k<pipeX+2*B+40||k<after||k+B>x+w-40)continue;S.plats.push({x:k,y:top-56,w:B,h:B,f:0,kind:'brick',word:null,used:false})}}
 if(w>=5*B&&r()<0.38&&idx>2){let x0=x+4,x1=x+w-20;if(pipeX>-1e8){if(pipeX-18-x0>x1-(pipeX+34))x1=pipeX-18;else x0=pipeX+34}
  if(x1-x0>=16)S.foes.push({t:'walk',x:clamp(x+B,x0,x1),y:top,x0,x1,dir:1,alive:true,sq:0})}
 if(r()<0.16&&idx>3)S.foes.push({t:'fly',x:x+w/2,y:top-100-r()*20,base:top-100-r()*20,ph:r()*6,alive:true,sq:0});
 S.genX=x+w;S.lastTop=top}
 S.foes=S.foes.filter(f=>f.alive&&f.x>S.camX-300)}

// ---------------- physics: one fixed tick, shared by the game and the autopilot's simulator ----------------
const EV:any={bump:null,land:false,jump:false};
function phys(b:any,dir:number,jh:boolean,L:any[],n:number){EV.bump=null;EV.land=false;EV.jump=false;
 const sg=Math.sign(b.vx),sp=Math.abs(b.vx);b.skid=false;
 if(dir){b.face=dir;
  if(sg&&sg!==dir){b.vx+=dir*(b.g?SKID:AACC)*DT;if(Math.sign(b.vx)===dir)b.vx=0;b.skid=b.g&&sp>30;if(b.g)b.run=0}
  else{const mx=b.run>=PMAX?RUN:WALK;if(sp<mx)b.vx=dir*Math.min(mx,sp+(b.g?(sp<WALK?ACC:RACC):AACC)*DT);else if(b.g)b.vx=dir*Math.max(mx,sp-FRIC*DT)}}
 else if(b.g)b.vx=sg*Math.max(0,sp-FRIC*DT);
 if(b.g)b.run=dir&&b.vx*dir>=WALK-0.5?Math.min(PMAX,b.run+DT):Math.max(0,b.run-2*DT);
 if(jh&&!b.jhp)b.buf=BUF;b.jhp=jh;
 if(b.buf>0&&jh&&(b.g||b.coy>0)){b.vy=-(JV+Math.abs(b.vx)*JVK);b.g=false;b.coy=0;b.buf=0;b.jmp=true;EV.jump=true}else if(b.buf>0)b.buf--;
 if(b.jmp&&!jh){if(b.vy<-CUT)b.vy=-CUT;b.jmp=false}
 if(b.vy>=0)b.jmp=false;
 b.vy=Math.min(MAXF,b.vy+(b.jmp?GH:G)*DT);
 // horizontal move, then push out of anything solid (pipes, steps, bricks)
 b.x+=b.vx*DT;if(b.x<8){b.x=8;if(b.vx<0)b.vx=0}
 for(let i=0;i<n;i++){const q=L[i];if(b.x+HW>q.x&&b.x-HW<q.x+q.w&&b.y>q.y+0.01&&b.y-PH<q.y+q.h-0.01){if(b.vx>0||(b.vx===0&&b.x<q.x+q.w/2))b.x=q.x-HW;else b.x=q.x+q.w+HW;b.vx=0;b.run=0}}
 // vertical move: land on tops, bump undersides (the brick nearest the head's centre is the one that is hit)
 const oy=b.y,wasG=b.g;b.y+=b.vy*DT;b.g=false;let bd=99;
 for(let i=0;i<n;i++){const q=L[i];if(!(b.x+HW>q.x&&b.x-HW<q.x+q.w&&b.y>q.y&&b.y-PH<q.y+q.h))continue;
  if(oy<=q.y+0.01){b.y=q.y;b.vy=0;b.g=true;b.on=q}
  else if(oy-PH>=q.y+q.h-0.01){b.y=q.y+q.h+PH;if(b.vy<0)b.vy=BUMPV;b.jmp=false;if(q.kind==='brick'){const d=Math.abs(q.x+q.w/2-b.x);if(d<bd){bd=d;EV.bump=q}}}
  else{b.y=q.y;b.vy=0;b.g=true;b.on=q}}
 if(b.g&&!wasG)EV.land=true;
 if(wasG&&!b.g&&!EV.jump)b.coy=COY;else if(!b.g&&b.coy>0)b.coy--}
// a foe touching the body: a stomp from above bounces (hold jump for a higher bounce), anything else hurts unless invulnerable
function contact(b,fx,fy,fh,jh){if(b.x+6>fx&&b.x-6<fx+16&&b.y>fy&&b.y-22<fy+fh){if(b.vy>40&&b.y-fy<10){b.vy=-260;b.jmp=jh;b.g=false;return 1}
 if(b.stun<=0){b.stun=2;b.vy=-160;b.vx=-b.face*90;b.g=false;b.jmp=false;b.run=0;return -1}}return 0}
const LS:any[]=[];let nL=0;
function gather(x0,x1){nL=0;for(const q of S.plats)if(!q.broken&&q.x<x1&&q.x+q.w>x0)LS[nL++]=q}

// ---------------- autopilot: a receding-horizon planner over the exact simulator ----------------
// Candidates: hold a direction on the ground for k frames, then jump (a hop or a full jump) steering in the air; or just walk.
// Each is simulated frame-exactly (foes included) to its landing plus a 20-frame "stop here" check. Score: popping a word
// block dominates, then stomps, then reaching the goal (the target block, or 300 px ahead when there is none); ending up on
// top of a brick row is penalised (a block cannot be popped from above). A chosen jump
// that starts within 8 frames is committed through its landing; anything else is replanned after 6 frames.
const BODY=['x','y','vx','vy','g','run','jmp','coy','buf','jhp','stun','face','skid','on'];
const SB:any={},R:any={pop:-1,st:0,land:-1,x:0,m:1,unsafe:false};const FL:any[]=[],FXs:number[]=[],FDs:number[]=[],FA:boolean[]=[];let nF=0;
function loadFoes(x0,x1){nF=0;for(const f of S.foes)if(f.alive&&!f.sq&&f.x>x0&&f.x<x1)FL[nF++]=f}
function sim(p,c,ft0){for(const k of BODY)SB[k]=p[k];for(let j=0;j<nF;j++){FXs[j]=FL[j].x;FDs[j]=FL[j].dir;FA[j]=true}
 R.pop=-1;R.st=0;R.land=-1;R.unsafe=false;R.x=p.x;R.m=1;R.top=false;
 const air=!SB.g;let M=c.k>=0?c.k+100:air?100:45,post=-1;
 for(let i=0;i<M+20;i++){let dir,jh;
  if(post>=0){dir=0;jh=false}else if(c.k<0){dir=c.d;jh=c.ja}else if(i<c.k){dir=c.d;jh=false}else{dir=c.ad;jh=i<c.k+c.h}
  const ft=ft0+i*DT;SB.stun-=DT;phys(SB,dir,jh,LS,nL);
  if(post<0){if(EV.bump&&EV.bump.word&&R.pop<0)R.pop=i;
   const landed=EV.land&&(c.k>=0?i>c.k:air);if(landed||i===M-1){R.land=landed?i:-1;R.x=SB.x;R.m=i+1;R.top=SB.g&&SB.on&&SB.on.kind==='brick';post=i+1;M=i+1}}
  if(SB.y>DIE){if(post>=0&&i>=post){R.unsafe=true;return true}return false}
  for(let j=0;j<nF;j++){if(!FA[j])continue;const f=FL[j];let fy,fh;
   if(f.t==='walk'){let fx=FXs[j]+FDs[j]*22*DT;if(fx<f.x0){fx=f.x0;FDs[j]=1}if(fx>f.x1){fx=f.x1;FDs[j]=-1}FXs[j]=fx;fh=14;fy=f.y-14}else{FXs[j]-=10*DT;fh=8;fy=f.base+Math.sin(ft*2.2+f.ph)*18-8}
   const r=contact(SB,FXs[j],fy,fh,jh);if(r===1){FA[j]=false;if(post<0||i<post)R.st++}else if(r===-1){if(post>=0&&i>=post){R.unsafe=true;return true}return false}}}
 return true}
const GC:any[]=[],AC:any[]=[];
for(const d of [1,0,-1]){GC.push({d,k:-1,h:0,ad:d,ja:false});for(const k of [0,2,4,7,10,14,20,28])for(const h of [4,40])for(const ad of d?[d,0]:[1,0,-1])GC.push({d,k,h,ad,ja:false})}
for(const ad of [1,0,-1])for(const ja of [true,false])AC.push({d:ad,k:-1,h:0,ad,ja});
const PANIC={d:0,k:0,h:40,ad:0,ja:false};
// aim past a block that is ahead (pop it on the run), back to one just missed
function replan(p,ft){const tg=S.tg,tc=tg?tg.x+8:0,gx=!tg?p.x+300:tc>=p.x-8?tc+200:tc;gather(p.x-160,p.x+380);loadFoes(p.x-140,p.x+440);
 let best:any=null,bs=-1e18,bl=-1;
 for(const c of (p.g?GC:AC)){if(!sim(p,c,ft))continue;let s=-Math.abs(gx-(p.x+(R.x-p.x)/R.m*60));if(R.pop>=0)s+=3000-R.pop*6;s+=R.st*150;if(c.k>=0)s-=12;if(R.unsafe)s-=600;if(R.top)s-=250;if(s>bs){bs=s;best=c;bl=R.land}}
 if(!best){best=p.g?PANIC:AC[1];bl=-1}
 const len=best.k<0?(p.g?6:4):best.k<=8?(bl>0?bl+1:best.k+10):6;
 return{c:best,i:0,len}}
// the word block to go for: the leftmost one in reach (so a missed one up to 170 px behind is gone back for); give up after 8 s
function pickTarget(p){let b:any=null;for(const q of S.plats){if(q.kind!=='brick'||!q.word||q.skip)continue;const c=q.x+8;if(c<p.x-170||c>p.x+440)continue;if(!b||q.x<b.x)b=q}
 if(b!==S.tg){S.tg=b;S.tgT=0}else if(b){S.tgT+=DT;if(S.tgT>8){b.skip=true;S.tg=null}}}
const AI={d:0,j:false};
function pilot(p,ft){pickTarget(p);let pl=S.plan;if(!pl||pl.i>=pl.len)pl=S.plan=replan(p,ft);const c=pl.c,i=pl.i++;
 if(c.k<0){AI.d=c.d;AI.j=c.ja}else if(i<c.k){AI.d=c.d;AI.j=false}else{AI.d=c.ad;AI.j=i<c.k+c.h}return AI}

// ---------------- game state ----------------
function init(t){S={rng:rngf(21),plats:[],coins:[],foes:[],line:[],genX:0,lastTop:LH-48,score:0,coinsGot:0,coinsAll:0,stomps:0,deaths:0,hits:0,camX:0,pops:[],shake:0,nGround:0,
  ft:t,acc:0,plan:null,tg:null,tgT:0,tap:0,dir:0,dist:0,safe:{x:PX,y:LH-48}};
 let px=PX+Math.max(0,t-T0)*SPEED;gen(px+LW+240);
 const q=S.plats.filter(q=>q.kind==='ground'||q.kind==='grass').sort((a,b)=>Math.max(0,a.x-px,px-a.x-a.w)-Math.max(0,b.x-px,px-b.x-b.w))[0];px=clamp(px,q.x+10,q.x+q.w-10);
 for(const o of S.plats)if(o.kind==='pipe'&&px+HW>o.x-2&&px-HW<o.x+o.w+2)px=o.x-HW-4;
 S.pl={x:px,y:q.y,vx:0,vy:0,g:true,run:0,jmp:false,coy:0,buf:0,jhp:false,stun:0,face:1,skid:false,on:q,dead:false,deadT:-9,dy:0,dvy:0,deadX:0,drop:false,dropY:0,landT:0,bumpT:0};
 S.safe={x:px,y:q.y};S.camX=Math.max(0,px-120)}
function onLine(words,t){if(t<T0||t>=end)return;S.line=[];S.plan=null;const px0=S.pl.x;let last=-1e9;for(const q of S.plats)if(q.kind==='brick'&&q.word&&q.x>px0)last=Math.max(last,q.x);
 const ahead=Math.max(S.camX+LW-20,last+70),far=ahead+420;gen(far+240);
 // the line's phrases go into blocks inside the next 420 px past the right edge of the screen (what a runner covers while the
 // line is sung), one jump apart, past any block still waiting. Calm spots first: flat ground from 50 px before the block to
 // 40 px after it, no pipe close by, no walker there on arrival (walkers pace their platform at 22 px/s). Existing ? spots in
 // brick rows first, then new blocks over calm ground, then anything over ground.
 const flat=(c,gy)=>{for(let x=c-50;x<=c+40;x+=6){let ok=false;for(const q of S.plats)if(q.kind==='ground'&&q.y===gy&&x>=q.x&&x<=q.x+q.w){ok=true;break}if(!ok)return false}return true};
 const walkAt=(f,dtA)=>{const L=f.x1-f.x0;if(L<=0)return f.x0;let u=(f.dir>0?f.x-f.x0:2*L-(f.x-f.x0))+22*dtA;u%=2*L;return u<L?f.x0+u:f.x0+2*L-u};
 const calm=(c,gy)=>{if(!flat(c,gy)||S.plats.some(o=>o.kind==='pipe'&&o.x<c+44&&o.x+32>c-60))return false;const dtA=(c-px0)/SPEED;
  return !S.foes.some(f=>f.alive&&f.t==='walk'&&f.y===gy&&walkAt(f,dtA)+16>c-60&&walkAt(f,dtA)<c+40)};
 const ledge=(c)=>S.plats.some(o=>o.kind==='grass'&&o.x<c+56&&o.x+o.w>c-56);
 const firm=(c,gy)=>{for(let x=c-36;x<=c+36;x+=6)if(!S.plats.some(q=>q.kind==='ground'&&q.y===gy&&x>=q.x&&x<=q.x+q.w))return false;return true};
 const cands:any[]=[];
 for(const q of S.plats)if(q.kind==='brick'&&!q.word&&!q.used&&!q.broken&&q.x>ahead&&q.x<far&&!ledge(q.x+8)&&firm(q.x+8,q.y+56))cands.push({q,x:q.x,gy:q.y+56,c:calm(q.x+8,q.y+56)?3:1});
 for(let x=Math.ceil((ahead+40)/B)*B;x<far;x+=B){const g=S.plats.find(q=>q.kind==='ground'&&q.x<=x&&q.x+q.w>=x+B);
  if(!g||ledge(x+8)||!firm(x+8,g.y)||S.plats.some(q=>(q.kind==='brick'&&Math.abs(q.x-x)<48)||(q.kind==='pipe'&&q.x<x+B+24&&q.x+32>x-24)))continue;cands.push({q:null,x,gy:g.y,c:calm(x+8,g.y)?2:0})}
 cands.sort((a,b)=>a.x-b.x);
 const want=Math.min(4,words.length),chosen:any[]=[];
 const room=(x,sp)=>!chosen.some(o=>Math.abs(o.x-x)<sp)&&!S.plats.some(o=>o.kind==='brick'&&o.word&&Math.abs(o.x-x)<sp);
 for(const [minc,sp] of [[3,90],[2,90],[2,64],[1,64],[0,64]])for(const cd of cands)if(chosen.length<want&&cd.c>=minc&&!chosen.includes(cd)&&room(cd.x,sp))chosen.push(cd);
 for(let i=0;i<chosen.length;i++){const cd=chosen[i];if(!cd.q){cd.q={x:cd.x,y:cd.gy-56,w:B,h:B,f:0,kind:'brick',word:null,used:false};S.plats.push(cd.q)}chosen[i]=cd.q}
 chosen.sort((a,b)=>a.x-b.x);const n=Math.max(1,Math.min(chosen.length,words.length));
 for(let j=0;j<n;j++){const a=Math.floor(j*words.length/n),bb=Math.floor((j+1)*words.length/n);const q=chosen[j];if(q&&bb>a){q.word=words.slice(a,bb).join(' ');S.coinsAll++}}}
const puff=(x,y,n,c='#ffffff')=>{for(let i=0;i<n;i++)S.pops.push({x:x+(hash(S.ft*37+i)-.5)*8,y:y-2,vx:(hash(S.ft*31+i)-.5)*40,vy:-10-hash(S.ft*17+i)*30,l:.3,g:40,c})};
function bumpBlock(q){const p=S.pl;q.f=0.3;p.bumpT=0.15;
 if(q.word){S.coins.push({x:q.x+8-q.word.length*3,y:q.y-4,text:q.word,got:0.001});S.coinsGot++;S.score+=10;S.line.push(q.word);q.word=null;q.used=true;blip(1320,0.06);blip(1760,0.08,0.08);
  for(let i=0;i<8;i++)S.pops.push({x:q.x+8,y:q.y,vx:(hash(S.ft*7+i)-.5)*90,vy:-40-hash(S.ft*5+i)*70,l:.5,g:200,c:'#fff2a0'})}
 else if(q.used)blip(150,0.05,0.08);
 else{q.broken=true;S.plats=S.plats.filter(o=>!o.broken);S.score+=5;for(let i=0;i<8;i++)S.pops.push({x:q.x+8,y:q.y+8,vx:(hash(S.ft*7+i)-.5)*120,vy:-60-hash(S.ft*11+i)*120,l:.6,g:300,c:i%2?'#c8642c':'#f0a070',sz:3});noise(0.08,0.25,900);blip(220,0.06,0.1)}}
function die(){const p=S.pl;p.dead=true;S.deaths++;p.deadT=S.ft;p.deadX=p.x-S.camX;p.dy=Math.min(p.y,LH-4);p.dvy=-330;S.plan=null;S.score=Math.max(0,S.score-50);S.shake=0.3;noise(0.12,0.3,700);blip(196,0.35,0.15)}
// drop back in from above at the last safe footing, invulnerable for 2.6 s
function respawn(){const p=S.pl,s=S.safe;p.dead=false;p.drop=true;p.x=s.x;p.dropY=s.y;p.y=s.y-110;p.vx=0;p.vy=0;p.g=false;p.stun=2.6;p.run=0;p.jmp=false;p.buf=0;p.coy=0;p.jhp=true;S.plan=null;
 for(let i=0;i<12;i++)S.pops.push({x:p.x,y:p.y-8,vx:(hash(S.ft*31+i)-.5)*80,vy:(hash(S.ft*17+i)-.5)*80,l:.5,g:0,c:'#e0b0ff'});blip(880,0.08,0.08)}
function cam(){const p=S.pl,sx=p.x-S.camX;if(sx>156)S.camX=p.x-156;else if(sx<104)S.camX=Math.max(0,p.x-104);gen(S.camX+LW+240)}
function foes(ft,p,jh){for(const f of S.foes){if(!f.alive)continue;if(f.sq){f.sq+=DT;if(f.sq>0.45)f.alive=false;continue}
 if(f.t==='walk'){f.x+=f.dir*22*DT;if(f.x<f.x0){f.x=f.x0;f.dir=1}if(f.x>f.x1){f.x=f.x1;f.dir=-1}}else{f.x-=10*DT;f.y=f.base+Math.sin(ft*2.2+f.ph)*18}
 if(!p)continue;const fh=f.t==='walk'?14:8,r=contact(p,f.x,f.y-fh,fh,jh);
 if(r===1){f.sq=DT;S.score+=200;S.stomps++;noise(0.06,0.3,1500);blip(330,0.08,0.12);for(let i=0;i<8;i++)S.pops.push({x:f.x+8,y:f.y-fh+6,vx:(hash(ft*13+i)-.5)*90,vy:-hash(ft*29+i)*80,l:.5,g:300,c:'#a8f07a'})}
 else if(r===-1){S.hits++;S.plan=null;S.score=Math.max(0,S.score-50);S.shake=0.3;blip(110,0.25,0.15)}}}
// one fixed 60 Hz tick: decide (autopilot or the player), move, bump, foes, camera
function tick(auto,hd,hj){const p=S.pl;S.ft+=DT;const ft=S.ft;
 if(p.dead){p.dvy+=G*DT;p.dy+=p.dvy*DT;foes(ft,null,false);if(ft-p.deadT>1.1)respawn();return}
 if(p.drop){p.vy=Math.min(MAXF,p.vy+G*DT);p.y+=p.vy*DT;if(p.y>=p.dropY){p.y=p.dropY;p.vy=0;p.g=true;p.drop=false;p.landT=0.12;puff(p.x,p.y,5)}foes(ft,null,false);cam();return}
 let dir=hd,jh=hj;if(auto){const a=pilot(p,ft);dir=a.d;jh=a.j}else S.plan=null;S.dir=dir;
 p.stun=Math.max(0,p.stun-DT);gather(p.x-48,p.x+48);phys(p,dir,jh,LS,nL);
 if(EV.jump)blip(600+Math.abs(p.vx),0.08);
 if(EV.land){p.landT=0.09;hat(false);if(Math.abs(p.vx)<60)puff(p.x,p.y,3)}
 if(EV.bump)bumpBlock(EV.bump);
 if(p.skid&&Math.floor(ft*60)%4===0)puff(p.x-p.face*4,p.y,1);
 if(p.g&&p.on&&p.on.kind!=='brick'&&p.on.kind!=='pipe'&&p.x>p.on.x+12&&p.x<p.on.x+p.on.w-12){let clear=true;for(let i=0;i<nL;i++){const q=LS[i];if(q.kind==='brick'&&Math.abs(q.x+8-p.x)<16&&q.y<p.y){clear=false;break}}if(clear){S.safe.x=p.x;S.safe.y=p.y}}
 if(p.y>DIE){die();return}
 foes(ft,p,jh);cam();S.dist+=Math.abs(p.vx)*DT}
function update(dt,t,inp,auto){if(t<T0||t>=end)return;
 const hd=(inp.right?1:0)-(inp.left?1:0),held=!!(inp.up||inp.fireHeld);if(!auto&&inp.jump&&!held)S.tap=14; // a touch tap has no hold: give it a near-full jump
 S.acc=Math.min(0.25,S.acc+dt);while(S.acc>=DT-1e-9){S.acc-=DT;tick(auto,hd,held||S.tap>0);if(S.tap>0)S.tap--}
 const p=S.pl;p.landT=Math.max(0,p.landT-dt);p.bumpT=Math.max(0,p.bumpT-dt);S.shake=Math.max(0,S.shake-dt);
 for(const c of S.coins)c.got+=dt;S.coins=S.coins.filter(c=>c.got<0.7);for(const q of S.plats)if(q.f>0)q.f=Math.max(0,q.f-dt);
 for(const q of S.pops){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dt;q.l-=dt}S.pops=S.pops.filter(q=>q.l>0)}

// ---------------- drawing ----------------
function cloud(x,cx,cy,s){x.fillStyle='#ffffff';x.beginPath();x.arc(cx,cy,8*s,0,7);x.arc(cx+9*s,cy-3*s,10*s,0,7);x.arc(cx+20*s,cy,8*s,0,7);x.arc(cx+10*s,cy+4*s,9*s,0,7);x.fill();x.fillStyle='#cfe8ff';x.fillRect(cx-6*s,cy+6*s,32*s,2*s);x.strokeStyle='#5aa0e0';x.lineWidth=1;x.beginPath();x.arc(cx,cy,8*s,Math.PI*0.5,Math.PI*1.5);x.stroke()}
function hill(x,cx,base,w,h,col,hi,ln){x.fillStyle=col;x.beginPath();x.moveTo(cx-w,base);x.quadraticCurveTo(cx,base-h*2,cx+w,base);x.fill();x.fillStyle=hi;x.beginPath();x.moveTo(cx-w*0.55,base);x.quadraticCurveTo(cx-w*0.2,base-h*1.5,cx+w*0.1,base-h*0.6);x.lineTo(cx+w*0.1,base);x.fill();x.strokeStyle=ln;x.lineWidth=1;x.beginPath();x.moveTo(cx-w,base);x.quadraticCurveTo(cx,base-h*2,cx+w,base);x.stroke()
 x.fillStyle=ln;for(let i=0;i<3;i++){const a=cx-w*0.3+i*w*0.25,b=base-h*0.55-hash(cx*0.01+i)*h*0.3;x.fillRect(Math.round(a),Math.round(b),2,3)}}
function drawGround(x,q,cam){const sx=Math.round(q.x-cam),w=q.w,y=q.y,tile=q.kind==='grass'?T.dirt2:T.dirt;
 for(let ty=y+6;ty<LH;ty+=16)for(let tx=0;tx<w;tx+=16){const cw=Math.min(16,w-tx),ch=Math.min(16,LH-ty);x.drawImage(tile,0,0,cw,ch,sx+tx,ty,cw,ch)}
 for(let tx=0;tx<w;tx+=16){const cw=Math.min(16,w-tx);x.drawImage(T.grass,0,0,cw,10,sx+tx,y,cw,10)}
 // side edges only where the neighbour is lower (or a pit): adjacent platforms at the same height read as one surface
 for(const [ex,nx] of [[sx,q.x],[sx+w-1,q.x+w]]){let ny=LH;for(const o of S.plats)if((o.kind==='ground'||o.kind==='grass')&&o!==q&&(Math.abs(o.x+o.w-nx)<0.5||Math.abs(o.x-nx)<0.5)&&(nx===q.x?Math.abs(o.x+o.w-nx)<0.5:Math.abs(o.x-nx)<0.5))ny=Math.min(ny,o.y);
  if(ny<=y)continue;x.fillStyle='#1a4a1a';x.fillRect(ex,y,1,Math.min(8,ny-y));if(ny>y+6){x.fillStyle='#4a2a12';x.fillRect(ex,y+6,1,ny-y-6)}}
 for(let i=6;i<w-6;i+=13){const hh=hash(q.x+i*1.7);if(hh<0.35){x.fillStyle='#1a4a1a';x.fillRect(sx+i,y-2,1,2);x.fillRect(sx+i+2,y-3,1,3);x.fillRect(sx+i+4,y-2,1,2);x.fillStyle='#8ae060';x.fillRect(sx+i+2,y-2,1,2)}else if(hh>0.9){x.fillStyle='#1a4a1a';x.fillRect(sx+i,y-3,3,3);x.fillStyle=hh>0.95?'#fff6c0':'#ff6a8a';x.fillRect(sx+i+1,y-2,1,1)}}}
function drawPipe(x,sx,y,h){x.drawImage(T.pipe,0,0,28,1,sx+2,y+8,28,h-8);x.drawImage(T.rim,sx,y)}
function draw(x,t){const sp=sprites();const cam=Math.round(S.camX),ft=S.ft;x.save();if(S.shake>0)x.translate(Math.round((hash(t*60)-.5)*4),Math.round((hash(t*61)-.5)*4));
 const sg=x.createLinearGradient(0,0,0,LH);sg.addColorStop(0,'#2a66e8');sg.addColorStop(0.55,'#5fb0ff');sg.addColorStop(1,'#bfe8ff');x.fillStyle=sg;x.fillRect(-4,-4,LW+8,LH+8);
 for(let i=-1;i<6;i++){const cx=i*96-((cam*0.12)%96)+hash(i+Math.floor(cam*0.12/96))*30;cloud(x,cx,24+hash(i*5)*30,1+hash(i*3)*0.5)}
 for(let i=-1;i<5;i++){const cx=i*140-((cam*0.25)%140);hill(x,cx,LH+2,74,46,'#3fa84a','#6ad24a','#1c6a2c')}
 for(let i=-1;i<7;i++){const cx=i*70-((cam*0.4)%70)+20;hill(x,cx,LH+2,30,30,'#2f9a3c','#5ac448','#1c5a2c')}
 for(const q of S.plats){const sx=Math.round(q.x-cam);if(sx>LW||sx+q.w<0)continue;
  if(q.kind==='ground'||q.kind==='grass')drawGround(x,q,cam);else if(q.kind==='pipe')drawPipe(x,sx,q.y,q.h);
  else{const off=q.f>0?-Math.round(Math.sin((0.3-q.f)/0.3*Math.PI)*4):0,yy=q.y+off;
   if(q.word){x.drawImage(T.q[Math.floor(t/(BEAT/2))%4],sx,yy);const s=((t*0.9+q.x*0.003)%1.6)*40-6;x.fillStyle='rgba(255,255,255,.6)';for(let r=1;r<15;r++){const c=Math.round(s-r);if(c>=1&&c<=13)x.fillRect(sx+c,yy+r,c<13?2:1,1)}}
   else if(q.used)x.drawImage(T.used,sx,yy);else x.drawImage(T.brick,sx,yy)}}
 for(const f of S.foes){if(!f.alive)continue;const sx=Math.round(f.x-cam);if(sx<-20||sx>LW+20)continue;
  if(f.t==='walk'){if(f.sq)x.drawImage(sp.wsq,sx-1,Math.round(f.y)-7-1);else{const k=[0,1,2,1][Math.floor(ft*7+f.x0*0.1)%4];x.drawImage(sp.wk[k][f.dir<0?1:0],sx-1,Math.round(f.y)-15-1-(k===1?1:0))}}
  else if(f.sq)x.drawImage(sp.flyDead,sx-1,Math.round(f.y-8+f.sq*f.sq*500)-1);else x.drawImage(sp.fly[[0,1,2,1][Math.floor(ft*12+f.ph)%4]],sx-1,Math.round(f.y)-8-1)}
 x.font="6px 'Press Start 2P',monospace";for(const c of S.coins){const sx=Math.round(c.x-cam);if(sx>LW||sx+c.text.length*6<0)continue;const a=Math.min(1,(0.7-c.got)*4),yy=Math.round(c.y-Math.min(c.got,0.25)*48);x.globalAlpha=a;x.fillStyle='rgba(40,20,10,.6)';x.fillText(c.text,sx+1,yy+1);x.fillStyle=Math.floor(t*12)%2?'#ffffff':'#fff2a0';x.fillText(c.text,sx,yy);x.globalAlpha=1}
 const p=S.pl;
 if(p.dead){if(p.dy<LH+40)x.drawImage(sp.death,Math.round(p.deadX)-8-OX,Math.round(p.dy)-24-OY)}
 else if(!(p.stun>0&&Math.floor(t*20)%2)){let f;const av=Math.abs(p.vx);
  if(p.drop)f=sp.fall;else if(p.bumpT>0)f=sp.bump;else if(!p.g)f=p.vy<0?sp.jump:sp.fall;else if(p.landT>0)f=sp.land;else if(p.skid)f=sp.skid;
  else if(av>RUN-14)f=sp.run[Math.floor(S.dist/10)%3];else if(av>4)f=sp.walk[Math.floor(S.dist/7)%4];else f=(t%3.1)<0.12?sp.blink:sp.idle;
  if(p.g){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(Math.round(p.x-cam)-6,Math.round(p.y)-1,12,2)}
  x.drawImage(f[p.face<0?1:0],Math.round(p.x-cam)-8-OX,Math.round(p.y)-24-OY)}
 for(const q of S.pops){x.globalAlpha=Math.min(1,q.l*3);x.fillStyle=q.c||'#e0b0ff';const z=q.sz||2;x.fillRect(Math.round(q.x-cam),Math.round(q.y),z,z)}x.globalAlpha=1;
 x.restore();
 x.font="6px 'Press Start 2P',monospace";x.fillStyle='#fff';x.strokeStyle='#1c3a6a';x.lineWidth=2;x.strokeText('SCORE '+S.score,6,26);x.fillText('SCORE '+S.score,6,26);x.fillStyle='#ffd23f';x.strokeText('WORDS '+S.coinsGot,LW-76,26);x.fillText('WORDS '+S.coinsGot,LW-76,26);x.fillStyle='#e0b0ff';x.strokeText('STOMPS '+S.stomps,6,36);x.fillText('STOMPS '+S.stomps,6,36);
 }
// debug: every sprite frame on one sheet (tools / screenshots)
function sheet(x){const sp=sprites();let i=0;const put=(c)=>{x.drawImage(c,4+(i%12)*24,4+Math.floor(i/12)*30);i++};
 for(const k of ['idle','blink','land','jump','fall','skid','bump'])put(sp[k][0]);for(const f of sp.walk)put(f[0]);for(const f of sp.run)put(f[0]);put(sp.death);put(sp.run[0][1]);
 for(const f of sp.wk)put(f[0]);put(sp.wsq);for(const f of sp.fly)put(f);put(sp.flyDead);put(T.q[0]);put(T.q[2]);put(T.used);put(T.brick);put(T.dirt);put(T.dirt2);put(T.grass);put(T.rim)}
return{init,onLine,update,draw,sheet,PAL,get DUDE(){return sprites().idle},get S(){return S}}})();
