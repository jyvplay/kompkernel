/**
 * HYLE audit — honest contract accounting across every borrowed arm.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `M = |wire| + |contract|` is the cost metric this repository's tier-5 reviews
 * are written against: one chat input, one chat output, no system prompt, no
 * skills file, so every instruction the decoder needs must be inside the
 * message and must be paid for.
 *
 * Three lanes in the existing stack break that rule in the same direction.
 * GLOSSIA's mosaic arm bills `contract = 0` with the comment "region tags are
 * in wire"; EIDOS delegates to GLOSSIA and AION delegates to EIDOS, so all
 * three report `decoderPrompt === wire` for a payload that is really a SIGNET /
 * ANAPHORA / PLEXUS / HELIX lane wire.  MOSAIC itself publishes the contract
 * those wires need (`mosaicDecoderPrompt`), and it is not small:
 *
 *   signet region          962 tokens   (head 320 + SIGNET_SYSTEM_PROMPT 642)
 *   signet + anaphora     1061 tokens
 *   plexus-local           660 tokens
 *   every lane (framed)   3360 tokens
 *
 * This script prints, per file, what each arm BILLS and what it COSTS, so the
 * frontier can be read either way and the difference is on the record.
 *
 * Run: npx esbuild bench/hyle_audit.ts --bundle --platform=node --format=esm \
 *        --outfile=bench/tmp/hyle_audit.mjs --alias:@=./src --packages=external
 *      node bench/tmp/hyle_audit.mjs bench/holdout-tbl/*.txt [budgetMs]
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { hyleEncode, lanesOfWire, laneContract } from '@/lib/omega/hyle';
import { chironEncode } from '@/lib/omega/chiron';
import { kionesEncode } from '@/lib/omega/kiones';
import { hydraEncode } from '@/lib/omega/hydra';
import { glossiaEncode } from '@/lib/omega/glossia';
import { eidosEncode } from '@/lib/omega/eidos';
import { aionEncode } from '@/lib/omega/aion';
import { tachysEncode } from '@/lib/omega/tachys';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

interface ArmOut { wire: string; decoded: string; messageTokens: number; decoderPrompt?: string }

/** what an arm bills vs what its wire actually costs to describe */
function auditArm(name: string, fn: () => ArmOut, text: string): string {
  let r: ArmOut;
  try { r = fn(); } catch (e: unknown) { return `${name.padEnd(8)} unavailable (${(e as Error).message.slice(0, 40)})`; }
  if (r.decoded !== text) return `${name.padEnd(8)} NOT EXACT — rejected`;
  const wire = T(r.wire);
  const p = r.decoderPrompt;
  // strip the single joining newline exactly as the arms' own accounting does,
  // otherwise every arm with a published prompt looks 1 token under-billed
  const published = typeof p === 'string' && p.startsWith(r.wire) ? p.slice(r.wire.length).replace(/^\n/, '') : '';
  const billed = Math.max(0, (r.messageTokens ?? wire + T(published)) - wire);
  const lanes = lanesOfWire(r.wire);
  const honest = lanes.length ? laneContract(r.wire, ENC).tokens : T(published);
  const flag = honest > billed ? `  ← under-billed by ${honest - billed}` : '';
  return `${name.padEnd(8)} wire=${String(wire).padStart(5)} billedContract=${String(billed).padStart(4)} billedM=${String(wire + billed).padStart(5)}  honestContract=${String(Math.max(billed, honest)).padStart(4)} honestM=${String(wire + Math.max(billed, honest)).padStart(5)}${lanes.length ? ` lanes=${lanes.join('+')}` : ''}${flag}`;
}

const budgetMs = Number(process.argv[process.argv.length - 1]) > 1000 ? Number(process.argv.pop()) : 240000;

for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  const raw = T(text);
  console.log(`\n=== ${file}  raw=${raw} tokens`);
  console.log('  ' + auditArm('chiron', () => chironEncode(text, ENC, { budgetMs: 3000 }) as unknown as ArmOut, text));
  console.log('  ' + auditArm('glossia', () => glossiaEncode(text, ENC) as unknown as ArmOut, text));
  console.log('  ' + auditArm('eidos', () => eidosEncode(text, ENC) as unknown as ArmOut, text));
  console.log('  ' + auditArm('aion', () => aionEncode(text, ENC) as unknown as ArmOut, text));
  console.log('  ' + auditArm('hydra', () => hydraEncode(text, ENC, { budgetMs: 8000 }) as unknown as ArmOut, text));
  console.log('  ' + auditArm('tachys', () => tachysEncode(text, ENC) as unknown as ArmOut, text));
  console.log('  ' + auditArm('kiones', () => kionesEncode(text, ENC, { budgetMs }) as unknown as ArmOut, text));
  const fast = hyleEncode(text, ENC, { fast: true, budgetMs: 20000 });
  console.log(`  ${'hyle-fast'.padEnd(8)} wire=${String(fast.outTokens).padStart(5)} billedContract=${String(fast.contractTokens).padStart(4)} billedM=${String(fast.messageTokens).padStart(5)}  honestM=${String(fast.messageTokens).padStart(5)} ${fast.winner} ${fast.ms}ms`);
  const full = hyleEncode(text, ENC, { budgetMs });
  console.log(`  ${'hyle-full'.padEnd(8)} wire=${String(full.outTokens).padStart(5)} billedContract=${String(full.contractTokens).padStart(4)} billedM=${String(full.messageTokens).padStart(5)}  honestM=${String(full.messageTokens).padStart(5)} ${full.winner} ${full.ms}ms exact=${full.exact}`);
  console.log(`  tried: ${full.tried.join('  ')}`);
}
