import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { makeGrowth } from './growth';
export function GrowthFire({growth,root,count}:{growth:ReturnType<typeof makeGrowth>;root:THREE.Group;count:number}){
 const {geometry,material}=useMemo(()=>{
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
 const seeds=new Float32Array(count*4);let seed=731;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<count;i++)seeds.set([rand(),rand(),rand(),rand()],i*4);geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));geometry.instanceCount=count;
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.NormalBlending,uniforms:{...growth.uniforms,uRotation:{value:0}},vertexShader:`
 attribute vec4 aSeed;uniform sampler2D uAtlas;uniform sampler2D uClocks;uniform float uPathCount;uniform float uProgress;uniform float uTime;uniform float uRotation;varying vec2 vUv;varying float vLife;varying float vSmoke;
 void main(){float row=floor(aSeed.x*uPathCount);vec2 times=texture2D(uClocks,vec2((row+.5)/uPathCount,.5)).xy;float g=times.y==0.?1.:smoothstep(times.x,times.y,uProgress);float life=fract(aSeed.y+uTime*(.19+aSeed.z*.15));float u=max(0.,g-life*.22);vec3 p=texture2D(uAtlas,vec2((floor(u*63.)+.5)/64.,(row+.5)/uPathCount)).xyz;
 float angle=aSeed.w*6.283+life*4.;float r=.07+life*.42;p+=vec3(cos(angle)*r,life*.55,sin(angle)*r);p.xz=mat2(cos(uRotation),-sin(uRotation),sin(uRotation),cos(uRotation))*p.xz;
 vec4 mv=modelViewMatrix*vec4(p,1.);vSmoke=step(.78,aSeed.z);float size=mix(.018+aSeed.w*.025,.25+life*.5,vSmoke);mv.xy+=position.xy*vec2(size,size*mix(2.8,1.,vSmoke));gl_Position=projectionMatrix*mv;vUv=uv;vLife=sin(life*3.14159)*smoothstep(0.,.1,g)*(1.-smoothstep(times.y+.04,times.y+.16,uProgress));}
 `,fragmentShader:`varying vec2 vUv;varying float vLife;varying float vSmoke;void main(){float d=length(vUv-.5);float a=(1.-smoothstep(.05,.5,d))*vLife;vec3 col=mix(vec3(12.,2.5,.08),vec3(.06,.025,.013),vSmoke);a*=mix(.85,.12,vSmoke);if(a<.003)discard;gl_FragColor=vec4(col,a);}`});return {geometry,material};
 },[growth,count]);
 useFrame(()=>{material.uniforms.uRotation.value=root.rotation.y;});
 return <mesh geometry={geometry} material={material} frustumCulled={false}/>;
}
