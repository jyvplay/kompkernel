/**
 * THE GENERALIZED STAND-IN — the relation, made total over the corpus.
 *
 * PROSPHYSIS sits on a narrow grammar: the last field before an arrow, entailed by
 * the field that precedes it. Two generalizations are tested here at once, and both
 * are gated by the frontier price of the REWRITTEN text plus the key:
 *
 *   (1) TRANSFER: the reference may be the same position in the PREVIOUS row, not
 *       only the field to the left. This is the "stand-in" of the old copybooks: a
 *       field is not written again, it is named by where it was last written. It
 *       subsumes the symlink case (the arrow's left side is a field on the same row)
 *       and adds the vertical one.
 *   (2) TOTALITY: the relation fires on the longest common prefix with the
 *       reference, at any field position, not only at the arrow.
 *
 *   field value = LCP(reference) + tail   ->   wire value = MARK + tail
 *
 * The reader re-derives the head from the reference, which it can still see. What is
 * measured is the WHOLE message: key + frontier(rewritten), against the frontier of
 * the source. Nothing ships unless that number falls.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MARK = '\u00a7';
const MIN_HEAD = Number(process.env.MIN_HEAD ?? 3);
const KEY = `X74. Body first. Then per field: a field starting ${MARK} is the head of the field that occupied the same place${' '}on an earlier line, followed by what follows ${MARK}. Print only.`;
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));

function run(text: string, vertical: boolean): { wire: string; hits: number; saved: number } {
  const lines = text.split('\n');
  const out: string[] = [];
  let prevFields: string[] = [];
  let hits = 0, saved = 0;
  for (const line of lines) {
    const fields = line.trim() === '' ? [] : line.split(/(\s+)/); // keep separators
    if (fields.length === 0) { out.push(line); continue; }
    const nextFields: string[] = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (/^\s+$/.test(f)) { nextFields.push(f); continue; }
      const ref = vertical ? prevFields[i] : prevFields[i];
      if (ref && ref.length >= MIN_HEAD && f.length > ref.length && f.startsWith(ref)) {
        out.push(`${MARK}${f.slice(ref.length)}`);
        hits++; saved += ref.length;
        nextFields.push(f);
        continue;
      }
      out.push(f);
      nextFields.push(f);
    }
    // horizontal pass: a field that repeats the field to its left with a tail
    prevFields = nextFields;
  }
  return { wire: out.join('\n'), hits, saved };
}

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const base = F.get(p)!;
  const v = run(t, true);
  // sanity: the inverse is a total function of the wire + the reference chain
  const inv = (() => {
    const lines = v.wire.split('\n');
    const out: string[] = [];
    let prevFields: string[] = [];
    for (const line of lines) {
      const fields = line.trim() === '' ? [] : line.split(/(\s+)/);
      if (fields.length === 0) { out.push(line); continue; }
      const nextFields: string[] = [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (/^\s+$/.test(f)) { out.push(f); nextFields.push(f); continue; }
        if (f.startsWith(MARK)) { const r = (prevFields[i] ?? '') + f.slice(1); out.push(r); nextFields.push(r); continue; }
        out.push(f); nextFields.push(f);
      }
      prevFields = nextFields;
    }
    return out.join('\n');
  })();
  const exact = inv === t;
  const msg = T(`${KEY}\n${v.wire}`, enc);
  const viaF = T(`${KEY}\n${tagstackFrontier(v.wire, enc).message}`, enc);
  rows.push({ path: p, hits: v.hits, saved: v.saved, exact, plainWire: msg, frontierWire: viaF, key: T(KEY, enc), base, deltaPlain: msg - base, deltaF: viaF - base });
  console.log(`${p.split('/').pop()!.padEnd(20)} hits ${String(v.hits).padStart(4)} saved ${String(v.saved).padStart(5)} exact ${exact} | +key plain ${String(msg).padStart(5)} F ${String(viaF).padStart(5)} vs base ${String(base).padStart(5)} | dPlain ${msg - base} dF ${viaF - base}`);
}
fs.writeFileSync('bench/x74/receipts/standin.json', JSON.stringify({ keyTokens: T(KEY, enc), key: KEY, minHead: MIN_HEAD, rows }, null, 1) + '\n');
