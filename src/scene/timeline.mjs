export const chapters = [
 {id:'opening',start:0,end:.07,project:null,label:'An engineering history',index:'00'},
 {id:'foundations',start:.07,end:.16,project:'foundations',label:'Foundations',index:'01'},
 {id:'reverse-engineering',start:.16,end:.28,project:'reverse-engineering',label:'Below the surface',index:'02'},
 {id:'professional',start:.28,end:.40,project:'griffsoft',label:'Professional engineering',index:'03'},
 {id:'infrastructure',start:.40,end:.51,project:'shaiya',label:'Infrastructure',index:'04'},
 {id:'transition',start:.51,end:.57,project:null,label:'A new direction',index:'05'},
 {id:'applied-ai',start:.57,end:.73,project:'papai-rag',label:'Applied AI',index:'06'},
 {id:'llm-systems',start:.73,end:.84,project:'cridellmapi',label:'LLM systems',index:'07'},
 {id:'research',start:.84,end:.94,project:'cohort-search',label:'The current frontier',index:'08'},
 {id:'ending',start:.94,end:1.001,project:null,label:'Still growing',index:'09'}
];
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
export function chapterAt(p){return chapters.find(c=>p>=c.start&&p<c.end)??chapters[chapters.length-1]}
export function evaluateProgress(p){p=clamp(p);const chapter=chapterAt(p);return {progress:p,chapter,growth:p<.07?1-smooth(p/.07)*.89:clamp(p+.04),rotation:-.12+p*.46,focus:chapter.id==='transition'?5:12};}
export function growthAt(p,start,end){return end===0?1:smooth((p-start)/(end-start));}
export const cameraKeys=[
 {p:0,pos:[16,10,25],target:[-2.3,6,0],lens:48},
 {p:.035,pos:[13,8,23],target:[-2.1,6,0],lens:50},
 {p:.085,pos:[6,2.7,10],target:[-1.2,1.2,0],lens:48},
 {p:.145,pos:[5.8,3,10],target:[-1.2,1.5,0],lens:49},
 {p:.185,pos:[-6,5.4,12.5],target:[-2.9,4.2,0],lens:50},
 {p:.255,pos:[-5,5.7,12],target:[-2.9,4.5,0],lens:50},
 {p:.305,pos:[8,6.8,12.5],target:[1.1,5.9,-.4],lens:48},
 {p:.375,pos:[8.8,7,12],target:[1.2,6.1,-.4],lens:49},
 {p:.43,pos:[-7,8.5,11],target:[-2.8,6.8,-1.2],lens:48},
 {p:.49,pos:[-7.2,8.8,10.6],target:[-2.7,7,-1.2],lens:49},
 {p:.535,pos:[1.8,7.9,5],target:[-.8,7.3,0],lens:44},
 {p:.595,pos:[-8,10,12],target:[-3.5,8.4,.2],lens:48},
 {p:.705,pos:[-6.5,10.8,11],target:[-3.1,8.7,.2],lens:50},
 {p:.76,pos:[8.5,11.4,12],target:[1.2,9.5,.6],lens:49},
 {p:.815,pos:[9.1,12,11.5],target:[1.2,9.8,.6],lens:50},
 {p:.865,pos:[-3.5,13.2,11],target:[-1.2,10.8,-.3],lens:48},
 {p:.92,pos:[-3,13.8,12],target:[-1.1,11,-.3],lens:48},
 {p:1,pos:[15,12,29],target:[-2,6,0],lens:48}
];
// Separately authored portrait compositions reserve the lower third for reading.
export const portraitKeys=cameraKeys.map((k,i)=>({p:k.p,lens:45,
 pos:([[10,9,40],[9,8,38],[4,4,20],[4,4.2,20],[-4,7,23],[-3,7,23],[7,9,24],[7.5,9.2,24],[-6,10,23],[-5.5,10.5,23],[2,10,18],[-6,12,24],[-5.5,12.4,24],[7,13,24],[7.5,13.3,24],[-2,15,23],[-1,15.3,24],[10,10,41]])[i],
 target:([[.3,2,0],[.3,2,0],[0,-1,0],[0,-.7,0],[-2,1.8,0],[-2,2,0],[2,3.2,0],[2,3.4,0],[-1.6,4,-1],[-1.5,4.2,-1],[.5,4.6,0],[-2,5.4,0],[-2,5.7,0],[2,6.7,0],[2,7,0],[0,8.2,0],[0,8.4,0],[.3,2,0]])[i]
}));
