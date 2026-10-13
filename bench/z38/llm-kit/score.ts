// Z38: score LLM replies against the kit. Usage: score.ts <kitDir> <repliesDir>
// A reply file is <id>.reply.txt. Exact = sha256(reply) equals sha256(original). Trailing newline is NOT stripped:
// a reply must be byte-identical to the original. Also reports the length ratio as a crude fidelity signal.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [kitDir, repDir] = process.argv.slice(2);
const rows = fs.readFileSync(path.join(kitDir, 'manifest.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
let exact = 0, missing = 0;
for (const r of rows) {
  const p = path.join(repDir, `${r.id}.reply.txt`);
  if (!fs.existsSync(p)) { missing++; console.log(JSON.stringify({ id: r.id, status: 'missing' })); continue; }
  const reply = fs.readFileSync(p, 'utf8');
  const ok = crypto.createHash('sha256').update(reply, 'utf8').digest('hex') === r.sha256;
  if (ok) exact++;
  console.log(JSON.stringify({ id: r.id, status: ok ? 'exact' : 'mismatch', chars: r.chars, replyChars: Buffer.byteLength(reply, 'utf8') }));
}
console.log(JSON.stringify({ n: rows.length, exact, missing, exactRate: +(exact / rows.length).toFixed(3) }));
