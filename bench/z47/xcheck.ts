// Z47 — build EPAGOGE wires (forced composition, gate bypassed, so every transform path is exercised) for a list of
// files and write {file, wire, text} JSONL for the independent CPython reader bench/epagoge_decode.py.
// Usage: FILES=list.txt OUT=wires.jsonl bench/tmp/run.sh bench/z47/xcheck.ts
import fs from 'node:fs';
import { EPAGOGE_MARK, EPAGOGE_SCHEMAS, epagogeDecode, epagogeEncode } from '@/lib/omega/epagoge';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
const out = process.env.OUT!;
fs.writeFileSync(out, '');
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  let reduced = text; const used: string[] = []; let folded = 0;
  for (const s of EPAGOGE_SCHEMAS) {
    const inst = s.instantiate(reduced, enc); if (!inst) continue;
    const fo = inst.fold(reduced, enc); if (!fo) continue;
    if (inst.unfold(fo.text) !== reduced) { console.error('ROUNDTRIP-FAIL', f, s.id); continue; }
    reduced = fo.text; used.push(inst.clause); folded += fo.count;
  }
  const mode = process.env.MODE ?? 'forced';
  let wire: string;
  if (mode === 'real') wire = epagogeEncode(text, enc).wire;
  else if (used.length) wire = EPAGOGE_MARK + used.join(' ') + '\n' + daedalusEncode(reduced, enc).wire;
  else wire = daedalusEncode(text, enc).wire;
  const native = epagogeDecode(wire) === text;
  fs.appendFileSync(out, JSON.stringify({ file: f, wire, text }) + '\n');
  console.error(`${f} clauses=${used.length} folded=${folded} nativeExact=${native} ${Date.now() - t0}ms`);
}
