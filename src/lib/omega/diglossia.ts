/**
 * src/lib/omega/diglossia.ts — X119. ΔΙΓΛΩΣΣΙΑ (diglossia, "two registers").
 * =============================================================================
 *
 * THE MECHANISM, AND WHY IT IS NOT A CODEC ALREADY IN THE STACK
 * -----------------------------------------------------------------------------
 * ΧΕΙΡΩΝ decides ONCE PER RULE whether a substring is worth a glyph, and then
 * every occurrence of that substring is spelled the same way.  The wire-level
 * codecs inherit that quantifier: ΔΙΑΓΡΑΦΗ deletes a whole rule (all users),
 * ΣΥΝΔΥΑΣΜΟΣ / ΓΕΝΝΑΔΑΣ / ΠΡΟΑΓΩΓΗ re-spell a whole rule value, ΜΕΤΑΤΑΞΙΣ moves
 * whole entries.  None of them can say "this occurrence is cheaper as a glyph,
 * that occurrence is cheaper as literal text" — the decision is per-rule, not
 * per-use.
 *
 * BPE is contextual.  A glyph costs one token in isolation but can cost two at
 * a script/ASCII boundary, while the literal it stands for can merge with its
 * neighbours into fewer tokens than the glyph.  The optimal spelling of a rule
 * is therefore a function of the OCCURRENCE, not of the rule.  DIGLOSSIA is the
 * per-occurrence recoding of a finished CHIRON wire:
 *
 *   ADOPT   a literal body span equal to an existing flat rule value  -> glyph
 *   BYPASS  a body/tape window containing flat references             -> literal
 *
 * Both moves keep the rule set, the contract, the script and the decoder
 * unchanged.  The output is an ordinary ΧΕΙΡΩΝ wire; a reader who could expand
 * the incumbent can expand this by the same rule.  No operator, no clause, no
 * new syntax.
 *
 * This is not ΔΙΑΓΡΑΦΗ (which removes the rule itself), not ΣΥΝΔΥΑΣΜΟΣ (which
 * re-spells a whole value as references), not the universal-glyph screen (which
 * changed the contract and was falsified at Δ−4), and not LTSC/CompactPrompt
 * (which add vocabulary or fine-tune).  The dictionary is the incumbent's own
 * tape; the only new object is the per-use choice between its two spellings.
 *
 * GREEDY? YES, bounded and measured.
 * ----------------------------------
 * Each round enumerates candidate sites, prices every single move on the WHOLE
 * message with the real tokenizer, keeps the negative-exact ones, and tries a
 * non-overlapping batch plus a greedy descent.  At most DIGLOSSIA_ROUNDS rounds;
 * every accepted move strictly lowers the complete-message token count, so the
 * loop terminates.  No clock, no encoder call, no randomness.
 *
 * SOURCE CITATION (HONEST).
 * -------------------------
 * No external paper supplies this mechanism and none is claimed.  The framing
 * import is the X119 live search record (bench/x119/research/sources.md):
 *   - LTSC (arXiv:2506.00307) Algorithm 2's overlapping-swap bug is the concrete
 *     adversary shape for span substitution; DIGLOSSIA's sites are disjoint by
 *     construction and re-decoded, so that failure mode is closed.
 *   - CompactPrompt (arXiv:2510.18043) reversible n-gram tables are prior art for
 *     phrase dictionaries (PRAXIS/PHRASE own that here); DIGLOSSIA adds no table.
 *   - "How Far Should Tokenization Go?" (arXiv:2608.18025) Fact–Token vs
 *     Token–State: shorter carrier ≠ better downstream; the claim here is only
 *     carrier tokens, never model quality.
 * The per-occurrence contextual judgment is original to X119.
 *
 * TIME- OR CPU-BOUND?
 * -------------------
 * CPU-bound, no wall clock.  Hard caps: MAX_RULES, MAX_VALUE_LEN, MAX_WINDOW,
 * MAX_ENUMERATED, MAX_PRICED, ROUNDS.  The same input yields the same wire on
 * any machine.
 *
 * WHAT IS PROVED
 * --------------
 * Every accepted candidate satisfies chironDecode(candidate) ===
 * chironDecode(incumbent) byte-for-byte, and countTokens(candidate) <
 * countTokens(incumbent).  The contract prefix is preserved verbatim.  What is
 * NOT proved is that a human still finds the mixed spelling readable; the cold
 * read is executed by the independent CPython CHIRON reader, not assumed.
 */
import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST,
  CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode,
} from './chiron';

export interface DiglossiaResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  rounds: number;
  enumerated: number;
  priced: number;
  adopt: number;
  bypass: number;
  capped: boolean;
}

const ROUNDS = 4;
const MAX_RULES = 512;
const MAX_VALUE_LEN = 240;
const MAX_WINDOW = 96;
const MAX_ENUMERATED = 200_000;
const MAX_PRICED = 60_000;

export function diglossiaDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_DIGLOSSIA === '0'
    || process.env?.OMEGA_DIGLOSSIA === 'false'
    || process.env?.OMEGA_NO_DIGLOSSIA === '1';
}

type Dom = 'body' | 'tape';
interface Site {
  dom: Dom;
  rule: number;          // -1 for body
  i: number;
  j: number;
  rep: string;
  delta: number;
  kind: 'adopt' | 'bypass';
}

interface Frame {
  prefix: string;
  w: number;
  tape: string;
  body: string;
  script: (typeof CHIRON_SCRIPTS)[number];
  parsed: { glyph: string; raw: string }[];
  ref: string;
}

function parseFrame(msg: string): Frame | null {
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) return null;
  const cut = msg.indexOf(CHIRON_SEP, w + CHIRON_START.length);
  if (cut < 0) return null;
  const tape = msg.slice(w + CHIRON_START.length, cut);
  const body = msg.slice(cut + CHIRON_SEP.length);
  const first = tape[0];
  if (!first) return null;
  const script = CHIRON_SCRIPTS.find(s => chironInScript(s, first.codePointAt(0)!));
  if (!script) return null;
  const parsed = chironParseTape(tape, script);
  if (!parsed || parsed.length === 0 || parsed.length > MAX_RULES) return null;
  const wire = msg.slice(w);
  const ref = chironDecode(wire);
  if (ref === wire) return null; // malformed / identity decode: not a candidate
  return { prefix: msg.slice(0, w), w, tape, body, script, parsed, ref };
}

function render(f: Frame, sites: Site[]): string {
  let body = f.body;
  const raws = f.parsed.map(p => p.raw);
  const bodySites = sites.filter(s => s.dom === 'body').sort((a, b) => b.i - a.i);
  for (const s of bodySites) body = body.slice(0, s.i) + s.rep + body.slice(s.j);
  const byRule = new Map<number, Site[]>();
  for (const s of sites) {
    if (s.dom !== 'tape') continue;
    if (!byRule.has(s.rule)) byRule.set(s.rule, []);
    byRule.get(s.rule)!.push(s);
  }
  for (const [ri, list] of byRule) {
    let s = raws[ri]!;
    for (const x of list.slice().sort((a, b) => b.i - a.i)) s = s.slice(0, x.i) + x.rep + s.slice(x.j);
    raws[ri] = s;
  }
  const tape = f.parsed.map((p, i) => p.glyph + raws[i]).join('');
  return f.prefix + CHIRON_START + tape + CHIRON_SEP + body;
}

const overlaps = (a: Site, b: Site) =>
  a.dom === b.dom && a.rule === b.rule && a.i < b.j && b.i < a.j;

export function diglossiaEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): DiglossiaResult {
  const no = (notes: string): DiglossiaResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, rounds: 0, enumerated: 0, priced: 0,
    adopt: 0, bypass: 0, capped: false,
  });
  if (diglossiaDisabled()) return no('diglossia: disabled');

  let msg = incumbent.message;
  let cur = countTokens(msg, enc);
  let ref: string | null = null;
  let enumerated = 0, priced = 0, adopt = 0, bypass = 0, rounds = 0;
  let capped = false;

  for (let round = 0; round < ROUNDS; round++) {
    const f = parseFrame(msg);
    if (!f) break;
    if (ref === null) ref = f.ref;
    if (f.ref !== ref) break; // should not happen; fail closed
    rounds = round + 1;

    // Flat literal rules only: expansion contains no script character.
    const vals = new Map<string, string>();
    for (const p of f.parsed) {
      if (p.raw.startsWith(CHIRON_REP) || p.raw.startsWith(CHIRON_LIST)) continue;
      if (p.raw.length > MAX_VALUE_LEN) continue;
      let v: string;
      try { v = chironDecode(CHIRON_START + f.tape + CHIRON_SEP + p.glyph); } catch { continue; }
      if (v === p.glyph || v.length === 0 || v.length > MAX_VALUE_LEN) continue;
      let hasScript = false;
      for (const ch of v) { if (chironInScript(f.script, ch.codePointAt(0)!)) { hasScript = true; break; } }
      if (hasScript) continue;
      vals.set(p.glyph, v);
    }
    if (vals.size === 0) break;
    const expand = (s: string) => { let o = ''; for (const ch of s) o += vals.get(ch) ?? ch; return o; };
    const base = cur;
    const sites: Site[] = [];

    const price = (s: Site): number => {
      if (priced >= MAX_PRICED) { capped = true; return 0; }
      const c = render(f, [s]);
      priced++;
      return countTokens(c, enc) - base;
    };
    const exact = (s: Site): boolean => {
      const c = render(f, [s]);
      const cw = c.indexOf(CHIRON_START);
      if (cw < 0) return false;
      try { return chironDecode(c.slice(cw)) === ref; } catch { return false; }
    };
    const consider = (s: Site) => {
      if (enumerated >= MAX_ENUMERATED) { capped = true; return; }
      enumerated++;
      const d = price(s);
      if (d < 0 && exact(s)) { s.delta = d; sites.push(s); }
    };

    // ADOPT: literal body occurrences of flat rule values.
    for (const [g, v] of vals) {
      if (v.length < 2) continue;
      let at = f.body.indexOf(v);
      while (at >= 0) {
        consider({ dom: 'body', rule: -1, i: at, j: at + v.length, rep: g, delta: 0, kind: 'adopt' });
        if (capped) break;
        at = f.body.indexOf(v, at + 1);
      }
      if (capped) break;
    }
    // BYPASS body windows (>=2 flat refs).
    if (!capped) {
      const isGB = (i: number) => vals.has(f.body[i] ?? '');
      for (let i = 0; i < f.body.length && !capped; i++) {
        if (!isGB(i)) continue;
        for (let j = i + 2; j <= Math.min(f.body.length, i + MAX_WINDOW); j++) {
          if (!isGB(j - 1)) continue;
          const seg = f.body.slice(i, j);
          let refs = 0; for (const ch of seg) if (vals.has(ch)) refs++;
          if (refs < 2) continue;
          if (enumerated >= MAX_ENUMERATED) { capped = true; break; }
          const v = expand(seg);
          if (countTokens(v, enc) > countTokens(seg, enc) + 1) { enumerated++; continue; }
          consider({ dom: 'body', rule: -1, i, j, rep: v, delta: 0, kind: 'bypass' });
        }
      }
    }
    // BYPASS tape windows (>=1 flat ref).
    if (!capped) {
      for (let ri = 0; ri < f.parsed.length && !capped; ri++) {
        const raw = f.parsed[ri]!.raw;
        if (raw.startsWith(CHIRON_REP) || raw.startsWith(CHIRON_LIST)) continue;
        const isG = (i: number) => vals.has(raw[i] ?? '');
        for (let i = 0; i < raw.length && !capped; i++) {
          if (!isG(i)) continue;
          for (let j = i + 1; j <= Math.min(raw.length, i + MAX_WINDOW); j++) {
            if (!isG(j - 1)) continue;
            const seg = raw.slice(i, j);
            let refs = 0; for (const ch of seg) if (vals.has(ch)) refs++;
            if (refs < 1) continue;
            if (enumerated >= MAX_ENUMERATED) { capped = true; break; }
            const v = expand(seg);
            if (countTokens(v, enc) > countTokens(seg, enc) + 1) { enumerated++; continue; }
            consider({ dom: 'tape', rule: ri, i, j, rep: v, delta: 0, kind: 'bypass' });
          }
        }
      }
    }

    if (sites.length === 0) break;
    sites.sort((a, b) => a.delta - b.delta || (b.j - b.i) - (a.j - a.i) || a.dom.localeCompare(b.dom) || a.rule - b.rule || a.i - b.i);

    let bestMsg = msg, bestTok = cur, bestSites: Site[] = [];
    // Batch: maximal non-overlapping set in delta order.
    const chosen: Site[] = [];
    for (const s of sites) if (!chosen.some(c => overlaps(s, c))) chosen.push(s);
    if (chosen.length) {
      const batch = render(f, chosen);
      if (priced < MAX_PRICED) {
        priced++;
        const bt = countTokens(batch, enc);
        const bw = batch.indexOf(CHIRON_START);
        let ok = false;
        if (bw >= 0) { try { ok = chironDecode(batch.slice(bw)) === ref; } catch { ok = false; } }
        if (ok && bt < bestTok) { bestMsg = batch; bestTok = bt; bestSites = chosen; }
      } else capped = true;
    }
    // Greedy descent in delta order.
    {
      let acc: Site[] = [];
      let accMsg = msg, accTok = cur;
      for (const s of sites) {
        if (acc.some(c => overlaps(s, c))) continue;
        if (priced >= MAX_PRICED) { capped = true; break; }
        const trial = acc.concat([s]);
        const c = render(f, trial);
        priced++;
        const t = countTokens(c, enc);
        if (t >= accTok) continue;
        const cw = c.indexOf(CHIRON_START);
        let ex = false;
        if (cw >= 0) { try { ex = chironDecode(c.slice(cw)) === ref; } catch { ex = false; } }
        if (ex) { acc = trial; accMsg = c; accTok = t; }
      }
      if (accTok < bestTok) { bestMsg = accMsg; bestTok = accTok; bestSites = acc; }
    }

    if (bestTok >= cur || bestMsg === msg) break;
    msg = bestMsg;
    cur = bestTok;
    for (const s of bestSites) { if (s.kind === 'adopt') adopt++; else bypass++; }
    if (capped) break;
  }

  if (msg === incumbent.message) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
      decoded: incumbent.decoded, notes: `diglossia: ${rounds} round(s), ${enumerated} sites, ${priced} prices, no win${capped ? ' (capped)' : ''}`,
      rounds, enumerated, priced, adopt, bypass, capped };
  }
  return {
    applied: true, message: msg, messageTokens: cur, decoded: ref ?? incumbent.decoded,
    notes: `diglossia: ${rounds} round(s), ${enumerated} sites, ${priced} prices, ${adopt} adopt + ${bypass} bypass; M ${incumbent.messageTokens} -> ${cur}${capped ? ' (capped)' : ''}`,
    rounds, enumerated, priced, adopt, bypass, capped,
  };
}
