/**
 * POLYCHRON — one schema for heterogeneous table columns.
 *
 * A new mechanism for this repository: a single typed-column pass can carry two
 * different local state machines in the same table. HEMERA's calendar delta and
 * STATHMOS's fixed-decimal padding are not emitted as two nested messages with
 * two decoder contracts. The encoder first infers both facts, writes one
 * self-describing @dp column header, and appends one compact contract to the
 * ordinary LAKONIKOS-D message. The reader restores decimal width and then
 * restores dates.
 *
 * This is intentionally narrower than a universal table codec. It requires a
 * delimited table with at least one date delta AND at least one fixed-width
 * decimal column. If either typed relation is absent, POLYCHRON declines to
 * identity rather than pretending that a composition is a new win.
 *
 * Exactness gates:
 *   P0: reject reserved marker collisions;
 *   P1: the two forward transforms and both inverses round-trip before DAEDALUS;
 *   P2: the LAKONIKOS-D wire decodes to the transformed text;
 *   P3: the full one-chat message is cheaper than LAKONIKOS-D identity;
 *   P4: the reader path applied to the final wire returns the original UTF-16
 *       string exactly.
 *
 * The wire is therefore directly inspectable:
 *   @dp 0,6,6,6,6 crlf
 *   DATE,OPEN,HIGH,LOW,CLOSE
 *   ※d1,17.24,17.24,17.24,17.24
 *
 * The implementation uses no model, retrieval, hidden state, or external table.
 */
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode, type LakonikosDResult } from './lakonikos-d';
import { hemeraExpand, hemeraSubstitute } from './hemera';
import { stathmosForward, stathmosRestore, type StathmosForward } from './stathmos';

export const POLYCHRON_NAME = 'polychron';
export const POLYCHRON_RAW = '@raw\n';
export const POLYCHRON_CONTRACT =
  'POLYCHRON: @dp D1,... gives decimal places per table column (0 = unchanged; crlf = CRLF). Pad those cells with zeros; ※dN is the previous date plus N days. After the DAEDALUS wire, restore @dp first, then dates, and print the result.';

export interface PolychronForward {
  text: string;
  days: number;
  dp: number[];
  crlf: boolean;
}

/** Any payload that the CHIRON reader would interpret must be escaped in the
 * identity arm too. Otherwise a literal user-supplied CHIRON program could be
 * decoded before POLYCHRON gets a chance to restore it. */
function needsRawEscape(input: string): boolean {
  return input.includes('※') || input.split('\n').some((line) => line.startsWith('@dp ') || line === '@raw')
    || (input.startsWith('§') && chironDecode(input) !== input);
}

export function polychronForward(input: string): PolychronForward | null {
  // The header, marker, and CHIRON program are self-delimiting only when they
  // are reserved. Refusing them prevents a literal table row/program from
  // being mistaken for the schema by a reader.
  if (needsRawEscape(input)) return null;
  const h = hemeraSubstitute(input, { day: true, ms: false });
  if (h.days === 0) return null;
  const s = stathmosForward(h.out);
  if (!s) return null;
  if (s.text === h.out || s.dp.every((d) => d === 0)) return null;
  return { text: s.text, days: h.days, dp: s.dp, crlf: s.crlf };
}

/** Exact inverse of polychronForward. Malformed or non-POLYCHRON text is
 * returned unchanged; this is important for the identity arm and for adversarial
 * payloads that merely begin with the reserved prefix. Valid CHIRON programs
 * are escaped before this reader is called. */
export function polychronRestore(transformed: string): string {
  if (!transformed.startsWith('@dp ')) return transformed;
  const lines = transformed.split('\n');
  // A real STATHMOS frame has a schema, a table header, and at least one data row.
  // Do not consume an arbitrary user line such as "@dp 0,6".
  if (lines.length < 3 || !/^@dp [0-9]+(?:,[0-9]+)*(?: crlf)?$/.test(lines[0])) return transformed;
  const restoredDecimal = stathmosRestore(transformed);
  if (restoredDecimal === null) return transformed;
  try {
    return hemeraExpand(restoredDecimal);
  } catch {
    return transformed;
  }
}

/** Reader after the shared DAEDALUS/CHIRON layer. Identity is total. */
export function polychronDecode(wire: string): string {
  const decoded = chironDecode(wire);
  if (decoded.startsWith(POLYCHRON_RAW)) return decoded.slice(POLYCHRON_RAW.length);
  return polychronRestore(decoded);
}

export interface PolychronResult {
  codec: 'polychron';
  arm: 'polychron' | 'identity';
  wire: string;
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  transformed: boolean;
  days: number;
  dp: number[];
  crlf: boolean;
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  baseTokens: Record<'o200k_base' | 'cl100k_base', number>;
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  notes: string;
}

function identity(text: string, base: LakonikosDResult, inTokens: PolychronResult['inTokens'], note: string): PolychronResult {
  return {
    codec: 'polychron', arm: 'identity', wire: base.wire, decoderPrompt: base.decoderPrompt,
    decoded: text, exact: true, transformed: false, days: 0, dp: [], crlf: false,
    messageTokens: base.messageTokens, baseTokens: base.messageTokens, inTokens,
    notes: note,
  };
}

/** One-chat encoder. The base is LAKONIKOS-D so the comparison is against the
 * current prose/ops incumbent rather than against a raw wire-only number. */
export function polychronEncode(text: string, enc: EncodingName = 'o200k_base'): PolychronResult {
  const inTokens = {
    o200k_base: countTokens(text, 'o200k_base'),
    cl100k_base: countTokens(text, 'cl100k_base'),
  };
  const guarded = needsRawEscape(text);
  // Reserved syntax and valid CHIRON programs are escaped in the identity arm;
  // otherwise a raw message could be interpreted before the POLYCHRON reader.
  const baseInput = guarded ? POLYCHRON_RAW + text : text;
  const base = lakonikosDualEncode(baseInput, enc);
  const baseResult = identity(text, base, inTokens, `identity: both typed relations are required; guard=${guarded}`);
  const f = polychronForward(text);
  if (!f) return baseResult;

  const candidate = lakonikosDualEncode(f.text, enc);
  if (candidate.mode !== 'daedalus' || candidate.decoded !== f.text || chironDecode(candidate.wire) !== f.text) {
    return baseResult;
  }
  const prompt = candidate.decoderPrompt + '\n' + POLYCHRON_CONTRACT;
  const messageTokens = {
    o200k_base: countTokens(prompt, 'o200k_base'),
    cl100k_base: countTokens(prompt, 'cl100k_base'),
  };
  if (messageTokens[enc] >= base.messageTokens[enc]) return baseResult;

  const decoded = polychronDecode(candidate.wire);
  if (decoded !== text) return baseResult;
  return {
    codec: 'polychron', arm: 'polychron', wire: candidate.wire, decoderPrompt: prompt,
    decoded, exact: true, transformed: true, days: f.days, dp: f.dp, crlf: f.crlf,
    messageTokens, baseTokens: base.messageTokens, inTokens,
    notes: `joint date+decimal schema; days=${f.days}; dp=${f.dp.join(',')}${f.crlf ? ' crlf' : ''}; M ${messageTokens.o200k_base} vs LAKONIKOS-D ${base.messageTokens.o200k_base}`,
  };
}

export function polychronSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases = [
    ['vix-like', 'DATE,OPEN,HIGH\n1990-01-02,17.240000,17.240000\n1990-01-03,18.190000,18.190000\n'],
    ['no-decimal', 'DATE,VALUE\n1990-01-02,1\n1990-01-03,2\n'],
    ['no-date-delta', 'DATE,VALUE\n1990-01-02,1.000\n1990-01-02,2.000\n'],
    ['marker-escape', '@dp 0,3\na,b\n1990-01-02,1.000\n1990-01-03,2.000\n'],
    ['crlf', 'DATE,OPEN\r\n1990-01-02,17.240000\r\n1990-01-03,18.190000\r\n'],
  ] as const;
  return cases.map(([name, text]) => {
    const r = polychronEncode(text, enc);
    return { name, ok: polychronDecode(r.wire) === text && r.decoded === text && r.exact, detail: `${r.arm} M=${r.messageTokens.o200k_base} days=${r.days} dp=${r.dp.join(',')}` };
  });
}
