import { proteusEncode } from '../src/lib/omega/proteus';
const cfg = Array.from({length:6},(_,i)=>`[server_${i}]\nhost=10.0.0.${i}\nport=8080\ntimeout=30\nretries=3\ntls=true`).join('\n\n');
const r:any=proteusEncode(cfg,'o200k_base');
console.log('KEYS:',Object.keys(r));
console.log('WIRE(first 400):\n', String(r.wire||r.output||'').slice(0,400));
