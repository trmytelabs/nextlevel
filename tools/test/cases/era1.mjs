// Era 1 cases (CASES.md E1.1–E1.6 + a manual-play sanity check). The arcade lyric crawl: src/era1.ts, bars 0–19.
// Probe fields come from era1's S: ship{x,y,dead,deadT,inv}, bul#, lines#, debris# (only once shattered), pops#,
// score, chips, kills (words chipped away), oneShot (words killed by their first hit), deaths, seq (lines), words.
const BAR=60/128*4,bar=b=>b*BAR;
const NOINP={left:false,right:false,up:false,down:false,fire:false,jump:false,upEdge:false,mv:{x:0,y:0}};
const LINE1='One form, one desk, one line to hold';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// main.ts:56 only calls dispatchLine while `playing` is true, and the harness runs paused, so ETM.step never feeds a
// lyric line to any era. Until main.ts is fixed, make `playing` true for the synchronous duration of each step (the
// rAF loop cannot interleave, so the clock is untouched).
const SHIM=`if(!ETM.__lyricShim){const s=ETM.step;ETM.step=secs=>{ETM.setPlaying(true);try{s(secs)}finally{ETM.setPlaying(false)}};ETM.__lyricShim=true}`;
// Drive era 1 directly (autopilot off, no input) from the first lyric line, cannon parked at x0, for `secs`; returns
// every dead/alive transition plus a few geometry facts. Constants mirror src/era1.ts (ZFAR/ZNEAR/TRAVEL/ROWD/F/VPY).
async function driveLine(page,x0,secs,drawAt){return page.evaluate(async(x0,secs,drawAt,line,inp)=>{
 const [{E1},{lo1}]=await Promise.all([import(new URL('src/era1.ts',location.href).href),import(new URL('src/core.ts',location.href).href)]);
 const BAR=60/128*4,dt=1/60,ZFAR=112,ZNEAR=18,TRAVEL=BAR*2.6,ROWD=0.56,F=4000,VPY=30;const t0=2*BAR;let t=t0;
 E1.init(t);E1.onLine(line.split(' '),t);const S=E1.S;S.ship.x=x0;
 const ev=[],ships=[];let prev=false;
 const green=()=>{const d=lo1.x.getImageData(Math.round(S.ship.x),Math.round(S.ship.y),18,8).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+1]>200&&d[i]<150)n++;return n};
 for(let i=0;i<Math.round(secs*60);i++){t+=dt;E1.update(dt,t,inp,false);
  if(S.ship.dead!==prev){prev=S.ship.dead;const ln=S.lines[0];const zb=ln?ZFAR-(t-ln.t0)/TRAVEL*(ZFAR-ZNEAR):null;ev.push({t:+(t-t0).toFixed(3),dead:S.ship.dead,inv:+S.ship.inv.toFixed(2),x:S.ship.x,lines:S.lines.length,debris:!!S.debris,zNear:zb,zFar:zb==null?null:zb+ln.bh*ROWD,shipZ:[F/(S.ship.y+7-VPY),F/(S.ship.y+1-VPY)]})}
  if(drawAt&&ev.length&&!S.ship.dead&&S.ship.inv>0&&ships.length<2){const ph=Math.floor(t*20)%2;if(!ships.some(s=>s.ph===ph)){E1.draw(lo1.x,t);ships.push({ph,green:green()})}}}
 return{ev,deaths:S.deaths,debris:!!S.debris,lines:S.lines.length,words:S.words,ships,x:S.ship.x,y:S.ship.y}},x0,secs,drawAt,LINE1,NOINP)}

export default [
 {name:'E1.0 ETM.step dispatches lyric lines (main.ts)',era:1,bar:0,fn:async(p,h,page)=>{
  const seq=await page.evaluate(t=>{ETM.seek(2.2*1.875);ETM.step(0.3);const s=ETM.probe().e1.seq;ETM.seek(t);return s},p.t);
  return seq>0||'no lyric line reached E1.onLine during ETM.step: main.ts:56 gates dispatchLine on `playing` (harness runs paused); shimmed for the rest of this run'}},

 {name:'E1.1 title card bars 0-2, crawl word on screen by bar 3.5',era:1,bar:3.5,fn:async(p,h,page)=>{
  const early=h.filter(x=>x.bar<2);if(!early.length)return 'no probes before bar 2';
  const e=early.find(x=>x.p.e1.seq>0||x.p.e1['lines#']>0);if(e)return `crawl words already exist at bar ${e.bar} (title card should be clean)`;
  await page.screenshot({path:'tools/test/shots/era1-bar3.5-crawl.png'});
  return (p.e1['lines#']>=1&&p.e1.words>=1)||`no crawl words at bar ${p.bar.toFixed(2)} (lines# ${p.e1['lines#']}, words ${p.e1.words})`}},

 {name:'E1.1b crawl screenshot bar 6.5',era:1,bar:6.5,fn:async(p,h,page)=>{await page.screenshot({path:'tools/test/shots/era1-bar6.5.png'});return true}},
 {name:'E1.1c crawl screenshot bar 12.5',era:1,bar:12.5,fn:async(p,h,page)=>{await page.screenshot({path:'tools/test/shots/era1-bar12.5.png'});return true}},
 {name:'E1.1d shatter screenshot bar 17.2',era:1,bar:17.2,fn:async(p,h,page)=>{await page.screenshot({path:'tools/test/shots/era1-bar17.2-shatter.png'});return (p.e1['debris#']>0&&p.e1['lines#']===0)||`at bar ${p.bar.toFixed(2)} debris#=${p.e1['debris#']} lines#=${p.e1['lines#']}`}},

 {name:'E1.2 every lyric line with bar<19 becomes crawl words',era:1,bar:'end',fn:async(p,h,page)=>{
  const exp=(await import('node:fs')).readFileSync(new URL('../../../src/core.ts',import.meta.url),'utf8').replace(/\r/g,'').split('\n').map(l=>l.match(/^\[([\d.]+),"(.*)"\],?\]?;?$/)).filter(Boolean).map(m=>[+m[1],m[2]]).filter(l=>l[0]<19).map(l=>l[1].split(' ').length);
  if(typeof exp==='string')return 'could not import core.ts: '+exp;
  const n=exp.reduce((a,b)=>a+b,0);
  return (p.e1.seq===exp.length&&p.e1.words===n)||`${p.e1.seq} lines / ${p.e1.words} words reached the crawl, expected ${exp.length} / ${n}`}},

 {name:'E1.3 autopilot chips pixels: chips/score rise, no word deleted by a single hit',era:1,bar:'end',fn:(p,h)=>{
  const e=h.filter(x=>x.era===0).map(x=>x.p.e1),last=e[e.length-1];
  if(!(last.chips>=20))return `only ${last.chips} chips over the era`;
  if(!(last.score>0))return 'score is 0';
  for(let i=1;i<e.length;i++)if(e[i].chips<e[i-1].chips)return 'chips decreased';
  if(last.oneShot>0)return `${last.oneShot} of ${last.kills} word kills happened on the word's first hit`;
  if(last.kills*3>last.chips)return `${last.kills} kills for ${last.chips} chips: words vanish too fast`;
  return true}},

 {name:'E1.4 cannon dies only on pixel overlap; respawn <=0.7 s with blink; a death never shatters the crawl',era:1,bar:'end',fn:async(p,h,page)=>{
  const early=h.find(x=>x.bar<17&&x.p.e1['debris#']!==undefined);if(early)return `shatter/debris at bar ${early.bar} (<17) — a death triggered the bar-17 shatter`;
  const t=p.t;
  const c=await driveLine(page,231,8.5,true);   // cannon centred under the line
  const l=await driveLine(page,6,8.5,false);    // cannon parked far left, outside the text block
  await page.evaluate(t=>ETM.seek(t),t);
  if(c.deaths<1||!c.ev.length)return `no death with the cannon centred under "${LINE1}" (ev ${JSON.stringify(c.ev)})`;
  if(l.deaths!==0)return `${l.deaths} death(s) with the cannon parked at x=6, outside every word`;
  for(let i=0;i<c.ev.length;i++){const e=c.ev[i];
   if(e.dead){if(!(e.zNear!=null&&e.zNear<=e.shipZ[1]+0.01&&e.zFar>=e.shipZ[0]-0.01))return `death at +${e.t}s while block z [${e.zNear&&e.zNear.toFixed(1)},${e.zFar&&e.zFar.toFixed(1)}] does not cover ship z [${e.shipZ.map(z=>z.toFixed(1))}]`;
    if(e.debris||e.lines===0)return `death at +${e.t}s wiped the crawl (lines ${e.lines}, debris ${e.debris})`;
    const r=c.ev[i+1];if(!r)return `died at +${e.t}s and never respawned`;
    if(!(r.t-e.t>0.69&&r.t-e.t<=0.75))return `respawn took ${(r.t-e.t).toFixed(2)} s`;
    if(!(r.inv>0))return 'respawned without invulnerability/blink';
    if(Math.abs(r.x-231)>0.5)return `respawned at x=${r.x}, expected centre`}}
  if(c.ships.length<2)return 'could not sample both blink phases';
  const [a,b]=c.ships;if(!((a.green===0)!==(b.green===0)))return `blink: ship pixels ${a.green} / ${b.green} in the two phases`;
  if(c.debris)return 'crawl shattered before bar 17';
  return true}},

 {name:'E1.5 shatter at bar 17 clears words before 19; era 1 is frozen after bar 19',era:1,bar:'end',fn:async(p,h,page)=>{
  const after=h.filter(x=>x.bar>=17.1&&x.bar<19);if(!after.length)return 'no probes between bars 17.1 and 19';
  const bad=after.find(x=>x.p.e1['lines#']!==0||x.p.e1['debris#']===undefined);
  if(bad)return `bar ${bad.bar}: lines#=${bad.p.e1['lines#']} debris#=${bad.p.e1['debris#']}`;
  if(!(p.e1['lines#']===0&&p.e1.ship.dead===false))return `at the era end lines#=${p.e1['lines#']} dead=${p.e1.ship.dead}`;
  const t=p.t;
  const same=await page.evaluate(()=>{ETM.seek(19.05*1.875);ETM.step(0.05);const a=JSON.stringify(ETM.probe().e1);ETM.step(1);const b=JSON.stringify(ETM.probe().e1);return a===b?true:a+' -> '+b});
  await page.screenshot({path:'tools/test/shots/era1-bar19.5-after.png'});
  await page.evaluate(t=>ETM.seek(t),t);
  return same===true||'era 1 state kept updating after bar 19: '+same}},

 {name:'E1.6 letters >=10 px tall near the bottom of the 480x270 canvas',era:1,bar:'end',fn:async(p,h,page)=>{
  const t=p.t;
  const r=await page.evaluate(async(line,inp)=>{
   const [{E1},{lo1}]=await Promise.all([import(new URL('src/era1.ts',location.href).href),import(new URL('src/core.ts',location.href).href)]);
   const BAR=60/128*4,dt=1/60;let t=2*BAR;E1.init(t);E1.onLine(line.split(' '),t);E1.S.ship.x=6;
   const out=[];
   for(const stop of [3.5,4.5,5.3]){while(t<2*BAR+stop){t+=dt;E1.update(dt,t,inp,false)}E1.draw(lo1.x,t);
    const d=lo1.x.getImageData(0,44,480,226).data,rows=[];
    for(let y=0;y<226;y++){let n=0;for(let x=0;x<480;x++){const i=(y*480+x)*4;if(d[i]>200&&d[i+1]>170&&d[i+2]<120)n++}rows.push(n)}
    let best=0,cur=0,end=0;for(let y=0;y<226;y++){if(rows[y]>=3){cur++;if(cur>best){best=cur;end=y+44}}else cur=0}
    out.push({at:+stop.toFixed(1),tallest:best,bottom:end})}
   return out},LINE1,NOINP);
  await page.evaluate(t=>ETM.seek(t),t);
  const ok=r.filter(x=>x.tallest>=10&&x.bottom>120);
  return ok.length>=2||'tallest glyph run per sample: '+JSON.stringify(r)}},

 {name:'E1.7 manual play: A/D move the cannon, space fires (autopilot off)',era:1,bar:'end',fn:async(p,h,page)=>{
  await page.evaluate(()=>{ETM.setAuto('off');ETM.seek(2.2*1.875);ETM.setPlaying(true)});
  await sleep(150);const e0=await page.evaluate(()=>ETM.probe().e1);
  await page.keyboard.down('a');await sleep(600);await page.keyboard.up('a');const e1=await page.evaluate(()=>ETM.probe().e1);
  await page.keyboard.down('d');await sleep(600);await page.keyboard.up('d');const e2=await page.evaluate(()=>ETM.probe().e1);
  let fired=0;for(let i=0;i<4;i++){await page.keyboard.press(' ');await sleep(50);const q=await page.evaluate(()=>ETM.probe().e1);if(q['bul#']>0)fired++;await sleep(150)}
  const q=await page.evaluate(()=>{const q=ETM.probe();ETM.setPlaying(false);ETM.setAuto('on');return q});
  if(!(q.t>bar(2.2)+1))return `clock did not advance in real time (t=${q.t.toFixed(2)})`;
  if(!(e1.ship.x<e0.ship.x-40))return `A did not move the cannon left (${e0.ship.x.toFixed(0)} -> ${e1.ship.x.toFixed(0)})`;
  if(!(e2.ship.x>e1.ship.x+40))return `D did not move the cannon right (${e1.ship.x.toFixed(0)} -> ${e2.ship.x.toFixed(0)})`;
  if(fired<3)return `space fired a bullet on only ${fired}/4 presses`;
  return true}},
];
