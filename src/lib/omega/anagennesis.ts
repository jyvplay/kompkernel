/**
 * src/lib/omega/anagennesis.ts
 * ============================================================================
 * ΑΝΑΓΕΝΝΗΣΙΣ (ANAGENNĒSIS) — "regeneration, rebirth". X51.
 * ============================================================================
 *
 * THE SEAM THIS CODEC OPENS
 * ============================================================================
 * Every codec in this repository that makes a value cheaper makes it cheaper by
 * SENDING it differently: a glyph instead of the literal (DAEDALUS, CHIRON), a
 * mask instead of the separator (TYPOS, APOGRAPHE), a ramp instead of the column
 * (METRON), a brace expansion instead of the lines (DENS-2).  All of them still
 * send the value.  The value is on the wire, in some spelling.
 *
 * There is one exception, and it is the whole of this codec:
 *
 *     GNOMON R2 writes `"resolved": "~"` and the reader rebuilds
 *     `https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz` from the entry key
 *     and the entry version.  Measured on `package-lock-head.json`: one rule,
 *     −336 tokens (5463 → 5127), the largest single-rule win in the stack.
 *
 * GNOMON's rule is hand-authored and reads one file.  ΑΝΑΓΕΝΝΗΣΙΣ asks the
 * question it implies: WHICH OTHER VALUES IN A DOCUMENT ARE REGENERABLE?
 *
 * A value is regenerable when it is a FUNCTION OF OTHER VALUES THE READER WAS
 * ALREADY SENT IN THE SAME RECORD.  The reader was going to hold those values
 * anyway; the value adds nothing to the message except its own length.  This is
 * the STIGME principle ("buy redundancy at the contract rate, not the payload
 * rate") moved from PUNCTUATION to VALUES, and it is AI-native for exactly the
 * same reason STIGME is: a byte-level decoder cannot regenerate a value it was
 * never sent, and a reasoning reader can.
 *
 * THE MECHANISM
 * ============================================================================
 * 1.  RECORDS.  A document is read as a nesting of records.  A line that ends
 *     in `{` opens a record and names it (`"node_modules/@babel/core": {`);
 *     a line that starts with `}` closes it.  A record's STRING MEMBERS are the
 *     lines `"name": "value",` inside it.  A record therefore offers two kinds
 *     of source value: its own KEY and its own members.
 *
 * 2.  FAMILY.  All records that have a member with the same NAME form a family.
 *     Families with fewer than three members are ignored: a regeneration rule
 *     has to amortise its sentence.
 *
 * 3.  TEMPLATE MINING.  For a family, the encoder computes the longest common
 *     prefix of the members' values — that is a literal.  The residue is then
 *     parsed left to right, at each step taking whichever of two things matches
 *     EVERY member of the family:
 *
 *        (a) the longest common literal prefix of the residues (two characters
 *            or more), or
 *        (b) a REFERENCE: a function of a source value in the record that is a
 *            prefix of every residue.
 *
 *     The functions are a small closed set, and each is stated in the contract
 *     in words:
 *        FIELD(name)                  the member's own value
 *        KEY                         the record's key
 *        STRIP(X, p)                 X with the prefix p removed
 *        TAIL(X)                     X up to and including its last `/`
 *        HEAD(X)                     X up to its first `/`
 *
 *     STRIP's prefix is not guessed: it is the longest prefix of the source that
 *     is NOT a prefix of the residue, and the encoder keeps the rule only if
 *     that prefix is the SAME STRING in every member of the family.
 *
 *     When the parse reaches the end of every residue, the template it built
 *     regenerates every value in the family.  A template that leaves a residue
 *     unconsumed, or that is all references, is dropped.
 *
 * 4.  THE WIRE.  Every value the miner matched is replaced by `~`.  The reduced
 *     text goes through DAEDALUS (or GRAMMA), and the contract gets one
 *     sentence per rule stating the template in words.  The reader expands the
 *     glyphs first and regenerates the values last, because regeneration needs
 *     the record's own key and members intact.
 *
 * 5.  GUARD.  Each rule set must (a) round-trip the input byte-exactly on its
 *     own, and (b) survive composition: DAEDALUS-decode the composed wire,
 *     apply the inverse, and require the original text back.  An arm that fails
 *     is not shipped.  The tournament is the usual one — plain DAEDALUS, plain
 *     GRAMMA, and every non-empty rule subset on both bases — and the smallest
 *     EXACT message wins, so the codec is never above the frontier it is
 *     measured against.
 *
 * WHY THIS IS NOT GNOMON WITH MORE LINES
 * ============================================================================
 * · GNOMON's rules name a file format (`resolved`, `*_url`).  ΑΝΑΓΕΝΝΗΣΙΣ names
 *   no format: it mines families and templates from whatever records it finds.
 * · GNOMON's prefix (`https://registry.npmjs.org/`) is written into the rule.
 *   ΑΝΑΓΕΝΝΗΣΙΣ computes both the prefix and the suffix from the family.
 * · GNOMON's NAME and BASE derivations are written into the sentence.  Here they
 *   are discovered as STRIP(KEY, …) and TAIL(…) and stated in the same words.
 * · GNOMON's npm rule reproduces, in the general machinery, as
 *   [lit https://registry.npmjs.org/][STRIP(KEY,"node_modules/")]
 *   [lit /-/][TAIL(STRIP(KEY,"node_modules/"))][lit -][FIELD(version)]
 *   [lit .tgz] — which is the shape the miner returns for that file.
 *
 * WHAT IT DOES NOT DO
 * ============================================================================
 * · It does not fire on prose: there are no records, so there are no families.
 * · It does not fire where a value is not a function of its own record (a hash,
 *   a timestamp, a random identifier).  Those are the entropy of the file.
 * · The residue parse is greedy and single-pass (longest common literal prefix,
 *   then the first reference that matches every member).  It does not search
 *   over templates; the guard is what makes that safe.
 *
 * Measured with `OMEGA_DET=1`, o200k, one chat message, production clock.
 * ============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult } from './daedalus';
import { grammaEncode, grammaDecode, type GrammaDialectId } from './gramma';
import { CHIRON_START } from './chiron';

/** A node of a mined template: a literal or a reference. */
export type TemplateNode =
  | { t: 'lit'; s: string }
  | { t: 'ref'; src: string; fn: 'field' | 'key' | 'strip' | 'tail' | 'head'; arg?: string };

export interface AnagennesisRule {
  field: string;
  template: TemplateNode[];
  hits: number;
  saved: number;
  sentence: string;
  shape: string;
}

export interface AnagennesisResult {
  codec: 'anagennesis';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  frontierM: number;
  messageTokens: number;
  base: 'daedalus' | 'gramma';
  rules: AnagennesisRule[];
  fields: number;
  decoderPrompt: string;
  candidates: { rules: string; base: string; M: number; exact: boolean }[];
  notes: string;
}

/* ---------------------------------------------------------------------------
 * Records.
 * ------------------------------------------------------------------------- */

const OPEN = /^(\s*"([^"]*)": )\{\s*$/;
const MEMBER = /^(\s*"([^"]*)": )"((?:[^"\\]|\\.)*)(",?)$/;
/** A value the miner regenerates: the value's quotes are gone, `~` stands there. */
const PLACEHOLDER = /^(\s*"([^"]*)": )"~(",?)$/;
const CLOSE = /^\s*\}\s*$/;

interface Member { name: string; value: string }
interface Record { key: string; members: Member[] }

/** Walk the document, tracking the open record stack.  The returned records are
 *  the ones that were actually opened (the synthetic root is dropped). */
function walkRecords(text: string): Record[] {
  const root: Record = { key: '', members: [] };
  const stack: Record[] = [root];
  const opened: Record[] = [];
  for (const line of text.split('\n')) {
    const o = OPEN.exec(line);
    if (o) {
      const rec: Record = { key: o[2], members: [] };
      stack[stack.length - 1].members.push({ name: o[2], value: '__open__' });
      stack.push(rec);
      opened.push(rec);
      continue;
    }
    if (CLOSE.test(line)) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const m = MEMBER.exec(line);
    if (m) stack[stack.length - 1].members.push({ name: m[2], value: m[3] });
  }
  /* the document's own top-level object has no opening key line, so it is the
   * synthetic root; it is a record like any other when it has members. */
  if (root.members.some(m => m.value !== '__open__')) opened.push(root);
  return opened;
}

/* ---------------------------------------------------------------------------
 * Prose for the contract.
 * ------------------------------------------------------------------------- */

function describeNode(n: TemplateNode): string {
  if (n.t === 'lit') return JSON.stringify(n.s);
  const x = n.src === 'KEY' ? 'the key' : n.src;
  switch (n.fn) {
    case 'field':
    case 'key':
      return x;
    case 'strip':
      return `${x} minus ${JSON.stringify(n.arg ?? '')}`;
    case 'tail':
      return `last segment of ${x}`;
    case 'head':
      return `first segment of ${x}`;
  }
}

/** The reader-facing sentence for one rule. */
export function anagennesisSentence(rule: AnagennesisRule): string {
  const tpl = rule.template.map(describeNode).join(' + ');
  return `~ in the ${JSON.stringify(rule.field)} field = ${tpl}.`;
}

/* ---------------------------------------------------------------------------
 * Reference functions.
 * ------------------------------------------------------------------------- */

type Source = { name: string; value: string };

function evalRef(ref: TemplateNode, src: Source): string | null {
  if (ref.t !== 'ref') return null;
  const base = src.value;
  switch (ref.fn) {
    case 'strip': {
      const p = ref.arg ?? '';
      return p.length > 0 && base.startsWith(p) ? base.slice(p.length) : null;
    }
    case 'tail': {
      const i = base.lastIndexOf('/');
      return i >= 0 ? base.slice(i + 1) : base;
    }
    case 'head': {
      const i = base.indexOf('/');
      return i >= 0 ? base.slice(0, i) : base;
    }
    case 'field':
    case 'key':
      return base;
  }
}

/** Build the value a rule regenerates for one record. */
export function reconstructValue(rule: AnagennesisRule, rec: { key: string; members: Member[] }): string {
  const srcs: Source[] = [
    { name: 'KEY', value: rec.key },
    ...rec.members.filter(m => m.name !== rule.field && m.value !== '__open__').map(m => ({ name: m.name, value: m.value })),
  ];
  let out = '';
  for (const n of rule.template) {
    if (n.t === 'lit') { out += n.s; continue; }
    const s = srcs.find(x => x.name === n.src);
    if (!s) return '';
    const v = evalRef(n, s);
    if (v === null) return '';
    out += v;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Template mining, one family at a time.
 * ------------------------------------------------------------------------- */

const MIN_HITS = 3;
const MIN_VALUE = 12;
const MIN_SAVED = 24;
type RefFn = 'field' | 'key' | 'strip' | 'tail' | 'head';
const FUNCS: RefFn[] = ['field', 'key', 'strip', 'tail', 'head'];

function commonPrefix(strs: string[]): string {
  if (!strs.length) return '';
  let p = strs[0];
  for (const s of strs) {
    while (p && !s.startsWith(p)) p = p.slice(0, -1);
  }
  return p;
}

/** One parse move: a template node plus, for each member, how many characters
 *  of its residue it consumes. */
interface Move { node: TemplateNode; len: number[] }

/** Every legal move at the head of the residues.  A reference that swallows a
 *  lot is tried first — it is cheaper to state "the url field" than to quote a
 *  long literal — then literals (longest first), then the shorter references;
 *  a one-character literal is last because it is cheaper to leave in the
 *  payload than to state. */
function movesAt(residues: string[], sources: Map<string, Source>[]): Move[] {
  const refs: Move[] = [];
  for (const name of sources[0].keys()) {
    if (!sources.every(s => s.has(name))) continue;
    for (const fn of FUNCS) {
      const prefixes: string[] = [];
      if (fn === 'strip') {
        const p0 = sources[0].get(name)!.value;
        for (let plen = p0.length - 1; plen >= 1; plen--) prefixes.push(p0.slice(0, plen));
      }
      for (const arg of (fn === 'strip' ? prefixes : [undefined])) {
        const ref: TemplateNode = { t: 'ref', src: name, fn, arg };
        const len: number[] = [];
        let ok = true;
        for (let i = 0; i < residues.length; i++) {
          const v = evalRef(ref, sources[i].get(name)!);
          if (v === null || v.length === 0 || !residues[i].startsWith(v)) { ok = false; break; }
          len.push(v.length);
        }
        if (ok) refs.push({ node: ref, len });
      }
    }
  }
  refs.sort((a, b) => Math.min(...b.len) - Math.min(...a.len));
  const big = refs.filter(r => Math.min(...r.len) >= 8);
  const small = refs.filter(r => Math.min(...r.len) < 8);

  const out: Move[] = [];
  const L = commonPrefix(residues);
  out.push(...big);
  for (let end = L.length; end >= Math.max(2, L.length - 3); end--) {
    out.push({ node: { t: 'lit', s: L.slice(0, end) }, len: residues.map(() => end) });
  }
  out.push(...small);
  if (L.length >= 1) out.push({ node: { t: 'lit', s: L }, len: residues.map(() => L.length) });
  return out;
}

/** Greedy-with-backtracking parse of a family's residues into a template.  The
 *  search is bounded; a family whose parse needs more than the budget is
 *  dropped rather than approximated. */
function parseTemplate(residues: string[], sources: Map<string, Source>[], budget: { left: number }): TemplateNode[] | null {
  if (residues.every(r => r.length === 0)) return [];
  if (budget.left-- <= 0) return null;
  for (const mv of movesAt(residues, sources)) {
    const rest = residues.map((r, i) => r.slice(mv.len[i]));
    const sub = parseTemplate(rest, sources, budget);
    if (sub) return [mv.node, ...sub];
  }
  return null;
}

/** Mine one family: the records that have a member with this name. */
function mineFamily(records: Record[], field: string): AnagennesisRule | null {
  const fam = records.filter(r => r.members.some(m => m.name === field && m.value !== '__open__'));
  if (fam.length < MIN_HITS) return null;
  const entries = fam.map(r => ({ rec: r, value: r.members.find(m => m.name === field)!.value }));
  if (entries.some(e => e.value.length < MIN_VALUE)) return null;
  if (new Set(entries.map(e => e.value)).size < 2) return null;

  const sources: Map<string, Source>[] = entries.map(e => {
    const m = new Map<string, Source>();
    if (e.rec.key.length > 0) m.set('KEY', { name: 'KEY', value: e.rec.key });
    for (const mem of e.rec.members) {
      if (mem.name === field || mem.value === '__open__' || mem.value.length === 0) continue;
      if (!m.has(mem.name)) m.set(mem.name, { name: mem.name, value: mem.value });
    }
    return m;
  });

  const template = parseTemplate(entries.map(e => e.value), sources, { left: 4000 });
  if (!template) return null;                                     // no complete parse
  if (!template.some(n => n.t === 'lit')) return null;            // says nothing
  if (!template.some(n => n.t === 'ref')) return null;            // no saving

  const saved = entries.reduce((a, e) => a + e.value.length - 1, 0);
  if (saved < MIN_SAVED) return null;

  const shape = template.map(n => (n.t === 'lit' ? `L${n.s.length}` : `${n.fn}(${n.src})`)).join('|');
  const rule: AnagennesisRule = { field, template, hits: entries.length, saved, shape, sentence: '' };
  rule.sentence = anagennesisSentence(rule);
  return rule;
}

/** Mine every family in the document. */
export function anagennesisMine(text: string): AnagennesisRule[] {
  const records = walkRecords(text);
  if (records.length < MIN_HITS) return [];
  const names = Array.from(new Set(records.flatMap(r => r.members.map(m => m.name))))
    .filter(n => n !== '__open__');
  const rules: AnagennesisRule[] = [];
  for (const name of names) {
    const r = mineFamily(records, name);
    if (r) rules.push(r);
  }
  rules.sort((a, b) => b.saved - a.saved);
  const kept: AnagennesisRule[] = [];
  const used = new Set<string>();
  for (const r of rules) {
    if (used.has(r.field)) continue;
    used.add(r.field);
    kept.push(r);
  }
  return kept;
}

/* ---------------------------------------------------------------------------
 * Forward / inverse.
 * ------------------------------------------------------------------------- */

/** Replace every value a rule regenerates with `~`. */
export function anagennesisReduce(text: string, rules: AnagennesisRule[]): { out: string; fields: number } {
  if (!rules.length) return { out: text, fields: 0 };
  const byField = new Map(rules.map(r => [r.field, r]));
  const stack: Record[] = [{ key: '', members: [] }];
  let fields = 0;
  const out = text.split('\n').map(line => {
    const o = OPEN.exec(line);
    if (o) {
      const rec: Record = { key: o[2], members: [] };
      stack[stack.length - 1].members.push({ name: o[2], value: '__open__' });
      stack.push(rec);
      return line;
    }
    if (CLOSE.test(line)) {
      if (stack.length > 1) stack.pop();
      return line;
    }
    const m = MEMBER.exec(line);
    if (m) {
      const rule = byField.get(m[2]);
      const rec = stack[stack.length - 1];
      if (rule && reconstructValue(rule, rec) === m[3]) {
        fields++;
        rec.members.push({ name: m[2], value: '__open__' });
        return m[1] + '"~"' + m[4].slice(1);
      }
      rec.members.push({ name: m[2], value: m[3] });
    }
    return line;
  });
  return { out: out.join('\n'), fields };
}

/** Undo the rules. */
export function anagennesisRestore(wire: string, rules: AnagennesisRule[]): string {
  if (!rules.length) return wire;
  const byField = new Map(rules.map(r => [r.field, r]));
  const stack: Record[] = [{ key: '', members: [] }];
  const out = wire.split('\n').map(line => {
    const o = OPEN.exec(line);
    if (o) {
      const rec: Record = { key: o[2], members: [] };
      stack[stack.length - 1].members.push({ name: o[2], value: '__open__' });
      stack.push(rec);
      return line;
    }
    if (CLOSE.test(line)) {
      if (stack.length > 1) stack.pop();
      return line;
    }
    const m = PLACEHOLDER.exec(line);
    if (m) {
      const rule = byField.get(m[2]);
      const rec = stack[stack.length - 1];
      if (rule) {
        const v = reconstructValue(rule, rec);
        if (v) { rec.members.push({ name: m[2], value: v }); return m[1] + '"' + v + '"' + m[3].slice(1); }
      }
    }
    const mm = MEMBER.exec(line);
    if (mm) stack[stack.length - 1].members.push({ name: mm[2], value: mm[3] });
    return line;
  });
  return out.join('\n');
}

/* ---------------------------------------------------------------------------
 * Composition and the guarded encoder.
 * ------------------------------------------------------------------------- */

const GRAMMA_DIALECTS: GrammaDialectId[] = ['json1', 'json2', 'json4', 'jsontab'];

function compose(inner: string, rules: AnagennesisRule[]): string {
  return rules.length ? inner + '\n' + rules.map(r => r.sentence).join('\n') : inner;
}

/** A raw identity DAEDALUS wire that starts with the CHIRON start mark is
 *  ambiguous to the reader. */
function wireOk(d: DaedalusResult): boolean {
  return !(d.mode === 'raw' && d.wire.startsWith(CHIRON_START));
}

export function anagennesisEncode(text: string, enc: EncodingName = 'o200k_base'): AnagennesisResult {
  const plainD: DaedalusResult = daedalusEncode(text, enc);
  const plainG = grammaEncode(text, enc, { dialects: GRAMMA_DIALECTS });
  const frontierM = Math.min(plainD.messageTokens, plainG.messageTokens);

  interface Cand {
    rules: AnagennesisRule[]; base: 'daedalus' | 'gramma'; M: number; exact: boolean;
    wire: string; prompt: string; inner: string; fields: number;
  }
  const cands: Cand[] = [
    { rules: [], base: 'daedalus', M: plainD.messageTokens, exact: plainD.exact, wire: plainD.wire, prompt: plainD.decoderPrompt, inner: plainD.decoderPrompt, fields: 0 },
    { rules: [], base: 'gramma', M: plainG.messageTokens, exact: plainG.exact, wire: plainG.wire, prompt: plainG.decoderPrompt, inner: plainG.decoderPrompt, fields: 0 },
  ];

  const mined = anagennesisMine(text);
  const subsets: AnagennesisRule[][] = [];
  for (let mask = 1; mask < 1 << Math.min(mined.length, 4); mask++) {
    const sub = mined.filter((_, i) => (mask >> i) & 1);
    if (sub.length) subsets.push(sub);
  }
  subsets.sort((a, b) => a.length - b.length);

  for (const rules of subsets) {
    const { out: reduced, fields } = anagennesisReduce(text, rules);
    if (fields === 0 || reduced === text) continue;
    /* G1: the rule set must invert exactly on its own. */
    if (anagennesisRestore(reduced, rules) !== text) continue;
    /* G2a: DAEDALUS base. */
    const d: DaedalusResult = daedalusEncode(reduced, enc);
    const inner = d.wire.startsWith(CHIRON_START) ? daedalusDecoderPrompt(d.wire) : d.wire;
    if (wireOk(d) && d.exact && anagennesisRestore(daedalusDecode(d.wire), rules) === text) {
      cands.push({ rules, base: 'daedalus', M: countTokens(compose(inner, rules), enc), exact: true, wire: d.wire, prompt: compose(inner, rules), inner, fields });
    }
    /* G2b: GRAMMA base. */
    const g = grammaEncode(reduced, enc, { dialects: GRAMMA_DIALECTS });
    if (g.exact && grammaDecode(g.decoderPrompt) === reduced && anagennesisRestore(grammaDecode(g.decoderPrompt), rules) === text) {
      cands.push({ rules, base: 'gramma', M: countTokens(compose(g.decoderPrompt, rules), enc), exact: true, wire: g.wire, prompt: compose(g.decoderPrompt, rules), inner: g.decoderPrompt, fields });
    }
  }

  const all = [...cands].sort((a, b) => a.M - b.M || a.rules.length - b.rules.length);
  const best = all[0];
  const decoded = best.base === 'daedalus'
    ? anagennesisRestore(daedalusDecode(best.wire), best.rules)
    : anagennesisRestore(grammaDecode(best.inner), best.rules);
  const label = (c: Cand) => `${c.rules.length ? c.rules.map(r => r.field).join('+') : 'plain'}/${c.base}`;
  return {
    codec: 'anagennesis',
    wire: best.wire,
    decoded,
    exact: decoded === text,
    inTokens: plainD.inTokens,
    frontierM,
    messageTokens: best.M,
    base: best.base,
    rules: best.rules,
    fields: best.fields,
    decoderPrompt: best.prompt,
    candidates: all.map(c => ({ rules: c.rules.map(r => r.field).join('+') || 'plain', base: c.base, M: c.M, exact: c.exact })),
    notes: `frontierM=${frontierM}; mined=${mined.length} [${mined.map(r => `${r.field}~${r.hits}x${r.saved}ch`).join(', ') || 'none'}]; chosen=${label(best)} M=${best.M}`,
  };
}
