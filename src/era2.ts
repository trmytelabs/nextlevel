import {ERAS,BEAT,TRANS,rngf,clamp,lerp,hash,blip,hat,pix} from './core';
import {E1} from './era1';

// ---------- ERA 2: 16-bit platformer ----------
export const E2=(()=>{
const LW=320,LH=180,B=16,SPEED=64/BEAT,PX=80,G=900,JV=-330;const start=ERAS[1].start;
const PAL={S:'#f3c7a0',B:'#2c5bd9',R:'#e03b3b',K:'#20202a',W:'#fff',Y:'#ffd23f'};
const DUDE=[['....RRRR....','...RRRRRR...','...SSSSSK...','...SKSSKS...','...SSSSSS...','....SSSS....','...BBBBBB...','..BBBBBBBB..','.SBBBBBBBBS.','.S.BBBBBB.S.','...BBBBBB...','...BB..BB...','...BB..BB...','..KK....KK..','..KK....KK..','............'],
['....RRRR....','...RRRRRR...','...SSSSSK...','...SKSSKS...','...SSSSSS...','....SSSS....','...BBBBBB...','..BBBBBBBB..','..SBBBBBBS..','...BBBBBB...','...BBBBBB...','..BB....BB..','.BB......BB.','KK........KK','............','............']];
const S:any={};
function gen(to){while(S.genX<to){const r=S.rng;
 if(S.plats.length===0){S.plats.push({x:-200,y:LH-48,w:200+PX+B*8,f:0});S.genX=S.plats[0].x+S.plats[0].w;S.lastTop=LH-48;continue}
 const w=(3+Math.floor(r()*6))*B;let top=clamp(S.lastTop+(Math.floor(r()*5)-2)*B,LH-112,LH-32);
 const dh=(S.lastTop-top)/B;const gap=(dh>=2?1:1+Math.floor(r()*3))*B;const x=S.genX+gap;S.plats.push({x,y:top,w,f:0});
 S.genX=x+w;S.lastTop=top}
 S.plats=S.plats.filter(p=>p.x+p.w>S.camX-400)}
function onLine(words,t){if(t<start-TRANS||t>=ERAS[2].start)return;let x=S.camX+LW-30;gen(x+700);S.coins=S.coins.filter(c=>c.got||c.x>S.camX-50);S.line=[];words.forEach((w,i)=>{const wd=w.length*6;const pl=S.plats.find(q=>x+wd/2>=q.x&&x+wd/2<=q.x+q.w);const top=pl?pl.y:S.lastTop;S.coins.push({x,y:top-30-(i%2)*14,w:wd,text:w,got:0});x+=wd+26})}
function init(t){S.rng=rngf(21);S.plats=[];S.coins=[];S.line=[];S.genX=0;S.lastTop=LH-48;S.score=0;S.coinsGot=0;S.camX=Math.max(0,t-start)*SPEED;gen(S.camX+LW+64);
 const px=S.camX+PX;const p=S.plats.find(q=>px>=q.x&&px<=q.x+q.w)||S.plats[0];S.pl={x:px,y:p.y,vy:0,ground:true,sq:0}}
function update(dt,t,inp,auto){if(t<start-TRANS||t>=ERAS[2].start)return;const sp=SPEED*(inp.right?1.25:inp.left?.8:1);S.camX+=sp*dt;gen(S.camX+LW+64);const p=S.pl;p.x=S.camX+PX;
 const canJump=t>start+1.5;const under=S.plats.filter(q=>p.x+2>=q.x&&p.x-2<=q.x+q.w);
 if(p.ground&&!under.find(q=>Math.abs(q.y-p.y)<1))p.ground=false;
 let want=false;if(canJump){if(auto){const cur=under.find(q=>Math.abs(q.y-p.y)<1);if(cur){const next=S.plats.find(q=>q.x>cur.x);const toEdge=cur.x+cur.w-p.x;if(toEdge<28&&next&&next.y<=cur.y+B*2)want=true;if(next&&next.y<cur.y&&next.x-p.x<40&&toEdge<48)want=true;
   if(!want&&S.coins.some(c=>!c.got&&c.x+c.w/2>p.x&&c.x+c.w/2-p.x<34&&c.y<p.y-26))want=true}}else if(inp.jump)want=true}
 if(want&&p.ground){p.vy=JV;p.ground=false;blip(660,0.08)}
 if(!p.ground){const oy=p.y;p.vy+=G*dt;p.y+=p.vy*dt;if(p.vy>0)for(const q of under){if(oy<=q.y+0.01&&p.y>=q.y){p.y=q.y;p.vy=0;p.ground=true;q.f=0.25;p.sq=0.15;hat(false);break}}}
 if(p.y>LH+30){const next=S.plats.find(q=>q.x>p.x)||S.plats[S.plats.length-1];p.y=next.y-40;p.vy=0;S.camX=next.x+8-PX;p.x=S.camX+PX}
 for(const c of S.coins){if(!c.got&&p.x>c.x-6&&p.x<c.x+c.w+6&&Math.abs(c.y-(p.y-8))<14){c.got=0.001;S.coinsGot++;S.score+=10;S.line.push(c.text);blip(1320,0.06)}if(c.got)c.got+=dt}
 S.coins=S.coins.filter(c=>c.x+c.w>S.camX-50&&c.got<0.4);for(const q of S.plats)q.f=Math.max(0,q.f-dt);p.sq=Math.max(0,p.sq-dt)}
function ridge(x,off,col,baseY,amp,f1,f2,abs){x.fillStyle=col;x.beginPath();x.moveTo(0,LH);for(let sx=0;sx<=LW;sx+=4){const wx=sx+off;let h=Math.sin(wx*f1)*amp+Math.sin(wx*f2)*amp*0.5;if(abs)h=Math.abs(h);x.lineTo(sx,baseY-h)}x.lineTo(LW,LH);x.closePath();x.fill()}
function draw(x,t){const pulse=1-((t/BEAT)%1),cam=S.camX;
 const sky=['#1b2a6b','#2b4aa6','#3c6fd6','#5a9af0','#89c3ff','#bfe3ff'];for(let i=0;i<6;i++){x.fillStyle=sky[i];x.fillRect(0,i*24,LW,25);x.fillStyle=sky[Math.min(5,i+1)];for(let px=(i%2);px<LW;px+=2)x.fillRect(px,i*24+23,1,1)}
 x.fillStyle='#fff3b0';x.beginPath();x.arc(250,38,14,0,7);x.fill();x.fillStyle='#ffd23f';x.beginPath();x.arc(250,38,11,0,7);x.fill();
 ridge(x,cam*0.1,'#24357a',96,22,0.013,0.031,true);ridge(x,cam*0.3,'#2f8a4a',128,12,0.02,0.047,false);
 for(let i=Math.floor(cam*0.6/40)-1;i<Math.floor(cam*0.6/40)+10;i++){if(hash(i)>0.65)continue;const sx=i*40-cam*0.6+hash(i*3)*20;const h=18+hash(i*7)*14;x.fillStyle='#5a3a1e';x.fillRect(sx-1,LH-22,3,8);x.fillStyle='#1f6b35';x.beginPath();x.moveTo(sx+0.5,LH-22-h);x.lineTo(sx-8,LH-20);x.lineTo(sx+9,LH-20);x.fill()}
 x.fillStyle='#3a7a2a';x.fillRect(0,LH-20,LW,20);
 for(const q of S.plats){const sx=Math.round(q.x-cam);if(sx>LW||sx+q.w<0)continue;x.fillStyle='#8a4a22';x.fillRect(sx,q.y+4,q.w,LH-q.y);x.fillStyle='#5d2e12';for(let yy=q.y+12;yy<LH;yy+=8)x.fillRect(sx,yy,q.w,1);for(let xx=sx;xx<sx+q.w;xx+=16)x.fillRect(xx,q.y+4,1,LH-q.y);
  const g=q.f>0?lerp(0.6,1,q.f/0.25):0.25+0.35*pulse;x.fillStyle=`rgb(${Math.round(lerp(79,220,g))},${Math.round(lerp(184,255,g))},${Math.round(lerp(74,190,g))})`;x.fillRect(sx,q.y,q.w,4);x.fillStyle='#2e7a2a';x.fillRect(sx,q.y+4,q.w,1)}
 x.font="6px 'Press Start 2P',monospace";for(const c of S.coins){const sx=Math.round(c.x-cam);if(sx>LW||sx+c.w<0)continue;if(c.got){x.globalAlpha=1-c.got/0.4;x.fillStyle='#fff';x.fillText(c.text,sx,c.y-c.got*50);x.globalAlpha=1;continue}const bob=Math.sin(t*6+c.x*0.05)*2;x.fillStyle='rgba(0,0,0,.45)';x.fillRect(sx-3,c.y-8+bob,c.w+6,11);x.fillStyle=Math.floor(t/(BEAT/2))%2?'#ffd23f':'#ffef9a';x.fillText(c.text,sx,c.y+bob)}
 const p=S.pl,sx=Math.round(p.x-cam-6),sy=Math.round(p.y-16);
 if(t<start+1.5){if(Math.floor(t*20)%3!==0)pix(x,E1.SHIP,sx+1,sy+8,'#5bff5b',1)}else pix(x,DUDE[p.ground?Math.floor(t/(BEAT/2))%2:1],sx,sy+(p.sq>0?2:0),PAL);
 x.font="6px 'Press Start 2P',monospace";x.fillStyle='#fff';x.fillText('SCORE '+S.score,6,26);x.fillStyle='#ffd23f';x.fillText('WORDS '+S.coinsGot,LW-76,26);if(S.line.length){x.textAlign='center';x.fillStyle='#ffef9a';x.fillText(S.line.join(' '),LW/2,40);x.textAlign='left'}}
return{init,onLine,update,draw,DUDE,PAL}})();
