/**
 * src/lib/omega/logtpl.ts
 * =============================================================================
 * LOGTPL — exact line-template folding for tabular/log text (Drain-style templates, byte-perfect).
 *
 * Each line is split into whitespace-preserving tokens. A token that contains a digit (and no
 * whitespace) is a VARIABLE and is replaced by the placeholder PH in the line's template.
 * Output:
 *   T<i>\t<template>            one line per distinct template, in first-seen order
 *   @                           separator line
 *   <i>\t<v1>\t<v2>...          one line per input line: template id, then the variables in order
 *   R\t<line>                   a line that contains TAB or PH is carried raw (never folded)
 * Inverse: split the template section, read each body line, and substitute the variables back into
 * the template. Exact for every input (checked by the encoder before any output is emitted).
 * =============================================================================
 */

export const LOGTPL_PH = '\u0001';

export function logTplFold(text: string): string {
  const tpls = new Map<string, number>();
  const tplOrder: string[] = [];
  const body: string[] = [];
  for (const line of text.split('\n')) {
    if (line.includes('\t') || line.includes(LOGTPL_PH)) { body.push('R\t' + line); continue; }
    const vals: string[] = [];
    const tpl = line.split(/(\s+)/).map((t) => (t.length > 0 && /\d/.test(t) && !/\s/.test(t) ? (vals.push(t), LOGTPL_PH) : t)).join('');
    let id = tpls.get(tpl);
    if (id === undefined) { id = tplOrder.length; tpls.set(tpl, id); tplOrder.push(tpl); }
    body.push([String(id), ...vals].join('\t'));
  }
  return tplOrder.map((t, i) => 'T' + i + '\t' + t).join('\n') + '\n@\n' + body.join('\n');
}

export function logTplUnfold(s: string): string {
  const at = s.indexOf('\n@\n');
  if (at < 0) throw new Error('logtpl: separator missing');
  const tpls = s.slice(0, at).split('\n').map((l) => l.slice(l.indexOf('\t') + 1));
  const body = s.slice(at + 3).split('\n');
  return body.map((l) => {
    if (l.startsWith('R\t')) return l.slice(2);
    const cells = l.split('\t');
    const tpl = tpls[Number(cells[0])];
    let k = 1;
    return tpl.split(LOGTPL_PH).map((seg, i) => (i === 0 ? seg : cells[k++] + seg)).join('');
  }).join('\n');
}
