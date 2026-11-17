/**
 * X133 — WHERE IS THE REMAINING HEADROOM?
 *
 * The frontier message splits into pre / tape / body. This tool measures, per
 * lane, three things that no earlier probe measured with TRUE pricing:
 *
 *   (A) RULE MARGINAL VALUE. Drop each rule (inline its value at every
 *       occurrence, delete the definition) and re-measure the WHOLE message
 *       with the real tokenizer. Earlier "marginal clearing" used the ESTIMATE
 *       c*(t-1) <= (1+t); the estimate ignores tokenisation context, and X131
 *       showed estimates overstate gains badly.
 *
 *   (B) TOKEN-LEVEL n-GRAM RE-MINE, UNCAPPED. X132's re-mine enumerated
 *       CHARACTER substrings of length 3..24 and ranked them by
 *       (occ-1)*charLen — a character-space ranking of a token-space cost.
 *       This one enumerates repeated TOKEN n-grams of length 2..N with no
 *       length cap, which is the object the cost function actually sees.
 *
 *   (C) BODY TOKEN CENSUS by class, with the glyph alphabet DERIVED (a glyph
 *       is a character present in the message but absent from the source), so
 *       non-Cyrillic alphabets are not missed the way X131 missed them.
 *
 * Nothing here mutates the repository; it is measurement only.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';

type Rule = { g: string; v: string };

/** A glyph is a character that occurs in the message but not in the source. */
function glyphSetFor(srcText: string, msg: string): Set<string> {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const g = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    if (!src.has(ch)) g.add(ch);
  }
  return g;
}

function parseTape(t: string, G: Set<string>): Rule[] {
  const rs: Rule[] = []; const seen = new Set<string>(); let cur: Rule | null = null;
  for (const ch of t) {
    if (G.has(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rs.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rs;
}
const buildTape = (rs: Rule[]) => '§' + rs.map(r => r.g + r.v).join('');

/** every occurrence (in body AND in other rule values) — the EUROS invariant */
function replaceAll(s: string, from: string, to: string): string {
  return from.length ? s.split(from).join(to) : s;
}

function tokenize(s: string): string[] {
  return encode(s).map(i => decode([i]));
}

for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const G = glyphSetFor(text, M);
  const i1 = M.indexOf('§');
  const i2 = i1 < 0 ? -1 : M.indexOf('¶', i1);
  const pre = i1 < 0 ? M : M.slice(0, i1);
  const tape = i1 < 0 ? '' : (i2 < 0 ? M.slice(i1) : M.slice(i1, i2));
  const body = i2 < 0 ? '' : M.slice(i2);
  const rules = parseTape(tape, G);

  const name = p.split('/').pop()!;
  console.log(`\n### ${name}  raw=${countTokens(text, enc)} out=${a.messageTokens}  (pre=${countTokens(pre, enc)} tape=${countTokens(tape, enc)} body=${countTokens(body, enc)})  rules=${rules.length}`);

  if (rules.length === 0) { console.log('  no tape / no rules — skip A and B'); continue; }

  // ---------------------------------------------------------------- (A)
  // Marginal value of each rule, priced TRULY on the whole message.
  const baseTok = a.messageTokens;
  let negRules = 0, totNeg = 0;
  const marginals: { g: string; v: string; gain: number }[] = [];
  for (const r of rules) {
    // inline r at EVERY occurrence of its glyph, in body and in sibling values
    const trial: Rule[] = rules.filter(x => x.g !== r.g)
      .map(x => ({ g: x.g, v: replaceAll(x.v, r.g, r.v) }));
    const newBody = replaceAll(body, r.g, r.v);
    const t = countTokens(pre + buildTape(trial) + newBody, enc);
    const gain = baseTok - t;      // >0 means dropping the rule is a WIN
    if (gain > 0) { negRules++; totNeg += gain; }
    marginals.push({ g: r.g, v: r.v, gain });
  }
  marginals.sort((x, y) => y.gain - x.gain);
  console.log(`  (A) rule drop: ${negRules}/${rules.length} rules are NET-NEGATIVE; total recoverable ${totNeg} tok`);
  for (const m of marginals.slice(0, 6)) {
    if (m.gain <= 0) break;
    console.log(`      -${m.gain}  ${JSON.stringify(m.v.slice(0, 46))}`);
  }

  // ---------------------------------------------------------------- (B)
  // Token-level n-gram re-mine of the body, UNCAPPED length, true pricing.
  const btoks = tokenize(body);
  const MAXN = +(process.env.MAXN ?? '40');
  // count repeated token n-grams via a rolling hash over token ids
  const ids = encode(body);
  const n = ids.length;
  type Cand = { len: number; occ: number; start: number };
  const best = new Map<string, Cand>();
  for (let L = 2; L <= MAXN; L++) {
    const seen = new Map<string, number[]>();
    // rolling polynomial hash -> verify by slice on collision-prone buckets
    let h = 0; const PR = 1000003;
    for (let i = 0; i < n; i++) {
      h = (h * PR + ids[i]! + 1) % 2147483647;
      if (i >= L) {
        // remove ids[i-L] contribution — cheap enough to just recompute via slice key
      }
    }
    // exact: key by the decoded substring (bounded work)
    for (let i = 0; i + L <= n; i++) {
      const key = ids.slice(i, i + L).join(',');
      const arr = seen.get(key);
      if (arr) arr.push(i); else seen.set(key, [i]);
    }
    for (const [key, arr] of seen) {
      if (arr.length < 2) continue;
      // keep only NON-OVERLAPPING occurrence count
      let occ = 0, lastEnd = -1;
      for (const s of arr) { if (s >= lastEnd) { occ++; lastEnd = s + L; } }
      if (occ < 2) continue;
      const prev = best.get(key);
      if (!prev || (occ - 1) * L > (prev.occ - 1) * prev.len) {
        best.set(key, { len: L, occ, start: arr[0]! });
      }
    }
  }
  const ranked = [...best.entries()]
    .map(([k, c]) => ({ key: k, ...c, score: (c.occ - 1) * (c.len - 1) - 1 }))
    .filter(c => c.score > 0)
    .sort((x, y) => y.score - x.score);
  console.log(`  (B) token n-grams: ${ranked.length} candidates with score>0 (n<=${MAXN}, body ${n} tokens)`);
  for (const c of ranked.slice(0, 8)) {
    const phrase = decode(c.key.split(',').map(Number));
    console.log(`      score ${String(c.score).padStart(4)}  len=${c.len} occ=${c.occ}  ${JSON.stringify(phrase.slice(0, 70))}`);
  }

  // ---------------------------------------------------------------- (C)
  const Garr = [...G];
  const classes: Record<string, number> = { glyph: 0, num: 0, word: 0, other: 0 };
  for (const t of btoks) {
    let isG = false;
    for (const ch of t) if (G.has(ch)) { isG = true; break; }
    if (isG) classes.glyph!++;
    else if (/^[\s]*[0-9][0-9.,:%\/]*$/.test(t)) classes.num!++;
    else if (/[A-Za-zÀ-ɏ]/.test(t)) classes.word!++;
    else classes.other!++;
  }
  console.log(`  (C) body classes: glyph=${classes.glyph} word=${classes.word} num=${classes.num} other=${classes.other}  (alphabet ${Garr.length}: ${Garr.slice(0, 24).join('')})`);
}
