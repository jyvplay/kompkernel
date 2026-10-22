import { codecEntries } from '@/lib/omega/registry';
const c:any = codecEntries().find((x:any)=>x.key==='oikonomia');
console.log('registry key:', c.key, '| family:', c.family, '| fidelity:', c.fidelity);
console.log('label starts:', c.label.slice(0,58));
const t = '2026-10-19T09:14:07Z INFO  worker-07 heartbeat ok latency=12ms\n'.repeat(6);
const r:any = await c.run(t, 'o200k_base');
console.log('oneChat:', r.oneChat, '| byte-exact:', r.decoded === t);
console.log('note:', r.note);
