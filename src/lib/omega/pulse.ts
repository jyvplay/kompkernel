/**
 * PULSE-R1: narrow, exact run-length factoring for repeated UTF-16 code units.
 * Orthogonal to phrase dictionaries and arithmetic runs. Complete wire is
 * measured with the live BPE engine and guarded.
 */
import { countTokens, type EncodingName } from './bpe';

const GLYPH = '\u27E1';
const SENTINEL = '[P1]\n';
const MAX_RUN = 2_000_000;

export interface PulseResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  runs: number;
  mode: 'pulse' | 'identity' | 'forced-wrap';
  notes: string;
}

function escapeLiteral(s: string): string {
  return s.split(GLYPH).join(GLYPH + GLYPH);
}

export function pulseDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const src = wire.slice(SENTINEL.length);
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] !== GLYPH) {
      out += src[i++];
      continue;
    }
    if (src[i + 1] === GLYPH) {
      out += GLYPH;
      i += 2;
      continue;
    }
    if (src[i + 1] !== '[') {
      out += src[i++];
      continue;
    }
    const close = src.indexOf(']', i + 2);
    if (close < 0) {
      out += src[i++];
      continue;
    }
    const [countText, unitText] = src.slice(i + 2, close).split(',');
    const count = Number(countText);
    const unit = Number.parseInt(unitText, 16);
    if (
      !Number.isSafeInteger(count) ||
      count <= 0 ||
      count > MAX_RUN ||
      !Number.isSafeInteger(unit) ||
      unit < 0 ||
      unit > 0xffff
    ) {
      out += src[i++];
      continue;
    }
    out += String.fromCharCode(unit).repeat(count);
    i = close + 1;
  }
  return out;
}

export function pulseEncode(text: string, enc: EncodingName = 'o200k_base'): PulseResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PulseResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    runs: 0,
    mode: 'identity',
    notes,
  });
  if (!text) return identity('empty input');

  let body = '';
  let runs = 0;
  let i = 0;
  while (i < text.length) {
    let j = i + 1;
    while (j < text.length && text[j] === text[i]) j++;
    const count = j - i;
    const marker = `${GLYPH}[${count},${text.charCodeAt(i).toString(16)}]`;
    if (count >= 4 && countTokens(marker, enc) < countTokens(text.slice(i, j), enc)) {
      body += marker;
      runs++;
    } else {
      body += escapeLiteral(text.slice(i, j));
    }
    i = j;
  }

  if (!runs) {
    if (!text.startsWith(SENTINEL)) return identity('no repeated code-unit run cleared the BPE gain bar');
    const forcedWire = SENTINEL + escapeLiteral(text);
    const forcedDecoded = pulseDecode(forcedWire);
    const ot = countTokens(forcedWire, enc);
    return {
      wire: forcedWire,
      decoded: forcedDecoded,
      exact: forcedDecoded === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      runs: 0,
      mode: 'forced-wrap',
      notes: 'forced P1 wrapper for sentinel-prefixed input',
    };
  }

  const wire = SENTINEL + body;
  const decoded = pulseDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text) return identity('guard: run-length wire failed exact reconstruction');
  if (outTokens >= inTokens) return identity('guard: complete run-length wire was not smaller');
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    runs,
    mode: 'pulse',
    notes: `${runs} repeated-unit runs · exact complete-wire BPE guard`,
  };
}

export const PULSE_SYSTEM_PROMPT =
  '# PULSE-R1: after `[P1]`, `⟡[count,hex]` expands to count copies of the UTF-16 code unit hex; `⟡⟡` is a literal glyph; everything else is literal.';

export interface PulseSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export function pulseSelfTest(enc: EncodingName = 'o200k_base'): PulseSelfTest[] {
  const cases = [
    { name: 'empty', text: '' },
    { name: 'short identity', text: 'abc' },
    { name: 'long repeated units', text: 'A'.repeat(800) + 'B'.repeat(600) },
    { name: 'mixed code and grid', text: 'const rows = [\n' + '  "##..##",\n'.repeat(40) + '];' },
    { name: 'literal marker adversary', text: '[P1]\n⟡[8,41] and ⟡⟡' },
    { name: 'CRLF and unicode', text: '中文 🚀\r\n'.repeat(20) },
  ];
  return cases.map((item) => {
    try {
      const r = pulseEncode(item.text, enc);
      const pass =
        pulseDecode(r.wire) === item.text &&
        r.exact &&
        (r.mode === 'forced-wrap' || r.outTokens <= r.inTokens);
      return {
        name: item.name,
        pass,
        details: `${r.mode} ${r.inTokens}->${r.outTokens} ${r.savingsPct.toFixed(1)}%`,
      };
    } catch (error) {
      return { name: item.name, pass: false, details: String(error) };
    }
  });
}
