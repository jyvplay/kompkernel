// Z38: token split of a VERITAS-M wire into sentinel+legend line, header entries, terminator, body.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasMEncode } from '@/lib/omega/veritas-m';
import { VXR_LEGEND } from '@/lib/omega/veritas-r';
import { TERMINATOR } from '@/lib/omega/veritas-u';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = veritasMEncode(text);
  const w = r.wire;
  const i0 = w.indexOf(VXR_LEGEND);
  const legendEnd = i0 + VXR_LEGEND.length + 1; // after legend newline
  const ti = w.indexOf('\n' + TERMINATOR + '\n');
  const head = w.slice(legendEnd, ti + 1);
  const body = w.slice(ti + 1 + TERMINATOR.length + 1);
  const pre = w.slice(0, legendEnd);
  const c = (s: string) => countTokens(s, 'o200k_base');
  console.log(JSON.stringify({ f: f.split('/').pop(), in: r.inTokens, out: r.outTokens, entries: r.entries, preTok: c(pre), headTok: c(head), termTok: c(TERMINATOR), bodyTok: c(body), sumCheck: c(pre) + c(head) + c(TERMINATOR + '\n') + c(body), exact: r.exact }));
}
