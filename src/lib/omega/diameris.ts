/** X187 DIAMERIS: stable character-class partition with alternating-run routing.
 * Experimental/unwired. Classical stable partition/rank-select ancestry;
 * no claim of new mathematics, global optimality or native-model fidelity.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000,FRAME=400000;
export const DIAMERIS_KEY='Decode payload first. JSON blocks [counts,A,B]. For each block, consume counts of Unicode code points (not grapheme clusters) alternately from A then B, starting with A; zero first count is allowed. Concatenate the consumed pieces and then the blocks, without separators. Both streams must be exhausted exactly. Preserve all characters; print only.\n';
export const DIAMERIS_OUTER_KEY='JSON blocks [counts,A,B]. For each block, consume counts of Unicode code points (not grapheme clusters) alternately from A then B, starting with A; zero first count is allowed. Concatenate the consumed pieces and then the blocks, without separators. Both streams must be exhausted exactly. Then decode the restored message by its instructions; print only its result.\n';
export type DiamerisClass='latin'|'digits'|'cyrillic';
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('DIAMERIS domain');}
function selected(c:string,kind:DiamerisClass){if(kind==='latin')return /^[A-Za-z]$/.test(c);if(kind==='digits')return /^[0-9]$/.test(c);if(kind==='cyrillic')return /^[\u0400-\u052f]$/.test(c);throw Error('DIAMERIS class');}
export function diamerisFold(source:string,kind:DiamerisClass,width:number){domain(source);if(!['latin','digits','cyrillic'].includes(kind)||![256,1024,50000].includes(width))throw Error('DIAMERIS plan');const chars=[...source],rows: [number[],string,string][]=[];
 for(let start=0;start<chars.length||start===0;start+=width){const block=chars.slice(start,start+width),counts=[0],a:string[]=[],b:string[]=[];let inA=true;for(const c of block){const yes=selected(c,kind);if(yes!==inA){counts.push(0);inA=yes;}counts[counts.length-1]++;(yes?a:b).push(c);}rows.push([counts,a.join(''),b.join('')]);}return JSON.stringify(rows);
}
export function diamerisUndo(folded:string){if(folded.length>FRAME||!isUtf8TransportStable(folded))throw Error('DIAMERIS frame');const rows:unknown=JSON.parse(folded);if(!Array.isArray(rows)||!rows.length||rows.length>196)throw Error('DIAMERIS blocks');const out:string[]=[];let units=0,totalCounts=0;
 for(const row of rows){if(!Array.isArray(row)||row.length!==3||!Array.isArray(row[0])||!row[0].length||row[0].length>50001||typeof row[1]!=='string'||typeof row[2]!=='string')throw Error('DIAMERIS row');const [counts,a,b]=row;units+=a.length+b.length;totalCounts+=counts.length;if(units>CAP||totalCounts>50200)throw Error('DIAMERIS size');const streams=[[...a],[...b]],at=[0,0];
  counts.forEach((n:unknown,i:number)=>{if(!Number.isSafeInteger(n)||(n as number)<(i?1:0)||(n as number)>CAP)throw Error('DIAMERIS count');const side=i%2,end=at[side]+(n as number);if(end>streams[side].length)throw Error('DIAMERIS underflow');out.push(streams[side].slice(at[side],end).join(''));at[side]=end;});if(at.some((n,i)=>n!==streams[i].length))throw Error('DIAMERIS leftover');
 }const source=out.join('');domain(source);return source;
}
export function diamerisPlans(source:string,enc:EncodingName='o200k_base'){domain(source);const plans:{kind:DiamerisClass;width:number;folded:string;message:string;tokens:number}[]=[];for(const kind of ['latin','digits','cyrillic'] as const)for(const width of [256,1024,50000]){const folded=diamerisFold(source,kind,width);if(plans.some(p=>p.folded===folded))continue;if(diamerisUndo(folded)!==source)throw Error('DIAMERIS inverse');const message=DIAMERIS_KEY+folded;plans.push({kind,width,folded,message,tokens:countTokensExact(message,enc)});}return plans.sort((a,b)=>a.tokens-b.tokens);}
export function diamerisRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>FRAME+2000)throw Error('DIAMERIS wire');if(message.startsWith(DIAMERIS_KEY))return diamerisUndo(parent(message.slice(DIAMERIS_KEY.length)));if(message.startsWith(DIAMERIS_OUTER_KEY))return parent(diamerisUndo(message.slice(DIAMERIS_OUTER_KEY.length)));throw Error('DIAMERIS key');}
