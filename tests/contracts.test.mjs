import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chapters,chapterAt,evaluateProgress,growthAt,cameraKeys} from '../src/scene/timeline.mjs';
import {validateContent,validateManifest} from '../tools/validation.mjs';
import {assessQuality,createQualityState} from '../src/scene/quality.mjs';
test('all chapters are contiguous and directly seekable in either direction',()=>{
 for(let i=1;i<chapters.length;i++)assert.equal(chapters[i-1].end,chapters[i].start);
 const samples=[0,...chapters.flatMap(c=>[c.start,Math.min(1,c.end-.00001)]),1];
 const before=samples.map(evaluateProgress);for(const p of [...samples].reverse())assert.deepEqual(evaluateProgress(p),before[samples.indexOf(p)]);
 assert.equal(chapterAt(1).id,'ending');assert.equal(evaluateProgress(1).growth,1);
});
test('growth is bounded, reaches endpoints, and remains continuous at the intro handoff',()=>{
 assert.equal(growthAt(0,.2,.3),0);assert.equal(growthAt(.3,.2,.3),1);
 assert.ok(Math.abs(evaluateProgress(.0699999).growth-evaluateProgress(.07).growth)<.00001);
 for(let p=0;p<=1;p+=.001){const state=evaluateProgress(p);assert.ok(state.growth>=0&&state.growth<=1);}
});
test('camera keys have a unique ordered timeline and finite positions',()=>{
 assert.equal(cameraKeys[0].p,0);assert.equal(cameraKeys.at(-1).p,1);
 cameraKeys.forEach((k,i)=>{if(i)assert.ok(k.p>cameraKeys[i-1].p);assert.ok([...k.pos,...k.target,k.lens].every(Number.isFinite));});
});
test('actual content and assets satisfy their contracts',()=>{
 validateContent(JSON.parse(fs.readFileSync('src/generated/projects.json')));
 validateManifest(JSON.parse(fs.readFileSync('public/assets/tree-manifest.json')));
});
test('invalid semantic references and growth dependency cycles fail the build',()=>{
 const content=JSON.parse(fs.readFileSync('src/generated/projects.json'));content[0].relatedProjects.push('missing');assert.throws(()=>validateContent(content),/Missing related/);
 const manifest=JSON.parse(fs.readFileSync('public/assets/tree-manifest.json'));manifest.paths[1].parent=2;assert.throws(()=>validateManifest(manifest),/parent/);
});
test('quality requires sustained evidence and observes the cooldown',()=>{
 const s=createQualityState();assert.equal(assessQuality(s,25,60,3),0);assert.equal(assessQuality(s,25,60,6),-1);assert.equal(assessQuality(s,25,60,9),0);assert.equal(assessQuality(s,25,60,12),0);assert.equal(assessQuality(s,25,60,18),-1);
});
test('quality stops upgrading after two direction reversals',()=>{
 const s=createQualityState();s.reversals=2;s.goodSeconds=18;assert.equal(assessQuality(s,8,60,30),0);
});
