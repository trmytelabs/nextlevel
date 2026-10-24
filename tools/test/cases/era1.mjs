// Era 1 cases (CASES.md E1.1–E1.6 + a manual-play sanity check). The arcade lyric crawl: src/era1.ts, bars 0–19.
// Probe fields come from era1's S: ship{x,y,dead,deadT,inv}, bul#, lines#, debris# (only once shattered), pops#,
// score, chips, shots, kills (words chipped away), oneShot (words killed by their first hit), deaths, seq (lines), words,
// K (the perspective constants of src/era1.ts). Everything here drives the page's own build through ETM.seek/step and
// reads ETM.raw.e1(): no imports of src/*.ts, so the cases also run against vite preview, Pages and the artifact host.
const BAR=60/128*4,bar=b=>b*BAR;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Play era 1 from just before the first lyric line (bar 2) for `secs` with the cannon parked at x0 (S.park: the
// autopilot neither steers nor fires, so only the crawl moves), one ETM.step(1/60) per frame. Returns every
// dead/alive transition with the depth band of the line(s) at that moment, the ship's visible green pixels in both
// blink phases (read off the composited main canvas) when `blink`, and a few counters.
async function driveLine(page,x0,secs,blink){return page.evaluate((x0,secs,blink)=>{
 const cv=document.getElementById('c'),g=cv.getContext('2d'),k=cv.width/480;
 ETM.seek(2*1.875-3/60);ETM.step(4/60);
 const S=ETM.raw.e1(),K=S.K;S.park=x0;S.ship.x=x0;const t0=ETM.now(),line=S.lines.length?S.lines[0].words.map(w=>w.text).join(' '):'';
 const zOf=(ln,t)=>K.ZFAR-(t-ln.t0)/K.TRAVEL*(K.ZFAR-K.ZNEAR);
 const green=()=>{const x=Math.round((S.ship.x-3)*k),y=Math.round((S.ship.y-4)*k),d=g.getImageData(x,y,Math.round(24*k),Math.round(16*k)).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+1]>150&&d[i]<150&&d[i+2]<150)n++;return n};
 const ev=[],ships=[];let prev=false;
 for(let i=0;i<Math.round(secs*60);i++){const before=S.lines.map(ln=>({t0:ln.t0,bh:ln.bh}));ETM.step(1/60);const t=ETM.now();
  if(S.ship.dead!==prev){prev=S.ship.dead;
   const bands=before.map(ln=>{const zb=zOf(ln,t);return[zb,zb+ln.bh*K.ROWD]});
   ev.push({t:+(t-t0).toFixed(3),dead:S.ship.dead,inv:+S.ship.inv.toFixed(2),x:S.ship.x,lines:S.lines.length,debris:!!S.debris,bands,shipZ:[K.F/(S.ship.y+7-K.VPY),K.F/(S.ship.y+1-K.VPY)]})}
  // sample each blink phase once the death pops have faded (inv 2.6 s counts down from the respawn)
  if(blink&&ev.length&&!S.ship.dead&&S.ship.inv>0&&S.ship.inv<2.2&&ships.length<2){const ph=Math.floor(t*20)%2;if(!ships.some(s=>s.ph===ph))ships.push({ph,green:green()})}}
 S.park=null;
 return{line,ev,deaths:S.deaths,debris:!!S.debris,lines:S.lines.length,words:S.words,ships,x:S.ship.x,y:S.ship.y}},x0,secs,blink)}

export default [
 {name:'E1.0 ETM.step dispatches lyric lines (main.ts)',era:1,bar:0,fn:async(p,h,page)=>{
  const seq=await page.evaluate(t=>{ETM.seek(2.2*1.875);ETM.step(0.3);const s=ETM.probe().e1.seq;ETM.seek(t);return s},p.t);
  return seq>0||'no lyric line reached E1.onLine during ETM.step (main.ts hud() should dispatch while stepping)'}},

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
  if(!exp.length)return 'parsed 0 lyric lines from src/core.ts';
  const n=exp.reduce((a,b)=>a+b,0);
  return (p.e1.seq===exp.length&&p.e1.words===n)||`${p.e1.seq} lines / ${p.e1.words} words reached the crawl, expected ${exp.length} / ${n}`}},

 {name:'E1.3 autopilot chips pixels: chips/score rise, words die, none in a single hit, few deaths',era:1,bar:'end',fn:(p,h)=>{
  const e=h.filter(x=>x.era===0).map(x=>x.p.e1),last=e[e.length-1];
  if(!(last.chips>=20))return `only ${last.chips} chips over the era`;
  if(!(last.score>0))return 'score is 0';
  for(let i=1;i<e.length;i++)if(e[i].chips<e[i-1].chips)return 'chips decreased';
  if(last.oneShot>0)return `${last.oneShot} of ${last.kills} word kills happened on the word's first hit`;
  if(last.kills*3>last.chips)return `${last.kills} kills for ${last.chips} chips: words vanish too fast`;
  if(last.kills<3)return `only ${last.kills} words chipped away by the autopilot (${last.chips} chips, ${last.shots} shots)`;
  if(last.deaths>2)return `autopilot died ${last.deaths} times in era 1`;
  return true}},

 {name:'E1.4 cannon dies only on pixel overlap; respawn <=0.7 s with blink; a death never shatters the crawl',era:1,bar:'end',fn:async(p,h,page)=>{
  const early=h.find(x=>x.bar<17&&x.p.e1['debris#']!==undefined);if(early)return `shatter/debris at bar ${early.bar} (<17) — a death triggered the bar-17 shatter`;
  const t=p.t;
  const c=await driveLine(page,231,8.5,true);   // cannon centred under the first line
  const l=await driveLine(page,6,8.5,false);    // cannon parked far left, outside the text block
  await page.evaluate(t=>ETM.seek(t),t);
  if(!c.line)return 'no crawl line after stepping over bar 2';
  if(c.deaths<1||!c.ev.length)return `no death with the cannon centred under "${c.line}" (ev ${JSON.stringify(c.ev)})`;
  if(l.deaths!==0)return `${l.deaths} death(s) with the cannon parked at x=6, outside every word`;
  for(let i=0;i<c.ev.length;i++){const e=c.ev[i];
   if(e.dead){if(!e.bands.some(([zn,zf])=>zn<=e.shipZ[1]+0.01&&zf>=e.shipZ[0]-0.01))return `death at +${e.t}s while no line's z band ${JSON.stringify(e.bands.map(b=>b.map(z=>+z.toFixed(1))))} covers ship z [${e.shipZ.map(z=>z.toFixed(1))}]`;
    if(e.debris||e.lines===0)return `death at +${e.t}s wiped the crawl (lines ${e.lines}, debris ${e.debris})`;
    const r=c.ev[i+1];if(!r)return `died at +${e.t}s and never respawned`;
    if(!(r.t-e.t>0.69&&r.t-e.t<=0.75))return `respawn took ${(r.t-e.t).toFixed(2)} s`;
    if(!(r.inv>0))return 'respawned without invulnerability/blink';
    if(Math.abs(r.x-231)>0.5)return `respawned at x=${r.x}, expected centre`}}
  if(c.ships.length<2)return 'could not sample both blink phases';
  const [a,b]=c.ships,lo=Math.min(a.green,b.green),hi=Math.max(a.green,b.green);
  if(!(lo*6<=hi&&hi>=40))return `blink: ship pixels ${a.green} / ${b.green} in the two phases (CRT glow leaves a few in the off phase)`;
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

 {name:'E1.5b seek past bar 17 shows the shattered crawl on the floor (REVIEW-ERAS E1-4)',era:1,bar:'end',fn:async(p,h,page)=>{
  const end=h.filter(x=>x.era===0).pop();const t=p.t;
  const r=await page.evaluate(()=>{ETM.seek(18*1.875);const S=ETM.raw.e1();const d=S.debris||[];return{n:d.length,landed:d.filter(q=>q.y>=q.land).length,lines:S.lines.length,seq:S.seq,words:S.words,x:S.ship.x}});
  await page.evaluate(t=>ETM.seek(t),t);
  if(!(r.n>20))return `seek(bar 18): ${r.n} debris pieces`;
  if(r.landed<r.n*0.9)return `seek(bar 18): only ${r.landed}/${r.n} debris pieces on the floor`;
  if(r.lines!==0)return `seek(bar 18): ${r.lines} live lines`;
  if(end&&(r.seq!==end.p.e1.seq||r.words!==end.p.e1.words))return `seek(bar 18) counts seq ${r.seq} / words ${r.words}, play-through ${end.p.e1.seq} / ${end.p.e1.words}`;
  return true}},

 {name:'E1.6 letters >=10 px tall near the bottom of the 480x270 canvas, and drawn there',era:1,bar:'end',fn:async(p,h,page)=>{
  const t=p.t;
  const r=await page.evaluate(()=>{
   const cv=document.getElementById('c'),g=cv.getContext('2d'),k=cv.width/480;
   ETM.seek(2*1.875-3/60);ETM.step(4/60);const S=ETM.raw.e1(),K=S.K;S.park=6;S.ship.x=6;const t0=ETM.now();const out=[];
   for(const stop of [3.5,4.5,5.3]){while(ETM.now()<t0+stop-1e-6)ETM.step(Math.min(0.25,t0+stop-ETM.now()));const t=ETM.now();
    // tallest glyph on screen: screen rows spanned by a word's glyph rows (3..3+FS of its bitmap) at depth z
    let tallest=0,bottom=0,yellow=0;
    for(const ln of S.lines){const zb=K.ZFAR-(t-ln.t0)/K.TRAVEL*(K.ZFAR-K.ZNEAR);for(const w of ln.words){if(w.dead)continue;
     const y=row=>K.VPY+K.F/(zb+(ln.bh-row)*K.ROWD),yt=y(w.by+3),yb=y(w.by+3+K.FS);if(yb>K.GROUND+6||zb+(ln.bh-w.by-3-K.FS)*K.ROWD<1.5)continue;
     if(yb-yt>tallest){tallest=yb-yt;bottom=yb}}}
    // ...and yellow is really drawn in that band of the composited canvas (CRT scanlines darken rows, so count pixels)
    if(tallest>0){const y0=Math.round((bottom-tallest)*k),hh=Math.max(1,Math.round(tallest*k)),d=g.getImageData(0,y0,cv.width,hh).data;for(let i=0;i<d.length;i+=4)if(d[i]>140&&d[i+1]>110&&d[i+2]<110)yellow++}
    out.push({at:stop,tallest:+tallest.toFixed(1),bottom:+bottom.toFixed(0),yellow})}
   S.park=null;return out});
  await page.evaluate(t=>ETM.seek(t),t);
  const ok=r.filter(x=>x.tallest>=10&&x.bottom>120&&x.yellow>200);
  return ok.length>=2||'tallest glyph per sample: '+JSON.stringify(r)}},

 {name:'E1.6b no crawl row wider than the screen at the cannon row (long words like "retry," / "caught")',era:1,bar:'end',fn:async(p,h,page)=>{
  const t=p.t;
  const r=await page.evaluate(()=>{ETM.seek(0);const bad=[];const S=ETM.raw.e1(),K=S.K;
   // step through the verse and, for each line, project every word's extent at the cannon's row
   const seen=new Set();for(let i=0;i<Math.ceil(17*1.875/0.5);i++){ETM.step(0.5);for(const ln of S.lines){if(seen.has(ln.t0))continue;seen.add(ln.t0);
    const z=K.F/(S.ship.y+4-K.VPY),sc=K.F2/z;for(const w of ln.words){const x0=K.VPX+(w.bx-K.BW/2+ln.xo)*sc,x1=K.VPX+(w.bx+w.w-K.BW/2+ln.xo)*sc;if(x0<0||x1>K.LW)bad.push(`${w.text} [${x0.toFixed(0)},${x1.toFixed(0)}]`)}}}
   return{bad,lines:seen.size}});
  await page.evaluate(t=>ETM.seek(t),t);
  if(r.lines<6)return `only ${r.lines} lines seen`;
  return !r.bad.length||'words outside the 480 px screen at the cannon row: '+r.bad.join(', ')}},

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
