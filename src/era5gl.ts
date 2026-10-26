import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {SMAAPass} from 'three/examples/jsm/postprocessing/SMAAPass.js';
import {FilmPass} from 'three/examples/jsm/postprocessing/FilmPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {W,H,dpr,BEAT,BAR,bar,hash,clamp,lerp,smooth,QUALITY,cb,cbInv} from './core';
import {E5} from './era5';
import {towers,palms,car} from './synthkit';
const LOW=QUALITY==='low';

// ---------- ERA 5 in WebGL: a VR saber lane. Word blocks fly at you on the beat, you cut them, and an AI co-pilot builds the arena out of them ----------
const {SPD,LEAD,COLS,ROWS,TUNNEL,OUT,s5,HIT,BACK,EYE,COLW,ROW0,ROWH,fovAt}=E5.K;
const CYAN=0x4df0ff,MAG=0xff5be0,YEL=0xffe14d,ORG=0xff9a3c,GRN=0x5bff5b,VIO=0xb07cff;
const HUEX=[MAG,CYAN,VIO,0xffc21a]; // [3] = the golden secret block // matches E5.K.HUES: block / piece colour per lyric line
const COLZ=(c:number)=>(c-1.5)*COLW,ROWY=(r:number)=>ROW0+r*ROWH; // hit plane is HIT units ahead of the player (HIT+BACK from the camera)
const LANEZ=COLS/2*COLW+0.15,PIECEZ=3.6; // rails, and where side pieces stand
let ok=false,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,composer:EffectComposer,bloom:UnrealBloomPass;
let palmK:any=null,carK:any=null,skyM:THREE.Mesh,starsM:THREE.Points,sunL:THREE.DirectionalLight,hemiL:THREE.HemisphereLight,skyA:THREE.Group,skyB:THREE.Group,floorG:THREE.Group,cutLine:THREE.Mesh;
let blocks:any[]=[],halves:any[]=[],pieces:any[]=[],rings:THREE.Mesh[]=[],saber:any,copilot:any,sparks:any,texCache=new Map<string,THREE.Texture>(),arrivals:THREE.Mesh[]=[],flights:any[]=[],flightN=0,pillars:THREE.Mesh[]=[],halfMat:any;
// renderer-side flags, kept out of the simulation's objects (a fresh plan() on seek drops them with the blocks)
let split=new WeakSet<object>(),flashAt=new WeakMap<object,number>();
const rnd=(k:number)=>hash(k*12.9898+lastT*78.233); // deterministic per-frame jitter (camera shake, beam flicker, cut halves)
const geo={box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,16,12),cyl:new THREE.CylinderGeometry(1,1,1,16),plane:new THREE.PlaneGeometry(1,1),cube:new RoundedBoxGeometry(0.62,0.62,0.9,2,0.07),half:new RoundedBoxGeometry(0.62,0.62,0.44,2,0.06),
 disc:new THREE.CircleGeometry(0.5,20),arch:new THREE.TorusGeometry(2.4,0.09,8,28,Math.PI),ring:new THREE.TorusGeometry(2.9,0.1,8,36),tunnel:new THREE.TorusGeometry(3.3,0.1,8,40)};
const planeEdges=new THREE.EdgesGeometry(geo.plane);
const edgesCube=new THREE.EdgesGeometry(geo.cube);
const mat={body:new THREE.MeshStandardMaterial({color:0x0e1330,metalness:0.75,roughness:0.35}),dark:new THREE.MeshStandardMaterial({color:0x1a2040,metalness:0.6,roughness:0.5}),shell:new THREE.MeshStandardMaterial({color:0x4a5696,metalness:0.8,roughness:0.3}),
 white:new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),lineW:new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.7,toneMapped:false})};
function emissive(hex:number,i=1){return new THREE.MeshStandardMaterial({color:0x101428,emissive:hex,emissiveIntensity:i,metalness:0.4,roughness:0.5})}
function canvasTex(w:number,h:number,fn:(x:CanvasRenderingContext2D)=>void){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d')!);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function wordTex(word:string){word=word.toUpperCase();const key='w|'+word;let tex=texCache.get(key);if(!tex){tex=canvasTex(256,128,x=>{x.fillStyle='rgba(4,4,14,.9)';x.fillRect(0,0,256,128);const fs=Math.max(14,Math.min(64,Math.floor(232/Math.max(1,word.length))));x.font=`${fs}px 'Press Start 2P',monospace`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,fs*0.2);x.strokeStyle='#000';x.strokeText(word,128,68);x.fillStyle='#ffffff';x.fillText(word,128,68)});tex.anisotropy=4;texCache.set(key,tex)}return tex}
const windowTex=[0,1,2].map(v=>canvasTex(64,128,x=>{x.fillStyle='#000';x.fillRect(0,0,64,128);for(let j=0;j<14;j++)for(let m=0;m<5;m++){const h=hash(v*131+j*31+m*7);if(h<0.45)continue;x.fillStyle=h>0.72?'rgba(77,240,255,.95)':'rgba(255,200,120,.9)';x.fillRect(6+m*12,6+j*9,5,4)}}));
windowTex.forEach(t=>{t.magFilter=THREE.NearestFilter});
const SKYW=420;
function skyline(g:THREE.Group,n:number,zmin:number,zmax:number,hmin:number,hmax:number,tex:THREE.Texture,tint:number,seed:number){if(n<=0)return;const im=new THREE.InstancedMesh(geo.box,new THREE.MeshStandardMaterial({color:0x0d0a26,metalness:0.4,roughness:0.7,emissive:tint,emissiveMap:tex,emissiveIntensity:0.55}),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pz=new THREE.Vector3();for(let i=0;i<n;i++){const w=1.6+hash(i*1.3+seed)*3,h=hmin+hash(i*2.7+seed)*(hmax-hmin),z=(i%2?1:-1)*(zmin+hash(i*5.1+seed)*(zmax-zmin));pz.set(hash(i*7.9+seed)*SKYW,h/2,z);s.set(w,h,w);m.compose(pz,q,s);im.setMatrixAt(i,m)}im.instanceMatrix.needsUpdate=true;g.add(im)}
// three bands of neon towers (synthkit.ts): low near blocks, a mid band, tall far spires
function makeSky(){const g=new THREE.Group();towers(g,LOW?90:150,SKYW,18,120,2,11,windowTex[1],0xffffff,0,1.1);towers(g,LOW?60:120,SKYW,60,190,7,26,windowTex[2],0xcfe8ff,97,0.9);if(!LOW)towers(g,90,SKYW,120,260,16,46,windowTex[0],0xffd0e8,331,0.7);return g}
// ---- ribbon trails ----
function makeTrail(col:number,width:number,n=22){const pos=new Float32Array(n*6),colA=new Float32Array(n*6),idx:number[]=[];const c=new THREE.Color(col);for(let i=0;i<n;i++){const f=Math.pow(1-i/n,1.5);for(const k of[0,1]){colA[(i*2+k)*3]=c.r*f;colA[(i*2+k)*3+1]=c.g*f;colA[(i*2+k)*3+2]=c.b*f}if(i<n-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.BufferAttribute(pos,3));gm.setAttribute('color',new THREE.BufferAttribute(colA,3));gm.setIndex(idx);const mesh=new THREE.Mesh(gm,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));mesh.frustumCulled=false;scene.add(mesh);return{mesh,pos,n,width,init:false,hx:new Float32Array(n),hy:new Float32Array(n),hz:new Float32Array(n)}}
function trailPush(tr:any,x:number,y:number,z:number,vis:boolean,vertical=false,ox=0){tr.mesh.visible=vis;tr.mesh.position.x=ox;x-=ox;if(!vis){tr.init=false;return}const {hx,hy,hz,n,pos}=tr;if(!tr.init||Math.hypot(hx[0]-x,hy[0]-y,hz[0]-z)>6){hx.fill(x);hy.fill(y);hz.fill(z);tr.init=true}else{for(let i=n-1;i>0;i--){hx[i]=hx[i-1];hy[i]=hy[i-1];hz[i]=hz[i-1]}hx[0]=x;hy[0]=y;hz[0]=z}
 for(let i=0;i<n;i++){const w=tr.width*(1-i/n);if(vertical){pos[i*6]=hx[i];pos[i*6+1]=hy[i]+w;pos[i*6+2]=hz[i];pos[i*6+3]=hx[i];pos[i*6+4]=hy[i]-w;pos[i*6+5]=hz[i]}else{pos[i*6]=hx[i];pos[i*6+1]=hy[i];pos[i*6+2]=hz[i]+w;pos[i*6+3]=hx[i];pos[i*6+4]=hy[i];pos[i*6+5]=hz[i]-w}}(tr.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate=true}
// ---- pools ----
function makeBlock(){const g=new THREE.Group();const cube=new THREE.Mesh(geo.cube,emissive(MAG,0.6));const ed=new THREE.LineSegments(edgesCube,mat.lineW);const face=new THREE.Mesh(geo.plane,new THREE.MeshBasicMaterial({map:wordTex('·'),transparent:true,toneMapped:false,depthWrite:false}));face.scale.set(0.84,0.54,1);face.rotation.y=-Math.PI/2;face.position.x=-0.316;g.add(cube,ed,face);g.visible=false;scene.add(g);const shadow=new THREE.Mesh(geo.disc,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.45,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.visible=false;scene.add(shadow);return{g,cube,ed,face,shadow,word:'',hue:-1,edgeMat:null as any}}
function makeHalf(){const m=new THREE.Mesh(geo.half,halfMat[0]);m.visible=false;scene.add(m);return{m,vx:0,vy:0,vz:0,rx:0,rz:0,life:0}}
function makePiece(){const g=new THREE.Group();const em=emissive(CYAN,1.4);
 const arch=new THREE.Mesh(geo.arch,em);arch.rotation.y=Math.PI/2;arch.position.y=0.35;
 const pillar=new THREE.Group();const pb=new THREE.Mesh(geo.box,mat.shell);pb.scale.set(0.5,4,0.5);pb.position.y=2;const pc=new THREE.Mesh(geo.box,em);pc.scale.set(0.56,0.12,0.56);pc.position.y=4.05;pillar.add(pb,pc);pillar.position.z=PIECEZ;
 const panel=new THREE.Group();const pp=new THREE.Mesh(geo.plane,new THREE.MeshBasicMaterial({map:wordTex('·'),transparent:true,toneMapped:false}));pp.scale.set(2.7,1.35,1);pp.position.z=0.02;const pf=new THREE.Mesh(geo.plane,new THREE.MeshStandardMaterial({color:0x0a0c20,metalness:0.6,roughness:0.4,side:THREE.DoubleSide}));pf.scale.set(2.8,1.5,1);pf.position.z=-0.01;const pe=new THREE.LineSegments(planeEdges,mat.lineW);pe.scale.set(2.8,1.5,1);pe.position.z=0.03;panel.add(pf,pp,pe);panel.position.set(0,2.4,PIECEZ+0.3);panel.rotation.y=-Math.PI/2;
 const beam=new THREE.Mesh(geo.box,em);beam.scale.set(0.14,0.14,7.2);beam.position.y=4.3;
 const ring=new THREE.Mesh(geo.ring,em);ring.rotation.y=Math.PI/2;ring.position.y=1.9;
 g.add(arch,pillar,panel,beam,ring);g.visible=false;scene.add(g);return{g,em,arch,pillar,panel,pp,beam,ring,word:'',kind:'',i:-1,side:'',hue:-1,kitK:1}}
// the one saber: hilt + blade from the hilt to the tip at the hit plane; its colour follows the line being cut
function makeSaber(){const g=new THREE.Group();const handle=new THREE.Mesh(geo.cyl,mat.dark);handle.scale.set(0.03,0.22,0.03);handle.position.y=0.11;const guard=new THREE.Mesh(geo.cyl,mat.shell);guard.scale.set(0.05,0.02,0.05);guard.position.y=0.22;const blade=new THREE.Mesh(geo.cyl,emissive(MAG,3.2));blade.scale.set(0.022,1,0.022);const core=new THREE.Mesh(geo.cyl,mat.white);core.scale.set(0.008,1,0.008);const tipG=new THREE.Mesh(geo.sph,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));tipG.scale.setScalar(0.05);const light=new THREE.PointLight(MAG,1.4,4,2);g.add(handle,guard,blade,core,tipG,light);scene.add(g);const trail=makeTrail(0xffffff,0.07,16);(trail.mesh.material as any).color.setHex(MAG);return{g,handle,guard,blade,core,tipG,light,trail,col:new THREE.Color(MAG),emit:null as any}}
// ---- Blender finale kit (public/models/finale/<name>.glb, built by tools/blender/finale.py). Each GLB is flattened once
// into named parts (geometry baked to model space + its material); pool objects get meshes that share that geometry,
// with the trim / edge / core / face meshes on the pool's own recolourable materials. Until (or unless) a file loads,
// the primitives above stay as the fallback.
type KitPart={geo:THREE.BufferGeometry,mat:THREE.Material};
const KIT=['block','saber','copilot','arch','pillar','panel','ring'],kit:Record<string,Record<string,KitPart>>={};
function loadKit(){const loader=new GLTFLoader(),base=import.meta.env.BASE_URL+'models/finale/';const good=(r:Response)=>r.ok&&!/text\/html/.test(r.headers.get('content-type')||'');
 const take=(name:string,root:THREE.Object3D)=>{root.updateMatrixWorld(true);const parts:Record<string,KitPart>={};root.traverse((o:any)=>{if(!o.isMesh)return;const nm=String(o.userData.name||o.name).replace(/[._]\d+$/,'');const g=(o.geometry as THREE.BufferGeometry).clone();g.applyMatrix4(o.matrixWorld);
   // glTF stores v top-down; the word textures are canvas textures with flipY, so flip the face UVs once here
   if(nm==='face'&&g.attributes.uv){const uv=g.attributes.uv as THREE.BufferAttribute;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i))}
   parts[nm]={geo:g,mat:o.material}});kit[name]=parts;try{applyKit(name)}catch(e){console.warn('finale kit',name,e)}};
 // hosts that cannot serve .glb get the same model as base64 text in <name>.glb.txt
 for(const name of KIT)fetch(base+name+'.glb').then(r=>good(r)?r.arrayBuffer():fetch(base+name+'.glb.txt').then(r2=>good(r2)?r2.text().then(b64=>Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0)).buffer as ArrayBuffer):null)).then(buf=>{if(buf)loader.parse(buf,'',gl=>take(name,gl.scene),()=>{})}).catch(()=>{})}
function kitMesh(k:Record<string,KitPart>,part:string,m?:THREE.Material){const p=k[part];if(!p)return null;const o=new THREE.Mesh(p.geo,m||p.mat);return o}
function kitGroup(k:Record<string,KitPart>,mats:Record<string,THREE.Material>){const g=new THREE.Group();for(const nm in k){const o=kitMesh(k,nm,mats[nm]);if(o)g.add(o)}return g}
function swapPart(o:any,key:string,g:THREE.Object3D){const old=o[key] as THREE.Object3D;g.position.copy(old.position);g.rotation.copy(old.rotation);g.visible=old.visible;old.parent!.add(g);old.parent!.remove(old);o[key]=g}
function applyKit(name:string){const k=kit[name];
 if(name==='block'){for(const o of blocks){if(!o.edgeMat)o.edgeMat=emissive(HUEX[0],2);const kg=kitGroup(k,{edge:o.edgeMat,face:o.face.material});kg.rotation.y=-Math.PI/2;o.g.add(kg);o.cube.visible=false;o.ed.visible=false;o.face.visible=false;o.hue=-1}}
 else if(name==='saber'){const sb=saber;sb.emit=emissive(MAG,3);const h=kitGroup(k,{emitter:sb.emit});h.position.y=0.2;h.scale.setScalar(1.25);sb.g.add(h);sb.handle.visible=false;sb.guard.visible=false}
 else if(name==='copilot'){const c=copilot;const shell=new THREE.Group();const sm=kitMesh(k,'shell');if(sm){const m=(sm.material as THREE.Material).clone() as any;m.transparent=true;m.depthWrite=false;m.opacity=Math.min(m.opacity??1,0.45);sm.material=m;shell.add(sm)}const fins=kitMesh(k,'fins');if(fins)shell.add(fins);
  const core=kitMesh(k,'core',c.core.material),ra=kitMesh(k,'ring_a',c.ring.material),rb=kitMesh(k,'ring_b',c.ring.material);if(!core||!ra||!rb)return;c.g.add(core,shell,ra,rb);c.core.visible=c.shell.visible=c.ring.visible=c.ring2.visible=false;c.kit={core,shell,ra,rb}}
 else{const key=name as 'arch'|'pillar'|'panel'|'ring';for(const o of pieces){const g=kitGroup(k,{trim:o.em,face:o.pp.material});o.kitK=1.7; // thin strips need more glow than the solid primitives did
  if(key==='arch'){g.position.y=0;g.rotation.y=Math.PI/2;const v=o.arch.visible;o.g.add(g);o.g.remove(o.arch);g.visible=v;o.arch=g}
  else if(key==='ring'){g.position.y=1.9;g.rotation.y=Math.PI/2;const v=o.ring.visible;o.g.add(g);o.g.remove(o.ring);g.visible=v;o.ring=g}
  else swapPart(o,key,g)}}}
function makeCopilot(){const g=new THREE.Group();const core=new THREE.Mesh(geo.sph,emissive(GRN,2.6));core.scale.setScalar(0.22);const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(0.34,1),new THREE.MeshStandardMaterial({color:0x102018,metalness:0.9,roughness:0.2,transparent:true,opacity:0.5}));const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.015,8,40),new THREE.MeshBasicMaterial({color:GRN,toneMapped:false}));ring.rotation.x=Math.PI/2;const ring2=ring.clone();ring2.rotation.x=0;ring2.rotation.y=Math.PI/2;const light=new THREE.PointLight(GRN,1.6,6,1.8);
 const orbit:THREE.Mesh[]=[];for(let i=0;i<6;i++){const s=new THREE.Mesh(geo.sph,new THREE.MeshBasicMaterial({color:i%2?GRN:0xffffff,toneMapped:false}));s.scale.setScalar(0.035);g.add(s);orbit.push(s)}
 
 g.add(core,shell,ring,ring2,light);scene.add(g);const beam=new THREE.Mesh(geo.box,new THREE.MeshBasicMaterial({color:GRN,transparent:true,opacity:0.5,toneMapped:false,blending:THREE.AdditiveBlending,depthWrite:false}));beam.visible=false;scene.add(beam);
 return{g,core,shell,ring,ring2,orbit,trail:makeTrail(GRN,0.05,24),beam,x:0,y:2.6,z:0,kit:null as any}}
function makeSparks(n=400){const pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=new Float32Array(n*3),life=new Float32Array(n);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({size:0.07,vertexColors:true,transparent:true,opacity:0.95,toneMapped:false,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);return{pts,pos,col,vel,life,n,next:0}}
const sparkC=new THREE.Color();
function spark(x:number,y:number,z:number,hex:number,n:number,sp:number){const c=sparkC.setHex(hex);for(let k=0;k<n;k++){const i=sparks.next;sparks.next=(i+1)%sparks.n;sparks.pos[i*3]=x;sparks.pos[i*3+1]=y;sparks.pos[i*3+2]=z;sparks.vel[i*3]=(Math.random()-0.5)*sp;sparks.vel[i*3+1]=(Math.random()-0.2)*sp;sparks.vel[i*3+2]=(Math.random()-0.5)*sp;sparks.col[i*3]=c.r;sparks.col[i*3+1]=c.g;sparks.col[i*3+2]=c.b;sparks.life[i]=0.5+Math.random()*0.4}}
function init(){try{renderer=new THREE.WebGLRenderer({antialias:!LOW,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.84;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=false;
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x1a0b36,0.013);const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;(scene as any).environmentIntensity=0.14;camera=new THREE.PerspectiveCamera(72,W/H,0.05,600);
  composer=new EffectComposer(renderer);composer.setPixelRatio(dpr);composer.setSize(W,H);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(LOW?W/2:W,LOW?H/2:H),0.45,0.4,0.86);composer.addPass(bloom);if(!LOW){composer.addPass(new FilmPass(0.12,false));composer.addPass(new SMAAPass(W*dpr,H*dpr))}composer.addPass(new OutputPass());
  // sky, sun, stars
  const sky=new THREE.Mesh(new THREE.SphereGeometry(460,32,20),new THREE.MeshBasicMaterial({map:canvasTex(64,512,x=>{const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#04030d');g.addColorStop(0.42,'#180a36');g.addColorStop(0.5,'#4a175e');g.addColorStop(0.56,'#8a2a6a');g.addColorStop(0.62,'#180a36');g.addColorStop(1,'#04030d');x.fillStyle=g;x.fillRect(0,0,64,512)}),side:THREE.BackSide,fog:false,toneMapped:false,depthWrite:false}));scene.add(sky);skyM=sky;
  const sunSp=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(256,256,x=>{const sg=x.createLinearGradient(0,40,0,220);sg.addColorStop(0,'#fff0a0');sg.addColorStop(0.5,'#ff7ab6');sg.addColorStop(1,'#8a2cff');x.fillStyle=sg;x.beginPath();x.arc(128,128,100,0,7);x.fill();x.fillStyle='rgba(24,10,54,.95)';for(let i=0;i<8;i++)x.fillRect(20,128+i*11,216,2+i*0.9)}),transparent:true,fog:false,toneMapped:false,depthWrite:false}));sunSp.scale.set(90,90,1);scene.add(sunSp);(sky as any).userData.sun=sunSp;
  const sp=new Float32Array(1800);for(let i=0;i<600;i++){const a=hash(i)*Math.PI*2,e=hash(i*3)*1.2+0.05,r=400;sp[i*3]=Math.cos(a)*Math.cos(e)*r;sp[i*3+1]=Math.sin(e)*r;sp[i*3+2]=Math.sin(a)*Math.cos(e)*r}starsM=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(sp,3)),new THREE.PointsMaterial({color:0xffffff,size:1.4,sizeAttenuation:false,fog:false,toneMapped:false}));scene.add(starsM);
  // lights
  hemiL=new THREE.HemisphereLight(0x5a3aa0,0x120818,0.9);scene.add(hemiL);sunL=new THREE.DirectionalLight(0xffb090,1.4);sunL.position.set(40,50,30);scene.add(sunL);scene.add(sunL.target);const rim=new THREE.DirectionalLight(0x4df0ff,0.6);rim.position.set(-30,20,-20);scene.add(rim);
  // floor (mirror + grid + lane), follows the camera
  floorG=new THREE.Group();scene.add(floorG);
  const gridTex=canvasTex(128,128,x=>{x.clearRect(0,0,128,128);x.strokeStyle='rgba(255,91,224,.9)';x.lineWidth=3;x.strokeRect(0,0,128,128)});gridTex.wrapS=gridTex.wrapT=THREE.RepeatWrapping;gridTex.repeat.set(220,80);
  const ground:any=LOW?new THREE.Mesh(new THREE.PlaneGeometry(1400,420),new THREE.MeshStandardMaterial({color:0x0b0816,metalness:0.9,roughness:0.35})):new Reflector(new THREE.PlaneGeometry(1400,420),{clipBias:0.003,textureWidth:Math.floor(W*dpr*0.5),textureHeight:Math.floor(H*dpr*0.5),color:0x0b0816});ground.rotation.x=-Math.PI/2;ground.position.set(0,-0.01,-20);floorG.add(ground);
  if(!LOW){const ob=ground.onBeforeRender;ground.onBeforeRender=function(r:any,sc:any,c:any,g:any,m:any,gr:any){const sun=(skyM as any).userData.sun;const v=sun.visible;sun.visible=false;starsM.visible=false;
   // keep the saber and anything at arm's length out of the mirror: their reflections read as extra sabers and blobs
   hidden.length=0;const near=camera.position.x+6;const hide=(o:THREE.Object3D)=>{if(o.visible){o.visible=false;hidden.push(o)}};hide(saber.g);hide(saber.trail.mesh);for(const h of halves)hide(h.m);for(const b of blocks)if(b.g.position.x<near)hide(b.g);if(glowSp)hide(glowSp);if(shock)hide(shock);
   ob.call(this,r,sc,c,g,m,gr);sun.visible=v;starsM.visible=true;for(const o of hidden)o.visible=true}}
  const gridP=new THREE.Mesh(new THREE.PlaneGeometry(1400,420),new THREE.MeshBasicMaterial({map:gridTex,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gridP.rotation.x=-Math.PI/2;gridP.position.set(0,0.005,-20);floorG.add(gridP);
  for(const z of[-1.5,1.5]){const rail=new THREE.Mesh(geo.box,new THREE.MeshBasicMaterial({color:z<0?MAG:CYAN,toneMapped:false}));rail.scale.set(1400,0.04,0.06);rail.position.set(0,0.03,z*LANEZ/1.5);floorG.add(rail)}
  for(let c=1;c<COLS;c++){const ln=new THREE.Mesh(geo.box,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:c===COLS/2?0.22:0.1,toneMapped:false,depthWrite:false}));ln.scale.set(1400,0.01,0.02);ln.position.set(0,0.02,COLZ(c-0.5));floorG.add(ln)}
  cutLine=new THREE.Mesh(geo.box,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.55,toneMapped:false}));cutLine.scale.set(0.05,0.02,LANEZ*2);scene.add(cutLine);
  skyA=makeSky();skyB=makeSky();scene.add(skyA,skyB);palmK=palms(scene,LOW?16:26,9,LANEZ+8,LANEZ+18);carK=car(scene);
  halfMat=HUEX.map(h=>emissive(h,0.8));for(let i=0;i<56;i++)blocks.push(makeBlock());for(let i=0;i<24;i++)halves.push(makeHalf());for(let i=0;i<100;i++)pieces.push(makePiece());
  for(let i=0;i<26;i++){const r=new THREE.Mesh(geo.tunnel,emissive(ORG,1.6));r.rotation.y=Math.PI/2;r.visible=false;scene.add(r);rings.push(r)}
  for(let i=0;i<28;i++){const p=new THREE.Mesh(geo.box,new THREE.MeshBasicMaterial({color:i%2?MAG:CYAN,toneMapped:false,transparent:true,opacity:0.55}));p.scale.set(0.06,2.6,0.06);scene.add(p);pillars.push(p)}
  saber=makeSaber();copilot=makeCopilot();sparks=makeSparks();
  for(let i=0;i<14;i++){const m=new THREE.Mesh(geo.sph,new THREE.MeshBasicMaterial({color:i%3?GRN:0xffffff,toneMapped:false}));m.scale.setScalar(0.07);m.visible=false;scene.add(m);arrivals.push(m)}
  for(let i=0;i<8;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:wordTex('·'),transparent:true,depthTest:false,toneMapped:false}));sp.visible=false;scene.add(sp);flights.push({sp,piece:null,t0:-9,from:new THREE.Vector3(),to:new THREE.Vector3(),done:true})}
  initCard();loadKit();ok=true}catch(e){console.warn('WebGL era 5 unavailable, using 2D renderer',e);ok=false}}
// ---- finale card: the words you cut stream out of the arena and assemble, voxel by voxel, into NEXT LEVEL ----
// Pure function of t (seeded hash only): every voxel has a launch time, a source piece in the arena, an arc and an
// arrival slot; arrivals sweep left to right and the last ones slam in on the bar-95 downbeat, where the whole title
// locks (white-hot flash, bloom spike, shock ring, camera push) and recolours into one gradient. LOW: one voxel per
// font pixel; HIGH: a second layer behind it (deeper extrusion, twice the voxels in the stream).
const CARD=E5.K.CARD,XE=(OUT+1.2-s5)*SPD; // XE: where the run stops (era5.ts xAt)
const GLYPH:Record<string,string[]>={N:['X...X','XX..X','XX..X','X.X.X','X..XX','X..XX','X...X'],E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],
 T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],L:['X....','X....','X....','X....','X....','X....','XXXXX'],V:['X...X','X...X','X...X','X...X','.X.X.','.X.X.','..X..']};
const camF=new THREE.PerspectiveCamera(50,W/H,0.05,600),CPOS=new THREE.Vector3(XE-3,6.2,0),cF=new THREE.Vector3(),cU=new THREE.Vector3(),cR=new THREE.Vector3(),cBk=new THREE.Vector3(),titleC=new THREE.Vector3();
let vox:THREE.InstancedMesh|null=null,vt:any[]=[],VS=0.25,TP=0.5,shock:THREE.Mesh,glowSp:THREE.Sprite,elig:any[]=[],eligKey='';
const voxU={uFlash:{value:0},uBase:{value:0.3},uEdge:{value:2.6}};
const TD=22,THALF=Math.tan(25*Math.PI/180);
function initCard(){camF.position.copy(CPOS);camF.lookAt(CPOS.x+100,CPOS.y-100*0.1*THALF,0);camF.updateMatrixWorld(true);camF.matrixWorld.extractBasis(cR,cU,cBk);cF.copy(cBk).negate();
 titleC.copy(CPOS).addScaledVector(cF,TD).addScaledVector(cU,0.44*THALF*TD);
 const txt='NEXT LEVEL',layers=LOW?1:2,px:number[][]=[];let cx=0;for(const ch of txt){if(ch===' '){cx+=3;continue}const g=GLYPH[ch];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(g[r][c]==='X')px.push([cx+c,r]);cx+=6}const TW=cx-1;
 TP=0.66*2*THALF*(W/H)*TD/TW;VS=TP; // world size of one font pixel = one voxel
 vt=[];for(let d=0;d<layers;d++)for(const [x,y] of px){const lx=(x+0.5-TW/2)*TP,ly=(3-y)*TP,lz=-d*TP*1.62,ux=(x+0.5)/TW,uy=(y+0.5)/7,k=vt.length;
  const h1=hash(k*1.37+0.5),h2=hash(k*2.71+1.1),h3=hash(k*3.97+2.3),h4=hash(k*5.33+3.7);const key=h2>0.92; // keystones: the last voxels, slammed in on the downbeat
  let tA=key?cb(CARD.lock):cb(94.42)+ux*bar(0.5)+(h1-0.5)*0.12;tA=Math.min(tA,cb(CARD.lock)-0.03);if(key)tA=cb(CARD.lock);
  const dur=key?0.5+h3*0.12:0.8+h3*0.35,tL=Math.max(cb(CARD.fly)+0.03+h4*0.1,tA-dur);vt.push({lx,ly,lz,ux,uy,h1,h2,h3,h4,key,tA,tL})}
 const g=new RoundedBoxGeometry(1,1,1,LOW?1:2,0.12);const m=new THREE.MeshStandardMaterial({color:0x161a3a,metalness:0.55,roughness:0.32,emissive:0xffffff});
 // block language: dark body, glowing hue edges (an edge factor from the local position, since instanced meshes cannot share the LineSegments edges)
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,voxU);sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLoc;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLoc=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLoc;uniform float uFlash,uBase,uEdge;').replace('vec3 totalEmissiveRadiance = emissive;','vec3 aL=abs(vLoc)*2.0;float mxL=max(aL.x,max(aL.y,aL.z)),mnL=min(aL.x,min(aL.y,aL.z)),mdL=aL.x+aL.y+aL.z-mxL-mnL;float edL=smoothstep(0.72,0.92,mdL);\nvec3 totalEmissiveRadiance = vColor*(uBase+edL*uEdge)+vec3(uFlash);')};
 vox=new THREE.InstancedMesh(g,m,vt.length);vox.frustumCulled=false;vox.visible=false;const c0=new THREE.Color(1,1,1);for(let i=0;i<vt.length;i++)vox.setColorAt(i,c0);scene.add(vox);
 shock=new THREE.Mesh(new THREE.RingGeometry(0.92,1,72),new THREE.MeshBasicMaterial({color:0xbff8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));shock.visible=false;scene.add(shock);
 glowSp=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(256,128,x=>{const g=x.createRadialGradient(128,128,4,128,128,128);g.addColorStop(0,'rgba(255,200,140,1)');g.addColorStop(0.25,'rgba(255,90,170,.75)');g.addColorStop(0.6,'rgba(120,40,200,.3)');g.addColorStop(1,'rgba(40,10,80,0)');x.fillStyle=g;x.fillRect(0,0,256,128)}),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));glowSp.visible=false;scene.add(glowSp)}
// card camera: crane from the rider's eye up to the hero pose by the lock, then a push on the downbeat and a slow drift
const cardPos=(t:number,o:THREE.Vector3)=>{const d=t>=cb(CARD.lock)?1.1*(1-Math.exp(-(t-cb(CARD.lock))*5))+0.15*(t-cb(CARD.lock)):0;return o.copy(CPOS).addScaledVector(cF,d)};
const vP=new THREE.Vector3(),vA=new THREE.Vector3(),vB=new THREE.Vector3(),vC=new THREE.Vector3(),vQ=new THREE.Quaternion(),vQ2=new THREE.Quaternion(),vE=new THREE.Euler(),vS=new THREE.Vector3(),vM=new THREE.Matrix4(),vCol=new THREE.Color(),vCol2=new THREE.Color();
const GRAD=[new THREE.Color(0x9ff8ff),new THREE.Color(CYAN),new THREE.Color(MAG),new THREE.Color(VIO)];
function gradAt(u:number,o:THREE.Color){const f=clamp(u,0,1)*(GRAD.length-1),i=Math.min(GRAD.length-2,Math.floor(f));return o.copy(GRAD[i]).lerp(GRAD[i+1],f-i)}
const titleW=(lx:number,ly:number,lz:number,o:THREE.Vector3)=>o.copy(titleC).addScaledVector(cR,lx).addScaledVector(cU,ly).addScaledVector(cBk,lz);
let cardLast=-1;
function updateCard(S:any,t:number,cam:number,dt:number){if(!vox)return;const b=cbInv(t),on=b>=CARD.fly;vox.visible=on;shock.visible=false;glowSp.visible=on;const sun=(skyM as any).userData.sun;
 if(!on){voxU.uFlash.value=0;cardLast=t;cardStat.inFlight=cardStat.placed=0;cardStat.n=vt.length;cardStat.locked=false;return}
 const lock=cb(CARD.lock),sl=t-lock;
 // sources: the arena pieces around where the run stopped (cached per simulation state)
 const key=S.built.length+'|'+(S===lastS);if(key!==eligKey){eligKey=key;elig=S.built.filter((p:any)=>p.x>CPOS.x+3&&p.x<XE+80)}
 const n=vt.length,np=elig.length;let latest=-1,latestT=-1,inFlight=0,placed=0;
 for(let i=0;i<n;i++){const v=vt[i];let s=0;const p=np?elig[Math.floor(v.h1*np*0.999)]:null;
  if(t<v.tL){s=0;vP.copy(titleC)}
  else{const q=clamp((t-v.tL)/(v.tA-v.tL),0,1);
   if(p)vA.set(p.x+(v.h3-0.5)*3,pieceTop(p)*(0.3+0.7*v.h4),pieceZ(p)+(v.h2-0.5)*3);else vA.set(XE+8+v.h1*40,0.3,(v.h2<0.5?-1:1)*(3+v.h3*6));
   titleW(v.lx,v.ly,v.lz,vB);
   if(q<1){inFlight++;const e=v.key?q*q:q*q*(3-2*q);vC.copy(vA).add(vB).multiplyScalar(0.5);vC.y+=v.key?9+v.h4*4:3+v.h4*6;vC.addScaledVector(cR,(v.h1-0.5)*12);vC.addScaledVector(cBk,v.key?0:1+v.h3*2.5); // arcs swing up and out towards the lens before settling
    const a=1-e;vP.copy(vA).multiplyScalar(a*a).addScaledVector(vC,2*a*e).addScaledVector(vB,e*e);s=lerp(v.key?0.42:0.5,VS*0.88,e)*Math.min(1,(t-v.tL)/0.08);
    vE.set((v.h1-0.5)*12*a,(v.h2-0.5)*12*a,(v.h3-0.5)*12*a);vQ2.setFromEuler(vE);vQ.copy(camF.quaternion).multiply(vQ2)}
   else{placed++;if(v.tA>latestT){latestT=v.tA;latest=i}const since=t-v.tA;
    // landed: a little bounce towards the camera, then the lock ripple and a beat shimmer
    let lz=since<0.35?Math.sin(since/0.35*Math.PI)*Math.exp(-since*6)*TP*0.9:0;if(sl>=0){const w=sl-v.ux*0.32;lz+=Math.exp(-w*w/0.003)*TP*0.7}
    vP.copy(vB).addScaledVector(cBk,lz);if(sl<0)vP.addScaledVector(cU,Math.sin(t*9+v.h1*20)*0.015);s=VS*0.88;vQ.copy(camF.quaternion)}}
  vS.set(s,s,s*(sl>=0?1.9:1.3)).multiplyScalar(v.lz<0&&t>=v.tA?1.04:1).multiplyScalar(s>0?1:0);if(s<=0)vS.setScalar(1e-4);vM.compose(vP,vQ,vS);vox.setMatrixAt(i,vM);
  // colour: the hue of the word it came from, then one gradient after the lock
  vCol.setHex(HUEX[((p?p.hue:0)+Math.floor(v.h2*2.4))%3]);
  let k=1;if(t>=v.tA)k+=2.5*Math.exp(-(t-v.tA)*9);
  if(sl>=0){gradAt(v.uy,vCol2);vCol.lerp(vCol2,clamp(sl/0.12,0,1));const ph=((t-lock)/(BEAT*2))%1,w=ph*1.6-0.3-v.ux;k+=0.9*Math.exp(-w*w/0.004)}
  if(v.lz<0&&t>=v.tA)k*=lerp(1,0.22,clamp((t-v.tA)/0.3,0,1)); // the back layer settles into shadow: depth, not a second grid
  vCol.multiplyScalar(k);vox.setColorAt(i,vCol)}
 vox.instanceMatrix.needsUpdate=true;if(vox.instanceColor)vox.instanceColor.needsUpdate=true;
 voxU.uFlash.value=sl>=0?0.8*Math.exp(-sl*9):0;voxU.uEdge.value=2.6;
 // shock ring + sparks on the lock
 if(sl>=0&&sl<0.7){const q=sl/0.7;shock.visible=true;shock.position.copy(titleC).addScaledVector(cBk,0.3);shock.quaternion.copy(camF.quaternion);shock.scale.setScalar(1+34*(1-Math.pow(1-q,3)));(shock.material as any).opacity=0.9*(1-q)*(1-q)}
 if(cardLast<lock&&t>=lock&&t-cardLast<0.25){for(let j=0;j<(LOW?24:60);j++){const v=vt[Math.floor(hash(j*7.7)*n)];titleW(v.lx,v.ly,0.2,vA);spark(vA.x,vA.y,vA.z,j%3?0xffffff:CYAN,LOW?3:5,6)}}
 cardLast=t;
 // the synthwave sun moves to the vanishing point and rises behind the title; a glow swells with it and kicks on the lock
 if(sun){const q=clamp((b-CARD.fly)/0.3,0,1),sm=sun.material as any;if(q<1){sm.opacity=1-q}else{sm.opacity=1;const r=smooth(clamp((b-94.35)/1.55,0,1));sun.position.set(camera.position.x+300,lerp(-60,16,r),0);sun.scale.setScalar(150)}}
 {const r=smooth(clamp((b-94.3)/0.7,0,1)),kick=sl>=0?0.5*Math.exp(-sl*3):0,breathe=0.06*Math.cos(t/BEAT*Math.PI*2);glowSp.position.set(camera.position.x+280,4,0);glowSp.scale.set(520*(1+kick*0.3),170*(1+kick*0.2),1);(glowSp.material as any).opacity=clamp(0.5*r+kick+breathe*r,0,1)}
 // co-pilot: under the title while it assembles, beaming each voxel in; beside the name once the card is up (see updateCopilot)
 const c=copilot;if(b>=94.35&&sl<0&&latest>=0){const v=vt[latest];titleW(v.lx,v.ly,0,vB);const a=c.g.position;c.beam.visible=true;c.beam.position.copy(vA.copy(a).add(vB).multiplyScalar(0.5));c.beam.scale.set(0.03,a.distanceTo(vB),0.03);c.beam.lookAt(vB);c.beam.rotateX(Math.PI/2);(c.beam.material as any).opacity=0.35+0.4*rnd(5)}
 cardStat.inFlight=inFlight;cardStat.placed=placed;cardStat.n=n;cardStat.locked=sl>=0}
const cardStat={n:0,inFlight:0,placed:0,locked:false};
// where the co-pilot hovers at time t during the card (world point), or null outside the card
function copilotCard(t:number,o:THREE.Vector3){const b=cbInv(t);if(b<CARD.fly)return null;
 if(b<CARD.lock-0.06)return titleW(0,-TP*6.2,5,o);
 // beside the name: a point at a fixed depth in front of the camera, under the name's right end
 const d=7,ndx=CARD.copilotX*2-1,ndy=1-CARD.nameY*2,th=Math.tan(camera.fov*Math.PI/360);camera.updateMatrixWorld();camera.matrixWorld.extractBasis(kR,kU,kB);return o.copy(camera.position).addScaledVector(kB,-d).addScaledVector(kR,ndx*th*camera.aspect*d).addScaledVector(kU,ndy*th*d)}
const kR=new THREE.Vector3(),kU=new THREE.Vector3(),kB=new THREE.Vector3(),kO=new THREE.Vector3();
// ---- camera + mood ----
const V=()=>new THREE.Vector3();const cinP=V(),cinL=V(),altP=V(),altL=V();
function cinema(t:number,S:any){const b=cbInv(t),cam=S.dist;const bob=Math.sin(t*2.1)*0.02;cinP.set(cam-BACK,EYE+bob,Math.sin(t*0.7)*0.03);cinL.set(cam+9,EYE-0.3,0);let f=fovAt(t),q=0;
 if(b<76.3){q=1-smooth(clamp((b-75)/1.3,0,1));altP.set(cam-BACK,EYE,0);altL.set(cam+9,2.4,0)}
 else if(t>=OUT){const u=clamp((t-OUT)/(cb(CARD.lock)-0.05-OUT),0,1);q=smooth(u);cardPos(t,altP);altL.copy(altP).addScaledVector(cF,60);f=lerp(f,50,q);if(t>=cb(CARD.lock)){const sl=t-cb(CARD.lock);f-=2.2*(1-Math.exp(-sl*6))}
  // crane: rise first, travel second
  const qy=1-Math.pow(1-u,2.4);cinP.set(lerp(cinP.x,altP.x,q),lerp(cinP.y,altP.y,qy),lerp(cinP.z,altP.z,q));cinL.lerp(altL,q);q=0}
 if(q>0){cinP.lerp(altP,q);cinL.lerp(altL,q)}if(S.shake>0){cinP.x+=(rnd(1)-0.5)*S.shake*0.08;cinP.y+=(rnd(2)-0.5)*S.shake*0.08}return{p:cinP,l:cinL,f}}
const MOOD:number[][]=[[75,0x1a0b36,0xffb090,0x5a3aa0],[88.3,0x1a0b36,0xffb090,0x5a3aa0],[89.3,0x2a0a12,0xff7040,0x8a3a30],[93.8,0x2a0a12,0xff7040,0x8a3a30],[94.7,0x2a0b3c,0xffa080,0x6a3aa0],[96,0x320c40,0xffb090,0x7a44b0]];
const cA=new THREE.Color(),cB=new THREE.Color();
function mood(t:number){const b=cbInv(t);let i=0;while(i<MOOD.length-2&&b>=MOOD[i+1][0])i++;const a=MOOD[i],z=MOOD[i+1],u=clamp((b-a[0])/(z[0]-a[0]),0,1);(scene.fog as THREE.FogExp2).color.copy(cA.setHex(a[1]).lerp(cB.setHex(z[1]),u));sunL.color.copy(cA.setHex(a[2]).lerp(cB.setHex(z[2]),u));hemiL.color.copy(cA.setHex(a[3]).lerp(cB.setHex(z[3]),u));(scene.fog as THREE.FogExp2).density=t>=OUT?lerp(0.02,0.008,clamp((t-OUT)/1,0,1)):t>=TUNNEL?0.02:0.013}
// ---- per-frame updates ----
let lastT=0,lastS:any=null;const hidden:THREE.Object3D[]=[];
function updateBlocks(S:any,t:number,cam:number,dt:number){let bi=0;for(const b of S.blocks){if(!b.active)continue;const x=cam+HIT+(b.hitT-t)*SPD;if(x<cam-2||x>cam+60)continue;
  if(b.hit){if(!split.has(b)){split.add(b);if(t-b.hit<0.3){const col=HUEX[b.hue];for(const sgn of[-1,1]){let h=halves[0];for(const c of halves)if(c.life<=0){h=c;break}const r0=b.k*7+sgn;h.m.visible=true;h.m.material=halfMat[b.hue];h.m.position.set(cam+HIT,ROWY(b.row),COLZ(b.col)+sgn*0.23);h.m.rotation.set(0,0,0);h.vx=SPD*0.8+hash(r0)*2;h.vy=1.5+hash(r0+1)*2;h.vz=sgn*(2.5+hash(r0+2)*2);h.rx=(hash(r0+3)-0.5)*14;h.rz=(hash(r0+4)-0.5)*14;h.life=0.55;h.m.scale.setScalar(1)}spark(cam+HIT,ROWY(b.row),COLZ(b.col),col,26,7);spark(cam+HIT,ROWY(b.row),COLZ(b.col),0xffffff,10,4);
   // every word that becomes arena flies from the cut to the piece it becomes
   if(b.pieceI>=0){const p=S.built[b.pieceI],f=flights[flightN++%flights.length];if(p&&f){f.piece=p;f.t0=t;f.done=false;f.from.set(cam+HIT,ROWY(b.row),COLZ(b.col));f.to.set(p.x,pieceTop(p),pieceZ(p));f.sp.material.map=wordTex(b.word);f.sp.visible=true}}}}continue}
  if(bi>=blocks.length)break;const o=blocks[bi++];o.g.visible=true;o.g.position.set(x,ROWY(b.row)+Math.sin(t*3+b.k)*0.02,COLZ(b.col));o.shadow.visible=!b.missed;o.shadow.position.set(x,0.012,COLZ(b.col));const ss=1.1-b.row*0.2;o.shadow.scale.set(0.75*ss,1.05*ss,1);if(o.word!==b.word||o.hue!==b.hue){o.word=b.word;o.hue=b.hue;(o.face.material as any).map=wordTex(b.word);(o.cube.material as any).emissive.setHex(HUEX[b.hue]);if(o.edgeMat)o.edgeMat.emissive.setHex(HUEX[b.hue])}
  const near=clamp(1-(x-cam)/20,0,1),age=clamp((t-(b.hitT-LEAD))/0.45,0,1),ent=age<1?1-Math.pow(1-age,3):1;const ei=b.missed?0.25:0.45+near*0.25+(1-ent)*1.5;(o.cube.material as any).emissiveIntensity=ei;if(o.edgeMat)o.edgeMat.emissiveIntensity=ei*3.2;o.g.rotation.y=b.missed?(t-b.missed)*3:(1-ent)*Math.PI*2+Math.sin(t*2+b.k)*0.08;o.g.rotation.z=(1-ent)*0.6;o.g.scale.setScalar(b.missed?Math.max(0.01,1-(t-b.missed)*1.6):0.2+0.8*ent+(age<1?Math.sin(age*Math.PI)*0.25:0))}
 for(;bi<blocks.length;bi++){blocks[bi].g.visible=false;blocks[bi].shadow.visible=false}
 for(const h of halves){if(h.life<=0){h.m.visible=false;continue}h.life-=dt;h.vy-=9*dt;h.m.position.x+=h.vx*dt;h.m.position.y+=h.vy*dt;h.m.position.z+=h.vz*dt;h.m.rotation.x+=h.rx*dt;h.m.rotation.z+=h.rz*dt;h.m.scale.setScalar(Math.max(0.01,h.life/0.55));if(h.life<=0)h.m.visible=false}
 for(let i=0;i<sparks.n;i++){if(sparks.life[i]<=0){sparks.pos[i*3+1]=-50;continue}sparks.life[i]-=dt;sparks.vel[i*3+1]-=6*dt;sparks.pos[i*3]+=sparks.vel[i*3]*dt;sparks.pos[i*3+1]+=sparks.vel[i*3+1]*dt;sparks.pos[i*3+2]+=sparks.vel[i*3+2]*dt}(sparks.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate=true;(sparks.pts.geometry.attributes.color as THREE.BufferAttribute).needsUpdate=true}
const sFwd=new THREE.Vector3(),sRight=new THREE.Vector3(),sHandle=new THREE.Vector3(),sTip=new THREE.Vector3(),bA=new THREE.Vector3(),bB=new THREE.Vector3();
const sCol=new THREE.Color();
function updateSaber(S:any,t:number,cam:number,dt:number){const fwd=sFwd;camera.getWorldDirection(fwd);const right=sRight.crossVectors(fwd,camera.up).normalize();const vis=t>=cb(75.6)&&t<OUT+0.3;
 const sb=saber,h=S.saber;const since=t-S.slashT;const sw=since>=0&&since<0.25?Math.sin(since/0.25*Math.PI):0;
 // one hand: the hilt sits low right of centre and drifts a little towards the tip, so the saber reads as held, not mounted
 const lat=clamp(COLZ(h.c)/(COLS/2*COLW),-1.2,1.2),up=clamp((h.r-1)/1.5,-1,1);
 const handle=sHandle.copy(camera.position).addScaledVector(fwd,0.42).addScaledVector(right,0.13+lat*0.16);handle.y+=-0.35+up*0.08;
 // follow-through: after a cut the blade carries on down through the block and comes back up
 const ft=since>=0&&since<0.3?Math.sin(since/0.3*Math.PI):0;const tip=sTip.set(cam+HIT,ROWY(h.r)-ft*0.55,COLZ(h.c));const len=handle.distanceTo(tip);
 sb.g.position.copy(handle);sb.g.lookAt(tip);sb.g.rotateX(Math.PI/2);sb.g.visible=vis;
 sb.blade.scale.y=len-0.24;sb.blade.position.y=0.24+(len-0.24)/2;sb.core.scale.y=len-0.24;sb.core.position.y=sb.blade.position.y;sb.tipG.position.y=len;sb.light.position.y=len*0.8;
 // colour eases to the line being cut
 sb.col.lerp(sCol.setHex(HUEX[h.hue]||MAG),1-Math.pow(0.004,dt));const bm=sb.blade.material as any;bm.emissive.copy(sb.col);sb.light.color.copy(sb.col);(sb.trail.mesh.material as any).color.copy(sb.col);if(sb.emit){sb.emit.emissive.copy(sb.col);sb.emit.emissiveIntensity=2.5+sw*3}
 bm.emissiveIntensity=2.4+sw*4;sb.light.intensity=1.2+sw*3;sb.tipG.scale.setScalar(0.05+sw*0.08);
 trailPush(sb.trail,tip.x,tip.y,tip.z,vis,true,cam)}
function updatePieces(S:any,t:number,cam:number){for(const o of pieces)o.g.visible=false;const from=Math.max(0,S.built.length-pieces.length);
 for(let i=from;i<S.built.length;i++){const p=S.built[i],o=pieces[i%pieces.length];if(p.x<cam-(t>=OUT?70:12)||p.x>cam+90)continue;o.g.visible=true;o.g.position.set(p.x,0,0);const sideZ=p.side==='L'?-1:1;
  if(o.kind!==p.kind||o.word!==p.word||o.side!==p.side||o.hue!==p.hue){o.kind=p.kind;o.word=p.word;o.side=p.side;o.hue=p.hue;o.arch.visible=p.kind==='arch';o.pillar.visible=p.kind==='pillar';o.panel.visible=p.kind==='panel';o.beam.visible=p.kind==='beam';o.ring.visible=p.kind==='ring';o.em.emissive.setHex(HUEX[p.hue]);o.pillar.position.z=PIECEZ*sideZ;o.panel.position.z=(PIECEZ+0.3)*sideZ;o.panel.rotation.y=-Math.PI/2-sideZ*0.45;(o.pp.material as any).map=wordTex(p.word)} // panels face the player, angled in towards the lane
  const q=clamp((t-p.t)/0.35,0,1),s=q<1?lerp(0,1.15,q)-(q>0.6?(q-0.6)/0.4*0.15:0):1;const gone=t>=OUT&&p.x>CPOS.x+3?smooth(clamp((t-cb(CARD.fly+0.08)-hash(p.i*3.3)*0.35)/0.45,0,1)):0;o.g.scale.setScalar(Math.max(0.001,s*(1-gone)));const nearF=clamp((p.x-cam)/7,0.12,1);const fa=flashAt.get(p);const fl=fa!==undefined?clamp(1-(t-fa)/0.5,0,1):0;o.em.emissiveIntensity=(1.0+0.4*(1-((t/BEAT)%1))+(q<1?1.5*(1-q):0)+fl*3)*nearF*o.kitK*(t>=OUT?lerp(1,0.4,smooth(clamp((t-OUT)/bar(0.8),0,1))):1);if(p.kind==='ring')o.ring.rotation.x=t*0.6+p.i}}
function updateCopilot(S:any,t:number,cam:number,dt:number){const c=copilot;let tx=cam+9,ty=2.8,tz=0;const p=S.built[S.copilot.pi];const busy=p&&S.copilot.status!=='STANDING BY'&&S.copilot.status!=='ARENA COMPLETE';if(busy){tx=p.x;ty=p.kind==='pillar'?4.6:p.kind==='panel'?3.4:p.kind==='beam'?4.9:3.2;tz=(p.kind==='pillar'||p.kind==='panel')?(p.side==='L'?-3:3):0}
 const cc=copilotCard(t,kO);if(cc){tx=cc.x;ty=cc.y;tz=cc.z}else if(t>=OUT){tx=cam+16;ty=6+(t-OUT)*1.5;tz=0}
 const k=1-Math.pow(cc?0.004:0.02,dt);c.x+=(tx-c.x)*k;c.y+=(ty-c.y)*k;c.z+=(tz-c.z)*k;if(Math.abs(tx-c.x)>30||c.snap){c.x=tx;c.y=ty;c.z=tz;c.snap=false}
 c.g.position.set(c.x,c.y+Math.sin(t*3)*0.06,c.z);c.g.visible=t>=cb(75.4);if(c.kit){c.kit.ra.rotation.set(0.35,t*1.7,0);c.kit.rb.rotation.set(0.3+Math.sin(t*0.5)*0.2,t*1.3,0);c.kit.shell.rotation.y=t*0.8;c.kit.core.rotation.set(t*0.7,-t*1.2,0)}c.ring.rotation.z=t*1.7;c.ring2.rotation.x=t*1.3;c.shell.rotation.y=t*0.8;c.orbit.forEach((s,i)=>{const a=t*2.2+i*Math.PI/3;s.position.set(Math.cos(a)*0.62,Math.sin(a*1.3)*0.25,Math.sin(a)*0.62)});
 const working=busy&&t-S.copilot.since<BEAT*1.5&&t<OUT;c.beam.visible=!!working;if(working){const by=p.kind==='pillar'?2:p.kind==='panel'?2.4:p.kind==='beam'?4.3:1.5,bz=pieceZ(p);const a=c.g.position,b=bB.set(p.x,by,bz);c.beam.position.copy(bA.copy(a).add(b).multiplyScalar(0.5));c.beam.scale.set(0.03,a.distanceTo(b),0.03);c.beam.lookAt(b);c.beam.rotateX(Math.PI/2);(c.beam.material as any).opacity=0.25+0.35*rnd(3);if(rnd(4)<0.5)spark(b.x,b.y,b.z,GRN,2,2.5)}
 trailPush(c.trail,c.g.position.x-0.1,c.g.position.y,c.g.position.z,c.g.visible)}
const pieceTop=(p:any)=>p.kind==='pillar'?4.3:p.kind==='panel'?2.6:p.kind==='beam'?4.5:p.kind==='ring'?3.4:2.9;const pieceZ=(p:any)=>(p.kind==='pillar'||p.kind==='panel')?(p.side==='L'?-PIECEZ:PIECEZ):0;
function updateFlights(S:any,t:number){for(const f of flights){if(f.done)continue;const q=clamp((t-f.t0)/0.7,0,1);const e=q*q*(3-2*q);f.sp.position.lerpVectors(f.from,f.to,e);f.sp.position.y+=Math.sin(q*Math.PI)*1.2;const sc=1-q*0.3;f.sp.scale.set(1.1*sc,0.55*sc,1);(f.sp.material as any).opacity=q<0.85?1:(1-q)/0.15;if(q>=1){f.done=true;f.sp.visible=false;const p=f.piece;if(p&&S.built[p.i]===p){flashAt.set(p,t);spark(f.to.x,f.to.y,f.to.z,HUEX[p.hue],30,5)}}}}
function updateArrivals(S:any,t:number,cam:number){const on=t>=s5&&t<cb(76.4);arrivals.forEach((m,i)=>{m.visible=on;if(!on)return;const q=clamp((t-s5-i*0.05)/(cb(76.3)-s5),0,1),e=q*q*(3-2*q);const sx=cam-2+i*0.3,sy=1.2+(i%4)*0.6,sz=6+(i%5)*0.8;m.position.set(lerp(sx,copilot.g.position.x,e)+Math.sin(t*5+i)*(1-e)*0.3,lerp(sy,copilot.g.position.y,e)+Math.cos(t*4+i)*(1-e)*0.3,lerp(sz,copilot.g.position.z,e));m.scale.setScalar(0.07*(1-e*0.6))})}
function updatePillars(t:number,cam:number){const n0=Math.floor(cam/5);pillars.forEach((p,i)=>{const k=n0+Math.floor(i/2),side=i%2?1:-1;p.position.set(k*5+1.5,1.3,side*(LANEZ+0.65));const d=p.position.x-cam;p.visible=d>-2&&d<70;(p.material as any).opacity=0.25+0.35*clamp(1-d/60,0,1)})}
function updateRings(S:any,t:number,cam:number){const on=t>=TUNNEL&&t<OUT+1;const n0=Math.floor(cam/4)+1;rings.forEach((r,i)=>{const x=(n0+i)*4;r.visible=on&&x>cam-2;if(!r.visible)return;r.position.set(x,1.9,0);r.rotation.x=t*0.9+i*0.4;const q=clamp((t-TUNNEL)/BAR-(x-cam)/120,0,1);r.scale.setScalar(Math.max(0.01,q*(t>=OUT?1-smooth(clamp((t-OUT)/0.5,0,1)):1)));(r.material as any).emissiveIntensity=(0.8+0.9*(1-((t/BEAT)%1)))*clamp((x-cam)/8,0.1,1)})}
export const E5GL={init,get ok(){return ok},canvas:()=>renderer.domElement,
 render(t:number){if(!ok)return;const S=E5.S;if(!S)return;if(t<lastT-0.5||S!==lastS){split=new WeakSet();flashAt=new WeakMap();for(const f of flights){f.done=true;f.sp.visible=false}for(const h of halves)h.life=0;copilot.snap=true;lastS=S}const dt=clamp(t-lastT,0,0.05);lastT=t;const cam=S.dist,pulse=1-((t/BEAT)%1);
  const cin=cinema(t,S);camera.position.copy(cin.p);camera.lookAt(cin.l);camera.fov=t>=OUT?cin.f:lerp(camera.fov,cin.f,1-Math.pow(0.002,dt)); // the card's lens is a pure function of t (already smooth), so a seek lands on the same frame
  camera.updateProjectionMatrix();
  const cell=1400/220;floorG.position.x=Math.floor(cam/cell)*cell;const k=Math.floor((cam-60)/SKYW);skyA.position.set(k*SKYW-60,0,0);skyB.position.set((k+1)*SKYW-60,0,0);if(palmK)palmK.update(cam);if(carK)carK.update(cam,t,-(LANEZ+3.6));
  cutLine.position.set(cam+HIT,0.03,0);cutLine.visible=t<OUT;(cutLine.material as any).opacity=0.35+0.4*pulse;
  skyM.position.copy(camera.position);starsM.position.copy(camera.position);const sun=(skyM as any).userData.sun;sun.position.set(camera.position.x+330,camera.position.y+30,-120);sunL.position.set(cam+16,42,24);sunL.target.position.set(cam+8,0,0);
  updateBlocks(S,t,cam,dt);updateSaber(S,t,cam,dt);updatePieces(S,t,cam);updatePillars(t,cam);updateCopilot(S,t,cam,dt);updateArrivals(S,t,cam);updateFlights(S,t);updateRings(S,t,cam);updateCard(S,t,cam,dt);
  const sl=t-cb(CARD.lock);bloom.strength=0.4+0.15*pulse+(S.flash>0?0.15:0)+(sl>=0?0.5*Math.exp(-sl*5):0);mood(t);composer.render()}};

if(import.meta.env.DEV)(window as any).__E5GL={pieces:()=>pieces,camera:()=>camera,S:()=>E5.S,kit:()=>Object.keys(kit),card:()=>({...cardStat})};
