import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
export function Particles({count,paused,progress}:{count:number;paused:boolean;progress:React.RefObject<number>}){
 const clock=useRef(0);
 const {geometry,material}=useMemo(()=>{
  let seed=127;const rand=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const geo=new THREE.InstancedBufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geo.setIndex([0,1,2,0,2,3]);
  const data=new Float32Array(10000*4);for(let i=0;i<10000;i++){const a=rand()*Math.PI*2,r=Math.pow(rand(),.65)*10;data.set([Math.cos(a)*r,rand()*17,Math.sin(a)*r,rand()],i*4)}geo.setAttribute('aSeed',new THREE.InstancedBufferAttribute(data,4));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uProgress:{value:0}},vertexShader:`attribute vec4 aSeed;uniform float uTime;uniform float uProgress;varying vec2 vUv;varying float vAlpha;void main(){vec3 p=aSeed.xyz;float t=uTime*(.13+aSeed.w*.14);p.y=mod(p.y-t+17.,17.)-.4;p.x+=sin(t*.7+p.y*.55+aSeed.w*40.)*.35;p.z+=cos(t*.45+p.x*.4)*.35;float local=exp(-pow(p.y-uProgress*12.,2.)*.5);p.x+=sin(t*1.4+aSeed.w*50.)*local*.13;vec4 mv=modelViewMatrix*vec4(p,1.);float size=.009+aSeed.w*.017;float soft=clamp(abs(mv.z+14.)*.025,0.,.6);mv.xy+=position.xy*size*(1.+soft*2.);gl_Position=projectionMatrix*mv;vUv=uv;vAlpha=(.22+aSeed.w*.42)*exp(-max(0.,-mv.z-9.)*.028);}`,fragmentShader:`varying vec2 vUv;varying float vAlpha;void main(){float d=length(vUv-.5);float a=(1.-smoothstep(.08,.5,d))*vAlpha;if(a<.01)discard;gl_FragColor=vec4(.075,.078,.071,a);}`});return {geometry:geo,material:mat};
 },[]);
 geometry.instanceCount=count;
 useFrame((_,delta)=>{if(!paused)clock.current+=Math.min(delta,.05);material.uniforms.uTime.value=clock.current;material.uniforms.uProgress.value=progress.current??0;});
 return <mesh geometry={geometry} material={material} frustumCulled={false}/>;
}
