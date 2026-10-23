import {bar,rngf,lerp,clamp,ERAS,BEAT,clickOn,blip,pix} from './core';

// ---------- ERA 1: arcade ----------
export const E1=(()=>{
const LW=192,LH=108,C='#5bff5b';
const INV=[['..X..X..','...XX...','..XXXX..','.X.XX.X.','XXXXXXXX','X.XXXX.X','X.X..X.X','...XX...'],
['...XX...','..XXXX..','.XXXXXX.','XX.XX.XX','XXXXXXXX','..X..X..','.X.XX.X.','X.X..X.X'],
['..XXXX..','.XXXXXX.','XXXXXXXX','XX.XX.XX','XXXXXXXX','...XX...','..X..X..','.X....X.']];
const SHIP=['....X....','...XXX...','.XXXXXXX.','XXXXXXXXX'];
const shatterT=bar(17);const S:any={};
function newWave(){S.alive=[];for(let r=0;r<4;r++)for(let c=0;c<8;c++)S.alive.push({r,c,on:true});S.ox=50;S.oy=12;S.dir=1}
function gridW(){let min=8,max=-1;for(const a of S.alive)if(a.on){min=Math.min(min,a.c);max=Math.max(max,a.c)}return{min,max}}
function step(b){S.frame^=1;const g=gridW();if(g.max<0)return;const left=S.ox+g.min*12,right=S.ox+g.max*12+8;
 if((S.dir>0&&right+3>LW-6)||(S.dir<0&&left-3<6)){S.dir*=-1;S.oy=Math.min(S.oy+4,52)}else S.ox+=S.dir*3;
 if(b%4===2){const bot:any={};for(const a of S.alive)if(a.on){if(!bot[a.c]||bot[a.c].r<a.r)bot[a.c]=a}const arr:any[]=Object.values(bot);if(arr.length){const a=arr[Math.floor(S.rng()*arr.length)];S.bombs.push({x:S.ox+a.c*12+4,y:S.oy+a.r*10+8})}}
 if(clickOn)blip([110,98,87,82][b%4],0.1,0.1)}
function shatter(){S.debris=[];const r=rngf(99);for(const a of S.alive){if(!a.on)continue;const x=S.ox+a.c*12,y=S.oy+a.r*10;for(let i=0;i<6;i++)S.debris.push({x:x+r()*8,y:y+r()*8,vx:(r()-.5)*40,vy:-r()*30,land:LH-4-Math.floor(r()*3)});a.on=false}S.bul=[];S.bombs=[]}
function init(t){S.ship={x:LW/2-4,y:LH-10,hit:0};S.bul=[];S.bombs=[];S.pops=[];S.words=[];S.score=0;S.debris=null;S.frame=0;S.cool=0;S.rng=rngf(7);newWave();
 const beats=Math.floor(Math.min(t,shatterT)/BEAT);for(let b=0;b<beats;b++)step(b);S.bombs=[];if(t>=shatterT)shatter()}
function onLine(words,t){if(t>=shatterT||t>=ERAS[1].start)return;S.words=S.words.filter(w=>w.on&&w.y<56);const gap=5,ws=words.map(w=>w.length*4),total=ws.reduce((a,b)=>a+b,0)+gap*(words.length-1);let x=Math.max(2,(LW-total)/2);words.forEach((w,i)=>{S.words.push({text:w,x,y:44,w:ws[i],on:true});x+=ws[i]+gap})}
const wsc=w=>lerp(1,1.5,clamp((w.y-44)/50,0,1));
function fire(){if(S.bul.length<2&&S.cool<=0){S.bul.push({x:S.ship.x+4,y:S.ship.y-2});S.cool=0.12;blip(880,0.05)}}
function onBeat(b,t){if(t<shatterT)step(b);else if(!S.debris)shatter()}
function on8th(n,t,auto){if(auto&&t<shatterT)fire()}
function update(dt,t,inp,auto){if(t>=ERAS[1].start)return;S.cool-=dt;const sh=S.ship;
 if(t<shatterT){let dx=0;if(auto){let tx=LW/2,best=1e9;const live=S.words.filter(w=>w.on);if(live.length){for(const w of live){const ax=w.x+w.w*wsc(w)/2;const d=Math.abs(ax-(sh.x+4))+(LH-w.y)*0.3;if(d<best){best=d;tx=ax}}}else for(const a of S.alive)if(a.on){const ax=S.ox+a.c*12+4;const d=Math.abs(ax-(sh.x+4));if(d<best){best=d;tx=ax}}dx=clamp((tx-4-sh.x)*5,-80,80)*dt}
  else{if(inp.left)dx=-70*dt;if(inp.right)dx=70*dt;if(inp.fire)fire()}sh.x=clamp(sh.x+dx,4,LW-13)}
 else{if(!S.debris)shatter();const tx=80/320*LW-4;sh.x=lerp(sh.x,tx,1-Math.pow(0.02,dt));sh.y=lerp(sh.y,LH-9,1-Math.pow(0.02,dt))}
 for(const b of S.bul){b.y-=140*dt;for(const a of S.alive){if(!a.on)continue;const ax=S.ox+a.c*12,ay=S.oy+a.r*10;if(b.x>=ax&&b.x<ax+8&&b.y>=ay&&b.y<ay+8){a.on=false;b.y=-10;S.score+=[30,20,20,10][a.r];for(let i=0;i<5;i++)S.pops.push({x:ax+4,y:ay+4,vx:(S.rng()-.5)*60,vy:(S.rng()-.5)*60,l:.3});break}}}
 for(const w of S.words){if(!w.on)continue;w.y+=13*dt;const sc=wsc(w);for(const b of S.bul){if(b.x>=w.x-1&&b.x<=w.x+w.w*sc+1&&b.y<=w.y+1&&b.y+4>=w.y-4*sc){w.on=false;b.y=-10;S.score+=50;blip(1760,0.08,0.1);for(let i=0;i<w.text.length*2;i++)S.pops.push({x:w.x+S.rng()*w.w*sc,y:w.y-S.rng()*5,vx:(S.rng()-.5)*80,vy:(S.rng()-.5)*80,l:.4});break}}}
 S.words=S.words.filter(w=>w.on&&w.y<LH-12);
 S.bul=S.bul.filter(b=>b.y>0);if(t<shatterT&&!S.alive.some(a=>a.on))newWave();
 for(const b of S.bombs){b.y+=60*dt;if(b.y>sh.y&&b.y<sh.y+4&&b.x>sh.x&&b.x<sh.x+9){sh.hit=0.3;b.y=999}}S.bombs=S.bombs.filter(b=>b.y<LH);
 for(const p of S.pops){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}S.pops=S.pops.filter(p=>p.l>0);
 if(S.debris)for(const d of S.debris){if(d.y<d.land){d.vy+=180*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y>=d.land){d.y=d.land;d.vx=0}}}
 sh.hit=Math.max(0,sh.hit-dt)}
function draw(x,t){x.fillStyle='#020402';x.fillRect(0,0,LW,LH);const pulse=1-((t/BEAT)%1);x.globalAlpha=0.85+0.15*pulse;
 for(const a of S.alive)if(a.on)pix(x,INV[a.r===0?0:a.r<3?1:2],S.ox+a.c*12,S.oy+a.r*10,C,1,S.frame===1);
 x.globalAlpha=1;x.fillStyle=C;for(const b of S.bul)x.fillRect(b.x,b.y,1,4);for(const b of S.bombs)x.fillRect(b.x,b.y,1,3);
 for(const w of S.words){const sc=wsc(w);x.globalAlpha=w.y>LH-24?clamp((LH-12-w.y)/12,0,1):1;x.font=(4*sc).toFixed(1)+"px 'Press Start 2P',monospace";x.fillStyle=C;x.fillText(w.text,w.x,w.y)}x.globalAlpha=1;
 if(!(S.ship.hit>0&&Math.floor(t*30)%2))pix(x,SHIP,S.ship.x,S.ship.y,C);
 for(const p of S.pops)x.fillRect(p.x,p.y,1,1);
 if(S.debris)for(const d of S.debris)x.fillRect(d.x,d.y,1,1);
 x.fillRect(0,LH-2,LW,1);
 x.font="4px 'Press Start 2P',monospace";x.fillText('SCORE '+String(S.score).padStart(5,'0'),4,17);x.fillText('CREDIT 01',LW-40,17)}
return{init,onBeat,on8th,onLine,update,draw,SHIP}})();
