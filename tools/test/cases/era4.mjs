// Era 4 (2013 mobile / flappy, bars 56-75) cases E4.1-E4.4 from tools/test/CASES.md.
// The harness steps the sim with `playing=false`, and main.ts only dispatches lyric lines while playing, so the
// probes in `history` never see words. Every case here therefore shares one fine-grained replay of the era
// (0.1 s samples, lyrics dispatched by toggling playing inside each synchronous evaluate, so no rAF interleaves)
// and then seeks back to the harness clock; screenshots land in tools/test/shots/era4-*.png.
import fs from 'node:fs';
const BEAT=60/128,BAR=BEAT*4,bar=b=>b*BAR;
const SHOTS=[57.9,60.5,63.1,67.5,70,73.3,74.2,74.6,75,75.3,75.6]; // fixed screenshot bars (plus one 0.3 s after each death)
let REPLAY=null;
async function replay(page,p){if(REPLAY)return REPLAY;
 const shots=[],samples=[];const shot=async name=>{const f=`tools/test/shots/era4-${name}.png`;await page.evaluate(()=>ETM.render());await page.screenshot({path:f});shots.push(f)};
 await page.evaluate(t=>ETM.seek(t),bar(56));let next=[...SHOTS],deathShot=-1,prevAlive=true;
 while(true){const s=await page.evaluate(()=>{ETM.setPlaying(true);ETM.step(0.1);ETM.setPlaying(false);const q=ETM.probe();return{t:q.t,bar:q.bar,era:q.era,lyricIdx:q.lyricIdx,e4:q.e4}});samples.push(s);
  if(prevAlive&&s.e4.bird.alive===false)deathShot=s.t+0.3;prevAlive=s.e4.bird.alive;
  if(deathShot>0&&s.t>=deathShot){deathShot=-1;await shot('death-bar'+s.bar.toFixed(1))}
  if(next.length&&s.bar>=next[0]-1e-6){await shot('bar'+next.shift())}
  if(s.bar>=75.6)break}
 const frame=await page.evaluate(()=>{ETM.seek(60*1.875+0.6*1.875);ETM.step(0.05);ETM.render();const c=document.querySelector('#c'),x=c.getContext('2d'),k=c.width/960;const px=(X,Y)=>{const d=x.getImageData(Math.round(X*k),Math.round(Y*k),1,1).data;return[d[0],d[1],d[2]]};const lum=([r,g,b])=>(r+g+b)/3;
  const bezel=px(480-131+5,300),skies=[0,1,2,3,4].map(i=>px(365+20+i*45,78+100)),sky=skies.find(c=>c[2]>150&&c[2]>c[0]+40)||skies[0],outside=px(120,400);let bright=0;for(let i=0;i<40;i+=2)bright=Math.max(bright,lum(px(365+2+i,58+10)));return{bezel,sky,outside,statusBright:bright}});
 await page.evaluate(t=>ETM.seek(t),p.t);
 return REPLAY={samples,shots,frame}}
const at=(S,b)=>S.find(s=>s.bar>=b-1e-6);
const lyricWords=()=>{try{const src=fs.readFileSync('src/core.ts','utf8');let n=0;for(const m of src.matchAll(/\[(\d+(?:\.\d+)?),"([^"]+)"\]/g)){const b=+m[1];if(b>=56&&b<75)n+=m[2].split(' ').length}return n}catch{return -1}};

export default [
 {name:'E4.1 pipes every 2 beats, word signs in the gaps, phone frame + status bar',era:4,bar:56,fn:async(p,h,page)=>{const {samples:S,frame:F}=await replay(page,p);
  // pipes: with the bird alive and no death in between, score advances by exactly one pipe per 2 beats
  let seg=null;for(let b=57.95;b+3<=74&&!seg;b+=0.5){const a=at(S,b),c=at(S,b+3);if(a&&c&&S.slice(S.indexOf(a),S.indexOf(c)+1).every(s=>s.e4.bird.alive))seg=[a,c]}
  if(!seg)return 'no 3-bar stretch without a death to measure pipe cadence';const d=seg[1].e4.score-seg[0].e4.score;if(d!==6)return `score advanced ${d} over 3 bars (bars ${seg[0].bar.toFixed(2)}-${seg[1].bar.toFixed(2)}), expected 6 pipes`;
  // word signs exist in the gaps once a line has been dispatched
  const sg=S.filter(s=>s.bar>57.2&&s.bar<64).map(s=>s.e4.signs);if(Math.max(...sg)<2)return `no word signs queued on pipes (signs ${Math.max(...sg)}) - lyric lines not reaching E4.onLine`;
  // frame: phone bezel is dark grey, game sky is blue, desk outside the phone is dark, status bar has white text
  const lum=([r,g,b])=>(r+g+b)/3;if(lum(F.bezel)>80||lum(F.bezel)<8)return 'phone bezel pixel not dark grey: '+F.bezel;if(!(F.sky[2]>150&&F.sky[2]>F.sky[0]+40))return 'screen sky pixel not blue: '+F.sky;if(lum(F.outside)>70)return 'desk outside phone too bright: '+F.outside;if(F.statusBright<170)return 'status bar text not found (max lum '+F.statusBright+')';return true}},
 {name:'E4.2 autopilot: deaths <= 3, auto-retry within 1 s',era:4,bar:56,fn:async(p,h,page)=>{const {samples:S}=await replay(page,p);
  const deaths=[];for(let i=1;i<S.length;i++)if(S[i-1].e4.bird.alive&&!S[i].e4.bird.alive)deaths.push(S[i]);
  const n=at(S,74.9).e4.deaths;if(n>3)return `${n} deaths in the era (at bars ${deaths.map(s=>s.bar.toFixed(2)).join(', ')})`;
  for(const d of deaths){const back=S.find(s=>s.t>d.t&&s.e4.bird.alive);if(!back)return `no respawn after death at bar ${d.bar.toFixed(2)}`;const dt=back.t-(BEAT-back.e4.bird.inv)-d.e4.bird.deadT; // inv counts down from BEAT at the respawn frame, so this is exact despite 0.1 s sampling
   if(dt>1.0)return `respawn took ${dt.toFixed(2)} s after death at bar ${d.bar.toFixed(2)}`;if(!back.e4.started)return 'bird not started after respawn'}
  return true}},
 {name:'E4.3 words collected >= 70%',era:4,bar:56,fn:async(p,h,page)=>{const {samples:S}=await replay(page,p);const e=at(S,74.9).e4,want=lyricWords();
  if(!e.total)return 'no lyric words dispatched to era 4 (S.total=0): hud() only dispatches while playing';if(want>0&&e.total!==want)return `S.total ${e.total} != ${want} words in LYRICS for bars 56-75`;
  return e.got/e.total>=0.7||`collected ${e.got}/${e.total} = ${(100*e.got/e.total).toFixed(0)}%`}},
 {name:'E4.4 bridge ghosts, agents fly out at 73, clean handoff at 75',era:4,bar:56,fn:async(p,h,page)=>{const {samples:S,shots}=await replay(page,p);
  if(at(S,66.4).e4['ghosts#']!==0)return 'ghosts before the bridge';const g67=at(S,67.0).e4['ghosts#'];if(g67<1)return 'no ghost birds at bar 67';const g729=at(S,72.9).e4['ghosts#'];if(g729<12)return `only ${g729} ghosts at bar 72.9`;
  const a=at(S,73.2).e4;if(a['ghosts#']!==0||a['agents#']!==14)return `at 73.2 ghosts ${a['ghosts#']} agents ${a['agents#']} (expected 0 / 14)`;if(a['ripples#']>40)return `ripples piling up after 73: ${a['ripples#']}`;
  const o=at(S,74.2).e4.agentsOut;if(o!==14)return `${o}/14 agents left the screen by bar 74.2`;
  const q=at(S,75.0);if(q.era!==4)return 'era index not 5 at bar 75';
  const bad=S.filter(s=>s.e4.bad&&s.e4.bad.length);if(bad.length)return 'NaN in e4 at bar '+bad[0].bar.toFixed(2)+': '+bad[0].e4.bad.join(',');
  return true}},
];
