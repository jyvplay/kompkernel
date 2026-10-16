// X19: full METATHESIS encode over a lane list. usage: node bundle.mjs <lane...>
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { metathesisEncode, metathesisDecode, metathesisPlan } from '@/lib/omega/metathesis';

const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2).filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const rawTok = countTokens(text, enc);
  let plan: any = null;
  try { const ps = metathesisPlan(text, enc); plan = ps.length ? ps.map(x=>`${x.form}/${x.join.kind}/${x.rows}x${x.cols}/ct${x.contractTokens}`).join(' ') : null; } catch {}
  let r: any;
  try { r = metathesisEncode(text, enc); }
  catch (e: any) { console.log(JSON.stringify({ file: f, status: 'ERR', err: String(e?.message ?? e).slice(0, 160) })); continue; }
  const decoded = metathesisDecode(r.wire, r.arm, r.plan, r.armState);
  console.log(JSON.stringify({
    file: f, raw: rawTok, M: r.messageTokens, base: r.baseTokens,
    exact: r.decoded === text, decodeExact: decoded === text,
    delta: r.messageTokens - r.baseTokens, mode: r.mode, arm: r.arm,
    plan, notes: r.notes,
  }));
}
