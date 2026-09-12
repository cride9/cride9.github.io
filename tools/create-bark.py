"""Original tileable bark maps. No third-party imagery is used."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'assets-source'
n=512
y,x=np.mgrid[0:n,0:n]/n
tau=np.pi*2
warp=.012*np.sin(tau*y*3)+.006*np.sin(tau*(y*7+x*2))+.003*np.cos(tau*y*19)
h=np.zeros((n,n))
for freq,amp in [(13,.3),(31,.16),(67,.07),(151,.025)]:
    h+=amp*np.sin(tau*(x+warp)*freq+np.sin(tau*y*2)*.3)
fissure=np.maximum(0,np.cos(tau*((x+warp)*23)))**12
h-=fissure*.24
h+=.03*np.sin(tau*(x*211+y*179))+.02*np.sin(tau*(x*353-y*233))
dx=(np.roll(h,-1,1)-np.roll(h,1,1))*2.2
dy=(np.roll(h,-1,0)-np.roll(h,1,0))*2.2
normal=np.stack([-dx,-dy,np.ones_like(h)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8(np.clip(normal*.5+.5,0,1)*255)).save(out/'bark-normal.png')
base=np.clip(.72+h*.12,0,1)
Image.fromarray(np.uint8(np.stack([base,base*.995,base*.965],axis=-1)*255)).save(out/'bark-color.png')
print('Created original tileable bark maps.')
