import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {W,H,dpr,QUALITY,MOBILE,BEAT,clamp,lerp,smooth,hash} from './core';
const LOW=QUALITY==='low';

// ---------- START SCREEN: the title screen of the game, in the finale's voxel / synthwave / vector language ----------
// Shown on load and after RESTART with the song clock held at 0. Layers: a 2D synthwave sky and sun, a WebGL layer
// (scrolling vector grid + the voxel NEXT LEVEL, assembling then idling with a sway and a light shimmer), and a 2D type
// layer (name, thesis, the five chapters, how to play, PRESS START). After the first input the same scene plays the bars
// 0-2 flourish as a pure function of the song clock: the type clears, the sky fades out over the live arcade crawl, and
// every voxel of the title streams into the crawl's vanishing point, turning arcade yellow, ending in a flash there.
const HY=Math.round(H*0.36),FOV=36,FPX=(H/2)/Math.tan(FOV*Math.PI/360),EYE=1.6,D=24; // horizon row, focal length (px), eye height, title depth
const TY=82,TWPX=W*0.6;                                     // title centre row and width on screen
const VP={x:480,y:60};                                       // era 1 crawl vanishing point (E1.K VPX,VPY in 480x270, doubled)
const GLYPH:Record<string,string[]>={N:['X...X','XX..X','XX..X','X.X.X','X..XX','X..XX','X...X'],E:['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],X:['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],
 T:['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],L:['X....','X....','X....','X....','X....','X....','XXXXX'],V:['X...X','X...X','X...X','X...X','.X.X.','.X.X.','..X..']};
const GRAD=[[0.75,0.98,1],[0.30,0.94,1],[1,0.36,0.88],[0.69,0.49,1]];
const gradAt=(u:number)=>{const f=clamp(u,0,1)*(GRAD.length-1),i=Math.min(GRAD.length-2,Math.floor(f)),k=f-i;return GRAD[i].map((a,j)=>a+(GRAD[i+1][j]-a)*k)};
let ok=false,tried=false,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,vox:THREE.InstancedMesh,grid:THREE.Group,cross:THREE.Group,gridMats:THREE.LineBasicMaterial[]=[];
let vt:any[]=[],TP=0.3;const uFlash={value:0};
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e3=new THREE.Euler(),p3=new THREE.Vector3(),s3=new THREE.Vector3(),c3=new THREE.Vector3(),gq=new THREE.Quaternion(),TC=new THREE.Vector3(),VPW=new THREE.Vector3();
const world=(sx:number,sy:number,d:number,o:THREE.Vector3)=>o.set((sx-W/2)*d/FPX,(HY-sy)*d/FPX,-d);

function lines(pos:number[],col:number[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 const m=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});gridMats.push(m);const l=new THREE.LineSegments(g,m);l.frustumCulled=false;return l}
function init(){tried=true;try{renderer=new THREE.WebGLRenderer({antialias:!LOW,alpha:true,premultipliedAlpha:false,powerPreference:'low-power'});renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.setClearColor(0x000000,0); // every colour below is a display value, written as is
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera();const n=0.1;
  camera.projectionMatrix.makePerspective(-W/2/FPX*n,W/2/FPX*n,HY/FPX*n,-(H-HY)/FPX*n,n,600);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  // vector floor: rails into the horizon, cross bars that scroll, fading with distance
  const y=-EYE,fade=(z:number,k:number)=>{const a=k*Math.pow(clamp(1-z/260,0,1),1.6);return[a,a*0.3,a*0.85]};grid=new THREE.Group();
  {const p:number[]=[],c:number[]=[],zs=[1,10,25,50,90,140,200,260];for(let i=-24;i<=24;i++){const x=i*3;for(let k=0;k<zs.length-1;k++){p.push(x,y,-zs[k],x,y,-zs[k+1]);c.push(...fade(zs[k],0.9),...fade(zs[k+1],0.9))}}grid.add(lines(p,c))}
  {const p:number[]=[],c:number[]=[];for(let j=0;j<70;j++){const z=1+j*3.6;p.push(-80,y,-z,80,y,-z);const f=fade(z,0.75);c.push(...f,...f)}cross=new THREE.Group();cross.add(lines(p,c));grid.add(cross)}
  {const f=[1,0.45,0.9];grid.add(lines([-400,y,-260,400,y,-260],[...f,...f]))}
  scene.add(grid);
  // voxel title: one block per font pixel (two layers on the high tier), same 5x7 face as the finale's card
  const txt='NEXT LEVEL',px:number[][]=[];let cx=0;for(const ch of txt){if(ch===' '){cx+=3;continue}const g=GLYPH[ch];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(g[r][c]==='X')px.push([cx+c,r]);cx+=6}const TW=cx-1;
  TP=TWPX*D/FPX/TW;world(W/2,TY,D,TC);world(VP.x,VP.y,160,VPW);
  const layers=LOW?1:2;vt=[];for(let d=0;d<layers;d++)for(const [x,y2] of px){const k=vt.length;vt.push({lx:(x+0.5-TW/2)*TP,ly:(3-y2)*TP,lz:-d*TP*1.5,ux:(x+0.5)/TW,uy:(y2+0.5)/7,back:d>0,h1:hash(k*1.37+0.5),h2:hash(k*2.71+1.1),h3:hash(k*3.97+2.3),h4:hash(k*5.33+3.7),col:gradAt((y2+0.5)/7)})}
  const mat=new THREE.ShaderMaterial({uniforms:{uFlash},vertexShader:`varying vec3 vLoc;varying vec3 vN;varying vec3 vCol;
void main(){vLoc=position;vN=normal;vCol=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform float uFlash;varying vec3 vLoc;varying vec3 vN;varying vec3 vCol;
void main(){vec3 a=abs(vLoc)*2.0;float mx=max(a.x,max(a.y,a.z)),mn=min(a.x,min(a.y,a.z)),md=a.x+a.y+a.z-mx-mn;float ed=smoothstep(0.7,0.93,md);
 float sh=0.5+0.5*max(vN.z,0.0)+0.35*max(vN.y,0.0)-0.25*max(-vN.y,0.0);
 vec3 c=mix(vCol*(0.38+0.42*sh)+0.05,vCol*1.15+0.3,ed)+vec3(uFlash);gl_FragColor=vec4(min(c,vec3(1.0)),1.0);}`});
  vox=new THREE.InstancedMesh(new RoundedBoxGeometry(1,1,1,LOW?1:2,0.12),mat,vt.length);vox.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(vt.length*3).fill(1),3);
  vox.instanceMatrix.setUsage(THREE.DynamicDrawUsage);vox.instanceColor.setUsage(THREE.DynamicDrawUsage);vox.frustumCulled=false;scene.add(vox);
  ok=true}catch(e){console.warn('start screen WebGL unavailable, 2D title',e);ok=false}}

// ---- 2D: synthwave sky, sun and skyline (above the horizon), dark floor below ----
let skyCv:HTMLCanvasElement|null=null;
function sky(x:CanvasRenderingContext2D,a:number,it:number){if(a<=0)return;
 if(!skyCv){skyCv=document.createElement('canvas');skyCv.width=W*dpr;skyCv.height=H*dpr;const c=skyCv.getContext('2d')!;c.scale(dpr,dpr);
  let g=c.createLinearGradient(0,0,0,HY);g.addColorStop(0,'#04020d');g.addColorStop(0.55,'#1a0636');g.addColorStop(0.88,'#4a0e5e');g.addColorStop(1,'#a3247a');c.fillStyle=g;c.fillRect(0,0,W,HY);
  for(let i=0;i<120;i++){const sx=hash(i*1.7)*W,sy=hash(i*2.3)*HY*0.85,b=0.25+0.75*hash(i*3.1);c.fillStyle=`rgba(255,255,255,${b*0.8})`;c.fillRect(sx,sy,hash(i*4.7)>0.85?2:1,1)}
  // sun: yellow to pink with the classic slatted lower half
  const R=118;c.save();c.beginPath();c.rect(0,0,W,HY);c.clip();g=c.createLinearGradient(0,HY-R,0,HY);g.addColorStop(0,'#ffe46b');g.addColorStop(0.5,'#ff9a5a');g.addColorStop(1,'#ff3f9a');c.fillStyle=g;c.beginPath();c.arc(W/2,HY,R,0,Math.PI*2);c.fill();
  c.globalCompositeOperation='destination-out';for(let k=0;k<7;k++){const yy=HY-R*0.52+k*k*1.6+k*6,hh=1.5+k*1.1;c.fillRect(W/2-R,yy,R*2,hh)}c.globalCompositeOperation='source-over';
  g=c.createRadialGradient(W/2,HY,R*0.8,W/2,HY,R*2.2);g.addColorStop(0,'rgba(255,80,170,.32)');g.addColorStop(1,'rgba(255,80,170,0)');c.fillStyle=g;c.fillRect(0,0,W,HY);
  // skyline silhouette with a few lit windows
  let sx=0;while(sx<W){const bw=18+hash(sx*0.37)*44,bh=(10+hash(sx*0.91)*46)*(Math.abs(sx-W/2)<150?0.45:1);c.fillStyle='#0b0418';c.fillRect(sx,HY-bh,bw-3,bh);
   for(let wy=HY-bh+5;wy<HY-4;wy+=6)for(let wx=sx+3;wx<sx+bw-6;wx+=5)if(hash(wx*1.3+wy*7.1)>0.8){c.fillStyle=hash(wx+wy)>0.5?'rgba(255,214,120,.55)':'rgba(120,230,255,.45)';c.fillRect(wx,wy,2,2)}sx+=bw}c.restore();
  g=c.createLinearGradient(0,HY,0,H);g.addColorStop(0,'#16052a');g.addColorStop(0.3,'#08031a');g.addColorStop(1,'#030108');c.fillStyle=g;c.fillRect(0,HY,W,H-HY);
  c.fillStyle='rgba(255,120,210,.85)';c.fillRect(0,HY,W,1)}
 x.save();x.globalAlpha=a;x.drawImage(skyCv,0,0,W,H);
 // twinkle a few stars on the idle clock
 for(let i=0;i<14;i++){const tw=0.5+0.5*Math.sin(it*(1.3+hash(i*9.1))+i*2.1);x.fillStyle=`rgba(200,240,255,${0.8*tw*a})`;x.fillRect(hash(i*5.9)*W,hash(i*6.7)*HY*0.7,2,2)}x.restore()}

// ---- 2D voxel type: the name plate (shared with the finale card) ----
// Press Start 2P drawn as a lit block: a stepped violet extrusion below, a white face cut into one tile per font pixel,
// and a cyan glow. Cached per text/size/scale; drawn with an optional light sweep.
const plates=new Map<string,any>();let work:HTMLCanvasElement|null=null;
export function plate(txt:string,size:number,face:[string,string,string]=['#ffffff','#eafcff','#ffc4ef'],glow='rgba(77,240,255,.85)'){const sc=dpr,key=txt+'|'+size+'|'+sc+'|'+face.join()+glow;let p=plates.get(key);if(p)return p;
 const font=`${size}px 'Press Start 2P',monospace`,mc=document.createElement('canvas').getContext('2d')!;mc.font=font;const m=mc.measureText(txt),u=size/8,dep=Math.max(3,Math.round(u*1.5)),pad=Math.ceil(size*0.6);
 const asc=m.actualBoundingBoxAscent||size*0.875,tw=Math.ceil(m.width),w=tw+pad*2,h=Math.ceil(asc)+dep+pad*2,x0=pad,y0=pad+asc;
 const mk=()=>{const c=document.createElement('canvas');c.width=Math.ceil(w*sc);c.height=Math.ceil(h*sc);const x=c.getContext('2d')!;x.scale(sc,sc);x.font=font;x.textBaseline='alphabetic';x.textAlign='left';return{c,x}};
 const A=mk(),F=mk();
 // face with tile seams on its own layer, so the seams never touch the glow or the extrusion
 {const g=F.x.createLinearGradient(0,y0-asc,0,y0);g.addColorStop(0,face[0]);g.addColorStop(0.55,face[1]);g.addColorStop(1,face[2]);F.x.fillStyle=g;F.x.fillText(txt,x0,y0);
  F.x.globalCompositeOperation='source-atop';F.x.fillStyle='rgba(60,20,110,.38)';const lw=Math.max(1/sc,u*0.14);for(let k=0;k<=tw/u+1;k++)F.x.fillRect(x0+k*u-lw/2,0,lw,h);for(let k=0;k<=8;k++)F.x.fillRect(0,y0-asc+k*u-lw/2,w,lw);
  F.x.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<=8;k++)F.x.fillRect(0,y0-asc+k*u+lw/2,w,lw*0.7)}
 for(let i=dep;i>=1;i--){const f=1-i/dep;A.x.fillStyle=`rgb(${Math.round(26+f*120)},${Math.round(6+f*24)},${Math.round(48+f*110)})`;A.x.fillText(txt,x0+i*0.35,y0+i)}
 A.x.save();A.x.shadowColor=glow;A.x.shadowBlur=size*0.55;A.x.fillStyle='#fff';A.x.fillText(txt,x0,y0);A.x.restore();
 A.x.setTransform(1,0,0,1,0,0);A.x.drawImage(F.c,0,0);
 p={c:A.c,w,h,cx:x0+tw/2,cy:y0-asc/2,tw};plates.set(key,p);return p}
// draw a plate centred on (cx,cy) (the text's own centre); sweep in 0..1 runs a light band across the glyphs
export function drawPlate(x:CanvasRenderingContext2D,p:any,cx:number,cy:number,o:{a?:number,sx?:number,sy?:number,sweep?:number}={}){const a=o.a??1,sx=o.sx??1,sy=o.sy??1;if(a<=0)return;let img:HTMLCanvasElement=p.c;
 if(o.sweep!==undefined&&o.sweep>0&&o.sweep<1.2){if(!work)work=document.createElement('canvas');if(work.width!==p.c.width||work.height!==p.c.height){work.width=p.c.width;work.height=p.c.height}const wx=work.getContext('2d')!;wx.setTransform(1,0,0,1,0,0);wx.globalCompositeOperation='source-over';wx.clearRect(0,0,work.width,work.height);wx.drawImage(p.c,0,0);
  const k=p.c.width/p.w,bx=lerp(-60,p.w+60,o.sweep)*k;wx.globalCompositeOperation='source-atop';const g=wx.createLinearGradient(bx-46*k,0,bx+46*k,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.5,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');wx.fillStyle=g;wx.fillRect(0,0,work.width,work.height);img=work}
 x.save();x.globalAlpha=a;x.translate(cx,cy);x.scale(sx,sy);x.drawImage(img,-p.cx,-p.cy,p.w,p.h);x.restore()}

// ---- type helpers ----
const PF=(s:number)=>`${s}px 'Press Start 2P',monospace`;
function fit(x:CanvasRenderingContext2D,txt:string,size:number,maxW:number){x.font=PF(size);const w=x.measureText(txt).width;if(w>maxW){size=Math.max(6,Math.floor(size*maxW/w));x.font=PF(size)}return size}
function text(x:CanvasRenderingContext2D,txt:string,cx:number,cy:number,size:number,col:string,maxW=W-40,shadow=true){fit(x,txt,size,maxW);x.textAlign='center';x.textBaseline='middle';if(shadow){x.fillStyle='rgba(0,0,0,.85)';x.fillText(txt,cx+1,cy+1)}x.fillStyle=col;x.fillText(txt,cx,cy)}
const CH=[['ARCADE','FIRST PROMPTS','#5bff5b'],['32-BIT','LEARNING TO ASK','#ff6b5b'],['3D CONSOLE','DIRECTING AGENTS','#4df0ff'],['MOBILE','WORKING FROM ANYWHERE','#ffe14d'],['VR','FULL DEVELOPMENT','#ff5be0']];
const NAMEY=MOBILE?160:166; // IAN GINN plate centre row
const TOUCH=MOBILE||matchMedia('(pointer: coarse)').matches;

// the type layer of the start screen; a (0..1) fades it, it = idle clock (s) for the pulse
function type(x:CanvasRenderingContext2D,a:number,it:number,nameA:number){if(a<=0&&nameA<=0)return;const k=MOBILE?1.22:1;x.save();
 // dark bed under the type block so it reads over the grid
 if(a>0){x.globalAlpha=a;const g=x.createLinearGradient(0,HY-30,0,H);g.addColorStop(0,'rgba(3,1,10,0)');g.addColorStop(0.12,'rgba(3,1,10,.62)');g.addColorStop(1,'rgba(3,1,10,.78)');x.fillStyle=g;x.fillRect(0,HY-30,W,H-HY+30)}
 x.globalAlpha=1;
 const pl=plate('IAN GINN',MOBILE?40:36);drawPlate(x,pl,W/2,NAMEY,{a:nameA,sweep:((it%5)-0.6)/1.1});
 if(a<=0){x.restore();return}x.globalAlpha=a;
 text(x,"FOR THE DEPUTY'S MAXIMALISTS",W/2,MOBILE?214:204,Math.round(12*k),'#5bff5b');
 text(x,'I leveled up the way gaming did.',W/2,238,Math.round(11*k),'#ffffff');
 text(x,'Just a lot faster.',W/2,261,Math.round(11*k),'#ffe14d');
 // five chapters: one row of cartridges, the analogy at a glance (kept deliberately sparse: title, name, tagline, stages, start)
 const top=MOBILE?298:296,cw=176,gap=8,x0=W/2-(cw*5+gap*4)/2,chH=MOBILE?72:62;
 for(let i=0;i<5;i++){const bx=x0+i*(cw+gap),by=top,[yr,tt,col]=CH[i];x.fillStyle='rgba(10,6,28,.85)';x.fillRect(bx,by,cw,chH);x.fillStyle=col;x.fillRect(bx,by,cw,3);x.globalAlpha=a*0.35;x.fillRect(bx,by+chH-1,cw,1);x.globalAlpha=a;
  text(x,yr,bx+cw/2,by+(MOBILE?22:20),Math.round(13*k),col,cw-12);{// phones: every subtitle on two balanced lines at a readable size; desktop: one line
  if(MOBILE){const ws=tt.split(' ');let best=1,bw=1e9;for(let h=1;h<ws.length;h++){const m=Math.max(ws.slice(0,h).join(' ').length,ws.slice(h).join(' ').length);if(m<bw){bw=m;best=h}}const sz=Math.round(10*k);text(x,ws.slice(0,best).join(' '),bx+cw/2,by+44,sz,'#eef0ff',cw-10);text(x,ws.slice(best).join(' '),bx+cw/2,by+59,sz,'#eef0ff',cw-10)}else text(x,tt,bx+cw/2,by+44,Math.round(9*k),'#eef0ff',cw-12)}}
 // desktop only: one quiet line of keys (phones learn the side pads once the song starts)
 if(!TOUCH)text(x,'TAKE OVER ANY TIME  ·  WASD / ARROWS  ·  SPACE  ·  MOUSE AIMS THE SABER',W/2,top+chH+34,8,'#8a86a8',W-60,false);
 // PRESS START, pulsing on the beat
 {const ph=(it/BEAT)%1,pulse=0.5+0.5*Math.cos(ph*Math.PI*2),label=TOUCH?'TAP TO START':'PRESS START',cy=H-42;x.font=PF(Math.round(14*k));const pw=x.measureText(label).width,bw=pw+86,bh=Math.round(30*k);
  x.fillStyle='rgba(6,4,16,.85)';x.fillRect(W/2-bw/2,cy-bh/2,bw,bh);x.fillStyle=`rgba(255,225,77,${0.35+0.65*pulse})`;x.fillRect(W/2-bw/2,cy-bh/2,bw,2);x.fillRect(W/2-bw/2,cy+bh/2-2,bw,2);
  x.save();x.shadowColor='#ffe14d';x.shadowBlur=6+10*pulse;x.textAlign='center';x.textBaseline='middle';x.fillStyle=`rgba(255,232,120,${0.75+0.25*pulse})`;x.fillText(label,W/2,cy+1);x.restore();
  const ax=bw/2-18,s=6+pulse*1.5;x.fillStyle=`rgba(255,232,120,${0.75+0.25*pulse})`;x.beginPath();x.moveTo(W/2-ax-s,cy-s);x.lineTo(W/2-ax+s*0.6,cy);x.lineTo(W/2-ax-s,cy+s);x.closePath();x.moveTo(W/2+ax+s,cy-s);x.lineTo(W/2+ax-s*0.6,cy);x.lineTo(W/2+ax+s,cy+s);x.closePath();x.fill();
  }
 x.restore()}

// voxel title layout at idle clock it (assembly over the first ~1.6 s, then sway and shimmer); fl = flourish time (s) or -1
function voxels(it:number,fl:number,sway0:number){let n=0;const asm=it,sw=fl<0?Math.sin(it*0.55)*0.16:sway0*Math.exp(-fl*5),tilt=fl<0?Math.sin(it*0.4+1)*0.05:0;
 e3.set(tilt,sw,0);gq.setFromEuler(e3);const shim=((it*0.42)%1)*1.8-0.4;
 for(const v of vt){p3.set(v.lx,v.ly,v.lz).applyQuaternion(gq).add(TC);let s=TP*0.9,r=v.col[0],g=v.col[1],b=v.col[2],br=1;
  if(fl<0){// assembly: in from scattered points behind the title, left to right
   const t0=0.15+v.ux*0.7+v.h1*0.2,u=clamp((asm-t0)/0.7,0,1),e=1-Math.pow(1-u,3);if(u<=0){s=0}else if(u<1){c3.set((v.h2-0.5)*40,(v.h3-0.3)*18,-40-v.h4*60).add(TC);p3.lerp(c3,1-e);s*=e;br=1+2*(1-u)}
   else{const land=asm-(t0+0.7);if(land<0.3)br+=2*(1-land/0.3);const w=shim-v.ux;br+=0.9*Math.exp(-w*w/0.004);p3.z+=Math.sin(it*2+v.h1*6)*0.02}
   q.setFromEuler(e3)}
  else{// flourish: launch left to right, arc up and towards the lens, then stream into the vanishing point and shrink to a dot
   const tL=0.3+v.ux*0.9+v.h1*0.3,dur=1.1+v.h2*0.4,u=clamp((fl-tL)/dur,0,1);
   if(u>0){const e=u*u*(3-2*u),a1=1-e;c3.copy(p3).add(VPW).multiplyScalar(0.5);c3.y+=0.3+v.h3*1.6;c3.z+=5+v.h4*5;c3.x+=(v.h1-0.5)*8;
    p3.multiplyScalar(a1*a1).addScaledVector(c3,2*a1*e).addScaledVector(VPW,e*e);s=TP*0.9*lerp(1,0.5,e);const y=[1,0.91,0.12];r=lerp(r,y[0],e);g=lerp(g,y[1],e);b=lerp(b,y[2],e);br=1+1.5*Math.sin(u*Math.PI);
    if(u>=1)s=0}
   e3.set(u*(v.h1-0.5)*9,u*(v.h2-0.5)*9,u*(v.h3-0.5)*9);q.setFromEuler(e3)}
  if(v.back)br*=0.3;
  m4.compose(p3,q,s3.set(s||1e-4,s||1e-4,(s||1e-4)*1.5));m4.toArray(vox.instanceMatrix.array,n*16);const c=vox.instanceColor!.array as Float32Array;c[n*3]=Math.min(1.6,r*br);c[n*3+1]=Math.min(1.6,g*br);c[n*3+2]=Math.min(1.6,b*br);n++}
 vox.count=n;vox.instanceMatrix.needsUpdate=true;vox.instanceColor!.needsUpdate=true}

// composite the GL layer, plus a soft additive bloom of it on the high tier
function blitGL(x:CanvasRenderingContext2D,a=1){x.drawImage(renderer.domElement,0,0,W,H);if(LOW||a<=0)return;x.save();x.globalCompositeOperation='lighter';x.globalAlpha=0.55*a;x.filter='blur(7px)';x.drawImage(renderer.domElement,0,0,W,H);x.restore()}
function glow(x:CanvasRenderingContext2D,a:number){if(a<=0)return;x.save();x.globalCompositeOperation='lighter';x.globalAlpha=a;const g=x.createRadialGradient(W/2,TY,10,W/2,TY,W*0.36);g.addColorStop(0,'rgba(120,60,200,.45)');g.addColorStop(0.5,'rgba(255,60,170,.12)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.save();x.translate(W/2,TY);x.scale(1,0.42);x.translate(-W/2,-TY);x.fillRect(0,TY-W*0.36,W,W*0.72);x.restore();x.restore()}

// 2D fallback title (no WebGL): flat pixel title over the same sky
function flatTitle(x:CanvasRenderingContext2D,a:number,s:number){if(a<=0)return;const p=plate('NEXT LEVEL',56,['#c0fbff','#4df0ff','#ff5be0'],'rgba(255,91,224,.8)');drawPlate(x,p,lerp(W/2,VP.x,1-s),lerp(TY,VP.y,1-s),{a,sx:s,sy:s})}

// the start screen at idle clock it (s)
function drawStart(x:CanvasRenderingContext2D,it:number){if(!tried)init();x.save();x.setTransform(dpr,0,0,dpr,0,0);sky(x,1,it);glow(x,1);
 if(ok){cross.position.z=(it*3)%3.6;for(const m of gridMats)m.opacity=1;voxels(it,-1,0);uFlash.value=0;renderer.render(scene,camera);blitGL(x)}else flatTitle(x,clamp(it/0.6,0,1),1);
 type(x,clamp(it/0.5,0,1),it,clamp((it-0.5)/0.4,0,1));x.restore()}
// the bars 0-2 flourish at song time t (s) over the live arcade frame; sway0 = the title's sway when the player pressed start
const FL_END=3.55;
function drawFlourish(x:CanvasRenderingContext2D,t:number,sway0=0){if(t<0||t>=FL_END)return;if(!tried)init();x.save();x.setTransform(dpr,0,0,dpr,0,0);
 const bg=1-smooth((t-0.3)/1.6),ta=1-smooth(t/0.3),na=1-smooth((t-1.15)/0.5);
 sky(x,bg,0);glow(x,bg);
 if(ok){cross.position.z=(t*(3+t*30))%3.6;for(const m of gridMats)m.opacity=bg;voxels(9,t,sway0);uFlash.value=0;renderer.render(scene,camera);blitGL(x)}else flatTitle(x,1-smooth((t-0.9)/1.0),1-smooth(t/2));
 // the type block clears first; the name holds a beat longer, lifts and dissolves into scanlines
 if(ta>0)type(x,ta,9,0);
 if(na>0){const p=plate('IAN GINN',MOBILE?40:36),up=smooth((t-1.15)/0.5);drawPlate(x,p,W/2,NAMEY-up*14,{a:na,sx:1+up*0.25,sy:1-up*0.6})}
 // flash where the title went in: the crawl starts from that point
 {const f=clamp(1-Math.abs(t-2.9)/0.6,0,1);if(f>0){x.globalCompositeOperation='lighter';const g=x.createRadialGradient(VP.x,VP.y,0,VP.x,VP.y,140);g.addColorStop(0,`rgba(255,240,140,${0.9*f})`);g.addColorStop(0.3,`rgba(255,200,40,${0.35*f})`);g.addColorStop(1,'rgba(255,200,40,0)');x.fillStyle=g;x.fillRect(VP.x-140,VP.y-140,280,280);x.fillStyle=`rgba(255,250,200,${f})`;x.fillRect(VP.x-60*f,VP.y,120*f,1)}}
 x.restore()}
const swayAt=(it:number)=>Math.sin(it*0.55)*0.16;
export const START={get ok(){return ok},drawStart,drawFlourish,swayAt,FL_END};
