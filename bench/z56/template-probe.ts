// z56: TEMPLATE-SLOT probe (gross). Lines are split on single spaces. A token containing a digit is a slot.
// Lines whose constant skeleton (slots replaced by a mark) recurs >= 2 times get a template id.
// Wire: header "Tk=<skeleton>" lines, then per line "Tk v1 v2 ...". Lines without a repeated skeleton stay raw.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const SLOT = '\u2588'; // full block; checked absent from input
export function templateWire(text: string): { wire: string; templates: number; templated: number } {
  const lines = text.split('\n');
  const skel = lines.map(l => l.split(' ').map(t => (/[0-9]/.test(t) ? SLOT : t)).join(' '));
  const cnt = new Map<string, number>();
  for (const s of skel) cnt.set(s, (cnt.get(s) ?? 0) + 1);
  const ids = new Map<string, string>();
  const defs: string[] = [];
  const body: string[] = [];
  let templated = 0;
  for (let i = 0; i < lines.length; i++) {
    const s = skel[i];
    if ((cnt.get(s) ?? 0) >= 2 && s.includes(SLOT)) {
      if (!ids.has(s)) { ids.set(s, 'T' + (ids.size + 1)); defs.push(ids.get(s) + ' ' + s); }
      const vals = lines[i].split(' ').filter(t => /[0-9]/.test(t));
      body.push(ids.get(s) + ' ' + vals.join(' ')); templated++;
    } else body.push(lines[i]);
  }
  return { wire: defs.join('\n') + '\n' + body.join('\n'), templates: ids.size, templated };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes('\u2588')) { console.log(JSON.stringify({ lane: f, skip: 'slot char in input' })); continue; }
  const w = templateWire(t);
  const m0 = daedalusEncode(t, 'o200k_base').messageTokens;
  const m1 = daedalusEncode(w.wire, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), lines: t.split('\n').length, templates: w.templates, templated: w.templated, plain: m0, template: m1, gross: m1 - m0 }));
}
