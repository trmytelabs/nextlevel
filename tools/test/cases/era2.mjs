// Era 2 (16-bit platformer, src/era2.ts, bars 19-37) cases E2.1-E2.10.
// The player moves freely (walk / run / skid / variable jump); the autopilot walks, waits, steers and jumps to pop every "?" block.
// E2.1-E2.7 replay bars 19 -> 37 in-page one 60 Hz frame at a time (autopilot on), checking the runner after every frame against
// the level in ETM.raw.e2(): standing only on a solid top, the body never inside a brick, pipe or step, the camera dead zone.
// The replay runs once, is shared by those cases, takes its own screenshots, and seeks back to where the harness was.
// E2.8-E2.10 are isolated manual-control checks (keyboard through page.keyboard + ETM.step(dt,false)) and a determinism check.
const BAR=60/128*4,SHOTS='tools/test/shots';
let runP=null;
const run=(page,p0)=>runP||(runP=(async()=>{
 await page.evaluate(BAR=>{ETM.setAuto('on');ETM.seek(19*BAR);window.__e2={frames:0,ground:[],clip:[],cam:[],camMin:1e9}},BAR);
 const seg=toBar=>page.evaluate((toBar,BAR)=>{const R=window.__e2,HW=5,PH=24;const at=()=>(ETM.now()/BAR).toFixed(2);
  while(ETM.now()<toBar*BAR-1e-6){ETM.step(1/60);const S=ETM.raw.e2(),p=S.pl;R.frames++;R.camMin=Math.min(R.camMin,S.camX);
   if(p.dead||p.drop)continue;
   if(p.g&&!S.plats.some(q=>!q.broken&&p.x+HW>q.x&&p.x-HW<q.x+q.w&&Math.abs(q.y-p.y)<0.5)&&R.ground.length<20)R.ground.push(at()+' y'+p.y.toFixed(1));
   for(const q of S.plats){if(q.broken)continue;if(p.x+HW>q.x+0.5&&p.x-HW<q.x+q.w-0.5&&p.y>q.y+0.5&&p.y-PH<q.y+q.h-0.5){if(R.clip.length<20)R.clip.push(at()+' '+q.kind+' dx'+(p.x-q.x).toFixed(1)+' y'+p.y.toFixed(1));break}}
   const sx=p.x-S.camX;if((sx<103.5||sx>156.5)&&S.camX>0&&R.cam.length<20)R.cam.push(at()+' sx'+sx.toFixed(1))}
  return ETM.probe().e2},toBar,BAR);
 const shots={};let e2=null;
 for(const b of [24,30,36.95]){e2=await seg(b);if(b<36){await page.evaluate(()=>ETM.render());const f=`${SHOTS}/era2-play-${b}.png`;await page.screenshot({path:f});shots[b]=f}}
 const R=await page.evaluate(()=>window.__e2);
 await page.evaluate(t=>ETM.seek(t),p0.t);
 return{R,e2,shots}})());
// manual play helpers (in-page): put the runner on a clear stretch of ground, step with the live keyboard
const manual=async(page,setup)=>page.evaluate((BAR,setup)=>{ETM.setAuto('off');ETM.setPlaying(false);ETM.seek(20*BAR);ETM.step(1/60,false);const S=ETM.raw.e2(),p=S.pl;
 if(setup){S.foes.length=0;const solid=S.plats.filter(q=>!q.broken);
  const g=S.plats.find(q=>q.kind==='ground'&&q.x>=16&&q.w>=176&&!solid.some(o=>o!==q&&o.x<q.x+q.w&&o.x+o.w>q.x&&o.y<q.y&&(o.kind==='pipe'||(setup==='jump'&&o.x<q.x+60&&o.x+o.w>q.x))));
  if(!g)return'no clear ground';Object.assign(p,{x:g.x+(setup==='jump'?30:12),y:g.y,vx:0,vy:0,g:true,on:g,run:0,jmp:false,jhp:false,buf:0,coy:0,stun:0,skid:false});S.camX=Math.max(0,p.x-120)}return'ok'},BAR,setup);
const steps=(page,n)=>page.evaluate(n=>{const out=[];for(let i=0;i<n;i++){ETM.step(1/60,false);const p=ETM.raw.e2().pl;out.push({x:p.x,y:p.y,vx:p.vx,g:p.g,skid:p.skid,dead:p.dead})}return out},n);

export default [
 {name:'E2.1 autopilot pops >=27/28 of the lyric phrases (all but one)',era:2,bar:'end',fn:async(p,h,page)=>{const {e2}=await run(page,p);
  return (e2.coinsAll>=24&&e2.coinsGot>=e2.coinsAll-1)||`popped ${e2.coinsGot}/${e2.coinsAll}`}},
 {name:'E2.2 runner only stands on a solid top',era:2,bar:'end',fn:async(p,h,page)=>{const {R}=await run(page,p);
  return !R.ground.length||('standing on nothing: '+R.ground.slice(0,5).join(', '))}},
 {name:'E2.3 side collision: the runner is never inside a brick, pipe or step (autopilot)',era:2,bar:'end',fn:async(p,h,page)=>{const {R}=await run(page,p);
  return !R.clip.length||('inside a solid at '+R.clip.slice(0,6).join(', '))}},
 {name:'E2.4 autopilot run is clean: no deaths, <=1 hit, some stomps',era:2,bar:'end',fn:async(p,h,page)=>{const {e2}=await run(page,p);
  if(e2.deaths>0)return'deaths '+e2.deaths;if(e2.hits>1)return'hits '+e2.hits;return e2.stomps>=1||'no stomps'}},
 {name:'E2.5 phrase blocks float 56 px above the ground',era:2,bar:30,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{const S=ETM.raw.e2();const g=S.plats.filter(q=>q.kind==='ground');const b=S.plats.filter(q=>q.kind==='brick'&&q.x>S.camX-20&&q.x<S.camX+340);
   const bad=b.filter(q=>!g.some(o=>q.x+8>=o.x&&q.x+8<=o.x+o.w&&o.y-q.y===56));return{n:b.length,bad:bad.map(q=>Math.round(q.x)+'@'+q.y)}});
  return (r.n>0&&!r.bad.length)||(r.n?'bricks not 56 px over ground: '+r.bad.join(' '):'no bricks on screen')}},
 {name:'E2.6 screenshots of autopilot play',era:2,bar:'end',fn:async(p,h,page)=>{const {shots}=await run(page,p);return Object.keys(shots).length===2||'missing screenshots'}},
 {name:'E2.7 camera follows with a dead zone and never scrolls left of the level start',era:2,bar:'end',fn:async(p,h,page)=>{const {R}=await run(page,p);
  if(R.camMin<0)return'camera at '+R.camMin;return !R.cam.length||('runner outside the dead zone: '+R.cam.slice(0,5).join(', '))}},
 {name:'E2.8 manual: holding right walks into walls, never through them',era:2,bar:'end',isolated:true,fn:async(p,h,page)=>{
  await manual(page,null);await page.keyboard.down('d');let r;
  try{r=await page.evaluate(BAR=>{const HW=5,PH=24,bad=[];let walls=0,maxX=-1e9,x0=ETM.raw.e2().pl.x;
   for(let i=0;i<60*8;i++){ETM.step(1/60,false);const S=ETM.raw.e2(),p=S.pl;if(p.dead||p.drop)continue;maxX=Math.max(maxX,p.x);
    for(const q of S.plats)if(!q.broken&&p.x+HW>q.x+0.5&&p.x-HW<q.x+q.w-0.5&&p.y>q.y+0.5&&p.y-PH<q.y+q.h-0.5){if(bad.length<5)bad.push(q.kind+' dx'+(p.x-q.x).toFixed(1));break}
    if(p.g&&p.vx===0&&S.plats.some(q=>Math.abs(q.x-(p.x+HW))<0.6&&q.y<p.y&&q.y+q.h>p.y-PH))walls++}
   const e=ETM.probe().e2;return{bad,walls,moved:maxX-x0,deaths:e.deaths}},BAR)}finally{await page.keyboard.up('d')}
  if(r.bad.length)return'inside a solid: '+r.bad.join(', ');if(r.moved<60)return'barely moved: '+r.moved.toFixed(0)+' px';return (r.walls>0||r.deaths>0)||'never met a wall or a pit in 8 s'}},
 {name:'E2.9 manual: hop vs full jump, walk -> run, skid on turn-around',era:2,bar:'end',isolated:true,fn:async(p,h,page)=>{
  if(await manual(page,'jump')!=='ok')return'no clear ground found';
  const y0=(await steps(page,1))[0].y;
  await page.keyboard.down('w');let a=await steps(page,1);await page.keyboard.up('w');a=a.concat(await steps(page,70));
  const hop=y0-Math.min(...a.map(s=>s.y));
  await steps(page,10);await page.keyboard.down('w');let b=await steps(page,40);await page.keyboard.up('w');b=b.concat(await steps(page,40));
  const full=y0-Math.min(...b.map(s=>s.y));
  if(!(hop>=16&&hop<=40))return'hop rise '+hop.toFixed(1)+' px (want 16-40)';if(!(full>=65))return'full jump rise '+full.toFixed(1)+' px (want >=65)';
  if(await manual(page,'run')!=='ok')return'no clear ground for running';
  await page.keyboard.down('d');const w=await steps(page,20),r=await steps(page,60);await page.keyboard.up('d');
  const vWalk=w[w.length-1].vx,vRun=r[r.length-1].vx;if(!(vWalk>=80&&vWalk<=100))return'walk speed after 1/3 s '+vWalk.toFixed(0);if(!(vRun>vWalk+30))return'no run: '+vRun.toFixed(0);
  await page.keyboard.down('a');const s=await steps(page,40);await page.keyboard.up('a');
  const sk=s.filter(q=>q.skid).length,flip=s.findIndex(q=>q.vx<0);return (sk>=5&&flip>0&&flip<30)||`skid frames ${sk}, reversed at frame ${flip}`}},
 {name:'E2.10 autopilot is deterministic',era:2,bar:'end',isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(BAR=>{ETM.setAuto('on');const one=()=>{ETM.seek(19*BAR);ETM.step(4*BAR);const S=ETM.raw.e2();return [S.pl.x.toFixed(3),S.pl.y.toFixed(3),S.coinsGot,S.stomps].join(' ')};return[one(),one()]},BAR);
  return r[0]===r[1]||'two runs differ: '+r.join(' vs ')}},
];
