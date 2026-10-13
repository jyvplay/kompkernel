// Z40 probe: line-template factoring (Drain-style two-pass clustering). Measures o200k tokens of a template wire.
// Not a codec yet: no decoder, no exactness claim here. Exactness is checked separately.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const SEP = '|';
function templatize(text: string, minMembers = 2, minAgree = 0.5) {
  const lines = text.split('\n');
  type T = { n: number; f: (string | null)[]; members: number[] };
  const ts: T[] = [];
  const fields = lines.map((l) => l.split(' '));
  const assign: number[] = new Array(lines.length).fill(-1);
  for (let i = 0; i < lines.length; i++) {
    const fs_ = fields[i];
    const n = fs_.length;
    let best = -1, bestSim = 0;
    for (let k = 0; k < ts.length; k++) {
      const t = ts[k];
      if (t.n !== n) continue;
      let eq = 0;
      for (let j = 0; j < n; j++) if (t.f[j] !== null && t.f[j] === fs_[j]) eq++;
      const sim = eq / n;
      if (sim >= minAgree && sim > bestSim) { bestSim = sim; best = k; }
    }
    if (best < 0) { ts.push({ n, f: fs_.slice(), members: [i] }); assign[i] = ts.length - 1; }
    else {
      const t = ts[best];
      for (let j = 0; j < n; j++) if (t.f[j] !== fs_[j]) t.f[j] = null;
      t.members.push(i); assign[i] = best;
    }
  }
  // Emit: templates with >= minMembers; others literal. Slot values appended with SEP.
  const defs: string[] = []; const body: string[] = [];
  const map = new Map<number, number>();
  ts.forEach((t, k) => { if (t.members.length >= minMembers) { map.set(k, defs.length); defs.push(t.f.map((v) => (v === null ? '*' : v)).join(' ')); } });
  for (let i = 0; i < lines.length; i++) {
    const k = assign[i]; const id = map.get(k);
    if (id === undefined) { body.push(lines[i]); continue; }
    const t = ts[k];
    const vals: string[] = [];
    for (let j = 0; j < t.n; j++) if (t.f[j] === null) vals.push(fields[i][j]);
    body.push(`@${id}${vals.length ? SEP + vals.join(SEP) : ''}`);
  }
  const wire = `DEFS\n${defs.join('\n')}\nBODY\n${body.join('\n')}`;
  return { wire, defs: defs.length, covered: [...map.keys()].reduce((a, k) => a + ts[k].members.length, 0), lines: lines.length };
}
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = templatize(t);
  const raw = countTokens(t, 'o200k_base');
  const w = countTokens(r.wire, 'o200k_base');
  console.log(JSON.stringify({ f: f.split('/').slice(-2).join('/'), raw, tplWire: w, defs: r.defs, coveredLines: r.covered, lines: r.lines }));
}
