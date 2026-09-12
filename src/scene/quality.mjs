export const tiers={high:{lod:'high',dpr:1.5,particles:3000,shadow:2048,target:60},balanced:{lod:'medium',dpr:1.25,particles:1800,shadow:1024,target:60},low:{lod:'low',dpr:1,particles:600,shadow:512,target:30},mobile:{lod:'low',dpr:1.25,particles:350,shadow:512,target:30}};
export function createQualityState(){return {badWindows:0,goodSeconds:0,lastChange:-20,reversals:0,direction:0};}
export function assessQuality(state,frameMs,target,now){
 if(frameMs>1000/target*1.2){state.badWindows++;state.goodSeconds=0;}else{state.badWindows=0;state.goodSeconds=frameMs<1000/target*.85?state.goodSeconds+3:0;}
 if(now-state.lastChange<10)return 0;
 const direction=state.badWindows>=2?-1:state.goodSeconds>=15&&state.reversals<2?1:0;
 if(direction){if(state.direction&&state.direction!==direction)state.reversals++;state.direction=direction;state.lastChange=now;state.badWindows=0;state.goodSeconds=0;}
 return direction;
}
