import * as THREE from 'three';
import {W,H,dpr} from './core';

// ---------- CRT pass for the pixel-art eras: curvature, scanlines, shadow mask, colour fringing, vignette ----------
let ok=false,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.OrthographicCamera,mat:THREE.ShaderMaterial,texes=new WeakMap<HTMLCanvasElement,THREE.CanvasTexture>();
const frag=`
uniform sampler2D tex;uniform float time;uniform vec2 res;uniform float strength;varying vec2 vUv;
vec2 curve(vec2 uv){uv=uv*2.0-1.0;vec2 off=abs(uv.yx)/vec2(5.5,4.2);uv=uv+uv*off*off*strength;return uv*0.5+0.5;}
void main(){vec2 uv=curve(vUv);if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(0.02,0.02,0.03,1.0);return;}
 float ab=0.0011*strength;vec3 col;col.r=texture2D(tex,uv+vec2(ab,0.0)).r;col.g=texture2D(tex,uv).g;col.b=texture2D(tex,uv-vec2(ab,0.0)).b;
 vec3 halo=texture2D(tex,uv+vec2(0.0025,0.0)).rgb+texture2D(tex,uv-vec2(0.0025,0.0)).rgb+texture2D(tex,uv+vec2(0.0,0.004)).rgb;col+=halo*0.07;
 float sl=0.82+0.18*sin(uv.y*res.y*3.14159);col*=mix(1.0,sl,0.9);
 float m=mod(gl_FragCoord.x,3.0);vec3 mask=vec3(m<1.0?1.06:0.94,(m>=1.0&&m<2.0)?1.06:0.94,m>=2.0?1.06:0.94);col*=mask;
 float vig=16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);col*=pow(vig,0.22);
 col*=0.98+0.02*sin(time*120.0);
 gl_FragColor=vec4(col,1.0);}`;
const vert=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const CRT={init(){try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false});renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  mat=new THREE.ShaderMaterial({uniforms:{tex:{value:null},time:{value:0},res:{value:new THREE.Vector2(320,180)},strength:{value:1}},vertexShader:vert,fragmentShader:frag,depthTest:false,depthWrite:false});scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));ok=true}catch(e){console.warn('CRT pass unavailable',e);ok=false}},
 get ok(){return ok},canvas:()=>renderer.domElement,
 render(lo:{c:HTMLCanvasElement,w:number,h:number},t:number,strength=1){if(!ok)return;let tx=texes.get(lo.c);if(!tx){tx=new THREE.CanvasTexture(lo.c);tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;tx.colorSpace=THREE.NoColorSpace;texes.set(lo.c,tx)}tx.needsUpdate=true;mat.uniforms.tex.value=tx;mat.uniforms.time.value=t;mat.uniforms.res.value.set(lo.w,lo.h);mat.uniforms.strength.value=strength;renderer.render(scene,camera)}};
