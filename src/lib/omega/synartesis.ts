/**
 * src/lib/omega/synartesis.ts
 * =============================================================================
 * SYNARTESIS — entailment from the KEY of an enclosing entry
 * (byte-perfect, exact-lossless, single-chat-readable, contract in band)
 * -----------------------------------------------------------------------------
 * συνάρτησις — "dependence, function": a field whose value is a function of
 * other data the reader already holds.
 *
 * THE SEAM (measured, bench/z50)
 * -----------------------------------------------------------------------------
 * npm lockfiles (package-lock.json) list every resolved package as an entry
 *
 *     "node_modules/@babel/code-frame": {
 *       "version": "7.29.7",
 *       "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz",
 *       "integrity": "sha512-…",
 *
 * The "resolved" URL is a function of three things the reader already holds:
 * the entry KEY (after its last "node_modules/"), the key's last path segment,
 * and the entry's "version". In the repository's own lockfile all 117 resolved
 * URLs are exactly that function (bench/z50/receipts/convention-probe.log).
 * Measured with the shipped 72-token rule (bench/z50/receipts/sweep.jsonl and
 * lock-head.jsonl): 12 entries −20, 24 entries −54, the first 600 lines −41,
 * the 40 KB head −279 (−5.1%) tokens against PARADEIGMA; below about 12 entries
 * the rule does not pay and the guard returns PARADEIGMA's result.
 *
 * PARADEIGMA already removes fields that are concatenations of SIBLING values;
 * its own notes list "own-key slots" as the open v2 item. This codec is that
 * slot source: the enclosing entry's key, and the key's basename, become
 * entailment sources. A dictionary cannot see the function (the URL's name
 * and version occur twice each, and each repeat costs a glyph); one sentence
 * can.
 *
 * WHAT IT IS NOT
 * -----------------------------------------------------------------------------
 * Not EPAGOGE's release-link zipper (that schema derives a field from the NEXT
 * record); not ENTHYMEME's slugs or JVM frames (fixed conventions on a text
 * line); not PARADEIGMA's concatenation over siblings (it cannot reach the key).
 * Integrity hashes are random and stay literal.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   SYN_RULE  (names the convention, the insertion point, the comma)
 *   rest     the PARADEIGMA message of the REDUCED JSON (its own contract,
 *            clause and DAEDALUS wire; identity-guarded by PARADEIGMA)
 *   escape   a payload that carries an exact rule or escape line (and only
 *            such a payload) is wrapped in SYN_ESCAPE; any other first line
 *            is read as PARADEIGMA/DAEDALUS, so the reader never mistakes it
 *
 * ENCODER GATES (all must hold to use the reduced arm)
 *   G1  a rule-free input is returned as PARADEIGMA's result (no change);
 *   G2  every entry keyed node_modules/… that has an "integrity" line also has
 *       a "resolved" line (otherwise the reader would invent one: refuse);
 *   G3  an elided line is removed only when it sits right after its "version"
 *       line, is followed directly by "integrity", and equals the convention
 *       exactly, comma included;
 *   G4  the reader's restore of the reduced text reproduces the input;
 *   G5  the composed message decodes byte-exactly with the native reader;
 *   G6  its one-chat cost is strictly below PARADEIGMA's (which is itself ≤
 *       DAEDALUS on every input), otherwise PARADEIGMA's result is returned.
 * So M(SYNARTESIS) ≤ M(PARADEIGMA) ≤ M(DAEDALUS) on every input that carries no
 * exact rule or escape line; such a payload pays the escape line (about 10 tokens).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { paradeigmaEncode, paradeigmaDecode, type ParadeigmaResult, type ParadeigmaOptions } from './paradeigma';

/** the one line the reader must see first for the reduced arm */
export const SYN_RULE =
  '∴ npm lock: each node_modules/ entry with "integrity" but no "resolved" gets, after its "version" line, ' +
  '"resolved": "https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz", (NAME = key after last node_modules/; BASE = NAME after last /; VERSION = its version).';
/** prefix shared by every SYNARTESIS rule/escape line; a payload that begins with it is always escaped */
export const SYN_PREFIX = '∴ npm lock:';
/** the escape line: the payload that follows is a plain PARADEIGMA message, not a reduced one */
export const SYN_ESCAPE = '∴ npm lock: literal payload follows';

const ENTRY_OPEN = /^( *)"(node_modules\/[^"\\]*)": \{$/;
const FIELD = /^( *)"([^"\\]+)": /;

interface Entry { ind: string; key: string; open: number; close: number; fields: Map<string, number[]> }

/** Entries keyed node_modules/… with their DIRECT fields (deeper lines belong to nested objects). */
function entriesOf(lines: string[]): Entry[] {
  const out: Entry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = ENTRY_OPEN.exec(lines[i]);
    if (!m) continue;
    const ind = m[1];
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) if (lines[j] === ind + '}' || lines[j] === ind + '},') { close = j; break; }
    if (close < 0) continue;
    const fields = new Map<string, number[]>();
    const child = ind + '  ';
    for (let k = i + 1; k < close; k++) {
      const l = lines[k];
      if (!l.startsWith(child + '"') ) continue; // exactly two more spaces: a direct child
      const f = FIELD.exec(l);
      if (!f || f[1] !== child) continue;
      const arr = fields.get(f[2]) ?? [];
      arr.push(k);
      fields.set(f[2], arr);
    }
    out.push({ ind, key: m[2], open: i, close, fields });
    // do not skip inside: nested node_modules keys are entries too
  }
  return out;
}

/** the convention's URL for an entry, or null when the entry has no plain string version */
function expectedResolved(e: Entry, lines: string[]): string | null {
  const v = e.fields.get('version');
  if (!v || v.length !== 1) return null;
  const vm = /^ *"version": "([^"\\]*)",?$/.exec(lines[v[0]]);
  if (!vm) return null;
  const name = e.key.slice(e.key.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const base = name.slice(name.lastIndexOf('/') + 1);
  if (!name || !base) return null;
  return `https://registry.npmjs.org/${name}/-/${base}-${vm[1]}.tgz`;
}

/** Reader: put the omitted "resolved" lines back. Pure function of the reduced text. */
export function synRestore(reduced: string): string {
  const lines = reduced.split('\n');
  const inserts = new Map<number, string>(); // after line index → line
  for (const e of entriesOf(lines)) {
    if (!e.key.startsWith('node_modules/')) continue;
    const hasIntegrity = e.fields.has('integrity');
    const hasResolved = e.fields.has('resolved');
    if (!hasIntegrity || hasResolved) continue;
    const exp = expectedResolved(e, lines);
    const v = e.fields.get('version');
    if (!exp || !v) throw new Error(`synartesis: entry ${e.key} has no plain version to derive resolved from`);
    inserts.set(v[0], `${e.ind}  "resolved": "${exp}",`);
  }
  if (!inserts.size) return reduced;
  const out: string[] = [];
  lines.forEach((l, i) => { out.push(l); const add = inserts.get(i); if (add !== undefined) out.push(add); });
  return out.join('\n');
}

/**
 * Encoder side of the pre-pass: remove each resolved line that the reader can rebuild.
 * Returns null when the input is not eligible (G2 fails) or nothing can be removed.
 */
export function synReduce(text: string): { reduced: string; elided: number } | null {
  const lines = text.split('\n');
  const entries = entriesOf(lines);
  // G2: integrity without resolved → the reader would invent a line; refuse the whole file
  for (const e of entries) {
    if (!e.key.startsWith('node_modules/')) continue;
    if (e.fields.has('integrity') && !e.fields.has('resolved')) return null;
  }
  const drop = new Set<number>();
  for (const e of entries) {
    if (!e.key.startsWith('node_modules/')) continue;
    const r = e.fields.get('resolved'), i = e.fields.get('integrity'), v = e.fields.get('version');
    if (!r || !i || !v || r.length !== 1 || i.length !== 1 || v.length !== 1) continue;
    const exp = expectedResolved(e, lines);
    if (!exp) continue;
    // G3: adjacency and exact text, comma included
    if (r[0] !== v[0] + 1 || i[0] !== r[0] + 1) continue;
    if (lines[r[0]] !== `${e.ind}  "resolved": "${exp}",`) continue;
    drop.add(r[0]);
  }
  if (!drop.size) return null;
  const reduced = lines.filter((_, i) => !drop.has(i)).join('\n');
  // G4: the reader's restore must reproduce the input exactly
  if (synRestore(reduced) !== text) return null;
  return { reduced, elided: drop.size };
}

export interface SynartesisResult extends ParadeigmaResult {
  codec3: 'synartesis';
  /** whether the reduced arm was chosen (false: PARADEIGMA's result is returned) */
  reducedArm: boolean;
  elidedResolved: number;
  reducedM: number | null;
  paradeigmaM: number;
  synNotes: string;
}

/** Native decoder for SYNARTESIS wires (and, transparently, every PARADEIGMA/DAEDALUS wire). */
export function synDecode(wire: string): string {
  const nl = wire.indexOf('\n');
  const first = nl < 0 ? wire : wire.slice(0, nl);
  if (first === SYN_ESCAPE) return paradeigmaDecode(wire.slice(nl + 1));
  if (first === SYN_RULE) return synRestore(paradeigmaDecode(wire.slice(nl + 1)));
  return paradeigmaDecode(wire); // any other payload, including one that merely starts with the prefix
}

/** The one-chat message: the rule line, then PARADEIGMA's own contract and wire. */
export function synDecoderPrompt(wire: string): string {
  const nl = wire.indexOf('\n');
  const first = nl < 0 ? wire : wire.slice(0, nl);
  if (first === SYN_RULE) return SYN_RULE + '\n' + wire.slice(nl + 1);
  return wire;
}

export function synartesisEncode(text: string, enc: EncodingName = 'o200k_base', options: ParadeigmaOptions = {}): SynartesisResult {
  const started = Date.now();
  const plain = paradeigmaEncode(text, enc, options);
  const base = {
    ...plain, codec3: 'synartesis' as const, reducedArm: false, elidedResolved: 0, reducedM: null,
    paradeigmaM: plain.messageTokens,
  };
  const carriesRuleLine = text.split('\n').some(l => l === SYN_RULE || l === SYN_ESCAPE);
  if (carriesRuleLine) {
    // escape: the payload carries an exact rule line, so the reader must not mistake it for a rule
    const wire = SYN_ESCAPE + '\n' + plain.wire;
    const decoderPrompt = SYN_ESCAPE + '\n' + plain.decoderPrompt;
    const messageTokens = countTokens(decoderPrompt, enc);
    const exact = synDecode(wire) === text;
    return { ...base, wire, decoderPrompt, messageTokens, exact, decoded: synDecode(wire), synNotes: 'escape: payload carries an exact rule line', notes: `synartesis: escaped; ${plain.notes}`, ms: Date.now() - started };
  }
  const red = synReduce(text);
  if (!red || synDecode(plain.wire) !== text) return { ...base, synNotes: 'not applicable: no eligible npm entries (or G2/G3/G4 refused)', notes: `synartesis: not applicable; ${plain.notes}`, ms: Date.now() - started };
  const inner = paradeigmaEncode(red.reduced, enc, options);
  const wire = SYN_RULE + '\n' + inner.wire;
  const decoderPrompt = SYN_RULE + '\n' + inner.decoderPrompt;
  const messageTokens = countTokens(decoderPrompt, enc);
  const exact = synDecode(wire) === text;
  const reducedArm = exact && messageTokens < plain.messageTokens;
  if (!reducedArm) {
    return { ...base, reducedM: messageTokens, elidedResolved: red.elided, synNotes: exact ? `reduced arm M ${messageTokens} >= PARADEIGMA ${plain.messageTokens}` : 'reduced arm failed the round trip', notes: `synartesis: ${red.elided} resolved line(s) removable but PARADEIGMA wins (M ${plain.messageTokens} vs ${messageTokens}); ${plain.notes}`, ms: Date.now() - started };
  }
  return {
    ...inner, codec3: 'synartesis', wire, decoderPrompt, messageTokens, exact, decoded: text,
    inTokens: plain.inTokens, outTokens: countTokens(wire, enc),
    contractTokens: messageTokens - countTokens(wire, enc),
    savingsPct: plain.inTokens ? (1 - messageTokens / plain.inTokens) * 100 : 0,
    applied: true, reducedArm: true, elidedResolved: red.elided, reducedM: messageTokens, paradeigmaM: plain.messageTokens,
    plainMessageTokens: plain.messageTokens,
    synNotes: `reduced arm: ${red.elided} resolved line(s) removed; rule ${countTokens(SYN_RULE, enc)} tok; M ${messageTokens} vs PARADEIGMA ${plain.messageTokens}`,
    ms: Date.now() - started,
    notes: `synartesis: ${red.elided} resolved line(s) removed; M ${messageTokens} vs PARADEIGMA ${plain.messageTokens} (${messageTokens - plain.messageTokens}); ${inner.notes}`,
  };
}
