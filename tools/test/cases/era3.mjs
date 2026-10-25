// Era 3 (Saturn racer) cases E3.1–E3.6.
// main.ts only dispatches lyric lines while `playing` is true, and the harness steps with playing=false, so the
// harness history never has any era-3 words. These cases replay bars 37→56 in-page with playing=true inside
// synchronous evaluate blocks (no rAF frame can interleave), collect probes every simulated second, take their own
// screenshots, then seek back to where the harness was. The replay runs once and is shared by all cases.
const BAR=60/128*4,SHOTS='tools/test/shots';
let runP=null;
const run=(page,p0)=>runP||(runP=(async()=>{
 const seg=(toBar)=>page.evaluate((toBar,BAR)=>{ETM.setPlaying(true);const out=[];let guard=0;while(ETM.now()<toBar*BAR-1e-6&&guard++<200){ETM.step(Math.min(1,toBar*BAR-ETM.now()));out.push(ETM.probe())}ETM.setPlaying(false);return out},toBar,BAR);
 await page.evaluate(BAR=>{ETM.setPlaying(true);ETM.seek(37*BAR);ETM.setPlaying(false)},BAR);
 const probes=[],shots={};
 const readHud=()=>page.evaluate(()=>{const c=document.querySelector('#c');const x=c.getContext('2d');const sx=c.width/960,sy=c.height/540;const cnt=(x0,y0,x1,y1,test)=>{const d=x.getImageData(Math.floor(x0*sx),Math.floor(y0*sy),Math.ceil((x1-x0)*sx),Math.ceil((y1-y0)*sy)).data;let n=0;for(let i=0;i<d.length;i+=4)if(test(d[i],d[i+1],d[i+2]))n++;return n};
  const yellow=(r,g,b)=>r>200&&g>180&&b<160,white=(r,g,b)=>r>225&&g>225&&b>225,cyan=(r,g,b)=>r<140&&g>200&&b>220;
  return{pos:cnt(18,74,220,90,yellow),score:cnt(18,96,220,110,white),words:cnt(18,114,340,128,cyan),kmh:cnt(720,76,942,94,yellow),lap:cnt(840,98,942,112,white)}});
 let hud=null;
 for(const b of [37.6,46.5,51,55.6,56]){probes.push(...await seg(b));if(b<56){await page.evaluate(()=>ETM.render());const f=`${SHOTS}/era3-words-${b}.png`;await page.screenshot({path:f});shots[b]=f;if(b===51)hud=await readHud()}}
 await page.evaluate(t=>ETM.seek(t),p0.t);
 return{probes,shots,hud}})());
const e3=h=>h.map(p=>p.e3).filter(Boolean);
export default [
 {name:'E3.1 GL renderer initialised, car models available',era:3,bar:'end',fn:async(p,h,page)=>{if(p.gl.e3!==true)return'gl.e3='+p.gl.e3;const m=await page.evaluate(()=>fetch(document.baseURI.replace(/[^/]*$/,'')+'models/car_0.glb',{method:'HEAD'}).then(r=>r.ok&&!/text\/html/.test(r.headers.get('content-type')||'')).catch(()=>false));return m||'public/models/car_0.glb not served (procedural loft fallback in use)'}},
 {name:'E3.2 lyric words fly in and >=70% are collected',era:3,bar:'end',fn:async(p,h,page)=>{const {probes}=await run(page,p);const s=e3(probes);const last=s[s.length-1];const seen=s.some(x=>x['lyr#']>0);if(!seen)return'no words ever in flight (lyr# always 0)';const decided=last.words+last.missed;if(!decided)return`no word reached the player (spawned ${last.spawned}, in flight ${last['lyr#']})`;const r=last.words/decided;return r>=0.7||`collected ${last.words}/${decided} (${(r*100).toFixed(0)}%), spawned ${last.spawned}, missed ${last.missed}`}},
 {name:'E3.3 overtakes happen, bumps bounded, position 1..13',era:3,bar:'end',fn:async(p,h,page)=>{const {probes}=await run(page,p);const s=e3(probes);const last=s[s.length-1];const inc=s.some((x,i)=>i&&x.passes>s[i-1].passes);if(!inc)return'passes never increased';if(last.bumps>=25)return`bumps ${last.bumps}`;const bad=s.find(x=>1+12-x.passes<1||1+12-x.passes>13);if(bad)return`position out of range at bar ${bad.bar}`;const over=s.find(x=>x.overtakes!=null&&x.passes>x.overtakes);return !over||`net passes ${over.passes} > overtakes ${over.overtakes} at bar ${over.bar}`}},
 {name:'E3.4 player stays on the road |x|<=0.9',era:3,bar:'end',fn:async(p,h,page)=>{const {probes}=await run(page,p);const all=[...e3(probes),...e3(h.filter(x=>x.era===2).map(x=>x.p))];const bad=all.find(x=>Math.abs(x.x)>0.9+1e-6);return !bad||`x=${bad.x.toFixed(3)} at s=${bad.s.toFixed(0)}`}},
 {name:'E3.5 HUD shows POS / SCORE / LINES / KM/H / LAP',era:3,bar:'end',fn:async(p,h,page)=>{const {hud}=await run(page,p);const miss=Object.entries(hud).filter(([k,v])=>v<20).map(([k,v])=>k+'='+v);return !miss.length||'HUD text pixels missing: '+miss.join(' ')}},
 {name:'E3.6 chase camera stable, screenshots for visual review',era:3,bar:'end',fn:async(p,h,page)=>{const {probes,shots}=await run(page,p);const s=e3(probes);const nan=s.find(x=>x.bad&&x.bad.length);if(nan)return'NaN at bar '+nan.bar;const back=s.find((x,i)=>i&&x.s<s[i-1].s);if(back)return'player moved backwards at bar '+back.bar;console.log('      era3 shots: '+Object.values(shots).join(', '));return true}},
 {name:'E3.7 autopilot takes every lyric line it is given (taken = spawned) with at most 1 bump',era:3,bar:'end',fn:async(p,h,page)=>{const {probes}=await run(page,p);const s=e3(probes);const last=s[s.length-1];console.log(`      era3 lines ${last.words}/${last.spawned}, missed ${last.missed}, bumps ${last.bumps}`);if(last.spawned<8)return`only ${last.spawned} lines spawned`;if(last.words!==last.spawned)return`took ${last.words}/${last.spawned} lines (missed ${last.missed})`;return last.bumps<=1||`bumps ${last.bumps}`}},
];
