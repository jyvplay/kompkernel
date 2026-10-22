import fs from 'node:fs';
import { symplokeCandidates, symplokeCollapse } from '@/lib/omega/symploke';
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
const cands=symplokeCandidates(t);
const c=symplokeCollapse(t,cands);
console.log(JSON.stringify({lane:f.split('/').pop(),cands:cands.length,collapsed:c.stats.totalCollapsed,bare:c.stats.totalBare,
  len:t.length, deltaLen:t.length-c.text.length}));
