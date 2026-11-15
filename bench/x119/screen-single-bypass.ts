/** X119: per-occurrence SINGLE-reference bypass (keep the rule). Zero encoder calls. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);
const rows=fs.readFileSync('bench/x119/receipts/frontier.jsonl','utf8').trim().split('\n').map(JSON.parse);
let base=0,after=0,wins=0;const out=[];
for(const r of rows){let m=r.message;if(r.path.endsWith('/ls-l-real.txt'))m=fs.readFileSync('bench/x118/receipts/regate-lsl-message.txt','utf8');
 const b=T(m);base+=b;const w=m.indexOf(CHIRON_START),cut=m.indexOf(CHIRON_SEP,w+1);let best=m,bt=b,acc=0;
 if(w>=0&&cut>=0){const tape=m.slice(w+1,cut),body=m.slice(cut+1),prefix=m.slice(0,w);const script=CHIRON_SCRIPTS.find(s=>tape[0]&&chironInScript(s,tape[0].codePointAt(0)!));const parsed=script?chironParseTape(tape,script):null;const ref=chironDecode(m.slice(w));
  if(parsed){const vals=new Map<string,string>();for(const p of parsed){if(p.raw.startsWith('×')||p.raw.startsWith('…'))continue;let v:string;try{v=chironDecode(CHIRON_START+tape+CHIRON_SEP+p.glyph);}catch{continue;}if(v===p.glyph||v.length>240)continue;if([...v].some(ch=>chironInScript(script!,ch.codePointAt(0)!)))continue;vals.set(p.glyph,v);}
   type S={i:number;v:string;d:number};const sites:S[]=[];
   for(let i=0;i<body.length;i++){const v=vals.get(body[i]!);if(!v)continue;const c=prefix+CHIRON_START+tape+CHIRON_SEP+body.slice(0,i)+v+body.slice(i+1);const d=T(c)-b;if(d<0){let ex=false;try{ex=chironDecode(c.slice(w))===ref;}catch{}if(ex)sites.push({i,v,d});}}
   sites.sort((a,b)=>a.d-b.d||a.i-b.i);let cur=b,cb=body;const chosen:S[]=[];
   for(const s of sites){if(chosen.some(c=>Math.abs(c.i-s.i)<1))continue;const trial=chosen.concat([s]).sort((a,b)=>b.i-a.i);let nb=body;for(const x of trial)nb=nb.slice(0,x.i)+x.v+nb.slice(x.i+1);const c=prefix+CHIRON_START+tape+CHIRON_SEP+nb;const t=T(c);if(t<cur){let ex=false;try{ex=chironDecode(c.slice(w))===ref;}catch{}if(ex){cur=t;cb=nb;chosen.push(s);}}}
   if(cur<bt){bt=cur;best=prefix+CHIRON_START+tape+CHIRON_SEP+cb;acc=chosen.length;}
  }}
 after+=bt;if(bt<b)wins++;out.push({path:r.path,base:b,after:bt,delta:bt-b,acc});console.log(`${r.path.split('/').pop()!.padEnd(22)} ${b} -> ${bt} Δ=${bt-b} acc=${acc}`);
}
fs.writeFileSync('bench/x119/receipts/screen-single-bypass.json',JSON.stringify({totals:{base,after,delta:after-base,wins},rows:out},null,2)+'\n');
console.log(`TOTAL ${base} -> ${after} Δ=${after-base} wins=${wins}/29`);
