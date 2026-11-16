/**
 * X124 — micro-test for the merge-graph move, before any codec exists.
 *
 * Question: if two adjacent references (a,b) occur m times in the body and we
 * move the letters of a and b to a FREE pair (x,y) that is a single o200k token,
 * does the tokenizer actually fuse them, and is the whole message cheaper?
 *
 * The move is a 2-point reassignment onto free letters, so no rule is displaced
 * and the tape/body stay parseable. Pricing uses the measured frame-split lemma
 * (tokens(§tape¶ body) === tokens(§tape¶) + tokens(body)) so a candidate costs
 * two counts instead of one over the whole message.
 */
import * as fs from 'node:fs';
import * as O200K from 'gpt-tokenizer/encoding/o200k_base';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, chironDecode, CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const CORE: any = (O200K as any).default?.bytePairEncodingCoreProcessor;
const VOCAB: Map<string, number> = CORE.bytePairStringRankEncoder;
const cpLen = (s: string): number => { let n = 0; for (const _ of s) n++; return n; };
function scriptOfCh(ch: string): any {
  const cp = ch.codePointAt(0)!;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}
interface SD { chars: string[]; adj: Map<string, string[]> }
const CACHE = new Map<string, SD>();
function scriptData(name: string): SD {
  const hit = CACHE.get(name); if (hit) return hit;
  const chars: string[] = []; const adj = new Map<string, string[]>();
  for (const [s] of VOCAB) {
    if (cpLen(s) === 1) { const sc = scriptOfCh(s); if (sc && sc.name === name) chars.push(s); }
    else if (cpLen(s) === 2) {
      const p = [...s]; const sa = scriptOfCh(p[0]);
      if (sa && sa.name === name && scriptOfCh(p[1]) === sa) { let l = adj.get(p[0]); if (!l) adj.set(p[0], l = []); l.push(p[1]); }
    }
  }
  const d = { chars, adj }; CACHE.set(name, d); return d;
}
function parseTape(tape: string): Array<{ glyph: string; raw: string }> | null {
  if (!tape) return [];
  const sc = scriptOfCh(tape[0]); if (!sc) return null;
  const inS = (c: string) => { const s = scriptOfCh(c); return s !== null && s.name === sc.name; };
  const used = new Set<string>(); const out: Array<{ glyph: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i]; if (!inS(g) || used.has(g)) return null;
    used.add(g); let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    out.push({ glyph: g, raw: tape.slice(i + 1, j) }); i = j;
  }
  return out;
}
const enc = 'o200k_base' as const;
const DUMP = true;
const lanes = fs.readFileSync('bench/x123/receipts/ab2-messages.jsonl', 'utf8').split('\n').filter(Boolean)
  .map((l) => JSON.parse(l)).filter((o: any) => ['ls-l-real', 'apt-real', 'ps-aux-real', 'code-ts', 'dpkg-l', 'json-pkg'].some((k) => o.path.includes(k)));
for (const lane of lanes) {
  const m: string = lane.message;
  const k = m.indexOf('§'); if (k < 0) continue;
  const contract = m.slice(0, k); const rest = m.slice(k); const sep = rest.indexOf('¶');
  const tape = rest.slice(1, sep); const body = rest.slice(sep + 1);
  const sc = scriptOfCh(tape[0]); if (!sc) continue;
  const rules = parseTape(tape); if (!rules) continue;
  const sd = scriptData(sc.name);
  const glyphs = new Set(rules.map((r) => r.glyph));
  const free = new Set(sd.chars.filter((c) => !glyphs.has(c)));
  const inS = (c: string) => { const s = scriptOfCh(c); return s !== null && s.name === sc.name; };
  const adj = new Map<string, number>();
  let prev: string | null = null;
  for (const c of body) { if (glyphs.has(c)) { if (prev !== null) { const kk = prev + c; adj.set(kk, (adj.get(kk) ?? 0) + 1); } prev = c; } else prev = null; }
  const edges = [...adj.entries()].sort((a, b) => b[1] - a[1]);
  const tapeSeg = CHIRON_START + tape + CHIRON_SEP;
  const baseTape = countTokens(tapeSeg, enc), baseBody = countTokens(body, enc);
  const baseFull = countTokens(m, enc);
  console.log(`\n=== ${lane.path.split('/').pop()} script=${sc.name} rules=${rules.length} pool=${sd.chars.length} free=${free.size} adjEdges=${adj.size} base=${baseFull} (tape ${baseTape} + body ${baseBody} + contract ${baseFull - baseTape - baseBody})`);
  let applied = 0; let curTape = tape, curBody = body; let curTapeTok = baseTape, curBodyTok = baseBody;
  const curGlyphs = new Set(glyphs); const curFree = new Set(free);
  for (let round = 0; round < 12; round++) {
    let best: { d: number; a: string; b: string; x: string; y: string } | null = null;
    let evals = 0; const all: any[] = [];
    for (const [kk, mult] of edges.slice(0, 40)) {
      const a = kk[0], b = kk[1];
      if (!curGlyphs.has(a) || !curGlyphs.has(b)) continue;
      // candidate free pairs (x,y) with (x,y) a single token
      const cands: Array<[string, string]> = [];
      for (const x of curFree) for (const y of sd.adj.get(x) ?? []) if (curFree.has(y) && y !== x) cands.push([x, y]);
      for (const [x, y] of cands.slice(0, 400)) {
        evals++;
        const map = new Map<string, string>([[a, x], [b, y]]);
        const rm = (s: string): string => { let o = ''; for (const c of s) o += map.get(c) ?? c; return o; };
        const nt = rm(curTape), nb = rm(curBody);
        const tt = countTokens(CHIRON_START + nt + CHIRON_SEP, enc);
        if (tt - curTapeTok > 4) continue;
        const bt = countTokens(nb, enc);
        const d = (tt + bt) - (curTapeTok + curBodyTok);
        if (DUMP) all.push({ d, a, b, x, y, tt: tt - curTapeTok, bt: bt - curBodyTok, mult });
        if (d < 0 && (best === null || d < best.d)) best = { d, a, b, x, y };
      }
    }
    if (round === 0 && DUMP) {
      all.sort((p, q) => p.d - q.d);
      console.log('   top candidates by total delta:');
      for (const c of all.slice(0, 12)) console.log(`     d ${String(c.d).padStart(4)} (tape ${String(c.tt).padStart(3)} body ${String(c.bt).padStart(4)}) edge mult ${c.mult} ${JSON.stringify(c.a)}${JSON.stringify(c.b)} -> ${JSON.stringify(c.x)}${JSON.stringify(c.y)} pair1tok ${countTokens(c.x + c.y, enc) === 1}`);
      // isolated: does the merge pair fuse in the body at all?
      const e0 = edges[0]; const a0 = e0[0][0], b0 = e0[0][1];
      const probe = new Map<string, string>([[a0, '\u0401'], [b0, '\u0402']]);
      console.log(`   probe: top edge mult ${e0[1]}; token(ЁЂ)=${countTokens('\u0401\u0402', enc)}`);
    }
    if (!best) { console.log(`  round ${round}: no improving move (${evals} evals)`); break; }
    const map = new Map<string, string>([[best.a, best.x], [best.b, best.y]]);
    const rm = (s: string): string => { let o = ''; for (const c of s) o += map.get(c) ?? c; return o; };
    const nt = rm(curTape), nb = rm(curBody);
    if (chironDecode(CHIRON_START + nt + CHIRON_SEP + nb) !== chironDecode(rest)) { console.log('  INEXACT, aborting'); break; }
    curTape = nt; curBody = nb;
    curTapeTok = countTokens(CHIRON_START + nt + CHIRON_SEP, enc); curBodyTok = countTokens(nb, enc);
    curGlyphs.delete(best.a); curGlyphs.delete(best.b);
    curGlyphs.add(best.x); curGlyphs.add(best.y);
    curFree.delete(best.x); curFree.delete(best.y); curFree.add(best.a); curFree.add(best.b);
    applied++;
    console.log(`  round ${round}: move ${JSON.stringify(best.a)}${JSON.stringify(best.b)} -> ${JSON.stringify(best.x)}${JSON.stringify(best.y)} delta ${best.d} (tape ${curTapeTok} body ${curBodyTok})`);
  }
  const newMsg = contract + CHIRON_START + curTape + CHIRON_SEP + curBody;
  const newFull = countTokens(newMsg, enc);
  console.log(`  TOTAL: ${baseFull} -> ${newFull} (${newFull - baseFull}), moves ${applied}, exact ${chironDecode(CHIRON_START + curTape + CHIRON_SEP + curBody) === chironDecode(rest)}`);
}
