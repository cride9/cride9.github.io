import { useContext,useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { EffectComposer,EffectComposerContext,SSAO,Bloom,SMAA,DepthOfField,ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode,DepthOfFieldEffect } from 'postprocessing';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';
import type { Quality,TreeManifest } from '../types';
import { makeGrowth } from './growth';
import { GrowthFire } from './GrowthFire';
import { Particles } from './Particles';
import { Atmosphere } from './Atmosphere';
import { cameraKeys,portraitKeys,evaluateProgress,clamp,smooth } from './timeline.mjs';
import { tiers,createQualityState,assessQuality } from './quality.mjs';

type Props={progress:React.RefObject<number>;paused:boolean;reduced:boolean;quality:Quality;onReady:()=>void;onError:()=>void;onChapter:(id:string)=>void;onPick:(branch:string)=>void;anchorRef:React.RefObject<HTMLDivElement|null>};
type Tier=keyof typeof tiers;
const curve=(key:'pos'|'target',keys=cameraKeys)=>new THREE.CatmullRomCurve3(keys.map(k=>new THREE.Vector3(...k[key] as [number,number,number])),false,'centripetal');
function GrowthNormals({growth}:{growth:ReturnType<typeof makeGrowth>}){
 const {normalPass}=useContext(EffectComposerContext);
 useEffect(()=>{if(!normalPass)return;const pass=normalPass as unknown as {renderPass:{overrideMaterial:THREE.Material|null}};const previous=pass.renderPass.overrideMaterial;const material=growth.apply(new THREE.MeshNormalMaterial());pass.renderPass.overrideMaterial=material;normalPass.resolution.scale=.5;return()=>{pass.renderPass.overrideMaterial=previous;material.dispose()}},[normalPass,growth]);
 return null;
}
function FocusPull({progress}:{progress:Props['progress']}){const ref=useRef<DepthOfFieldEffect>(null);useFrame(()=>{if(ref.current){const p=progress.current;ref.current.bokehScale=.55*smooth((p-.51)/.012)*(1-smooth((p-.553)/.017));}});return <DepthOfField ref={ref} worldFocusDistance={5.3} worldFocusRange={4} bokehScale={0} resolutionScale={.5}/>}
function CameraDirector({progress,paused,reduced,onChapter,root,growth,anchorRef,manifest,stats}:{progress:Props['progress'];paused:boolean;reduced:boolean;onChapter:Props['onChapter'];root:THREE.Group;growth:ReturnType<typeof makeGrowth>;anchorRef:Props['anchorRef'];manifest:TreeManifest;stats:(delta:number)=>void}){
 const {camera,size,gl}=useThree();const current=useRef(progress.current??0);const last=useRef('');const pointer=useRef({x:0,y:0});
 const mobile=size.width<760;const keys=mobile?portraitKeys:cameraKeys;
 const tracks=useMemo(()=>{const pos=curve('pos',keys);const distances=keys.slice(0,-1).map((_,k)=>{const lengths=[0];let prev=pos.getPoint(k/(keys.length-1));for(let j=1;j<=32;j++){const next=pos.getPoint((k+j/32)/(keys.length-1));lengths.push(lengths[j-1]+next.distanceTo(prev));prev=next;}return lengths.map(x=>x/lengths[32])});return {pos,target:curve('target',keys),distances}},[mobile]);const target=useMemo(()=>new THREE.Vector3(),[]);const projected=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>{const move=(e:MouseEvent)=>{pointer.current={x:e.clientX/window.innerWidth-.5,y:e.clientY/window.innerHeight-.5}};window.addEventListener('pointermove',move,{passive:true});return()=>window.removeEventListener('pointermove',move)},[]);
 useFrame((_,delta)=>{
  if(!paused){const desired=progress.current??0;current.current=Math.abs(desired-current.current)<.00005?desired:THREE.MathUtils.damp(current.current,desired,28,Math.min(delta,.05));}
  const p=current.current;const state=evaluateProgress(p);
  let k=cameraKeys.findIndex(key=>key.p>p)-1;if(k<0)k=p>=1?cameraKeys.length-2:0;
  const a=keys[k],b=keys[k+1];const t=smooth(clamp((p-a.p)/(b.p-a.p)));const distances=tracks.distances[k];const segment=Math.max(0,Math.min(31,distances.findIndex(x=>x>=t)-1));const local=(segment+(t-distances[segment])/Math.max(.00001,distances[segment+1]-distances[segment]))/32;const u=(k+local)/(keys.length-1);
  tracks.pos.getPoint(u,camera.position);tracks.target.getPoint(u,target);
  if(!mobile&&!reduced&&!paused){camera.position.x+=pointer.current.x*.10;camera.position.y-=pointer.current.y*.05;}
  camera.up.set(0,1,0);camera.lookAt(target);const pc=camera as THREE.PerspectiveCamera;pc.setFocalLength(THREE.MathUtils.lerp(a.lens,b.lens,t));pc.updateProjectionMatrix();
  root.rotation.y=state.rotation;growth.uniforms.uProgress.value=state.growth;growth.uniforms.uEnergy.value=reduced?0:smooth((p-.07)/.025);if(!paused&&!reduced)growth.uniforms.uTime.value+=Math.min(delta,.05);
  if(last.current!==state.chapter.id){last.current=state.chapter.id;onChapter(last.current);}
  const anchor=manifest.branches.find(x=>x.id===state.chapter.id);const el=anchorRef.current;
  if(el){if(anchor&&state.chapter.project&&!mobile){projected.set(...anchor.anchor).applyMatrix4(root.matrixWorld).project(camera);const x=(projected.x*.5+.5)*size.width,y=(-projected.y*.5+.5)*size.height;const show=projected.z<1&&projected.z>-1&&x>size.width*.36&&x<size.width-40&&y>100&&y<size.height-120;el.style.opacity=show?'1':'0';el.style.transform=`translate(${x}px,${y}px)`;}else el.style.opacity='0';}
  const fog=_.scene.fog as THREE.Fog;fog.near=mobile?46:p<.055?22:18;fog.far=mobile?110:p<.055?60:65;
  gl.domElement.dataset.progress=p.toFixed(4);gl.domElement.dataset.chapter=state.chapter.id;
  stats(delta);
 },-1);
 return null;
}

function World(props:Props & {tier:Tier;setTier:(tier:Tier)=>void}){
 const {gl,scene,camera,invalidate}=useThree();const [asset,setAsset]=useState<{group:THREE.Group;manifest:TreeManifest;growth:ReturnType<typeof makeGrowth>;dispose:()=>void}|null>(null);const [baseReady,setBaseReady]=useState(false);const level=tiers[props.tier];const lod=baseReady?level.lod:'low';const qualityState=useRef(createQualityState());const samples=useRef({elapsed:0,frames:0,age:0});
 useEffect(()=>{
  let cancelled=false;let disposed:(()=>void)|undefined;
  const ktx=new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl);
  Promise.all([fetch('/assets/tree-manifest.json').then(r=>{if(!r.ok)throw Error('Missing manifest');return r.json() as Promise<TreeManifest>}),new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`/assets/tree-${lod}.glb`),ktx.loadAsync('/assets/bark-normal.ktx2'),ktx.loadAsync('/assets/bark-color.ktx2')]).then(async([manifest,gltf,normal,color])=>{
   color.wrapS=color.wrapT=THREE.RepeatWrapping;color.flipY=false;color.colorSpace=THREE.SRGBColorSpace;
   normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.flipY=false;normal.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy());
   const growth=makeGrowth(manifest);const group=new THREE.Group();gltf.scene.updateMatrixWorld(true);
   gltf.scene.traverse(child=>{if(child instanceof THREE.Mesh){const geometry=child.geometry.clone().applyMatrix4(child.matrixWorld);geometry.computeBoundingSphere();const material=growth.apply(new THREE.MeshStandardMaterial({color:'#ccccC4',map:color,roughness:.83,metalness:0,normalMap:normal,normalScale:new THREE.Vector2(.7,.7)}));
    const mesh=new THREE.Mesh(geometry,material);mesh.name=child.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.customDepthMaterial=growth.apply(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}));group.add(mesh);
   }});
   disposed=()=>{color.dispose();normal.dispose();growth.dispose();group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();o.customDepthMaterial?.dispose();}})};
   gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose()}});
   if(cancelled){disposed();return;}setAsset({group,manifest,growth,dispose:disposed});setBaseReady(true);invalidate();
  }).catch(error=>{console.warn('Tree asset loading failed',error);if(!cancelled&&!asset){props.onError()}}).finally(()=>ktx.dispose());
  return()=>{cancelled=true};
 },[lod]);
 useEffect(()=>()=>asset?.dispose(),[asset]);
 useEffect(()=>{if(!asset)return;let active=true;gl.compileAsync(scene,camera).then(()=>{if(active)props.onReady()}).catch(error=>{console.warn('Optional shader precompile unavailable',error)});return()=>{active=false}},[asset]);
 // The compiler's actual camera is supplied by the scene's first render; ready is
 // intentionally non-blocking because browser drivers may not expose async compilation.
 const ready=useRef(false);useFrame(()=>{if(asset&&!ready.current){ready.current=true;props.onReady()}});
 function stats(delta:number){const s=samples.current;if(props.paused||document.hidden)return;s.age+=delta;if(s.age<3)return;s.elapsed+=Math.min(delta,.2);s.frames++;if(s.elapsed>=3){gl.domElement.dataset.fps=(s.frames/s.elapsed).toFixed(1);gl.domElement.dataset.tier=props.tier;gl.domElement.dataset.calls=String(gl.info.render.calls);gl.domElement.dataset.triangles=String(gl.info.render.triangles);if(props.quality==='auto'){const change=assessQuality(qualityState.current,s.elapsed/s.frames*1000,level.target,s.age);const list:Tier[]=window.innerWidth<760?['mobile']:['low','balanced','high'];const at=list.indexOf(props.tier);if(change&&list[at+change])props.setTier(list[at+change]);}s.elapsed=0;s.frames=0;}}
 return <>
  <color attach="background" args={[2.8,2.8,2.7]}/><fog attach="fog" args={[new THREE.Color(2.8,2.8,2.7),22,65]}/>
  <hemisphereLight args={['#f7f7f3','#999b92',2.1]}/><ambientLight intensity={.35}/>
  <directionalLight position={[-8,15,8]} intensity={3.2} castShadow shadow-mapSize={[level.shadow,level.shadow]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={15} shadow-camera-bottom={-4} shadow-camera-near={.1} shadow-camera-far={45} shadow-bias={-.00025} shadow-normalBias={.04} shadow-radius={3}/>
  <directionalLight position={[7,9,-5]} intensity={.65}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.055,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#f2f2ef" roughness={1}/></mesh>
  {asset&&<><primitive object={asset.group}/>{!props.reduced&&<GrowthFire growth={asset.growth} root={asset.group} count={props.tier==='mobile'?180:500}/>}<CameraDirector {...props} root={asset.group} growth={asset.growth} manifest={asset.manifest} stats={stats}/>
   {asset.manifest.branches.filter(b=>b.id!=='foundations').map(b=><mesh key={b.id} position={b.anchor} onClick={e=>{e.stopPropagation();props.onPick(b.id)}} onPointerOver={()=>{document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}><sphereGeometry args={[.55,8,6]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
  </>}
  {!props.reduced&&<Particles count={level.particles} paused={props.paused} progress={props.progress}/>}
  <EffectComposer enableNormalPass={props.tier==='high'||props.tier==='balanced'} multisampling={0}>
   {asset?<GrowthNormals growth={asset.growth}/>:<></>}
   {(props.tier==='high'||props.tier==='balanced')?<SSAO samples={12} radius={.22} intensity={1.5} luminanceInfluence={.65}/>:<></>}
   {props.tier==='high'?<Atmosphere/>:<></>}
   {props.tier==='high'?<FocusPull progress={props.progress}/>:<></>}
   <Bloom luminanceThreshold={4} luminanceSmoothing={.6} intensity={.65} mipmapBlur resolutionScale={.5}/><SMAA/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/>
  </EffectComposer>
 </>;
}
export default function Scene(props:Props){
 const [tier,setTier]=useState<Tier>(()=>window.innerWidth<760?'mobile':'balanced');const [visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const fn=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn)},[]);
 useEffect(()=>{setTier(props.quality==='high'?'high':props.quality==='low'?(innerWidth<760?'mobile':'low'):(innerWidth<760?'mobile':'balanced'))},[props.quality]);
 const dpr=Math.min(devicePixelRatio,tiers[tier].dpr,Math.sqrt(3700000/(innerWidth*innerHeight)));
 return <Canvas shadows dpr={dpr} frameloop={visible?'always':'never'} camera={{position:[16,10,25],fov:40,near:.1,far:100}} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();props.onError()})}}><World {...props} tier={tier} setTier={setTier}/></Canvas>;
}


