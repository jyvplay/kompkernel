/**
 * X100 — GATE CENSUS.  For every one of the 29 authoritative lanes, take the shipped chain's
 * message, expand its CHIRON wire, and compare against the source.  A lane where the two differ is
 * a lane whose wire is COMPOSED with a text-transform codec (OURA and friends): expanding CHIRON
 * yields the parent's output, not the source.  ἸΣΟΜΟΡΦΪΑ / ΜΕΤΑΤΑΞΙΣ / ΣΥΝΔΥΑΣΜΟΣ all gate on
 * `decoded === text` with `text` = the SOURCE, so on such a lane the predicate is unsatisfiable and
 * the codec refuses without searching.  This census measures how much of the 29-lane frontier that
 * silently skips.
 */
import * as fs from 'node:fs';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
const rows = fs.readFileSync('/tmp/chk.txt', 'utf8').trim().split('\n').map(l => l.split('\t'));
const out: any[] = [];
let composed = 0, totTok = 0, composedTok = 0;
for (const [lane, base] of rows) {
  const mp = `bench/x86/receipts/msg/${base}.msg.txt`, sp = `bench/x86/receipts/msg/${base}.src.txt`;
  if (!fs.existsSync(mp) || !fs.existsSync(sp)) { out.push({ lane, status: 'missing' }); continue; }
  const msg = fs.readFileSync(mp, 'utf8'), src = fs.readFileSync(sp, 'utf8');
  if (!msg.includes(CHIRON_START)) { out.push({ lane, status: 'identity', tok: 0 }); continue; }
  const dec = chironDecode(msg.slice(msg.indexOf(CHIRON_START)));
  const isC = dec !== src;
  if (isC) { composed++; composedTok += Buffer.byteLength(dec); }
  totTok += Buffer.byteLength(msg);
  out.push({ lane, composed: isC, srcBytes: Buffer.byteLength(src), decBytes: Buffer.byteLength(dec) });
  console.log(`${lane.padEnd(22)} composed=${String(isC).padEnd(5)} src=${String(Buffer.byteLength(src)).padStart(6)} chironDecode=${String(Buffer.byteLength(dec)).padStart(6)}`);
}
console.log(`\nGATE CENSUS: ${composed} / ${out.filter(r => r.status !== 'missing').length} lanes have a wire that chironDecode cannot return to the source`);
fs.writeFileSync('bench/x100/receipts/gatecensus.json', JSON.stringify({ rows: out, composed }, null, 1));
