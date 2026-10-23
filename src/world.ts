import {W,H,ERAS,TRANS,bar,BAR,BEAT,hash,clamp,lerp,smooth,blip,pix,mk,cv} from './core';
import {E2} from './era2';

// ---------- ERAS 4+5: isometric world (sandbox, then agents) ----------
export const WD:any={N:18,Cc:9,TW:44,TH:22,BH:20,ox:W/2,oy:H*0.58,s4:ERAS[3].start,s5:ERAS[4].start};
WD.iso=(x,y,z=0)=>({x:WD.ox+(x-y)*WD.TW/2,y:WD.oy+(x+y-WD.N)*WD.TH/2-z*WD.BH});
WD.ROLE={G:{n:'GEOMETRY',c:'#4df0ff',rgb:[77,240,255]},T:{n:'TEXTURE',c:'#ff5be0',rgb:[255,91,224]},L:{n:'LIGHTING',c:'#ffe14d',rgb:[255,225,77]},A:{n:'AUDIO',c:'#ff9a3c',rgb:[255,154,60]},R:{n:'RULES',c:'#5bff5b',rgb:[91,255,91]}};
WD.CODE={G:['mesh.add(cube(${x},${y},${z}))','extrude(footprint, h=1)','weld(verts, eps=0.01)'],T:["mat.apply('asphalt.stripe')",'uv.tile(2,1); rough=.8','albedo = #2b2b33'],L:['sun.azimuth -= 35deg','bloom.threshold = 0.7',"sky.tint('dusk')"],A:['bus.sidechain(kick,6dB)','pad.detune(+7); verb=.8','speaker.pulse(beat)'],R:['on(SPACE)      -> fire()','on(LEFT|RIGHT) -> move()','win := wall.alive == 0']};
WD.HPAL=[[90,200,120],[80,170,210],[120,120,230],[200,110,210],[240,150,90],[250,220,100]];
WD.INVPAT=['..X.....X..','...X...X...','..XXXXXXX..','.XX.XXX.XX.','XXXXXXXXXXX','X.XXXXXXX.X','X.X.....X.X','...XX.XX...'];
WD.spiral=(r0,r1)=>{const o=[],C=WD.Cc;for(let r=r0;r<=r1;r++){if(r===0){o.push([C,C]);continue}let x=C-r,y=C-r;for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]])for(let k=0;k<2*r;k++){o.push([x,y]);x+=dx;y+=dy}}return o};
WD.PYR=[...WD.spiral(0,2),...WD.spiral(0,1),[WD.Cc,WD.Cc]];WD.RING3=WD.spiral(3,3);WD.RING4=WD.spiral(4,4);
WD.SPAWN=[[73,'G'],[73.2,'T'],[73.4,'G'],[73.6,'L'],[73.8,'T'],[74,'G'],[74.2,'A'],[74.4,'T'],[74.6,'G'],[74.8,'R']];
WD.STEPS=[];(()=>{const C=WD.Cc,lo=C-7,hi=C+7,top=[],bot=[],lef=[],rig=[];for(let i=lo;i<=hi;i++){top.push([i,lo]);bot.push([i,hi]);if(i!==lo&&i!==hi){lef.push([lo,i]);rig.push([hi,i])}}
 const half=a=>[a.slice(0,Math.ceil(a.length/2)),a.slice(Math.ceil(a.length/2))];[...half(top),...half(rig),...half(bot),...half(lef)].forEach((g,i)=>WD.STEPS.push({id:'r'+i,bar:75+i*0.5,role:'G',type:'road',cells:g.map(([x,y])=>[x,y,0])}));
 [[3,5],[15,5],[3,13],[15,13]].forEach(([x,y],i)=>WD.STEPS.push({id:'p'+i,bar:79+i*0.5,role:'G',type:'plat',cells:[[x,y,0],[x,y,1],[x,y,2]]}));
 for(let g=0;g<4;g++){const cells=[];for(let r=g*2;r<g*2+2;r++){const row=WD.INVPAT[7-r];for(let c=0;c<11;c++)if(row[c]==='X')cells.push([4+c,3,r])}WD.STEPS.push({id:'w'+g,bar:81+g*0.5,role:'G',type:'inv',cells})}
 WD.STEPS.push({id:'light',bar:84,role:'L',type:'light',cells:[]});WD.STEPS.push({id:'spk',bar:85,role:'A',type:'spk',cells:[[4,15,0],[14,15,0]]})})();
WD.colorFor=(type,z)=>type==='road'?[62,62,74]:type==='plat'?[140,74,34]:type==='inv'?[91,255,91]:type==='spk'?[255,140,40]:WD.HPAL[Math.min(z,5)];
const bloomW=mk(W/4,H/4);
export const WORLD:any=(()=>{
const{N,Cc,s4,s5}=WD;let S:any;
const key=(x,y,z)=>x+','+y+','+z;
function stamp(b,t){if(S.wq.length){b.word=S.wq.shift();b.wordT=t}}
function onLine(words,t){if(t<s4-TRANS)return;if(t<bar(89)){S.wq=words.slice();return}if(t>=bar(94))return;const alive=S.blocks.filter(b=>b.type==='inv'&&b.alive&&!b.word);for(const w of words){if(!alive.length)break;const i=Math.floor(hash(t*7+alive.length)*alive.length);const b=alive.splice(i,1)[0];b.word=w;b.wordT=t;b.target=true}}
function addBlock(b){const k=key(b.x,b.y,b.z);if(S.map.has(k))return null;S.map.set(k,b);S.blocks.push(b);S.h[b.x*N+b.y]=Math.max(S.h[b.x*N+b.y],b.z+1);return b}
function place(x,y,col,src,t,fx){if(x<0||y<0||x>=N||y>=N)return;const z=S.h[x*N+y];if(z>7)return;const b=addBlock({x,y,z,col:col||WD.HPAL[Math.min(z,5)],type:'blk',t,src,wire:false,alive:true});if(b)stamp(b,t);if(b&&fx){S.ripples.push({x,y,z:z+1,t});blip([262,330,392,523,659,784][z%6]*(src==='ghost'?2:1),0.12,0.1)}}
function assign(role,target,t){const list=S.agents.filter(a=>a.role===role);if(!list.length)return;const a=list.reduce((m,a)=>a.lastT<m.lastT?a:m);a.lastT=t;a.target={x:target[0]+0.5,y:target[1]+0.5,z:target[2]};a.panel={t,lines:WD.CODE[role].map(l=>l.replace('${x}',target[0]).replace('${y}',target[1]).replace('${z}',target[2]|0))}}
function spawnAgent(role,t,fx){const i=S.agents.length;const R=WD.ROLE[role];const from=role==='R'?{x:Cc+0.5,y:N-0.5,z:0.5}:{x:S.cur.x+0.5,y:S.cur.y+0.5,z:S.h[S.cur.x*N+S.cur.y]+0.5};
 const a={role,col:R.c,rgb:R.rgb,pos:{...from},target:{x:N+9+i*0.7,y:-9+i*0.3,z:3+(i%3)},lastT:-1,alpha:1,born:t,ph:i*1.7,panel:null,trail:[]};S.agents.push(a);if(fx){for(let k=0;k<16;k++)S.sparks.push({x:from.x,y:from.y,z:from.z,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,vz:Math.random()*5,l:0.6,c:R.c});blip(1200+i*80,0.1)}}
function scripted(t,replay,auto){
 if(t>=s4&&t<bar(66.5)&&auto){const k=Math.round((t-s4)/BEAT);const c=WD.PYR[k];if(c){S.cur={x:c[0],y:c[1]};place(c[0],c[1],null,'auto',t,!replay)}}
 if(t>=bar(66.5)&&t<bar(69.5)){const k=Math.round((t-bar(66.5))/BEAT);const c=WD.RING3[k%WD.RING3.length];if(c)place(c[0],c[1],[120,230,255],'ghost',t,!replay)}
 if(t>=bar(69.5)&&t<bar(73)){const k=Math.round((t-bar(69.5))/BEAT)*2;for(let j=0;j<2;j++){const c=WD.RING4[(k+j)%WD.RING4.length];if(c)place(c[0],c[1],[120,230,255],'ghost',t,!replay)}}}
function stepCheck(t,replay){
 for(const sp of WD.SPAWN){const tb=bar(sp[0]);if(t>=tb&&!S.done.has('s'+sp[0])){S.done.add('s'+sp[0]);spawnAgent(sp[1],tb,!replay)}}
 for(const st of WD.STEPS){const tb=bar(st.bar);if(t<tb||S.done.has(st.id))continue;S.done.add(st.id);
  if(st.type==='light'){S.lightT=tb;assign('L',[Cc,Cc,5],tb);continue}
  for(const[x,y,z]of st.cells)addBlock({x,y,z,type:st.type,col:WD.colorFor(st.type,z),t:tb,solidT:tb+BAR,wire:true,src:'agent',alive:true});
  const c=st.cells[0];assign(st.role,[c[0],c[1],c[2]+1.5],tb);const m=st.cells[Math.floor(st.cells.length/2)];S.pend.push({t:tb+BAR,cell:m,done:false})}
 for(const b of S.blocks)if(b.wire&&t>=b.solidT){b.wire=false;b.snapT=t;stamp(b,t);if(!replay){S.ripples.push({x:b.x,y:b.y,z:b.z+1,t});blip(440+b.z*60,0.05,0.08)}}
 for(const p of S.pend)if(t>=p.t&&!p.done){p.done=true;assign('T',[p.cell[0],p.cell[1],p.cell[2]+1.5],p.t)}
 if(t>=bar(87)&&!S.done.has('rules1')){S.done.add('rules1');assign('R',[Cc,10,1],bar(87))}
 if(t>=bar(89)&&!S.done.has('rules2')){S.done.add('rules2');S.hudT=bar(89);S.player={x:Cc+0.5,y:14.5,z:0,vz:0};const r=S.agents.find(a=>a.role==='R');if(r){r.target={x:Cc+0.5,y:9.5,z:6};r.panel=null}if(!replay){blip(523,0.1);blip(784,0.2)}}
 if(t>=bar(94)&&!S.done.has('retreat')){S.done.add('retreat');S.agents.forEach((a,i)=>{a.target={x:i%2?-1:N+1,y:(i*3.7)%N,z:3}});S.player=null}}
function init(t){t=Math.min(t,s5);S={blocks:[],map:new Map(),h:new Uint8Array(N*N),cur:{x:Cc,y:Cc},agents:[],ripples:[],bullets:[],pops:[],sparks:[],wq:[],wordsShot:0,score:0,hits:0,player:null,hudT:-1,lightT:null,done:new Set(),pend:[],lastFire:0};
 const beats=Math.floor(t/BEAT);for(let b=0;b<=beats;b++)scripted(b*BEAT,true,true);stepCheck(t,true);for(const a of S.agents){a.pos={...a.target}}}
function onBeat(b,t,auto){if(t<s4-TRANS)return;scripted(b*BEAT,false,auto)}
function on8th(n,t,auto){if(!S.player||!auto||t>=bar(94))return;const cx=Math.floor(S.player.x);if(S.blocks.some(b=>b.type==='inv'&&b.alive&&b.x===cx))fire(t)}
function wordTarget(){let best=null;for(const b of S.blocks)if(b.type==='inv'&&b.alive&&b.target){if(!best||b.z<best.z)best=b}return best}
function fire(t){if(!S.player||t-S.lastFire<0.12)return;S.lastFire=t;S.bullets.push({x:S.player.x,y:S.player.y,z:4.5+S.player.z});blip(880,0.05)}
function update(dt,t,inp,auto){if(t<s4-TRANS||t>=s5)return;stepCheck(t,false);
 if(t<bar(89)&&!auto){if(inp.mv.x||inp.mv.y){S.cur.x=clamp(S.cur.x+inp.mv.x,0,N-1);S.cur.y=clamp(S.cur.y+inp.mv.y,0,N-1)}if(inp.fire)place(S.cur.x,S.cur.y,null,'player',t,true)}
 for(const a of S.agents){const d={x:a.target.x-a.pos.x,y:a.target.y-a.pos.y,z:a.target.z-a.pos.z};const L=Math.hypot(d.x,d.y,d.z);const sp=7*dt;if(L>0.01){if(L<sp)a.pos={...a.target};else{a.pos.x+=d.x/L*sp;a.pos.y+=d.y/L*sp;a.pos.z+=d.z/L*sp}a.trail.push({x:a.pos.x,y:a.pos.y,z:a.pos.z,l:0.5});if(a.trail.length>14)a.trail.shift()}
  for(const q of a.trail)q.l-=dt;a.trail=a.trail.filter(q=>q.l>0);if(t>=bar(94))a.alpha=Math.max(0,1-(t-bar(94))/(BAR*0.75))}
 const p=S.player;if(p&&t<bar(94)){if(auto){const wt=wordTarget();if(wt)p.x=lerp(p.x,wt.x+0.5,1-Math.pow(0.01,dt));else p.x=Cc+0.5+Math.sin((t-bar(89))*1.1)*4;if(p.z===0&&Math.floor(t/BAR)!==Math.floor((t-dt)/BAR))p.vz=5}else{if(inp.left)p.x-=5*dt;if(inp.right)p.x+=5*dt;p.x=clamp(p.x,5.5,13.5);if(inp.jump&&p.z===0)p.vz=6;if(inp.fire)fire(t)}
  if(p.z>0||p.vz>0){p.vz-=18*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0}}}
 for(const b of S.bullets){b.y-=14*dt;if(b.y<=3.6&&!b.hit){b.hit=true;const cx=Math.floor(b.x);const col=S.blocks.filter(q=>q.type==='inv'&&q.alive&&q.x===cx).sort((a,b)=>a.z-b.z);if(col.length){const q=col.find(q=>q.target)||col[0];q.alive=false;q.col=[40,80,44];S.hits++;S.score+=q.target?100:30;if(q.target){S.wordsShot++;q.target=false;q.popT=t;for(let k=0;k<14;k++)S.sparks.push({x:q.x+0.5,y:q.y+0.5,z:q.z+0.5,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*4,vz:Math.random()*8,l:0.7,c:'#fff'})}for(let k=0;k<8;k++)S.sparks.push({x:q.x+0.5,y:q.y+0.5,z:q.z+0.5,vx:(Math.random()-.5)*5,vy:Math.random()*3,vz:Math.random()*6,l:0.5,c:'#5bff5b'});blip(220,0.1,0.15)}}}
 S.bullets=S.bullets.filter(b=>b.y>2&&!(b.hit&&b.y<3.4));
 for(const s of S.sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.vz-=12*dt;s.l-=dt}S.sparks=S.sparks.filter(s=>s.l>0);S.ripples=S.ripples.filter(r=>t-r.t<0.6)}
return{init,onBeat,on8th,onLine,update,get S(){return S}}})();

// ---------- world rendering ----------
export const mixc=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
export const rgb=(c,m=1,a=1)=>`rgba(${Math.round(clamp(c[0]*m,0,255))},${Math.round(clamp(c[1]*m,0,255))},${Math.round(clamp(c[2]*m,0,255))},${a})`;
export const CODE_RAIN=Object.values(WD.CODE).flat().concat(['for(agent of swarm) agent.tick()','world.commit(frame)','if(player.input) rules.rebind()','spawn(entity, at=cursor)','await lyrics.sync(beat)']);
WORLD.draw=function(ctx,t,auto){const S=WORLD.S;if(!S)return;const{N,Cc,TW,TH,BH,iso,s4,s5}=WD;
 const appear=smooth((t-(s4-TRANS))/TRANS),dusk=S.lightT!=null?smooth((t-S.lightT)/(BAR*2)):0,e5=clamp((t-(s5-TRANS))/(TRANS*2),0,1),pulse=1-((t/BEAT)%1);
 const tint=[255,150,80];
 // sky
 const hy=H*0.46;const g=ctx.createLinearGradient(0,0,0,hy);g.addColorStop(0,rgb(mixc([31,58,122],[20,8,40],dusk)));g.addColorStop(0.65,rgb(mixc([111,176,255],[120,40,110],dusk)));g.addColorStop(1,rgb(mixc([255,215,170],[255,120,60],dusk)));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const sun={x:lerp(W*0.78,W*0.86,dusk),y:lerp(H*0.14,H*0.30,dusk),r:lerp(24,34,dusk),c:mixc([255,245,200],[255,140,70],dusk)};
 const sg=ctx.createRadialGradient(sun.x,sun.y,sun.r*0.5,sun.x,sun.y,160*(1+dusk*0.7));sg.addColorStop(0,rgb(sun.c,1,0.55));sg.addColorStop(1,rgb(sun.c,1,0));ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);ctx.fillStyle=rgb(sun.c);ctx.beginPath();ctx.arc(sun.x,sun.y,sun.r,0,7);ctx.fill();
 ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<7;i++){const an=1.85+i*0.2+Math.sin(t*0.3+i)*0.04,L=H*1.5;const rg2=ctx.createLinearGradient(sun.x,sun.y,sun.x+Math.cos(an)*L,sun.y+Math.sin(an)*L);rg2.addColorStop(0,rgb(sun.c,1,0.11+0.04*Math.sin(t*0.7+i)));rg2.addColorStop(1,rgb(sun.c,1,0));ctx.fillStyle=rg2;ctx.beginPath();ctx.moveTo(sun.x,sun.y);ctx.lineTo(sun.x+Math.cos(an-0.05)*L,sun.y+Math.sin(an-0.05)*L);ctx.lineTo(sun.x+Math.cos(an+0.05)*L,sun.y+Math.sin(an+0.05)*L);ctx.fill()}ctx.restore();
 for(let i=0;i<7;i++){const cw=90+hash(i*7.7)*120,cx=((hash(i*2.3)*W*1.5+t*(6+hash(i)*8))%(W*1.5))-W*0.25,cy=40+hash(i*5.1)*H*0.22;const cc=mixc([255,255,255],[255,170,130],dusk);const cg=ctx.createRadialGradient(cx,cy/0.38,2,cx,cy/0.38,cw);cg.addColorStop(0,rgb(cc,1,0.6));cg.addColorStop(0.55,rgb(cc,1,0.2));cg.addColorStop(1,rgb(cc,1,0));ctx.save();ctx.scale(1,0.38);ctx.fillStyle=cg;ctx.fillRect(cx-cw,cy/0.38-cw,cw*2,cw*2);ctx.restore()}
 if(e5>0){ // maximalist layers: code rain, era-2 hills, era-1 invaders in the sky
  ctx.save();ctx.globalAlpha=0.13*e5;ctx.fillStyle='#5bff5b';ctx.font="9px ui-monospace,monospace";for(let c=0;c<13;c++){const x=20+c*74;const off=(t*(22+(c%4)*8)+c*140)%(H*0.6+200);for(let k=0;k<6;k++){const y=H*0.6-((off+k*34)%(H*0.6+200))+100;ctx.fillText(CODE_RAIN[(c*3+k)%CODE_RAIN.length],x,y)}}ctx.restore();
  ctx.save();ctx.globalAlpha=0.9*e5;ctx.fillStyle=rgb(mixc([36,53,122],[40,15,60],dusk));ctx.beginPath();ctx.moveTo(0,H);for(let sx=0;sx<=W;sx+=6){const wx=sx+t*12;ctx.lineTo(sx,hy-Math.abs(Math.sin(wx*0.004)*40+Math.sin(wx*0.011)*18))}ctx.lineTo(W,H);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=0.35*e5;const step=Math.floor(t/BEAT)%16;for(let i=0;i<6;i++){const x=40+i*150+(step<8?step:16-step)*8,y=30+(i%2)*34+Math.floor(t/BAR)%3*6;pix(ctx,WD.INVPAT,x,y,'#5bff5b',3,step%2===1)}ctx.restore()}
 // water
 const wc=mixc([24,60,120],[40,20,70],dusk);const w0=iso(-9,-9),w1=iso(N+9,-9),w2=iso(N+9,N+9),w3=iso(-9,N+9);const wg=ctx.createLinearGradient(0,w0.y,0,w2.y);wg.addColorStop(0,rgb(wc,1.3));wg.addColorStop(1,rgb(wc,0.6));ctx.fillStyle=wg;ctx.beginPath();ctx.moveTo(w0.x,w0.y);ctx.lineTo(w1.x,w1.y);ctx.lineTo(w2.x,w2.y);ctx.lineTo(w3.x,w3.y);ctx.fill();
 ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(let k=0;k<9;k++){const yy=-9+((k*4+t*0.8)%36);const a=iso(-9,yy),b=iso(N+9,yy);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}ctx.restore();
 ctx.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<30;i++){const q=iso(-8+hash(i*1.7)*34,-8+hash(i*3.1)*34);const tw=Math.max(0,Math.sin(t*3+i*1.3));if(tw>0.6)ctx.fillRect(q.x,q.y,2,1)}
 const rg=ctx.createLinearGradient(sun.x,hy,sun.x,H);rg.addColorStop(0,rgb(sun.c,1,0.25+dusk*0.25));rg.addColorStop(1,rgb(sun.c,1,0));ctx.fillStyle=rg;ctx.fillRect(sun.x-40-dusk*30,hy,80+dusk*60,H-hy);
 // floor
 for(let x=0;x<N;x++)for(let y=0;y<N;y++){const ca=smooth((appear-hash(x*31+y)*0.6)/0.4);if(ca<=0)continue;const base=(x+y)%2?[86,160,96]:[78,150,90];let col=mixc(base,tint,dusk*0.3);const fog=clamp(0.3-(x+y)/(2*N)*0.3,0,0.3);col=mixc(col,mixc([140,190,255],[120,50,120],dusk),fog);const l=1+((x-y)/N)*0.12;
  const a=iso(x,y),b=iso(x+1,y),c=iso(x+1,y+1),d=iso(x,y+1);ctx.globalAlpha=ca;ctx.fillStyle=rgb(col,l);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=1;ctx.stroke()}
 ctx.globalAlpha=1;
 // shadows
 const shadowPass=(k,al)=>{ctx.fillStyle=`rgba(0,0,0,${al})`;for(let x=0;x<N;x++)for(let y=0;y<N;y++){const h=S.h[x*N+y];if(!h)continue;const sx=-h*7*k*(1+dusk*0.8),sy=h*3.5*k*(1+dusk*0.8);const a=iso(x,y),b=iso(x+1,y),c=iso(x+1,y+1),d=iso(x,y+1);ctx.beginPath();ctx.moveTo(a.x+sx,a.y+sy);ctx.lineTo(b.x+sx,b.y+sy);ctx.lineTo(c.x+sx,c.y+sy);ctx.lineTo(d.x+sx,d.y+sy);ctx.fill()}};shadowPass(0.85,0.2+dusk*0.08);shadowPass(1.2,0.09);
 // depth-sorted items
 const items=[];for(const b of S.blocks)items.push({k:b.x+b.y+b.z*0.001,f:()=>drawBlock(b)});
 for(const a of S.agents)items.push({k:a.pos.x+a.pos.y-0.4,f:()=>drawAgent(a)});
 if(S.player)items.push({k:S.player.x+S.player.y-0.5,f:()=>drawPlayer(S.player)});
 for(const b of S.bullets)items.push({k:b.x+b.y,f:()=>{const p=iso(b.x,b.y,b.z);ctx.fillStyle='#fff';ctx.fillRect(p.x-2,p.y-8,4,10);ctx.fillStyle='rgba(91,255,91,.6)';ctx.fillRect(p.x-4,p.y-10,8,14)}});
 for(const s of S.sparks)items.push({k:s.x+s.y+1,f:()=>{const p=iso(s.x,s.y,s.z);ctx.globalAlpha=Math.min(1,s.l*2);ctx.fillStyle=s.c;ctx.fillRect(p.x-2,p.y-2,4,4);ctx.globalAlpha=1}});
 items.sort((a,b)=>a.k-b.k);for(const it of items)it.f();
 for(const r of S.ripples){const s=(t-r.t)/0.6;const p=iso(r.x+0.5,r.y+0.5,r.z);const rx=TW/2*(1+s*2.5),ry=TH/2*(1+s*2.5);ctx.strokeStyle=`rgba(255,255,255,${(1-s)*0.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y-ry);ctx.lineTo(p.x+rx,p.y);ctx.lineTo(p.x,p.y+ry);ctx.lineTo(p.x-rx,p.y);ctx.closePath();ctx.stroke()}
 ctx.font="8px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.lineWidth=3;ctx.lineJoin='round';for(const b of S.blocks){if(!b.word)continue;const age=t-b.wordT;let a=1,rise=0;if(b.target&&b.alive){a=0.75+0.25*pulse}else if(b.popT!=null){const q=(t-b.popT)/0.6;if(q>=1)continue;a=1-q;rise=q*40}else{if(age>bar(2.5))continue;a=age>bar(2)?1-(age-bar(2))/bar(0.5):1;rise=Math.min(age*10,12)}const p=iso(b.x+0.5,b.y+0.5,b.z+1.3);ctx.globalAlpha=a;ctx.strokeStyle='rgba(0,0,0,.85)';ctx.strokeText(b.word,p.x,p.y-rise);ctx.fillStyle=b.target?'#5bff5b':b.src==='ghost'?'#9af0ff':'#fff';ctx.fillText(b.word,p.x,p.y-rise)}ctx.globalAlpha=1;ctx.textAlign='left';
 if(t<bar(89)&&appear>=1){const h=S.h[S.cur.x*N+S.cur.y];const a=iso(S.cur.x,S.cur.y,h),b=iso(S.cur.x+1,S.cur.y,h),c=iso(S.cur.x+1,S.cur.y+1,h),d=iso(S.cur.x,S.cur.y+1,h);ctx.strokeStyle=`rgba(255,255,255,${0.5+0.5*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.stroke()}
 ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<36;i++){const px=((hash(i*1.3)*W+t*(5+hash(i)*10))%W),py=((hash(i*2.9)*H+Math.sin(t*0.5+i)*30)%H+H)%H;const dg=ctx.createRadialGradient(px,py,0,px,py,4);dg.addColorStop(0,'rgba(255,240,200,.4)');dg.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=dg;ctx.fillRect(px-4,py-4,8,8)}ctx.restore();
 if(appear>0){const bx=bloomW.x;bx.save();bx.filter='blur(4px) saturate(1.3)';bx.clearRect(0,0,bloomW.w,bloomW.h);bx.drawImage(cv,0,0,bloomW.w,bloomW.h);bx.restore();ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.18;ctx.imageSmoothingEnabled=true;ctx.drawImage(bloomW.c,0,0,W,H);ctx.restore();const vg=ctx.createRadialGradient(W/2,H/2,H*0.4,W/2,H/2,H*0.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.38)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)}
 // rules HUD
 if(S.hudT>=0&&t<bar(94)){const q=smooth((t-S.hudT)/0.4);const y=lerp(-80,20,q),x=W/2-280;ctx.fillStyle='rgba(5,12,8,.86)';ctx.fillRect(x,y,560,58);ctx.strokeStyle='#5bff5b';ctx.lineWidth=2;ctx.strokeRect(x,y,560,58);
  ctx.font="11px 'Press Start 2P',monospace";ctx.fillStyle='#5bff5b';ctx.fillText('NEW RULES LOADED',x+14,y+22);ctx.font="8px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.fillText('< > MOVE   ^ JUMP   SPACE FIRE',x+14,y+44);
  const alive=S.blocks.filter(b=>b.type==='inv'&&b.alive).length;ctx.textAlign='right';ctx.fillStyle='#ffe14d';ctx.fillText('TARGETS '+alive+'  WORDS '+S.wordsShot,x+546,y+22);ctx.fillStyle='#fff';ctx.fillText('SCORE '+S.score,x+546,y+44);ctx.textAlign='left'}
 // score during sandbox
 if(t>=s4&&t<bar(89)){ctx.font="9px 'Press Start 2P',monospace";ctx.fillStyle='#fff';ctx.fillText('BLOCKS '+S.blocks.length,16,H*0.13);if(S.agents.length){ctx.fillStyle='#4df0ff';ctx.fillText('AGENTS '+S.agents.length,16,H*0.13+16)}}
 // outro
 if(t>=bar(94.5)){ctx.fillStyle=`rgba(0,0,0,${smooth((t-bar(94.5))/(BAR*0.5))})`;ctx.fillRect(0,0,W,H)}
 if(t>=bar(94.75)){const a=Math.min(1,(t-bar(94.75))/0.5)*(0.8+0.2*pulse);const gg=ctx.createRadialGradient(W/2,H/2,1,W/2,H/2,40);gg.addColorStop(0,`rgba(91,255,91,${a*0.5})`);gg.addColorStop(1,'rgba(91,255,91,0)');ctx.fillStyle=gg;ctx.fillRect(W/2-40,H/2-40,80,80);ctx.fillStyle=`rgba(91,255,91,${a})`;ctx.fillRect(W/2-3,H/2-3,6,6)}
 if(t>=bar(95)&&Math.floor(t*2)%2===0){ctx.font="14px 'Press Start 2P',monospace";ctx.fillStyle='#5bff5b';ctx.textAlign='center';ctx.fillText('PRESS START',W/2,H/2+50);ctx.textAlign='left'}

 function face(a,b,c,d,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill()}
 function drawBlock(b){const{x,y,z}=b;const A=iso(x,y,z+1),B=iso(x+1,y,z+1),C=iso(x+1,y+1,z+1),D=iso(x,y+1,z+1),Bb=iso(x+1,y,z),Cb=iso(x+1,y+1,z),Db=iso(x,y+1,z);
  if(b.wire){ctx.strokeStyle=`rgba(77,240,255,${0.45+0.5*pulse})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.moveTo(B.x,B.y);ctx.lineTo(Bb.x,Bb.y);ctx.lineTo(Cb.x,Cb.y);ctx.lineTo(Db.x,Db.y);ctx.lineTo(D.x,D.y);ctx.moveTo(C.x,C.y);ctx.lineTo(Cb.x,Cb.y);ctx.stroke();return}
  const em=(b.type==='inv'||b.type==='spk')&&b.alive;let col=mixc(b.col,tint,dusk*0.22);let m=1+(em?0.3*pulse:0);if(b.snapT!=null&&t-b.snapT<0.3)m+=(1-(t-b.snapT)/0.3)*1.2;if(b.src==='ghost')m+=0.1*Math.sin(t*6+x+y);
  let top=col;if(b.type==='plat')top=mixc([120,220,100],tint,dusk*0.22);
  const gR=ctx.createLinearGradient(0,B.y,0,Cb.y);gR.addColorStop(0,rgb(col,0.88*m));gR.addColorStop(1,rgb(col,0.56*m));face(B,C,Cb,Bb,gR);
  const gL=ctx.createLinearGradient(0,D.y,0,Cb.y);gL.addColorStop(0,rgb(col,0.64*m));gL.addColorStop(1,rgb(col,0.38*m));face(D,C,Cb,Db,gL);
  const gT=ctx.createLinearGradient(D.x,A.y,B.x,C.y);gT.addColorStop(0,rgb(top,0.9*m));gT.addColorStop(1,rgb(top,1.15*m));face(A,B,C,D,gT);
  ctx.strokeStyle=`rgba(255,255,255,${0.3*Math.min(1,m)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(D.x,D.y);ctx.lineTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
  if(b.type==='road'){const v=(x===Cc-7||x===Cc+7);const p=(u,w)=>iso(x+(v?w:u),y+(v?u:w),z+1);face(p(0.1,0.42),p(0.9,0.42),p(0.9,0.58),p(0.1,0.58),'#f0c040')}
  if(em){const gg=ctx.createRadialGradient(C.x,A.y+TH,2,C.x,A.y+TH,TW*0.9);gg.addColorStop(0,rgb(b.col,1,0.25*pulse+0.1));gg.addColorStop(1,rgb(b.col,1,0));ctx.fillStyle=gg;ctx.fillRect(C.x-TW,A.y-TH,TW*2,TH*4)}
  ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.stroke()}
 function drawAgent(a){if(a.alpha<=0)return;ctx.save();ctx.globalAlpha=a.alpha;for(const q of a.trail){const p=iso(q.x,q.y,q.z);ctx.fillStyle=rgb(a.rgb,1,q.l*0.5);ctx.fillRect(p.x-2,p.y-2,4,4)}
  const p=iso(a.pos.x,a.pos.y,a.pos.z);p.y+=Math.sin(t*4+a.ph)*3;const gg=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,26);gg.addColorStop(0,rgb(a.rgb,1,0.45));gg.addColorStop(1,rgb(a.rgb,1,0));ctx.fillStyle=gg;ctx.fillRect(p.x-26,p.y-26,52,52);
  const bg=ctx.createLinearGradient(p.x,p.y-9,p.x,p.y+9);bg.addColorStop(0,'#fff');bg.addColorStop(1,a.col);ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(p.x,p.y-9);ctx.lineTo(p.x+8,p.y);ctx.lineTo(p.x,p.y+9);ctx.lineTo(p.x-8,p.y);ctx.closePath();ctx.fill();ctx.fillStyle='#10101a';ctx.fillRect(p.x-4,p.y-2,2,3);ctx.fillRect(p.x+2,p.y-2,2,3);
  ctx.font="6px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle=a.col;ctx.fillText(WD.ROLE[a.role].n,p.x,p.y-16);ctx.textAlign='left';
  if(a.panel&&t-a.panel.t<2.4){const age=t-a.panel.t;const fa=age>2?1-(age-2)/0.4:1;ctx.globalAlpha=a.alpha*fa;const px=Math.min(W-200,p.x+14),py=Math.max(6,p.y-66);ctx.fillStyle='rgba(8,8,14,.88)';ctx.fillRect(px,py,186,42);ctx.strokeStyle=a.col;ctx.lineWidth=1;ctx.strokeRect(px,py,186,42);ctx.font="8px ui-monospace,monospace";let chars=Math.floor(age*46);for(let i=0;i<3;i++){const l=a.panel.lines[i];const n=clamp(chars,0,l.length);ctx.fillStyle=i===2?'#fff':'#cfd8e3';ctx.fillText(l.slice(0,n)+(n<l.length&&chars>=0?'_':''),px+6,py+13+i*12);chars-=l.length+4}}
  ctx.restore()}
 function drawPlayer(p){const g0=iso(p.x,p.y,0);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(g0.x,g0.y,12,6,0,0,7);ctx.fill();const s=iso(p.x,p.y,p.z);pix(ctx,E2.DUDE[p.z>0?1:Math.floor(t/(BEAT/2))%2],s.x-12,s.y-32,E2.PAL,2)}
};
