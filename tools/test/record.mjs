#!/usr/bin/env node
// Record the autopilot run to an MP4 by stepping the deterministic sim frame by frame in headless Edge/Chrome
// and encoding the screenshots with ffmpeg. No audio (mux the Suno track later:
//   ffmpeg -i out/run.mp4 -i public/song.mp3 -c:v copy -c:a aac -shortest out/run-with-song.mp4 ).
//   node tools/test/record.mjs [--fps 30] [--from 0 --to 96] [--width 1280] [--out out/run.mp4] [--url ...] [--q high]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const argv=process.argv.slice(2);const opt=(k,d)=>{const i=argv.indexOf('--'+k);return i>=0?argv[i+1]:d};
const FPS=+opt('fps',30),FROM=+opt('from',0),TO=+opt('to',96),WIDTH=+opt('width',1280),HEIGHT=Math.round(WIDTH*9.9/16/2)*2,OUT=opt('out','out/run.mp4'),Q=opt('q','high');
const BASE=opt('url',process.env.ETM_URL||'http://localhost:5174/maximalist/');const BAR=60/128*4;
const EDGE=process.env.EDGE||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
const FF=process.env.FFMPEG||[path.join(process.env.LOCALAPPDATA||'','Microsoft/WinGet/Links/ffmpeg.exe'),path.join(process.env.LOCALAPPDATA||'','Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe')].find(p=>fs.existsSync(p))||'ffmpeg';
const frames=path.resolve('out/frames');fs.rmSync(frames,{recursive:true,force:true});fs.mkdirSync(frames,{recursive:true});fs.mkdirSync(path.dirname(path.resolve(OUT)),{recursive:true});
const browser=await puppeteer.launch({executablePath:EDGE,headless:true,protocolTimeout:600000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio','--disable-dev-shm-usage','--hide-scrollbars',`--window-size=${WIDTH},${HEIGHT}`]});
const page=await browser.newPage();await page.setViewport({width:WIDTH,height:HEIGHT,deviceScaleFactor:1});
const url=new URL(BASE);url.searchParams.set('q',Q);await page.goto(url.href,{waitUntil:'networkidle0',timeout:90000});
await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000});await new Promise(r=>setTimeout(r,2000));await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000});
await page.evaluate(()=>{ETM.setAuto('on');ETM.setPlaying(false);document.querySelector('#bar').style.visibility='hidden';document.querySelector('#help').style.display='none';document.querySelector('#auto').style.display='none'});
await page.evaluate(t=>ETM.seek(t),FROM*BAR);
const total=Math.round((TO-FROM)*BAR*FPS);const t0=Date.now();
for(let i=0;i<total;i++){
  await page.evaluate(dt=>{ETM.step(dt);ETM.render()},1/FPS);
  const buf=await page.screenshot({type:'jpeg',quality:90,captureBeyondViewport:false});fs.writeFileSync(path.join(frames,String(i).padStart(5,'0')+'.jpg'),buf);
  if(i%(FPS*5)===0){const el=(Date.now()-t0)/1000;process.stdout.write(`frame ${i}/${total}  bar ${(FROM+i/FPS/BAR).toFixed(1)}  ${el.toFixed(0)}s elapsed, eta ${(el/(i+1)*(total-i)).toFixed(0)}s\n`)}
}
await browser.close();
const r=spawnSync(FF,['-y','-framerate',String(FPS),'-i',path.join(frames,'%05d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',path.resolve(OUT)],{stdio:'inherit'});
console.log(r.status===0?`wrote ${OUT}`:'ffmpeg failed with status '+r.status);process.exit(r.status||0);
