import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
import { metatronEncode, METATRON_SYSTEM_PROMPT } from '../src/lib/omega/metatron';
import { signetEncode, SIGNET_SYSTEM_PROMPT } from '../src/lib/omega/signet';
import { strataEncode, STRATA_SYSTEM_PROMPT } from '../src/lib/omega/strata';
import { tesseraEncode, TESSERA_SYSTEM_PROMPT } from '../src/lib/omega/tessera';
import { axiomEncode, AXIOM_SYSTEM_PROMPT } from '../src/lib/omega/axiom';
import { quasarEncode, QUASAR_SYSTEM_PROMPT } from '../src/lib/omega/quasar';
import { plexusEncode, PLEXUS_SYSTEM_PROMPT } from '../src/lib/omega/plexus';
import { meridianEncode, MERIDIAN_SYSTEM_PROMPT } from '../src/lib/omega/meridian';
import { synizesisEncode } from '../src/lib/omega/synizesis';
const docs: Array<[string,string]> = [
  ['ho/lic-mit', fs.readFileSync('bench/holdout/lic-mit.txt','utf8')],
  ['ho/md-vite', fs.readFileSync('bench/holdout/md-vite.txt','utf8')],
  ['ho/md-react', fs.readFileSync('bench/holdout/md-react.txt','utf8')],
  ['tab/aapl', fs.readFileSync('bench/holdout-tab/aapl-2014.csv','utf8')],
  ['ops/stack', fs.readFileSync('bench/holdout-ops/node-stacktraces.txt','utf8')],
];
type A={k:string;wire:number;c:number;ex:boolean};
for (const [n,t] of docs) {
  const A: A[]=[];
  const add=(k:string,w:number,c:number,ex:boolean)=>A.push({k,wire:w,c,ex});
  try{const r=metatronEncode(t,ENC,{budgetMs:500});add('metatron',T(r.wire),r.messageTokens-T(r.wire),r.decoded===t);}catch{}
  try{const r=signetEncode(t,ENC);add('signet',r.outTokens,T(SIGNET_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=strataEncode(t,ENC);add('strata',r.outTokens,T(STRATA_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=tesseraEncode(t,ENC);add('tessera',r.outTokens,T(TESSERA_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=axiomEncode(t,ENC);add('axiom',r.outTokens,T(AXIOM_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=quasarEncode(t,ENC);add('quasar',r.outTokens,T(QUASAR_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=plexusEncode(t,ENC);add('plexus',r.outTokens,T(PLEXUS_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=meridianEncode(t,ENC);add('meridian',r.outTokens,T(MERIDIAN_SYSTEM_PROMPT),r.decoded===t);}catch{}
  try{const r=synizesisEncode(t,ENC,{budgetMs:500});add('synizesis',T(r.wire),r.contractTokens,r.decoded===t);}catch{}
  add('identity',T(t),0,true);
  const ex=A.filter(a=>a.ex);
  const rp=[...ex].sort((a,b)=>a.wire-b.wire)[0];
  const hp=[...ex].sort((a,b)=>(a.wire+a.c)-(b.wire+b.c))[0];
  console.log(n.padEnd(12),'raw',String(T(t)).padStart(5),'| ROUTER picks',(rp.k+' wire='+rp.wire).padEnd(24),'true cost',String(rp.wire+rp.c).padStart(5),'| HONEST',(hp.k+'='+(hp.wire+hp.c)).padEnd(22), rp.k!==hp.k?`*** MISROUTE: +${rp.wire+rp.c-(hp.wire+hp.c)} tokens`:'ok');
}
