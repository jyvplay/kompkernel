import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  tagstackFrontier(t, enc);
  console.log(`${p.split('/').pop()} ${Date.now() - t0} ms`);
}
