/**
 * X20 (2): dump ANADESMOS wires for the external CPython reader check (bench/x20/xcheck.py).
 *
 * usage: bench/x20/run.sh bench/x20/nd-emit.ts <lanesFile> > wires.json
 *        ND_FORCE=1 ...   also dump the arm the one-chat M gate would have refused, so that every
 *                         family is exercised through the second reader, not only the ones that paid.
 */
import fs from 'node:fs';
import { anadesmosEncode, ndForward, type NdSelection } from '@/lib/omega/anadesmos';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';

const forced = process.env.ND_FORCE === '1';
const noteOnly = process.env.ND_NOTE_ONLY === '1';
const lanes = fs.readFileSync(process.argv[2], 'utf8').split('\n').map((x) => x.trim()).filter((x) => x !== '');
const out: { name: string; bytes: number; applied: string; forced: boolean; input: string; wire: string }[] = [];
function emit(name: string, t: string, applied: string, wire: string, isForced: boolean, layer = 'chiron') {
  out.push({ name, bytes: Buffer.byteLength(t), applied, forced: isForced, layer, input: t, wire });
}
for (const f of lanes) {
  const t = fs.readFileSync(f, 'utf8');
  const r = anadesmosEncode(t);
  emit(f, t, r.applied.join('+'), r.wire, false);
  if (noteOnly) {
    // note layer only: the CHIRON contract is not involved, so this isolates whether the @nd
    // sentence itself is implementable from its prose. The cascade is run on the text as-is.
    const sel: NdSelection | null = ndForward(t);
    // ndForward's text already carries the note as its first line, exactly as it is shipped:
    // the note is part of the body the contract describes, not a separate header.
    if (sel && sel.applied.length) emit(f + '#note', t, sel.applied.join('+'), sel.text, true, 'note');
  }
  if (forced) {
    const sel: NdSelection | null = ndForward(t);
    if (sel && sel.applied.length) {
      const tr = lakonikosDualEncode(sel.text);
      if (tr.mode === 'daedalus' && tr.wire !== r.wire) emit(f + '#forced', t, sel.applied.join('+'), tr.wire, true);
    }
  }
}
process.stdout.write(JSON.stringify(out));
console.error(`nd-emit: ${out.length} messages (forced=${forced})`);
