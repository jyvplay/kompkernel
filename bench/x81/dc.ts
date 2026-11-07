import * as fs from 'node:fs';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const P: [string, RegExp][] = [
  ['iso-dt', /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/g],
  ['iso-day', /\d{4}-\d{2}-\d{2}/g],
  ['ls-time', new RegExp(`\\b(${MON})\\s+\\d{1,2}\\s+\\d{2}:\\d{2}\\b`, 'g')],
  ['ls-year', new RegExp(`\\b(${MON})\\s+\\d{1,2}\\s+\\d{4}\\b`, 'g')],
  ['rfc2822', new RegExp(`\\d{1,2}\\s+(${MON})\\s+\\d{4}\\s+\\d{2}:\\d{2}(:\\d{2})?`, 'g')],
  ['clock', /\b\d{2}:\d{2}:\d{2}\b/g],
  ['hhmm', /\b\d{2}:\d{2}\b/g],
];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const parts = P.map(([n, re]) => { const m = S.match(re); return m ? `${n}=${m.length}` : null; }).filter(Boolean);
  if (parts.length) console.log(p.split('/').pop()!.padEnd(22), parts.join(' '));
}
