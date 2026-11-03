import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const RE = /(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):(\d\d)/;
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8').replace(/\n$/, '');
  const lines = text.split('\n');
  const raw = T(text);
  let prev: number | null = null; let base = '';
  const out: string[] = []; let hit = 0;
  for (const l of lines) {
    const m = l.match(RE);
    if (!m) { out.push(l); continue; }
    hit++;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
    if (prev === null) { base = m[0]; out.push(l); } else {
      const d = Math.round(t - prev);
      out.push(l.slice(0, m.index) + (d >= 0 ? '+' + d : String(d)) + l.slice(m.index! + m[0].length));
    }
    prev = t;
  }
  const wire = out.join('\n');
  const t0 = Date.now(); const f: any = tagstackEncode(text, enc); const fms = Date.now() - t0;
  console.error(`${p}\n  lines ${lines.length} ts-hits ${hit} | raw ${raw} | ts-delta wire ${T(wire)} (contract ~12) | frontier ${f.messageTokens} (${f.parentCodec}, ${fms}ms) | delta vs frontier ${f.messageTokens - (T(wire) + 12)}`);
}
