import * as THREE from 'three';
import type { TreeManifest } from '../types';
export function makeGrowth(manifest:TreeManifest){
 const atlas=new THREE.DataTexture(new Float32Array(manifest.atlas),64,manifest.pathCount,THREE.RGBAFormat,THREE.FloatType);atlas.minFilter=THREE.NearestFilter;atlas.magFilter=THREE.NearestFilter;atlas.needsUpdate=true;
 const ranges=new Float32Array(manifest.pathCount*4);manifest.paths.forEach((p,i)=>{ranges[i*4]=p.start;ranges[i*4+1]=p.end;});
 const clocks=new THREE.DataTexture(ranges,manifest.pathCount,1,THREE.RGBAFormat,THREE.FloatType);clocks.needsUpdate=true;
 const uniforms={uProgress:{value:1},uTime:{value:0},uEnergy:{value:1},uAtlas:{value:atlas},uClocks:{value:clocks},uPathCount:{value:manifest.pathCount}};
 const declarations=`uniform float uProgress;uniform sampler2D uAtlas;uniform sampler2D uClocks;uniform float uPathCount;attribute float _u;attribute float _pathindex;
 vec3 pathPoint(float u,float row){float x=clamp(u,0.,1.)*63.;float k=floor(x);vec3 a=texture2D(uAtlas,vec2((k+.5)/64.,(row+.5)/uPathCount)).xyz;vec3 b=texture2D(uAtlas,vec2((min(k+1.,63.)+.5)/64.,(row+.5)/uPathCount)).xyz;return mix(a,b,fract(x));}`;
 const transform=`vec2 times=texture2D(uClocks,vec2((_pathindex+.5)/uPathCount,.5)).xy;
 float g=times.y==0.?1.:smoothstep(times.x,times.y,uProgress);
 vec3 center=pathPoint(_u,_pathindex);vec3 front=pathPoint(min(_u,g),_pathindex);
 float radius=g>=.999?1.:smoothstep(0.,.10,g-_u);
 vec3 transformed=front+(position-center)*radius;`;
 function apply<T extends THREE.Material>(material:T){material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=declarations+'\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',transform);
 if(material instanceof THREE.MeshStandardMaterial){
 shader.vertexShader='varying vec3 vVein;varying float vFront;varying float vActive;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('vec3 transformed=front+(position-center)*radius;','vec3 transformed=front+(position-center)*radius;vVein=vec3(uv.x,_u,_pathindex);vFront=g;vActive=step(.0001,times.y)*(1.-smoothstep(times.y-.004,times.y+.022,uProgress));');
 shader.fragmentShader='uniform float uTime;uniform float uEnergy;varying vec3 vVein;varying float vFront;varying float vActive;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float along=vVein.y;
 float winding=vVein.x*18.+sin(along*31.+vVein.z)*.36+sin(along*79.+vVein.z*2.)*.12;
 float vein=pow(max(0.,1.-abs(sin(winding*3.14159))),7.);
 float hairline=pow(max(0.,1.-abs(sin((winding*2.7+along*6.)*3.14159))),32.);
 float behind=vFront-along;
 float wake=exp(-pow((behind-.065)/.10,2.))*vActive;
 float pulse=.85+.15*sin(along*74.-vFront*95.+vVein.z*.83);
 float formed=smoothstep(0.,.06,vFront-along);
 float fire=(vein*3.2+hairline*.65)*wake*pulse*formed*uEnergy;
 vec3 ember=mix(vec3(1.,.025,.001),vec3(1.,.19,.008),clamp(wake+vein*.3,0.,1.));
 totalEmissiveRadiance+=ember*fire*6.;`);
 }
 };material.customProgramCacheKey=()=> 'living-tree-growth-front-v3';return material;}
 return {uniforms,apply,dispose:()=>{atlas.dispose();clocks.dispose()}};
}

