/** X157 ISOSTATHMIA (balance): unified-diff hunk conservation.
 * Derive both counts from signed body records and new start from cumulative
 * insertion/deletion balance. Classical format entailment, optional/unwired.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const ISOSTATHMIA_KEY='Decode first. @A@ marks a unified-diff hunk at old start A. Count its following body lines: space/minus for old, space/plus for new, excluding backslash notes. New start=A+prior net insertions in this file+(old count==0)-(new count==0). Restore @@ -A,old +newstart,new @@, omitting ,1 counts; keep suffix and all other bytes. Print only.\n';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('ISOSTATHMIA domain');}
function counts(lines:string[]){let old=0,neo=0;for(const l of lines){if(l.startsWith(' ')){old++;neo++;}else if(l.startsWith('-'))old++;else if(l.startsWith('+'))neo++;else if(l!=='\\ No newline at end of file'&&l!=='\\ No newline at end of file\r')throw Error('ISOSTATHMIA body');}if(!old&&!neo)throw Error('ISOSTATHMIA empty');return {old,neo};}
const num=(s:string)=>{if(!/^(0|[1-9][0-9]{0,8})$/.test(s))throw Error('ISOSTATHMIA number');return Number(s);};
const range=(a:number,n:number)=>`${a}${n===1?'':','+n}`;
export function isostathmiaUndo(folded:string){domain(folded);const lines=folded.split('\n'),out:string[]=[];let balance=0,active=false;
 for(let i=0;i<lines.length;i++){const line=lines[i];if(line.startsWith('diff --git ')){balance=0;active=true;out.push(line);continue;}if(!line.startsWith('@')){out.push(line);continue;}
 const m=/^@(\d+)@(.*)$/.exec(line);if(!active||!m)throw Error('ISOSTATHMIA frame');const a=num(m[1]);let j=i+1;while(j<lines.length&&/^[ +\\-]/.test(lines[j]))j++;const k=j-i-1;const body=lines.slice(i+1,j),c=counts(body),b=a+balance+Number(c.old===0)-Number(c.neo===0);if(b<0||b>999999999||(c.old>0&&a===0)||(c.neo>0&&b===0))throw Error('ISOSTATHMIA starts');out.push(`@@ -${range(a,c.old)} +${range(b,c.neo)} @@${m[2]}`,...body);balance+=c.neo-c.old;i+=k;
 }const result=out.join('\n');domain(result);return result;
}
export function isostathmiaPlan(source:string){try{domain(source);const lines=source.split('\n'),out:string[]=[];let active=false,balance=0,hunks=0;
 for(let i=0;i<lines.length;i++){const line=lines[i];if(line.startsWith('diff --git ')){active=true;balance=0;out.push(line);continue;}if(!line.startsWith('@')){out.push(line);continue;}
 const m=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);if(!active||!m)return null;const a=num(m[1]),oc=m[2]===undefined?1:num(m[2]),b=num(m[3]),nc=m[4]===undefined?1:num(m[4]);if((oc===1&&m[2]!==undefined)||(nc===1&&m[4]!==undefined))return null;
 let o=0,n=0,j=i+1;for(;o<oc||n<nc;j++){const l=lines[j];if(l===undefined)return null;if(l.startsWith(' ')){o++;n++;}else if(l.startsWith('-'))o++;else if(l.startsWith('+'))n++;else if(l!=='\\ No newline at end of file'&&l!=='\\ No newline at end of file\r')return null;if(o>oc||n>nc)return null;}
 while(lines[j]==='\\ No newline at end of file'||lines[j]==='\\ No newline at end of file\r')j++;
 if(!o&&!n||b!==a+balance+Number(o===0)-Number(n===0))return null;
 out.push(`@${a}@${m[5]}`,...lines.slice(i+1,j));balance+=n-o;hunks++;i=j-1;
 }if(!hunks)return null;const folded=out.join('\n');if(isostathmiaUndo(folded)!==source)return null;return {folded,hunks};}catch{return null;}}
export function isostathmiaRead(message:string,readParent:(s:string)=>string){domain(message);if(!message.startsWith(ISOSTATHMIA_KEY))throw Error('ISOSTATHMIA key');return isostathmiaUndo(readParent(message.slice(ISOSTATHMIA_KEY.length)));}
export function isostathmiaCandidate(source:string,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){try{domain(source);domain(parent);const message=ISOSTATHMIA_KEY+parent;if(isostathmiaRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc)};}catch{return null;}}
