// Era 2 (16-bit platformer, src/era2.ts, bars 19-37) cases E2.1-E2.6.
// The harness steps in chunks, so these cases replay bars 19 -> 37 in-page one 60 Hz frame at a time (autopilot on),
// checking the runner after every frame against the level in ETM.raw.e2(): standing only on a solid top, every airborne
// frame part of a ballistic arc, the body never inside a brick, pipe or ledge. The replay runs once, is shared by all
// cases, takes its own screenshots, and seeks back to where the harness was. Constants mirror src/era2.ts.
const BAR=60/128*4,SHOTS='tools/test/shots';
let runP=null;
const run=(page,p0)=>runP||(runP=(async()=>{
 await page.evaluate(BAR=>{ETM.seek(19*BAR);window.__e2={frames:0,air:0,steer:0,ground:[],arc:[],clip:[],prev:null}},BAR);
 const seg=toBar=>page.evaluate((toBar,BAR)=>{const R=window.__e2,G=900,JV=-380,dt=1/60,LH=180;
  const at=()=>(ETM.now()/BAR).toFixed(2);
  while(ETM.now()<toBar*BAR-1e-6){ETM.step(dt);const S=ETM.raw.e2(),p=S.pl,q0=R.prev;R.frames++;if(S.steer!==1)R.steer++;
   if(!p.dead){
    if(p.ground){const ok=S.plats.some(q=>q.kind!=='brick'&&p.x+2>=q.x&&p.x-2<=q.x+q.w&&Math.abs(q.y-p.y)<1);if(!ok&&R.ground.length<20)R.ground.push(at()+' y'+p.y.toFixed(1))}
    else{R.air++;
     // an airborne frame continues the previous arc (vy grows by G*dt), or starts one: jump, run-off, bump, stomp, hit, drop-in
     const cont=q0&&!q0.dead&&!q0.ground&&Math.abs(p.vy-(q0.vy+G*dt))<0.01;
     const start=q0&&(q0.dead||(q0.ground&&(Math.abs(p.vy-(JV+G*dt))<0.01||Math.abs(p.vy-G*dt)<0.01)))||[90,-230,-330,-160].some(v=>Math.abs(p.vy-v)<0.01);
     if(!cont&&!start&&R.arc.length<20)R.arc.push(at()+' vy'+p.vy.toFixed(1)+' prev '+(q0?q0.vy.toFixed(1)+(q0.ground?'g':''):'-'))}
    for(const q of S.plats){if(q.broken)continue;let c;
     if(q.kind==='brick')c=p.x+5>q.x&&p.x-5<q.x+q.w&&p.y-24<q.y+(q.h||16)-1&&p.y>q.y+2;
     else{const bot=q.kind==='pipe'?q.y+q.h:q.kind==='grass'?q.y+20:LH;c=p.x+4>q.x&&p.x-4<q.x+q.w&&p.y>q.y+2&&p.y-24<bot}
     if(c){if(R.clip.length<20)R.clip.push(at()+' '+q.kind+' dx'+(p.x-q.x).toFixed(0)+' y'+p.y.toFixed(0));break}}}
   R.prev={vy:p.vy,ground:p.ground,dead:p.dead}}
  return ETM.probe().e2},toBar,BAR);
 const shots={};let e2=null;
 for(const b of [24,30,36.95]){e2=await seg(b);if(b<36){await page.evaluate(()=>ETM.render());const f=`${SHOTS}/era2-play-${b}.png`;await page.screenshot({path:f});shots[b]=f}}
 const R=await page.evaluate(()=>{const R=window.__e2;delete R.prev;return R});
 await page.evaluate(t=>ETM.seek(t),p0.t);
 return{R,e2,shots}})());

export default [
 {name:'E2.1 autopilot pops >=80% of the lyric phrases',era:2,bar:'end',fn:async(p,h,page)=>{const {e2}=await run(page,p);
  const r=e2.coinsGot/Math.max(1,e2.coinsAll);return (e2.coinsAll>=24&&r>=0.8)||`popped ${e2.coinsGot}/${e2.coinsAll} (${(r*100).toFixed(0)}%)`}},
 {name:'E2.2 runner never above the ground without being in a jump',era:2,bar:'end',fn:async(p,h,page)=>{const {R}=await run(page,p);
  return (!R.ground.length&&!R.arc.length)||('standing on nothing: '+R.ground.slice(0,5).join(', ')+' | arc breaks: '+R.arc.slice(0,5).join(', '))}},
 {name:'E2.3 runner never clips through a brick, pipe or ledge',era:2,bar:'end',fn:async(p,h,page)=>{const {R}=await run(page,p);
  return !R.clip.length||('clipping at '+R.clip.slice(0,6).join(', '))}},
 {name:'E2.4 autopilot run is clean: <=1 death, some stomps, steering used sparingly',era:2,bar:'end',fn:async(p,h,page)=>{const {R,e2}=await run(page,p);
  if(e2.deaths>1)return'deaths '+e2.deaths;if(e2.stomps<1)return'no stomps';const st=R.steer/R.frames;return st<0.35||`speed steering on ${(st*100).toFixed(0)}% of frames (looks robotic)`}},
 {name:'E2.5 phrase blocks float above the ground and are not standable',era:2,bar:30,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{const S=ETM.raw.e2();const g=S.plats.filter(q=>q.kind==='ground');const b=S.plats.filter(q=>q.kind==='brick');
   const bad=b.filter(q=>!g.some(o=>q.x+8>=o.x&&q.x+8<=o.x+o.w&&o.y-q.y===56));return{n:b.length,bad:bad.map(q=>Math.round(q.x)+'@'+q.y)}});
  return (r.n>0&&!r.bad.length)||(r.n?'bricks not 56 px over ground: '+r.bad.join(' '):'no bricks on screen')}},
 {name:'E2.6 screenshots of autopilot play',era:2,bar:'end',fn:async(p,h,page)=>{const {shots}=await run(page,p);return Object.keys(shots).length===2||'missing screenshots'}},
];
