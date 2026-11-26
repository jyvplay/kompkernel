import {desmiPlans,desmiUndo,DESMI_KEY} from '../../src/lib/omega/desmi';
import {geitonPlans,geitonUndo,GEITON_KEY} from '../../src/lib/omega/geiton';
import {apousiaPlans,apousiaUndo,apousiaKey} from '../../src/lib/omega/apousia';
import {diadochiPlans,diadochiUndo,DIADOCHI_KEY} from '../../src/lib/omega/diadochi';
import {symfrazPlans,symfrazUndo} from '../../src/lib/omega/symfraz';
import {ropiPlans,ropiTransform,ropiKey} from '../../src/lib/omega/ropi';
export const families=['desmi','geiton','apousia','diadochi','symfraz','ropi'] as const;
export function plans(source:string,family:string):any[]{switch(family){case 'desmi':return desmiPlans(source).map(p=>({...p,key:DESMI_KEY}));case 'geiton':return geitonPlans(source).map(p=>({...p,key:GEITON_KEY}));case 'apousia':return apousiaPlans(source).map(p=>({...p,key:apousiaKey(p.k)}));case 'diadochi':return diadochiPlans(source).map(p=>({...p,key:DIADOCHI_KEY}));case 'symfraz':return symfrazPlans(source).map(p=>({...p,key:p.contract}));case 'ropi':return ropiPlans(source).map(p=>({...p,key:ropiKey(p.n,p.k)}));default:throw Error('family');}}
export function undo(folded:string,family:string,p:any){switch(family){case 'desmi':return desmiUndo(folded);case 'geiton':return geitonUndo(folded);case 'apousia':return apousiaUndo(folded,p.k);case 'diadochi':return diadochiUndo(folded);case 'symfraz':return symfrazUndo(folded,p.k);case 'ropi':return ropiTransform(folded,p.n,p.k,true);default:throw Error('family');}}
