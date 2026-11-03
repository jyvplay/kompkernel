import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { HYLE_WORK } from '../../src/lib/omega/hyle';
HYLE_WORK.enabled = true;
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  (HYLE_WORK as any).__s?.clear?.();
  const t0 = Date.now();
  const r: any = tagstackEncode(t, enc);
  const ms = Date.now() - t0;
  console.log(`${p.split('/').pop().padEnd(20)} ${String(ms).padStart(6)}ms tokens ${r.messageTokens} | hyle calls ${HYLE_WORK.calls} unique ${HYLE_WORK.unique} chars ${HYLE_WORK.chars} dupChars ${HYLE_WORK.dupChars} (${(100 * HYLE_WORK.dupChars / Math.max(1, HYLE_WORK.chars)).toFixed(1)}% duplicated)`);
}
