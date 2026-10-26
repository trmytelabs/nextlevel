#!/usr/bin/env node
// README screenshots: plays the canonical layout forward (no seeks inside a shot's lead-in, so the arcade crawl and the
// platformer have their lyric lines on screen) and saves one JPEG per shot into docs/.
//   node tools/test/docshots.mjs [--url http://localhost:5173/nextlevel/?q=high]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i>0?process.argv[i+1]:d};
const BASE=arg('url','http://localhost:5173/nextlevel/?q=high');const BAR=60/128*4;
const EDGE=process.env.EDGE||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
// [file, start bar (seek here), shot bar (step forward to here), hide HUD]
const SHOTS=[['era1-arcade',1.6,4.75,false],['era2-platformer',19.4,22.3,false],['era3-racer',44.2,46.6,false],['era4-phone',62,65.6,false],['era5-saber',82,85.5,false],['end-card',94,95.9,false]];
const browser=await puppeteer.launch({executablePath:EDGE,headless:true,protocolTimeout:600000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio','--hide-scrollbars','--window-size=1280,800']});
const page=await browser.newPage();await page.setViewport({width:1100,height:700,deviceScaleFactor:1});
await page.goto(BASE,{waitUntil:'networkidle0',timeout:90000});
await page.waitForFunction('window.ETM&&window.ETM.probe',{timeout:90000});await new Promise(r=>setTimeout(r,1500));
await page.evaluate(async()=>{ETM.setAuto('on');ETM.setPlaying(false);try{await document.fonts.ready}catch{}});
fs.mkdirSync('docs',{recursive:true});
for(const [name,from,at,noHud] of SHOTS){
 await page.evaluate((a,b,h)=>{const hud=document.querySelector('#hud');if(hud)hud.style.visibility=h?'hidden':'visible';ETM.seek(a);while(ETM.now()<b-1e-6)ETM.step(Math.min(0.25,b-ETM.now()));ETM.render();ETM.render()},from*BAR,at*BAR,noHud);
 await new Promise(r=>setTimeout(r,400));
 const el=await page.$('#c');await el.screenshot({path:`docs/${name}.jpg`,type:'jpeg',quality:86});console.log('saved docs/'+name+'.jpg');
}
await browser.close();
