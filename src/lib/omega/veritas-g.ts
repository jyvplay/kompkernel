/**
 * src/lib/omega/veritas-g.ts
 * =============================================================================
 * VERITAS-G — nested-grammar VX stage (RePair-style). Exact, byte-perfect.
 *
 * WHY: VERITAS-VX entries are flat. A phrase cannot name another entry, so a repeated
 * long structure (a JSON row, an indented block) is paid in full at every use of its
 * sub-phrases. VERITAS-G lets an entry's text name earlier keys, so each repeat of a
 * compound pattern costs one key, and the pattern is built up from smaller ones.
 *
 * WIRE (always carries its own one-line legend when any rule applies)
 *   [[VXG                                  sentinel line (the text starts with "[[VXG\n")
 *   # VXG: ...                             legend line (in-message; the model reads this)
 *   ~k=T                                   one rule per line, in key order
 *   ]]                                     header terminator
 *   body                                   the escaped text; "~k" expands rule k
 *   Escapes:  header T:  ~~ -> ~,  ~N -> newline,  ~R -> CR,  ~j -> rule j (j earlier)
 *             body:      ~~ -> ~,  ~k -> rule k's expansion (recursively)
 *   Keys exclude uppercase N and R, which are the header newline and CR escapes.
 *
 * ENCODER: RePair on the BPE token sequence. Each step takes the most frequent adjacent
 *   pair among the top-5 candidates, and keeps the one whose real token count (no legend)
 *   is smallest. Stops when no candidate lowers the count. The legend is added only to
 *   the final wire, so the greedy is not blocked by its fixed cost.
 *   If no rule applies, the wire is the input text verbatim (no sentinel).
 * =============================================================================
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';

export const VXG_SENTINEL = '[[VXG\n';
export const VXG_LEGEND = '# VXG: ~k=T defines k; T may hold ~j (key j); ~~->~; ~N newline; ~R CR; header ends at ]]; body ~k expands to T';
const TERMINATOR = ']]';
const KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQSTUVWXYZ';
const NT = 1_000_000;
const PAIR_BASE = 2_000_000;
const TOP = 12;

function escBody(s: string): string { return s.split('~').join('~~'); }
function escHeader(s: string): string {
  return s.split('~').join('~~').split('\n').join('~N').split('\r').join('~R');
}

export interface VxgResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'vxg' | 'identity';
  rules: { key: string; phrase: string }[];
  inTokens: number;
  outTokens: number;
}

function buildWire(rules: number[][], seq: number[], base: Map<number, string>, legend: boolean): string {
  const hdr = (id: number): string => (id >= NT ? '~' + KEYS[id - NT] : escHeader(base.get(id) as string));
  const bodyOf = (id: number): string => (id >= NT ? '~' + KEYS[id - NT] : escBody(base.get(id) as string));
  const body = seq.map(bodyOf).join('');
  if (rules.length === 0) return body;
  const entries = rules.map((r, i) => '~' + KEYS[i] + '=' + r.map(hdr).join('')).join('\n');
  return VXG_SENTINEL + (legend ? VXG_LEGEND + '\n' : '') + entries + '\n' + TERMINATOR + '\n' + body;
}

export function veritasGEncode(text: string, enc: EncodingName): VxgResult {
  const inTokens = countTokens(text, enc);
  const base = new Map<number, string>();
  let seq: number[] = [];
  for (const t of tokenStrings(text, enc)) {
    if (!base.has(t.id)) base.set(t.id, t.s);
    seq.push(t.id);
  }
  const rules: number[][] = [];
  let curTok = countTokens(buildWire(rules, seq, base, false), enc);

  // Length in base tokens of each symbol's expansion. A pair's saving per use is about len(a)+len(b)-1,
  // so candidates are ranked by count*(len-1) (long phrases first, as in VX), then the real gate decides.
  const lenNT: number[] = [];
  const lenOf = (id: number): number => (id >= NT ? lenNT[id - NT] : 1);
  for (let step = 0; step < KEYS.length; step++) {
    const counts = new Map<number, number>();
    for (let i = 0; i + 1 < seq.length; i++) {
      const pk = seq[i] * PAIR_BASE + seq[i + 1];
      counts.set(pk, (counts.get(pk) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .map(([pk, c]) => {
        const a = Math.floor(pk / PAIR_BASE);
        const b = pk % PAIR_BASE;
        return { pk, est: c * (lenOf(a) + lenOf(b) - 1) };
      })
      .sort((x, y) => y.est - x.est || x.pk - y.pk)
      .slice(0, TOP)
      .map((x) => [x.pk] as const);
    let best: { tok: number; s2: number[]; rule: number[] } | null = null;
    const newId = NT + rules.length;
    for (const [pk] of top) {
      const a = Math.floor(pk / PAIR_BASE);
      const b = pk % PAIR_BASE;
      const s2: number[] = [];
      for (let i = 0; i < seq.length; ) {
        if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { s2.push(newId); i += 2; }
        else { s2.push(seq[i]); i += 1; }
      }
      if (s2.length === seq.length) continue;
      const trial = [...rules, [a, b]];
      const tok = countTokens(buildWire(trial, s2, base, false), enc);
      if (tok < curTok && (best === null || tok < best.tok)) best = { tok, s2, rule: [a, b] };
    }
    if (best === null) break;
    lenNT.push(lenOf(best.rule[0]) + lenOf(best.rule[1]));
    rules.push(best.rule);
    seq = best.s2;
    curTok = best.tok;
  }

  if (rules.length === 0) {
    return { wire: text, decoded: text, exact: true, mode: 'identity', rules: [], inTokens, outTokens: inTokens };
  }
  const wire = buildWire(rules, seq, base, true);
  const hdrText = (id: number): string => (id >= NT ? '~' + KEYS[id - NT] : escHeader(base.get(id) as string));
  const decoded = veritasGDecode(wire);
  return {
    wire,
    decoded,
    exact: decoded === text,
    mode: 'vxg',
    rules: rules.map((r, i) => ({ key: KEYS[i], phrase: r.map(hdrText).join('') })),
    inTokens,
    outTokens: countTokens(wire, enc),
  };
}

/** Undo VERITAS-G. Input without the sentinel is returned verbatim. */
export function veritasGDecode(wire: string): string {
  if (!wire.startsWith(VXG_SENTINEL)) return wire;
  const lines = wire.slice(VXG_SENTINEL.length).split('\n');
  let i = 0;
  if (i < lines.length && lines[i].startsWith('# ')) i++;
  const rule = new Map<string, string>();
  while (i < lines.length && lines[i] !== TERMINATOR) {
    const ln = lines[i];
    if (ln.length < 3 || ln[0] !== '~' || ln[2] !== '=') throw new Error('VXG: bad rule line');
    rule.set(ln[1], ln.slice(3));
    i++;
  }
  if (i >= lines.length) throw new Error('VXG: missing terminator');
  const body = lines.slice(i + 1).join('\n');

  const memo = new Map<string, string>();
  const expand = (k: string, depth: number): string => {
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    if (depth > KEYS.length) throw new Error('VXG: cyclic rule');
    const p = rule.get(k);
    if (p === undefined) throw new Error('VXG: undefined key ' + k);
    const out: string[] = [];
    for (let j = 0; j < p.length; ) {
      const c = p[j];
      if (c !== '~') { out.push(c); j++; continue; }
      const n = p[j + 1];
      if (n === '~') { out.push('~'); j += 2; continue; }
      if (n === 'N') { out.push('\n'); j += 2; continue; }
      if (n === 'R') { out.push('\r'); j += 2; continue; }
      if (rule.has(n)) { out.push(expand(n, depth + 1)); j += 2; continue; }
      throw new Error('VXG: bad escape in rule ' + k);
    }
    const s = out.join('');
    memo.set(k, s);
    return s;
  };

  const out: string[] = [];
  for (let j = 0; j < body.length; ) {
    const c = body[j];
    if (c !== '~') { out.push(c); j++; continue; }
    const n = body[j + 1];
    if (n === '~') { out.push('~'); j += 2; continue; }
    if (n !== undefined && rule.has(n)) { out.push(expand(n, 0)); j += 2; continue; }
    throw new Error('VXG: bad body escape');
  }
  return out.join('');
}
