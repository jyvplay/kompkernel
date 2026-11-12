/**
 * X109 — THE ADJACENCY LEVER, MEASURED.
 *
 * The X108 census measured, on the live wires: 395 adjacent glyph-glyph pairs, 302
 * distinct, 244 of the OCCURRENCES already tokenize as ONE token.  151 occurrences
 * therefore cost 2 tokens where 1 would do.
 *
 * A ΧΕΙΡΩΝ rule is identified by its glyph, and the glyph is the ONLY thing that ties
 * the tape to the body.  So permuting the glyphs consistently in tape and body leaves
 * the decoded payload byte-identical — a pure relabelling, exactly lossless.  If the
 * permutation is chosen so that rule pairs that are ADJACENT IN THE BODY get glyphs
 * that merge, the body gets cheaper.
 *
 * This probe measures the size of that lever: per lane, the adjacent-glyph-pair
 * multigraph in the BODY, how many occurrences fail to merge, and the run-length
 * distribution (a run of k glyphs is where the saving lives).
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';

const lanes = fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
console.log('lane                    body_tok  glyphs  adj_occ  adj_dist  merged  UNMERGED  runs>=3  save_if_all');
let T = {body:0, occ:0, dist:0, merged:0, unmerged:0, runs:0};
for (const p of lanes) {
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const w=msg.indexOf(CHIRON_START);
  if(w<0){ console.log(`${p.split('/').pop()!.padEnd(22)} NO FRAME`); continue; }
  const tEnd=msg.indexOf('\u00b6',w);
  const tape=msg.slice(w+1,tEnd), body=msg.slice(tEnd+1);
  const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape[0]!.codePointAt(0)!)) ?? null;
  const glyphs=new Set<string>();
  for(const ch of tape) if(script && chironInScript(script, ch.codePointAt(0)!)) glyphs.add(ch);
  let occ=0, merged=0; const dist=new Set<string>(); let runs=0, cur=0;
  for(let i=0;i<body.length;i++){
    const a=body[i]!;
    if(glyphs.has(a)){
      cur++;
      const b=body[i+1];
      if(b!==undefined && glyphs.has(b)){
        occ++; dist.add(a+b);
        if(countTokens(a+b,enc)===1) merged++;
      }
    } else { if(cur>=3) runs++; cur=0; }
  }
  if(cur>=3) runs++;
  const unmerged=occ-merged;
  const bt=countTokens(body,enc);
  T.body+=bt; T.occ+=occ; T.dist+=dist.size; T.merged+=merged; T.unmerged+=unmerged; T.runs+=runs;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(bt).padStart(8)} ${String(glyphs.size).padStart(7)} ${String(occ).padStart(8)} ${String(dist.size).padStart(9)} ${String(merged).padStart(7)} ${String(unmerged).padStart(10)} ${String(runs).padStart(11)} ${String(unmerged).padStart(12)}`);
}
console.log(`\nTOTAL body ${T.body}  adj_occ ${T.occ}  distinct ${T.dist}  merged ${T.merged}  UNMERGED ${T.unmerged}  runs>=3 ${T.runs}`);
console.log(`Upper bound on the relabelling lever: -${T.unmerged} tokens (${(100*T.unmerged/T.body).toFixed(1)}% of body cost) — an UPPER bound, not a promise.`);
