/**
 * X75 / t13 — BRACHYLOGIA on the lanes that carry instruction prose, and the control
 * that says what the frontier already pays for it.
 */
import * as fs from 'node:fs';
import { brachylogiaEncode } from '../../src/lib/omega/brachylogia';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = brachylogiaEncode(t, enc);
  const base = F.get(p) ?? r.frontierTokens;
  console.log(`${p.split('/').pop()!.padEnd(20)} X72 ${String(base).padStart(5)} frontier ${String(r.frontierTokens).padStart(5)} | brl ${String(r.messageTokens).padStart(5)} applied ${r.applied} clauses ${r.clausesRewritten} contract ${r.contractBefore}->${r.contractAfter} exact ${r.exact} | delta ${r.applied ? r.messageTokens - r.frontierTokens : 0} :: ${r.notes.slice(0,70)}`);
}
