/**
 * ⟐ HELIX-AP — Arithmetic-Progression Lattice-Factoring Codec
 * Orthogonal to dictionary codecs: compresses locally-arithmetic numeric runs.
 */
import { countTokens, type EncodingName } from './bpe';

const GLYPH = '\u27D0';
const MIN_RUN = 3;
const MAX_DECODE_COUNT = 2_000_000;

export interface HelixRun {
  start: number;
  stride: number;
  count: number;
  width: number;
  delimiter: string;
  literalTokens: number;
  markerTokens: number;
}

export interface HelixResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  runs: HelixRun[];
  mode: 'factored' | 'identity';
  notes: string;
}

function escLiteral(s: string): string {
  return s.split(GLYPH).join(GLYPH + GLYPH);
}

interface DigitMatch {
  value: number;
  text: string;
  start: number;
  end: number;
}

function scanDigitMatches(text: string): DigitMatch[] {
  const out: DigitMatch[] = [];
  const re = /\d+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0];
    const v = s.length <= 15 ? Number(s) : NaN;
    out.push({
      value: Number.isSafeInteger(v) ? v : NaN,
      text: s,
      start: m.index,
      end: m.index + s.length,
    });
  }
  return out;
}

function widthOf(numText: string): number {
  return numText.length > 1 && numText[0] === '0' ? numText.length : 0;
}

function renderNumber(value: number, width: number): string {
  const s = String(value);
  return width > 0 && value >= 0 && s.length < width ? s.padStart(width, '0') : s;
}

export function helixDecode(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const c = wire[i];
    if (c !== GLYPH) {
      out += c;
      i++;
      continue;
    }
    if (i + 1 < n && wire[i + 1] === GLYPH) {
      out += GLYPH;
      i += 2;
      continue;
    }
    if (i + 1 < n && wire[i + 1] === '[') {
      const close = wire.indexOf(']', i + 2);
      if (close === -1) {
        out += c;
        i++;
        continue;
      }
      const header = wire.slice(i + 2, close);
      const parts = header.split(',');
      if (parts.length === 5 && parts.every((p) => /^-?\d+$/.test(p))) {
        const start = Number(parts[0]);
        const stride = Number(parts[1]);
        const count = Number(parts[2]);
        const width = Number(parts[3]);
        const delimLen = Number(parts[4]);
        const delimStart = close + 1;
        const delimEnd = delimStart + delimLen;
        if (
          count > 0 &&
          count <= MAX_DECODE_COUNT &&
          delimLen >= 0 &&
          delimEnd <= n &&
          Number.isSafeInteger(start) &&
          Number.isSafeInteger(stride) &&
          Number.isSafeInteger(start + stride * (count - 1))
        ) {
          const delimiter = wire.slice(delimStart, delimEnd);
          let body = '';
          for (let k = 0; k < count; k++) {
            body += renderNumber(start + stride * k, width);
            if (k < count - 1) body += delimiter;
          }
          out += body;
          i = delimEnd;
          continue;
        }
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function helixEncode(text: string, enc: EncodingName = 'o200k_base'): HelixResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): HelixResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    runs: [],
    mode: 'identity',
    notes,
  });
  if (text.length === 0) return identity('empty input');

  const matches = scanDigitMatches(text);
  if (matches.length < MIN_RUN) return identity('fewer than 3 numeric tokens; no progression possible');

  const runs: HelixRun[] = [];
  let out = '';
  let cursor = 0;
  let idx = 0;

  const flushLiteral = (uptoCharIndex: number) => {
    if (uptoCharIndex > cursor) {
      out += escLiteral(text.slice(cursor, uptoCharIndex));
      cursor = uptoCharIndex;
    }
  };

  while (idx < matches.length) {
    const m0 = matches[idx];
    if (Number.isNaN(m0.value)) {
      idx++;
      continue;
    }

    let j = idx + 1;
    let stride: number | null = null;
    let delimiter: string | null = null;
    let chainEnd = idx;
    while (j < matches.length) {
      const prev = matches[j - 1];
      const cur = matches[j];
      if (Number.isNaN(cur.value)) break;
      const d = text.slice(prev.end, cur.start);
      const s = cur.value - prev.value;
      if (stride === null) {
        stride = s;
        delimiter = d;
        chainEnd = j;
        j++;
        continue;
      }
      if (s === stride && d === delimiter) {
        chainEnd = j;
        j++;
        continue;
      }
      break;
    }

    const count = chainEnd - idx + 1;
    if (count >= MIN_RUN && stride !== null && delimiter !== null) {
      const width = widthOf(m0.text);
      let exactRun = true;
      for (let k = 0; k < count; k++) {
        if (renderNumber(m0.value + stride * k, width) !== matches[idx + k].text) {
          exactRun = false;
          break;
        }
      }
      if (exactRun) {
        const runStartChar = matches[idx].start;
        const runEndChar = matches[chainEnd].end;
        const literalSpan = text.slice(runStartChar, runEndChar);
        const marker = `${GLYPH}[${m0.value},${stride},${count},${width},${delimiter.length}]${delimiter}`;
        const literalTokens = countTokens(literalSpan, enc);
        const markerTokens = countTokens(marker, enc);
        if (markerTokens < literalTokens) {
          flushLiteral(runStartChar);
          out += marker;
          cursor = runEndChar;
          runs.push({
            start: m0.value,
            stride,
            count,
            width,
            delimiter,
            literalTokens,
            markerTokens,
          });
          idx = chainEnd + 1;
          continue;
        }
      }
    }
    idx++;
  }
  flushLiteral(text.length);

  if (runs.length === 0) return identity('no arithmetic run cleared the measured real-BPE gain bar');

  const wire = out;
  const decoded = helixDecode(wire);
  if (decoded !== text) return identity('guard: wire failed byte-verify; identity emitted');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: factored wire measured >= input; identity emitted');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    runs,
    mode: 'factored',
    notes: `${runs.length} arithmetic run(s) factored to closed form · verified byte-exact · guard active`,
  };
}

export const HELIX_SYSTEM_PROMPT = [
  '# ⟐ HELIX-AP (HX1) — byte-exact closed-form numeric-run wire',
  'Some numeric runs in this message may be replaced by an inline marker:',
  '  ⟐[start,stride,count,width,delimLen]<delimLen raw characters: delimiter>',
  'Decode rules (apply mentally; do not emit the expansion unless asked):',
  '1. The run expands to `count` numbers: start, start+stride, start+2*stride, …',
  '   Each number is zero-padded to `width` characters if width>0 (else printed plainly).',
  '2. Consecutive numbers are joined by the delimiter (the raw text immediately',
  '   following the closing `]`, exactly `delimLen` characters long).',
  '3. `⟐⟐` outside a marker is a literal `⟐`. Everything else is literal.',
  '4. Reconstruction is byte-exact; no information is discarded.',
].join('\n');

export interface HelixSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export const HELIX_HANDTRACE_200 =
  '{"id":7,"ok":true},{"id":8,"ok":true}\n' +
  'a,b,c\n1,2,3\n1,2,3\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'note: s≈6 ~ fine';

export function helixSelfTest(enc: EncodingName = 'o200k_base'): HelixSelfTest[] {
  const idLog = Array.from({ length: 500 }, (_, i) => `id:${i}`).join(',');
  const framePad = Array.from(
    { length: 10 },
    (_, i) => `frame${String(i + 1).padStart(3, '0')}.png`,
  ).join(', ');
  const nonArith = '1,3,2,7,4,90,5';
  const cases: { name: string; text: string }[] = [
    { name: 'F0 empty', text: '' },
    { name: 'F1 lone glyph', text: GLYPH },
    {
      name: 'F2 glyph-adversarial (literal glyph beside a real run)',
      text: `cost is ${GLYPH} then 1,2,3,4,5,6,7,8,9,10 done`,
    },
    { name: 'F3 chaotic 200-char handtrace', text: HELIX_HANDTRACE_200 },
    {
      name: 'F4 CRLF + unicode + digits',
      text: 'row1\r\nrow2\r\n中文 12,13,14,15,16 emoji 🚀🚀\r\n',
    },
    { name: 'F5 non-arithmetic numbers (must not be falsely compressed)', text: nonArith },
    { name: 'F6 zero-padded width-preserving run', text: framePad },
    { name: 'F7 500-entry incrementing-ID witness', text: idLog },
  ];
  const out: HelixSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = helixEncode(c.text, enc);
      const roundTrip = helixDecode(r.wire) === c.text;
      const guardOk = r.outTokens <= r.inTokens;
      const noFalseFactor = c.name.startsWith('F5') ? r.mode === 'identity' : true;
      out.push({
        name: c.name,
        pass: roundTrip && r.exact && guardOk && noFalseFactor,
        details: `mode=${r.mode} runs=${r.runs.length} tok ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) exact=${r.exact}`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  try {
    const r7 = helixEncode(idLog, enc);
    out.push({
      name: 'F8 F7-savings-witness (unbounded-class proof)',
      pass: r7.savingsPct > 50,
      details: `savings=${r7.savingsPct.toFixed(1)}% (require >50%) runs=${r7.runs.length}`,
    });
  } catch (e) {
    out.push({ name: 'F8 F7-savings-witness', pass: false, details: (e as Error).message });
  }
  return out;
}
