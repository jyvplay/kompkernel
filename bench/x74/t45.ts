/**
 * THE LOCAL LEADERS LIST, computed and not asserted.
 *
 * For every lane: the frontier's number, that lane's unreadable floor (brotli -q11 in
 * o200k units), the ratio, and the category. A "local leader" is the codec that wins
 * a lane outright; this table records which family leads each structural class so the
 * next turn can aim at a class instead of at a lane.
 */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const cat: Record<string, string> = {};
const lanes: string[] = process.argv.slice(2);
const rows: any[] = [];
for (const p of lanes) {
  const t = fs.readFileSync(p, 'utf8');
  const br = zlib.brotliCompressSync(Buffer.from(t, 'utf8'), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  const floor = Math.ceil((br * 8) / 14.8);
  const r: any = tagstackEncode(t, enc);
  const c = /(?:holdout-x4\d|holdout)-?(work|tbl|x40|x41|x42b?)?/.exec(p)?.[1] ?? 'misc';
  rows.push({ path: p, cat: c, raw: T(t, enc), tokens: r.messageTokens, floor, ratio: +(r.messageTokens / floor).toFixed(2), arm: String(r.notes).split(' ')[0] });
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(c).padEnd(5)} raw ${String(T(t, enc)).padStart(5)} tok ${String(r.messageTokens).padStart(5)} floor ${String(floor).padStart(5)} x${(r.messageTokens / floor).toFixed(2)} ${String(r.notes).split(' ')[0]}`);
}
fs.writeFileSync('bench/x74/receipts/leaders.json', JSON.stringify({ enc, rows }, null, 1) + '\n');
