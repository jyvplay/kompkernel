/**
 * ANTIPHON — line antiphony: a line that is a near-copy of an earlier line is
 * written as "copy the line d above, then replace first x with y, in order".
 *
 * Pipeline (exact, decode-gated):
 *   text --antiphonTransform--> stage1 (copy lines use three marker glyphs that
 *   never occur in the text) --chironEncode (KAIROS budget)--> wire
 * The decoder: CHIRON-expand the wire to stage1, then expand the copy lines
 * top to bottom. The emitted candidate is the cheaper of plain KAIROS and
 * ANTIPHON∘KAIROS on measured one-chat message tokens, so ANTIPHON cannot ship
 * a larger message than KAIROS on any input.
 *
 * Marker glyphs are chosen absent from the text and single-token in o200k_base.
 * Edit strings never contain markers or newlines (both are absent from the text).
 */
import { countTokens, type EncodingName } from './bpe';
import { chironEncode, chironDecode, chironDecoderPrompt, KAIROS_WORK_UNITS } from './chiron';

export interface AntiphonGlyphs { copy: string; sep: string; end: string }

export interface AntiphonTransform {
  stage1: string;
  glyphs: AntiphonGlyphs;
  copied: number;
  edits: number;
}

const CANDIDATE_GLYPHS = ['\u2307', '\u203B', '\u2042', '\u2021', '\u2020', '\u29D7', '\u25C6', '\u2756', '\u2301', '\u2318', '\u00A4', '\u00A6', '\u2261', '\u2A02', '\u2299', '\u29C9', '\u27E1', '\u2726', '\u2613', '\u2623'];

const MAX_EDITS = 12;
const WINDOW = 300;
const MIN_LEN = 20;

/** Token-level split that keeps whitespace as tokens so that joins are exact. */
function splitTokens(line: string): string[] {
  return line.match(/\s+|[^\s]+/g) ?? [];
}

/** LCS opcodes between two token arrays: returns blocks of non-equal ranges plus equal runs. */
function diffBlocks(S: string[], T: string[]): Array<{ i1: number; i2: number; j1: number; j2: number }> {
  const n = S.length, m = T.length;
  const L: Uint16Array[] = [];
  for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = S[i] === T[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const blocks: Array<{ i1: number; i2: number; j1: number; j2: number }> = [];
  let i = 0, j = 0;
  let bi = -1, bj = -1;
  const flush = (ei: number, ej: number) => {
    if (bi >= 0 && (ei > bi || ej > bj)) blocks.push({ i1: bi, i2: ei, j1: bj, j2: ej });
    bi = -1; bj = -1;
  };
  while (i < n || j < m) {
    if (i < n && j < m && S[i] === T[j]) { flush(i, j); i++; j++; continue; }
    if (bi < 0) { bi = i; bj = j; }
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) j++;
    else i++;
  }
  flush(i, j);
  return blocks;
}

/**
 * Build the edit list turning source line S into target line T, applying edits in
 * order with "replace the first occurrence". Returns null if no exact edit list
 * is found within the cap, or if the simulation does not reproduce T.
 */
export function editsFor(src: string, tgt: string): Array<[string, string]> | null {
  const S = splitTokens(src), T = splitTokens(tgt);
  // target offsets of each token boundary
  const tOff: number[] = [0];
  for (const t of T) tOff.push(tOff[tOff.length - 1] + t.length);
  const blocks = diffBlocks(S, T);
  if (blocks.length === 0 || blocks.length > MAX_EDITS) return null;
  let cur = src;
  const edits: Array<[string, string]> = [];
  for (const blk of blocks) {
    let done = false;
    for (let ctx = 0; ctx <= 3 && !done; ctx++) {
      // left/right context = unchanged tokens around the block (equal in S and T)
      const kL = Math.min(ctx, blk.i1, blk.j1);
      const kR = Math.min(ctx, S.length - blk.i2, T.length - blk.j2);
      const a = S.slice(blk.i1 - kL, blk.i2 + kR).join('');
      const b = T.slice(blk.j1 - kL, blk.j2 + kR).join('');
      if (a.length === 0) continue;
      const expected = tOff[blk.j1 - kL];
      if (cur.indexOf(a) !== expected) continue;
      cur = cur.slice(0, expected) + b + cur.slice(expected + a.length);
      edits.push([a, b]);
      done = true;
    }
    if (!done) return null;
  }
  return cur === tgt ? edits : null;
}

/** Forward transform: text -> stage1, plus counts. Marker glyphs are chosen by the caller-free rule. */
export function antiphonTransform(text: string, enc: EncodingName = 'o200k_base'): AntiphonTransform | null {
  const picks: string[] = [];
  for (const g of CANDIDATE_GLYPHS) {
    if (text.includes(g)) continue;
    if (countTokens(g, enc) !== 1) continue;
    picks.push(g);
    if (picks.length === 3) break;
  }
  if (picks.length < 3) return null;
  const glyphs: AntiphonGlyphs = { copy: picks[0], sep: picks[1], end: picks[2] };
  const lines = text.split('\n');
  const out: string[] = [];
  let copied = 0, editCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let best: { repr: string; edits: Array<[string, string]> } | null = null;
    if (line.length >= MIN_LEN) {
      const tokT = new Set(splitTokens(line));
      // candidate sources: earlier lines sharing many tokens with this one
      const cands: Array<{ j: number; score: number }> = [];
      for (let j = Math.max(0, i - WINDOW); j < i; j++) {
        const src = lines[j];
        if (src.length < MIN_LEN || src === line) continue;
        const tk = splitTokens(src);
        let common = 0;
        for (const t of tk) if (tokT.has(t)) common++;
        const score = common / Math.max(tk.length, tokT.size, 1);
        if (score >= 0.5) cands.push({ j, score });
      }
      cands.sort((x, y) => y.score - x.score || y.j - x.j);
      for (const c of cands.slice(0, 3)) {
        const eds = editsFor(lines[c.j], line);
        if (!eds) continue;
        const d = i - c.j;
        const repr = glyphs.copy + String(d) + eds.map(([a, b]) => glyphs.sep + a + glyphs.sep + b + glyphs.end).join('');
        const rawCost = countTokens(line, enc);
        const reprCost = countTokens(repr, enc);
        if (reprCost + 1 < rawCost && (!best || reprCost < countTokens(best.repr, enc))) best = { repr, edits: eds };
      }
    }
    if (best) { out.push(best.repr); copied++; editCount += best.edits.length; }
    else out.push(line);
  }
  const stage1 = out.join('\n');
  if (copied === 0) return null;
  return { stage1, glyphs, copied, edits: editCount };
}

/** Inverse: stage1 -> text. Throws on malformed copy lines. */
export function antiphonUntransform(stage1: string, g: AntiphonGlyphs): string {
  const lines = stage1.split('\n');
  const dec: string[] = [];
  for (const line of lines) {
    if (!line.startsWith(g.copy)) { dec.push(line); continue; }
    let p = 1;
    let digits = '';
    while (p < line.length && line[p] >= '0' && line[p] <= '9') digits += line[p++];
    if (!digits) throw new Error('antiphon: missing distance');
    const d = Number(digits);
    const src = dec[dec.length - d];
    if (src === undefined || d < 1) throw new Error('antiphon: bad distance');
    let cur = src;
    while (p < line.length) {
      if (line[p] !== g.sep) throw new Error('antiphon: expected separator');
      p++;
      const e1 = line.indexOf(g.sep, p);
      if (e1 < 0) throw new Error('antiphon: unterminated a');
      const a = line.slice(p, e1);
      const e2 = line.indexOf(g.end, e1 + 1);
      if (e2 < 0) throw new Error('antiphon: unterminated edit');
      const b = line.slice(e1 + 1, e2);
      const idx = cur.indexOf(a);
      if (idx < 0 || a.length === 0) throw new Error('antiphon: edit anchor missing');
      cur = cur.slice(0, idx) + b + cur.slice(idx + a.length);
      p = e2 + 1;
    }
    dec.push(cur);
  }
  return dec.join('\n');
}

export function antiphonContract(g: AntiphonGlyphs): string {
  return `A line starting with ${g.copy} copies the line above it: the digits after ${g.copy} give how many lines up. Each ${g.sep}x${g.sep}y${g.end} then replaces the first x in that copy with y, in order. Expand CHIRON first, then these copy lines.`;
}

export interface AntiphonResult {
  codec: 'antiphon';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  arm: 'kairos' | 'antiphon+kairos';
  copied: number;
  edits: number;
  glyphs: AntiphonGlyphs | null;
  notes: string;
}

/**
 * Encode with the cheaper of KAIROS and ANTIPHON∘KAIROS on one-chat message tokens.
 * Every candidate is decoded and compared with `text` before it can win.
 */
export function antiphonEncode(text: string, enc: EncodingName = 'o200k_base'): AntiphonResult {
  const inTokens = countTokens(text, enc);
  const base = chironEncode(text, enc, { workUnits: KAIROS_WORK_UNITS });
  const baseOk = base.decoded === text;
  let best: AntiphonResult = {
    codec: 'antiphon', wire: base.wire, decoded: base.decoded, exact: baseOk, inTokens,
    outTokens: base.outTokens, messageTokens: base.messageTokens, decoderPrompt: base.decoderPrompt,
    savingsPct: base.savingsPct, arm: 'kairos', copied: 0, edits: 0, glyphs: null,
    notes: `arm=kairos; ${base.notes}`,
  };
  const tr = antiphonTransform(text, enc);
  if (tr) {
    const inner = chironEncode(tr.stage1, enc, { workUnits: KAIROS_WORK_UNITS });
    let decodedText = '';
    let ok = false;
    try {
      decodedText = antiphonUntransform(chironDecode(inner.wire), tr.glyphs);
      ok = decodedText === text;
    } catch { ok = false; }
    const prompt = `${chironDecoderPrompt(inner.wire)}\n${antiphonContract(tr.glyphs)}`;
    const messageTokens = countTokens(prompt, enc);
    if (ok && messageTokens < best.messageTokens) {
      best = {
        codec: 'antiphon', wire: inner.wire, decoded: decodedText, exact: true, inTokens,
        outTokens: inner.outTokens, messageTokens, decoderPrompt: prompt,
        savingsPct: inTokens ? Math.round((1 - messageTokens / inTokens) * 1000) / 10 : 0,
        arm: 'antiphon+kairos', copied: tr.copied, edits: tr.edits, glyphs: tr.glyphs,
        notes: `arm=antiphon+kairos; ${tr.copied} copy lines, ${tr.edits} edits; kairos-arm M=${base.messageTokens}`,
      };
    }
  }
  return best;
}

export function antiphonSelfTest(): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<[string, string]> = [
    ['plain copy', "const handler = createHandler({ name: 'alpha', timeoutMs: 1500, retries: 3, onError: logError, tag: 'main' });\nconst handler = createHandler({ name: 'beta', timeoutMs: 1500, retries: 3, onError: logError, tag: 'main' });"],
    ['insert at start', "export function parseRecordHeader(buffer: Uint8Array, offset: number): RecordHeader {\nexport function parseRecordHeaderV2(buffer: Uint8Array, offset: number): RecordHeader {"],
    ['delete mid', "  case 'alpha': return { kind: 'alpha', value: readU32(buf, pos), flags: readU8(buf, pos + 4) };\n  case 'alpha': return { kind: 'alpha', value: readU32(buf, pos), pad: 0, flags: readU8(buf, pos + 4) };"],
    ['chained copy', "row shared template text here with many words in it x=1 y=2 z=3\nrow shared template text here with many words in it x=4 y=5 z=6\nrow shared template text here with many words in it x=7 y=8 z=9"],
    ['no shared lines', 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu\nomega psi chi phi upsilon tau sigma rho pi xi nu omicron'],
    ['whitespace edit', 'key:    value value value value value value value value value value\nkey: value value value value value value value value value value value'],
  ];
  const out: Array<{ name: string; ok: boolean; detail: string }> = [];
  for (const [name, text] of cases) {
    try {
      const tr = antiphonTransform(text, 'o200k_base');
      if (!tr) { out.push({ name, ok: true, detail: 'no copy lines (transform declined)' }); continue; }
      const back = antiphonUntransform(tr.stage1, tr.glyphs);
      out.push({ name, ok: back === text, detail: `copied=${tr.copied} edits=${tr.edits} roundtrip=${back === text}` });
    } catch (e) {
      out.push({ name, ok: false, detail: String(e) });
    }
  }
  return out;
}
