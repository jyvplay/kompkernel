import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const T = `2026-10-19T09:14:02.118Z INFO  worker-07 heartbeat ok latency=42ms queue=13
2026-10-19T09:14:03.204Z WARN  worker-07 retry attempt 2 target=shard-3 reason=timeout
2026-10-19T09:14:04.771Z INFO  worker-07 heartbeat ok latency=39ms queue=11
2026-10-19T09:14:05.330Z ERROR worker-03 retry attempt 3 target=shard-3 reason=refused
2026-10-19T09:14:06.902Z INFO  worker-07 heartbeat ok latency=45ms queue=09
2026-10-19T09:14:07.415Z WARN  worker-03 retry attempt 1 target=shard-7 reason=timeout
`;
const r:any=heuresisEncode(T,enc);
const dec=symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)});
console.log('RAW',countTokens(T,enc),'msg',r.messageTokens,'rules',r.rules,'EXACT',dec===T);
console.log('=== ORIGINAL ==='); console.log(T);
console.log('=== WIRE escaped ==='); console.log(JSON.stringify(r.wire));
const P='¶';
console.log('\n=== FULL MESSAGE, contract V1 ===');
console.log(`Before ${P} k=v. Then expand repeatedly; print result only.`);
console.log(r.wire);
console.log('=== END MESSAGE ===');
