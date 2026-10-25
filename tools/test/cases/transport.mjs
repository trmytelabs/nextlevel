// Transport-level cases: captions, determinism, cards, input edges, HUD layout. Template for the per-era case files.
import fs from 'node:fs';
const BAR=60/128*4;
// LYRICS from src/core.ts (the page does not expose them). [bar, "line"] per row.
const LYRICS=fs.readFileSync(new URL('../../../src/core.ts',import.meta.url),'utf8').replace(/\r/g,'').split('\n').map(l=>l.match(/^\[([\d.]+),"(.*)"\],?\]?;?$/)).filter(Boolean).map(m=>[+m[1],m[2]]);
// seek a little before `t` and step onto it so the HUD (which only updates in step/frame) reflects exactly t
const at=(page,t)=>page.evaluate(t=>{ETM.seek(Math.max(0,t-0.5));ETM.step(Math.min(t,0.5)+0.05);return ETM.now()},t);
const lyric=page=>page.$eval('#lyric',e=>[e.textContent,e.style.opacity]);
export default [
 {name:'T1 captions: every LYRICS line shows within 0.1 s of its bar and hides within 1.9 bars',era:null,bar:3,fn:async(p,h,page)=>{
  if(LYRICS.length!==40)return `parsed ${LYRICS.length} lyric lines from src/core.ts, expected 40`;
  const bad=[];
  // the --controls block presses L (captions off) before this case runs; switch captions back on if a live line is hidden
  await at(page,LYRICS[0][0]*BAR+0.05);{const [txt,op]=await lyric(page);if(txt===LYRICS[0][1]&&op==='0'){await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{key:'l'})));await page.evaluate(()=>ETM.step(0))}}
  for(let i=0;i<LYRICS.length;i++){const [b,line]=LYRICS[i];const s=b*BAR;
   await at(page,s+0.05);const [txt,op]=await lyric(page);if(txt!==line||op!=='1')bad.push(`#${i} bar ${b} at +0.05s: "${txt}" op=${op}`);
   const nx=LYRICS[i+1]?LYRICS[i+1][0]*BAR:1e9;const hideT=s+Math.min(nx-s,1.9*BAR);if(hideT>96*BAR-0.1)continue;
   await at(page,hideT+0.05);const [t2,o2]=await lyric(page);const next=LYRICS[i+1]&&LYRICS[i+1][1];if(!(o2==='0'||(t2===next&&o2==='1')))bad.push(`#${i} bar ${b} still "${t2}" op=${o2} at hide time bar ${(hideT/BAR).toFixed(2)}`)}
  await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);
  return bad.length===0||bad.slice(0,5).join(' | ')+(bad.length>5?` (+${bad.length-5} more)`:'')}},
 {name:'T2 seek is deterministic',era:null,bar:30,fn:async(p,h,page)=>{const a=await page.evaluate(()=>{ETM.seek(40*1.875);ETM.step(4);return JSON.stringify(ETM.probe())});const b=await page.evaluate(()=>{ETM.seek(40*1.875);ETM.step(4);return JSON.stringify(ETM.probe())});await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);return a===b||'two identical seek+step runs differ'}},
 {name:'T3 clock label matches bar',era:null,bar:50,fn:async(p,h,page)=>{await page.evaluate(()=>ETM.step(0));const s=await page.$eval('#clock',e=>e.textContent);const want='BAR '+(Math.floor(p.t/BAR)+1);return s.startsWith(want)||`clock "${s}" expected "${want}"`}},
 {name:'T3b restart / play / era key keep the clock consistent',era:null,bar:3,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{const out=[];const clock=()=>document.querySelector('#clock').textContent;const play=()=>document.querySelector('#play').textContent;
   document.querySelector('#restart').click();const restarted=ETM.now()===0&&play()==='PAUSE';ETM.step(0);out.push(['restart -> bar 1, playing',restarted&&clock().startsWith('BAR 1 ')]);
   const p0=play();document.querySelector('#play').click();const p1=play();document.querySelector('#play').click();const p2=play();out.push(['play button toggles PAUSE/PLAY and back',p0!==p1&&p1!==p2&&p0===p2&&/^(PLAY|PAUSE)$/.test(p1)]);ETM.setPlaying(false);
   dispatchEvent(new KeyboardEvent('keydown',{key:'3'}));ETM.step(0);out.push(['key 3 -> bar 38',clock().startsWith('BAR 38 ')&&ETM.probe().era===2]);
   const sc=document.querySelector('#scrub'),b=sc.getBoundingClientRect();sc.dispatchEvent(new PointerEvent('pointerdown',{clientX:b.left+b.width*0.5,clientY:b.top+b.height/2,bubbles:true}));dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));ETM.step(0);const t=ETM.now();out.push(['scrubber mid -> ~bar 49',Math.abs(t/1.875-48)<1.5&&clock().startsWith('BAR '+(Math.floor(t/1.875)+1)+' ')]);
   return out});
  await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);const bad=r.filter(x=>!x[1]).map(x=>x[0]);return bad.length===0||'failed: '+bad.join(', ')}},
 {name:'T4 music hooks do not throw with sound on; SOUND label toggles; clock still advances',era:null,bar:10,fn:async(p,h,page)=>{const r=await page.evaluate(()=>{const btn=document.querySelector('#click');if(btn.textContent.includes('ON'))btn.click();const was=btn.textContent;btn.click();const on1=btn.textContent;btn.click();const off=btn.textContent;btn.click();const on2=btn.textContent;const lab=on1==='SOUND: ON'&&off==='SOUND: OFF'&&on2==='SOUND: ON'&&btn.classList.contains('on');if(!lab)return `label sequence ${was} -> ${on1} -> ${off} -> ${on2}`;
  const t=ETM.now();ETM.errs.splice(0);const adv=[];try{for(const b of [1,20,38,58,67,76,90,94.5]){ETM.seek(b*1.875);const a=ETM.probe().t;ETM.step(2.2);const c=ETM.probe().t;if(c-a<2.1)adv.push(`bar ${b}: advanced only ${(c-a).toFixed(2)}s`)}}catch(e){return String(e)}ETM.seek(t);ETM.step(0);const errs=ETM.errs.splice(0);return (errs.length?'errs: '+errs.join(';'):'')+(adv.length?' '+adv.join(';'):'')||'ok'});return r==='ok'||r}},
 {name:'T5 title card at bar 0.6 and end card at bar 95.3 are drawn (non-black centre)',era:null,bar:3,fn:async(p,h,page)=>{
  const bright=async t=>{await at(page,t);return page.evaluate(()=>{ETM.render();const c=document.querySelector('#c'),x=c.getContext('2d');const w=c.width,hh=c.height;const d=x.getImageData(Math.floor(w*0.3),Math.floor(hh*0.25),Math.floor(w*0.4),Math.floor(hh*0.25)).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>300)n++;return n})};
  // the end card is the era-5 3D card (voxel title + type) when WebGL is up, else the flat 2D card; either way it is drawn by 95.3,
  // and the full type block (name / invite / prompt) is on screen by the last beat
  const a=await bright(0.6*BAR),b=await bright(95.3*BAR);
  const lower=async t=>{await at(page,t);return page.evaluate(()=>{ETM.render();const c=document.querySelector('#c'),x=c.getContext('2d');const w=c.width,hh=c.height;const d=x.getImageData(Math.floor(w*0.25),Math.floor(hh*0.5),Math.floor(w*0.5),Math.floor(hh*0.34)).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>500)n++;return ETM.probe().gl.e5?n:999})};
  const c=await lower(95.9*BAR);
  await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);return(a>200&&b>200&&c>300)||`bright pixels: card0=${a} card95=${b} typeBlock95.9=${c}`}},
 {name:'G5b space / tap edges reach readInput (synchronous, no rAF race)',era:null,bar:3,fn:async(p,h,page)=>{const r=await page.evaluate(async()=>{const out=[];const tick=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));const kd=k=>dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true})),ku=k=>dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));
  const c=document.querySelector('#c'),b=c.getBoundingClientRect();const pd=(fx,fy,id)=>c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'touch',clientX:b.left+b.width*fx,clientY:b.top+b.height*fy,bubbles:true,cancelable:true})),pu=id=>c.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:'touch',bubbles:true}));
  await tick();pd(0.5,0.25,8);const j=ETM.input();pu(8);out.push(['tap upper middle -> jump (not fire)',j.jump&&j.upEdge&&!j.fire]);
  await tick();kd(' ');const i=ETM.input();ku(' ');out.push(['space -> fire+jump',i.fire&&i.jump]);
  await tick();pd(0.5,0.75,7);const f=ETM.input();pu(7);out.push(['tap lower middle -> fire (no upEdge)',f.fire&&!f.upEdge&&!f.left&&!f.right]);
  await tick();pd(0.1,0.5,9);const l=ETM.input();pu(9);const l2=ETM.input();out.push(['hold left edge then release',l.left&&!l.right&&!l2.left]);
  await tick();pd(0.9,0.5,10);const rr=ETM.input();pu(10);const r2=ETM.input();out.push(['hold right edge then release',rr.right&&!rr.left&&!r2.right]);
  await tick();pd(0.1,0.5,11);pd(0.5,0.25,12);const two=ETM.input();pu(12);const still=ETM.input();pu(11);out.push(['two fingers: hold left + tap jump, left survives the jump release',two.left&&two.upEdge&&still.left]);
  await tick();const clean=ETM.input();out.push(['edges cleared by the next frame',!clean.fire&&!clean.jump&&!clean.left&&!clean.right]);
  return out});const bad=r.filter(x=>!x[1]).map(x=>x[0]);return bad.length===0||'failed: '+bad.join(', ')}},
 {name:'L1 HUD layout: help/auto inside frame, caption clear of auto line, no scrubber label pile-up, bar fits',era:null,bar:2.5,fn:async(p,h,page)=>{
  await at(page,2.3*BAR);const m=await page.evaluate(()=>{const R=s=>document.querySelector(s).getBoundingClientRect();const wrap=R('#wrap');const inside=(r)=>r.left>=wrap.left-0.5&&r.right<=wrap.right+0.5&&r.top>=wrap.top-0.5&&r.bottom<=wrap.bottom+0.5;const vis=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;const hit=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;const help=document.querySelector('#help'),auto=R('#auto'),ly=R('#lyric'),bar=document.querySelector('#bar');const spans=[...document.querySelectorAll('.mark span')].filter(vis).map(e=>e.getBoundingClientRect());let pile=0;for(let i=1;i<spans.length;i++)if(spans[i].left<spans[i-1].right)pile++;return{helpIn:!vis(help)||inside(R('#help')),autoIn:inside(auto),lyricVis:ly.height>0,lyricHitsAuto:hit(ly,auto),lyricHitsHelp:vis(help)&&hit(ly,R('#help')),pile,barOverflow:bar.scrollWidth-bar.clientWidth,bodyScroll:document.documentElement.scrollWidth-innerWidth}});
  await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);const bad=[];if(!m.helpIn)bad.push('#help overflows #wrap');if(!m.autoIn)bad.push('#auto overflows #wrap');if(!m.lyricVis)bad.push('caption not visible at bar 2.3');if(m.lyricHitsAuto)bad.push('caption overlaps #auto');if(m.lyricHitsHelp)bad.push('caption overlaps #help');if(m.pile)bad.push(m.pile+' scrubber era labels overlap');if(m.barOverflow>1)bad.push('control bar overflows by '+m.barOverflow+'px');if(m.bodyScroll>1)bad.push('horizontal page scroll');return bad.length===0||bad.join('; ')}},
];
