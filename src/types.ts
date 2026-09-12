export type BranchId = 'foundations'|'reverse-engineering'|'professional'|'infrastructure'|'applied-ai'|'llm-systems'|'research';
export type Project = { id:string; title:string; projectName:string; category:string; branchId:BranchId; shortDescription:string; technologies:string[]; achievements:string[]; metrics:{value:number;unit:string;qualifier:string;source:string}[]; relatedProjects:string[]; links:{label:string;url:string}[]; status:string; html:string };
export type Quality = 'auto'|'high'|'low';
export type TreeManifest = { version:number; atlasWidth:number; pathCount:number; atlas:number[]; paths:{group:BranchId;start:number;end:number;parent:number;level:number}[]; branches:{id:BranchId;anchor:[number,number,number]}[] };
