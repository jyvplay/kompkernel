/**
 * src/lib/omega/recall.ts
 * =============================================================================
 * RECALL-R1 — same-column recall within a short window of lines (exact, byte-perfect).
 *
 * GAP IT FILLS
 *   DITTO-F1 looks only at the line directly above (d = 1). Many records repeat a value in the
 *   same column a few lines up, not in the line above (package-lock entries, process tables,
 *   repeated paths and status words). RECALL-R1 writes such a field as "@d", meaning
 *   "the same-numbered field d lines up", for 2 <= d <= RECALL_WINDOW.
 *
 * LINE MODEL
 *   A field is a maximal run of non-space characters; whitespace is copied unchanged.
 *   Field j of a line is compared with field j of the earlier lines, using the stage INPUT
 *   (the decoded text of the previous stage, not the final wire).
 *
 * WIRE
 *   rule line (RECALL_HEADER), then the body.
 *   a field f of length >= RECALL_MIN_LEN equal to field j of line i-d (smallest d in 1..W) is "@d".
 *   a literal field that starts with '@' is written "@:" + f; every other field is unchanged.
 *   Lines 1..d have no reference at distance d.
 *
 * GATE
 *   Per line: a reference is written only if it lowers the o200k cost of the whole line.
 *   Per stage (in phalanx3.ts): kept only if VERITAS(wire) is strictly smaller than VERITAS(input).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const RECALL_HEADER =
  'RECALL-R1: a field "@d" = the same-numbered field of the line d lines up (d >= 1); "@:x" = the literal field x; fields are runs of non-space characters, whitespace is copied unchanged; lines before line 1 do not exist';
export const RECALL_ESC = 'RECALL-R1: identity';
export const RECALL_MIN_LEN = 4;
export const RECALL_WINDOW = 16;

function splitLine(line: string): string[] {
  return line.split(/(\s+)/);
}

export function recallEncodeBody(text: string, enc: EncodingName = 'o200k_base'): string {
  const lines = text.split('\n');
  const hist: string[][] = []; // original (stage-input) fields per line, indexed by field number
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const fields: string[] = [];
    const cand: { p: number; d: number; f: string }[] = [];
    let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const f = parts[p];
      if (f === '') continue;
      fields.push(f);
      parts[p] = f.startsWith('@') ? '@:' + f : f; // literal default
      if (f.length >= RECALL_MIN_LEN) {
        for (let d = 1; d <= Math.min(RECALL_WINDOW, i); d++) {
          if (hist[i - d][j] === f) { cand.push({ p, d, f }); break; }
        }
      }
      j++;
    }
    let cur = parts.join('');
    let curTok = countTokens(cur, enc);
    for (const c of cand) {
      const trial = parts.slice();
      trial[c.p] = '@' + c.d;
      const s2 = trial.join('');
      const t2 = countTokens(s2, enc);
      if (t2 < curTok) { parts[c.p] = trial[c.p]; cur = s2; curTok = t2; }
    }
    out.push(cur);
    hist.push(fields);
  }
  return out.join('\n');
}

export function recallDecodeBody(body: string): string {
  const lines = body.split('\n');
  const hist: string[][] = [];
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const fields: string[] = [];
    let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const w = parts[p];
      if (w === '') continue;
      let f: string;
      if (w.startsWith('@:')) {
        f = w.slice(2);
      } else if (w.startsWith('@')) {
        const m = /^@(\d+)$/.exec(w);
        if (!m) throw new Error('RECALL: malformed field ' + JSON.stringify(w));
        const d = parseInt(m[1], 10);
        if (d < 1 || d > i) throw new Error('RECALL: reference outside the text');
        const r = hist[i - d][j];
        if (r === undefined) throw new Error('RECALL: no field at reference');
        f = r;
      } else {
        f = w;
      }
      parts[p] = f;
      fields.push(f);
      j++;
    }
    out.push(parts.join(''));
    hist.push(fields);
  }
  return out.join('\n');
}

export function recallIdentityWire(text: string): string {
  return text.startsWith(RECALL_HEADER + '\n') || text.startsWith(RECALL_ESC + '\n') ? RECALL_ESC + '\n' + text : text;
}

export function recallDecode(wire: string): string {
  if (wire.startsWith(RECALL_ESC + '\n')) return wire.slice(RECALL_ESC.length + 1);
  const head = RECALL_HEADER + '\n';
  if (!wire.startsWith(head)) return wire;
  return recallDecodeBody(wire.slice(head.length));
}

export interface RecallResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'recall' | 'identity';
  inTokens: number;
  outTokens: number;
  referenced: number;
}

export function recallEncode(text: string, enc: EncodingName = 'o200k_base'): RecallResult {
  const inTokens = countTokens(text, enc);
  const body = recallEncodeBody(text, enc);
  const wire = RECALL_HEADER + '\n' + body;
  const referenced = (body.match(/(^|[ \t\r\n])@\d+(?=[ \t\r\n]|$)/g) ?? []).length;
  let decoded = '';
  let ok = false;
  try { decoded = recallDecode(wire); ok = decoded === text; } catch { ok = false; }
  const outTokens = ok ? countTokens(wire, enc) : Infinity;
  if (!ok || outTokens >= inTokens) {
    const idWire = recallIdentityWire(text);
    const idTok = idWire === text ? inTokens : countTokens(idWire, enc);
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', inTokens, outTokens: idTok, referenced: 0 };
  }
  return { wire, decoded, exact: true, mode: 'recall', inTokens, outTokens, referenced };
}
