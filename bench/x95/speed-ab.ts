/**
 * X95 — SPEED A/B HARNESS FOR THE SHIPPED CHAIN, SCORED ON THE COMPLETE MESSAGE.
 *
 * What this is for. The X95 speed arm changes how the ARIADNE hill-climb probes candidate glyph
 * assignments. The only acceptable evidence that such a change is safe is that every one of the
 * 29 frontier lanes produces a BYTE-IDENTICAL message, because this corpus has produced a wire
 * change at an unchanged token count three times (X89 df-real, X89 df-h, X93). Token counts are
 * therefore reported but never used as the acceptance test; the SHA-256 of the complete message
 * is.
 *
 * The harness encodes each lane through `tagstackEncode` -- the SHIPPED chain, not the frontier
 * gate -- because that is the path a real user's message takes, and it records wall-clock
 * milliseconds alongside the digest so a speed claim and a fidelity claim come from the same run.
 *
 * Wall-clock is reported per lane and as a total, and the harness is deliberately run as a single
 * process per configuration: milliseconds from two processes are not comparable on a shared
 * machine, and a lane timed while another CPU-heavy job runs is not a timing receipt at all. Run
 * the before and after configurations in separate processes, and never concurrently with each
 * other or with a frontier job.
 *
 * ZERO frontier calls: this harness encodes each lane exactly once.
 */
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const enc: EncodingName = 'o200k_base';
const OUT = process.env.X95_OUT ?? 'bench/x95/receipts/speed-ab.json';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const files = process.argv.slice(2);
const lanes: any[] = [];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const t0 = Date.now();
for (const p of files) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = path.basename(p);
  const t = Date.now();
  const r: any = tagstackEncode(text, enc);
  const ms = Date.now() - t;
  lanes.push({ lane, path: p, chars: text.length, rawTokens: countTokensExact(text, enc),
    tokens: r.messageTokens, ms, sha: sha(r.message), exact: r.decoded === text, bytes: r.message.length });
  fs.writeFileSync(OUT, JSON.stringify({ note: 'speed A/B on the shipped chain; scored on sha256 of the complete message',
    lanes, totalMs: Date.now() - t0 }, null, 1) + '\n');
  console.log(`${lane.padEnd(22)} ${String(text.length).padStart(6)}ch ${String(r.messageTokens).padStart(5)}tok ${String(ms).padStart(7)}ms exact=${r.decoded === text} sha=${sha(r.message).slice(0, 12)}`);
}
const tot = lanes.reduce((a, l) => a + l.tokens, 0);
const totMs = lanes.reduce((a, l) => a + l.ms, 0);
const allExact = lanes.every(l => l.exact);
console.log(`\n=== TOTAL ${lanes.length} lanes: ${tot} tokens, ${totMs} ms, exact ${lanes.filter(l => l.exact).length}/${lanes.length} (${allExact ? 'ALL EXACT' : 'FAILURES PRESENT'}) ===`);
