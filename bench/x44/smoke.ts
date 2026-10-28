/** X44 registry smoke: reach the codec BY KEY, exactly as a reader does. */
import * as fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';
const enc:any='o200k_base';
const entries:any[] = codecEntries();
const e:any = entries.find(x=>x.key==='archetypon');
console.log('registry entries',entries.length);
console.log('archetypon found',!!e,'family',e?.family,'fidelity',e?.fidelity);
if(!e) process.exit(1);
const t=fs.readFileSync('bench/holdout/lic-mit.txt','utf8');
const r:any=await e.run(t,enc);
console.log('oneChat',r.oneChat,'outputTokens',countTokens(r.output,enc),'decoded===source',r.decoded===t,'note',r.note);
console.log('MESSAGE M from registry',r.oneChat);
if(r.decoded!==t||r.oneChat!==38) process.exit(1);
console.log('SMOKE PASS');
