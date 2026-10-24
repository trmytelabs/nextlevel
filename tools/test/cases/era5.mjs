// Era 5 cases (E5.1–E5.6): agents build the level ahead of the runner, rules unlock on schedule, boss, outro.
// Beyond ETM.probe() these cases reach the live era-5 module instance through Vite's module URL
// (performance resource entry for src/era5.ts?t=…) so they can read S.agents / S.chunks / K helpers.
import path from 'node:path';
const BEAT=60/128,BAR=BEAT*4,bar=b=>b*BAR,TOTAL=96*BAR;
const W=960,H=540,GY=H*0.66,CW=240,SPD=CW/BAR,PAINT=BAR*0.3;
const wire=k=>k<=3?bar(75.3+k*0.35):bar(k+74.45),fill=k=>wire(k)+BAR*0.35;
const TAG=(i=>i>=0?process.argv[i+1]:'')(process.argv.indexOf('--tag'));
const SHOTS=(i=>i>=0?process.argv[i+1]:'tools/test/shots')(process.argv.indexOf('--shots'));
const shotName=n=>path.join(SHOTS,`${TAG?TAG+'-':''}${n}.png`);
const snap=async(page,n)=>{await page.evaluate(()=>ETM.render());const f=shotName(n);await page.screenshot({path:f});console.log('      shot',f);return f};
// front of the build (same formula as the HUD meter): first chunk not fully painted, plus paint progress inside it
const frontAt=(t,px)=>{const cam=Math.max(0,t-bar(77))*SPD;for(let k=Math.floor(cam/CW);k<=Math.floor((cam+W)/CW)+3;k++){if(t<fill(k)+PAINT)return k*CW+(t<fill(k)?0:Math.min(1,(t-fill(k))/PAINT))*CW}return null};

// ---- fine-grained deterministic replay of bars 75.5 → 94.3 through the live module (memoised, shared by the 'end' cases)
let REPLAY=null;
async function replay(page){if(REPLAY)return REPLAY;
 const ok=await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/src\/era5\.ts/.test(u));window.__E5=null;for(const u of urls.reverse()){try{const m=await import(u);if(m.E5&&m.E5.K&&m.E5.K.fill){window.__E5=m.E5;break}}catch(e){}}return !!window.__E5});
 if(!ok){REPLAY={err:'could not import live src/era5.ts module (no resource entry)'};return REPLAY}
 const samples=[];let t0=bar(75.5);await page.evaluate(t=>ETM.seek(t),t0);
 const STEP=0.2,END=TOTAL-0.05;
 while(t0<END){const batch=await page.evaluate((step,n)=>{const out=[];for(let i=0;i<n;i++){ETM.step(step);const p=ETM.probe();const E5=window.__E5,S=E5.S,K=E5.K;if(!S||Math.abs(S.t-p.t)>1e-6){out.push({t:p.t,bar:p.bar,stale:true});continue}const t=p.t,cam=K.camAt(t);
   let front=null,unwired=null;for(let k=Math.floor(cam/K.CW);k<=Math.floor((cam+960)/K.CW)+4;k++){if(front==null&&t<K.fill(k)+K.PAINT)front=k*K.CW+(t<K.fill(k)?0:Math.min(1,(t-K.fill(k))/K.PAINT))*K.CW;if(unwired==null&&t<K.wire(k))unwired=k*K.CW}
   out.push({t,bar:p.bar,px:S.player.x,py:S.player.y,ground:S.player.ground,stun:S.player.stun,front,unwired,score:S.score,words:S.words,flash:S.flash,flashCol:S.flashCol,rules:S.rules.slice(),agents:S.agents.map(a=>[a.role,a.job?a.job.kind:'',a.status,+a.alpha.toFixed(2),Math.round(a.x),Math.round(a.y)]),boss:S.boss?{hp:S.boss.hp,dead:!!S.boss.dead,plates:S.boss.plates.length,words:S.boss.plates.filter(q=>q.word).length,alive:S.boss.plates.filter(q=>q.alive).length,wordsAlive:S.boss.plates.filter(q=>q.word&&q.alive).length}:null,bossWords:S.bossWords.length,signs:S.signs.length,signsLit:S.signs.filter(s=>s.lit).length,line:S.line.length,log:S.log.map(l=>l.text),done:S.done.size,bad:p.e5.bad})}return out},STEP,15);
  samples.push(...batch);t0=samples[samples.length-1].t;if(batch.some(s=>s.stale)){REPLAY={err:'live module S drifted from ETM probe (HMR reload during run?)',samples};return REPLAY}}
 REPLAY={samples};return REPLAY}

export default [
 {name:'E5.1 GL renderer initialised (gl.e5)',era:5,bar:75.5,fn:(p)=>p.gl&&p.gl.e5===true||`gl.e5=${p.gl&&p.gl.e5} quality=${p.quality} (2D fallback in use)`},

 // screenshots for visual review (lands within ~0.5 bar after the stated bar)
 {name:'E5 shot 77.1 first rule card + agents at front',era:5,bar:77.1,fn:async(p,h,page)=>{await snap(page,'bar77.1-rule1');return true}},
 {name:'E5 shot 80.0 mid-build, weapon online',era:5,bar:80.0,fn:async(p,h,page)=>{await snap(page,'bar80-build');return true}},
 {name:'E5 shot 83.1 double jump rule',era:5,bar:83.1,fn:async(p,h,page)=>{await snap(page,'bar83.1-rule3');return true}},
 {name:'E5 shot 86.6 low gravity, dense city',era:5,bar:86.6,fn:async(p,h,page)=>{await snap(page,'bar86.6-lowg');return true}},
 {name:'E5 shot 88.4 boss wireframe compile',era:5,bar:88.4,fn:async(p,h,page)=>{await snap(page,'bar88.4-bosswire');return true}},
 {name:'E5 shot 89.6 boss fight + rules panel',era:5,bar:89.6,fn:async(p,h,page)=>{await snap(page,'bar89.6-boss');return true}},
 {name:'E5 shot 91.5 boss fight mid',era:5,bar:91.5,fn:async(p,h,page)=>{await snap(page,'bar91.5-boss');return true}},
 {name:'E5 shot 93.4 boss end',era:5,bar:93.4,fn:async(p,h,page)=>{await snap(page,'bar93.4-bossend');return true}},
 {name:'E5 shot 94.2 agents retreat',era:5,bar:94.2,fn:async(p,h,page)=>{await snap(page,'bar94.2-retreat');return true}},
 {name:'E5 shot 94.95 end card fade-in',era:5,bar:94.95,fn:async(p,h,page)=>{await snap(page,'bar94.95-endcard');return true}},

 {name:'E5.3 rules unlock at 77/79/83/86/89 (probe history)',era:5,bar:89.6,fn:(p,h)=>{const RB=[77,79,83,86,89];const errs=[];
  for(let i=0;i<5;i++){const first=h.find(x=>x.era===4&&x.p.e5&&x.p.e5['rules#']>=i+1);if(!first){errs.push(`rule ${i} never unlocked`);continue}if(first.bar<RB[i]-1e-6||first.bar>RB[i]+0.6)errs.push(`rule ${i} first seen at bar ${first.bar.toFixed(2)} (want ${RB[i]}..${RB[i]+0.6})`);
   const early=h.find(x=>x.era===4&&x.bar<RB[i]-1e-6&&x.p.e5&&x.p.e5['rules#']>i);if(early)errs.push(`rule ${i} already present at bar ${early.bar.toFixed(2)}`)}
  if(p.e5['rules#']!==5||p.e5.ruleIdx!==4)errs.push(`at bar ${p.bar.toFixed(2)} rules#=${p.e5['rules#']} ruleIdx=${p.e5.ruleIdx}`);return errs.length?errs.join('; '):true}},

 {name:'E5.4a boss spawns at 89 with word plates',era:5,bar:89.3,fn:(p)=>{const b=p.e5.boss;if(!b)return 'no boss in S at bar '+p.bar.toFixed(2);const errs=[];if(!(b.hp>0))errs.push('hp='+b.hp);if(b.dead)errs.push('boss already dead');if(!(p.e5['bossWords#']>0))errs.push('no boss words queued (bossWords#='+p.e5['bossWords#']+')');if(Math.abs(b.fillT-bar(89))>1e-6)errs.push('fillT='+b.fillT);return errs.length?errs.join('; '):true}},

 {name:'E5.2 build front stays ahead of the player (every probe + 0.2 s replay)',era:5,bar:'end',fn:async(p,h,page)=>{const errs=[];let minLead=1e9;
  for(const x of h){if(x.era!==4||!x.p.e5||!x.p.e5.player)continue;const b=x.bar;if(b<76.5||b>=94)continue;const f=frontAt(x.t,x.p.e5.player.x);if(f==null)continue;const lead=(f-x.p.e5.player.x)/SPD;minLead=Math.min(minLead,lead);if(f<=x.p.e5.player.x)errs.push(`probe bar ${b.toFixed(2)}: front x=${f.toFixed(0)} <= player x=${x.p.e5.player.x.toFixed(0)}`)}
  const R=await replay(page);if(R.err)errs.push('replay: '+R.err);else{let worst=null,minU=1e9,minF=1e9;for(const s of R.samples){if(s.bar<76.5||s.bar>=94||s.front==null)continue;const lf=(s.front-s.px)/SPD,lu=(s.unwired-s.px)/SPD;minF=Math.min(minF,lf);minU=Math.min(minU,lu);if(s.front<=s.px&&(!worst||lf<worst.lf))worst={bar:s.bar,lf,px:s.px,front:s.front}}
   console.log(`      front lead: min ${minF.toFixed(2)} s painted / ${minU.toFixed(2)} s wireframe ahead of player (probe min ${minLead.toFixed(2)} s)`);if(worst)errs.push(`replay bar ${worst.bar.toFixed(2)}: paint front ${worst.front.toFixed(0)} behind player ${worst.px.toFixed(0)}`);if(minU<1)errs.push(`wireframe front only ${minU.toFixed(2)} s ahead at worst`)}
  return errs.length?errs.slice(0,6).join('; '):true}},

 {name:'E5.4b boss cleared before 94, player never below the floor',era:5,bar:'end',fn:async(p,h,page)=>{const errs=[];const R=await replay(page);if(R.err)return 'replay: '+R.err;const S=R.samples;
  const bossS=S.filter(s=>s.boss);if(!bossS.length)return 'boss never present in replay';const first=bossS[0];console.log(`      boss: ${first.boss.plates} plates, ${first.boss.words} word plates at bar ${first.bar.toFixed(2)}; words collected by 94: ${S.filter(s=>s.bar<94).slice(-1)[0].words}`);
  if(first.boss.words<1)errs.push('boss has no word plates at spawn');const cleared=bossS.find(s=>s.bar<94&&(s.boss.alive===0||s.boss.dead));if(!cleared){const last=bossS.filter(s=>s.bar<94).slice(-1)[0];errs.push(`boss not cleared before 94: ${last.boss.alive}/${last.boss.plates} plates alive (${last.boss.wordsAlive} word plates) at bar ${last.bar.toFixed(2)}`)}else console.log(`      boss cleared at bar ${cleared.bar.toFixed(2)}`);
  const below=S.filter(s=>s.bar>=77&&s.bar<94&&s.py>GY+0.5);const falls=[];for(let i=1;i<S.length;i++)if(S[i].bar<94&&S[i].py>GY+40&&S[i-1].py<=GY+40)falls.push(S[i].bar.toFixed(2));const stuns=S.filter((s,i)=>i&&s.stun>0&&S[i-1].stun<=0).map(s=>s.bar.toFixed(2));
  console.log(`      falls (y>GY+40): ${falls.length} at bars [${falls.join(', ')}]; stuns: ${stuns.length} at [${stuns.join(', ')}]`);if(below.length)errs.push(`player below floor in ${below.length} samples, first at bar ${below[0].bar.toFixed(2)} (y=${below[0].py.toFixed(0)}, falls at ${falls.join(',')})`);
  return errs.length?errs.join('; '):true}},

 {name:'E5.5 all 18 agents get jobs; no agent idle > 4 s in 76–93',era:5,bar:'end',fn:async(p,h,page)=>{const R=await replay(page);if(R.err)return 'replay: '+R.err;const S=R.samples.filter(s=>s.bar>=76&&s.bar<93);if(S[0].agents.length!==18)return 'agents='+S[0].agents.length;
  const n=18,everJob=Array(n).fill(false),maxIdle=Array(n).fill(0),idleSince=Array(n).fill(S[0].t),roles=S[0].agents.map(a=>a[0]);let maxWorking=0,minWorking=99;
  for(const s of S){let w=0;s.agents.forEach((a,i)=>{if(a[1]){everJob[i]=true;w++;idleSince[i]=s.t}else maxIdle[i]=Math.max(maxIdle[i],s.t-idleSince[i])});maxWorking=Math.max(maxWorking,w);minWorking=Math.min(minWorking,w)}
  const bad=[];for(let i=0;i<n;i++){if(!everJob[i])bad.push(`#${i} ${roles[i]} never had a job`);else if(maxIdle[i]>4)bad.push(`#${i} ${roles[i]} idle ${maxIdle[i].toFixed(1)} s`)}
  console.log(`      agents working per sample: ${minWorking}..${maxWorking}; max idle per agent: ${maxIdle.map((v,i)=>roles[i]+v.toFixed(1)).join(' ')}`);
  return bad.length?bad.join('; '):true}},

 {name:'E5.6 outro: agents gone, boss gone, HUD/sim stable to the end',era:5,bar:'end',fn:async(p,h,page)=>{const errs=[];if(p.e5.bad&&p.e5.bad.length)errs.push('NaN: '+p.e5.bad.join(','));if(!(p.t>=TOTAL-0.05||p.ended))errs.push(`run stopped at bar ${p.bar.toFixed(2)}`);
  const late=h.filter(x=>x.era===4&&x.bar>=95);if(!late.length)errs.push('no probes after bar 95');for(const x of late){const b=x.p.e5.boss;if(b&&!b.dead)errs.push(`boss alive at bar ${x.bar.toFixed(2)}`)}
  const R=await replay(page);if(R.err)errs.push('replay: '+R.err);else{const tail=R.samples.filter(s=>s.bar>=95.2);const vis=tail.find(s=>s.agents.some(a=>a[3]>0));if(vis)errs.push(`agents still visible at bar ${vis.bar.toFixed(2)}: alpha ${JSON.stringify(vis.agents.map(a=>a[3]))}`);const retreat=R.samples.find(s=>s.log.some(l=>/DISENGAGE/.test(l)));if(!retreat)errs.push('no SWARM > DISENGAGE log line');const nan=R.samples.find(s=>s.bad&&s.bad.length);if(nan)errs.push(`NaN at bar ${nan.bar.toFixed(2)}: ${nan.bad.slice(0,4).join(',')}`)}
  await snap(page,'bar96-final');return errs.length?errs.join('; '):true}},
];
