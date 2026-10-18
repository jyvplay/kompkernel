import { codecEntries } from '@/lib/omega/registry';
const e = codecEntries().find((c: any) => c.key === 'metathesis');
if (!e) { console.log('METATHESIS NOT REGISTERED'); process.exit(1); }
const t = 'Deploy 2026-08-14 at 00:02:05 to 192.168.1.1 (build 1.2.3).\n';
const r = await e.run(t, 'o200k_base' as any);
console.log('registered, key =', e.key);
console.log('exact  :', r.decoded === t);
console.log('oneChat:', r.oneChat);
console.log('note   :', r.note);
