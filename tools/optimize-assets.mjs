import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions([EXTMeshoptCompression,KHRMeshQuantization]).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const lod of ['low','medium','high']){
 const doc=await io.read(`assets-source/tree-${lod}-raw.glb`);
 await doc.transform(reorder({encoder:MeshoptEncoder}),quantize({pattern:/^NORMAL$/,quantizeNormal:12}));
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 await io.write(`public/assets/tree-${lod}.glb`,doc);
 let triangles=0;for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){triangles+=(p.getIndices()?.getCount()??0)/3;for(const a of ['_U','_PATHINDEX'])if(!p.getAttribute(a))throw Error(`Lost ${a}`);}
 console.log(lod,Math.round(triangles),'triangles',fs.statSync(`public/assets/tree-${lod}.glb`).size,'bytes');
}
