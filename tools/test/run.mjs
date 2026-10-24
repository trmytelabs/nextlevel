#!/usr/bin/env node
// Headless verification harness for "Everything, Then More".
// Drives the deterministic simulation through window.ETM in headless Edge/Chrome (SwiftShader WebGL),
// checks invariants (no NaN state, no page errors, era boundaries), runs the case files in tools/test/cases/,
// measures sim + render cost, and writes screenshots + tools/test/report.json.
//
//   node tools/test/run.mjs                  # full three-minute run, all eras
//   node tools/test/run.mjs --era 3          # only era 3 (1-based)
//   node tools/test/run.mjs --from 74 --to 80 --chunk 1   # bar range, 1 s steps
//   node tools/test/run.mjs --controls       # keyboard + touch input mapping
//   node tools/test/run.mjs --mobile         # iPhone landscape emulation + layout checks (+ portrait rotate card)
//   node tools/test/run.mjs --q low          # low quality tier
//   node tools/test/run.mjs --url http://localhost:5174/maximalist/
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const argv=process.argv.slice(2);
const opt=(k,d)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:d};
const flag=k=>argv.includes('--'+k);
const BASE=opt('url',process.env.ETM_URL||'http://localhost:5174/maximalist/');
const ERA=opt('era',null)?+opt('era'):null;
const CHUNK=+opt('chunk',2);
const Q=opt('q','high');
const SHOTS=opt('shots','tools/test/shots');
const TAG=opt('tag','');
const ONLY=opt('only',null); // substring filter on case names
const ERA_BARS=[0,19,37,56,75,96];
const BPM=128,BEAT=60/BPM,BAR=BEAT*4,TOTAL=96*BAR;
const bar=b=>b*BAR;
const EDGE=process.env.EDGE||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
if(!EDGE){console.error('No Edge/Chrome found; set EDGE=path');process.exit(2)}
fs.mkdirSync(SHOTS,{recursive:true});

const report={ok:true,url:BASE,q:Q,started:new Date().toISOString(),errors:[],failures:[],passes:[],perf:{},shots:[],notes:[]};
const fail=(name,msg,t)=>{report.ok=false;report.failures.push({name,msg,t});console.log('  FAIL',name,'-',msg,t!=null?`(bar ${(t/BAR).toFixed(2)})`:'')};
const pass=(name,t)=>{report.passes.push({name,t});console.log('  ok  ',name)};

// ---- case files: tools/test/cases/*.mjs export default [{name, era, bar|'end', fn(probe, history)=>true|string}]
const casesDir=path.resolve('tools/test/cases');let CASES=[];
if(fs.existsSync(casesDir))for(const f of fs.readdirSync(casesDir).filter(f=>f.endsWith('.mjs'))){const m=await import(pathToFileURL(path.join(casesDir,f)).href);for(const c of m.default||[])CASES.push({...c,file:f})}
if(ONLY)CASES=CASES.filter(c=>c.name.includes(ONLY));

const browser=await puppeteer.launch({executablePath:EDGE,headless:true,protocolTimeout:600000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage','--no-first-run','--window-size=1280,800']});
const page=await browser.newPage();
const MOBILE=flag('mobile');
if(MOBILE)await page.emulate({viewport:{width:844,height:390,deviceScaleFactor:3,isMobile:true,hasTouch:true,isLandscape:true},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
else await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
let cur=0;
page.on('pageerror',e=>{report.ok=false;report.errors.push({t:cur,msg:String(e.message||e)});console.log('  PAGEERROR',String(e.message||e).slice(0,200))});
page.on('console',m=>{if(m.type()!=='error')return;const loc=(m.location()&&m.location().url)||'';const txt=m.text()+(loc?' @ '+loc:'');if(/Outdated Optimize Dep|favicon|ERR_ABORTED|net::ERR_FAILED|WebGL: too many errors|GPU stall|song\.mp3|timing\.json|models\/car/.test(txt))return;report.ok=false;report.errors.push({t:cur,msg:txt});console.log('  CONSOLE ERROR',txt.slice(0,200))});

const url=new URL(BASE);url.searchParams.set('q',Q);
console.log('open',url.href,MOBILE?'(iPhone landscape)':'');
await page.goto(url.href,{waitUntil:'networkidle0',timeout:90000});
// Vite may reload once after optimizing new deps; wait for ETM, then a quiet second, then re-check it is still there.
const waitETM=async()=>{await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000});await new Promise(r=>setTimeout(r,1500));await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000})};
await waitETM();
await page.evaluate(()=>{ETM.setAuto('on');ETM.setPlaying(false)});
const probe=()=>page.evaluate(()=>ETM.probe());
const shot=async(name)=>{const f=path.join(SHOTS,`${TAG?TAG+'-':''}${name}.png`);try{await page.evaluate(()=>ETM.render());await page.screenshot({path:f,captureBeyondViewport:false});report.shots.push(f)}catch(e){report.notes.push('screenshot '+name+' failed: '+String(e.message||e).slice(0,120));console.log('  (screenshot '+name+' skipped: timeout)')}return f};

// ---- controls test
if(flag('controls')){
  console.log('controls');
  const box=await (await page.$('#c')).boundingBox();
  const inp=()=>page.evaluate(()=>{const i=ETM.input();return i});
  const keyCases=[['a','left'],['ArrowLeft','left'],['d','right'],['ArrowRight','right'],['w','up'],['ArrowUp','up'],['s','down'],['ArrowDown','down']];
  for(const [k,f] of keyCases){await page.keyboard.down(k);const i=await inp();if(i[f])pass('key '+k+' -> '+f);else fail('key '+k,'expected '+f+' got '+JSON.stringify(i));await page.keyboard.up(k)}
  await page.keyboard.down(' ');{const i=await inp();if(i.fire&&i.jump)pass('space -> fire+jump');else fail('space','got '+JSON.stringify(i))}await page.keyboard.up(' ');
  await page.evaluate(()=>{window.__clear=()=>{}});
  // settings keys must not move the player
  for(const k of ['q','m','l']){await page.keyboard.press(k);const i=await inp();if(i.left||i.right||i.up||i.down)fail('settings key '+k,'moved player '+JSON.stringify(i));else pass('settings key '+k+' does not move')}
  const autoLabel=await page.$eval('#autoBtn',e=>e.textContent);if(/AUTOPILOT: (ON|OFF|WHEN IDLE)/.test(autoLabel))pass('Q cycles autopilot label: '+autoLabel);else fail('Q autopilot','label '+autoLabel);
  const sound=await page.$eval('#click',e=>e.textContent);if(/SOUND: (ON|OFF)/.test(sound))pass('M toggles sound label: '+sound);else fail('M sound','label '+sound);
  for(let e=1;e<=5;e++){await page.keyboard.press(String(e));const p=await probe();if(p.era===e-1)pass('key '+e+' -> era '+e);else fail('key '+e,'era '+p.era+' bar '+p.bar.toFixed(2))}
  await page.keyboard.press('1');
  // touch zones (pointer events with pointerType touch)
  const zones=[['left edge',box.x+box.width*0.10,box.y+box.height*0.5,'left'],['right edge',box.x+box.width*0.90,box.y+box.height*0.5,'right'],['upper middle',box.x+box.width*0.5,box.y+box.height*0.25,'jump'],['lower middle',box.x+box.width*0.5,box.y+box.height*0.75,'fire']];
  for(const [name,x,y,f] of zones){await page.touchscreen.touchStart(x,y);const i=await inp();if(i[f])pass('touch '+name+' -> '+f);else fail('touch '+name,'expected '+f+' got '+JSON.stringify(i));await page.touchscreen.touchEnd();const j=await page.evaluate(()=>{const i=ETM.input();return i});if((f==='left'||f==='right')&&j[f])fail('touch '+name+' release','still '+f+' after touchEnd')}
  await page.evaluate(()=>{ETM.seek(0)});
}

// ---- mobile layout test
if(MOBILE){
  console.log('mobile layout');
  const m=await page.evaluate(()=>{const c=document.querySelector('#c').getBoundingClientRect(),b=document.querySelector('#bar'),w=document.querySelector('#wrap').getBoundingClientRect();const btns=[...b.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return{vw:innerWidth,vh:innerHeight,canvas:{x:c.x,y:c.y,w:c.width,h:c.height},wrap:{x:w.x,y:w.y,w:w.width,h:w.height},barOverflow:b.scrollWidth-b.clientWidth,btnRight:Math.max(...btns.map(r=>r.right)),barRight:b.getBoundingClientRect().right,rotate:getComputedStyle(document.querySelector('#rotate')).display,help:document.querySelector('#help').textContent,bodyScrollW:document.documentElement.scrollWidth}});
  report.mobile=m;
  if(m.canvas.w>0&&m.canvas.x>=-1&&m.canvas.x+m.canvas.w<=m.vw+1&&m.canvas.y+m.canvas.h<=m.vh+1)pass('canvas fits landscape viewport');else fail('mobile canvas','canvas '+JSON.stringify(m.canvas)+' vp '+m.vw+'x'+m.vh);
  if(m.barOverflow<=1&&m.btnRight<=m.barRight+1)pass('control bar does not overflow');else fail('mobile bar','overflow '+m.barOverflow+' btnRight '+m.btnRight+' barRight '+m.barRight);
  if(m.rotate==='none')pass('rotate card hidden in landscape');else fail('rotate card','visible in landscape');
  if(/HOLD LEFT/.test(m.help))pass('touch help text shown');else fail('touch help','help='+m.help);
  if(m.bodyScrollW<=m.vw+1)pass('no horizontal page scroll');else fail('page scroll','scrollWidth '+m.bodyScrollW);
  const p=await probe();if(p.quality==='low'||Q==='high')pass('quality tier on phone: '+p.quality);else fail('quality','phone got '+p.quality);
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true,isLandscape:false});
  await new Promise(r=>setTimeout(r,300));
  const rot=await page.evaluate(()=>getComputedStyle(document.querySelector('#rotate')).display);
  if(rot==='flex')pass('rotate card shown in portrait');else fail('rotate card','portrait display='+rot);
  await shot('mobile-portrait');
  await page.tap('#rotate');await new Promise(r=>setTimeout(r,200));
  const rot2=await page.evaluate(()=>getComputedStyle(document.querySelector('#rotate')).display);
  if(rot2==='none')pass('tap dismisses rotate card');else fail('rotate card','not dismissed');
  await page.setViewport({width:844,height:390,deviceScaleFactor:3,isMobile:true,hasTouch:true,isLandscape:true});await new Promise(r=>setTimeout(r,300));
}

// ---- simulation run
const from=opt('from',null)!=null?+opt('from'):ERA!=null?ERA_BARS[ERA-1]:0;
const to=opt('to',null)!=null?+opt('to'):ERA!=null?ERA_BARS[ERA]:96;
console.log(`simulate bars ${from} -> ${to} in ${CHUNK}s steps, ${CASES.length} cases loaded`);
await page.evaluate(t=>ETM.seek(t),bar(from));
const history=[];const perf={};let t=bar(from);const tEnd=Math.min(TOTAL,bar(to));
// C-5: a case can declare isolated:true/false explicitly (a seek hidden in a helper is invisible to the regex); the regex stays as the default
const isolated=c=>typeof c.isolated==='boolean'?c.isolated:/ETM\.seek\(/.test(String(c.fn));
const pending=CASES.filter(c=>c.era==null||(ERA_BARS[c.era-1]>=from-1e-6&&ERA_BARS[c.era-1]<to+1e-6)||(c.bar!=='end'&&c.bar>=from&&c.bar<=to)).map(c=>({...c,done:false}));
const runCases=async(p,endOfRange)=>{for(const c of pending){if(c.done||isolated(c))continue;const due=c.bar==='end'?(c.era!=null?p.bar>=ERA_BARS[c.era]-1e-6:(endOfRange&&p.t>=tEnd-1e-6)):p.bar>=c.bar;if(!due)continue;c.done=true;let r;try{r=await c.fn(p,history,page)}catch(e){if(/dynamically imported module|Failed to fetch/.test(String(e.message))){console.log('  skip ',c.name,'(needs the dev server)');continue}r='threw '+e.message}if(r===true||r===undefined)pass(c.name,p.t);else fail(c.name,String(r),p.t)}};
const shotBars=new Set();for(let e=0;e<5;e++){shotBars.add(ERA_BARS[e]+0.6);shotBars.add((ERA_BARS[e]+ERA_BARS[e+1])/2);shotBars.add(ERA_BARS[e+1]-0.4)}
let nextShot=[...shotBars].filter(b=>b>=from&&b<=to).sort((a,b)=>a-b);
while(t<tEnd-1e-6){
  const step=Math.min(CHUNK,tEnd-t,nextShot.length?Math.max(0.02,bar(nextShot[0])-t):1e9);
  let r;try{r=await page.evaluate(s=>{const a=performance.now();ETM.step(s);const b=performance.now();const p=ETM.probe();const c=performance.now();ETM.render();ETM.render();ETM.render();const d=performance.now();return{ms:b-a,renderMs:(d-c)/3,p,errs:ETM.errs.splice(0)}},step)}catch(e){if(!/context was destroyed|navigation|Target closed/i.test(String(e.message)))throw e;console.log('  (page reloaded under us, probably HMR; re-attaching at bar '+(t/BAR).toFixed(1)+')');report.notes.push('reload at bar '+(t/BAR).toFixed(2));await waitETM();await page.evaluate(tt=>{ETM.setAuto('on');ETM.setPlaying(false);ETM.seek(tt)},t);continue}
  t=r.p.t;cur=t;
  for(const e of r.errs){report.ok=false;report.errors.push({t,msg:e});console.log('  WINDOW ERROR',e.slice(0,200))}
  const era=r.p.era;const pf=perf[era]||(perf[era]={simMsPerSec:0,renderMs:0,n:0,worstRender:0});pf.simMsPerSec+=r.ms/step;pf.renderMs+=r.renderMs;pf.worstRender=Math.max(pf.worstRender,r.renderMs);pf.n++;
  for(const k of ['e1','e2','e3','e4','e5']){const s=r.p[k];if(s&&s.bad&&s.bad.length)fail('NaN in '+k,s.bad.slice(0,6).join(','),t)}
  const expEra=ERA_BARS.findIndex((b,i)=>r.p.bar>=b&&r.p.bar<ERA_BARS[i+1]);if(expEra>=0&&era!==expEra)fail('era index',`eraAt=${era} expected ${expEra}`,t);
  history.push({t,bar:r.p.bar,era,p:r.p,ms:r.ms,renderMs:r.renderMs});
  if(nextShot.length&&t>=bar(nextShot[0])-1e-6){const b=nextShot.shift();await shot(`bar${b.toFixed(1).replace('.0','')}-era${era+1}`)}
  await runCases(r.p,false);
  if(history.length%10===0)process.stdout.write(`  bar ${r.p.bar.toFixed(1)} era ${era+1} sim ${(r.ms/step).toFixed(0)}ms/s render ${r.renderMs.toFixed(1)}ms\n`);
}
const last=await probe();await runCases(last,true);
for(const c of pending)if(!c.done&&!isolated(c)){if(c.era!=null&&to<ERA_BARS[c.era]-1e-6){console.log('  skip ',c.name,'(range ends before era '+c.era+' does)');continue}try{const r=await c.fn(last,history,page);if(r===true||r===undefined)pass(c.name+' (final)',last.t);else fail(c.name+' (final)',String(r),last.t)}catch(e){if(/dynamically imported module|Failed to fetch/.test(String(e.message))){console.log('  skip ',c.name,'(needs the dev server)');continue}fail(c.name,'threw '+e.message,last.t)}}
for(const c of pending)if(isolated(c)){const b=c.bar==='end'?(c.era!=null?ERA_BARS[c.era]-0.5:to-0.5):c.bar;if(b<from||b>to)continue;try{const p=await page.evaluate(t=>{ETM.seek(t);ETM.step(0.05);return ETM.probe()},bar(b));const r=await c.fn(p,history,page);if(r===true||r===undefined)pass(c.name+' (isolated)',p.t);else fail(c.name+' (isolated)',String(r),p.t)}catch(e){if(/dynamically imported module|Failed to fetch/.test(String(e.message))){console.log('  skip ',c.name,'(needs the dev server)');continue}fail(c.name,'threw '+e.message,bar(b))}}
for(const e in perf){const p=perf[e];report.perf['era'+(+e+1)]={simMsPerSimSecond:+(p.simMsPerSec/p.n).toFixed(1),renderMs:+(p.renderMs/p.n).toFixed(1),worstRenderMs:+p.worstRender.toFixed(1)}}
if(to>=96){if(last.ended||last.t>=TOTAL-0.02)pass('run reaches the end');else fail('end','t='+last.t)}
report.history=history.map(h=>({bar:+h.bar.toFixed(2),era:h.era,ms:+h.ms.toFixed(0),renderMs:+h.renderMs.toFixed(1),e1:h.p.e1,e2:h.p.e2,e3:h.p.e3,e4:h.p.e4,e5:h.p.e5,caption:h.p.caption}));
report.finished=new Date().toISOString();
const out=opt('report','tools/test/report'+(TAG?'-'+TAG:'')+'.json');fs.writeFileSync(out,JSON.stringify(report,null,1));
console.log('\nperf',JSON.stringify(report.perf));
console.log(`${report.passes.length} passed, ${report.failures.length} failed, ${report.errors.length} page errors -> ${out}`);
await browser.close();
process.exit(report.ok?0:1);
