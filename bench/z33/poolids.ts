// Z33: token IDs of the alias pool keys (measurement only).
import { aliasPool } from '@/lib/omega/veritas-a';
import { tokenStrings } from '@/lib/omega/bpe';
const pool = aliasPool('o200k_base').slice(0, 240);
const ids = pool.map((ch) => tokenStrings(ch, 'o200k_base')[0]?.id ?? -1);
const sorted = [...ids].sort((a, b) => a - b);
console.log('pool size', pool.length, 'min id', sorted[0], 'median', sorted[Math.floor(sorted.length / 2)], 'max', sorted[sorted.length - 1]);
console.log('sample', pool.slice(0, 12).map((c, i) => `${c}:${ids[i]}`).join(' '));
