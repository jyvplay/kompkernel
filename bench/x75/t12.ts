/**
 * X75 / t12 — CONTRACT AUDIT over every lane: how many messages carry the long CHIRON
 * rules clause, and how many tokens of decoder text does each message pay in total?
 * This decides whether contract work is a 3-lane curiosity or a general ops gain.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const LONG = /Every new \S+ letter before ¶ starts a rule/;
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(t, enc);
  const msg: string = r.message;
  const prose = msg.split('\n').filter((l: string) => l.length > 40 && /\.$/.test(l.trim()) && !/\d/.test(l));
  const proseTok = prose.reduce((a: number, l: string) => a + T(l, enc), 0);
  const hasLong = LONG.test(msg);
  rows.push({ path: p, tokens: r.messageTokens, proseTok, hasLong, parent: r.parentCodec });
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(r.messageTokens).padStart(5)} prose ${String(proseTok).padStart(4)} ${hasLong ? 'LONG-CLAUSE' : ''} ${r.parentCodec}`);
  fs.writeFileSync('bench/x75/receipts/contract-audit.json', JSON.stringify({ rows, longClauseLanes: rows.filter((r) => r.hasLong).length, proseTotal: rows.reduce((a, b) => a + b.proseTok, 0) }, null, 1) + '\n');
}
console.log(`\nlanes with the long clause: ${rows.filter((r) => r.hasLong).length}/${rows.length}; prose total ${rows.reduce((a, b) => a + b.proseTok, 0)} of ${rows.reduce((a, b) => a + b.tokens, 0)} tokens`);
