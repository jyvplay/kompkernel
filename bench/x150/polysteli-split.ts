// Experimental segmentation of ΠΟΛΥΣΤΗΛΗ's existing geometry, not a new mechanism.
// Uses maximal consecutive runs sharing the first four right edges. A whole-run
// inverse check prevents data loss; the 4-edge census is only a fit prefilter.
import {polysteliTransform,polysteliUndo} from '../../src/lib/omega/polysteli';
export function splitPlan(text:string):{text:string;grids:number}|null{
 if(text.length>400000 || text.includes('॥') || text.includes('\r'))return null;
 const lines=text.split('\n');if(lines.length>2000)return null;
 const sig=(line:string)=>{
  if(line.includes('\t'))return null;
  const fields=[...line.matchAll(/\S+/g)];if(fields.length<4 || fields[0]!.index!==0)return null;
  return fields.slice(0,4).map(m=>m.index!+m[0].length).join(',');
 };
 const out:string[]=[];let i=0,grids=0;
 while(i<lines.length){
  const signature=sig(lines[i]!);let j=i+1;
  if(signature!==null)while(j<lines.length && sig(lines[j]!)===signature)j++;
  if(signature!==null&&j-i>=6){
   const original=lines.slice(i,j).join('\n'), candidate=polysteliTransform(original);
   if(candidate && candidate.text.startsWith('॥') && polysteliUndo(candidate.text)===original){
    out.push(...candidate.text.split('\n'));grids+=candidate.markers.length;i=j;continue;
   }
  }
  out.push(...lines.slice(i,j));i=j;
 }
 const folded=out.join('\n');if(!grids||polysteliUndo(folded)!==text)return null;
 return {text:folded,grids};
}
