import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { makeGrowth } from './growth';
// Scroll owns the ribbon position; the ambient clock only adds shimmer.
export function GrowthFire({growth,root,count}:{growth:ReturnType<typeof makeGrowth>;root:THREE.Group;count:number}){
 const {geometry,material}=useMemo(()=>{
 const geometry=new THREE.InstancedBufferGeometry();const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let j=0;j<=24;j++){for(const side of [-1,1]){vertices.push(j/24,side,0);uvs.push(j/24,(side+1)/2)}if(j<24){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 const seeds=new Float32Array(count*4);let seed=731;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647};for(let i=0;i<count;i++)seeds.set([rand(),rand(),rand(),rand()],i*4);geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));geometry.instanceCount=count;
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{...growth.uniforms,uRotation:{value:0}},vertexShader:`
 attribute vec4 aSeed;uniform sampler2D uAtlas;uniform sampler2D uClocks;uniform float uPathCount;uniform float uProgress;uniform float uTime;uniform float uEnergy;uniform float uRotation;varying vec2 vUv;varying float vAlpha;varying float vSpark;
 vec3 path(float u,float row){float x=clamp(u,0.,1.)*63.;float k=floor(x);return mix(texture2D(uAtlas,vec2((k+.5)/64.,(row+.5)/uPathCount)).xyz,texture2D(uAtlas,vec2((min(k+1.,63.)+.5)/64.,(row+.5)/uPathCount)).xyz,fract(x));}
 void main(){float row=floor(aSeed.x*uPathCount);vec2 times=texture2D(uClocks,vec2((row+.5)/uPathCount,.5)).xy;float g=times.y==0.?1.:smoothstep(times.x,times.y,uProgress);
 float frontMask=step(.0001,times.y)*smoothstep(.015,.12,g)*(1.-smoothstep(times.y-.004,times.y+.022,uProgress))*uEnergy;
 vSpark=step(.35,aSeed.z);float tail=mix(.20,.018,vSpark)*(1.-position.x);float u=max(0.,g-.018-aSeed.y*.09-tail);vec3 center=path(u,row);
 vec3 tangent=normalize(path(min(1.,u+.008),row)-path(max(0.,u-.008),row)+vec3(.00001));vec3 axis=abs(tangent.y)>.92?vec3(1.,0.,0.):vec3(0.,1.,0.);vec3 n=normalize(cross(tangent,axis));vec3 b=cross(tangent,n);
 float angle=aSeed.w*6.283+u*18.+g*5.;float spread=.06+aSeed.y*.22+tail*.8;vec3 p=center+(n*cos(angle)+b*sin(angle))*spread;p.xz=mat2(cos(uRotation),-sin(uRotation),sin(uRotation),cos(uRotation))*p.xz;
 vec4 mv=modelViewMatrix*vec4(p,1.);float width=mix(.016,.009,vSpark)*(sin(position.x*3.14159)*.8+.2);mv.x+=position.y*width;gl_Position=projectionMatrix*mv;vUv=uv;vAlpha=frontMask*(.7+.3*sin(uTime*3.+aSeed.w*30.));}
 `,fragmentShader:`varying vec2 vUv;varying float vAlpha;varying float vSpark;void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.8);float tip=pow(max(0.,sin(vUv.x*3.14159)),.65);float alpha=edge*tip*vAlpha;if(alpha<.003)discard;vec3 color=mix(vec3(8.,.65,.015),vec3(16.,4.,.13),vSpark);gl_FragColor=vec4(color,alpha*.8);}`});return {geometry,material};
 },[growth,count]);
 useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material]);
 useFrame(()=>{material.uniforms.uRotation.value=root.rotation.y;});
 return <mesh geometry={geometry} material={material} frustumCulled={false}/>;
}
