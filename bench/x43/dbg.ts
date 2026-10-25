import * as fs from 'node:fs';
import { diastemaPlan, diastemaWire, diastemaDecode, diastemaTokens, diastemaRender, diastemaPattern, DIASTEMA_OPEN } from '@/lib/omega/diastema';
const t = fs.readFileSync('bench/holdout-ops/openstack-loghub-26.log', 'utf8');
const plan: any = diastemaPlan(t, 'o200k_base' as any)!;
const wire = diastemaWire(plan, t)!;
const nl = wire.indexOf('\n');
const head = wire.slice(0, nl);
console.log('head:', JSON.stringify(head));
const d = head[1];
const f = head.slice(2).split(d);
console.log('fields:', f.length, f.map((x: string) => x.slice(0, 40)));
const [mask, ordS, eol, patR] = f as any;
console.log('mask ok', /^#+([^#]+#+)*$/.test(mask), 'ord', ordS, 'eol', eol, 'pat', patR);
const pat = diastemaPattern(patR);
console.log('pat len', pat?.length, 'body lines', wire.slice(nl + 1).split('\n').length);
const bl = wire.slice(nl + 1).split('\n');
let v = 0n;
for (let i = 0; i < (pat!.length); i++) {
  if (pat![i] === 'L') continue;
  const ts = diastemaTokens(bl[i]);
  if (ts.length <= Number(ordS)) { console.log('row', i, 'too few tokens', ts.length); break; }
  const tok = ts[Number(ordS)];
  const neg = tok.s[0] === '-';
  const dg = neg ? tok.s.slice(1) : tok.s;
  if (!/^\d+$/.test(dg)) { console.log('row', i, 'bad token', JSON.stringify(tok.s)); break; }
  v = neg ? v - BigInt(dg) : v + BigInt(dg);
  const r = diastemaRender(mask, v);
  if (r === null) { console.log('row', i, 'render null for', v.toString(), 'mask', mask); break; }
}
