import { CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
import { scriptPool } from '../../src/lib/omega/ariadne';
const enc = 'o200k_base' as const;
for (const s of CHIRON_SCRIPTS) {
  const p = scriptPool(s, enc) as any;
  const chars: string[] = p.chars ?? [];
  const pairs: Set<string> = p.pairs ?? new Set();
  let deg = 0;
  if (p.degree) for (const v of (p.degree as Map<string, number>).values()) deg += v;
  console.log(`${s.name.padEnd(10)} one-token chars ${String(chars.length).padStart(5)}  merge pairs ${String(pairs.size).padStart(6)}  Σdegree ${deg}`);
}
