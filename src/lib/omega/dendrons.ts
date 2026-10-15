/**
 * src/lib/omega/dendrons.ts
 * =============================================================================
 * ΔΕΝΔΡΟΝ-Σ (DENDRON-S) — the brace tree on ANY separator, with verbatim lines
 * (byte-perfect, exact-lossless, single-chat-readable, contract in band)
 * -----------------------------------------------------------------------------
 * DENDRON (dendron.ts) factors a list of paths. It splits each line at the
 * first '/', so it cannot see the shared prefix of a dotted identifier list:
 *
 *     net.ipv4.conf.all.arp_filter = 0
 *     net.ipv4.conf.all.arp_ignore = 0
 *     net.ipv4.conf.default.arp_filter = 0
 *
 * is written in full by the frontier, one prefix glyph per line. DENDRON-S
 * splits at the separator that factors best ('.' or '/' — the encoder measures
 * both), and writes the shared head once per group:
 *
 *     net.ipv4.conf.{all.arp_filter = 0,all.arp_ignore = 0,default.arp_filter = 0}
 *
 * The reader needs no knowledge of the separator. It expands bash brace
 * expressions, which is the same rule DENDRON already uses. Only the encoder
 * chooses the separator.
 *
 * WHAT IS NEW OVER DENDRON (the mechanism, not a rename)
 * -----------------------------------------------------------------------------
 *   1. Separator choice by measurement. The factoring unit is decided per
 *      payload by one-chat M, so dotted identifiers (sysctl, config keys,
 *      Java/Python dotted names, reverse-DNS) become eligible, not only paths.
 *   2. Verbatim lines inside the tree. A line that contains { } , — or starts
 *      with ! — is written as "!" + line and is copied through unchanged. A
 *      tree no longer has to be refused when a few lines carry braces or
 *      commas (DENDRON refused the whole list). The "!" marker is unambiguous
 *      because no tree line can start with "!": a tree line begins with the
 *      first segment of an eligible line, and eligible lines never start with
 *      "!".
 *   3. A verbatim run breaks the tree, so a group never straddles a literal
 *      line, and the reader never has to guess a group's extent.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   DENS_RULE (the contract, one sentence; it is also the dispatch key)
 *   rest     the DAEDALUS wire of the tree text (its own contract follows it)
 * Or the plain DAEDALUS wire (frontier), when it is cheaper or the tree arm
 * fails its round trip. A payload whose plain wire would carry a dispatch line
 * is sent with DENS_ESCAPE first.
 *
 * EXACTNESS
 *   The encoder checks (a) the tree expands back to the input, then (b) the full
 *   composed decode: chironDecode → verbatim/expand per line. Any mismatch
 *   returns the frontier. The tree arm is taken only when its M is strictly
 *   smaller. Byte-exactness is machine-checked in this file, not assumed.
 * =============================================================================
 */

import { now } from './clock';
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { daedalusEncode, type DaedalusOptions } from './daedalus';

/** Line 1 of a tree wire with no verbatim lines: the contract and the dispatch key. */
export const DENS_RULE = '∴ lines: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one line per result.';
/** Line 1 of a tree wire that carries verbatim lines ("!" prefix). Only paid when used. */
export const DENS_RULE_V = DENS_RULE + ' A line starting with ! is literal: drop that !, keep the rest.';
/** Line 1 when the payload's plain wire would itself dispatch as DENS_RULE / DENS_RULE_V. */
export const DENS_ESCAPE = '∴ lines: literal payload follows';

/** Separators the encoder may factor on, in tie-break order. */
export const DENS_SEPARATORS = ['.', '/'] as const;

/* ---------------------------------------------------------------------------
 * 1. Tree builder (encoder side).
 *    Consecutive lines of one run that share their first segment (up to and
 *    including the first `sep`) form one group. A one-item group is bare.
 * ------------------------------------------------------------------------- */
export function densTree(lines: string[], sep: string): string[] {
  const rec = (xs: string[]): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < xs.length) {
      const k = xs[i].indexOf(sep);
      if (k < 0) { out.push(xs[i]); i++; continue; }
      const head = xs[i].slice(0, k + 1);
      let j = i + 1;
      while (j < xs.length && xs[j].startsWith(head)) j++;
      if (j - i < 2) { out.push(xs[i]); i++; continue; }
      const items = rec(xs.slice(i, j).map(x => x.slice(head.length)));
      out.push(items.length === 1 ? head + items[0] : head + '{' + items.join(',') + '}');
      i = j;
    }
    return out;
  };
  return rec(lines);
}

/** A line must be written verbatim (escaped with "!") if it starts with "!" or holds a brace/comma. */
export function densNeedsVerbatim(line: string): boolean {
  return line.startsWith('!') || /[{},]/.test(line);
}

/** The wire lines for a payload: verbatim lines as "!"+line, eligible runs as trees on `sep`. */
export function densWireLines(text: string, sep: string): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => { if (run.length) { out.push(...densTree(run, sep)); run = []; } };
  for (const l of text.split('\n')) {
    if (densNeedsVerbatim(l)) { flush(); out.push('!' + l); } else run.push(l);
  }
  flush();
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. Expander (reader side). Same brace grammar as DENDRON; left-to-right.
 * ------------------------------------------------------------------------- */
function expandSeq(s: string, st: { p: number }): string[] {
  let acc: string[] = [''];
  while (st.p < s.length && s[st.p] !== ',' && s[st.p] !== '}') {
    if (s[st.p] === '{') {
      st.p++;
      const alts: string[] = [];
      for (;;) {
        alts.push(...expandSeq(s, st));
        if (st.p >= s.length) throw new Error('dendrons: unterminated {');
        if (s[st.p] === ',') { st.p++; continue; }
        st.p++; // '}'
        break;
      }
      const next: string[] = [];
      for (const a of acc) for (const b of alts) next.push(a + b);
      acc = next;
    } else {
      const c = s[st.p++];
      acc = acc.map(a => a + c);
    }
  }
  return acc;
}

/** Expand one wire line. A "!" line is verbatim; anything else is a brace expression. */
export function densExpandLine(line: string): string[] {
  if (line.startsWith('!')) return [line.slice(1)];
  const st = { p: 0 };
  const out = expandSeq(line, st);
  if (st.p !== line.length) throw new Error('dendrons: stray } or , at top level');
  return out;
}

/** Expand a whole tree text (lines in order, joined with \n). */
export function densExpand(treeText: string): string {
  return treeText.split('\n').flatMap(densExpandLine).join('\n');
}

/* ---------------------------------------------------------------------------
 * 3. Decoder. Dispatch on line 1, then the DAEDALUS decoder, then the expander.
 * ------------------------------------------------------------------------- */
export function densDecode(wire: string): string {
  const nl = wire.indexOf('\n');
  const first = nl < 0 ? wire : wire.slice(0, nl);
  const rest = nl < 0 ? '' : wire.slice(nl + 1);
  if (first === DENS_RULE || first === DENS_RULE_V) return densExpand(chironDecode(rest));
  if (first === DENS_ESCAPE) return chironDecode(rest);
  return chironDecode(wire);
}

/* ---------------------------------------------------------------------------
 * 4. Encoder. The frontier arm (plain DAEDALUS) and one tree arm per separator.
 *    A tree arm is kept only when its one-chat M is strictly smaller AND the
 *    composed decode reproduces the input byte for byte.
 * ------------------------------------------------------------------------- */
export interface DensResult {
  codec: 'dendrons';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  /** true when a tree arm was used */
  applied: boolean;
  /** separator of the chosen tree arm ('' when the frontier was chosen) */
  sep: string;
  /** M of the frontier arm (plain DAEDALUS) */
  frontierM: number;
  /** M of each tree arm that was computed, keyed by separator */
  treeM: Record<string, number>;
  treeLines: number;
  notes: string;
  ms: number;
}

export function densEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): DensResult {
  const started = now();
  const plain = daedalusEncode(text, enc, options);
  const frontierM = plain.messageTokens;
  const treeM: Record<string, number> = {};
  const base = (over: Partial<DensResult>): DensResult => ({
    codec: 'dendrons', wire: plain.wire, decoded: text, exact: true,
    inTokens: plain.inTokens, outTokens: plain.outTokens, messageTokens: frontierM,
    contractTokens: plain.contractTokens, decoderPrompt: plain.decoderPrompt,
    applied: false, sep: '', frontierM, treeM, treeLines: 0, notes: '', ms: now() - started, ...over,
  });

  // The plain arm must dispatch to itself; a payload whose wire starts with a dispatch line is escaped.
  const plainFirst = plain.wire.split('\n')[0];
  if (plainFirst === DENS_RULE || plainFirst === DENS_RULE_V || plainFirst === DENS_ESCAPE || denSafePlain(plain.wire, text) === false) {
    const wire = DENS_ESCAPE + '\n' + plain.wire;
    const prompt = DENS_ESCAPE + '\n' + plain.decoderPrompt;
    const M = countTokens(prompt, enc);
    return base({
      wire, decoderPrompt: prompt, messageTokens: M, contractTokens: M - countTokens(wire, enc),
      outTokens: countTokens(wire, enc), exact: densDecode(wire) === text, treeM,
      notes: 'escape: plain wire carries a dispatch line (or the plain arm did not dispatch)',
    });
  }

  let best: DensResult | null = null;
  let bestNote = '';
  let treeLinesBest = 0;
  for (const sep of DENS_SEPARATORS) {
    const wl = densWireLines(text, sep);
    const treeText = wl.join('\n');
    // Only a tree that actually groups something can beat the frontier.
    if (densExpand(treeText) !== text) { bestNote += ` ${sep}:refused(expand)`; continue; }
    const td = daedalusEncode(treeText, enc, options);
    const rule = wl.some(l => l.startsWith('!')) ? DENS_RULE_V : DENS_RULE;
    const wire = rule + '\n' + td.wire;
    const prompt = rule + '\n' + td.decoderPrompt;
    const M = countTokens(prompt, enc);
    treeM[sep] = M;
    const exact = densDecode(wire) === text;
    if (!exact) { bestNote += ` ${sep}:refused(round-trip)`; continue; }
    if (M < frontierM && (!best || M < best.messageTokens)) {
      treeLinesBest = wl.length;
      best = {
        codec: 'dendrons', wire, decoded: text, exact: true,
        inTokens: plain.inTokens, outTokens: countTokens(wire, enc), messageTokens: M,
        contractTokens: M - countTokens(wire, enc), decoderPrompt: prompt,
        applied: true, sep, frontierM, treeM, treeLines: wl.length,
        notes: '', ms: now() - started,
      };
    }
  }
  if (best) {
    best.treeM = treeM;
    best.notes = `tree arm sep=${JSON.stringify(best.sep)}: ${treeLinesBest} wire lines; M ${best.messageTokens} vs frontier ${frontierM} (${best.messageTokens - frontierM})`;
    best.ms = now() - started;
    return best;
  }
  return base({ treeLines: 0, notes: `frontier wins:${bestNote || ' no separator produced a cheaper tree'} (frontier ${frontierM})` });
}

/** The plain DAEDALUS wire must decode to the input through the dispatcher (it cannot carry a dispatch line). */
function denSafePlain(plainWire: string, text: string): boolean {
  try { return densDecode(plainWire) === text; } catch { return false; }
}
