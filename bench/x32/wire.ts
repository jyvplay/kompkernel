import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const T = `The quarterly review arrived later than anyone expected, and by the time it reached the operations team the numbers it contained had already been superseded twice. Mara read it twice anyway, the way she read everything, and then she set it down on the corner of her desk and looked out at the parking lot.

Two things were true at once. The infrastructure spend had come in under budget for the third consecutive quarter, which the summary presented as a win. The support backlog had grown by roughly the same absolute amount, which the summary did not present as anything at all.

She wrote a note to herself: ask whether the two facts were the same fact.

By Thursday she had her answer, and it was not the one she wanted. The savings had come almost entirely from deferring a migration that the platform group had scheduled for the spring. Deferring it had not cost anything yet. It was going to cost a great deal in the autumn, and the review, which ran to forty-one pages, did not say so anywhere.`;
const r:any = heuresisEncode(T, enc);
console.log('=== RAW chars', T.length, 'tokens', countTokens(T,enc));
console.log('=== WINNER', r.winner, 'rules', r.rules, 'parent', r.parent);
console.log('=== CONTRACT tokens', r.messageTokens - r.wireTokens);
console.log('--- CONTRACT ---');
console.log(r.contract);
console.log('--- WIRE (first 1400 chars) ---');
console.log(r.wire.slice(0,1400));
console.log('--- WIRE tail (600) ---');
console.log(r.wire.slice(-600));
console.log('=== WIRE tokens', r.wireTokens, 'MESSAGE tokens', r.messageTokens);
const dec = symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo: (w:string)=>chironDecode(w) });
console.log('=== EXACT', dec === T);
