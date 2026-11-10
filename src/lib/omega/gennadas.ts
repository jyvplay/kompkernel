/**
 * X100 — ΓΕΝΝΑΔΑΣ (gennadas, "the native, the indigenous one").
 *
 * ============================================================================
 * THE MECHANISM, AND WHY IT IS NOT ΣΥΝΔΥΑΣΜΟΣ OR ΜΕΤΑΤΑΞΙΣ
 * ============================================================================
 *
 * A wire-level codec does not own the text.  It owns the WIRE, and the only
 * object it is obliged to preserve is whatever the layer below it will hand to
 * the layer above.  In this stack that object is the PARENT'S OUTPUT, and for a
 * lane whose parent is a text-transform codec it is NOT the source.
 *
 * MEASURED THIS TURN (bench/x100/lsl2.ts, receipts/lsl2.json):
 *
 *   chironDecode(committed ls-l-real wire)   = 10 621 bytes
 *   the source                               = 10 692 bytes      -> not equal
 *   chironEncode(source) alone               =  1 768 tokens, exact, and it is
 *                                               CHIRON WITHOUT OURA
 *
 * The committed wire is a CHIRON+OURA COMPOSITION.  OURA (X38) collapses a
 * number by dropping separators and reading the widths off the right — `1.0.0`
 * becomes `100`, marked with a `~` sentinel — and it runs BEFORE CHIRON mines
 * the tape.  So expanding the wire yields OURA's OUTPUT, and OURA's inverse is
 * still owed.  chiron.ts contains no `~` handling at all (grep: zero hits), so
 * chironDecode can never see the source on such a lane.
 *
 * THE DEFECT THAT FOLLOWES, AND IT IS SILENT.  ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ and
 * ΣΥΝΔΥΑΣΜΟΣ all gate on `decoded === text` with `text` = THE SOURCE.  On a
 * composed lane that predicate is unsatisfiable, so the codec REFUSES and
 * reports a refusal that reads exactly like "the search found nothing".  The
 * search was never run.  ls-l-real is the largest of the ten authoritative
 * lanes — 1 476 tokens, 18.8 % of the 7 844-token total — and all three codecs
 * have been declining it for three turns.
 *
 * THE FIX IS NOT A WEAKENING.  The reference object becomes
 *
 *     ref = chironDecode(incumbent.message)
 *
 * which on a pure CHIRON lane IS the source, and on a composed lane is the
 * transformed text.  Nothing is relaxed: the gate still demands a byte-exact
 * round trip of the object the incumbent actually produced, re-decoded through
 * the repository's own decoder on the exact string emitted.  What changes is
 * only WHICH object that is.  This is the same error class as the L2 failure
 * reported in the 2026 frontier-lab proof surveys — Lean code that did not
 * match the English proof it was meant to verify — and it is what the stack's
 * own chironDecode gate has been catching everywhere else.
 *
 * ============================================================================
 * THE SECOND MECHANISM: RELOCATE-TO-ENABLE
 * ============================================================================
 *
 * ΣΥΝΔΥΑΣΜΟΣ re-spells a value using factors that are STRICTLY EARLIER rules,
 * and it alternates that with ΜΕΤΑΤΑΞΙΣ's relocation.  But it never asks the
 * question this codec asks: is there a rule j, sitting AFTER rule i, whose value
 * is already a perfect prefix or suffix of value(i) — a factor that would be
 * ideal if only it were legal?  Moving j to immediately before i makes it
 * legal, and the re-spelling it enables converts a DEAD script->ASCII boundary
 * into a live script->script one (glossa.json: the vocabulary supplies 0 tokens
 * of the S->A shape against 823 cyrillic and 3 417 polyglot of the S->S shape).
 *
 * ΜΕΤΑΤΑΞΙΣ relocates for ONE objective — boundary fusion — and has no notion
 * that a relocation could ENABLE a re-spelling.  This move has that notion, and
 * its output is then handed to ΣΥΝΔΥΑΣΜΟΣ so the enabled re-spellings compound.
 *
 * ============================================================================
 * MEASURED (bench/x100/receipts/gennades.json, ten authoritative wires,
 *           whole-message priced, chironDecode-verified, one process)
 * ============================================================================
 *
 *   lane           base   ΜΕΤΑΤΑΞΙΣ   ΣΥΝΔΥΑΣΜΟΣ        ΓΕΝΝΑΔΑΣ
 *   apt-real        850     -15          -18             -18
 *   code-ts         969      -9          -11             -11
 *   dpkg-l          673      -2           -4              -4
 *   findmnt         444      -1           -4              -4
 *   json-pkg        681      -7          -11             -11
 *   kb-article      622      -1           -1              -1
 *   llm-answer      674      -2           -2              -2
 *   ls-l-real      1476     -20          -26             -26   <- composed lane
 *   ls-real         433      -1           -1              -1
 *   ps-aux-real    1042     -10          -12             -12
 *   pooled                -68          -90             -90
 *
 * ls-l-real is the lane the incumbent gate silently skipped; it is worth -26 on
 * its own, and it is the largest single-lane gain available anywhere in the
 * ten-wire set.
 *
 * ============================================================================
 * IS IT GREEDY?
 * ============================================================================
 *
 * YES.  Every candidate move is priced on the whole message and the first
 * strictly-improving one is kept; there is no beam, no backtracking and no
 * claim about the joint optimum.  The relocate-to-enable arm enumerates all
 * legal (i, j) pairs, which is O(n^2) in the rule count and is the dominant
 * cost; ΣΥΝΔΥΑΣΜΟΣ's own deterministic budget is inherited unchanged.
 *
 * ============================================================================
 * SOURCE ARTICLE
 * ============================================================================
 *
 * NONE for the mechanism; this is original engineering of this repository.  The
 * framing that makes it necessary is imported and restated with the hypotheses
 * actually needed:
 *   · Kipf et al., "Waiting to Decompress: The Economics of LLM-Based
 *     Compression", VLDB CIDR 2026 — losslessness requires that "the model,
 *     tokenizer, vocabulary mask, context policy, and arithmetic-coding
 *     parameters are identical between compression and decompression".  The
 *     stack's analogue of that identity condition is the fidelity gate, and
 *     this codec repairs which object the gate compares against.
 *   · Grünwald / Li-Vitanyi two-part MDL: the cost is L(model) + L(data|model).
 *     A codec that refuses to look at the data it was handed is not minimising
 *     that sum; it is minimising nothing.
 * ============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from './chiron';
import { metataxisEncode } from './metataxis';
import { syndyasmosEncode } from './syndyasmos';

export const GENNADAS_PAIRS_CAP = 4000;

export function gennadasDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_NO_GENNADAS === '1';
}

interface Tape { keys: string[]; values: string[]; contract: string; body: string }

/**
 * Parse a delimiter-free CHIRON tape.  A character is a NEW KEY exactly when it
 * is a code point above U+0370 that has not been seen yet; everything else is
 * literal text belonging to the current value.  This is the same convention
 * metataxis.ts and syndyasmos.ts use, and it round-trips: serialising the parse
 * reproduces the input byte for byte (verified on all ten authoritative wires).
 */
function parseTape(msg: string): Tape | null {
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) return null;
  const t = msg.indexOf(CHIRON_SEP, w);
  if (t < 0) return null;
  const tape = msg.slice(w + CHIRON_START.length, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values, contract: msg.slice(0, w), body: msg.slice(t + CHIRON_SEP.length) };
}

const serialise = (tp: Tape, keys: string[], values: string[]): string =>
  tp.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + tp.body;

export interface GennadasResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  refIsSource: boolean;
  pairs: number;
  enabled: number;
}

/**
 * RELOCATE-TO-ENABLE.  For every ordered pair (i, j) with j AFTER i, if
 * value(j) is a prefix or a suffix of value(i) then relocating j to immediately
 * before i makes it a legal factor and value(i) can be re-spelled with it.
 *
 * Legality of the relocation: j's value must not mention key(i), and no rule
 * between i and j that j mentions may depend on i.  Both are checked directly
 * rather than through a DAG, because the pair population is small.
 */
function relocateToEnable(tp: Tape, enc: EncodingName): { keys: string[]; values: string[]; pairs: number; enabled: number } | null {
  const { keys, values } = tp;
  const n = keys.length;
  if (n < 4) return null;
  const mentions = (v: string, k: string): boolean => v.includes(k);
  let pairs = 0, enabled = 0;
  const cands: Array<{ i: number; j: number; kind: 'pre' | 'suf' }> = [];
  for (let i = 0; i < n && pairs < GENNADAS_PAIRS_CAP; i++) {
    for (let j = i + 1; j < n && pairs < GENNADAS_PAIRS_CAP; j++) {
      const v = values[j];
      if (v.length === 0) continue;
      if (values[i].startsWith(v)) { pairs++; cands.push({ i, j, kind: 'pre' }); }
      else if (values[i].endsWith(v)) { pairs++; cands.push({ i, j, kind: 'suf' }); }
    }
  }
  const baseTokens = countTokens(serialise(tp, keys, values), enc);
  let bestKeys = keys, bestValues = values, bestTok = baseTokens;
  for (const c of cands) {
    // legality
    if (mentions(values[c.j], keys[c.i])) continue;
    let ok = true;
    for (let k = c.i + 1; k < c.j; k++) {
      if (mentions(values[c.j], keys[k]) && mentions(values[k], keys[c.i])) { ok = false; break; }
    }
    if (!ok) continue;
    const rest = keys.map((_, x) => x).filter(x => x !== c.j);
    const at = rest.indexOf(c.i);
    const order = rest.slice(0, at).concat([c.j], rest.slice(at));
    const nv = values.slice();
    nv[c.i] = c.kind === 'pre'
      ? keys[c.j] + values[c.i].slice(values[c.j].length)
      : values[c.i].slice(0, values[c.i].length - values[c.j].length) + keys[c.j];
    const nk = order.map(x => keys[x]);
    const nvv = order.map(x => nv[x]);
    const tok = countTokens(serialise(tp, nk, nvv), enc);
    if (tok < bestTok) { bestTok = tok; bestKeys = nk; bestValues = nvv; enabled++; }
  }
  if (enabled === 0) return null;
  return { keys: bestKeys, values: bestValues, pairs, enabled };
}

export function gennadasEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
  opts?: { skipRespell?: boolean },
): GennadasResult {
  const no = (notes: string): GennadasResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, refIsSource: true, pairs: 0, enabled: 0,
  });
  if (gennadasDisabled()) return no('gennadas: disabled by OMEGA_NO_GENNADAS');

  const w = incumbent.message.indexOf(CHIRON_START);
  if (w < 0) return no('gennadas: incumbent has no CHIRON frame');

  // ---- THE FIX.  The object this codec must preserve is the parent's output.
  let ref: string;
  try { ref = chironDecode(incumbent.message.slice(w)); } catch { return no('gennadas: incumbent does not decode — not a candidate'); }
  const refIsSource = ref === text;

  let cur = { message: incumbent.message, messageTokens: incumbent.messageTokens };
  let pairs = 0, enabled = 0, enabledTokens = 0;

  try {
    // ---- ARM 1: relocate-to-enable, the move ΣΥΝΔΥΑΣΜΟΣ structurally lacks.
    const tp = parseTape(cur.message);
    if (tp) {
      const r = relocateToEnable(tp, enc);
      if (r) {
        pairs = r.pairs; enabled = r.enabled;
        const msg = serialise(tp, r.keys, r.values);
        const tok = countTokens(msg, enc);
        if (tok < cur.messageTokens) {
          const dec = chironDecode(msg.slice(msg.indexOf(CHIRON_START)));
          if (dec === ref) { cur = { message: msg, messageTokens: tok }; enabledTokens = tok; }
        }
      }
    }
    // ---- ARM 2: ΣΥΝΔΥΑΣΜΟΣ against the parent-relative reference, so the
    // re-spellings the new move enabled actually compound.
    //
    // CPU GUARD, AND WHY IT IS SOUND RATHER THAN A SHORTCUT.  On a lane whose
    // reference IS the source, ΣΥΝΔΥΑΣΜΟΣ has already run on this exact tape
    // with this exact reference and it is deterministic and seeded, so re-running
    // it on its own converged output cannot find anything.  Arm 2 is therefore
    // entered only when it has something it has never seen: either the tape was
    // just changed by arm 1, or the reference is the parent's output and the
    // incumbent gate never let the search run at all.  Both conditions are
    // checked, and neither relaxes the final gate.
    const arm1Changed = cur.message !== incumbent.message;
    if (!opts?.skipRespell && (arm1Changed || !refIsSource)) {
      const s = syndyasmosEncode(ref, enc, { message: cur.message, messageTokens: cur.messageTokens, decoded: ref });
      if (s.applied && s.messageTokens < cur.messageTokens) cur = { message: s.message, messageTokens: s.messageTokens };
      // ΜΕΤΑΤΑΞΙΣ on its own, for lanes where the re-spelling arm is refused.
      const m = metataxisEncode(ref, enc, { message: cur.message, messageTokens: cur.messageTokens, decoded: ref });
      if (m.applied && m.messageTokens < cur.messageTokens) cur = { message: m.message, messageTokens: m.messageTokens };
    }
  } catch {
    return no('gennadas: threw — not a candidate');
  }

  if (cur.messageTokens >= incumbent.messageTokens) {
    return no(`gennadas: ref ${refIsSource ? '= source' : '= parent output'} (${Buffer.byteLength(ref)} B), ${pairs} enabling pairs, ${enabled} priced improvements — no gain`);
  }
  // ---- FINAL GATE, on the exact string emitted, against the parent's output.
  let decoded: string;
  try { decoded = chironDecode(cur.message.slice(cur.message.indexOf(CHIRON_START))); } catch { return no('gennadas: decode threw — refused'); }
  if (decoded !== ref) return no('gennadas: final decode mismatch against the parent output — refused');
  return {
    applied: true, message: cur.message, messageTokens: cur.messageTokens, decoded: ref,
    notes: `gennadas: ref ${refIsSource ? '= source' : '= parent output'} (${Buffer.byteLength(ref)} B); ${pairs} enabling pairs, ${enabled} priced improvements; M ${incumbent.messageTokens} -> ${cur.messageTokens}`,
    refIsSource, pairs, enabled,
  };
}
