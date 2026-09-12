import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {BlendFunction,Effect,EffectAttribute} from 'postprocessing';
import {Uniform} from 'three';

// A bounded, depth-aware height-scattering field. The eight integration samples
// are confined to the high tier; ordinary scene fog remains the baseline.
export function Atmosphere(){
 const {camera}=useThree();
 const effect=useMemo(()=>new Effect('HeightAtmosphere',`
 uniform mat4 uInverseProjection;uniform mat4 uCameraWorld;
 void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
  float depth=readDepth(uv);vec4 view=uInverseProjection*vec4(uv*2.-1.,depth*2.-1.,1.);view/=view.w;
  vec3 origin=uCameraWorld[3].xyz;vec3 endpoint=(uCameraWorld*view).xyz;vec3 direction=normalize(endpoint-origin);
  float distanceToSurface=min(length(endpoint-origin),35.);float opticalDepth=0.;
  for(int i=0;i<8;i++){vec3 p=origin+direction*distanceToSurface*(float(i)+.5)/8.;
   float density=exp(-max(p.y,0.)*.24)*(.72+.28*sin(p.x*.37+p.z*.25)*sin(p.y*.55));
   opticalDepth+=density*distanceToSurface/8.;}
  float scatter=min(.045,1.-exp(-opticalDepth*.006));outputColor=vec4(mix(inputColor.rgb,vec3(2.8,2.8,2.7),scatter),inputColor.a);
 }`,{blendFunction:BlendFunction.NORMAL,attributes:EffectAttribute.DEPTH,uniforms:new Map([['uInverseProjection',new Uniform(camera.projectionMatrixInverse)],['uCameraWorld',new Uniform(camera.matrixWorld)]])}),[camera]);
 useEffect(()=>()=>effect.dispose(),[effect]);return <primitive object={effect} dispose={null}/>;
}
