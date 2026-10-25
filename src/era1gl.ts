import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {QUALITY,clamp,hash} from './core';
import {E1} from './era1';
const LOW=QUALITY==='low';

// ---------- ERA 1 in WebGL: the lyric crawl as 1983 vector-arcade 3D (voxel words, wireframe ship, vector stars) ----------
// Rendered at the era's own 480x270 into a no-antialias canvas, composited into lo1 under the 2D HUD, then through the CRT
// pass like the 2D crawl. The camera reproduces the 2D crawl projection exactly (screen y = VPY + F/z on the plane, x scale
// F2/z), so every voxel sits on the texture pixels the simulation hit-tests: the renderer only reflects era1.ts state.
const {LW,LH,GROUND,BW,VPX,VPY,F,F2,ROWD,ZFAR,ZNEAR,TRAVEL,shatterT}=E1.K;
const FPX=270,CAMH=F/FPX,SU=F2/FPX,SPD=(ZFAR-ZNEAR)/TRAVEL; // focal length (px), eye height over the plane, world width of a texture column, crawl speed
const CELL=LOW?4:2,C0=LOW?3:1; // voxel = one 'Press Start 2P' pixel (2x2 texels from x=y=3); low tier: 2x2 font pixels
const EXT=0.34,MAXV=LOW?2600:9000,MAXD=LOW?360:1200,MAXS=LOW?1200:3200,NSTAR=LOW?90:170;
const RAIL=6.4,BARZ=9,TX=6,TZ=11; // grid pitch (world units) and the floor tiles that fall away at the shatter (2TX x TZ)
let ok=false,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera;
let vox:THREE.InstancedMesh,deb:THREE.InstancedMesh,shards:THREE.InstancedMesh,tiles:THREE.InstancedMesh,gridMats:THREE.Material[]=[],ship:THREE.Group,bolts:THREE.Mesh[]=[],glows:THREE.Mesh[]=[],stars:THREE.LineSegments,cross:THREE.Group;
// renderer-side state: per-word voxel occupancy (to see which voxels the sim just chipped) and the debris they burst into
let track:any[]=[],recs=new WeakMap<object,any>(),lastS:any=null,lastT=-1,lastShipX=0,bank=0;
const D={p:new Float32Array(MAXD*3),v:new Float32Array(MAXD*3),t0:new Float32Array(MAXD).fill(-99),n:0};
const LIFE=0.75,GRAV=34,ZDECK=F/(GROUND+9-VPY); // the deck edge (the 2D ground line): words that pass it leave the screen, as the 2D crawl clipped them
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e3=new THREE.Euler(),v3=new THREE.Vector3(),s3=new THREE.Vector3();
const lin=(hex:number)=>new THREE.Color(hex); // sRGB hex -> linear (vertex / instance colours are linear)

// unit box standing on y=0, faces coloured like a lit vector-arcade block: bright top, darker extruded front, dim sides
function voxelGeo(top:number,front:number,side:number,g:THREE.BufferGeometry=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0)){const c=new Float32Array(24*3);
 const face=[side,side,top,0x000000,front,0x000000]; // +x -x +y -y +z(towards the camera) -z
 for(let f=0;f<6;f++){const col=lin(face[f]);for(let k=0;k<4;k++){c[(f*4+k)*3]=col.r;c[(f*4+k)*3+1]=col.g;c[(f*4+k)*3+2]=col.b}}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
function instanced(geo:THREE.BufferGeometry,n:number){const m=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({vertexColors:true}),n);m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(n*3).fill(1),3);
 m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.instanceColor.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=0;scene.add(m);return m}
function lines(pos:number[],col:number[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 const mt=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});gridMats.push(mt);const l=new THREE.LineSegments(g,mt);l.frustumCulled=false;return l}

function makeShip(){const g=new THREE.Group();
 // a low Battlezone-style arrowhead: nose into the crawl, swept wings, a raised spine; footprint ~ the 2D sprite's
 const P=[[0,0.16,-0.62],[-0.62,0,0.34],[0.62,0,0.34],[0,0.46,0.22],[0,0.02,0.4],[-0.2,0.14,0.3],[0.2,0.14,0.3]];
 const T=[[0,1,3],[0,3,2],[1,4,3],[3,4,2],[0,4,1],[0,2,4]];
 const pos:number[]=[];for(const t of T)for(const i of t)pos.push(...P[i]);const hull=new THREE.BufferGeometry();hull.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.add(new THREE.Mesh(hull,new THREE.MeshBasicMaterial({color:0x06200c,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
 g.add(new THREE.LineSegments(new THREE.EdgesGeometry(hull,1),new THREE.LineBasicMaterial({color:0x5bff5b})));
 // cockpit bar and twin engine glow
 const ck=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.06,0.18),new THREE.MeshBasicMaterial({color:0xb8ffb8}));ck.position.set(0,0.3,-0.02);g.add(ck);
 for(const sx of[-0.2,0.2]){const en=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.08,0.06),new THREE.MeshBasicMaterial({color:0x7dffd0}));en.position.set(sx,0.12,0.36);g.add(en)}
 scene.add(g);return g}

function makeStars(){const pos=new Float32Array(NSTAR*6),col=new Float32Array(NSTAR*6);const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('color',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage));
 const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));l.frustumCulled=false;scene.add(l);return l}

// faint receding wireframe grid on the crawl plane: rails converging on the vanishing point, cross bars that scroll with the
// text, a brighter deck edge where the 2D ground line was, and a low vector mountain range on the horizon
function makeGrid(){const y=-CAMH-0.01,fade=(z:number,k:number)=>{const a=k*Math.pow(clamp(1-(z-8)/120,0,1),1.5);return[a*0.25,a*0.9,a*0.75]};
 const pos:number[]=[],col:number[]=[],zs=[6,20,40,70,100,130];
 for(let i=-6;i<=6;i++){const x=i*RAIL;for(let k=0;k<zs.length-1;k++){pos.push(x,y,-zs[k],x,y,-zs[k+1]);col.push(...fade(zs[k],0.2),...fade(zs[k+1],0.2))}}
 scene.add(lines(pos,col));
 const cp:number[]=[],cc:number[]=[];for(let j=0;j<15;j++){const z=6+j*BARZ;cp.push(-6*RAIL,y,-z,6*RAIL,y,-z);const c=fade(z,0.15);cc.push(...c,...c)}
 cross=new THREE.Group();cross.add(lines(cp,cc));scene.add(cross);
 scene.add(lines([-40,y+0.005,-ZDECK,40,y+0.005,-ZDECK],[0.12,0.75,0.12,0.12,0.75,0.12]));
 const mp:number[]=[],mc:number[]=[],ZM=900;let px=-1400,py=0;for(let k=0;k<=56;k++){const x=-1400+k*50,h=k===0||k===56?0:(hash(k*3.1)*0.7+hash(k*7.7)*0.5)*22;if(k){mp.push(px,py-CAMH,-ZM,x,h-CAMH,-ZM);mc.push(0.05,0.32,0.22,0.05,0.32,0.22)}px=x;py=h}
 scene.add(lines(mp,mc));gridMats.pop()} // the mountains stay when the floor goes
// a floor tile as a vector frame: four thin bars round a RAIL x BARZ cell
function tileGeo(){const b=0.022,parts=[[0,-0.5+b/2,1,b],[0,0.5-b/2,1,b],[-0.5+b/2,0,b,1],[0.5-b/2,0,b,1]].map(([x,z,w,d])=>voxelGeo(0x2fe0a8,0x48ffc0,0x1c8a68,new THREE.BoxGeometry(w,1,d).translate(x,0.5,z)));return mergeGeometries(parts)}

function init(){try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(LW,LH,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,1);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera();const n=0.05;
  // off-axis frustum: principal point at the crawl's vanishing point (VPX,VPY), focal length FPX px
  camera.projectionMatrix.makePerspective(-VPX/FPX*n,(LW-VPX)/FPX*n,VPY/FPX*n,-(LH-VPY)/FPX*n,n,2000);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  makeGrid();stars=makeStars();
  vox=instanced(voxelGeo(0xffe81f,0xa86a08,0x5e3a04),MAXV);
  deb=instanced(voxelGeo(0xfff27a,0xd08a10,0x7a4a06),MAXD);
  shards=instanced(voxelGeo(0xffe81f,0xb87410,0x6a4206),MAXS);
  tiles=instanced(tileGeo(),(2*TX)*TZ);ship=makeShip();
  const bm=new THREE.MeshBasicMaterial({color:0xfffbe0}),gm=new THREE.MeshBasicMaterial({color:0x4bd5ee,transparent:true,opacity:0.45,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),bm),g=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),gm);b.visible=g.visible=false;scene.add(b,g);bolts.push(b);glows.push(g)}
  ok=true}catch(e){console.warn('era 1 WebGL unavailable, 2D crawl',e);ok=false}}

// ---- voxel occupancy of one word: cells of CELLxCELL texels with any lit texel left ----
function rec(w:any){let r=recs.get(w);if(r)return r;const nc=Math.ceil((w.w-C0)/CELL),nr=Math.ceil((w.h-C0)/CELL),cells:number[]=[];
 for(let j=0;j<nr;j++)for(let i=0;i<nc;i++)if(cellLit(w,i,j))cells.push(i,j);
 r={w,cells:Int16Array.from(cells),on:new Uint8Array(cells.length/2).fill(1),left:w.left,dead:false,ln:null};recs.set(w,r);return r}
function cellLit(w:any,i:number,j:number){const d=w.img.data,x0=C0+i*CELL,y0=C0+j*CELL;for(let y=y0;y<Math.min(w.h,y0+CELL);y++)for(let x=x0;x<Math.min(w.w,x0+CELL);x++)if(d[(y*w.w+x)*4+3]>0)return true;return false}
function cellPos(r:any,k:number,t:number,out:THREE.Vector3){const w=r.w,ln=r.ln,i=r.cells[k*2],j=r.cells[k*2+1];
 return out.set((w.bx+C0+(i+0.5)*CELL-BW/2+ln.xo)*SU,-CAMH,-(E1.zOf(ln,t)+(ln.bh-(w.by+C0+(j+0.5)*CELL))*ROWD))}
// a chipped voxel bursts into a little cube that hops off the plane (deterministic per voxel), riding the crawl's motion
function burst(r:any,k:number,t:number,keep:number){if(hash(k*7.31+r.cells.length)>keep)return;cellPos(r,k,t,v3);const i=D.n++%MAXD,h1=hash(k*1.7+t),h2=hash(k*3.3+t*1.3),h3=hash(k*5.1+t*0.7);
 D.p[i*3]=v3.x;D.p[i*3+1]=v3.y+EXT;D.p[i*3+2]=v3.z;D.v[i*3]=(h1-0.5)*7;D.v[i*3+1]=5+h2*9;D.v[i*3+2]=SPD*0.85+(h3-0.5)*6;D.t0[i]=t}
function syncWords(S:any,t:number){
 for(const r of track){const w=r.w;if(r.dead)continue;
  if(w.dead){r.dead=true;const n=r.on.reduce((a:number,b:number)=>a+b,0),keep=Math.min(1,90/Math.max(1,n));for(let k=0;k<r.on.length;k++)if(r.on[k]){r.on[k]=0;burst(r,k,t,keep)}}
  else if(w.left!==r.left){r.left=w.left;for(let k=0;k<r.on.length;k++)if(r.on[k]&&!cellLit(w,r.cells[k*2],r.cells[k*2+1])){r.on[k]=0;burst(r,k,t,1)}}}
 track=[];for(const ln of S.lines)for(const w of ln.words){const r=rec(w);r.ln=ln;track.push(r)}}

function setM(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number){const e=mesh.instanceMatrix.array as Float32Array,o=i*16;
 e[o]=sx;e[o+1]=0;e[o+2]=0;e[o+3]=0;e[o+4]=0;e[o+5]=sy;e[o+6]=0;e[o+7]=0;e[o+8]=0;e[o+9]=0;e[o+10]=sz;e[o+11]=0;e[o+12]=x;e[o+13]=y;e[o+14]=z;e[o+15]=1}
function setC(mesh:THREE.InstancedMesh,i:number,r:number,g:number,b:number){const c=mesh.instanceColor!.array as Float32Array;c[i*3]=r;c[i*3+1]=g;c[i*3+2]=b}
function commit(mesh:THREE.InstancedMesh,n:number){mesh.count=n;for(const a of[mesh.instanceMatrix,mesh.instanceColor!]){a.clearUpdateRanges();a.addUpdateRange(0,n*a.itemSize);a.needsUpdate=true}}

function render(t:number){const S=E1.S;if(!S)return;
 if(S!==lastS||t<lastT-1e-3){track=[];recs=new WeakMap();D.t0.fill(-99);lastS=S;lastShipX=S.ship.x}
 const dt=clamp(t-lastT,0,0.1);lastT=t;
 // camera: the crawl's eye, drifting a pixel or two (slow, deterministic in t)
 camera.position.set(0.11*Math.sin(t*0.37),0.05*Math.sin(t*0.29+1),0);camera.rotation.set(0.0012*Math.sin(t*0.23),0.0025*Math.sin(t*0.19+2),0.0015*Math.sin(t*0.31));camera.updateMatrixWorld();
 cross.position.z=(t*SPD)%BARZ;
 // the shatter takes the floor with it: grid lines go out, tiles of floor drop into the void in a wave from the cannon
 {const s=t-shatterT,g=s<0?1:clamp(1-s/0.35,0,1);for(const m of gridMats){m.opacity=g;m.visible=g>0}}
 // vector starfield streaming out of the vanishing point
 {const pa=stars.geometry.attributes.position.array as Float32Array,ca=stars.geometry.attributes.color.array as Float32Array;
  for(let i=0;i<NSTAR;i++){const x=(hash(i*1.31)-0.5)*300,y=(hash(i*2.17)-0.75)*240,z=3+((hash(i*3.7)*400-t*(26+hash(i*5.3)*22))%400+400)%400,len=0.4+(400-z)*0.006;
   const b=Math.min(1,(400-z)/200)*(0.25+0.6*hash(i*9.1))*(y<-CAMH?0.55:1);pa.set([x,y,-z,x,y,-(z+len)],i*6);const cool=hash(i*4.4)>0.7;ca.set([b*(cool?0.6:0.9),b*(cool?0.85:0.9),b,0,0,0],i*6)}
  stars.geometry.attributes.position.needsUpdate=true;stars.geometry.attributes.color.needsUpdate=true}
 // voxel words
 syncWords(S,t);let n=0;const pulse=1+S.pulse*0.18;
 for(const r of track){if(r.dead)continue;const a=E1.alphaOf(r.ln,t)*pulse;if(a<=0)continue;
  for(let k=0;k<r.on.length&&n<MAXV;k++){if(!r.on[k])continue;cellPos(r,k,t,v3);if(-v3.z<ZDECK)continue;setM(vox,n,v3.x,v3.y,v3.z,CELL*SU*0.9,EXT,CELL*ROWD*0.94);setC(vox,n,a,a,a);n++}}
 commit(vox,n);
 // chip debris
 let nd=0;for(let i=0;i<MAXD;i++){const s=t-D.t0[i];if(s<0||s>LIFE)continue;const y=Math.max(-CAMH,D.p[i*3+1]+D.v[i*3+1]*s-0.5*GRAV*s*s),sz=0.2*(1-s/LIFE)+0.04,f=1-s/LIFE;
  e3.set(s*9+i,s*7,0);q.setFromEuler(e3);m4.compose(v3.set(D.p[i*3]+D.v[i*3]*s,y,D.p[i*3+2]+D.v[i*3+2]*s),q,s3.set(sz,sz,sz));m4.toArray(deb.instanceMatrix.array,nd*16);setC(deb,nd,f+0.3,f+0.2,f);nd++}
 commit(deb,nd);
 // the bar-17 shatter: every sim debris piece (era1.ts shatter()) hops off the plane, tumbles, and lands where the sim lands it
 let ns=0;if(S.debris){const s=t-shatterT,step=Math.max(1,Math.ceil(S.debris.length/MAXS));
  for(let i=0;i<S.debris.length&&ns<MAXS;i+=step){const d=S.debris[i];if(d.z0===undefined)continue;const dy=d.land-d.y0,T=dy<=0?0:(-d.vy0+Math.sqrt(d.vy0*d.vy0+440*dy))/220;
   const landed=d.y>=d.land||T===0,p=landed?1:clamp(s/T,0,0.999),Zl=F/(Math.max(d.land,d.y0)-VPY),xl=landed?d.x:d.x0+d.vx0*T;
   const X0=(d.x0-VPX)*d.z0/FPX,Xl=(xl-VPX)*Zl/FPX,Z=d.z0+(Zl-d.z0)*p,hp=(1.2+hash(i*1.9)*4)*Math.min(1,d.z0/30),y=-CAMH+hp*4*p*(1-p),spin=(hash(i*2.9)-0.5)*14,ang=spin*Math.min(s,T);
   e3.set(ang,ang*0.7,ang*0.3);q.setFromEuler(e3);const sz=0.34;m4.compose(v3.set(X0+(Xl-X0)*p,y,-Z),q,s3.set(sz,sz,sz));m4.toArray(shards.instanceMatrix.array,ns*16);const g=landed?0.75:1;setC(shards,ns,g,g,g);ns++}}
 commit(shards,ns);
 {let nt=0;const s=t-shatterT;if(s>=0){const ph=(shatterT*SPD)%BARZ,Zs=F/(S.ship.y+4-VPY),xs=(S.ship.x+9-VPX)*Zs/FPX;
  for(let j=0;j<TZ;j++)for(let i=-TX;i<TX;i++){const k=j*2*TX+i+TX,X=(i+0.5)*RAIL,Z=6+(j+0.5)*BARZ+ph-s*SPD*0.5;if(Z<2)continue;const s0=Math.hypot(X-xs,Z-Zs)*0.007+hash(k*1.3)*0.1,u=Math.max(0,s-s0);
   const a=Math.pow(clamp(1-(Z-8)/120,0,1),1.5)*clamp(1-u/1.1,0,1)*(u>0?1:0.6);if(a<=0.01)continue;const spin=(hash(k*2.1)-0.5)*3;
   e3.set(u*spin,0,u*spin*0.6);q.setFromEuler(e3);m4.compose(v3.set(X,-CAMH-0.02-0.5*40*u*u,-Z),q,s3.set(RAIL*0.96,0.05,BARZ*0.96));m4.toArray(tiles.instanceMatrix.array,nt*16);setC(tiles,nt,a*0.42,a*0.42,a*0.42);nt++}}
  commit(tiles,nt)}
 // the cannon: on the plane at the depth of the 2D sprite's rows, centred on its column
 const sh=S.ship,vis=!sh.dead&&!(sh.inv>0&&Math.floor(t*20)%2);ship.visible=vis;
 {const Zs=F/(sh.y+4-VPY),vx=dt>0?(sh.x-lastShipX)/dt:0;lastShipX=sh.x;bank+=(clamp(-vx*0.0018,-0.4,0.4)-bank)*Math.min(1,dt*10);
  ship.position.set((sh.x+9-VPX)*Zs/FPX,-CAMH,-Zs);ship.rotation.set(0,0,bank)}
 // glowing bolts: the 2D shot spans screen rows y..y+8 at column x; that span projected on the plane, raised a little
 for(let i=0;i<3;i++){const b=S.bul[i],bm=bolts[i],gm=glows[i];if(!b||b.hit||b.y+8<=VPY+3){bm.visible=gm.visible=false;continue}
  const y0=Math.max(VPY+2,b.y),y1=b.y+8,za=F/(y0-VPY),zb=F/(y1-VPY),xa=(b.x-VPX)*za/FPX,xb=(b.x-VPX)*zb/FPX,zm=(za+zb)/2,len=Math.hypot(xa-xb,za-zb)+0.05;
  for(const [m,wpx] of [[bm,1.4],[gm,4]] as [THREE.Mesh,number][]){m.visible=true;m.position.set((xa+xb)/2,-CAMH+0.18,-zm);m.lookAt(xa,-CAMH+0.18,-za);m.scale.set(wpx*zm/FPX,wpx*zm/FPX,len)}}
 renderer.render(scene,camera)}

// render the 3D crawl and composite it into the era's low-res canvas with the 2D overlays (title line, death burst, HUD)
function draw(x:CanvasRenderingContext2D,t:number){render(t);x.drawImage(renderer.domElement,0,0,LW,LH);const S=E1.S;
 x.save();x.globalCompositeOperation='lighter';const vg=x.createRadialGradient(VPX,VPY,0,VPX,VPY,60+S.pulse*20);vg.addColorStop(0,`rgba(255,232,31,${0.14+S.pulse*0.16})`);vg.addColorStop(1,'rgba(255,232,31,0)');x.fillStyle=vg;x.fillRect(VPX-100,VPY-100,200,200);x.restore();
 E1.pops(x,true);E1.title(x,t);E1.hud(x)}

export const E1GL={init,get ok(){return ok},draw,stats:()=>({voxels:vox?vox.count:0,debris:deb?deb.count:0,shards:shards?shards.count:0,calls:renderer?renderer.info.render.calls:0,tris:renderer?renderer.info.render.triangles:0})};
(window as any).E1GL=E1GL; // debug/test hook: instance counts and draw calls (tools, harness)
