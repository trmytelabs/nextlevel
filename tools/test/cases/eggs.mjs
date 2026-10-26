// Secrets (src/eggs.ts): one per stage, found only by a player. Each isolated case drives the real input path
// (key events, the pointer) through ETM.step(..., false), checks the find, and clears the flags again afterwards.
const BAR=60/128*4;
const kd=k=>`dispatchEvent(new KeyboardEvent('keydown',{key:'${k}',bubbles:true}))`,ku=k=>`dispatchEvent(new KeyboardEvent('keyup',{key:'${k}',bubbles:true}))`;
export default [
 {name:'X1 the autopilot never finds a secret (a watched play-through ends with 0 / 5)',era:null,bar:'end',isolated:false,fn:async(p,h,page)=>{
  const f=await page.evaluate(()=>ETM.eggs.found.slice());return f.every(x=>!x)||'autopilot found: '+JSON.stringify(f)}},

 {name:'X2 arcade: the first line\'s "coin" is gold, and the autopilot leaves it whole',era:1,bar:9,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{ETM.seek(3.0);for(let i=0;i<24;i++)ETM.step(0.25);const L=ETM.raw.e1().lines[0];const g=L&&L.words.filter(w=>w.gold);
   return{n:g?g.length:-1,text:g&&g[0]&&g[0].text,left:g&&g[0]&&g[0].left,total:g&&g[0]&&g[0].total,others:L?L.words.filter(w=>!w.gold&&w.left<w.total).length:0}});
  if(r.n!==1||!/^coin/i.test(r.text||''))return 'gold words on line 1: '+JSON.stringify(r);
  if(r.left!==r.total)return `the autopilot chipped the gold word (${r.left}/${r.total})`;
  return r.others>0||'the autopilot chipped nothing at all on line 1 (test is not exercising it)'}},

 {name:'X3 16-bit: pressing down on the flashing pipe drops into the secret room, finds secret 2, and walking right comes back up the same pipe',era:2,bar:30,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(new Function(`ETM.eggs.found.fill(false);ETM.seek(40);ETM.step(0.05,false);const S=ETM.raw.e2();const q=S.plats.find(o=>o.secret);if(!q)return{err:'no secret pipe'};
   const pl=S.pl;pl.x=q.x+16;pl.y=q.y;pl.g=true;pl.on=q;pl.vx=0;S.camX=Math.max(0,pl.x-140);
   ${kd('s')};ETM.step(0.9,false);${ku('s')};const room=S.ug&&S.ug.ph,found=ETM.eggs.found[1];
   ${kd('d')};for(let i=0;i<40&&S.ug;i++)ETM.step(0.25,false);${ku('d')};
   const out={room,found,back:!S.ug,x:Math.round(S.pl.x),pipe:q.x+16,pipeAt:Math.round((q.x-80)/(50/(60/128))+0)};ETM.eggs.found.fill(false);return out`));
  if(r.err)return r.err;if(r.room!=='room')return 'not in the room after pressing down: '+r.room;if(!r.found)return 'secret 2 not counted';
  if(!r.back)return 'never came back up';return Math.abs(r.x-r.pipe)<40||`came back up at x=${r.x}, pipe at ${r.pipe}`}},

 {name:'X4 racer: driving over the rainbow pad finds secret 3',era:3,bar:45,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{ETM.eggs.found.fill(false);ETM.seek(85.0);ETM.step(0.05,false);const S=ETM.raw.e3();const d0=S.padS-S.s;for(let i=0;i<30&&!S.padGot;i++){S.x=S.padX;ETM.step(0.1,false)}
   const out={d0:Math.round(d0),got:S.padGot,found:ETM.eggs.found[2]};ETM.eggs.found.fill(false);return out});
  if(!(r.d0>0))return 'pad already behind the car at the start: '+JSON.stringify(r);return (r.got&&r.found)||'pad not taken: '+JSON.stringify(r)}},

 {name:'X5 phone: flying through the gold star finds secret 4',era:4,bar:63,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{ETM.eggs.found.fill(false);ETM.seek(118.5);ETM.step(0.05,false);const S=ETM.raw.e4();const at=S.starAt;
   for(let i=0;i<400&&ETM.now()<at+0.4;i++){const b=S.bird;b.y=S.starY;b.vy=0;b.inv=5;b.hover=false;ETM.step(1/60,false)}
   const out={at:+at.toFixed(2),got:S.starGot,found:ETM.eggs.found[3]};ETM.eggs.found.fill(false);return out});
  if(!(r.at>114.5&&r.at<131))return 'star is not inside the phone stage: '+r.at;return (r.got&&r.found)||'star not taken: '+JSON.stringify(r)}},

 {name:'X6 VR: one golden block in a gap; a swipe through it finds secret 5, missing it costs no combo',era:5,bar:84,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{ETM.eggs.found.fill(false);ETM.seek(84.5*1.875);ETM.step(0.05,false);const S=ETM.raw.e5();const g=S.blocks.filter(b=>b.gold);if(g.length!==1)return{err:'gold blocks: '+g.length};const b=g[0];
   const near=S.blocks.filter(o=>!o.gold&&Math.abs(o.hitT-b.hitT)<0.35).length;const t0=b.hitT-0.18,t1=b.hitT+0.18;
   while(ETM.now()<b.hitT+0.3){const u=Math.min(1,Math.max(0,(ETM.now()-t0)/(t1-t0)));ETM.ptr.x=0.05+0.4*u;ETM.ptr.y=0.08+0.42*u;ETM.ptr.t=performance.now();ETM.step(1/60,false)}
   const hit=b.hit>0,found=ETM.eggs.found[4];
   // autopilot run over the same moment: it must neither cut the block nor break the combo on it
   ETM.eggs.found.fill(false);ETM.seek(84.3*1.875);ETM.step(0.05);const S2=ETM.raw.e5();const c0=S2.combo,m0=S2.misses;ETM.step(1.2);const b2=S2.blocks.find(o=>o.gold);
   const out={near,hit,found,autoHit:b2.hit>0,autoFound:ETM.eggs.found[4],comboKept:S2.combo>=c0&&S2.combo>0,missesAdded:S2.misses-m0};ETM.eggs.found.fill(false);return out});
  if(r.err)return r.err;const bad=[];if(r.near)bad.push(r.near+' lyric block(s) within 0.35 s of the gold block');if(!r.hit||!r.found)bad.push('swipe did not take it');
  if(r.autoHit||r.autoFound)bad.push('the autopilot took it');if(!r.comboKept||r.missesAdded)bad.push('the passing gold block cost the combo ('+r.missesAdded+' misses)');return bad.length===0||bad.join('; ')}},

 {name:'X7 end card: a hint with 0 found, a count with some, the special message with all 5',era:null,bar:3,isolated:true,fn:async(p,h,page)=>{
  const r=await page.evaluate(()=>{const E=ETM.eggs.found,read=()=>{ETM.seek(95.6*1.875-0.3);ETM.step(0.3);return{txt:document.querySelector('#eggEnd').textContent,vis:getComputedStyle(document.querySelector('#eggEnd')).display!=='none',g:document.body.classList.contains('egg5')}};
   E.fill(false);const a=read();E.fill(false);E[0]=E[2]=true;const b=read();E.fill(true);const c=read();E.fill(false);return{a,b,c}});
  const bad=[];if(!r.a.vis||!/5 SECRETS HIDDEN/.test(r.a.txt))bad.push('0 found: '+JSON.stringify(r.a));if(!/2 \/ 5/.test(r.b.txt))bad.push('2 found: '+r.b.txt);
  if(!/ALL 5 SECRETS FOUND/.test(r.c.txt)||!r.c.g)bad.push('5 found: '+JSON.stringify(r.c));await page.evaluate(t=>{ETM.seek(t);ETM.step(0)},p.t);return bad.length===0||bad.join('; ')}},
];
