/**
 * X75 / t10 — KEYLINE priced on the lanes that carry the long contract, and checked
 * byte-for-byte against the frontier message it claims to reconstruct.
 */
import * as fs from 'node:fs';
import { keylineEncode, keylineUnpack } from '../../src/lib/omega/keyline';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = keylineEncode(t, enc);
  const base = F.get(p) ?? r.frontierTokens;
  console.log(`${p.split('/').pop()!.padEnd(20)} X72 ${String(base).padStart(5)} frontier ${String(r.frontierTokens).padStart(5)} | keyline ${String(r.messageTokens).padStart(5)} applied ${r.applied} hdr ${r.headerTokens} key ${r.keyTokens} occ ${r.occurrences} | delta ${r.applied ? r.messageTokens - r.frontierTokens : 0} :: ${r.notes.slice(0, 60)}`);
}
