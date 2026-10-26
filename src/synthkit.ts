import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {hash} from './core';

// ---------- synthwave scenery for the finale: neon towers, palm silhouettes, a wedge sports car pacing the lane ----------
// Everything is built from primitives in code (no model files), deterministic from hash(), and instanced per archetype.

const CYAN=0x4df0ff,MAG=0xff5be0,VIO=0xb07cff,ORG=0xff9a3c;
const box=(w:number,h:number,d:number,x:number,y:number,z:number)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
const clean=(g:THREE.BufferGeometry)=>{const n=g.index?g.toNonIndexed():g;for(const k of Object.keys(n.attributes))if(k!=='position'&&k!=='normal'&&k!=='uv')n.deleteAttribute(k);return n};
const merge=(gs:THREE.BufferGeometry[])=>mergeGeometries(gs.map(clean),false)!;

// ---- towers: unit footprint (x,z in -0.5..0.5), height 0..1; an instance scales it to (w,h,w) ----
// each archetype is a body (dark, lit windows from an emissive map) and a trim (neon rims, corner strips, masts)
type Arch={body:THREE.BufferGeometry,trim:THREE.BufferGeometry};
function tiers(steps:number[][],rim:number){ // steps: [width, depth, height fraction]
 const body:THREE.BufferGeometry[]=[],trim:THREE.BufferGeometry[]=[];let y=0;
 for(const [w,d,h] of steps){body.push(box(w,h,d,0,y+h/2,0));const ty=y+h;
  trim.push(box(w+0.02,rim,0.02,0,ty,d/2+0.01),box(w+0.02,rim,0.02,0,ty,-d/2-0.01),box(0.02,rim,d+0.02,w/2+0.01,ty,0),box(0.02,rim,d+0.02,-w/2-0.01,ty,0));y=ty}
 return {body,trim,top:y}}
function archetypes():Arch[]{const A:Arch[]=[];const R=0.012;
 {const t=tiers([[1,1,0.5],[0.78,0.78,0.3],[0.52,0.52,0.2]],R);t.trim.push(box(0.03,0.22,0.03,0,t.top+0.11,0));A.push({body:merge(t.body),trim:merge(t.trim)})}            // stepped wedding cake + mast
 {const t=tiers([[1,0.7,0.82],[0.6,0.5,0.1]],R);for(const sx of[-1,1])for(const sz of[-1,1])t.trim.push(box(0.025,0.82,0.025,sx*0.5,0.41,sz*0.35));A.push({body:merge(t.body),trim:merge(t.trim)})} // slab, neon corner strips, crown
 {const b=[box(0.42,1,0.6,-0.29,0.5,0),box(0.42,0.85,0.6,0.29,0.425,0),box(0.16,0.06,0.3,0,0.62,0)];const tr=[box(0.44,R,0.62,-0.29,1,0),box(0.44,R,0.62,0.29,0.85,0),box(0.18,R*2,0.32,0,0.65,0),box(0.025,0.18,0.025,-0.29,1.09,0)];A.push({body:merge(b),trim:merge(tr)})} // twin towers + skybridge
 {const b=[box(1,0.78,1,0,0.39,0),new THREE.ConeGeometry(0.71,0.3,4,1).rotateY(Math.PI/4).translate(0,0.93,0)];const tr=[box(1.02,R,1.02,0,0.78,0),box(0.03,0.3,0.03,0,1.2,0)];for(let k=1;k<6;k++)tr.push(box(1.02,0.006,1.02,0,k*0.13,0));A.push({body:merge(b),trim:merge(tr)})} // pyramid-capped tower, ledge lines
 {const b=[new THREE.CylinderGeometry(0.42,0.5,0.9,10).translate(0,0.45,0),new THREE.CylinderGeometry(0.2,0.3,0.12,10).translate(0,0.96,0)];const tr=[new THREE.TorusGeometry(0.43,0.012,4,24).rotateX(Math.PI/2).translate(0,0.9,0),new THREE.TorusGeometry(0.47,0.01,4,24).rotateX(Math.PI/2).translate(0,0.45,0),new THREE.ConeGeometry(0.06,0.35,6).translate(0,1.2,0)];A.push({body:merge(b),trim:merge(tr)})} // round tower + spire
 {const t=tiers([[1,1,0.35],[0.9,0.6,0.35],[0.5,0.5,0.25]],R);t.trim.push(box(0.6,0.03,0.03,0,0.5,0.31),box(0.6,0.03,0.03,0,0.6,0.31),box(0.03,0.16,0.03,0.15,t.top+0.08,0),box(0.03,0.26,0.03,-0.15,t.top+0.13,0));A.push({body:merge(t.body),trim:merge(t.trim)})} // offset setbacks, sign bars, twin masts
 return A}
let ARCH:Arch[]|null=null;
const TRIMC=[MAG,CYAN,VIO,MAG,CYAN,ORG];
// a skyline band on both sides of the lane, `n` towers between |z| zmin..zmax, heights hmin..hmax, spread over `len` along x
export function towers(g:THREE.Group,n:number,len:number,zmin:number,zmax:number,hmin:number,hmax:number,winTex:THREE.Texture,tint:number,seed:number,trimK=1){
 if(n<=0)return;if(!ARCH)ARCH=archetypes();
 const byA:number[][]=ARCH.map(()=>[]);for(let i=0;i<n;i++)byA[Math.floor(hash(i*3.31+seed)*ARCH.length)%ARCH.length].push(i);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0);
 byA.forEach((ids,a)=>{if(!ids.length)return;
  const tex=winTex.clone();tex.needsUpdate=true;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,Math.max(1,Math.round(hmax/8)));
  const body=new THREE.InstancedMesh(ARCH![a].body,new THREE.MeshStandardMaterial({color:0x0b0820,metalness:0.5,roughness:0.55,emissive:tint,emissiveMap:tex,emissiveIntensity:0.6}),ids.length);
  const trim=new THREE.InstancedMesh(ARCH![a].trim,new THREE.MeshBasicMaterial({color:new THREE.Color(TRIMC[(a+seed)%TRIMC.length]).multiplyScalar(trimK),toneMapped:false}),ids.length);
  ids.forEach((i,j)=>{const w=1.8+hash(i*1.3+seed)*3.4,h=hmin+hash(i*2.7+seed)*(hmax-hmin),z=(i%2?1:-1)*(zmin+hash(i*5.1+seed)*(zmax-zmin));
   p.set(hash(i*7.9+seed)*len,0,z);q.setFromAxisAngle(Y,Math.floor(hash(i*9.7+seed)*4)*Math.PI/2+(hash(i*4.4+seed)-0.5)*0.3);s.set(w,h,w*(0.8+hash(i*6.2+seed)*0.5));m.compose(p,q,s);body.setMatrixAt(j,m);trim.setMatrixAt(j,m)});
  body.instanceMatrix.needsUpdate=true;trim.instanceMatrix.needsUpdate=true;g.add(body,trim)})}

// ---- palm trees: a leaning, tapering trunk and drooping fronds; a dark silhouette with a neon back-face rim ----
function palmGeo(){const parts:THREE.BufferGeometry[]=[];const segs=7;let x=0,y=0;
 for(let i=0;i<segs;i++){const h=0.62,r0=0.16-i*0.012,r1=r0-0.012;const g=new THREE.CylinderGeometry(r1,r0,h,6);g.rotateZ(-0.05-i*0.025);g.translate(x,y+h/2,0);parts.push(g);x+=Math.sin(0.05+i*0.025)*h;y+=Math.cos(0.05+i*0.025)*h*0.98}
 const top=new THREE.Vector3(x,y,0);
 for(let k=0;k<9;k++){const L=1.5+0.35*hash(k*3.1),pl=new THREE.PlaneGeometry(0.34,L,1,8);const pa=pl.attributes.position as THREE.BufferAttribute;
  for(let v=0;v<pa.count;v++){const yy=pa.getY(v)+L/2,u=yy/L;pa.setXYZ(v,pa.getX(v)*(1-u*0.85)*(1+Math.sin(u*Math.PI)*0.6),yy,-0.9*u*u*L)}// taper, widen mid-leaf, droop
  pl.rotateX(-Math.PI/2+0.35);pl.rotateY(k*Math.PI*2/9+hash(k*7.3)*0.4);pl.translate(top.x,top.y,top.z);parts.push(pl)}
 parts.push(new THREE.SphereGeometry(0.2,6,4).translate(top.x,top.y,top.z));return merge(parts)}
export function palms(scene:THREE.Scene,n:number,spacing:number,zmin:number,zmax:number){
 const geo=palmGeo();const sil=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0x1a0730,side:THREE.DoubleSide}),n);
 const rim=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:MAG,side:THREE.BackSide,toneMapped:false,transparent:true,opacity:0.85}),n);
 sil.frustumCulled=rim.frustumCulled=false;scene.add(sil,rim);const m=new THREE.Matrix4(),mr=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0);
 return{update(cam:number){const k0=Math.floor((cam+6)/spacing);for(let i=0;i<n;i++){const k=k0+Math.floor(i/2),side=i%2?1:-1,h=hash(k*1.7+side*0.3);
  p.set(k*spacing+h*spacing*0.6,0,side*(zmin+hash(k*2.9+side)*(zmax-zmin)));q.setFromAxisAngle(Y,(side>0?Math.PI:0)+(h-0.5)*1.2);const sc=1.3+hash(k*4.1+side)*0.9;s.set(sc,sc,sc);m.compose(p,q,s);sil.setMatrixAt(i,m);
  s.multiplyScalar(1.035);mr.compose(p,q,s);rim.setMatrixAt(i,mr)}sil.instanceMatrix.needsUpdate=true;rim.instanceMatrix.needsUpdate=true},
  set visible(v:boolean){sil.visible=rim.visible=v}}}

// ---- the car: a low wedge (extruded side profile), black glass, neon edge lines, tail-light bar, underglow; paces the lane ----
export function car(scene:THREE.Scene){const g=new THREE.Group();
 const sh=new THREE.Shape();sh.moveTo(-2.1,0.28);sh.lineTo(2.25,0.22);sh.lineTo(2.3,0.42);sh.lineTo(0.9,0.62);sh.lineTo(0.15,1.0);sh.lineTo(-1.2,1.02);sh.lineTo(-2.05,0.78);sh.lineTo(-2.15,0.5);sh.closePath();
 const bodyG=new THREE.ExtrudeGeometry(sh,{depth:1.9,bevelEnabled:false}).translate(0,0,-0.95);
 const body=new THREE.Mesh(bodyG,new THREE.MeshStandardMaterial({color:0x0a0716,metalness:0.8,roughness:0.25}));g.add(body);
 g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyG,25),new THREE.LineBasicMaterial({color:CYAN,toneMapped:false})));
 const glass=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.02,1.6),new THREE.MeshBasicMaterial({color:VIO,transparent:true,opacity:0.55,toneMapped:false}));glass.position.set(-0.35,1.0,0);glass.rotation.z=0.03;g.add(glass);
 const tail=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.12,1.7),new THREE.MeshBasicMaterial({color:0xff2a50,toneMapped:false}));tail.position.set(-2.16,0.66,0);g.add(tail);
 for(const sz of[-0.6,0.6]){const hl=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.42),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));hl.position.set(2.26,0.36,sz);g.add(hl)}
 const wheels:THREE.Object3D[]=[];for(const wx of[-1.35,1.4])for(const wz of[-0.98,0.98]){const w=new THREE.Group();w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.24,14).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x050508,roughness:0.9})));
  w.add(new THREE.Mesh(new THREE.TorusGeometry(0.25,0.025,4,16),new THREE.MeshBasicMaterial({color:MAG,toneMapped:false})).translateZ(wz>0?0.13:-0.13));w.position.set(wx,0.34,wz);g.add(w);wheels.push(w)}
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(4.6,2.6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:MAG,transparent:true,opacity:0.45,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.position.y=0.03;g.add(glow);
 // tail-light streaks: thin additive bars stretching behind
 const streak=new THREE.Mesh(new THREE.BoxGeometry(1,0.05,0.05).translate(-0.5,0,0),new THREE.MeshBasicMaterial({color:0xff2a50,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const s2=streak.clone();streak.position.set(-2.16,0.66,0.7);s2.position.set(-2.16,0.66,-0.7);g.add(streak,s2);
 g.scale.setScalar(0.62);scene.add(g);
 return{update(cam:number,t:number,z:number){g.position.set(cam+9+Math.sin(t*0.37)*5+Math.sin(t*0.13)*2,0,z+Math.sin(t*0.9)*0.25);g.rotation.y=Math.cos(t*0.9)*0.04;
  for(const w of wheels)w.rotation.z=-t*14;const L=4+2.5*(0.5+0.5*Math.sin(t*0.37+1.4));streak.scale.x=s2.scale.x=L;(glow.material as any).opacity=0.35+0.15*Math.sin(t*6)},
  set visible(v:boolean){g.visible=v}}}
