/**
 * src/lib/omega/kladios.ts
 * =============================================================================
 * KLADOS (κλάδος, branch) — drawn-tree depth codec.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * A drawn tree (`tree`, `npm ls`, `pipdeptree`, ...) spends most of its prefix
 * characters on connectors and continuation bars. Those characters are a
 * deterministic function of the depth sequence alone:
 *   - a line at depth d has d-1 ancestor levels, each drawn as "bar" when that
 *     ancestor has a later sibling and as "blank" otherwise;
 *   - its own connector is "mid" when it has a later sibling, "last" otherwise.
 * "Has a later sibling" is decided by the depth sequence (a later line at the
 * same depth, before any shallower line). So the wire keeps only the depth and
 * the text of each line; the reader redraws the prefix.
 *
 * MECHANISM CLASS
 * -----------------------------------------------------------------------------
 * Layout regeneration (GRAMMA: the layout is not shipped, the reader regenerates it).
 * GRAMMA's dialects cover indentation of code and JSON. KLADOS covers drawn-tree
 * connector glyphs, which are not indentation: they sit inside the text column.
 * Two styles are supported, each with its own connector set:
 *   ascii  "+-- " mid, "`-- " last, "| " bar, "  " blank (npm ls)
 *   box    "├── " mid, "└── " last, "│   " bar, "    " blank (tree)
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   one line per source line:  <depth digit> <space> <text>
 *   depth 0 = a line with no connector (root, summary, blank); text is the line.
 * The message = KLADOS contract line + the DAEDALUS prompt of that wire. The
 * DAEDALUS dictionary still runs on the wire (the depth digits and texts are
 * ordinary text to it).
 *
 * BYTE-EXACTNESS
 * -----------------------------------------------------------------------------
 * The encoder redraws the wire with the same renderer the reader uses and
 * requires byte equality with the input. Otherwise it returns identity (plain
 * DAEDALUS). Depth above 9 is not representable and also returns identity.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';

export type KladosStyle = 'ascii' | 'box';

interface StyleSpec {
  style: KladosStyle;
  mid: string;
  last: string;
  bar: string;
  blank: string;
  /** a connector line: prefix of bars/blanks, then mid or last, then text */
  re: RegExp;
}

const STYLES: Record<KladosStyle, StyleSpec> = {
  ascii: {
    style: 'ascii', mid: '+-- ', last: '`-- ', bar: '| ', blank: '  ',
    re: /^((?:\| |  )*)(\+-- |`-- )(.*)$/,
  },
  box: {
    // tree(1) draws each bar as "│" + two NBSP (U+00A0) + space; a blank level is four ordinary spaces.
    style: 'box', mid: '├── ', last: '└── ', bar: '│\u00a0\u00a0 ', blank: '    ',
    re: /^((?:│\u00a0\u00a0 |    )*)(├── |└── )(.*)$/,
  },
};

export interface KladosLine { depth: number; text: string }

/** Parse a drawn tree in one style. Lines without a connector are depth 0. */
export function kladosParse(text: string, style: KladosStyle): KladosLine[] {
  const spec = STYLES[style];
  const width = style === 'ascii' ? 2 : 4;
  return text.split('\n').map((line) => {
    const m = spec.re.exec(line);
    if (!m) return { depth: 0, text: line };
    const prefixLen = m[1].length;
    if (prefixLen % width !== 0) return { depth: 0, text: line };
    return { depth: prefixLen / width + 1, text: m[3] };
  });
}

/** Redraw lines in one style. The same routine is the reader's. */
export function kladosRender(lines: KladosLine[], style: KladosStyle): string {
  const spec = STYLES[style];
  const n = lines.length;
  // hasLater[i]: a later line at depth(i), before any line shallower than depth(i)
  const hasLater: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const d = lines[i].depth;
    if (d === 0) continue;
    let j = i + 1;
    let later = false;
    while (j < n) {
      if (lines[j].depth < d) break;
      if (lines[j].depth === d) { later = true; break; }
      j++;
    }
    hasLater[i] = later;
  }
  const out: string[] = [];
  const at: number[] = []; // at[level] = most recent line index at that depth
  for (let i = 0; i < n; i++) {
    const { depth: d, text } = lines[i];
    if (d === 0) {
      at.length = 0;
      at[0] = i;
      out.push(text);
      continue;
    }
    let prefix = '';
    for (let l = 1; l < d; l++) {
      const anc = at[l];
      prefix += anc !== undefined && hasLater[anc] ? spec.bar : spec.blank;
    }
    prefix += hasLater[i] ? spec.mid : spec.last;
    at.length = d;
    at[d] = i;
    out.push(prefix + text);
  }
  return out.join('\n');
}

/** Wire: "<depth> <text>" per line. */
export function kladosWire(lines: KladosLine[]): string {
  return lines.map((l) => `${l.depth} ${l.text}`).join('\n');
}

/** Inverse of kladosWire. Every wire line is "<digit> <text>"; anything else is malformed. */
export function kladosUnwire(wire: string): KladosLine[] {
  return wire.split('\n').map((line) => {
    if (!/^[0-9] /.test(line)) throw new Error('kladios: wire line without a depth digit');
    return { depth: Number(line[0]), text: line.slice(2) };
  });
}

/** Exact encoding. Returns identity (depth-0 wire of the raw text) if no style round-trips with a tree. */
export interface KladosResult {
  codec: 'kladios';
  style: KladosStyle | 'identity';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusResult;
  decoderPrompt: string;
  notes: string;
}

export const KLADOS_CONTRACT: Record<KladosStyle, string> = {
  ascii:
    'KLADOS: each line is "depth text". Depth 0: print text. Depth d: print d-1 levels, each "| " if that level\'s line has a later sibling else "  ", then "+-- " if this line has a later sibling else "`-- ", then text. A later sibling = a later line at the same depth before any shallower line.',
  box:
    'KLADOS: each line is "depth text". Depth 0: print text. Depth d: print d-1 levels, each "│ + 2 NBSP + space" if that level\'s line has a later sibling else 4 spaces, then "├── " if this line has a later sibling else "└── ", then text. A later sibling = a later line at the same depth before any shallower line.',
};

export function kladosEncode(text: string, enc: EncodingName = 'o200k_base'): KladosResult {
  const inTokens = countTokens(text, enc);
  const candidates: { style: KladosStyle; wire: string; lines: KladosLine[] }[] = [];
  for (const style of ['ascii', 'box'] as KladosStyle[]) {
    const lines = kladosParse(text, style);
    if (lines.some((l) => l.depth > 9)) continue;
    if (!lines.some((l) => l.depth > 0)) continue; // no tree: nothing to gain
    const redrawn = kladosRender(lines, style);
    if (redrawn !== text) continue; // G1: the renderer inverts the parser on this input
    const wire = kladosWire(lines);
    if (kladosRender(kladosUnwire(wire), style) !== text) continue; // G2: through the wire format
    candidates.push({ style, wire, lines });
  }
  let best: KladosResult | null = null;
  for (const c of candidates) {
    const d = daedalusEncode(c.wire, enc);
    const exact = d.exact && daedalusDecode(d.wire) === c.wire && kladosRender(kladosUnwire(c.wire), c.style) === text;
    if (!exact) continue;
    const decoderPrompt = KLADOS_CONTRACT[c.style] + '\n' + d.decoderPrompt;
    const M = countTokens(decoderPrompt, enc);
    if (!best || M < best.messageTokens) {
      best = {
        codec: 'kladios', style: c.style, wire: d.wire, decoded: text, exact: true, inTokens,
        messageTokens: M, daedalus: d, decoderPrompt,
        notes: `style=${c.style}; lines=${c.lines.length}; wire tokens via DAEDALUS=${d.messageTokens}`,
      };
    }
  }
  if (best) return best;
  const d = daedalusEncode(text, enc);
  return {
    codec: 'kladios', style: 'identity', wire: d.wire, decoded: d.decoded, exact: d.exact, inTokens,
    messageTokens: d.messageTokens, daedalus: d, decoderPrompt: d.decoderPrompt, notes: 'identity: no drawn tree redraws exactly',
  };
}

/** Library reader: DAEDALUS expansion of the wire, then the KLADOS redraw for the style. */
export function kladosDecode(wire: string, style: KladosStyle): string {
  return kladosRender(kladosUnwire(daedalusDecode(wire)), style);
}
