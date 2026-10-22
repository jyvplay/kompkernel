import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.F||'bench/holdout-ops/ls-full-iso.txt','utf8');
const r:any=synkopeEncode(t,enc);
console.log('msg',r.messageTokens);
