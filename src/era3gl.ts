import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {W,H,dpr,hash,clamp} from './core';
import {E3} from './era3';

// ---------- ERA 3 renderer: Saturn-era arcade racer in the spirit of Daytona USA's speedway course ----------
const {ROADW,L,curve}=E3.K;
let ok=false,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,cars:any[]=[],playerCar:any,reels:THREE.Mesh[]=[],texCache=new Map<string,THREE.Texture>(),gantries=new Map<any,any>(),ANISO=8;
const TEXL=new THREE.TextureLoader();
function fileTex(path:string,fallback:THREE.Texture,rx=1,ry=1,srgb=true){const t=TEXL.load(import.meta.env.BASE_URL+path,tt=>{tt.wrapS=tt.wrapT=THREE.RepeatWrapping;tt.repeat.set(rx,ry);tt.anisotropy=ANISO;if(srgb)tt.colorSpace=THREE.SRGBColorSpace;tt.needsUpdate=true},undefined,()=>{t.image=fallback.image;t.needsUpdate=true});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=ANISO;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t}
function canvasTex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d')!);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t}
function lineTex(text:string){return canvasTex(1024,256,x=>{x.fillStyle='rgba(10,12,28,.92)';x.fillRect(0,0,1024,256);x.strokeStyle='#ffe066';x.lineWidth=6;x.strokeRect(3,3,1018,250);let rows=[text];if(text.length>24){const ws=text.split(' ');let best=1e9;for(let k=1;k<ws.length;k++){const a=ws.slice(0,k).join(' '),b=ws.slice(k).join(' '),m=Math.max(a.length,b.length);if(m<best){best=m;rows=[a,b]}}}const longest=Math.max(...rows.map(r=>r.length));const fs=Math.max(22,Math.min(66,Math.floor(960/longest)));x.font=fs+"px 'Press Start 2P',monospace";x.fillStyle='#ffe066';x.textAlign='center';x.textBaseline='middle';rows.forEach((r,i)=>x.fillText(r,512,rows.length===1?128:(i?176:80)))})}
function makeGantry(w:any){const g=new THREE.Group();const span=ROADW*2+5;for(const k of[-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(0.7,11,0.7),new THREE.MeshLambertMaterial({color:0x3a4a6a}));leg.position.set(k*(ROADW+2.5),3.9,0);g.add(leg)}
 const beam=new THREE.Mesh(new THREE.BoxGeometry(span,0.9,0.9),new THREE.MeshLambertMaterial({color:0xd82a3a}));beam.position.set(0,9.5,0);g.add(beam);
 const text=new THREE.Mesh(new THREE.PlaneGeometry(ROADW*2+1,3.8),new THREE.MeshBasicMaterial({map:lineTex(w.text),transparent:true,side:THREE.DoubleSide}));text.position.set(0,7.0,0.5);g.add(text);
 const lx=w.x*ROADW;const marker=new THREE.Mesh(new THREE.BoxGeometry(ROADW*0.42,0.5,1.1),new THREE.MeshBasicMaterial({color:0x3cff6a}));marker.position.set(lx,10.15,0);g.add(marker);
 const chev=new THREE.Mesh(new THREE.ConeGeometry(0.9,1.3,4),new THREE.MeshBasicMaterial({color:0x3cff6a}));chev.rotation.x=Math.PI;chev.rotation.y=Math.PI/4;chev.position.set(lx,4.6,0.5);g.add(chev);
 const lane=new THREE.Mesh(new THREE.PlaneGeometry(ROADW*0.42,10),new THREE.MeshBasicMaterial({color:0x3cff6a,transparent:true,opacity:0.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));lane.rotation.x=-Math.PI/2;lane.position.set(lx,0.06,5);g.add(lane);
 return{g,text,marker,chev,lane,state:''}}
function textSprite(text,color,bg='rgba(8,8,16,.75)'){const key=text+'|'+color+'|'+bg;let tex=texCache.get(key);if(!tex){tex=canvasTex(512,128,x=>{x.font="40px 'Press Start 2P',monospace";const tw=Math.min(500,x.measureText(text).width+32);x.fillStyle=bg;x.fillRect(256-tw/2,20,tw,88);x.strokeStyle=color;x.lineWidth=4;x.strokeRect(256-tw/2,20,tw,88);x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64)});texCache.set(key,tex)}const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sp.scale.set(6,1.5,1);return sp}
const flat=(color,extra={})=>new THREE.MeshLambertMaterial({color,flatShading:true,...extra} as any);
const hex=(n:number)=>'#'+n.toString(16).padStart(6,'0');
const LIVERY=[{b:0xf4f4f4,s:0xd82a3a,s2:0x2a4ad8,n:'41'},{b:0xf2c230,s:0x111111,s2:0x111111,n:'7'},{b:0x2fb85a,s:0xffffff,s2:0xffffff,n:'12'},{b:0x2f6fe8,s:0xffffff,s2:0xffe066,n:'3'},{b:0xff7a1a,s:0x111111,s2:0xffffff,n:'22'},{b:0x8a3ad8,s:0xffe066,s2:0xffe066,n:'9'},{b:0x1a1a22,s:0xd82a3a,s2:0xd82a3a,n:'14'},{b:0x20c8c0,s:0xffffff,s2:0x111111,n:'28'},{b:0xd82a3a,s:0xffffff,s2:0xffffff,n:'5'},{b:0xffffff,s:0x2fb85a,s2:0x2fb85a,n:'17'},{b:0xe83a7a,s:0xffffff,s2:0xffffff,n:'33'},{b:0x9a9aa8,s:0xff7a1a,s2:0x111111,n:'8'},{b:0x1a2a7a,s:0xffe066,s2:0xffe066,n:'44'}];
const SPONSORS=[['MAXIMAL','GoA'],['TURN IT UP','ONE DESK'],['SPEED OF LIGHT','PIPELINE'],['EVERYTHING','THEN SOME'],['BOX TALKS','BACK'],['NO BACKLOG','RACING'],['HUNDRED','HANDS'],['DESK CO','TOOLS'],['ASK ONCE','ANSWERS'],['SECTOR 07','BUILDS'],['LEVEL UP','GARAGE'],['THREAD','THE GAP'],['WIRE','LIGHTS']];
// body cross-sections along the length: [z, half width, shoulder height, roof height, greenhouse width fraction]
const STATIONS=[[-2.4,0.92,0.84,0.90,0.86],[-2.0,1.02,0.94,0.98,0.86],[-1.5,1.06,0.98,1.06,0.84],[-1.1,1.07,0.99,1.22,0.74],[-0.7,1.07,1.0,1.38,0.66],[-0.1,1.07,1.0,1.41,0.64],[0.35,1.07,1.0,1.40,0.65],[0.8,1.06,1.0,1.24,0.74],[1.2,1.04,0.98,1.03,0.86],[1.7,1.0,0.92,0.94,0.9],[2.15,0.96,0.82,0.84,0.92],[2.4,0.9,0.7,0.74,0.95]];
const Y0=0.34;
function sideTex(liv,idx,frontLeft){return canvasTex(512,128,x=>{const b=hex(liv.b),s1=hex(liv.s),s2=hex(liv.s2);x.fillStyle=b;x.fillRect(0,0,512,128);
 x.fillStyle=s1;x.fillRect(0,78,512,14);x.fillStyle=s2;x.fillRect(0,92,512,6);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,116,512,12);
 const F=frontLeft?1:-1,fx=frontLeft?0:512;const at=(u)=>fx+F*u;
 // door number
 x.fillStyle='#fff';x.beginPath();x.ellipse(256,50,70,40,0,0,7);x.fill();x.fillStyle=s1==='#ffffff'?'#111':s1;x.font="bold 58px Arial Black, Arial, sans-serif";x.textAlign='center';x.textBaseline='middle';x.fillText(liv.n,256,54);
 // sponsor blocks: quarter panel and front fender
 const sp=SPONSORS[idx%SPONSORS.length];x.font="bold 22px Arial Black, Arial, sans-serif";x.fillStyle=s2;x.fillRect(frontLeft?350:40,22,122,30);x.fillStyle=s2==='#ffffff'||s2==='#ffe066'?'#111':'#fff';x.fillText(sp[0],frontLeft?411:101,38);
 x.fillStyle='#fff';x.fillRect(frontLeft?36:356,24,120,26);x.fillStyle='#111';x.font="bold 18px Arial Black, Arial, sans-serif";x.fillText(sp[1],frontLeft?96:416,38);
 // contingency stickers behind the front wheel
 const cx0=frontLeft?30:430;['#e8402c','#2a4ad8','#ffe066','#2fb85a','#fff','#111'].forEach((c,k)=>{x.fillStyle=c;x.fillRect(cx0+(k%3)*18,60+Math.floor(k/3)*14,14,10)});
 // headlight and taillight decals at the ends
 x.fillStyle='#111';x.fillRect(frontLeft?2:496,70,14,22);x.fillStyle='#ff2a2a';x.fillRect(frontLeft?496:2,74,14,14)})}
function topTex(liv){return canvasTex(512,256,x=>{const b=hex(liv.b),s1=hex(liv.s),s2=hex(liv.s2);x.fillStyle=b;x.fillRect(0,0,512,256);x.fillStyle=s1;x.fillRect(0,96,512,26);x.fillRect(0,134,512,26);x.fillStyle=s2;x.fillRect(0,122,512,12);
 x.fillStyle='#fff';x.beginPath();x.ellipse(256,128,70,78,0,0,7);x.fill();x.fillStyle=s1==='#ffffff'?'#111':s1;x.font="bold 96px Arial Black, Arial, sans-serif";x.textAlign='center';x.textBaseline='middle';x.fillText(liv.n,256,136);
 x.fillStyle='rgba(0,0,0,.35)';x.fillRect(430,110,40,36);x.fillRect(42,110,40,36)})}
function loft(liv,idx){const pos:number[]=[],uv:number[]=[],idxs:number[][]=[[],[],[],[],[]];const rings:number[][]=[];
 const pts=(st)=>{const[z,w,ys,yt,gf]=st,wg=w*gf;return[[-w*0.94,Y0,z],[-w,Y0+0.22,z],[-w,ys,z],[-wg,yt,z],[wg,yt,z],[w,ys,z],[w,Y0+0.22,z],[w*0.94,Y0,z]]};
 const uvFor=(k,p)=>{const u=(p[2]+2.4)/4.8,v=(p[1]-Y0)/1.1;if(k<=2)return[u,v];if(k>=4&&k<=6)return[1-u,v];if(k===3)return[u,(p[0]+1.1)/2.2];return[0,0]};
 // each strip gets its own vertices so uvs and flat normals stay clean
 for(let i=0;i<STATIONS.length-1;i++){const A=pts(STATIONS[i]),B=pts(STATIONS[i+1]);const zm=(STATIONS[i][0]+STATIONS[i+1][0])/2;
  for(let k=0;k<8;k++){const k2=(k+1)%8;let m=k<=2?0:(k>=4&&k<=6?1:(k===3?2:4));
   const cabin=zm>-1.45&&zm<1.15;if((k===2||k===4)&&cabin)m=3;if(k===3&&((zm>-1.45&&zm<-0.75)||(zm>0.3&&zm<1.2)))m=3;
   const q=[A[k],A[k2],B[k2],B[k]];const base=pos.length/3;for(const p of q){pos.push(p[0],p[1],p[2]);const t=uvFor(k,p);uv.push(t[0],t[1])}idxs[m].push(base,base+1,base+2,base,base+2,base+3)}}
 // end caps
 for(const[st,flip]of[[STATIONS[0],false],[STATIONS[STATIONS.length-1],true]]){const P=pts(st);const base=pos.length/3;for(const p of P){pos.push(p[0],p[1],p[2]);uv.push(0.5,0.5)}for(let k=1;k<7;k++){if(flip)idxs[4].push(base,base+k,base+k+1);else idxs[4].push(base,base+k+1,base+k)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const all=[];let start=0;idxs.forEach((arr,m)=>{all.push(...arr);g.addGroup(start,arr.length,m);start+=arr.length});g.setIndex(all);g.computeVertexNormals();
 const mats=[new THREE.MeshLambertMaterial({map:sideTex(liv,idx,false),flatShading:true}),new THREE.MeshLambertMaterial({map:sideTex(liv,idx,true),flatShading:true}),new THREE.MeshLambertMaterial({map:topTex(liv),flatShading:true}),flat(0x14202e),flat(liv.b)];
 return new THREE.Mesh(g,mats)}
let blobT:THREE.Texture|null=null;
function blobTex(){if(!blobT){blobT=canvasTex(64,128,x=>{x.scale(1,2);const g=x.createRadialGradient(32,32,8,32,32,32);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(0.55,'rgba(0,0,0,.4)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});blobT.magFilter=THREE.LinearFilter}return blobT}
function makeCar(liv,idx=0){const g=new THREE.Group();const body=loft(liv,idx);g.add(body);const dark=flat(0x111115),chrome=flat(0xd0d0d8);
 // bumpers, splitter, spoiler and struts, roof flaps, mirror, exhaust
 const fb=new THREE.Mesh(new THREE.BoxGeometry(1.86,0.16,0.14),flat(liv.b));fb.position.set(0,0.48,2.42);g.add(fb);const spl=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.05,0.3),dark);spl.position.set(0,0.36,2.42);g.add(spl);
 const rb=new THREE.Mesh(new THREE.BoxGeometry(1.86,0.16,0.14),flat(liv.b));rb.position.set(0,0.52,-2.42);g.add(rb);
 const sp=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.05,0.42),dark);sp.position.set(0,1.1,-2.3);sp.rotation.x=-0.3;g.add(sp);for(const k of[-1,1]){const st=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.24,0.26),dark);st.position.set(k*0.8,0.98,-2.3);g.add(st);const flap=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.16),dark);flap.position.set(k*0.3,1.42,-0.5);g.add(flap)}
 const mir=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.08,0.12),flat(liv.b));mir.position.set(1.12,1.02,0.75);g.add(mir);const ex=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,8),chrome);ex.rotation.z=Math.PI/2;ex.position.set(0.98,0.42,-1.0);g.add(ex);
 // window net on the driver's side
 const net=new THREE.Mesh(new THREE.PlaneGeometry(0.78,0.34),new THREE.MeshLambertMaterial({map:canvasTex(64,32,x=>{x.fillStyle='rgba(0,0,0,0)';x.clearRect(0,0,64,32);x.strokeStyle='#e8e8e8';x.lineWidth=2;for(let i=0;i<=64;i+=8){x.beginPath();x.moveTo(i,0);x.lineTo(i,32);x.stroke()}for(let j=0;j<=32;j+=8){x.beginPath();x.moveTo(0,j);x.lineTo(64,j);x.stroke()}}),transparent:true,side:THREE.DoubleSide}));net.position.set(-0.99,1.18,0.25);net.rotation.y=-Math.PI/2;net.rotation.z=0.0;g.add(net);
 // wheel wells and wheels
 const wheels:THREE.Mesh[]=[];for(const[xs,z]of[[-1,1.5],[1,1.5],[-1,-1.45],[1,-1.45]]){const well=new THREE.Mesh(new THREE.CylinderGeometry(0.56,0.56,0.14,14),dark);well.rotation.z=Math.PI/2;well.position.set(xs*1.0,0.5,z);g.add(well);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.34,14),flat(0x16161c));w.rotation.z=Math.PI/2;w.position.set(xs*1.08,0.44,z);g.add(w);wheels.push(w);const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.27,0.36,10),chrome);rim.rotation.z=Math.PI/2;rim.position.copy(w.position);g.add(rim);const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.4,8),flat(0x3a3a44));hub.rotation.z=Math.PI/2;hub.position.copy(w.position);g.add(hub)}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.0,5.6),new THREE.MeshBasicMaterial({map:blobTex(),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=0.03;g.add(shadow);
 const label=textSprite(' ','#ffe066');label.position.y=3.3;label.visible=false;g.add(label);return{g,wheels,label,lastWord:null,body:g.children.slice(0,-2)}}
function init(){try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,Math.max(1,dpr)));renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.SRGBColorSpace;ANISO=Math.max(1,Math.min(8,renderer.capabilities.getMaxAnisotropy()));
 scene=new THREE.Scene();scene.fog=new THREE.Fog(0xb8dcff,140,560);camera=new THREE.PerspectiveCamera(60,W/H,0.3,900);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(700,24,12),new THREE.MeshBasicMaterial({map:canvasTex(32,256,x=>{const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#1a5ad8');g.addColorStop(0.44,'#5fb0ff');g.addColorStop(0.5,'#d8f0ff');g.addColorStop(0.55,'#b8dcff');g.addColorStop(1,'#88c0e8');x.fillStyle=g;x.fillRect(0,0,32,256)}),side:THREE.BackSide,fog:false,depthWrite:false}));scene.add(sky);
 const cloudTex=canvasTex(128,64,x=>{x.fillStyle='#fff';for(const[cx,cy,r]of[[40,40,20],[64,30,26],[90,40,20],[60,46,22]])x.beginPath(),x.arc(cx,cy,r,0,7),x.fill();x.fillStyle='#dceeff';x.fillRect(20,52,88,8)}),cloudMat=new THREE.SpriteMaterial({map:cloudTex,transparent:true,fog:false});
 for(let i=0;i<22;i++){const cl=new THREE.Sprite(cloudMat);cl.position.set((hash(i)-0.5)*1000+110,60+hash(i*3)*70,(hash(i*7)-0.5)*1000-125);cl.scale.set(80+hash(i*2)*70,40+hash(i*5)*35,1);scene.add(cl)}
 scene.add(new THREE.HemisphereLight(0xcfe8ff,0x4a8a3a,1.0));const sun=new THREE.DirectionalLight(0xfff4d8,1.3);sun.position.set(200,300,100);scene.add(sun);
 // the Poly Haven grass is a dry meadow; tint it toward Daytona's bright infield green
 const grassFb=canvasTex(64,64,x=>{x.fillStyle='#4aa040';x.fillRect(0,0,64,64);for(let i=0;i<300;i++){x.fillStyle=hash(i)>0.5?'#56b048':'#3f9238';x.fillRect(Math.floor(hash(i*3)*64),Math.floor(hash(i*7)*64),2,2)}});const grassTex=fileTex('textures/grass.jpg',grassFb,320,320);const grassMat=new THREE.MeshLambertMaterial({map:grassTex});grassMat.color.setRGB(0.95,1.3,0.7);
 const grass=new THREE.Mesh(new THREE.PlaneGeometry(2600,2600),grassMat);grass.rotation.x=-Math.PI/2;grass.position.set(110,-0.05,-125);scene.add(grass);
 // road, curbs, and an embankment under each edge (the banked road pivots on its inner edge, so the outside edge stands
 // up to ~7 units off the ground in the turns). Embankment uvs are world-planar so the grass continues without a seam.
 const N=640,pos:number[]=[],uv:number[]=[],idx:number[]=[],cpos:number[]=[],cuv:number[]=[],cidx:number[]=[],epos:number[]=[],euv:number[]=[];const asphalt=canvasTex(128,256,x=>{x.fillStyle='#55555c';x.fillRect(0,0,128,256);for(let i=0;i<900;i++){x.fillStyle=hash(i)>0.5?'#5c5c63':'#4b4b52';x.fillRect(Math.floor(hash(i*3)*128),Math.floor(hash(i*7)*256),3,2)}});asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;
 const curb=canvasTex(32,64,x=>{x.fillStyle='#e8d020';x.fillRect(0,0,32,64);x.fillStyle='#f4f4f4';x.fillRect(0,0,32,32)});curb.wrapS=curb.wrapT=THREE.RepeatWrapping;
 const fr=E3.newFrame(),v=new THREE.Vector3(),guv=(p:THREE.Vector3)=>euv.push((p.x+1190)/2600,(1175-p.z)/2600);
 for(let i=0;i<=N;i++){const s=i/N*L,f=E3.frame(s,fr);for(const k of[-1,1]){v.copy(f.p).addScaledVector(f.right,k*ROADW);pos.push(v.x,v.y+0.02,v.z);uv.push(k<0?0:1,s/12)}
  for(const k of[-1.14,-1,1,1.14]){v.copy(f.p).addScaledVector(f.right,k*ROADW);cpos.push(v.x,v.y+0.03,v.z);cuv.push(Math.abs(k)>1?0:1,s/4)}
  for(const k of[-1,1]){v.copy(f.p).addScaledVector(f.right,k*1.14*ROADW);v.y+=0.02;epos.push(v.x,v.y,v.z);guv(v);v.addScaledVector(f.right0,k*(Math.max(0,v.y)*1.6+1.2));v.y=-0.04;epos.push(v.x,v.y,v.z);guv(v)}
  if(i<N){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);const b=i*4;cidx.push(b,b+1,b+4,b+1,b+5,b+4,b+2,b+3,b+6,b+3,b+7,b+6)}}
 const mk=(p:number[],u:number[],ix:number[])=>{const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(p,3)).setAttribute('uv',new THREE.Float32BufferAttribute(u,2)).setIndex(ix);g.computeVertexNormals();return g};
 const roadGeo=mk(pos,uv,idx);
 const asphaltTex=fileTex('textures/asphalt.jpg',asphalt,3,2),asphaltN=fileTex('textures/asphalt_n.jpg',asphalt,3,2,false);
 const road=new THREE.Mesh(roadGeo,new THREE.MeshStandardMaterial({map:asphaltTex,normalMap:asphaltN,normalScale:new THREE.Vector2(0.5,0.5),roughness:0.92,metalness:0,side:THREE.DoubleSide}));scene.add(road);
 // lane lines sit between the four sim lanes (E3.K.LANES = +-0.21, +-0.62 -> dividers at 0 and +-0.415)
 const marks=canvasTex(256,512,x=>{x.clearRect(0,0,256,512);x.fillStyle='rgba(245,245,245,.92)';x.fillRect(4,0,6,512);x.fillRect(246,0,6,512);for(const lx of[75,128,181]){for(let y=0;y<512;y+=256)x.fillRect(lx-2,y,4,96)}x.fillStyle='rgba(255,255,255,.08)';x.fillRect(0,0,256,512)});marks.wrapS=marks.wrapT=THREE.RepeatWrapping;marks.magFilter=THREE.LinearFilter;marks.anisotropy=ANISO;
 const markings=new THREE.Mesh(roadGeo,new THREE.MeshBasicMaterial({map:marks,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide}));markings.position.y=0.015;scene.add(markings);
 const curbs=new THREE.Mesh(mk(cpos,cuv,cidx),new THREE.MeshLambertMaterial({map:curb,side:THREE.DoubleSide}));scene.add(curbs);
 const eidx:number[]=[];for(let i=0;i<N;i++){const e=i*4;eidx.push(e,e+1,e+5,e,e+5,e+4,e+2,e+3,e+7,e+2,e+7,e+6)}
 const emb=new THREE.Mesh(mk(epos,euv,eidx),grassMat.clone());(emb.material as THREE.MeshLambertMaterial).side=THREE.DoubleSide;scene.add(emb);
 // static dressing is batched: one merged mesh per material instead of ~2 500 draw calls
 const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
 const st=(m:THREE.Mesh)=>{m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix);m.geometry.dispose();const mat=m.material as THREE.Material;let b=buckets.get(mat);if(!b)buckets.set(mat,b=[]);b.push(g)};
 // ground height at signed horizontal offset k from the centre line: outside a banked turn the embankment rises to the road edge
 const gy=(f:any,k:number)=>{if(!f.bank||Math.sign(k)!==Math.sign(f.bank))return 0;const de=1.14*ROADW*Math.cos(f.bank),eh=f.p.y+1.14*ROADW*Math.abs(Math.sin(f.bank));const a=Math.abs(k);return a<=de?eh:Math.max(0,eh-(a-de)/1.6)};
 const G=(f:any,k:number,y=0)=>new THREE.Vector3(f.p.x,gy(f,k)+y,f.p.z).addScaledVector(f.right0,k);
 const X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1);
 const concreteFb=canvasTex(64,64,x=>{x.fillStyle='#d8d8dc';x.fillRect(0,0,64,64)});const concreteTex=fileTex('textures/concrete.jpg',concreteFb,4,1);
 const wallMat=new THREE.MeshLambertMaterial({map:concreteTex}),wallBlue=flat(0x2a4ad8),poleMat=flat(0xc8ccd4),lampMat=flat(0xfff8d0),rock=flat(0x8a6a4a),rock2=flat(0x6a4e36),palmTrunk=flat(0x9a6a3a),palmLeaf=flat(0x2f9a3a,{side:THREE.DoubleSide}),
 // conifer cards drawn on a canvas (public/textures/pine.jpg is a twig/bark atlas, not a tree card)
 pineCard=canvasTex(128,256,x=>{x.clearRect(0,0,128,256);for(let i=0;i<7;i++){const y0=6+i*27,y1=y0+64,hw=12+i*8.2;const g=x.createLinearGradient(64-hw,0,64+hw,0);g.addColorStop(0,'#143a1f');g.addColorStop(0.55,'#225a30');g.addColorStop(1,'#3a7c44');x.fillStyle=g;x.beginPath();x.moveTo(64,y0);x.lineTo(64+hw,y1);const n=6;for(let k=1;k<=n;k++){const xx=64+hw-2*hw*k/n;x.lineTo(xx+hw/n,y1-7);x.lineTo(xx,y1)}x.closePath();x.fill()}
  x.globalCompositeOperation='source-atop';for(let i=0;i<900;i++){x.fillStyle=hash(i*1.7)>0.5?'rgba(8,26,12,.55)':'rgba(130,180,110,.35)';x.fillRect(Math.floor(hash(i*3.1)*128),Math.floor(hash(i*5.3)*236),2,3)}}),
 pine=new THREE.MeshLambertMaterial({map:pineCard,alphaTest:0.5,side:THREE.DoubleSide}),
 trunk=new THREE.MeshLambertMaterial({map:fileTex('textures/bark.jpg',canvasTex(16,16,x=>{x.fillStyle='#6a4a2a';x.fillRect(0,0,16,16)}),1,3)}),
 crowd=new THREE.MeshLambertMaterial({map:canvasTex(512,128,x=>{x.fillStyle='#3a4258';x.fillRect(0,0,512,128);for(let r=0;r<6;r++){x.fillStyle='#2c3248';x.fillRect(0,8+r*20,512,3)}for(let i=0;i<9000;i++){x.fillStyle=['#f04040','#f0d040','#40a0f0','#f0f0f0','#40d060','#f080c0','#202030','#ffb080'][i%8];x.fillRect(Math.floor(hash(i*1.3)*512),4+Math.floor(hash(i*2.9)*120),2,3)}})}),
 garage=new THREE.MeshLambertMaterial({map:canvasTex(256,64,x=>{x.fillStyle='#e8e8ec';x.fillRect(0,0,256,64);for(let i=0;i<6;i++){x.fillStyle='#8a92a0';x.fillRect(8+i*42,22,30,42);x.fillStyle='#b8c0cc';for(let j=0;j<4;j++)x.fillRect(8+i*42,26+j*9,30,2)}x.fillStyle='#d82a3a';x.fillRect(0,0,256,10)})});
 pineCard.magFilter=THREE.LinearFilter;
 const box=(w:number,h:number,d:number,mat:THREE.Material,p:THREE.Vector3,dir?:THREE.Vector3)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.copy(p);if(dir)m.quaternion.setFromUnitVectors(X,dir);st(m);return m};
 for(let s=0;s<L;s+=9){const f=E3.frame(s);const u=s/L,T=f.T,n9=Math.floor(s/9);
  // walls follow the banked road edge
  for(const side of[-1,1]){const p=f.p.clone().addScaledVector(f.right,side*(ROADW+1.5));p.y+=0.5;box(9,1.0,0.4,n9%2?wallMat:wallBlue,p,T)}
  // stadium on the start straight and first banking: tiered stands outside, pits inside
  if(u<0.26||u>0.93){const by=gy(f,ROADW+6);for(let tier=0;tier<3;tier++){const p=G(f,ROADW+6+tier*9);p.y=by+2+tier*3.4;box(9.2,4,10,crowd,p,T)}
   const rp=G(f,ROADW+16);rp.y=by+14;box(9.2,0.5,30,wallMat,rp,T);
   if(n9%4===0){const p=G(f,ROADW+32);p.y=by+7;box(0.6,14,0.6,poleMat,p)}
   if(u<0.2&&n9%3===0)box(27,5,8,garage,G(f,-(ROADW+10),2.5),T)}
  // forest on the back section
  if(u>0.3&&u<0.6){for(const side of[-1,1]){for(let j=0;j<5;j++){const k=side*(ROADW+7+j*7+hash(s+j)*6);const p=G(f,k).addScaledVector(T,(hash(s*5+j)-0.5)*8);const h=9+hash(s*3+j)*7,w=h*0.55;const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.42,h*0.45,6),trunk);tr.position.copy(p).add(new THREE.Vector3(0,h*0.22,0));st(tr);
   for(let a=0;a<2;a++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(w,h),pine);leaf.position.copy(p).add(new THREE.Vector3(0,h/2+0.3,0));leaf.rotation.y=a*Math.PI/2+hash(s+j+a);st(leaf)}}}}
  // light towers everywhere else
  if(n9%6===0&&u>0.26&&u<0.93){box(0.35,14,0.35,poleMat,G(f,ROADW+4,7));box(3,0.5,1,lampMat,G(f,ROADW+4,14))}
  // lyric billboards on the final banking, facing the track
  if(u>0.72&&u<0.92&&n9%5===0){const p=G(f,-(ROADW+9));const txt=['MAXIMALIST','SPEED OF LIGHT','TURN IT UP','ONE DESK','ROLLING START'][Math.floor(s/45)%5];const b=new THREE.Mesh(new THREE.PlaneGeometry(14,5),new THREE.MeshLambertMaterial({map:canvasTex(512,180,x=>{x.fillStyle=['#1a2a7a','#d82a3a','#f2c230','#ffffff'][Math.floor(s/45)%4];x.fillRect(0,0,512,180);x.fillStyle=Math.floor(s/45)%4===3?'#1a2a7a':'#fff';x.font="52px 'Press Start 2P',monospace";x.textAlign='center';x.textBaseline='middle';x.fillText(txt,256,90)}),side:THREE.DoubleSide}));b.position.copy(p).add(new THREE.Vector3(0,5,0));b.quaternion.setFromUnitVectors(Z,f.right0);scene.add(b);box(0.4,5,0.4,poleMat,p.clone().add(new THREE.Vector3(0,1.5,0)))}}
 // start gantry with big screen
 {const f=E3.frame(4);const g=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.8,ROADW*2+8),flat(0xd82a3a));g.position.copy(f.p).add(new THREE.Vector3(0,7.5,0));g.quaternion.setFromUnitVectors(X,f.T);scene.add(g);for(const k of[-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(1,7.5,1),wallMat);leg.position.copy(f.p).add(f.right.clone().multiplyScalar(k*(ROADW+3.5))).add(new THREE.Vector3(0,3.75,0));scene.add(leg)}
  const chk=new THREE.Mesh(new THREE.PlaneGeometry(ROADW*2,2.4),new THREE.MeshBasicMaterial({map:canvasTex(128,32,x=>{for(let i=0;i<16;i++)for(let j=0;j<4;j++){x.fillStyle=(i+j)%2?'#111':'#eee';x.fillRect(i*8,j*8,8,8)}})}));chk.rotation.x=-Math.PI/2;chk.position.copy(f.p).add(new THREE.Vector3(0,0.06,0));chk.quaternion.multiply(new THREE.Quaternion().setFromUnitVectors(X,f.T));scene.add(chk);
  const f2=E3.frame(30);const scr=new THREE.Mesh(new THREE.PlaneGeometry(22,10),new THREE.MeshBasicMaterial({map:canvasTex(512,232,x=>{x.fillStyle='#101828';x.fillRect(0,0,512,232);x.fillStyle='#ffe066';x.font="60px 'Press Start 2P',monospace";x.textAlign='center';x.fillText('ROLLING',256,100);x.fillText('START!',256,180)}),side:THREE.DoubleSide}));scr.position.copy(G(f2,-(ROADW+22),12));scr.quaternion.setFromUnitVectors(Z,f2.right0);scene.add(scr);box(1,8,1,poleMat,scr.position.clone().add(new THREE.Vector3(0,-9,0)))}
 // rock overhang with slot reels over the back straight
 {const f=E3.frame(L*0.62);for(const k of[-1,1]){const r=new THREE.Mesh(new THREE.BoxGeometry(16,22,18),rock);r.position.copy(f.p).add(f.right.clone().multiplyScalar(k*(ROADW+9))).add(new THREE.Vector3(0,9,0));r.rotation.y=k*0.2;scene.add(r);const r2=new THREE.Mesh(new THREE.BoxGeometry(10,12,12),rock2);r2.position.copy(r.position).add(new THREE.Vector3(0,12,0));scene.add(r2)}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(14,7,ROADW*2+20),rock);beam.position.copy(f.p).add(new THREE.Vector3(0,17,0));beam.quaternion.setFromUnitVectors(X,f.T);scene.add(beam);
  const reelTex=canvasTex(128,256,x=>{x.fillStyle='#f4f4f4';x.fillRect(0,0,128,256);for(let i=0;i<4;i++){x.fillStyle=['#d82a3a','#2a4ad8','#f2c230','#2fb85a'][i];x.font="bold 56px Arial Black, Arial, sans-serif";x.textAlign='center';x.textBaseline='middle';x.fillText(['7','BAR','7','$'][i],64,32+i*64)}});reelTex.wrapS=reelTex.wrapT=THREE.RepeatWrapping;const reelMat=new THREE.MeshLambertMaterial({map:reelTex}),frameMat=flat(0xffe066);
  for(let i=-1;i<=1;i++){const reel=new THREE.Mesh(new THREE.CylinderGeometry(3,3,4.5,16),reelMat);reel.position.copy(f.p).add(f.right.clone().multiplyScalar(i*5.5)).add(new THREE.Vector3(0,10.5,0));reel.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),f.right);reel.userData.q0=reel.quaternion.clone();reel.userData.ph=i*1.3;scene.add(reel);reels.push(reel);const frame=new THREE.Mesh(new THREE.BoxGeometry(0.6,7.5,5),frameMat);frame.position.copy(reel.position).add(f.right.clone().multiplyScalar(2.9));frame.quaternion.setFromUnitVectors(X,f.right);scene.add(frame)}}
 // palms in the infield
 for(let i=0;i<30;i++){const u=hash(i*1.7);const f=E3.frame(u*L);const p=G(f,-(ROADW+16+hash(i*3)*40));const th=7+hash(i)*3;const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,th,5),palmTrunk);tr.position.copy(p).add(new THREE.Vector3(0,th/2,0));st(tr);for(let l=0;l<6;l++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(4.5,1.3),palmLeaf);leaf.position.copy(p).add(new THREE.Vector3(0,th-0.4,0));leaf.rotation.y=l*Math.PI/3;leaf.rotation.z=-0.5;leaf.translateX(2);st(leaf)}}
 for(const[mat,geos]of buckets){const g=mergeGeometries(geos,false);for(const q of geos)q.dispose();if(g)scene.add(new THREE.Mesh(g,mat))}
 // cars
 playerCar=makeCar(LIVERY[0],0);scene.add(playerCar.g);for(let i=0;i<12;i++){const c=makeCar(LIVERY[1+i%12],1+i);scene.add(c.g);cars.push(c)}
 // optional real models: public/models/car_<i>.glb (or car.glb for all) replace the procedural bodies
 const loader=new GLTFLoader();const allCars=[playerCar,...cars];const fit=(c,gl)=>{const box=new THREE.Box3().setFromObject(gl.scene);const size=box.getSize(new THREE.Vector3());const sc=4.7/Math.max(size.x,size.z);for(const m of c.body)m.visible=false;const inst=gl.scene.clone(true);inst.scale.setScalar(sc);inst.position.y=-box.min.y*sc;if(size.x>size.z)inst.rotation.y=Math.PI/2;inst.traverse(o=>{if((o as any).isMesh){(o as any).castShadow=false;const mm=(o as any).material;if(mm&&mm.map)mm.map.anisotropy=4}});c.g.add(inst)};
 const probe=(url)=>fetch(url,{method:'HEAD'}).then(r=>r.ok&&!/text\/html/.test(r.headers.get('content-type')||'')).catch(()=>false);
 // hosts that cannot serve .glb get the same model as base64 text in <name>.glb.txt
 const loadAny=(base,cb)=>probe(base+'.glb').then(okk=>{if(okk){loader.load(base+'.glb',cb);return}fetch(base+'.glb.txt').then(r=>r.ok&&!/text\/html/.test(r.headers.get('content-type')||'')?r.text():null).then(b64=>{if(!b64)return;const bin=Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0));loader.parse(bin.buffer,'',cb,()=>{})}).catch(()=>{})});
 const exists=(base)=>probe(base+'.glb').then(okk=>okk||probe(base+'.glb.txt'));
 exists(import.meta.env.BASE_URL+'models/car_0').then(per=>{if(per){allCars.forEach((c,i)=>loadAny(import.meta.env.BASE_URL+'models/car_'+i,gl=>fit(c,gl)))}else exists(import.meta.env.BASE_URL+'models/car').then(okk=>{if(okk)loadAny(import.meta.env.BASE_URL+'models/car',gl=>{for(const c of allCars)fit(c,gl)})})});
 ok=true}catch(e){console.warn('WebGL era 3 unavailable',e);ok=false}}
// per-frame scratch (no allocations in render)
const _fa=E3.newFrame(),_fb=E3.newFrame(),_fc=E3.newFrame(),_m4=new THREE.Matrix4(),_v=new THREE.Vector3(),_q=new THREE.Quaternion(),_Y=new THREE.Vector3(0,1,0);let _tick=0;
// orient g on the banked track frame: local x = right, y = up, z = backwards (toward the chasing camera)
function orient(g:THREE.Object3D,f:any){_m4.makeBasis(f.right,f.up,_v.copy(f.T).negate());g.quaternion.setFromRotationMatrix(_m4)}
function place(car,s,x,t){const f=E3.frame(s,_fa);car.g.position.copy(f.p).addScaledVector(f.right,x*ROADW).addScaledVector(f.up,0.02);orient(car.g,f);car.g.rotateY(Math.PI);for(const w of car.wheels)w.rotation.x=t*18}
function disposeGantry(gt){scene.remove(gt.g);gt.g.traverse((o:any)=>{if(o.isMesh){o.geometry.dispose();if(o.material.map)o.material.map.dispose();o.material.dispose()}})}
export const E3GL={init,get ok(){return ok},canvas:()=>renderer.domElement,
 render(t:number){if(!ok)return;const S=E3.S;if(!S)return;_tick++;
  place(playerCar,S.s,S.x,t);playerCar.g.rotateZ(-S.vx*0.08);playerCar.g.position.y+=Math.abs(Math.sin(t*22))*0.012;
  S.cars.forEach((c,i)=>{const o=cars[i];if(!o)return;place(o,c.s,c.x,t+c.ph)});
  // lyric gantries: one per line, spanning the track, racing line lit on one lane. Keyed by the sim entry itself so a
  // seek (which rebuilds S.lyr) drops the old ones; pruned gantries free their geometry, materials and line texture.
  for(const w of S.lyr){let gt=gantries.get(w);if(!gt){gt=makeGantry(w);scene.add(gt.g);gantries.set(w,gt)}gt.tick=_tick;
   const f=E3.frame(w.s,_fb);gt.g.position.copy(f.p);orient(gt.g,f);
   const d=w.s-S.s,gotA=w.got?clamp((t-w.got)/0.8,0,1):0;const st=w.got?'got':w.missed?'missed':'live';if(st!==gt.state){gt.state=st;(gt.text.material as any).color.setHex(st==='got'?0xb8ffc4:st==='missed'?0x5a5a66:0xffffff);(gt.marker.material as any).color.setHex(st==='got'?0xffffff:st==='missed'?0x553333:0x3cff6a);(gt.chev.material as any).color.copy((gt.marker.material as any).color);(gt.lane.material as any).opacity=st==='live'?0.22:0.06}
   const rise=clamp((t-w.t0)/0.35,0,1);gt.g.scale.y=Math.max(0.01,1-(1-rise)*(1-rise)); // gantry drops in instead of popping
   gt.marker.scale.y=1+(st==='live'?Math.sin(t*10)*0.3+0.3:0);gt.chev.position.y=4.6+(st==='live'?Math.sin(t*6)*0.25:0);gt.text.position.y=7.0+gotA*4;(gt.text.material as any).opacity=w.got?1-gotA:1;gt.g.visible=d>-60&&d<240}
  for(const [w,gt] of gantries){if(gt.tick!==_tick){disposeGantry(gt);gantries.delete(w)}}
  for(const r of reels){_q.setFromAxisAngle(_Y,t*2.4+r.userData.ph);r.quaternion.copy(r.userData.q0).multiply(_q)}
  // chase camera: 10.5 behind, rolls with 60% of the banking so the horizon tilts without swinging
  const f=E3.frame(S.s-10.5,_fb),fp=E3.frame(S.s,_fc);camera.position.copy(f.p).addScaledVector(f.right,S.x*ROADW*0.5).addScaledVector(f.up,3.8);
  if(S.shake>0){const a=0.3*S.shake;camera.position.addScaledVector(f.right,(hash(t*61)-0.5)*a);camera.position.y+=(hash(t*67+3)-0.5)*a}
  _v.copy(fp.p).addScaledVector(fp.T,16).addScaledVector(fp.up,1.0);camera.up.set(0,1,0).lerp(f.up,0.6).normalize();camera.lookAt(_v);
  renderer.render(scene,camera)}};
