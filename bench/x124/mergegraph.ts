/**
 * X124 probe — is the glyph alphabet a merge graph we have never optimized?
 *
 * Every reference in the body costs ~1 token. The tape is delimiter-free, so
 * two ADJACENT references are two characters the tokenizer may or may not fuse
 * into one token. Nothing in the stack chooses letters to make that happen:
 * the existing relabelling codecs price the message they are given and hill
 * climb, but a random reassignment hits a merging pair with probability
 * ~|M|/|V|^2, i.e. ~5e-6 for CJK. This probe builds the merge graph M
 * (pairs of in-script characters that are a single o200k token), embeds the
 * body's rule-adjacency multigraph into it constructively, and prices the
 * result.
 */
import * as fs from 'node:fs';
import * as O200K from 'gpt-tokenizer/encoding/o200k_base';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode, CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const CORE: any = (O200K as any).default?.bytePairEncodingCoreProcessor;
const VOCAB: Map<string, number> = CORE.bytePairStringRankEncoder;

function cpLen(s: string): number { let n = 0; for (const _ of s) n++; return n; }
function scriptOfCh(ch: string): any {
  const cp = ch.codePointAt(0)!;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}

interface ScriptData { name: string; chars: string[]; adj: Map<string, string[]>; }
const CACHE = new Map<string, ScriptData>();
function scriptData(name: string): ScriptData {
  const hit = CACHE.get(name); if (hit) return hit;
  const chars: string[] = [];
  const adj = new Map<string, string[]>();
  for (const [s] of VOCAB) {
    const n = cpLen(s);
    if (n === 1) { const sc = scriptOfCh(s); if (sc && sc.name === name) chars.push(s); }
    else if (n === 2) {
      const a = [...s][0], b = [...s][1];
      const sa = scriptOfCh(a);
      if (sa && sa.name === name && scriptOfCh(b) === sa) {
        let l = adj.get(a); if (!l) adj.set(a, l = []);
        l.push(b);
      }
    }
  }
  const d = { name, chars, adj, } as ScriptData;
  CACHE.set(name, d);
  return d;
}

function parseTape(tape: string): Array<{ glyph: string; raw: string }> | null {
  if (!tape) return [];
  const sc = scriptOfCh(tape[0]); if (!sc) return null;
  const inS = (c: string) => { const s = scriptOfCh(c); return s !== null && s.name === sc.name; };
  const used = new Set<string>(); const out: Array<{ glyph: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i];
    if (!inS(g) || used.has(g)) return null;
    used.add(g);
    let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    out.push({ glyph: g, raw: tape.slice(i + 1, j) }); i = j;
  }
  return out;
}

interface Lane { path: string; message: string; }
const lanes: Lane[] = fs.readFileSync('bench/x123/receipts/ab2-messages.jsonl', 'utf8').split('\n').filter(Boolean)
  .map((l) => { const o = JSON.parse(l); return { path: o.path, message: o.message }; });

/** Greedy: heaviest adjacency edges first, embed into the merge graph. */
function embed(rules: Array<{ glyph: string; raw: string }>, body: string, sd: ScriptData, scriptName: string): Map<string, string> {
  const glyphs = new Set(rules.map((r) => r.glyph));
  const inS = (c: string) => { const s = scriptOfCh(c); return s !== null && s.name === scriptName; };
  const adj = new Map<string, number>();
  let prev: string | null = null;
  for (const c of body) {
    if (inS(c) && glyphs.has(c)) { if (prev !== null) { const k = prev + c; adj.set(k, (adj.get(k) ?? 0) + 1); } prev = c; }
    else prev = null;
  }
  const edges = [...adj.entries()].sort((a, b) => b[1] - a[1]);
  const assign = new Map<string, string>();
  const used = new Set<string>();
  const deg = (x: string) => (sd.adj.get(x) ?? []).length;
  const pick = (a: string | null, b: string | null): [string, string] | null => {
    // a, b are rule glyphs; null means unassigned
    if (a !== null && b !== null) return null;
    if (a !== null) {
      const la = assign.get(a)!;
      const cands = (sd.adj.get(la) ?? []).filter((y) => !used.has(y)).sort((p, q) => deg(q) - deg(p));
      return cands.length ? [la, cands[0]] : null;
    }
    if (b !== null) {
      const lb = assign.get(b)!;
      const cands: string[] = [];
      for (const x of sd.chars) if (!used.has(x) && x !== lb && (sd.adj.get(x) ?? []).includes(lb)) cands.push(x);
      cands.sort((p, q) => deg(q) - deg(p));
      return cands.length ? [cands[0], lb] : null;
    }
    // neither assigned: pick the unused merge edge whose endpoints have the best remaining degree
    let best: [string, string] | null = null; let bs = -1;
    for (const x of sd.chars) {
      if (used.has(x)) continue;
      for (const y of sd.adj.get(x) ?? []) {
        if (used.has(y)) continue;
        const s = deg(x) + deg(y);
        if (s > bs) { bs = s; best = [x, y]; }
      }
    }
    return best;
  };
  for (const [k] of edges) {
    const a = k[0], b = k[1];
    const aa = assign.has(a) ? a : null;
    const bb = assign.has(b) ? b : null;
    if (aa !== null && bb !== null) continue;
    const p = pick(aa, bb);
    if (p) {
      if (aa === null) { assign.set(a, p[0]); used.add(p[0]); }
      if (bb === null) { assign.set(b, p[1]); used.add(p[1]); }
    }
  }
  for (const g of glyphs) if (!assign.has(g)) {
    const c = sd.chars.find((x) => !used.has(x));
    if (c === undefined) break;
    assign.set(g, c); used.add(c);
  }
  return assign;
}

const enc = 'o200k_base' as const;
let sumBase = 0, sumNew = 0;
console.log('lane                      script    rules  adjE   |M|    base    new    delta  exact');
for (const lane of lanes) {
  const m = lane.message;
  const k = m.indexOf('§'); if (k < 0) { console.log(`${lane.path.split('/').pop()!.padEnd(26)} NOFRAME`); continue; }
  const contract = m.slice(0, k);
  const rest = m.slice(k); const sep = rest.indexOf('¶');
  const tape = rest.slice(1, sep); const body = rest.slice(sep + 1);
  const sc = scriptOfCh(tape[0]); if (!sc) { console.log(`${lane.path.split('/').pop()!.padEnd(26)} NOSCRIPT`); continue; }
  const rules = parseTape(tape); if (!rules) { console.log(`${lane.path.split('/').pop()!.padEnd(26)} BADTAPE`); continue; }
  const sd = scriptData(sc.name);
  const baseTok = countTokens(m, enc);
  const assign = embed(rules, body, sd, sc.name);
  const remap = (s: string): string => {
    let out = '';
    for (const ch of s) {
      const s2 = scriptOfCh(ch);
      out += (s2 && s2.name === sc.name && assign.has(ch)) ? assign.get(ch)! : ch;
    }
    return out;
  };
  const newTape = remap(tape);
  const newBody = remap(body);
  const newWire = CHIRON_START + newTape + CHIRON_SEP + newBody;
  const newMsg = contract + newWire;
  const newTok = countTokens(newMsg, enc);
  const exact = chironDecode(newWire) === chironDecode(rest);
  const oTapeTok = countTokens(CHIRON_START + tape + CHIRON_SEP, enc);
  const nTapeTok = countTokens(CHIRON_START + newTape + CHIRON_SEP, enc);
  const oBodyTok = countTokens(body, enc);
  const nBodyTok = countTokens(newBody, enc);
  let why = '';
  if (!exact) {
    const a = chironDecode(rest); const b = chironDecode(newWire);
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    why = ` DIFF@${i} ${JSON.stringify(a.slice(i, i + 12))} vs ${JSON.stringify(b.slice(i, i + 12))}`;
    // any in-script char in the wire that is not a rule glyph?
    const glyphs2 = new Set(rules.map((r) => r.glyph));
    const strays = new Set<string>();
    for (const c of rest) { const s2 = scriptOfCh(c); if (s2 && s2.name === sc.name && !glyphs2.has(c)) strays.add(c); }
    if (strays.size) why += ` STRAY ${[...strays].length}`;
    const vals = new Set([...assign.values()]);
    if (vals.size !== assign.size) why += ' NONINJECTIVE';
    if ([...strays].some((c) => vals.has(c))) why += ' COLLIDE';
  }
  const adjE = (() => { let n = 0; const g = new Set(rules.map((r) => r.glyph)); let prev: string | null = null;
    for (const c of body) { if (g.has(c)) { if (prev) n++; prev = c; } else prev = null; } return n; })();
  sumBase += baseTok; sumNew += newTok;
  console.log(`${lane.path.split('/').pop()!.padEnd(26)}${sc.name.padEnd(10)}${String(rules.length).padStart(5)}${String(adjE).padStart(6)}${String(baseTok).padStart(7)}${String(newTok).padStart(7)}${String(newTok - baseTok).padStart(7)} tape ${oTapeTok}->${nTapeTok} (${nTapeTok - oTapeTok}) body ${oBodyTok}->${nBodyTok} (${nBodyTok - oBodyTok}) ${exact ? 'exact' : 'INEXACT'}${why}`);
}
console.log(`TOTAL base ${sumBase} new ${sumNew} delta ${sumNew - sumBase}`);
