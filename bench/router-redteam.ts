/**
 * bench/router-redteam.ts
 * ---------------------------------------------------------------------------
 * SECOND-ORDER ADVERSARY against the ⚡ Optimal Exact Route button and against
 * METATRON / EPISTEME / PANOPTES / KALLOS / ARITHMOS.
 *
 * Question 1 (router honesty): the button ranks exact rows by `outTokens`.
 *   Is `outTokens` the same QUANTITY for every row?
 * Question 2 (lane honesty): does each named codec actually beat the incumbent
 *   in the lane it claims, once its decode contract is paid?
 * Question 3: is every "exact" row actually exact under re-decode?
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

// ---- 1. which exact-lane codecs carry an uncounted out-of-band system prompt
const dir = 'src/lib/omega';
type Row = { codec: string; promptTok: number; name: string };
const found: Row[] = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts') || f.includes('.orig.')) continue;
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = src.match(/export const ([A-Z0-9_]*(?:SYSTEM_PROMPT|DECODER_PROMPT))\s*(?::\s*string\s*)?=\s*([\s\S]{0,4000}?);\n/);
  if (!m) continue;
  // recover the literal text (single/backtick/concatenated string literals)
  const lits = m[2].match(/(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g) ?? [];
  const text = lits.map((l) => l.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')).join('');
  if (text.length < 20) continue;
  found.push({ codec: f.replace(/\.ts$/, ''), promptTok: T(text), name: m[1] });
}
found.sort((a, b) => b.promptTok - a.promptTok);

// the exact lane as the Workbench defines it
const EXACT_LANE = ['metatron','episteme','panoptes','kallos','arithmos','khoros','omni','genesis','arche','telos','pantheon','apeiron','noesis','synapse','panacea','aether','harmonia','rosetta','kappa','phrase','tau','eclipse','zenith','kernel','iris','crown','aurora','atlas','mosaic','signet','strata','tessera','axiom','orbit','anaphora','pulse','plexus','meridian','quasar','helixAp','veritasVx','apex','eidolon','nexus','mneme','losslessAscii','omegaXi','omegaE8','ltp','prometheus','zeta','janus','sigma','stencil','chronos','chronosArena','asgJson','astCode','hermesContract','chiron','ariadne','sibyl','sequoyah','thoth','palimpsest','daedalus','orthos','stentor','abacus','procrustes','circe','chimera','caesura','syntagma','prosopon','epistle'];
// rows whose `outTokens` is the WIRE ONLY (contract excluded) — read off Workbench.tsx
const WIRE_ONLY = new Set(['khoros','omni','genesis','arche','telos','pantheon','apeiron','noesis','synapse','panacea','aether','harmonia','apex','eidolon','nexus','mneme','zeta','prometheus','ltp','sigma','stencil','morph','omegaXi','omegaE8','chronos','chronosArena','mosaic','signet','tau','phrase','kappa','rosetta','strata','tessera','axiom','orbit','anaphora','pulse','plexus','meridian','quasar','helixAp','veritasVx','atlas','aurora','crown','iris','eclipse','zenith','kernel','janus']);

console.log('=== R1. exact-lane codecs whose decode needs an out-of-band system prompt ===');
console.log('(the ⚡ router ranks these on wire tokens only, so the prompt below is FREE in the ranking)');
console.log('codec'.padEnd(18), 'const'.padEnd(26), 'tokens'.padStart(7), 'in exact lane', 'wire-only row');
let uncounted = 0, n = 0;
for (const r of found) {
  const inLane = EXACT_LANE.includes(r.codec) || EXACT_LANE.includes(r.codec.replace(/-.*/, ''));
  const wireOnly = WIRE_ONLY.has(r.codec);
  if (!inLane) continue;
  n++;
  if (wireOnly) uncounted += r.promptTok;
  console.log(r.codec.padEnd(18), r.name.padEnd(26), String(r.promptTok).padStart(7), String(inLane).padEnd(14), String(wireOnly));
}
console.log(`\n${n} exact-lane codecs export a decoder system prompt; ${uncounted} tokens of decode contract are invisible to the router in total.`);

// ---- 2. does the mis-ranking actually change the button's answer?
import { metatronEncode } from '../src/lib/omega/metatron';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { panoptesEncode } from '../src/lib/omega/panoptes';
import { kallosEncode } from '../src/lib/omega/kallos';
import { arithmosEncode } from '../src/lib/omega/arithmos';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { strataEncode, STRATA_SYSTEM_PROMPT } from '../src/lib/omega/strata';
import { tesseraEncode, TESSERA_SYSTEM_PROMPT } from '../src/lib/omega/tessera';
import { khorosEncode, KHOROS_SYSTEM_PROMPT } from '../src/lib/omega/khoros';
import { omniEncode, OMNI_SYSTEM_PROMPT } from '../src/lib/omega/omni';
import { synizesisEncode } from '../src/lib/omega/synizesis';
import { allFixtures } from './synizesis-fixtures';

console.log('\n=== R2. the router\'s ranking vs. the honest one-chat cost ===');
console.log('doc'.padEnd(26), 'router pick (wire tok)'.padEnd(30), 'honest pick (wire+contract)'.padEnd(32), 'router overstates by');
let flips = 0, docs = 0;
for (const f of allFixtures()) {
  if (f.text.length > 30000) continue;
  docs++;
  type C = { k: string; wire: number; contract: number; exact: boolean };
  const cs: C[] = [];
  const push = (k: string, wire: number, contract: number, exact: boolean) => cs.push({ k, wire, contract, exact });
  try { const r = metatronEncode(f.text, ENC, { budgetMs: 400 }); push('metatron', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = epistemeEncode(f.text, ENC, { budgetMs: 400 } as any); push('episteme', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = panoptesEncode(f.text, ENC, { budgetMs: 400 } as any); push('panoptes', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = kallosEncode(f.text, ENC); push('kallos', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = arithmosEncode(f.text, ENC); push('arithmos', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = daedalusEncode(f.text, ENC, { budgetMs: 400 }); push('daedalus', T(r.wire), r.messageTokens - T(r.wire), r.decoded === f.text); } catch {}
  try { const r = strataEncode(f.text, ENC); push('strata', r.outTokens, T(STRATA_SYSTEM_PROMPT), r.decoded === f.text); } catch {}
  try { const r = tesseraEncode(f.text, ENC); push('tessera', r.outTokens, T(TESSERA_SYSTEM_PROMPT), r.decoded === f.text); } catch {}
  try { const r = khorosEncode(f.text, ENC); push('khoros', r.outTokens, T(KHOROS_SYSTEM_PROMPT), r.decoded === f.text); } catch {}
  try { const r = omniEncode(f.text, ENC); push('omni', r.outTokens, T(OMNI_SYSTEM_PROMPT), r.decoded === f.text); } catch {}
  try { const r = synizesisEncode(f.text, ENC, { budgetMs: 400 }); push('synizesis', T(r.wire), r.contractTokens, r.decoded === f.text); } catch {}
  const ex = cs.filter((c) => c.exact);
  if (!ex.length) continue;
  const routerPick = [...ex].sort((a, b) => a.wire - b.wire)[0];
  const honestPick = [...ex].sort((a, b) => (a.wire + a.contract) - (b.wire + b.contract))[0];
  const over = (routerPick.wire + routerPick.contract) - (honestPick.wire + honestPick.contract);
  if (routerPick.k !== honestPick.k) flips++;
  console.log(f.name.padEnd(26), `${routerPick.k} (${routerPick.wire})`.padEnd(30), `${honestPick.k} (${honestPick.wire + honestPick.contract})`.padEnd(32), String(over));
}
console.log(`\nrouter picked a codec that is NOT cheapest once the contract is paid on ${flips}/${docs} documents.`);
