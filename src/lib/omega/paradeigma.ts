/**
 * src/lib/omega/paradeigma.ts
 * =============================================================================
 * ≡ PARADEIGMA — template entailment for JSON records
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * παράδειγμα — "pattern, template": the thing from which copies are made.
 *
 * THE SEAM (measured, bench/z49)
 * -----------------------------------------------------------------------------
 * Pretty-printed JSON from REST APIs, lockfiles and exports is dominated by
 * fields whose value is a STRING TEMPLATE over other fields of the same object:
 *
 *   "followers_url": "https://api.github.com/users/aduh95/followers"
 *                     = <url> + "/followers"
 *   "avatar_url":    "https://avatars.githubusercontent.com/u/14309773?v=4"
 *                     = "https://avatars.githubusercontent.com/u/" + <id> + "?v=4"
 *   "full_name":     "nodejs/node"            = "nodejs/" + <name>
 *
 * A GitHub user object has 19 fields; 16 are such templates.  A repository
 * object has ~100; ~70 are.  A tokenizer-aligned dictionary (DAEDALUS) already
 * folds each template's constant text into a rule, but it still pays, per
 * object and per field, the rule's glyph plus one glyph per slot value (the
 * login, the id) — and it pays the constant text once per DISTINCT template in
 * its header.  PARADEIGMA states each template once in a sentence, removes
 * the field from every object that obeys it, and lets the reader write the
 * field back by copying sibling values into the slots.  Nothing about the
 * objects is reordered, re-serialised or counted: the reader's only act is
 * "after field A of every object that has field T, write "k": <template>".
 * Constant fields ("site_admin": false) are NOT templated: under DAEDALUS a
 * line without slots already costs ≈0 (it is absorbed into the neighbouring
 * glyphs), so removing it only pays the sentence (measured: comments-10 1034
 * with constants vs 1018 without).
 *
 * Measured (o200k, OMEGA_DET=1, M = tokens(contract + wire), real mode,
 * byte-identical under the native reader and bench/paradeigma_decode.py):
 *   gh api users/nodejs/followers?per_page=20     DAEDALUS  840 →  557  (−33.7 %)
 *   gh api .../tags?per_page=20                   DAEDALUS  951 →  788  (−17.1 %)
 *   gh api .../contents/lib (25 entries)          DAEDALUS 1411 → 1269  (−10.1 %)
 *   gh api .../issues/comments?per_page=10        DAEDALUS 1127 → 1017  (−9.8 %)
 *   gh api users/nodejs/repos?per_page=3          DAEDALUS 1210 → 1135  (−6.2 %)
 *   gh api .../pulls?per_page=1                   DAEDALUS 2251 → 2185  (−2.9 %)
 *   gh api .../commits?per_page=4                 DAEDALUS 3696 → 3658  (−1.0 %)
 *   ties (plain DAEDALUS kept): branches-20, runs-1, releases-1, npm-left-pad,
 *   package-lock head, holdout gh-api (2 issues), json-pkg; all 22 prose/ops
 *   lanes unchanged (Σ 20322, bench/z49/receipts/fixed/lanes.jsonl).
 * One- and two-object documents sit below the break-even (a template costs
 * about what the dictionary rule it replaces cost); the gain grows with the
 * number of objects per shape.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   prompt : PARADEIGMA_CONTRACT (84 tokens, once) + DAEDALUS's own prompt
 *   line 1 : "≡"                       (wire mark)
 *   rest   : the DAEDALUS wire of  CLAUSE + "\n" + REDUCED JSON
 *   CLAUSE : "≡ " + one block per object shape:
 *              objects having "login": after "node_id": "avatar_url": "https://…/u/<id>?v=4", "gravatar_id": "", …; after "x": … | objects having "number": first: "url": "<repository_url>/issues/<number>"; …
 * The clause is compressed together with the JSON so that its repeated
 * template stems ("<url>/", "_url": ") share the dictionary; a 55-template
 * clause costs ~780 raw tokens but far less after folding.
 * Reader: expand the DAEDALUS part, then for every object that has the named
 * field(s) and lacks a listed field, insert the listed field after the named
 * anchor (or first), in the listed order, same indent, trailing comma unless
 * the next line starts with } or ].  <k> is the value of field k of that very
 * object, quotes dropped (numbers as they are); k may itself be a field
 * restored earlier in the same block (chains: "<url>/followers").  Fields
 * still written literally are kept — that is how the encoder marks the
 * objects that do NOT obey a template (a label whose URL is percent-encoded,
 * an issue whose html_url says /issues/ while the others say /pull/).
 *
 * EXACTNESS
 *   The encoder verifies every template on every member object, chooses the
 *   "objects having" keys so that no object of another shape can fire, runs
 *   its own decoder on the composed wire and keeps only what round-trips;
 *   the plain DAEDALUS arm ALWAYS runs and wins ties, so M(PARADEIGMA) ≤
 *   M(DAEDALUS) on every input.  Scope: pretty-printed JSON (one field per
 *   line, jq / gh / JSON.stringify(x, null, n) / json.dumps(indent=n)).
 *   Anything else is passed to DAEDALUS unchanged.
 *
 * WHAT IT IS NOT
 *   not ELLEIPSIS (a constant at a fixed field position; no slots, no objects),
 *   not EPAGOGE/ENTHYMEME (built-in public conventions — slugs, stack-frame
 *   files — instantiated by parameters; PARADEIGMA induces arbitrary
 *   concatenation templates from the document itself and never assumes a
 *   convention), not TOON/SheetCompressor (re-serialisation), not SPARTAN
 *   (model-based, lossy).  The reader does no arithmetic, no counting, no
 *   case transforms: every slot is a verbatim copy.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';

export const PARADEIGMA_MARK = '≡ ';
/** first line of the wire: tells the decoder that the expanded text opens with a ≡ clause line */
export const PARADEIGMA_WIRE_MARK = '≡\n';
/** the one-chat contract, written once in front of the DAEDALUS prompt (counted in M) */
export const PARADEIGMA_CONTRACT =
  '≡ After expanding, the ≡ line lists fields removed from the JSON objects under it. Print only the JSON with them put back: ' +
  'in each object having the named field(s), insert the listed fields after the named field ("first" = at the top), in order, same indent, comma unless } or ] follows. ' +
  '<k> = that object\'s value of k, quotes dropped. Fields already present stay.';

/* ---------------------------------------------------------------------------
 * 1. LINE STRUCTURE OF PRETTY-PRINTED JSON
 * ------------------------------------------------------------------------- */

export interface Field { line: number; indent: string; key: string; value: string; node: Node | null }
export interface ObjNode { kind: 'obj'; open: number; close: number; fields: Field[] }
export interface ArrNode { kind: 'arr'; open: number; close: number; items: (Node | number)[] }
export type Node = ObjNode | ArrNode;
export interface Tree { lines: string[]; root: Node; tail: string[]; objects: ObjNode[] }

const FIELD = /^(\s*)"((?:[^"\\]|\\.)*)": (.*?)(,?)$/;
const OPENER = /^(\s*)([{[])$/;
const CLOSER = /^(\s*)([}\]])(,?)$/;
const ELEMENT = /^(\s*)(.*?)(,?)$/;

/**
 * Parse one-field-per-line JSON into a tree of line indices; null when the text does not start like that.
 * Parsing stops at the first line that does not fit (a truncated paste, trailing text): those lines are the
 * verbatim tail, and containers still open at that point have close = -1 (no closer line).
 */
export function parseTree(text: string): Tree | null {
  const lines = text.split('\n');
  const objects: ObjNode[] = [];
  const stack: Node[] = [];
  let root: Node | null = null;
  let i = 0;
  const mk = (ch: string, open: number): Node => ch === '{' ? { kind: 'obj', open, close: -1, fields: [] } : { kind: 'arr', open, close: -1, items: [] };
  for (; i < lines.length; i++) {
    const l = lines[i];
    const top = stack.length ? stack[stack.length - 1] : null;
    if (!top) {
      if (root) break; // past the root: the rest is tail
      const m = OPENER.exec(l);
      if (!m) return null;
      root = mk(m[2], i); if (root.kind === 'obj') objects.push(root); stack.push(root);
      continue;
    }
    const c = CLOSER.exec(l);
    if (c) {
      if ((c[2] === '}') !== (top.kind === 'obj')) break;
      top.close = i; stack.pop();
      continue;
    }
    if (top.kind === 'obj') {
      const m = FIELD.exec(l);
      if (!m) break;
      const [, indent, key, value] = m;
      const field: Field = { line: i, indent, key, value, node: null };
      if (value === '{' || value === '[') { const node = mk(value, i); field.node = node; stack.push(node); if (node.kind === 'obj') objects.push(node); }
      top.fields.push(field);
    } else {
      const o = OPENER.exec(l);
      if (o) { const node = mk(o[2], i); top.items.push(node); stack.push(node); if (node.kind === 'obj') objects.push(node); }
      else { if (!ELEMENT.test(l) || l.trim() === '') break; top.items.push(i); }
    }
  }
  if (!root) return null;
  return { lines, root, tail: lines.slice(i), objects };
}

/** raw slot content of a scalar field value: string → its inner text, number → digits; null for anything else */
export function slotText(value: string): string | null {
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') return value.slice(1, -1);
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) return value;
  return null;
}

/* ---------------------------------------------------------------------------
 * 2. TEMPLATES
 * ------------------------------------------------------------------------- */

const KEY_OK = /^[A-Za-z0-9_.$@:-]+$/;
const isWordChar = (ch: string) => /[A-Za-z0-9]/.test(ch);

/** Replace sibling values inside the value of field fi by <key> placeholders (longest sibling first, word-bounded). */
export function skeletonOf(obj: ObjNode, fi: number, exclude: ReadonlySet<string> = new Set()): { sk: string; slots: string[] } | null {
  const f = obj.fields[fi];
  if (f.node) return null;
  const value = f.value;
  if (value.includes('<') || value.includes('>') || value.includes('\n')) return null;
  // a template value is a JSON string or a bare scalar (number, true/false/null, [] or {}): nothing the clause scanner could split
  if (!(value.startsWith('"') && value.endsWith('"') && value.length >= 2) && !/^[^\s,;|"]+$/.test(value)) return null;
  const sibs: { s: string; k: string }[] = [];
  for (const g of obj.fields) {
    if (g === f || g.node || exclude.has(g.key) || !KEY_OK.test(g.key)) continue;
    const s = slotText(g.value);
    if (s === null || s.length < 3 || s.includes('<') || s.includes('>')) continue;
    sibs.push({ s, k: g.key });
  }
  sibs.sort((a, b) => b.s.length - a.s.length || obj.fields.findIndex(x => x.key === a.k) - obj.fields.findIndex(x => x.key === b.k));
  let sk = value; const slots: string[] = [];
  for (const { s, k } of sibs) {
    let out = '', p = 0, found = false;
    for (;;) {
      const q = sk.indexOf(s, p);
      if (q < 0) break;
      const before = q > 0 ? sk[q - 1] : '', after = q + s.length < sk.length ? sk[q + s.length] : '';
      const inside = sk.lastIndexOf('<', q) > sk.lastIndexOf('>', q);
      if (!inside && !isWordChar(before) && !isWordChar(after)) {
        out += sk.slice(p, q) + '<' + k + '>'; p = q + s.length; found = true;
      } else { out += sk.slice(p, q + 1); p = q + 1; }
    }
    out += sk.slice(p);
    if (found) { sk = out; if (!slots.includes(k)) slots.push(k); }
  }
  return { sk, slots };
}

/** Fill a template from the current fields of an object; null when a slot is missing. */
export function fillTemplate(sk: string, fields: ReadonlyMap<string, string>): string | null {
  let out = '', p = 0;
  for (;;) {
    const a = sk.indexOf('<', p);
    if (a < 0) break;
    const b = sk.indexOf('>', a);
    if (b < 0) return null;
    const k = sk.slice(a + 1, b);
    const v = fields.get(k);
    if (v === undefined) return null;
    const s = slotText(v);
    if (s === null) return null;
    out += sk.slice(p, a) + s; p = b + 1;
  }
  return out + sk.slice(p);
}

/* ---------------------------------------------------------------------------
 * 3. CLAUSE GRAMMAR  (blocks | runs ; items ,)
 * ------------------------------------------------------------------------- */

export interface Item { key: string; sk: string }
export interface Run { anchor: string; items: Item[] } // anchor '' = first
export interface Block { kind: string[]; runs: Run[] }

const q = (s: string) => '"' + s + '"';

export function clauseOf(blocks: Block[]): string {
  return PARADEIGMA_MARK + blocks.map(b =>
    `objects having ${b.kind.map(q).join(' and ')}: ` + b.runs.map(r =>
      (r.anchor === '' ? 'first: ' : `after ${q(r.anchor)}: `) + r.items.map(it => `${q(it.key)}: ${it.sk}`).join(', ')).join('; ')).join(' | ');
}

class Scanner {
  i = 0;
  constructor(public s: string) {}
  lit(t: string): boolean { if (this.s.startsWith(t, this.i)) { this.i += t.length; return true; } return false; }
  str(): string | null {
    if (this.s[this.i] !== '"') return null;
    let j = this.i + 1;
    while (j < this.s.length && this.s[j] !== '"') { if (this.s[j] === '\\') j++; j++; }
    if (j >= this.s.length) return null;
    const v = this.s.slice(this.i + 1, j); this.i = j + 1; return v;
  }
  /** a JSON scalar: a string or a bare token up to the next separator */
  scalar(): string | null {
    if (this.s[this.i] === '"') { const v = this.str(); return v === null ? null : '"' + v + '"'; }
    const m = /^[^,;|\s]+/.exec(this.s.slice(this.i));
    if (!m) return null;
    this.i += m[0].length; return m[0];
  }
  done(): boolean { return this.i >= this.s.length; }
}

export function parseClause(line: string): Block[] | null {
  if (!line.startsWith(PARADEIGMA_MARK)) return null;
  const sc = new Scanner(line.slice(PARADEIGMA_MARK.length));
  const blocks: Block[] = [];
  for (;;) {
    if (!sc.lit('objects having ')) return null;
    const kind: string[] = [];
    for (;;) { const k = sc.str(); if (k === null) return null; kind.push(k); if (!sc.lit(' and ')) break; }
    if (!sc.lit(': ')) return null;
    const runs: Run[] = [];
    for (;;) {
      let anchor: string;
      if (sc.lit('first: ')) anchor = '';
      else { if (!sc.lit('after ')) return null; const a = sc.str(); if (a === null || !sc.lit(': ')) return null; anchor = a; }
      const items: Item[] = [];
      for (;;) {
        const key = sc.str(); if (key === null || !sc.lit(': ')) return null;
        const sk = sc.scalar(); if (sk === null) return null;
        items.push({ key, sk });
        if (!sc.lit(', ')) break;
      }
      runs.push({ anchor, items });
      if (!sc.lit('; ')) break;
    }
    blocks.push({ kind, runs });
    if (sc.done()) break;
    if (!sc.lit(' | ')) return null;
  }
  return blocks;
}

/* ---------------------------------------------------------------------------
 * 4. READER (restore the removed fields)
 * ------------------------------------------------------------------------- */

interface Cur { key: string; field: Field | null; text: string; value: string }

function restoreTree(tree: Tree, blocks: Block[]): string {
  const { lines } = tree;
  const out: string[] = [];
  const emit = (node: Node): void => { out.push(lines[node.open]); body(node); if (node.close >= 0) out.push(lines[node.close]); };
  const tailComma = tree.tail.length && !/^\s*[}\]]/.test(tree.tail[0]) ? ',' : '';
  const body = (node: Node): void => {
    if (node.kind === 'arr') {
      for (const it of node.items) typeof it === 'number' ? out.push(lines[it]) : emit(it);
      return;
    }
    const cur: Cur[] = node.fields.map(f => ({ key: f.key, field: f, text: '', value: f.value }));
    const present = new Set(cur.map(c => c.key));
    const indentOf = (c: Cur) => c.field ? c.field.indent : c.text.match(/^\s*/)![0];
    for (const b of blocks) {
      if (!b.kind.every(k => present.has(k))) continue;
      for (const r of b.runs) {
        let pos: number;
        if (r.anchor === '') pos = 0;
        else { const a = cur.findIndex(c => c.key === r.anchor); if (a < 0) continue; pos = a + 1; }
        for (const it of r.items) {
          const have = cur.findIndex(c => c.key === it.key);
          if (have >= 0) { pos = have + 1; continue; }
          const values = new Map(cur.map(c => [c.key, c.value] as const));
          const v = fillTemplate(it.sk, values);
          if (v === null) continue;
          if (!cur.length) continue;
          const indent = indentOf(pos === 0 ? cur[0] : cur[pos - 1]);
          cur.splice(pos, 0, { key: it.key, field: null, text: `${indent}"${it.key}": ${v}`, value: v });
          present.add(it.key); pos++;
        }
      }
    }
    cur.forEach((c, idx) => {
      if (c.field) {
        out.push(lines[c.field.line]);
        if (c.field.node) { body(c.field.node); if (c.field.node.close >= 0) out.push(lines[c.field.node.close]); }
      } else out.push(c.text + (idx < cur.length - 1 ? ',' : node.close >= 0 ? '' : tailComma));
    });
  };
  emit(tree.root);
  return out.concat(tree.tail).join('\n');
}

/** Apply the template blocks to a decoded JSON text; returns the text unchanged when it is not pretty-printed JSON. */
export function restore(text: string, blocks: Block[]): string {
  const tree = parseTree(text);
  if (!tree) return text;
  return restoreTree(tree, blocks);
}

/* ---------------------------------------------------------------------------
 * 5. ENCODER
 * ------------------------------------------------------------------------- */

export interface Candidate {
  key: string; anchor: string; sk: string; slots: string[];
  members: { obj: ObjNode; fi: number }[];
  kind: string[];
  margin: number;
}

const groupKey = (key: string, anchor: string, sk: string) => [key, anchor, sk].join('\u0003');

/** Group (object, field) pairs by (key, anchor, skeleton) across all objects; keep groups that pay. */
function candidates(tree: Tree, excl: Map<string, Set<string>>, dropped: Set<string>, minMembers: number): Candidate[] {
  const groups = new Map<string, Candidate>();
  for (const o of tree.objects) {
    for (let fi = 0; fi < o.fields.length; fi++) {
      const f = o.fields[fi];
      if (f.node || !KEY_OK.test(f.key)) continue;
      const r = skeletonOf(o, fi, excl.get(f.key));
      if (!r) continue;
      const anchor = fi > 0 ? o.fields[fi - 1].key : '';
      const gk = groupKey(f.key, anchor, r.sk);
      if (dropped.has(gk)) continue;
      let g = groups.get(gk);
      if (!g) { g = { key: f.key, anchor, sk: r.sk, slots: r.slots, members: [], kind: [], margin: 0 }; groups.set(gk, g); }
      g.members.push({ obj: o, fi });
    }
  }
  const cands: Candidate[] = [];
  for (const g of groups.values()) {
    if (g.members.length < minMembers) continue;
    // Measured seam (bench/z49): under DAEDALUS every slot value in a removed line costs its glyph plus the glyph of the
    // constant run that follows it (~2 tokens); a line with NO slot is already part of a constant run and is free, so
    // constant templates never pay.  The clause item costs about 4 tokens more than the dictionary rule it replaces.
    if (!g.slots.length) continue;
    g.margin = g.members.length * 2 * g.slots.length - 4;
    if (g.margin > 0) cands.push(g);
  }
  cands.sort((a, b) => b.margin - a.margin || a.members[0].obj.open - b.members[0].obj.open || a.members[0].fi - b.members[0].fi);
  return cands;
}

export interface Plan { blocks: Block[]; removed: Set<number>; templates: number; accepted: Candidate[]; margin: number }

/**
 * Choose templates greedily by margin.  Each accepted template gets "objects having" keys: literal keys that
 * every member has and that no other object able to fire (anchor present, field absent or removed) has in full.
 */
export function plan(tree: Tree, minMembers: number, excl: Map<string, Set<string>>, dropped: Set<string>): Plan | null {
  const cands = candidates(tree, excl, dropped, minMembers);
  if (!cands.length) return null;
  const keysOf = new Map<ObjNode, Set<string>>(tree.objects.map(o => [o, new Set(o.fields.map(f => f.key))]));
  const templatedKeys = new Set(cands.map(c => c.key));
  const removedBy = new Map<ObjNode, Set<string>>(); // keys removed by ACCEPTED templates
  const accepted: Candidate[] = [];
  const kindsUsed: { kind: string[]; members: Set<ObjNode> }[] = [];
  type Has = (o: ObjNode, k: string) => boolean;
  /**
   * "objects having" keys for c under a given literal-ness: keys every member still has literally, such that no
   * outside object that could fire (anchor present; field absent or removed) has them all — judged by the outside
   * object's ORIGINAL keys, since a removed key may have been restored by an earlier block.  Tier 1 separates the
   * members from every other object (so one shape gets one block, in field order: anchors and chains resolve);
   * tier 2 only from the objects that could fire.
   */
  const chooseKind = (c: Candidate, has: Has): string[] | null => {
    const memberSet = new Set(c.members.map(m => m.obj));
    const couldFire = tree.objects.filter(o => !memberSet.has(o) && (c.anchor === '' || keysOf.get(o)!.has(c.anchor)) && !has(o, c.key));
    const everyOther = tree.objects.filter(o => !memberSet.has(o));
    const common = c.members[0].obj.fields.map(f => f.key).filter(k => k !== c.key && KEY_OK.test(k) && c.members.every(m => has(m.obj, k)))
      .sort((a, b) => Number(templatedKeys.has(a)) - Number(templatedKeys.has(b))); // keys never templated anywhere first (stable sort keeps field order)
    const sepFrom = (pool: ObjNode[]) => (ks: string[]) => pool.every(o => !ks.every(k => keysOf.get(o)!.has(k)));
    for (const separates of [sepFrom(everyOther), sepFrom(couldFire)]) {
      for (const used of kindsUsed) if (c.members.every(m => used.members.has(m.obj)) && used.kind.every(k => common.includes(k)) && separates(used.kind)) return used.kind;
      for (const k of common) if (separates([k])) return [k];
      for (let a = 0; a < common.length; a++) for (let b = a + 1; b < common.length; b++) if (separates([common[a], common[b]])) return [common[a], common[b]];
    }
    return null;
  };
  for (const c of cands) {
    const memberSet = new Set(c.members.map(m => m.obj));
    // literal-ness if c were accepted
    const has: Has = (o, k) => keysOf.get(o)!.has(k) && !removedBy.get(o)?.has(k) && !(k === c.key && memberSet.has(o));
    const kind = chooseKind(c, has);
    if (!kind) continue;
    // two templates that fill each other's slots can never both be restored
    if (accepted.some(a => c.slots.includes(a.key) && a.slots.includes(c.key))) continue;
    // one template per key and shape: a second anchor or skeleton for the same key would fire first in the other's objects
    if (accepted.some(a => a.key === c.key && (c.members.some(m => a.kind.every(k => keysOf.get(m.obj)!.has(k))) || a.members.some(m => kind.every(k => keysOf.get(m.obj)!.has(k)))))) continue;
    // accepting c changes what outside objects lack: earlier templates of the same key, and templates whose kind keys c removes, must still separate
    const affected = accepted.filter(a => a.key === c.key || (a.kind.includes(c.key) && a.members.some(m => memberSet.has(m.obj))));
    const newKinds = affected.map(a => chooseKind(a, has));
    if (newKinds.some(k => !k)) continue;
    affected.forEach((a, i) => { a.kind = newKinds[i]!; });
    c.kind = kind; accepted.push(c);
    for (const k of [kind, ...newKinds as string[][]]) if (!kindsUsed.some(u => u.kind.join('\u0001') === k.join('\u0001'))) kindsUsed.push({ kind: k, members: memberSet });
    for (const m of c.members) { const set = removedBy.get(m.obj) || new Set<string>(); set.add(c.key); removedBy.set(m.obj, set); }
  }
  if (!accepted.length) return null;
  // blocks: one per kind set, ordered by the first member line; items in field order; consecutive items form runs
  const byKind = new Map<string, Candidate[]>();
  for (const c of accepted) { const k = c.kind.join('\u0001'); const a = byKind.get(k) || []; a.push(c); byKind.set(k, a); }
  const blockList = [...byKind.values()].sort((a, b) => Math.min(...a.map(c => c.members[0].fi)) - Math.min(...b.map(c => c.members[0].fi)) || Math.min(...a.map(c => c.members[0].obj.open)) - Math.min(...b.map(c => c.members[0].obj.open)));
  const blocks: Block[] = [];
  const removed = new Set<number>();
  let margin = 0;
  for (const list of blockList) {
    // field order: compare two templates inside an object that carries both fields (shapes differ in length, so a raw
    // field index is not comparable across objects); fall back to the first member's index
    const before = (x: Candidate, y: Candidate): number => {
      for (const m of x.members) { const fx = m.obj.fields.findIndex(f => f.key === x.key), fy = m.obj.fields.findIndex(f => f.key === y.key); if (fy >= 0) return fx - fy; }
      for (const m of y.members) { const fy = m.obj.fields.findIndex(f => f.key === y.key), fx = m.obj.fields.findIndex(f => f.key === x.key); if (fx >= 0) return fx - fy; }
      return x.members[0].fi - y.members[0].fi || x.members[0].obj.open - y.members[0].obj.open;
    };
    const ordered: Candidate[] = [];
    for (const c of list) { let i = ordered.length; while (i > 0 && before(c, ordered[i - 1]) < 0) i--; ordered.splice(i, 0, c); }
    list.splice(0, list.length, ...ordered);
    const runs: Run[] = [];
    for (const c of list) {
      const last = runs.length ? runs[runs.length - 1] : null;
      if (last && last.items[last.items.length - 1].key === c.anchor) last.items.push({ key: c.key, sk: c.sk });
      else runs.push({ anchor: c.anchor, items: [{ key: c.key, sk: c.sk }] });
      for (const m of c.members) removed.add(m.obj.fields[m.fi].line);
      margin += c.margin;
    }
    blocks.push({ kind: list[0].kind, runs });
  }
  return { blocks, removed, templates: accepted.length, accepted, margin };
}

export interface ParadeigmaResult extends DaedalusResult {
  codec2: 'paradeigma';
  applied: boolean;
  templateBlocks: Block[];
  templates: number;
  elidedLines: number;
  clauseTokens: number;
  plainMessageTokens: number;
}

export interface ParadeigmaOptions extends DaedalusOptions {
  /** a template must hold in at least this many objects of a shape */
  minMembers?: number;
  /** testing only: keep the composed wire even when the plain arm is not worse (the round trip must still be exact) */
  force?: boolean;
}

function plainResult(plain: DaedalusResult, started: number, note: string): ParadeigmaResult {
  return {
    ...plain, codec2: 'paradeigma', applied: false, templateBlocks: [], templates: 0, elidedLines: 0, clauseTokens: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `paradeigma: not applied (${note}); ${plain.notes}`,
  };
}

/** Plan, verify by decoding; on a mismatch first re-skeleton the culprit without its templated slots, then drop it; repeat. */
export function induce(text: string, minMembers: number): { blocks: Block[]; reduced: string; templates: number; elided: number; margin: number } | null {
  const tree = parseTree(text);
  if (!tree) return null;
  const excl = new Map<string, Set<string>>();
  const dropped = new Set<string>();
  let lastCulprit = '';
  for (let round = 0; round < 60; round++) {
    const p = plan(tree, minMembers, excl, dropped);
    if (!p) return null;
    const reduced = tree.lines.filter((_, i) => !p.removed.has(i)).join('\n');
    const back = restore(reduced, p.blocks);
    if (back === text) return { blocks: p.blocks, reduced, templates: p.templates, elided: p.removed.size, margin: p.margin };
    const a = text.split('\n'), b = back.split('\n');
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const keyAt = (l: string | undefined) => { const m = l ? FIELD.exec(l) : null; return m ? m[2] : null; };
    const kb = keyAt(b[i]), ka = keyAt(a[i]);
    const culprits = p.accepted.filter(c => c.key === kb);
    const list = culprits.length ? culprits : p.accepted.filter(c => c.key === ka);
    if (!list.length) return null;
    const key = list[0].key;
    if (process.env.PARADEIGMA_DEBUG) console.error(`paradeigma repair round ${round}: diff at line ${i}: want ${JSON.stringify(a[i])} got ${JSON.stringify(b[i])}; culprit key ${key}`);
    const templated = new Set(p.accepted.map(c => c.key));
    const chained = list.flatMap(c => c.slots.filter(sl => templated.has(sl)));
    if (chained.length && lastCulprit !== key) { // try the templates again without their chained slots
      const set = excl.get(key) || new Set<string>(); chained.forEach(sl => set.add(sl)); excl.set(key, set);
      lastCulprit = key;
    } else {
      for (const c of list) dropped.add(groupKey(c.key, c.anchor, c.sk));
      lastCulprit = '';
    }
  }
  return null;
}

export function paradeigmaEncode(text: string, enc: EncodingName = 'o200k_base', options: ParadeigmaOptions = {}): ParadeigmaResult {
  const started = Date.now();
  const { minMembers = 2, force = false, ...dopts } = options;
  const inTokens = countTokens(text, enc);
  if (text.startsWith(PARADEIGMA_MARK) || text.startsWith(PARADEIGMA_WIRE_MARK) || text.includes('\r')) return plainResult(daedalusEncode(text, enc, dopts), started, text.includes('\r') ? 'CR in payload' : 'payload starts with the clause mark');
  const head = text.trimStart();
  if (!(head.startsWith('{') || head.startsWith('[')) || text.startsWith('\n')) return plainResult(daedalusEncode(text, enc, dopts), started, 'not JSON');
  const ind = induce(text, minMembers);
  if (!ind) return plainResult(daedalusEncode(text, enc, dopts), started, 'no template over sibling fields pays for its sentence');
  if (ind.margin < 24 && !force) return plainResult(daedalusEncode(text, enc, dopts), started, `templates found (${ind.templates}) but the estimated gain ${ind.margin} cannot pay the contract`);
  const clause = clauseOf(ind.blocks);
  const parsed = parseClause(clause);
  if (!parsed || JSON.stringify(parsed) !== JSON.stringify(ind.blocks)) return plainResult(daedalusEncode(text, enc, dopts), started, 'clause does not carry its parameters');
  const clauseTokens = countTokens(clause + '\n', enc);
  // the clause is compressed WITH the reduced text: its repeated template stems fold into the same dictionary
  const inner = daedalusEncode(clause + '\n' + ind.reduced, enc, dopts);
  const wire = PARADEIGMA_WIRE_MARK + inner.wire;
  const decoderPrompt = PARADEIGMA_CONTRACT + '\n' + inner.decoderPrompt;
  const decoded = paradeigmaDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);
  const plain = daedalusEncode(text, enc, dopts); // the plain arm always runs: prediction is a pre-filter, not a proof
  if (!exact || (messageTokens >= plain.messageTokens && !force)) {
    return plainResult(plain, started, !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain.messageTokens}`);
  }
  return {
    ...inner, codec2: 'paradeigma', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + clauseTokens, decoderPrompt,
    savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    applied: true, templateBlocks: ind.blocks, templates: ind.templates, elidedLines: ind.elided, clauseTokens, plainMessageTokens: plain.messageTokens,
    ms: Date.now() - started,
    notes: `paradeigma: ${ind.templates} templates in ${ind.blocks.length} block(s), ${ind.elided} lines removed; clause ${clauseTokens} tok; M ${messageTokens} vs plain ${plain.messageTokens}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 6. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

export function paradeigmaDecode(wire: string): string {
  if (!wire.startsWith(PARADEIGMA_WIRE_MARK)) return daedalusDecode(wire);
  const text = daedalusDecode(wire.slice(PARADEIGMA_WIRE_MARK.length));
  const k = text.indexOf('\n');
  const clause = k < 0 ? text : text.slice(0, k);
  const blocks = parseClause(clause);
  if (!blocks) return text;
  return restore(k < 0 ? '' : text.slice(k + 1), blocks);
}

export function paradeigmaDecoderPrompt(wire: string): string {
  if (!wire.startsWith(PARADEIGMA_WIRE_MARK)) return daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
  const inner = wire.slice(PARADEIGMA_WIRE_MARK.length);
  return PARADEIGMA_CONTRACT + '\n' + (daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner);
}
