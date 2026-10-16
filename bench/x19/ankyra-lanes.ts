// X19: full ANKYRA encode over a lane list. usage: node bundle.mjs <lane...>
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { ankyraEncode, ankyraDecode } from '@/lib/omega/ankyra';

const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2).filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const rawTok = countTokens(text, enc);
  let r: any;
  try { r = ankyraEncode(text, enc); }
  catch (e: any) { console.log(JSON.stringify({ file: f, status: 'ERR', err: String(e?.message ?? e).slice(0, 140) })); continue; }
  const decoded = ankyraDecode(r.wire, r.arm, r.rule, r.armState);
  console.log(JSON.stringify({
    file: f, raw: rawTok, M: r.messageTokens, base: r.baseTokens,
    exact: r.decoded === text, decodeExact: decoded === text,
    delta: r.messageTokens - r.baseTokens, vsRaw: r.messageTokens - rawTok,
    mode: r.mode, arm: r.arm,
    rule: r.rule ? `${r.rule.cls}/${r.rule.dir}/${JSON.stringify(r.rule.y)} k=${r.rule.k} m=${r.rule.m}` : '-',
    rawDelta: r.rule?.rawDelta ?? 0, contract: r.rule?.contractTokens ?? 0, notes: r.notes,
  }));
}
