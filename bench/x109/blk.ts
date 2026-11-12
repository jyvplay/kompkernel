/**
 * X109 — IS ΧΕΙΡΩΝ's BLOCK PASS UNDER-USED ON COLUMNAR LANES?
 * findmnt's body still carries raw column padding (49/43/42/40/36-space runs as
 * literal tokens) even though the sweep reports `full/<sep>` as the winner.
 * Test every arm directly on the lane.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const WU=Number(process.argv[3]??'8_000_000');
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const ARMS:Array<[string,any]>=[
  ['full(sweep)   ',{}],
  ['macros-only   ',{noBlocks:true}],
  ['blocks-only   ',{noMacros:true}],
];
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const out:string[]=[];
  for(const [name,o] of ARMS){
    const r:any=chironEncode(text,enc,{...o,workUnits:WU});
    out.push(`${name} ${String(r.messageTokens).padStart(5)} (rules ${String(r.rules).padStart(3)}, blocks ${String(r.blocks).padStart(3)}, lists ${String(r.lists).padStart(3)}, script ${r.script}) ${r.exact?'exact':'NOT-EXACT'}`);
  }
  console.log(`${p.split('/').pop()}\n  ${out.join('\n  ')}`);
}
