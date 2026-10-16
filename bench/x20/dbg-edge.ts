import { typosEncode, typosPlans } from '@/lib/omega/typos';
function dates(n: number): string {
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(2024, 0, 5 + i * 3)).toISOString().slice(0, 10)).join(' ');
}
function prices(n: number): string {
  return Array.from({ length: n }, (_, i) => `${10 + i}.${String(100000 + i * 6151).slice(0, 6)}`).join(' ');
}
function times(n: number): string {
  return Array.from({ length: n }, (_, i) => `${String((i * 3) % 24).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`).join(' and ');
}
const cases: Array<[string, string]> = [
  ['dates', `report:\n${dates(30)}`],
  ['prices', `close\n${prices(30)}`],
  ['times', `log\n${times(30)}`],
];
for (const [n, t] of cases) {
  const plans = typosPlans(t);
  const r = typosEncode(t);
  console.log(n, '| plans:', plans.map(p => `${p.mode}:${p.est}`).join(' ') || 'none', '| base', r.baseTokens.o200k_base, '-> M', r.messageTokens.o200k_base, '|', r.notes.slice(0, 150));
}
