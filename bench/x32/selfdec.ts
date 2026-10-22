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
2026-10-19T09:14:08.006Z INFO  worker-07 heartbeat ok latency=41ms queue=14
2026-10-19T09:14:09.588Z ERROR worker-03 retry attempt 4 target=shard-3 reason=refused
2026-10-19T09:14:10.271Z INFO  worker-07 heartbeat ok latency=38ms queue=12
`;
const r:any=heuresisEncode(T,enc);
const dec=symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)});
console.log('RAW tokens', countTokens(T,enc), '| msg', r.messageTokens, '| wire', r.wireTokens, '| rules', r.rules, '| EXACT', dec===T);
console.log('\n===== ORIGINAL TEXT (for reference) =====');
console.log(T);
console.log('===== WIRE (the part after the contract) =====');
console.log(JSON.stringify(r.wire));
console.log('\n===== CONTRACT VARIANTS =====');
const P='¶';
const variants: Array<[string,string]> = [
 ['V0 current (17)',  `Letters before ${P} name the phrases after them. Then expand repeatedly; print result only.`],
 ['V1 k=v (13)',      `Before ${P} k=v. Then expand repeatedly; print result only.`],
 ['V2 k=v short (12)',`Before ${P} k=v. Then expand; print result only.`],
 ['V3 no-anchor (7)', `expand repeatedly; print result only.`],
];
for (const [n,c] of variants) console.log(n, '=>', countTokens(c,enc), JSON.stringify(c));
