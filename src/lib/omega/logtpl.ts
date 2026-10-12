/**
 * src/lib/omega/logtpl.ts
 * =============================================================================
 * LOGTPL — exact line-template folding for tabular/log text (Drain-style templates, byte-perfect).
 *
 * Each line is split into whitespace-preserving tokens. A token that contains a digit (and no whitespace)
 * is a VARIABLE and is replaced in the line's template by the placeholder PH, a VISIBLE character chosen
 * so that it does not occur in the input (the codec picks the first candidate absent from the text).
 * Output:
 *   T<i>\t<template>            one line per distinct template, in first-seen order
 *   @                           section separator line
 *   <i>\t<v1>\t<v2>...          one line per input line: template id, then the variables in order
 *   R\t<line>                   a line that contains TAB or PH is carried raw (never folded)
 * Inverse: read each row, substitute its variables into its template, in order. Exact for every input
 * (the encoder verifies the inverse before emitting anything).
 * =============================================================================
 */

export const LOGTPL_PH_CANDIDATES = ['¤', '§', '¦', '»', '◊', '•', '∎', '¬'];

/** First candidate placeholder absent from the text, or null if all candidates occur in it. */
export function logTplPickPh(text: string): string | null {
  for (const c of LOGTPL_PH_CANDIDATES) if (!text.includes(c)) return c;
  return null;
}

export function logTplFold(text: string, ph: string): string {
  const tpls = new Map<string, number>();
  const tplOrder: string[] = [];
  const body: string[] = [];
  for (const line of text.split('\n')) {
    if (line.includes('\t') || line.includes(ph)) { body.push('R\t' + line); continue; }
    const vals: string[] = [];
    const tpl = line.split(/(\s+)/).map((t) => (t.length > 0 && /\d/.test(t) && !/\s/.test(t) ? (vals.push(t), ph) : t)).join('');
    let id = tpls.get(tpl);
    if (id === undefined) { id = tplOrder.length; tpls.set(tpl, id); tplOrder.push(tpl); }
    body.push([String(id), ...vals].join('\t'));
  }
  return tplOrder.map((t, i) => 'T' + i + '\t' + t).join('\n') + '\n@\n' + body.join('\n');
}

export function logTplUnfold(s: string, ph: string): string {
  const at = s.indexOf('\n@\n');
  if (at < 0) throw new Error('logtpl: separator missing');
  const tpls = s.slice(0, at).split('\n').map((l) => l.slice(l.indexOf('\t') + 1));
  const body = s.slice(at + 3).split('\n');
  return body.map((l) => {
    if (l.startsWith('R\t')) return l.slice(2);
    const cells = l.split('\t');
    const tpl = tpls[Number(cells[0])];
    let k = 1;
    return tpl.split(ph).map((seg, i) => (i === 0 ? seg : cells[k++] + seg)).join('');
  }).join('\n');
}
