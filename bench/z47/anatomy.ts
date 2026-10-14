// Z47 — residue anatomy: where do the tokens of a DAEDALUS message go, and what is the body literal made of?
// usage: OMEGA_DET=1 bench/tmp/run.sh bench/z47/anatomy.ts <files...>   (TSV to stdout)
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { tokenStrings, countTokens } from '@/lib/omega/bpe';
import { chironParseTape, chironOpsUsed, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';

const enc = 'o200k_base' as const;
const cls = (s: string): string => {
  if (/^\s+$/.test(s)) return 'ws';
  if (/^[\r\n]+$/.test(s)) return 'ws';
  const t = s.replace(/^ /, '');
  if (/^\p{L}+$/u.test(t)) return /^\p{Lu}/u.test(t) ? 'Word' : 'word';
  if (/^\p{N}+$/u.test(t)) return 'num';
  if (/^[\p{P}\p{S}]+[\r\n]*$/u.test(t)) return 'punct';
  if (/^[\p{L}\p{N}_]+$/u.test(t)) return 'alnum';
  return 'mixed';
};
console.log(['file', 'raw', 'M', 'contract', 'header', 'rules', 'bodyGlyph', 'bodyLit', 'lit_word', 'lit_Word', 'lit_num', 'lit_punct', 'lit_ws', 'lit_alnum', 'lit_mixed', 'litRepeated2+', 'litHapax', 'rawCopyable'].join('\t'));
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  const r = daedalusEncode(text, enc);
  if (r.mode !== 'daedalus') { console.log([f, raw, r.messageTokens, 0, 0, 0, 0, raw, 'identity'].join('\t')); continue; }
  const wire = r.wire;
  const sepAt = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(CHIRON_START.length, sepAt);
  const body = wire.slice(sepAt + 1);
  const u = chironOpsUsed(wire);
  const rules = chironParseTape(tape, u.script!) ?? [];
  const glyphs = new Set(rules.map((x) => x.glyph));
  const headerTok = countTokens(CHIRON_START + tape + CHIRON_SEP, enc);
  const bodyToks = tokenStrings(body, enc).map((x) => x.s);
  // raw token frequencies (how often does this literal token string occur in the ORIGINAL token stream?)
  const rawToks = tokenStrings(text, enc).map((x) => x.s);
  const freq = new Map<string, number>();
  for (const t of rawToks) freq.set(t, (freq.get(t) ?? 0) + 1);
  // LZ-style copyable positions in the raw stream (min match 2) — tokens covered by an earlier 2-gram occurrence
  const seen2 = new Set<string>();
  let copyable = 0;
  for (let i = 0; i + 1 < rawToks.length; i++) {
    const k = rawToks[i] + '\u0000' + rawToks[i + 1];
    if (seen2.has(k)) copyable++;
    seen2.add(k);
  }
  const c: Record<string, number> = { word: 0, Word: 0, num: 0, punct: 0, ws: 0, alnum: 0, mixed: 0 };
  let bodyGlyph = 0, bodyLit = 0, rep = 0, hap = 0;
  for (const t of bodyToks) {
    if ([...t].some((ch) => glyphs.has(ch))) { bodyGlyph++; continue; }
    bodyLit++;
    c[cls(t)]++;
    if ((freq.get(t) ?? 0) >= 2) rep++; else hap++;
  }
  console.log([f, raw, r.messageTokens, r.contractTokens, headerTok, rules.length, bodyGlyph, bodyLit, c.word, c.Word, c.num, c.punct, c.ws, c.alnum, c.mixed, rep, hap, copyable].join('\t'));
}
