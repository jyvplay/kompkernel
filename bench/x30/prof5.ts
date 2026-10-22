import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
const t=fs.readFileSync('bench/holdout-work/kb-article.txt','utf8');
const r:any=synkopeEncode(t,enc);
console.log('msg',r.messageTokens);
