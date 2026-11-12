/**
 * X107 — THE LEGEND CENSUS. How much of the frontier is the decoder-instruction line,
 * which lanes carry one, and how much of it can be contracted by a GENERAL rule rather
 * than by METRON's two hard-coded regexes?
 *
 * PINAX (X76) measured 73 -> 65 on psql-output but its substitution table has two
 * entries, both matching METRON's exact wording. APOGRAPHE emits a FAMILY of wordings
 * (3 setups x 2 per family + combined). This probe measures both: what the shipped
 * table already gets, and what a general connective-stripping pass would get.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { CHIRON_START } from '../../src/lib/omega/chiron';
import { pinaxIsLegend, PINAX_RULES, pinaxCovers, pinaxRewrite } from '../../src/lib/omega/pinax';

process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0';
const enc:any='o200k_base';
const lanes=fs.readFileSync('/tmp/lanes.txt','utf8').split('\n').filter(Boolean);

/** General connective stripping: keep every name=definition pair, drop the filler. */
function contractGeneral(legend: string): string {
  // Split into the preamble and the clause list. Clauses are separated by '. ' or '; '
  // and each has the shape NAME = DEFINITION or NAME=DEFINITION.
  const parts = legend.split(/(?<=[.;])\s+/).map(s=>s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    let c = p;
    // normalise the separator spacing so `name = def` and `name=def` agree
    c = c.replace(/\s*=\s*/g, '=');
    // strip filler connectives that carry no operator information
    c = c
      .replace(/\bthat column\b/g, '')
      .replace(/\bof the same line\b/g, '')
      .replace(/\bof its own line\b/g, '')
      .replace(/\bare dropped from lines and rebuilt\b/g, 'drop+rebuild')
      .replace(/\bis dropped from the lines and rebuilt\b/g, 'drop+rebuild')
      .replace(/\bis literal and resets\b/g, 'literal,resets')
      .replace(/\bthe date above plus one day\b/g, 'above+1d')
      .replace(/\bnext weekday after the date above\b/g, 'next weekday')
      .replace(/\bis the number above plus\b/g, 'above+')
      .replace(/\bnumber above \+ b, same width\b/g, 'above+b same width')
      .replace(/\bsame digit count\b/g, 'same width')
      .replace(/\bis missing from the lines\b/g, 'missing')
      .replace(/\bat its place\b/g, '')
      .replace(/\bEach named column\b/g, 'Named cols')
      .replace(/\beach named column\b/g, 'named cols')
      .replace(/\bA full n-field line\b/g, 'Full n-field line')
      .replace(/\ba full n-field line\b/g, 'full n-field line')
      .replace(/\bDrop line 1\b/g, 'drop line1')
      .replace(/\bDrop it\b/g, 'drop it')
      .replace(/\bLine 1 is a header\b/g, 'Line1 header')
      .replace(/\bHeader line\b/g, 'Header')
      .replace(/\bLine 1:\s*/g, 'Line1:')
      .replace(/\bthe line above\b/g, 'prev line')
      .replace(/\bcolumn M of\b/g, 'col M of')
      .replace(/\bone day apart\b/g, '+1d')
      .replace(/\bdates,\s*/g, 'dates ')
      .replace(/\s+,/g, ',').replace(/\s+\./g, '.')
      .replace(/\s{2,}/g, ' ').trim();
    out.push(c);
  }
  return out.join(' ');
}

let totBefore=0, totPinax=0, totGeneral=0, nLegend=0, nPinaxFires=0;
const rows:string[]=[];
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackFrontier(text,enc);
  const msg:string=r.message??'';
  const lines=msg.split('\n');
  let before=0, afterPinax=0, afterGen=0, hasLegend=false;
  for(const line of lines){
    if(!pinaxIsLegend(line)) continue;
    if(text.split('\n').includes(line)) continue;   // GATE 3
    if(line.includes(CHIRON_START)) continue;       // GATE 2
    hasLegend=true;
    const b=countTokens(line,enc); before+=b;
    let next=line;
    for(const rule of PINAX_RULES){ const c=next.replace(rule.re,rule.rep); if(c===next) continue; if(!pinaxCovers(rule.rep,rule.requires)) continue; next=c; break; }
    const ap=countTokens(next,enc); afterPinax+=ap;
    if(next!==line) nPinaxFires++;
    const g=contractGeneral(line);
    const ag=countTokens(g,enc); afterGen+=ag;
  }
  if(hasLegend){
    nLegend++;
    totBefore+=before; totPinax+=afterPinax; totGeneral+=afterGen;
    rows.push(`${p.split('/').pop()!.padEnd(22)} legend ${String(before).padStart(3)} tok  PINAX ${String(afterPinax).padStart(3)} (${afterPinax-before>0?'+':''}${afterPinax-before})  GENERAL ${String(afterGen).padStart(3)} (${afterGen-before>0?'+':''}${afterGen-before})  lane ${r.messageTokens}`);
  }
}
console.log(rows.join('\n'));
console.log(`\nlanes with a legend: ${nLegend}/${lanes.length}   PINAX fired on ${nPinaxFires}`);
console.log(`TOTAL legend tokens: before ${totBefore}  PINAX ${totPinax} (Δ ${totPinax-totBefore})  GENERAL ${totGeneral} (Δ ${totGeneral-totBefore})`);
