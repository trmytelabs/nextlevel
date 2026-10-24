#!/usr/bin/env node
// Screenshot regression for "Next Level": renders a fixed list of bars through window.ETM in headless Edge
// (SwiftShader WebGL), screenshots the #c canvas at 960x540 CSS px and compares each frame to tools/test/visual/baseline/.
//
//   node tools/test/visual/snap.mjs                 # capture -> current/, compare with baseline/, diffs -> diff/
//   node tools/test/visual/snap.mjs --update        # capture and copy current/ over baseline/
//   node tools/test/visual/snap.mjs --tolerance 2   # default per-frame tolerance in percent (tolerances.json overrides per bar)
//   node tools/test/visual/snap.mjs --bars 1,20,76  # subset of the frame list
//   node tools/test/visual/snap.mjs --url http://localhost:5174/maximalist/?q=high
//   node tools/test/visual/snap.mjs --no-hud        # hide the DOM HUD overlay (captions, clock) and shoot the bare canvas
//
// Exit codes: 0 all frames within tolerance, 1 a frame differs / baseline missing / size mismatch, 2 setup failure.
import puppeteer from 'puppeteer-core';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2);
const opt=(k,d)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:d};
const flag=k=>argv.includes('--'+k);

const BASE=opt('url',process.env.ETM_URL||'http://localhost:5173/maximalist/?q=high');
const UPDATE=flag('update');
const NO_HUD=flag('no-hud');
const CFG_PATH=opt('config',path.join(HERE,'tolerances.json'));
const CFG=fs.existsSync(CFG_PATH)?JSON.parse(fs.readFileSync(CFG_PATH,'utf8')):{default:1.5,frames:{}};
const TOL_DEFAULT=opt('tolerance',null)!=null?+opt('tolerance'):(CFG.default??1.5);
const THRESHOLD=+opt('threshold',CFG.threshold??0.12);
const DEFAULT_BARS=[1,9.5,18.6,20,28,36.6,38,46.5,55.6,57,65.5,74.6,76,80,85.5,89.6,93,95.5];
const BARS=opt('bars',null)?opt('bars').split(',').map(Number).filter(n=>isFinite(n)):(CFG.bars||DEFAULT_BARS);
const BPM=128,BAR=60/BPM*4; // 1.875 s
const ERA_BARS=[0,19,37,56,75,96];
const eraOf=b=>{for(let e=4;e>=0;e--)if(b>=ERA_BARS[e])return e+1;return 1};
const CANVAS_W=960,CANVAS_H=540;
// #wrap is 16/9.9 and the canvas is 90.9% of its height: a 960-wide wrap gives a 960x540 canvas. Viewport height just needs room.
const VIEWPORT={width:CANVAS_W,height:600,deviceScaleFactor:1};
const EDGE=process.env.EDGE||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
if(!EDGE){console.error('No Edge/Chrome found; set EDGE=path');process.exit(2)}

const DIR_CUR=path.join(HERE,'current'),DIR_BASE=path.join(HERE,'baseline'),DIR_DIFF=path.join(HERE,'diff');
for(const d of[DIR_CUR,DIR_BASE,DIR_DIFF])fs.mkdirSync(d,{recursive:true});
const fname=b=>`bar${b}.png`;
const tolFor=b=>{const f=CFG.frames||{};const k=String(b);return f[k]!=null?(typeof f[k]==='number'?f[k]:f[k].tolerance??TOL_DEFAULT):TOL_DEFAULT};

// ---- dev server: reuse if up, otherwise start vite on the URL's port and stop it at the end
const up=async()=>{try{const r=await fetch(BASE,{signal:AbortSignal.timeout(3000)});return r.ok}catch{return false}};
let vite=null;
if(!(await up())){
  const port=new URL(BASE).port||'5173';
  console.log(`dev server not reachable at ${BASE}; starting: npx vite --port ${port} --strictPort`);
  vite=spawn(process.platform==='win32'?'npx.cmd':'npx',['vite','--port',port,'--strictPort'],{cwd:path.resolve(HERE,'../../..'),stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});
  vite.stdout.on('data',()=>{});vite.stderr.on('data',d=>process.stderr.write(String(d)));
  const t0=Date.now();while(!(await up())){if(Date.now()-t0>60000){console.error('vite did not come up in 60 s');process.exit(2)}await new Promise(r=>setTimeout(r,500))}
  console.log('dev server up');
}
const stopVite=()=>{if(!vite)return;try{if(process.platform==='win32')execSync(`taskkill /pid ${vite.pid} /T /F`,{stdio:'ignore'});else vite.kill()}catch{}vite=null};
process.on('exit',stopVite);

// ---- browser
const browser=await puppeteer.launch({executablePath:EDGE,headless:true,protocolTimeout:600000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage','--no-first-run','--hide-scrollbars','--window-size=1280,800']});
const page=await browser.newPage();
await page.setViewport(VIEWPORT);
const pageErrors=[];
page.on('pageerror',e=>{pageErrors.push(String(e.message||e));console.log('  PAGEERROR',String(e.message||e).slice(0,200))});
console.log('open',BASE);
await page.goto(BASE,{waitUntil:'networkidle0',timeout:90000});
// Vite may reload once after optimizing deps: wait for ETM, a quiet second, then check it is still there.
const waitETM=async()=>{await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000});await new Promise(r=>setTimeout(r,1500));await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000})};
await waitETM();
await page.evaluate(async hideHud=>{ETM.setAuto('on');ETM.setPlaying(false);if(hideHud){const h=document.querySelector('#hud');if(h)h.style.visibility='hidden'}try{await document.fonts.ready}catch{}},NO_HUD);

const canvas=await page.$('#c');
const box=await canvas.boundingBox();
const clip={x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)};
if(clip.width!==CANVAS_W||clip.height!==CANVAS_H)console.log(`  warning: #c is ${clip.width}x${clip.height} CSS px, expected ${CANVAS_W}x${CANVAS_H} (layout changed?)`);

// ---- capture
const capture=async b=>{
  await page.evaluate(t=>{ETM.seek(t);ETM.step(0.05);ETM.render()},b*BAR);
  // Three.js uploads happen on the first render after a seek into a GL era; render once more so the frame is settled.
  await page.evaluate(()=>{ETM.render()});
  const f=path.join(DIR_CUR,fname(b));
  await page.screenshot({path:f,clip,captureBeyondViewport:false});
  return f;
};
const readPNG=f=>PNG.sync.read(fs.readFileSync(f));
const rows=[];let worst=0,failed=false;
console.log(`${UPDATE?'updating baseline':'comparing'}: ${BARS.length} frames at ${clip.width}x${clip.height}, threshold ${THRESHOLD}, default tolerance ${TOL_DEFAULT}%`);
for(const b of BARS){
  const cur=await capture(b);
  const row={bar:b,era:eraOf(b),file:fname(b),tolerance:tolFor(b),mismatch:null,status:''};
  const base=path.join(DIR_BASE,fname(b));
  if(UPDATE){fs.copyFileSync(cur,base);row.status='updated'}
  else if(!fs.existsSync(base)){row.status='NO BASELINE';failed=true}
  else{
    const a=readPNG(cur),bp=readPNG(base);
    if(a.width!==bp.width||a.height!==bp.height){row.status=`SIZE ${a.width}x${a.height} vs ${bp.width}x${bp.height}`;failed=true}
    else{
      const diff=new PNG({width:a.width,height:a.height});
      const n=pixelmatch(a.data,bp.data,diff.data,a.width,a.height,{threshold:THRESHOLD,includeAA:false,alpha:0.3});
      row.mismatch=100*n/(a.width*a.height);worst=Math.max(worst,row.mismatch);
      const df=path.join(DIR_DIFF,fname(b));
      if(n>0)fs.writeFileSync(df,PNG.sync.write(diff));else if(fs.existsSync(df))fs.unlinkSync(df);
      row.status=row.mismatch>row.tolerance?'FAIL':'ok';if(row.status==='FAIL')failed=true;
    }
  }
  rows.push(row);
  console.log(`  ${row.status.padEnd(11)} bar ${String(b).padEnd(5)} era ${row.era}  ${row.mismatch!=null?row.mismatch.toFixed(3).padStart(7)+'%':'       '}  tol ${row.tolerance}%`);
}
await browser.close();stopVite();

// ---- summary
const report={ok:!failed&&!pageErrors.length,url:BASE,mode:UPDATE?'update':'compare',threshold:THRESHOLD,size:clip,frames:rows,pageErrors,finished:new Date().toISOString()};
fs.writeFileSync(path.join(HERE,'report.json'),JSON.stringify(report,null,1));
if(!UPDATE){
  console.log('\nbar     era  mismatch   tol    status');
  for(const r of rows)console.log(`${String(r.bar).padEnd(7)} ${r.era}    ${r.mismatch!=null?r.mismatch.toFixed(3).padStart(7)+'%':'    -   '}  ${String(r.tolerance).padStart(4)}%  ${r.status}`);
  console.log(`\nworst ${worst.toFixed(3)}%  ${failed?'FAIL':'ok'}${pageErrors.length?'  ('+pageErrors.length+' page errors)':''}`);
}else console.log(`\nbaseline written: ${rows.length} frames -> ${path.relative(process.cwd(),DIR_BASE)}`);
process.exit(failed||pageErrors.length?1:0);
