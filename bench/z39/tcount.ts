import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const t = fs.readFileSync('/home/user/z31/docs/pino-10.4.0/package/docs/api.md','utf8');
let t0=Date.now(); let n=0; for (const line of t.split('\n')) { n+=countTokens(line+'\n','o200k_base'); } console.log('lines sum',n,'ms',Date.now()-t0);
t0=Date.now(); console.log('full', countTokens(t,'o200k_base'), 'ms', Date.now()-t0);
