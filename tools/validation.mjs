export const branchIds=['foundations','reverse-engineering','professional','infrastructure','applied-ai','llm-systems','research'];
export function validateContent(projects){
 const ids=new Set();
 for(const p of projects){if(ids.has(p.id))throw Error(`Duplicate project ${p.id}`);ids.add(p.id);if(!branchIds.includes(p.branchId))throw Error(`Unknown branch ${p.branchId}`);for(const field of ['title','projectName','shortDescription','html'])if(!p[field])throw Error(`Missing ${field} in ${p.id}`);}
 for(const p of projects)for(const id of p.relatedProjects)if(!ids.has(id))throw Error(`Missing related project ${id}`);
 return true;
}
export function validateManifest(m){
 if(m.atlas.length!==m.pathCount*m.atlasWidth*4)throw Error('Invalid atlas dimensions');
 for(const [i,p] of m.paths.entries()){if(!branchIds.includes(p.group))throw Error('Invalid branch');if(p.start>p.end)throw Error('Invalid growth interval');if(p.parent>=i)throw Error('Growth parent must precede child');if(p.parent>=0){const parent=m.paths[p.parent];if(p.start<parent.start)throw Error('Child begins before parent');if(p.attachU&&parent.end>0){const t=Math.min(1,Math.max(0,(p.start-parent.start)/(parent.end-parent.start)));if(t*t*(3-2*t)<p.attachU-.00001)throw Error('Child detaches from growing parent');}}}
 if(branchIds.some(id=>!m.branches.some(b=>b.id===id)))throw Error('Missing semantic branch');
 return true;
}
