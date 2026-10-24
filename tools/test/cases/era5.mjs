// Era 5 cases: VR saber lane with an AI co-pilot. Blocks are planned from the lyric table, cut on the beat under autopilot,
// and every cut word becomes a piece of arena. Probe fields come from E5.S (see src/era5.ts init()).
const BEAT=60/128,BAR=BEAT*4,bar=b=>b*BAR;
export default [
 {name:'E5.1 GL renderer initialised (gl.e5)',era:5,bar:75.5,fn:p=>p.gl.e5===true||'gl.e5='+p.gl.e5},
 {name:'E5.2 blocks spawn ahead of their beat and reach the hit plane (spawned grows through the era)',era:5,bar:'end',fn:(p,h)=>{const s=h.filter(x=>x.era===4).map(x=>x.p.e5.spawned);const mono=s.every((v,i)=>i===0||v>=s[i-1]);return (mono&&p.e5.spawned>=60)||`spawned ${p.e5.spawned} (mono=${mono})`}},
 {name:'E5.3 autopilot cuts >=95% of blocks, builds one arena piece per cut',era:5,bar:'end',fn:p=>{const e=p.e5;const ok=e.hits>=e.spawned*0.95&&e['built#']===e.hits;return ok||`hits ${e.hits}/${e.spawned}, built ${e['built#']}`}},
 {name:'E5.4 combo never resets under autopilot (no misses)',era:5,bar:'end',fn:p=>p.e5.misses===0||`${p.e5.misses} misses`},
 {name:'E5.5 co-pilot status changes with the build and settles at the end',era:5,bar:'end',fn:(p,h)=>{const st=new Set(h.filter(x=>x.era===4).map(x=>x.p.e5.copilot&&x.p.e5.copilot.status));return (st.size>=3&&p.e5.copilot.status==='ARENA COMPLETE')||`statuses ${[...st].join('|')} final ${p.e5.copilot.status}`}},
 {name:'E5.6 tunnel engages at bar 89 and the run coasts to a stop for the outro',era:5,bar:'end',fn:(p,h)=>{const pre=h.find(x=>x.bar>=88&&x.bar<89),post=h.find(x=>x.bar>=89.6&&x.bar<91);if(!pre||!post)return 'missing probes around 89';if(!(pre.p.e5.tunnel===0&&post.p.e5.tunnel>0))return `tunnel ${pre.p.e5.tunnel} -> ${post.p.e5.tunnel}`;const a=h.find(x=>x.bar>=95.2),b=h.find(x=>x.bar>=95.8);return (!a||!b||Math.abs(a.p.e5.dist-b.p.e5.dist)<0.01)||`dist still moving in the outro ${a.p.e5.dist}->${b.p.e5.dist}`}},
 {name:'E5.7 seek into the era rebuilds the arena deterministically',era:5,bar:84,fn:async(p,h,page)=>{const r=await page.evaluate(()=>{const t=ETM.now();ETM.seek(82*1.875);ETM.step(0.05);const a=ETM.probe().e5;ETM.seek(82*1.875);ETM.step(0.05);const b=ETM.probe().e5;ETM.seek(t);ETM.step(0.02);return [a['built#'],b['built#'],a.hits,b.hits,a.score,b.score]});return (r[0]===r[1]&&r[2]===r[3]&&r[4]===r[5]&&r[0]>0)||'seek differs: '+r.join(',')}},
];
