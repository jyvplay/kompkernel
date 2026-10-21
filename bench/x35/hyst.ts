import fs from 'node:fs';
import { oikonomiaEncode, oikonomiaDecode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP, chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { PYKNOSIS_ALPHABET, PYKNOSIS_MARKERS, pyknosisUndo } from '@/lib/omega/pyknosis';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const RUN_RE=/[0-9a-f]+/g;
function rev(a:string){const m=new Map<string,string>();for(let i=0;i<16;i++)m.set(a[i],HEX[i]);return m;}
function fwdMap(a:string){const m=new Map<string,string>();for(let i=0;i<16;i++)m.set(HEX[i],a[i]);return m;}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(text,enc);
  const wire=String(r.wire); const cut=wire.indexOf(CHIRON_SEP);
  if(cut<0){console.log(f.split('/').pop(),'no sep');continue;}
  const head=wire.slice(0,cut+1), tape=wire.slice(cut+1);
  const back=rev(PYKNOSIS_ALPHABET);
  let marker='';
  for(const c of PYKNOSIS_MARKERS) if(!wire.includes(c)){marker=c;break;}
  if(!marker){console.log(f.split('/').pop(),'no marker');continue;}
  // find runs in the tape
  const runs:Array<{s:number;e:number}>=[];
  RUN_RE.lastIndex=0; let m:RegExpExecArray|null;
  while((m=RUN_RE.exec(tape))){
    if(m[0].length<8)continue;
    const b=tape[m.index-1], a=tape[m.index+m[0].length];
    if(b&&/[0-9a-f]/.test(b))continue;
    if(a&&/[0-9a-f]/.test(a))continue;
    if(a!==undefined&&back.has(a))continue;
    runs.push({s:m.index,e:m.index+m[0].length});
  }
  if(!runs.length){console.log(f.split('/').pop()!.padEnd(24),'wire',r.messageTokens,'| no tape hex runs');continue;}
  const fm=fwdMap(PYKNOSIS_ALPHABET);
  let nt='';let prev=0;let chars=0,est=0;
  for(const q of runs){
    const src=tape.slice(q.s,q.e);
    let o='';for(const c of src)o+=fm.get(c)??c;
    est+=countTokens(src,enc)-countTokens(marker+o,enc);
    chars+=src.length;
    nt+=tape.slice(prev,q.s)+marker+o; prev=q.e;
  }
  nt+=tape.slice(prev);
  const clause=`Then ${marker}: ${PYKNOSIS_ALPHABET} mean ${HEX}.`;
  const clauseTok=countTokens(' '+clause,enc)-countTokens(' ',enc);
  const newWire=head+nt;
  const ntTok=countTokens(newWire,enc);
  // round trip
  let ok=false,got='';
  try{
    if(r.winner==='bootstrap'){
      got=symplokeDecode(newWire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)});
    }else{
      got=oikonomiaDecode(newWire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode});
    }
    got=pyknosisUndo(got,PYKNOSIS_ALPHABET,marker);
    ok=got===text;
  }catch(e){ok=false;got='ERR '+(e as Error).message.slice(0,50);}
  console.log(f.split('/').pop()!.padEnd(24),'wire',String(r.messageTokens).padStart(5),
    '| tapeRuns',String(runs.length).padStart(3),'chars',String(chars).padStart(4),
    'rawSave',String(est).padStart(4),'| newWire',String(ntTok+clauseTok).padStart(5),
    '=> NET',String(ntTok+clauseTok-r.messageTokens).padStart(5),
    ok?'EXACT':('FAIL '+got.slice(0,40)));
}
