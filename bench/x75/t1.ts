/**
 * X75 / t1 — WHERE DO THE TOKENS ACTUALLY GO?
 *
 * The frontier returns one number and a short note. This decomposes that number on the
 * operations lanes into (a) the decoder key the codec emits and (b) the wire body, so
 * the next mechanic can be aimed at the part that carries the mass.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const lines: string[] = r.message.split('\n');
  let cut = 0;
  for (let i = 0; i < lines.length; i++) { cut = i + 1; if (/\d/.test(lines[i]) && lines[i].length > 20) break; }
  const head = t.split('\n')[0];
  console.log(`${p.split('/').pop()!.padEnd(20)} tok ${String(r.messageTokens).padStart(5)} (X72 ${String(F.get(p)).padStart(5)}) key~${String(T(lines.slice(0, cut).join('\n'), enc)).padStart(4)} body~${String(T(lines.slice(cut).join('\n'), enc)).padStart(5)} | header ${String(T(head, enc)).padStart(3)} | ${String(r.notes).split(' ')[0]}`);
}
