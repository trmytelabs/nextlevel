// Transport-level cases: captions, determinism, cards. Template for the per-era case files.
const BAR=60/128*4;
export default [
 {name:'T1 captions appear with their lyric bar',era:null,bar:'end',fn:(p,h)=>{const seen=h.filter(x=>x.p.caption).length;return seen>=h.length*0.3||`captions visible in only ${seen}/${h.length} probes`}},
 {name:'T2 seek is deterministic',era:null,bar:30,fn:async(p,h,page)=>{const a=await page.evaluate(()=>{ETM.seek(40*1.875);ETM.step(4);return JSON.stringify(ETM.probe())});const b=await page.evaluate(()=>{ETM.seek(40*1.875);ETM.step(4);return JSON.stringify(ETM.probe())});await page.evaluate(t=>ETM.seek(t),p.t);return a===b||'two identical seek+step runs differ'}},
 {name:'T3 clock label matches bar',era:null,bar:50,fn:async(p,h,page)=>{const s=await page.$eval('#clock',e=>e.textContent);const want='BAR '+(Math.floor(p.t/BAR)+1);return s.startsWith(want)||`clock "${s}" expected "${want}"`}},
 {name:'T4 music hooks do not throw with sound on',era:null,bar:10,fn:async(p,h,page)=>{const r=await page.evaluate(()=>{const was=document.querySelector('#click').textContent;if(was.includes('OFF'))document.querySelector('#click').click();const t=ETM.now();try{for(const b of [1,20,38,58,67,76,90,94.5]){ETM.seek(b*1.875);ETM.step(2.2)}}catch(e){return String(e)}ETM.seek(t);return ETM.errs.splice(0).join(';')||'ok'});return r==='ok'||r}},
];
