/** PINAKAS (X178), experimental and unwired: Schensted row-insertion tape.
 * Classical Robinson–Schensted correspondence for words, NOT new mathematics.
 * Unlike BBWT this transmits insertion rows and the recording row sequence;
 * decoding is reverse bumping, not LF cycles. Native chat is unverified.
 */
import {countTokensExact,type EncodingName} from './bpe';
export const PINAKAS_CAP=50000;
export type PinakasMode='space'|'LF';
export type PinakasBlock={trace:number[];rows:string[][]};
function domain(s:string){if(s.length>PINAKAS_CAP||/[^\x00-\x7f]/.test(s))throw Error('PINAKAS source domain');}
function spec(n:number,mode:PinakasMode){if(![32,128].includes(n)||!['space','LF'].includes(mode))throw Error('PINAKAS spec');}
export function pinakasInsert(fields:string[]):PinakasBlock{
 if(!fields.length||fields.length>128||fields.some(x=>typeof x!=='string'||/[^\x00-\x7f]/.test(x)))throw Error('PINAKAS fields');
 const rows:string[][]=[],trace:number[]=[];
 for(const field of fields){let x=field;
  for(let r=0;;r++){if(!rows[r])rows.push([]);const row=rows[r];let lo=0,hi=row.length;
   while(lo<hi){const m=(lo+hi)>>>1;if(row[m]>x)hi=m;else lo=m+1;}
   if(lo===row.length){row.push(x);trace.push(r);break;}
   const displaced=row[lo];row[lo]=x;x=displaced;
  }
 }return {trace,rows};
}
export function pinakasRemove(value:unknown):string[]{
 if(!Array.isArray(value)||value.length!==2||!Array.isArray(value[0])||!Array.isArray(value[1]))throw Error('PINAKAS block');
 const [trace,input]=value;if(!trace.length||trace.length>128||!input.length||input.length>128)throw Error('PINAKAS size');
 let cells=0,units=0;const rows:string[][]=input.map((r:unknown)=>{
  if(!Array.isArray(r)||!r.length||r.length>128||r.some(x=>typeof x!=='string'||/[^\x00-\x7f]/.test(x)))throw Error('PINAKAS row');
  cells+=r.length;for(const x of r)units+=x.length;if(cells>128||units>PINAKAS_CAP)throw Error('PINAKAS bounds');return r.slice();
 });
 if(cells!==trace.length)throw Error('PINAKAS cardinality');
 for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
  if(c&&rows[r][c-1]>rows[r][c])throw Error('PINAKAS row order');
  if(r&&(c>=rows[r-1].length||rows[r-1][c]>=rows[r][c]))throw Error('PINAKAS column order');
 }
 const out:string[]=[];
 for(let i=trace.length-1;i>=0;i--){const r=trace[i];
  if(!Number.isInteger(r)||r<0||r>=rows.length||!rows[r].length||rows[r].length<=(rows[r+1]?.length??0))throw Error('PINAKAS corner');
  let x=rows[r].pop()!;
  for(let j=r-1;j>=0;j--){const row=rows[j];let k=row.length-1;while(k>=0&&row[k]>=x)k--;if(k<0)throw Error('PINAKAS bump');const y=row[k];row[k]=x;x=y;}
  out.push(x);
 }
 if(rows.some(r=>r.length))throw Error('PINAKAS residual');out.reverse();
 // Reject malformed recording words, not just examples that happen to drain.
 const check=pinakasInsert(out);if(JSON.stringify([check.trace,check.rows])!==JSON.stringify(value))throw Error('PINAKAS noncanonical');
 return out;
}
export function pinakasKey(n:number,mode:PinakasMode){spec(n,mode);return `Decode payload first. Each line is JSON [digit string,tableau rows]. Split the digit string into equal-width decimal row indices, using as many digits as the largest row index (rows count from 0); retain leading zeros. For each line, process indices backwards: remove the last field of that row as x; in each preceding row, bottom to top, replace its rightmost field strictly less than x with x and carry the replaced field as x. Compare fields in ASCII lexicographic order. Collect final x values, reverse their list. Concatenate block lists and join fields with ${mode==='space'?'one ASCII space':'LF'}. Blocks have ${n} fields, except the last may be shorter. Empty fields are retained. Print only the exact joined text, with no added newline.\n`;}
export function pinakasFold(source:string,n:number,mode:PinakasMode){domain(source);spec(n,mode);const fields=source.split(mode==='space'?' ':'\n'),lines:string[]=[];
 for(let i=0;i<fields.length;i+=n){const b=pinakasInsert(fields.slice(i,i+n));const w=String(b.rows.length-1).length;lines.push(JSON.stringify([b.trace.map(r=>String(r).padStart(w,'0')).join(''),b.rows]));}return lines.join('\n');
}
export function pinakasUndo(folded:string,n:number,mode:PinakasMode){spec(n,mode);if(folded.length>500000||/[^\x00-\x7f]/.test(folded))throw Error('PINAKAS wire domain');const lines=folded.split('\n'),out:string[]=[];let units=0;
 if(lines.length>1563)throw Error('PINAKAS blocks');
 for(let i=0;i<lines.length;i++){const v=JSON.parse(lines[i]);if(!Array.isArray(v)||v.length!==2||typeof v[0]!=='string'||!Array.isArray(v[1])||v[1].length<1||v[1].length>128||!/^[0-9]{1,384}$/.test(v[0]))throw Error('PINAKAS trace frame');const w=String(v[1].length-1).length;if(v[0].length%w)throw Error('PINAKAS trace width');const trace=Array.from({length:v[0].length/w},(_,j)=>Number(v[0].slice(j*w,(j+1)*w)));const fields=pinakasRemove([trace,v[1]]);if(fields.length>n||(i<lines.length-1&&fields.length!==n)||fields.some(f=>f.includes(mode==='space'?' ':'\n')))throw Error('PINAKAS partition');
  for(const f of fields){units+=f.length+(out.length?1:0);if(units>PINAKAS_CAP)throw Error('PINAKAS expansion');out.push(f);}
 }const source=out.join(mode==='space'?' ':'\n');domain(source);return source;
}
export function pinakasPlans(source:string,enc:EncodingName='o200k_base'){domain(source);return ([32,128]).flatMap(n=>(['space','LF'] as const).map(mode=>{
 const folded=pinakasFold(source,n,mode),contract=pinakasKey(n,mode);if(pinakasUndo(folded,n,mode)!==source)throw Error('PINAKAS inverse');return {n,mode,folded,contract,message:contract+folded,tokens:countTokensExact(contract+folded,enc)};
})).sort((a,b)=>a.tokens-b.tokens||a.n-b.n||a.mode.localeCompare(b.mode));}
export function pinakasRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>502000)throw Error('PINAKAS message cap');for(const n of [32,128])for(const mode of ['space','LF'] as const){const k=pinakasKey(n,mode);if(message.startsWith(k))return pinakasUndo(parent(message.slice(k.length)),n,mode);}throw Error('PINAKAS contract');}
