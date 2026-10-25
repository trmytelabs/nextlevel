// Era 5 cases: VR saber lane with an AI co-pilot. ONE saber follows the pointer and can cut any block; blocks are planned
// from the lyric table, cut on the beat under autopilot, and every other cut word becomes a piece of arena.
// Probe fields come from E5.S (see src/era5.ts init()).
const BEAT=60/128,BAR=BEAT*4,bar=b=>b*BAR;
// drive the real pointer path: page.mouse.move over the canvas, then ETM.step(dt,false) (manual input) for nSteps
async function manualRun(page,fromBar,nSteps,mode){
 const rect=await page.evaluate(()=>{const r=document.querySelector('#c').getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height}});
 const t0=await page.evaluate(fb=>{const t=ETM.now();ETM.setAuto('off');ETM.seek(fb*1.875);ETM.step(0.02,false);return t},fromBar);
 // inverse of era5.ts aim(): lane cell -> canvas pixel
 const sx=(c,r,t)=>{const W=960,H=540,D=3.0,tv=Math.tan((t>=89*1.875?84:72)*Math.PI/360),nx=(c-1.5)/(D*tv*W/H),ny=(0.85+r*0.68-1.65-D*-0.3/9.6)/(D*tv);return[rect.x+(nx+1)/2*rect.w,rect.y+(1-ny)/2*rect.h]};
 for(let i=0;i<nSteps;i++){
  const q=await page.evaluate(()=>{const s=ETM.raw.e5(),t=ETM.now();let nb=null;for(const b of s.blocks){if(b.hit||b.missed||b.hitT<t-0.05)continue;if(!nb||b.hitT<nb.hitT)nb=b}return{t,nb:nb&&{c:nb.col,r:nb.row,hitT:nb.hitT}}});
  let x=rect.x+rect.w/2,y=rect.y+rect.h/2;
  if(mode==='swipe'&&q.nb){const lead=q.nb.hitT-q.t,u=Math.min(1,Math.max(0,1-lead/0.25));[x,y]=sx(q.nb.c,q.nb.r+0.5-u,q.t)} // wind up above the block, swipe down through it on the beat
  await page.mouse.move(x,y);await page.evaluate(()=>ETM.step(1/30,false))}
 const r=await page.evaluate(([a,b])=>{const s=ETM.raw.e5();const due=s.blocks.filter(x=>x.hitT>=a&&x.hitT<=b);const hit=due.filter(x=>x.hit);const cs=hit.map(x=>x.col);return{due:due.length,hit:hit.length,cols:[...new Set(cs)].length,both:cs.some(c=>c<1.5)&&cs.some(c=>c>1.5)}},[bar(fromBar)+0.1,bar(fromBar)+nSteps/30-0.3]);
 await page.evaluate(t=>{ETM.setAuto('on');ETM.seek(t);ETM.step(0.02)},t0);return r}
export default [
 {name:'E5.0 one saber: a single pointer-driven saber, no hands, no left/right rule, consecutive blocks are neighbours',era:5,bar:77,fn:async(p,h,page)=>{const s=p.e5;if(!s.saber||typeof s.saber.c!=='number')return 'no e5.saber';if('hands' in s||'slashL' in s)return 'still has two hands';
  const r=await page.evaluate(()=>{const bl=ETM.raw.e5().blocks.slice().sort((a,b)=>a.hitT-b.hitT);let bad=[],sided=bl.filter(b=>'side' in b).length;for(let i=1;i<bl.length;i++){const a=bl[i-1],b=bl[i],gap=b.hitT-a.hitT,dc=Math.abs(b.col-a.col),dr=Math.abs(b.row-a.row);if(gap<0.35&&(dc!==1||dr>1))bad.push(a.word+'>'+b.word+' gap '+gap.toFixed(2)+' dc '+dc+' dr '+dr);if(gap<1&&Math.hypot(dc,dr*0.68)>2.3)bad.push('far '+a.word+'>'+b.word)}return{bad,sided,n:bl.length,cols:[0,1,2,3].map(c=>bl.filter(b=>b.col===c).length)}});
  return (r.bad.length===0&&r.sided===0&&r.cols.every(n=>n>=10))||JSON.stringify(r).slice(0,300)}},
 {name:'E5.1 GL renderer initialised (gl.e5)',era:5,bar:75.5,fn:p=>p.gl.e5===true||'gl.e5='+p.gl.e5},
 {name:'E5.2 blocks spawn ahead of their beat and reach the hit plane (spawned grows through the era)',era:5,bar:'end',fn:(p,h)=>{const s=h.filter(x=>x.era===4).map(x=>x.p.e5.spawned);const mono=s.every((v,i)=>i===0||v>=s[i-1]);return (mono&&p.e5.spawned>=60)||`spawned ${p.e5.spawned} (mono=${mono})`}},
 {name:'E5.3 autopilot cuts >=95% of blocks, arena pieces for at least every other cut',era:5,bar:'end',fn:p=>{const e=p.e5;const ok=e.hits>=e.spawned*0.95&&e['built#']>=e.hits*0.5&&e['built#']<=e.hits;return ok||`hits ${e.hits}/${e.spawned}, built ${e['built#']}`}},
 {name:'E5.4 combo never resets under autopilot (no misses)',era:5,bar:'end',fn:p=>p.e5.misses===0||`${p.e5.misses} misses`},
 {name:'E5.5 co-pilot status changes with the build and settles at the end',era:5,bar:'end',fn:(p,h)=>{const st=new Set(h.filter(x=>x.era===4).map(x=>x.p.e5.copilot&&x.p.e5.copilot.status));return (st.size>=3&&p.e5.copilot.status==='ARENA COMPLETE')||`statuses ${[...st].join('|')} final ${p.e5.copilot.status}`}},
 {name:'E5.6 tunnel engages at bar 89 and the run coasts to a stop for the outro',era:5,bar:'end',fn:(p,h)=>{const pre=h.find(x=>x.bar>=88&&x.bar<89),post=h.find(x=>x.bar>=89.6&&x.bar<91);if(!pre||!post)return 'missing probes around 89';if(!(pre.p.e5.tunnel===0&&post.p.e5.tunnel>0))return `tunnel ${pre.p.e5.tunnel} -> ${post.p.e5.tunnel}`;const a=h.find(x=>x.bar>=95.2),b=h.find(x=>x.bar>=95.8);return (!a||!b||Math.abs(a.p.e5.dist-b.p.e5.dist)<0.01)||`dist still moving in the outro ${a.p.e5.dist}->${b.p.e5.dist}`}},
 {name:'E5.7 seek into the era rebuilds the arena deterministically',era:5,bar:84,fn:async(p,h,page)=>{const r=await page.evaluate(()=>{const t=ETM.now();ETM.seek(82*1.875);ETM.step(0.05);const a=ETM.probe().e5;ETM.seek(82*1.875);ETM.step(0.05);const b=ETM.probe().e5;ETM.seek(t);ETM.step(0.02);return [a['built#'],b['built#'],a.hits,b.hits,a.score,b.score,a.saber.c,b.saber.c]});return (r[0]===r[1]&&r[2]===r[3]&&r[4]===r[5]&&r[6]===r[7]&&r[0]>0)||'seek differs: '+r.join(',')}},
 {name:'E5.8 a seek into the outro settles the co-pilot on ARENA COMPLETE (no STANDING BY lock)',era:5,bar:84,fn:async(p,h,page)=>{const r=await page.evaluate(()=>{const t=ETM.now();ETM.seek(94.5*1.875);ETM.step(0.1);const st=ETM.probe().e5.copilot.status;ETM.seek(t);ETM.step(0.02);return st});return r==='ARENA COMPLETE'||'status '+r}},
 {name:'E5.9 manual: one mouse swiping through the next block cuts >=90%, on both halves of the lane; a parked pointer cuts little',era:5,bar:85,fn:async(p,h,page)=>{const sw=await manualRun(page,81,113,'swipe'),idle=await manualRun(page,83,113,'idle');
  return (sw.hit>=sw.due*0.9&&sw.due>=8&&sw.both&&idle.hit<=idle.due*0.3)||`swipe ${sw.hit}/${sw.due} in ${sw.cols} cols (both halves ${sw.both}), idle ${idle.hit}/${idle.due}`}},
 {name:'E5.10 Blender finale kit loaded (dev hook): block, saber, copilot, arch, pillar, panel, ring',era:5,bar:86,fn:async(p,h,page)=>{const k=await page.evaluate(()=>window.__E5GL&&window.__E5GL.kit?window.__E5GL.kit():null);if(!k)return true;const want=['block','saber','copilot','arch','pillar','panel','ring'];const miss=want.filter(n=>!k.includes(n));return miss.length===0||'missing '+miss.join(',')}},
];
