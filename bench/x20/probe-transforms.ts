/**
 * X20 probe — GROSS (tokenizer-only) upper-bound screen for candidate reversible transforms.
 *
 * For a transform T with a one-sentence contract costing c tokens, the *source-level* screen is
 *     gain_gross(T,x) = tok(x) - tok(T(x)) - c
 * This is a filter, not a measurement of the codec: DAEDALUS is applied afterwards in the real
 * codec, and it can absorb part of the saving (or amplify it). A transform with gain_gross <= 0
 * is dropped here; the survivors are re-measured end to end with the real encoder.
 *
 * usage: bench/x20/run.sh bench/x20/probe-transforms.ts <lanes-file>
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc = 'o200k_base' as const;

/* ------------------------------------------------------------------ *
 * candidate transforms. each returns null when it does not apply.
 * ------------------------------------------------------------------ */

type T = (s: string) => string | null;

/** every maximal digit run whose length is in `lens` is a shaped number; strip nothing yet. */
function shapeOf(num: string): string {
  return num.replace(/[0-9]/g, '9');
}

/** Collect the recurring "digit skeleton" shapes: a maximal digit+separator run. */
const NUMRUN = /[0-9](?:[0-9]|[.,:\/\-_ ](?=[0-9]))*/g;

function skeletons(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const mm of s.matchAll(NUMRUN)) {
    const run = mm[0];
    if (!/[^0-9]/.test(run)) continue; // pure digits: nothing to strip
    const sh = shapeOf(run);
    m.set(sh, (m.get(sh) ?? 0) + 1);
  }
  return m;
}

/** T1: strip separators from every run of a chosen shape set (shapes with distinct digit counts). */
function tShape(minCount: number): T {
  return (s) => {
    const sk = skeletons(s);
    const shapes = [...sk.entries()].filter(([, c]) => c >= minCount).map(([sh]) => sh);
    if (!shapes.length) return null;
    // keep only shapes whose digit-count is unique among the kept shapes
    const byLen = new Map<number, string[]>();
    for (const sh of shapes) {
      const n = sh.replace(/[^9]/g, '').length;
      byLen.set(n, [...(byLen.get(n) ?? []), sh]);
    }
    const keep = new Set<string>();
    for (const [, list] of byLen) if (list.length === 1) keep.add(list[0]);
    if (!keep.size) return null;
    let out = '';
    let last = 0;
    for (const mm of s.matchAll(NUMRUN)) {
      const sh = shapeOf(mm[0]);
      if (!keep.has(sh)) continue;
      out += s.slice(last, mm.index) + mm[0].replace(/[^0-9]/g, '');
      last = (mm.index ?? 0) + mm[0].length;
    }
    out += s.slice(last);
    return out === s ? null : out;
  };
}

/** T2: ISO date only, 9999-99-99 -> 8 digits, everywhere. */
const tIsoDate: T = (s) => {
  const out = s.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$1$2$3');
  return out === s ? null : out;
};

/** T3: ISO datetime 9999-99-99[ T]99:99:99(.999)? -> digits only. */
const tIsoDateTime: T = (s) => {
  const out = s.replace(/\b(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(\.\d+)?\b/g,
    (_m, a, b, c, d, e, f, g) => a + b + c + d + e + f + (g ? g.slice(1) : ''));
  return out === s ? null : out;
};

/** T4: clock time 99:99(:99)? -> digits. */
const tClock: T = (s) => {
  const out = s.replace(/\b(\d{2}):(\d{2})(?::(\d{2}))?\b/g, (_m, a, b, c) => a + b + (c ?? ''));
  return out === s ? null : out;
};

/** T5: CRLF -> LF. */
const tCrlf: T = (s) => (s.includes('\r\n') ? s.replace(/\r\n/g, '\n') : null);

/** T6: leading space runs -> one marker + count (indent run-length). */
const tIndent: T = (s) => {
  if (!/\n {2,}/.test(s)) return null;
  return s.replace(/\n( +)/g, (_m, sp: string) => '\n\u2423' + (sp.length >= 2 ? String(sp.length) : sp));
};

/** T7: JSON object keys unquoted ({"a":1} -> {a:1}); string values untouched. */
const tJsonKeys: T = (s) => {
  if (!/"[A-Za-z0-9_$.\-/ ]+"\s*:/.test(s)) return null;
  return s.replace(/"([A-Za-z0-9_$.\-/ ]+)"(\s*:)/g, '$1$2');
};

/** T8: leading zero of a fraction dropped: 0.5 -> .5 (and -0.5 -> -.5). */
const tLeadZero: T = (s) => {
  const out = s.replace(/(^|[^0-9.])0(\.\d)/g, '$1$2');
  return out === s ? null : out;
};

/** T9: blank-line runs of k>=2 collapsed to one marker + count. */
const tBlank: T = (s) => {
  if (!/\n\n\n/.test(s)) return null;
  return s.replace(/\n{3,}/g, (m) => '\n\n\u2424' + (m.length - 2));
};

/** T10: thousands separators removed (known negative; control). */
const tThousands: T = (s) => {
  const out = s.replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (_m, g) => g.replace(/,/g, ''));
  return out === s ? null : out;
};

/** T11: markdown link [t](u) -> t⟨u⟩ (bracket/paren -> single glyphs). */
const tMdLink: T = (s) => {
  if (!/\[[^\]\n]*\]\([^)\n]*\)/.test(s)) return null;
  return s.replace(/\[([^\]\n]*)\]\(([^)\n]*)\)/g, '$1\u27e8$2\u27e9');
};

/** T12: version-ish dotted numbers 9.9.9 -> digits (control: high collision risk). */
const tVersion: T = (s) => {
  const out = s.replace(/\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, '$1$2$3');
  return out === s ? null : out;
};

const TRANSFORMS: Array<[string, number, T]> = [
  ['shape>=2', 16, tShape(2)],
  ['shape>=4', 16, tShape(4)],
  ['iso-date', 12, tIsoDate],
  ['iso-datetime', 14, tIsoDateTime],
  ['clock', 10, tClock],
  ['crlf', 8, tCrlf],
  ['indent-rl', 16, tIndent],
  ['json-keys', 14, tJsonKeys],
  ['lead-zero', 10, tLeadZero],
  ['blank-rl', 12, tBlank],
  ['thousands', 10, tThousands],
  ['md-link', 12, tMdLink],
  ['version', 12, tVersion],
];

const lanes = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
const hdr = ['lane', 'raw'].concat(TRANSFORMS.map(t => t[0]));
console.log(hdr.join('\t'));
const tot = new Map<string, number>(TRANSFORMS.map(t => [t[0], 0]));
const wins = new Map<string, number>(TRANSFORMS.map(t => [t[0], 0]));
for (const f of lanes) {
  let text: string;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const raw = countTokens(text, enc);
  const row: string[] = [f.split('/').pop() ?? f, String(raw)];
  for (const [name, c, fn] of TRANSFORMS) {
    let g = 0;
    try {
      const out = fn(text);
      if (out === null) { row.push('.'); continue; }
      g = raw - countTokens(out, enc) - c;
      tot.set(name, (tot.get(name) ?? 0) + Math.max(0, g));
      if (g > 0) wins.set(name, (wins.get(name) ?? 0) + 1);
    } catch { row.push('ERR'); continue; }
    row.push(String(g));
  }
  console.log(row.join('\t'));
}
console.log('TOTAL\t-\t' + TRANSFORMS.map(([n]) => `${tot.get(n)}(${wins.get(n)}w)`).join('\t'));
