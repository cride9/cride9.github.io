"""Author the Living Tree in Blender. Run: blender --background --python tools/create-tree.py.
All forms are original. Coordinates below are runtime Y-up; Blender converts to Z-up.
The exported custom attributes and spline atlas are used by the shared growth shader.
"""
import bpy, math, random, json, os
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / 'assets-source').mkdir(exist_ok=True)
random.seed(7319)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def v(p): return Vector(p)
def bez(points, count=64):
    pts = [v(p) for p in points]
    result=[]
    for i in range(count):
        x=i/(count-1)*(len(pts)-1); k=min(int(x),len(pts)-2); t=x-k
        a,b,c,d=pts[max(0,k-1)],pts[k],pts[k+1],pts[min(k+2,len(pts)-1)]
        result.append((2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
    return result

paths=[]
def add_path(group, points, radius, start=0, end=0, level=0, parent=-1):
    idx=len(paths)
    paths.append(dict(group=group, points=bez(points), radius=radius,start=start,end=end,level=level,parent=parent,seed=random.random()*80))
    return idx

trunk=add_path('foundations',[(0,0,0),(-.58,.95,.08),(-.55,2.0,.12),(.22,3.0,.2),(1.0,3.9,.12),(1.25,4.8,0),(.93,6.0,-.12),(1.26,7.25,.05),(.86,8.6,.0),(1.03,9.7,.13),(.66,10.8,.0),(1.0,11.55,-.12),(.86,12.1,-.15)],.82)
for i in range(7):
    a=i*math.tau/7+random.uniform(-.25,.25); length=random.uniform(1.6,2.6)
    root=add_path('foundations',[(0,.35,0),(.6*math.cos(a),.15,.6*math.sin(a)),(length*.55*math.cos(a+.16),.045,length*.55*math.sin(a+.16)),(length*.8*math.cos(a-.08),.03,length*.8*math.sin(a-.08)),(length*math.cos(a+.08),-.03,length*math.sin(a+.08))],random.uniform(.16,.29))
    for sign in [-1,1]:
        p=paths[root]['points'][36]; d=v((math.cos(a+sign*.65),-.05,math.sin(a+sign*.65)))
        add_path('foundations',[p,p+d*.38,p+d*.78+v((0,-.04,.1))],.07,level=1)

# Deliberately composed structural limbs: spreading lower arms, an offset AI crown,
# and a fine ascending frontier. Each has a clear negative-space window.
majors=[
 ('reverse-engineering',[(.35,3.25,.16),(-.6,3.95,.18),(-1.65,3.7,.1),(-2.6,4.12,.27),(-3.4,3.98,.34),(-4.3,4.55,.15),(-5.15,4.65,.25)],.30,.14,.235),
 ('professional',[(1.18,4.8,-.02),(2.1,5.35,-.45),(2.9,5.15,-.72),(3.5,5.9,-.85),(4.25,5.82,-.65),(5.1,6.5,-.8)],.27,.255,.36),
 ('infrastructure',[(.98,6.15,-.1),(.0,6.8,-.65),(-1.2,6.32,-1.35),(-2.3,6.85,-1.65),(-3.2,6.72,-1.3),(-4.5,7.4,-1.5)],.28,.38,.475),
 ('applied-ai',[(1.18,7.4,.05),(.15,7.95,.42),(-1.25,7.65,.65),(-2.1,8.3,.4),(-3.2,8.12,.25),(-4.2,8.75,.4),(-4.8,8.82,.25)],.31,.52,.64),
 ('llm-systems',[(.9,8.7,.05),(1.9,9.22,.38),(2.6,9.0,.65),(3.35,9.65,.9),(4.05,9.42,.7),(4.6,10.0,.65)],.20,.70,.79),
 ('research',[(1.0,9.7,.1),(.15,10.3,-.2),(-.7,10.12,-.35),(-1.2,10.9,-.45),(-2.05,11.1,-.25),(-2.3,11.75,-.35)],.16,.81,.90)
]
major_ids=[]
for group,points,r,start,end in majors:
    main=add_path(group,points,r,start,end,0,trunk); major_ids.append(main)
    base=paths[main]
    def inverse_smooth(u):
        lo,hi=0.,1.
        for _ in range(20):
            mid=(lo+hi)/2
            if mid*mid*(3-2*mid)<u: lo=mid
            else: hi=mid
        return (lo+hi)/2
    def crooked(parent,u,length,direction,radius,depth):
        pp=paths[parent]; k=min(63,int(u*63)); u=k/63; origin=pp['points'][k]
        d=direction.normalized(); side=d.cross(v((0,0,1))).normalized()
        points=[origin]
        for step in range(1,7):
            t=step/6; jitter=math.sin(t*math.pi)*random.uniform(-.13,.13)*length
            points.append(origin+d*(length*t)+side*jitter+v((random.uniform(-.035,.035)*length,.09*length*t*t,random.uniform(-.06,.06)*length)))
        st=pp['start']+(pp['end']-pp['start'])*inverse_smooth(u); en=min(.992,st+(.075 if depth==1 else .043))
        branch=add_path(group,points,radius,st,en,depth,parent)
        paths[branch]['attachU']=u
        if depth<3:
            for m,q in enumerate([.42,.68,.88]):
                angle=(m%2*2-1)*random.uniform(.5,.95)
                rotated=v((d.x*math.cos(angle)-d.y*math.sin(angle),d.x*math.sin(angle)+d.y*math.cos(angle),d.z+random.uniform(-.55,.55)))
                rotated.y=max(-.16,rotated.y)
                crooked(branch,q,length*(1-q)*random.uniform(.9,1.4)+.12,rotated,radius*(1-q)*.66,depth+1)
        return branch
    for j in range(8):
        u=.24+j*.10; k=int(u*63); tangent=(base['points'][min(63,k+1)]-base['points'][max(0,k-1)]).normalized()
        sign=-1 if tangent.x<0 else 1
        direction=v((sign*random.uniform(.45,1.0),random.uniform(.15,.7),random.uniform(-.6,.6)))
        if j%3==0: direction.y=-.12
        crooked(main,u,(1-u)*random.uniform(1.7,2.8)+.28,direction,r*(1-u)**1.05*.63,1)

# Smaller trunk offshoots break the otherwise regular major-branch rhythm.
for j,u in enumerate([.79,.84,.885,.925,.96]):
    k=int(u*63); p=paths[trunk]['points'][k]; sign=-1 if j%2 else 1
    crown=add_path('research',[p,p+v((sign*.35,.3,.1)),p+v((sign*.72,.55,-.1)),p+v((sign*.9,1.0,.12)),p+v((sign*1.15,1.15,.0))],.095*(1-(u-.79)*3),.83,.925,1,trunk)
    for n in range(4):
        crooked(crown,.35+n*.17,.5-n*.065,v((sign*.65,.7,(-1 if n%2 else 1)*.25)),.029-n*.004,2)
for j in range(12):
    y=3+j*.65; angle=j*2.399; p=paths[trunk]['points'][min(63,int(y/12.1*63))]
    d=v((math.cos(angle),.4,math.sin(angle))).normalized(); length=random.uniform(.4,.9)
    group=majors[min(5,j//2)][0]; start=majors[min(5,j//2)][3]
    add_path(group,[p,p+d*length*.5,p+d*length+v((0,.25,0))],.065,start,start+.09,2,trunk)

material=bpy.data.materials.new('Chalk wood — original procedural bark'); material.use_nodes=True
nodes=material.node_tree.nodes; links=material.node_tree.links; bsdf=nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(.48,.475,.44,1); bsdf.inputs['Roughness'].default_value=.81
tex=nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=7; tex.inputs['Detail'].default_value=4
mapping=nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(5,5,.4)
coord=nodes.new('ShaderNodeTexCoord'); links.new(coord.outputs['Generated'],mapping.inputs[0]); links.new(mapping.outputs[0],tex.inputs['Vector'])
bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.3; bump.inputs['Distance'].default_value=.065; links.new(tex.outputs['Fac'],bump.inputs['Height']); links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])

def make_mesh(group, lod):
    verts=[]; faces=[]; us=[]; pids=[]; uv=[]
    for pid,p in enumerate(paths):
        if p['group']!=group or (lod=='low' and p['level']>2): continue
        rings=([64,24,16,10] if lod=='high' else [48,20,12,8] if lod=='medium' else [40,16,10,6])[p['level']]
        sides=([18,10,7,5] if lod=='high' else [14,8,6,4] if lod=='medium' else [10,6,5,4])[p['level']]
        offset=len(verts)
        for i in range(rings):
            u=i/(rings-1); q=u*63; k=min(62,int(q)); center=p['points'][k].lerp(p['points'][k+1],q-k)
            tangent=(p['points'][min(63,k+1)]-p['points'][max(0,k-1)]).normalized()
            axis=v((0,0,1)) if abs(tangent.z)<.9 else v((1,0,0)); n=tangent.cross(axis).normalized(); b=tangent.cross(n).normalized()
            radius=p['radius']*(max(.001,1-u)**1.16)*(1+.10*math.sin(u*33+p['seed']))
            if group=='foundations' and pid==0: radius=p['radius']*((1-u)**.84)*(.92+.09*math.sin(u*23))+.001
            if i==rings-1: radius=.0003
            for j in range(sides):
                a=j/sides*math.tau
                ridges=1+.13*math.sin(a*5+u*12+p['seed'])+.055*math.sin(a*11-u*17)+.045*math.sin(u*69+a*4)
                point=center+(n*math.cos(a)+b*math.sin(a))*radius*ridges
                verts.append((point.x,-point.z,point.y)); us.append(u); pids.append(float(pid)); uv.append((j/sides,u*6))
        for i in range(rings-1):
            for j in range(sides):
                a=offset+i*sides+j; b=offset+i*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides))
        faces.append(tuple(offset+j for j in reversed(range(sides))))
    mesh=bpy.data.meshes.new(group+'-'+lod); mesh.from_pydata(verts,[],faces); mesh.update()
    for name,values in [('_U',us),('_PATHINDEX',pids)]:
        attr=mesh.attributes.new(name,'FLOAT','POINT'); attr.data.foreach_set('value',values)
    uv_layer=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices: uv_layer.data[loop].uv=uv[mesh.loops[loop].vertex_index]
    ob=bpy.data.objects.new(group,mesh); bpy.context.collection.objects.link(ob); ob.data.materials.append(material); ob['branchId']=group; return ob

groups=['foundations']+[m[0] for m in majors]
all_high=[]
for lod in ['high','medium','low']:
    bpy.ops.object.select_all(action='DESELECT')
    objs=[make_mesh(group,lod) for group in groups]
    for ob in objs: ob.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets-source'/f'tree-{lod}-raw.glb'),use_selection=True,export_format='GLB',export_attributes=True,export_extras=True,export_materials='EXPORT')
    if lod=='high':
        all_high=objs
        for ob in objs: ob.hide_render=True; ob.hide_set(True)
    else:
        for ob in objs: bpy.data.objects.remove(ob,do_unlink=True)
for ob in all_high: ob.hide_render=False; ob.hide_set(False)

atlas=[]
for p in paths:
    for point in p['points']: atlas.extend([round(point.x,6),round(point.y,6),round(point.z,6),1])
manifest={'version':1,'units':'metres','up':'Y','height':12.6,'atlasWidth':64,'pathCount':len(paths),'atlas':atlas,'paths':[{'group':p['group'],'start':p['start'],'end':p['end'],'parent':p['parent'],'level':p['level'],'attachU':p.get('attachU',0)} for p in paths], 'branches':[{'id':g,'anchor':list(paths[major_ids[i-1]]['points'][36]) if i else [0,.7,0]} for i,g in enumerate(groups)]}
(OUT/'tree-manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')

# Studio and camera remain in the editable .blend source and create genuine fallbacks.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.08)); floor=bpy.context.object; floor.name='Studio ground'
mat=bpy.data.materials.new('Pale matte studio'); mat.diffuse_color=(.88,.88,.85,1); floor.data.materials.append(mat)
world=bpy.context.scene.world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.82,.82,.79,1); world.node_tree.nodes['Background'].inputs[1].default_value=.65
for name,loc,power,size in [('Key',(-5,-7,13),1800,8),('Fill',(8,2,9),700,7)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.name=name; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; light.rotation_euler=(v((0,0,6))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(17,-26,12)); camera=bpy.context.object; camera.name='Opening camera'; camera.rotation_euler=(v((0,0,6))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.lens=50
scene=bpy.context.scene; scene.camera=camera; scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
scene.render.resolution_x=1440; scene.render.resolution_y=1080; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='WEBP'; scene.render.image_settings.quality=85
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets-source'/'living-tree.blend'))
scene.render.filepath=str(OUT/'opening.webp'); bpy.ops.render.render(write_still=True)
print('LIVING_TREE_ASSETS_COMPLETE',len(paths))
