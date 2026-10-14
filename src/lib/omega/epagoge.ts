/**
 * EPAGOGE — induced entailment: the rule is instantiated from the document, then stated.
 * =============================================================================
 * ἐπαγωγή — Aristotle's word for induction, the move from particulars to the
 * general. ENTHYMEME (Z46) leaves unstated a field that a FIXED public
 * convention derives from its neighbours (a JVM frame's `Foo.java`, a Markdown
 * heading's GitHub slug) and tells the reader that convention in one sentence.
 * EPAGOGE keeps the mechanism and removes the fixed catalogue: each rule is a
 * SCHEMA with free parameters, the encoder INDUCES the parameters from the
 * document (which source-file extensions, which slug flavour, which compare-URL
 * stem and tag prefix), verifies the instantiated relation on every candidate,
 * elides only where it holds, and states the instantiated sentence. Three
 * things ENTHYMEME cannot express follow:
 *
 *   1. several simultaneous instances of one schema — Android traces mix
 *      framework frames (`ActivityThread.java`) with app and coroutine frames
 *      (`MainActivity.kt`); two elided forms `(:N)`→`.java`, `(;N)`→`.kt`;
 *   2. language parameters discovered, not assumed — `.kt`, `.scala`, `.groovy`
 *      frames; Kotlin's file facades (`UtilsKt` lives in `Utils.kt`);
 *   3. INTER-record relations ("zipper" rules): a field derived from the NEXT
 *      record's field — Keep-a-Changelog release links
 *      `[0.34.0]: …/compare/v0.33.0...v0.34.0`, where `0.33.0` is the version of
 *      the next link line.
 *
 * Everything else is ENTHYMEME's: the sentence is counted in M, the payload is
 * refused if it already contains an elided form, each instance's own round trip
 * must be exact before it is used, the composed wire must decode byte-exactly,
 * and the plain DAEDALUS arm is always run and wins ties, so M is never above the
 * frontier (ENTHYMEME skipped that arm on large predicted wins; bench/z47 found a
 * file where the prediction was wrong). On a Java-only trace or a GitHub-slug
 * README EPAGOGE emits ENTHYMEME's exact sentence and therefore ties it token
 * for token (verified in bench/z47).
 *
 * WIRE
 *   line 1   `∴ ` + instantiated sentence(s)
 *   rest     the DAEDALUS wire of the reduced text
 * The decoder parses the parameters back out of the sentence (so does the
 * independent CPython reader, bench/epagoge_decode.py), expands the dictionary,
 * then restores the fields.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';

export const EPAGOGE_MARK = '∴ ';

/* ---------------------------------------------------------------------------
 * 1. SCHEMAS AND INSTANCES
 * ------------------------------------------------------------------------- */

export interface FoldStats {
  text: string;
  count: number;
  distinct: number;
  elidedTokens: number;
  /** predicted saving against the dictionary, in tokens, before the sentence */
  estimate: number;
}

export interface Instance {
  schema: 'frames' | 'anchors' | 'release-links';
  /** the instantiated sentence the reader needs */
  clause: string;
  /** short description of the induced parameters, for notes */
  params: string;
  fold(text: string, enc: EncodingName): FoldStats | null;
  unfold(text: string): string;
}

export interface Schema {
  id: Instance['schema'];
  /** induce the parameters from the text; null when nothing is derivable */
  instantiate(text: string, enc: EncodingName): Instance | null;
  /** recover an instance from a wire's first line; null when the sentence is not this schema's */
  parse(clause: string): Instance | null;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- schema F: JVM-family stack frames --------------------------------------
//
//   at pkg.Outer$Inner.m(Outer.java:123)      -> at pkg.Outer$Inner.m(:123)     [form ':' = ext1]
//   at app.MainActivity$onCreate$1.invoke(MainActivity.kt:25) -> (;25)         [form ';' = ext2]
//   at kotlin.io.FilesKt.readText(Files.kt:9) -> (;9) with the Kt-facade option (a final "Kt" of S dropped)

const FRAME_RE = /\bat\s+([\w$.<>/[\]-]+)\.([\w$<>]+)\((\w[\w$]*)\.(\w+):(\d+)\)/g;
const FORM_CHARS = [':', ';'] as const;

export function frameSimpleName(classPath: string): string {
  const simple = classPath.slice(classPath.lastIndexOf('.') + 1);
  const dollar = simple.indexOf('$');
  return dollar < 0 ? simple : simple.slice(0, dollar);
}

interface FrameForm { ch: ':' | ';'; ext: string; ktFacade: boolean }

function frameFileFor(cls: string, form: FrameForm): string {
  let s = frameSimpleName(cls);
  if (form.ktFacade && s.length > 2 && s.endsWith('Kt')) s = s.slice(0, -2);
  return s + '.' + form.ext;
}

function framesClause(forms: FrameForm[]): string {
  const eq = forms.map(f => `"at C.m(${f.ch}N)" = "at C.m(S.${f.ext}:N)"`).join(' and ');
  const kt = forms.some(f => f.ktFacade) ? `; for "${forms.find(f => f.ktFacade)!.ch}" a final "Kt" of S is dropped` : '';
  return `Stack frames: ${eq}, S = C after its last ".", cut at the first "$"${kt}.`;
}

function framesInstance(forms: FrameForm[]): Instance {
  const foldedRe = new RegExp(`\\bat\\s+([\\w$.<>/[\\]-]+)\\.([\\w$<>]+)\\(([${forms.map(f => esc(f.ch)).join('')}])(\\d+)\\)`, 'g');
  const byCh = new Map(forms.map(f => [f.ch, f] as const));
  return {
    schema: 'frames',
    clause: framesClause(forms),
    params: forms.map(f => `${f.ch}=${f.ext}${f.ktFacade ? '(Kt)' : ''}`).join(','),
    fold(text, enc) {
      foldedRe.lastIndex = 0;
      if (foldedRe.test(text)) return null; // an elided form already occurs: not safe
      const seen = new Map<string, number>();
      let count = 0, elidedTokens = 0;
      const out = text.replace(FRAME_RE, (m, cls: string, method: string, file: string, ext: string, line: string) => {
        const form = forms.find(f => f.ext === ext && frameFileFor(cls, f) === file + '.' + ext);
        if (!form) return m;
        count++;
        seen.set(file + '.' + ext, (seen.get(file + '.' + ext) || 0) + 1);
        elidedTokens += countTokens(file + '.' + ext, enc);
        return m.slice(0, m.indexOf(cls)) + `${cls}.${method}(${form.ch}${line})`;
      });
      if (!count) return null;
      // calibration as ENTHYMEME (bench/z46/receipts/trace-probe.log): a distinct file saves its tokens minus the
      // glyph the dictionary would have used, a repeated one about half a token. The estimate is deliberately
      // optimistic — it only decides whether the composed arm is worth running; the plain arm, which always runs,
      // catches over-prediction (curbox_446: 351 mostly repeated frames, predicted +120, measured −20, plain arm wins),
      // while a pessimistic estimate silently loses real wins (oracle_graal_12109: −11 under a distinct-frame model)
      let distinctTokens = 0;
      for (const f of seen.keys()) distinctTokens += countTokens(f, enc);
      const estimate = Math.round(distinctTokens - seen.size + (count - seen.size) / 2);
      return { text: out, count, distinct: seen.size, elidedTokens, estimate };
    },
    unfold(text) {
      return text.replace(foldedRe, (m, cls: string, method: string, ch: string, line: string) =>
        m.slice(0, m.indexOf(cls)) + `${cls}.${method}(${frameFileFor(cls, byCh.get(ch as ':' | ';')!)}:${line})`);
    },
  };
}

const framesSchema: Schema = {
  id: 'frames',
  instantiate(text, enc) {
    // per extension: the derivable frames, with and without the Kt-facade option
    type Stat = { files: Set<string>; n: number };
    const stat = (m: Map<string, Stat>, ext: string) => { let v = m.get(ext); if (!v) { v = { files: new Set(), n: 0 }; m.set(ext, v); } return v; };
    const plain = new Map<string, Stat>();
    const facade = new Map<string, Stat>();
    FRAME_RE.lastIndex = 0;
    for (const m of text.matchAll(FRAME_RE)) {
      const [whole, cls, , file, ext] = m;
      const s = frameSimpleName(cls);
      if (s === file) { const v = stat(plain, ext); v.files.add(file); v.n++; }
      if (s.length > 2 && s.endsWith('Kt') && s.slice(0, -2) === file) { const v = stat(facade, ext); v.files.add(file); v.n++; }
    }
    // the same (optimistic) saving model as fold(): a distinct file saves its tokens minus one glyph, a repeat about
    // half a token; over-prediction is caught by the plain arm, under-prediction would silently lose tokens
    const worth = (v: Stat | undefined) => {
      if (!v) return 0;
      let t = 0; for (const f of v.files) t += countTokens(f, enc);
      return t - v.files.size + (v.n - v.files.size) / 2;
    };
    const exts = [...plain.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
    if (!exts.length) return null;
    const forms: FrameForm[] = [{ ch: FORM_CHARS[0], ext: exts[0][0], ktFacade: false }];
    // a second form costs its own share of the sentence (about 17 tokens): its predicted saving must cover that
    if (exts.length > 1) {
      const [ext, v] = exts[1];
      const two = [...forms, { ch: FORM_CHARS[1], ext, ktFacade: false }];
      const marginal = countTokens(framesClause(two), enc) - countTokens(framesClause(forms), enc);
      if (v.n >= 3 && worth(v) >= marginal) forms.push(two[1]);
    }
    // the Kt-facade option (about 12 more sentence tokens): only for a `kt` form, only when its predicted saving covers it
    const ktForm = forms.find(f => f.ext === 'kt');
    if (ktForm && facade.has('kt')) {
      const withKt = forms.map(f => f === ktForm ? { ...f, ktFacade: true } : f);
      const marginal = countTokens(framesClause(withKt), enc) - countTokens(framesClause(forms), enc);
      if (facade.get('kt')!.n >= 3 && worth(facade.get('kt')) >= marginal) ktForm.ktFacade = true;
    }
    return framesInstance(forms);
  },
  parse(clause) {
    if (!clause.startsWith('Stack frames:')) return null;
    const forms: FrameForm[] = [];
    for (const m of clause.matchAll(/"at C\.m\(([:;])N\)" = "at C\.m\(S\.(\w+):N\)"/g)) forms.push({ ch: m[1] as ':' | ';', ext: m[2], ktFacade: false });
    if (!forms.length) return null;
    const kt = clause.match(/for "([:;])" a final "Kt" of S is dropped/);
    if (kt) { const f = forms.find(x => x.ch === kt[1]); if (f) f.ktFacade = true; }
    return framesInstance(forms);
  },
};

// ---- schema A: Markdown heading links ----------------------------------------
//
//   flavour 'github'  [Getting Started](#getting-started)   github-slugger
//   flavour 'percent' [Getting Started](#Getting%20Started)  Obsidian / Notion-style exports (spaces as %20)

const ANCHOR_RE = /\[([^[\]\n]+)\]\(#([^()\s]+)\)/g;
const ANCHOR_FOLDED_RE = /\[([^[\]\n]+)\]\(#\)/g;

export function githubSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\p{M} \-_]/gu, '').replace(/ /g, '-');
}
export function percentSlug(text: string): string {
  return text.replace(/ /g, '%20');
}

type Flavour = 'github' | 'percent';
const SLUG: Record<Flavour, { fn: (s: string) => string; clause: string }> = {
  github: { fn: githubSlug, clause: 'Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces, "-" and "_", then spaces → "-".' },
  percent: { fn: percentSlug, clause: 'Links: "[t](#)" = "[t](#s)", s = t with every space written "%20".' },
};

function anchorsInstance(flavour: Flavour): Instance {
  const slug = SLUG[flavour].fn;
  return {
    schema: 'anchors',
    clause: SLUG[flavour].clause,
    params: flavour,
    fold(text, enc) {
      ANCHOR_FOLDED_RE.lastIndex = 0;
      if (ANCHOR_FOLDED_RE.test(text)) return null;
      const seen = new Set<string>();
      let count = 0, elidedTokens = 0;
      const out = text.replace(ANCHOR_RE, (m, label: string, anchor: string) => {
        if (slug(label) !== anchor) return m;
        count++; seen.add(anchor);
        elidedTokens += countTokens(anchor, enc);
        return `[${label}](#)`;
      });
      if (!count) return null;
      return { text: out, count, distinct: seen.size, elidedTokens, estimate: elidedTokens };
    },
    unfold(text) {
      return text.replace(ANCHOR_FOLDED_RE, (_m, label: string) => `[${label}](#${slug(label)})`);
    },
  };
}

const anchorsSchema: Schema = {
  id: 'anchors',
  instantiate(text) {
    const n: Record<Flavour, number> = { github: 0, percent: 0 };
    for (const m of text.matchAll(ANCHOR_RE)) for (const f of Object.keys(SLUG) as Flavour[]) if (SLUG[f].fn(m[1]) === m[2]) n[f]++;
    const best = (Object.keys(n) as Flavour[]).sort((a, b) => n[b] - n[a])[0];
    return n[best] ? anchorsInstance(best) : null;
  },
  parse(clause) {
    for (const f of Object.keys(SLUG) as Flavour[]) if (clause === SLUG[f].clause) return anchorsInstance(f);
    return null;
  },
};

// ---- schema Z: Keep-a-Changelog release links (a zipper: derived from the NEXT record) ---
//
//   [0.34.0]: https://github.com/o/r/compare/v0.33.0...v0.34.0     ->  [0.34.0]:
//   P (0.33.0) is the bracket text of the next link-definition line below.

const LINKDEF_RE = /^\[([^\]\n]+)\]: (\S+)$/gm;

interface ReleaseParams { stem: string; prefix: string }

function releaseInstance(p: ReleaseParams): Instance {
  const want = (v: string, next: string) => `${p.stem}${p.prefix}${next}...${p.prefix}${v}`;
  const foldedLine = /^\[([^\]\n]+)\]:$/gm;
  return {
    schema: 'release-links',
    clause: `Release links: "[V]:" alone on a line = "[V]: ${p.stem}${p.prefix}P...${p.prefix}V", P = the V of the next "[P]:" line.`,
    params: `stem=${p.stem} prefix=${JSON.stringify(p.prefix)}`,
    fold(text, enc) {
      foldedLine.lastIndex = 0;
      if (foldedLine.test(text)) return null;
      const defs = [...text.matchAll(LINKDEF_RE)];
      let count = 0, elidedTokens = 0;
      const cut: Array<[number, number]> = [];
      for (let i = 0; i + 1 < defs.length; i++) {
        const [, v, url] = defs[i];
        const next = defs[i + 1][1];
        if (url !== want(v, next)) continue;
        count++;
        elidedTokens += countTokens(' ' + url, enc);
        const start = defs[i].index! + `[${v}]:`.length;
        cut.push([start, start + 1 + url.length]);
      }
      if (!count) return null;
      let out = '', pos = 0;
      for (const [a, b] of cut) { out += text.slice(pos, a); pos = b; }
      out += text.slice(pos);
      // the stem is one dictionary glyph in the plain arm; what the line really saves is the tag pair
      const estimate = count * Math.max(1, countTokens(`${p.prefix}0.33.0...${p.prefix}0.34.0`, enc) - 2);
      return { text: out, count, distinct: count, elidedTokens, estimate };
    },
    unfold(text) {
      // forward pass needs the NEXT definition's V, so walk the lines backwards
      const lines = text.split('\n');
      let nextV: string | null = null;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let m = /^\[([^\]\n]+)\]:$/.exec(line);
        if (m) {
          if (nextV !== null) lines[i] = `[${m[1]}]: ${want(m[1], nextV)}`;
          nextV = m[1];
          continue;
        }
        m = /^\[([^\]\n]+)\]: (\S+)$/.exec(line);
        if (m) nextV = m[1];
      }
      return lines.join('\n');
    },
  };
}

const releaseSchema: Schema = {
  id: 'release-links',
  instantiate(text) {
    const defs = [...text.matchAll(LINKDEF_RE)];
    const votes = new Map<string, number>();
    for (let i = 0; i + 1 < defs.length; i++) {
      const [, v, url] = defs[i];
      const next = defs[i + 1][1];
      // url must end with `<prefix>next...<prefix>v` for the same prefix; the stem is what precedes
      for (const prefix of ['v', '', 'V', 'release-', 'r']) {
        const tail = `${prefix}${next}...${prefix}${v}`;
        if (url.endsWith(tail) && url.length > tail.length) {
          const stem = url.slice(0, url.length - tail.length);
          if (!/[/=]$/.test(stem)) continue;
          const k = JSON.stringify([stem, prefix]);
          votes.set(k, (votes.get(k) || 0) + 1);
          break;
        }
      }
    }
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < 3) return null;
    const [stem, prefix] = JSON.parse(best[0]) as [string, string];
    return releaseInstance({ stem, prefix });
  },
  parse(clause) {
    const m = /^Release links: "\[V\]:" alone on a line = "\[V\]: (.*?)P\.\.\.(\S*?)V", P = the V of the next "\[P\]:" line\.$/.exec(clause);
    if (!m) return null;
    // m[1] = stem + prefix, m[2] = prefix
    const prefix = m[2];
    if (!m[1].endsWith(prefix)) return null;
    return releaseInstance({ stem: m[1].slice(0, m[1].length - prefix.length), prefix });
  },
};

export const EPAGOGE_SCHEMAS: readonly Schema[] = [framesSchema, anchorsSchema, releaseSchema];

/* ---------------------------------------------------------------------------
 * 2. ENCODER
 * ------------------------------------------------------------------------- */

export interface EpagogeResult extends DaedalusResult {
  codec2: 'epagoge';
  applied: boolean;
  schemas: Instance['schema'][];
  params: string[];
  elided: number;
  elidedTokens: number;
  clauseTokens: number;
  plainMessageTokens: number;
}

export interface EpagogeOptions extends DaedalusOptions {
  schemas?: Instance['schema'][];
  guardBelow?: number;
  minRuleSaving?: number;
}

function plainResult(plain: DaedalusResult, started: number, note: string): EpagogeResult {
  return {
    ...plain, codec2: 'epagoge', applied: false, schemas: [], params: [], elided: 0, elidedTokens: 0, clauseTokens: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `epagoge: not applied (${note}); ${plain.notes}`,
  };
}

/** The sentence line: several instantiated sentences joined by a space. */
export function splitClauses(clauseLine: string): string[] {
  // sentences end with `.` followed by a space and a capitalised schema name
  return clauseLine.split(/(?<=\.) (?=(?:Stack frames|Links|Release links):)/);
}

export function epagogeEncode(text: string, enc: EncodingName = 'o200k_base', options: EpagogeOptions = {}): EpagogeResult {
  const started = Date.now();
  const { schemas = ['frames', 'anchors', 'release-links'], guardBelow = Infinity, minRuleSaving = 12, ...dopts } = options;
  const inTokens = countTokens(text, enc);
  if (text.startsWith(EPAGOGE_MARK)) return plainResult(daedalusEncode(text, enc, dopts), started, 'payload starts with the rule mark');

  let reduced = text;
  const used: Instance[] = [];
  let elided = 0, elidedTokens = 0, estimate = 0;
  for (const schema of EPAGOGE_SCHEMAS) {
    if (!schemas.includes(schema.id)) continue;
    const inst = schema.instantiate(reduced, enc);
    if (!inst) continue;
    const f = inst.fold(reduced, enc);
    if (!f || f.estimate < minRuleSaving) continue;
    if (inst.unfold(f.text) !== reduced) continue; // the instance's own round trip must be exact on this text
    if (schema.parse(inst.clause)?.clause !== inst.clause) continue; // the sentence must carry its parameters
    reduced = f.text; used.push(inst);
    elided += f.count; elidedTokens += f.elidedTokens; estimate += f.estimate;
  }
  if (!used.length) return plainResult(daedalusEncode(text, enc, dopts), started, 'no entailed field found');

  const clause = EPAGOGE_MARK + used.map(r => r.clause).join(' ');
  const clauseTokens = countTokens(clause + '\n', enc);
  const saving = estimate - clauseTokens;
  if (saving <= 0) return plainResult(daedalusEncode(text, enc, dopts), started, `predicted saving ${estimate} does not repay the sentence (${clauseTokens})`);

  const inner = daedalusEncode(reduced, enc, dopts);
  const wire = clause + '\n' + inner.wire;
  const decoderPrompt = clause + '\n' + inner.decoderPrompt;
  const decoded = epagogeDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);
  // The plain arm always runs by default (guardBelow = Infinity): the prediction is a pre-filter, not a proof — a
  // dictionary that already folds whole repeated frames can turn the sentence into a net loss (curbox_446, −20 under
  // the skipped arm). Callers who prefer speed may lower guardBelow to skip the arm on large predicted savings.
  const plain = !exact || saving < guardBelow ? daedalusEncode(text, enc, dopts) : null;
  if (!exact || (plain && messageTokens >= plain.messageTokens)) {
    return plainResult(plain!, started, !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain!.messageTokens}`);
  }
  return {
    ...inner, codec2: 'epagoge', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + clauseTokens, decoderPrompt,
    savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    applied: true, schemas: used.map(r => r.schema), params: used.map(r => r.params), elided, elidedTokens, clauseTokens,
    plainMessageTokens: plain ? plain.messageTokens : inTokens, ms: Date.now() - started,
    notes: `epagoge: ${used.map(r => `${r.schema}[${r.params}]`).join('+')} elided ${elided} field(s) (${elidedTokens} raw tok, predicted −${estimate}) + sentence ${clauseTokens} tok; M ${messageTokens}${plain ? ` vs plain ${plain.messageTokens}` : ' (plain run skipped: clear win)'}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 3. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

function splitWire(wire: string): { clause: string; inner: string } | null {
  if (!wire.startsWith(EPAGOGE_MARK)) return null;
  const k = wire.indexOf('\n');
  return { clause: k < 0 ? wire : wire.slice(0, k), inner: k < 0 ? '' : wire.slice(k + 1) };
}

/** instances named by a wire's first line, in the order they were applied */
export function instancesOf(clauseLine: string): Instance[] {
  const out: Instance[] = [];
  for (const c of splitClauses(clauseLine.slice(EPAGOGE_MARK.length))) {
    for (const s of EPAGOGE_SCHEMAS) { const inst = s.parse(c); if (inst) { out.push(inst); break; } }
  }
  return out;
}

export function epagogeDecode(wire: string): string {
  const s = splitWire(wire);
  if (!s) return daedalusDecode(wire);
  let text = daedalusDecode(s.inner);
  for (const inst of instancesOf(s.clause).reverse()) text = inst.unfold(text);
  return text;
}

export function epagogeDecoderPrompt(wire: string): string {
  const s = splitWire(wire);
  const innerPrompt = (inner: string) => daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  if (!s) return innerPrompt(wire);
  return s.clause + '\n' + innerPrompt(s.inner);
}
