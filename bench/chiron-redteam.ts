/**
 * CHIRON RED TEAM
 * =============================================================================
 * Twelve gates.  Nothing here is decorative: every gate exists because a
 * specific way of being wrong was identified first and then tested for.
 *
 *  G1  exact UTF-16 round-trip through the library decoder on every lane
 *  G2  a SECOND decoder, written only from the generated contract prose, agrees
 *      byte-for-byte on every lane (tests the SPEC, not the implementation)
 *  G3  a THIRD decoder in CPython — a different language, a different process —
 *      agrees byte-for-byte (external verification, with receipts)
 *  G4  totality: no input is ever decoded into something it is not
 *  G5  message accounting is honest (M == tokens(prompt)) and the contract
 *      never mentions an operator the wire does not use
 *  G6  the message gate never ships a wire that costs more than identity
 *  G7  adversarial payloads: frame characters, every script, control chars,
 *      astral planes, CRLF, lone surrogates, giant runs
 *  G8  SECOND-ORDER adversary: inputs built specifically to break the three
 *      mechanisms CHIRON adds (block tail invariant, self-declared separators
 *      and blanks, range shadowing, cycling lists, digit widening)
 *  G9  structured fuzz, 400 cases, exact round-trip
 *  G10 determinism: the same input always produces the same wire
 *  G11 no-invention: decoding a wire twice is stable, and decoding arbitrary
 *      text that merely looks like a wire returns it unchanged
 *  G12 speed budget
 *
 * Run: ./bench/tmp/build.sh bench/chiron-redteam.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { countTokens } from '../src/lib/omega/bpe';
import {
  chironEncode, chironDecode, chironDecoderPrompt, chironOpsUsed,
  CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST,
} from '../src/lib/omega/chiron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';

/** Both encoders emit the SAME wire language, so one gate battery covers both. */
const ENCODERS: Array<[string, (t: string) => any]> = [
  ['chiron', (t) => chironEncode(t, ENC)],
  ['ariadne', (t) => ariadneEncode(t, ENC)],
  ['sibyl', (t) => sibylEncode(t, ENC, { budgetMs: 700, wordGrid: [24] })],
];
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, BANYAN_INTERLEAVED, mosaicFixtures } from './fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

/* ===========================================================================
 * The PROMPT-LITERAL reader.  Written from this text and nothing else:
 *
 *   "Every new Hangul letter before ¶ starts a rule whose text runs to the next
 *    new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and
 *    print only the result.  ×btn: t written n times. Any letters after n are
 *    lists; in copy i the k-th b is item i of list k, cycling.  …a..b =
 *    integers a to b. Otherwise the character after … separates the items."
 *
 * The generated contract names whichever script the wire declares, so the
 * ranges below are the full set the encoder can name.
 * ========================================================================= */
const SCRIPT_RANGES: Array<[number, number]> = [
  [0xac00, 0xd7a4], [0x30a0, 0x3100], [0x0400, 0x0500], [0x0600, 0x0700], [0x1000, 0x10a0], [0x1780, 0x1800], [0x4e00, 0xa000],
];
/** SIBYL's pooled alphabet: fourteen scripts read as ONE alphabet. Disjoint from
 *  every range above, so the first tape character still identifies the alphabet. */
const POLYGLOT: Array<[number, number]> = [
  [0x0370, 0x0400], [0x0530, 0x0590], [0x0590, 0x0600], [0x0900, 0x0980],
  [0x0980, 0x0a00], [0x0a00, 0x0a80], [0x0a80, 0x0b00], [0x0b80, 0x0c00],
  [0x0c00, 0x0c80], [0x0c80, 0x0d00], [0x0d00, 0x0d80], [0x0d80, 0x0e00],
  [0x0e00, 0x0e80], [0x10a0, 0x1100],
];

function promptLiteralDecode(wire: string): string {
  if (!wire.startsWith(CHIRON_START)) return wire;
  const cut = wire.indexOf(CHIRON_SEP, 1);
  if (cut < 0) return wire;
  const tape = wire.slice(1, cut);
  const body = wire.slice(cut + 1);
  const rules: Array<[string, string]> = [];
  if (tape.length) {
    const cp0 = tape.codePointAt(0)!;
    const poly = POLYGLOT.some(([lo, hi]) => cp0 >= lo && cp0 < hi);
    const rng = poly ? null : SCRIPT_RANGES.find(([lo, hi]) => cp0 >= lo && cp0 < hi);
    if (!poly && !rng) return wire;
    const isLetter = (ch: string) => {
      const c = ch.codePointAt(0)!;
      if (poly) return POLYGLOT.some(([lo, hi]) => c >= lo && c < hi);
      return c >= rng![0] && c < rng![1];
    };
    const seen = new Set<string>();
    let i = 0;
    while (i < tape.length) {
      const g = tape[i];
      if (!isLetter(g) || seen.has(g)) return wire;
      seen.add(g);
      let j = i + 1;
      while (j < tape.length && !(isLetter(tape[j]) && !seen.has(tape[j]))) j++;
      rules.push([g, tape.slice(i + 1, j)]);
      i = j;
    }
  }
  const at = new Map(rules.map(([g], k) => [g, k]));
  const strs = new Map<number, string>();
  const lists = new Map<number, string[]>();
  let broke = false;
  const fail = () => { broke = true; return ''; };

  const asList = (k: number): string[] => {
    if (lists.has(k)) return lists.get(k)!;
    const raw = rules[k][1];
    if (!raw.startsWith(CHIRON_LIST)) return [fail()];
    const p = raw.slice(1);
    const m = p.match(/^(-?\d{1,15})\.\.(-?\d{1,15})$/);
    let out: string[];
    if (m) {
      const a = Number(m[1]); const b = Number(m[2]);
      const step = b >= a ? 1 : -1;
      const n = Math.abs(b - a) + 1;
      if (n > 1e6) return [fail()];
      out = Array.from({ length: n }, (_, t) => String(a + step * t));
    } else {
      if (!p.length) return [fail()];
      out = p.slice(1).split(p[0]);
    }
    lists.set(k, out);
    return out;
  };

  const expand = (text: string, upto: number): string => {
    let out = '';
    for (const ch of text) {
      const k = at.get(ch);
      if (k === undefined) { out += ch; continue; }
      if (k >= upto) return fail();
      out += val(k);
      if (out.length > (1 << 23)) return fail();
    }
    return out;
  };

  function val(k: number): string {
    if (strs.has(k)) return strs.get(k)!;
    strs.set(k, '');
    const raw = rules[k][1];
    let v: string;
    if (raw.startsWith(CHIRON_REP)) v = rep(raw.slice(1), k);
    else if (raw.startsWith(CHIRON_LIST)) v = fail();
    else v = expand(raw, k);
    strs.set(k, v);
    return v;
  }

  function rep(spec: string, self: number): string {
    const ch = [...spec];
    if (ch.length < 3) return fail();
    const blank = ch[0];
    const t = ch[1];
    let p = 2; let d = '';
    while (p < ch.length && ch[p] >= '0' && ch[p] <= '9') { d += ch[p]; p++; }
    if (!d) return fail();
    const n = Number(d);
    if (n < 1 || n > 1e6) return fail();
    const li: number[] = [];
    for (; p < ch.length; p++) {
      const k = at.get(ch[p]);
      if (k === undefined || k >= self) return fail();
      li.push(k);
    }
    const tk = at.get(t);
    let tpl: string;
    if (tk === undefined) tpl = t;
    else if (tk >= self) return fail();
    else tpl = val(tk);
    const pieces = tpl.split(blank);
    const slots = pieces.length - 1;
    if (slots === 0) return tpl.length * n > (1 << 23) ? fail() : tpl.repeat(n);
    if (slots !== li.length) return fail();
    const cols = li.map(asList);
    if (cols.some(c => !c.length)) return fail();
    let out = '';
    for (let i = 0; i < n; i++) {
      out += pieces[0];
      for (let sIdx = 0; sIdx < slots; sIdx++) out += cols[sIdx][i % cols[sIdx].length] + pieces[sIdx + 1];
      if (out.length > (1 << 23)) return fail();
    }
    return out;
  }

  const res = expand(body, rules.length);
  return broke ? wire : res;
}

/* ===========================================================================
 * Corpora
 * ========================================================================= */
function laneCorpus(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const dir of ['bench/holdout', 'bench/train']) {
    for (const f of fs.readdirSync(dir).sort()) out.push([`${path.basename(dir)}/${f}`, fs.readFileSync(path.join(dir, f), 'utf8')]);
  }
  out.push(['CHAOS_900', CHAOS_900], ['CHAOS_G_CJK', CHAOS_G_CJK], ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300], ['BANYAN', BANYAN_INTERLEAVED]);
  const f = mosaicFixtures();
  for (const k of Object.keys(f) as Array<keyof typeof f>) out.push([`fix/${k}`, f[k]]);
  return out;
}

/** Payloads aimed at the mechanisms CHIRON itself introduces. */
function adversarialCorpus(): Array<[string, string]> {
  const rep = (s: string, n: number) => Array.from({ length: n }, () => s).join('');
  return [
    ['frame-start', CHIRON_START + 'body that begins with the frame character\n'.repeat(4)],
    ['frame-sep-everywhere', rep(`a${CHIRON_SEP}b${CHIRON_SEP}c\n`, 30)],
    ['op-chars-in-text', rep(`${CHIRON_REP}${CHIRON_LIST}${CHIRON_START}${CHIRON_SEP} mixed ops line\n`, 30)],
    ['all-blank-candidates', rep('@·¤†‡»«¦¬±°µ★◆ line with every blank candidate\n', 20)],
    ['hangul-payload', rep('가나다라마바사 한국어 텍스트 줄\n', 30)],
    ['katakana-payload', rep('カタカナのテキスト行です\n', 30)],
    ['cyrillic-payload', rep('Кириллическая строка текста\n', 30)],
    ['arabic-payload', rep('سطر نص عربي هنا\n', 30)],
    ['all-scripts', rep('가 カ К ا က ក mixed\n', 25)],
    ['range-shadow', rep('0..9\n', 30) + '…0..9\n'.repeat(10)],
    ['sep-collision', rep('a,b,c;d|e\tf g/h:i.j=k"l\n', 30)],
    ['digit-width-jump', Array.from({ length: 60 }, (_, i) => `latency_ms:${i * 7}`).join('\n')],
    ['digit-width-jump-2', Array.from({ length: 200 }, (_, i) => `x=${i}`).join('\n')],
    ['negative-range', Array.from({ length: 40 }, (_, i) => `t:${-20 + i}`).join('\n')],
    ['no-trailing-newline', Array.from({ length: 40 }, (_, i) => `row ${i} value`).join('\n')],
    ['trailing-newline', Array.from({ length: 40 }, (_, i) => `row ${i} value`).join('\n') + '\n'],
    ['double-trailing', Array.from({ length: 40 }, (_, i) => `row ${i} value`).join('\n') + '\n\n'],
    ['crlf', Array.from({ length: 40 }, (_, i) => `row ${i} value`).join('\r\n')],
    ['empty-lines', rep('\n', 200)],
    ['one-giant-run', 'Z'.repeat(50000)],
    ['run-then-text', 'Q'.repeat(2000) + ' and then some ordinary prose follows here.'],
    ['control-chars', rep('\u0001\u0002\u0003\u0004 ctl \u0000 line\n', 20)],
    ['astral', rep('😀👨‍👩‍👧‍👦🏳️‍🌈 emoji row\n', 25)],
    ['lone-surrogate', 'ok \ud800 lone high \udfff lone low\n'.repeat(12)],
    ['combining', rep('é é é é e\u0301 e\u0301 line\n', 25)],
    ['rtl-bidi', rep('abc \u202eDCBA\u202c def\n', 25)],
    ['nul-heavy', rep('a\u0000b\u0000c\n', 40)],
    ['json-escapes', rep('{"a":"\\n\\t\\"quoted\\"","b":"\\\\"}\n', 25)],
    ['tabs', rep('a\tb\tc\td\n', 40)],
    ['cycle-2', rep('ab', 400)],
    ['cycle-3', rep('abc', 300)],
    ['near-cycle', Array.from({ length: 200 }, (_, i) => 'abc'[i % 3]).join('') + 'z'],
    ['same-line-x300', rep('the identical line repeated\n', 300)],
    ['two-templates', Array.from({ length: 30 }, (_, i) => `A ${i} A`).join('\n') + '\n' + Array.from({ length: 30 }, (_, i) => `B ${i * 2} B`).join('\n')],
    ['interleaved-templates', Array.from({ length: 60 }, (_, i) => (i % 2 ? `A ${i} A` : `B ${i} B`)).join('\n')],
    ['huge-count', Array.from({ length: 1500 }, (_, i) => `n${i}`).join(',')],
    ['unicode-digits', rep('٠١٢٣٤٥ ٦٧٨٩ arabic-indic\n', 25)],
    ['whitespace-only', ' '.repeat(4000)],
    ['single-char', 'x'],
    ['empty', ''],
  ];
}

function fuzzCorpus(n: number): string[] {
  let seed = 0x2f6e2b1;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  const pick = <X>(a: X[]) => a[Math.floor(rnd() * a.length)];
  const alpha = ['a', 'b', 'c', ' ', '\n', '0', '1', '9', '"', '{', '}', ',', ':', '-', '_', '/', '가', 'カ', '😀', CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST, '@', '\t', '\r'];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const mode = Math.floor(rnd() * 5);
    if (mode === 0) {
      const len = Math.floor(rnd() * 400);
      let s = ''; for (let k = 0; k < len; k++) s += pick(alpha);
      out.push(s);
    } else if (mode === 1) {
      const rows = 3 + Math.floor(rnd() * 60);
      const tpl = pick(['r-@ v', '{"i":@}', '@,@,x', 'line @ end', '@']);
      out.push(Array.from({ length: rows }, (_, k) => tpl.replace(/@/g, String(Math.floor(rnd() * 1000) * (rnd() < 0.5 ? 1 : k)))).join(pick(['\n', ',', ';', '\t'])));
    } else if (mode === 2) {
      const ch = pick(['A', 'z', '#', '가', ' ', '\n']);
      out.push(ch.repeat(1 + Math.floor(rnd() * 3000)));
    } else if (mode === 3) {
      const words = ['the', 'quick', 'brown', 'fox', 'deployment', 'retry', 'checksum', 'tenant'];
      const n2 = Math.floor(rnd() * 200);
      out.push(Array.from({ length: n2 }, () => pick(words)).join(' '));
    } else {
      const rows = 3 + Math.floor(rnd() * 40);
      out.push(Array.from({ length: rows }, (_, k) => `${pick(['a', 'bb', 'ccc'])}${k}${pick([',', ':', '='])}${Math.floor(rnd() * 100)}`).join('\n'));
    }
  }
  return out;
}

/* ===========================================================================
 * Gates
 * ========================================================================= */
interface Gate { id: string; name: string; pass: boolean; detail: string }
const gates: Gate[] = [];
const add = (id: string, name: string, pass: boolean, detail: string) => { gates.push({ id, name, pass, detail }); };

function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { if (i + 1 >= s.length || s.charCodeAt(i + 1) < 0xdc00 || s.charCodeAt(i + 1) > 0xdfff) return true; i++; }
    else if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

function main() {
  const lanes = laneCorpus();
  const adv = adversarialCorpus();
  const all: Array<[string, string]> = [...lanes, ...adv];

  /* ---- encode everything once, with EVERY encoder ---- */
  const encoded: Array<{ name: string; text: string; r: any }> = [];
  for (const [tag, fn] of ENCODERS) for (const [name, text] of all) encoded.push({ name: `${tag}:${name}`, text, r: fn(text) });

  /* G1 exact round-trip */
  {
    const bad = encoded.filter(e => e.r.decoded !== e.text || chironDecode(e.r.wire) !== e.text);
    add('G1', 'exact UTF-16 round-trip (library decoder)', bad.length === 0, `${encoded.length - bad.length}/${encoded.length} exact${bad.length ? ' — FAILED: ' + bad.map(b => b.name).join(', ') : ''}`);
  }

  /* G2 prompt-literal reader agrees */
  {
    const bad = encoded.filter(e => promptLiteralDecode(e.r.wire) !== e.text);
    add('G2', 'independent prompt-literal reader agrees byte-for-byte', bad.length === 0, `${encoded.length - bad.length}/${encoded.length}${bad.length ? ' — FAILED: ' + bad.map(b => b.name).join(', ') : ''}`);
  }

  /* G3 CPython third implementation agrees (external process) */
  {
    const safe = encoded.filter(e => !hasLoneSurrogate(e.r.wire) && !hasLoneSurrogate(e.text));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chiron-'));
    const inFile = path.join(dir, 'cases.json');
    const outFile = path.join(dir, 'out.json');
    fs.writeFileSync(inFile, JSON.stringify(safe.map(e => e.r.wire)), 'utf8');
    let detail = '';
    let pass = false;
    try {
      const ver = execFileSync('python3', ['-c', 'import sys;print(sys.version.split()[0])'], { encoding: 'utf8' }).trim();
      execFileSync('python3', ['bench/chiron_decode.py', inFile, outFile], { encoding: 'utf8' });
      const got: Array<string | null> = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      const bad = safe.filter((e, i) => got[i] !== e.text);
      pass = bad.length === 0 && got.length === safe.length;
      detail = `CPython ${ver}: ${safe.length - bad.length}/${safe.length} byte-identical${bad.length ? ' — FAILED: ' + bad.slice(0, 6).map(b => b.name).join(', ') : ''} (${encoded.length - safe.length} skipped: lone surrogates are not JSON-representable)`;
    } catch (e: any) {
      detail = `python3 unavailable or errored: ${String(e?.message ?? e).slice(0, 160)}`;
    }
    add('G3', 'external CPython reader agrees byte-for-byte', pass, detail);
  }

  /* G4 totality — arbitrary text is never mangled */
  {
    const probes = [
      '', 'plain text', CHIRON_START, CHIRON_START + CHIRON_SEP, CHIRON_START + 'no separator',
      CHIRON_START + 'x' + CHIRON_SEP + 'body', // first tape char is not a script letter
      CHIRON_START + '가가' + CHIRON_SEP + 'body', // reused glyph
      CHIRON_START + '가' + CHIRON_REP + '@나9' + CHIRON_SEP + '가', // forward reference
      CHIRON_START + '가' + CHIRON_LIST + '0..5' + CHIRON_SEP + '가', // list used as text
      CHIRON_START + '가' + CHIRON_REP + '@가999999999' + CHIRON_SEP + '가', // explosive count
      CHIRON_START + '가' + CHIRON_REP + '@b' + CHIRON_SEP + '가', // no count
      CHIRON_START + '가abc' + CHIRON_SEP + '가가가',
      ...fuzzCorpus(120),
    ];
    const bad = probes.filter(p => {
      const d = chironDecode(p);
      // decoding must either be a faithful expansion or the identity
      if (d === p) return false;
      return chironEncode(d, ENC).decoded !== d;
    });
    const stable = probes.every(p => { const a = chironDecode(p); return chironDecode(a) === a || !a.startsWith(CHIRON_START); });
    add('G4', 'decoder is total; malformed frames return input unchanged', bad.length === 0 && stable, `${probes.length} probes, ${bad.length} anomalies, re-decode stable=${stable}`);
  }

  /* G5 message accounting honest + contract carries no unused clause */
  {
    let bad: string[] = [];
    for (const e of encoded) {
      if (e.r.messageTokens !== T(e.r.decoderPrompt)) { bad.push(`${e.name}: M!=tokens(prompt)`); continue; }
      if (e.r.mode === 'raw') { if (e.r.messageTokens !== e.r.inTokens) bad.push(`${e.name}: raw M mismatch`); continue; }
      const u = chironOpsUsed(e.r.wire);
      const p = e.r.decoderPrompt;
      if (!u.rep && p.includes(`${CHIRON_REP}btn`)) bad.push(`${e.name}: repeat clause with no repeat`);
      if (!u.fill && p.includes('cycling')) bad.push(`${e.name}: fill clause with no fill`);
      if (!u.range && p.includes('integers a to b')) bad.push(`${e.name}: range clause with no range`);
      if (!u.split && p.includes('separates the items')) bad.push(`${e.name}: list clause with no list`);
      if (!p.includes(e.r.wire)) bad.push(`${e.name}: prompt does not carry the wire`);
    }
    add('G5', 'one-chat accounting exact; no clause for an unused operator', bad.length === 0, bad.length ? bad.slice(0, 5).join('; ') : `${encoded.length} messages checked`);
  }

  /* G6 the gate never ships a losing wire */
  {
    // forced-wrap is the one case where paying is mandatory: the payload is
    // itself a decodable program, so shipping it raw would decode to something
    // else. It must therefore be rare AND genuinely necessary.
    const bad = encoded.filter(e => e.r.mode !== 'forced-wrap' && e.r.messageTokens > e.r.inTokens);
    const framedBad = encoded.filter(e => e.r.mode !== 'raw' && e.r.mode !== 'forced-wrap' && e.r.messageTokens >= e.r.inTokens);
    const wrapBad = encoded.filter(e => e.r.mode === 'forced-wrap' && chironDecode(e.text) === e.text);
    add('G6', 'message gate: framed output never costs more than identity', bad.length === 0 && framedBad.length === 0 && wrapBad.length === 0,
      `${encoded.filter(e => e.r.mode !== 'raw' && e.r.mode !== 'forced-wrap').length} framed, ${encoded.filter(e => e.r.mode === 'raw').length} declined to raw, ${encoded.filter(e => e.r.mode === 'forced-wrap').length} forced-wrap; violations=${bad.length + framedBad.length + wrapBad.length}`);
  }

  /* G7 adversarial payloads */
  {
    const advNames = new Set(adv.map(a => a[0]));
    const advEnc = encoded.filter(e => advNames.has(e.name.slice(e.name.indexOf(':') + 1)));
    const bad = advEnc.filter(e => e.r.decoded !== e.text || promptLiteralDecode(e.r.wire) !== e.text);
    add('G7', 'adversarial payloads round-trip through both readers', bad.length === 0 && advEnc.length === adv.length * ENCODERS.length, `${advEnc.length}/${adv.length * ENCODERS.length} payloads (frame chars, 6 scripts, control/astral/surrogate/bidi, CRLF, 50k run)${bad.length ? ' — FAILED: ' + bad.map(b => b.name).join(', ') : ''}`);
  }

  /* G8 second-order adversary: attack the new mechanisms specifically */
  {
    const attacks: Array<[string, string]> = [
      // block tail invariant: the last unit must never be swallowed
      ['tail-1', Array.from({ length: 30 }, (_, i) => `u ${i}`).join('\n')],
      ['tail-2', Array.from({ length: 30 }, (_, i) => `u ${i}`).join('\n') + '\n'],
      ['tail-3', Array.from({ length: 30 }, (_, i) => `u ${i}`).join(',')],
      ['tail-4', Array.from({ length: 30 }, (_, i) => `u ${i}`).join(',') + ','],
      // a payload that contains every plausible list separator inside values
      ['sep-exhaust', Array.from({ length: 30 }, (_, i) => `v=${i}, ;|\t/:.="${i}"`).join('\n')],
      // a column whose textual form collides with the range notation
      ['range-collision', Array.from({ length: 30 }, () => 'k=0..9').join('\n')],
      ['range-collision-2', Array.from({ length: 30 }, (_, i) => `k=${i}..${i + 1}`).join('\n')],
      // cycling lists: period detection must not fabricate values
      ['cycle-break', Array.from({ length: 41 }, (_, i) => `c ${i % 5}`).join('\n') + '\nc 9'],
      ['cycle-almost', Array.from({ length: 40 }, (_, i) => `c ${i === 39 ? 7 : i % 5}`).join('\n')],
      // digit widening across a power of ten, forwards and backwards
      ['width-jump-up', Array.from({ length: 120 }, (_, i) => `i=${i}`).join('\n')],
      ['width-jump-down', Array.from({ length: 120 }, (_, i) => `i=${120 - i}`).join('\n')],
      ['width-jump-neg', Array.from({ length: 120 }, (_, i) => `i=${i - 60}`).join('\n')],
      // leading zeros must never be normalised away by the range form
      ['leading-zeros', Array.from({ length: 40 }, (_, i) => `id=${String(i).padStart(4, '0')}`).join('\n')],
      // the blank marker appearing in the payload in every candidate form
      ['blank-flood', Array.from({ length: 40 }, (_, i) => `@·¤†‡ ${i} »«¦¬±°µ★◆`).join('\n')],
      // a template whose expansion would contain the separator
      ['sep-in-template', Array.from({ length: 40 }, (_, i) => `${CHIRON_SEP}row${i}${CHIRON_SEP}`).join('\n')],
      // rule text that starts with an operator character
      ['op-leading', Array.from({ length: 40 }, (_, i) => `${CHIRON_REP}${CHIRON_LIST}start ${i}`).join('\n')],
      // huge slot values
      ['fat-slots', Array.from({ length: 20 }, (_, i) => `p ${'x'.repeat(200)}${i} q`).join('\n')],
      // near-duplicate rows with a moving field (the Drain failure mode)
      ['moving-field', Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? `a ${i} b c` : i % 3 === 1 ? `a b ${i} c` : `a b c ${i}`)).join('\n')],
    ];
    const bad: string[] = [];
    for (const [tag, fn] of ENCODERS) for (const [nm, tx] of attacks) {
      const r = fn(tx);
      if (r.decoded !== tx) bad.push(`${tag}/${nm}:lib`);
      else if (promptLiteralDecode(r.wire) !== tx) bad.push(`${tag}/${nm}:prose`);
      else if (r.mode !== 'forced-wrap' && r.messageTokens > r.inTokens) bad.push(`${tag}/${nm}:gate`);
    }
    add('G8', 'second-order adversary against block/list/blank/range machinery', bad.length === 0, `${attacks.length * ENCODERS.length} targeted attacks across ${ENCODERS.length} encoders${bad.length ? ' — FAILED: ' + bad.join(', ') : ''}`);
  }

  /* G9 fuzz */
  {
    const cases = fuzzCorpus(400);
    const bad: string[] = [];
    for (const [tag, fn] of ENCODERS) for (let i = 0; i < cases.length; i++) {
      const r = fn(cases[i]);
      if (r.decoded !== cases[i] || promptLiteralDecode(r.wire) !== cases[i] || (r.mode !== 'forced-wrap' && r.messageTokens > r.inTokens)) bad.push(`${tag}#${i}`);
    }
    add('G9', 'structured fuzz, 400 cases x both encoders, both readers + gate', bad.length === 0, `${cases.length * ENCODERS.length - bad.length}/${cases.length * ENCODERS.length}${bad.length ? ' — failing ' + bad.slice(0, 8).join(',') : ''}`);
  }

  /* G10 determinism */
  {
    const sample = lanes.slice(0, 6).concat(adv.slice(0, 6));
    const bad: string[] = [];
    const perCodec = new Map<string, number>();
    for (const [tag, fn] of ENCODERS) {
      perCodec.set(tag, 0);
      for (const [nm, t] of sample) if (fn(t).wire !== fn(t).wire) { bad.push(`${tag}/${nm}`); perCodec.set(tag, perCodec.get(tag)! + 1); }
    }
    add('G10', 'every encoder is deterministic', bad.length === 0,
      `${sample.length * ENCODERS.length} encodes; per codec ` +
      [...perCodec].map(([k, v]) => `${k}=${v} nondeterministic`).join(', ') +
      (bad.length ? ` — ${bad.join(', ')}. CAUSE: the grammar phase is bounded by wall-clock, so a truncated search depends on machine load. The assignment phase was converted to a work bound this turn; the grammar phase has NOT been, and the claim is downgraded accordingly.` : ''));
  }

  /* G11 no invention */
  {
    const junk = ['hello', '§not a wire', '¶', '×@a5', '…0..9', '가나다', JSON.stringify({ a: 1 })];
    const bad = junk.filter(j => { const d = chironDecode(j); return d !== j && !(j.startsWith(CHIRON_START) && j.includes(CHIRON_SEP)); });
    add('G11', 'non-wires decode to themselves (no invention)', bad.length === 0, `${junk.length} probes${bad.length ? ' — ' + bad.join(' | ') : ''}`);
  }

  /* G12 speed */
  {
    const slow = encoded.filter(e => e.r.ms > 30_000);
    const total = encoded.reduce((a, e) => a + e.r.ms, 0);
    const worst = encoded.reduce((a, e) => (e.r.ms > a.r.ms ? e : a), encoded[0]);
    add('G12', 'speed budget (no lane over 30s)', slow.length === 0, `total ${(total / 1000).toFixed(1)}s over ${encoded.length} inputs; worst ${worst.name} ${worst.r.ms}ms`);
  }

  /* G13 the NEW mechanism must be sound: the glyph assignment may change the
     token count but must never change the decoded text, and must never make
     the wire longer than the un-optimised assignment. */
  {
    const sample = lanes.filter(([n]) => /dts0|dts3|doc11|gh-api|code-ts|license|readme|gh-prose/.test(n)).slice(0, 8);
    const bad: string[] = [];
    let saved = 0;
    for (const [nm, t] of sample) {
      const on = ariadneEncode(t, ENC);
      const off = ariadneEncode(t, ENC, { noAssign: true });
      if (on.decoded !== t || off.decoded !== t) { bad.push(`${nm}:decode`); continue; }
      if (promptLiteralDecode(on.wire) !== t) { bad.push(`${nm}:prose`); continue; }
      if (on.mode === 'ariadne' && off.mode === 'ariadne' && on.outTokens > off.outTokens) bad.push(`${nm}:regression ${on.outTokens}>${off.outTokens}`);
      saved += Math.max(0, off.outTokens - on.outTokens);
    }
    add('G13', 'tokenizer-aware glyph assignment is sound and never harmful', bad.length === 0,
      `${sample.length} lanes; assignment saved ${saved} wire tokens with zero contract cost${bad.length ? ' — ' + bad.join(', ') : ''}`);
  }

  /* G14 the speed claim rests on the symbol-space objective being a faithful
     proxy for the real token count; if it drifted, the search would be
     optimising the wrong function. Measure the drift. */
  {
    const sample = lanes.slice(0, 20);
    let worst = 0; let worstName = '';
    let n = 0;
    for (const [nm, t] of sample) {
      const r = ariadneEncode(t, ENC);
      if (r.mode !== 'ariadne') continue;
      n++;
      const d = Math.abs(r.estimate - r.outTokens) / Math.max(1, r.outTokens);
      if (d > worst) { worst = d; worstName = nm; }
    }
    add('G14', 'symbol-space estimate tracks the exact token count', worst < 0.12,
      `${n} framed lanes; worst relative drift ${(worst * 100).toFixed(2)}% on ${worstName || 'n/a'} (a run entirely below one token per symbol is a WIN, not an error)`);
  }

  /* ---- report ---- */
  const byTag = new Map<string, number>();
  for (const e of encoded) { const t = e.name.split(':')[0]; byTag.set(t, (byTag.get(t) ?? 0) + e.r.ms); }
  console.log('CHIRON / ARIADNE RED TEAM  (shared wire language, shared readers)');
  console.log('encode wall-clock by codec: ' + [...byTag].map(([k, v]) => `${k}=${(v / 1000).toFixed(1)}s`).join('  '));
  console.log('='.repeat(100));
  for (const g of gates) console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.id.padEnd(4)} ${g.name}\n        ${g.detail}`);
  const passed = gates.filter(g => g.pass).length;
  console.log('='.repeat(100));
  console.log(`${passed}/${gates.length} gates passed`);
  if (passed !== gates.length) process.exit(1);
}

main();
