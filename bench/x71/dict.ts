import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { veritasREncode } from '../../src/lib/omega/veritas-r';
import { veritasUEncode } from '../../src/lib/omega/veritas-u';
import { veritasNEncode } from '../../src/lib/omega/veritas-n';
import { veritasCEncode } from '../../src/lib/omega/veritas-c';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const F: Array<[string, any]> = [['V-R', veritasREncode], ['V-U', veritasUEncode], ['V-N', veritasNEncode], ['V-C', veritasCEncode]];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const out: string[] = [];
  for (const [n, fn] of F) {
    try {
      const r: any = fn(text, enc);
      const tok = r.outTokens ?? r.messageTokens ?? 0;
      out.push(`${n} ${tok}${r.decoded === text ? '' : '!INEXACT'}`);
    } catch (e) { out.push(`${n} ERR`); }
  }
  const t0 = Date.now(); const f: any = tagstackEncode(text, enc); const fms = Date.now() - t0;
  console.error(`${p}\n  raw ${raw} | frontier ${f.messageTokens} (${f.parentCodec}, ${fms}ms) | ${out.join(' | ')}`);
}
