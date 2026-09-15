/** Final gate: existing codecs must be UNCHANGED, and all self-tests must pass. */
import { corpus } from './fixtures';
import { mosaicEncode, mosaicSelfTest } from '../src/lib/omega/mosaic';
import { auroraEncode } from '../src/lib/omega/aurora';
import { atlasEncode, atlasSelfTest } from '../src/lib/omega/atlas';
import { signetEncode } from '../src/lib/omega/signet';
import { lumenEncode } from '../src/lib/omega/lumen';
import { praxisEncode } from '../src/lib/omega/praxis';
import { crownSelfTest } from '../src/lib/omega/crown';
import { kernelSelfTest } from '../src/lib/omega/kernel';
import { prismSelfTest } from '../src/lib/omega/prism';

// Golden baseline captured from the ORIGINAL run (bench/run.mjs) before PRISM existed.
const GOLD: Record<string, [number,number,number,number,number,number]> = {
  prose:[24,24,24,24,24,24], jsonLog:[95,294,629,802,574,95], csv:[88,327,420,370,447,88],
  chat:[48,133,276,271,221,48], grid:[23,59,127,77,110,23], rle:[19,19,126,252,71,252],
  idrun:[18,18,440,600,414,600], stack:[57,136,291,405,236,57], code:[170,170,498,522,443,1180],
  tsv:[38,179,283,283,255,38], yaml:[177,177,508,727,510,1124], md:[110,110,271,345,216,480],
  sql:[88,226,487,555,432,88], hetero300:[110,118,118,118,118,113],
  agentTurn:[198,498,930,1343,875,208], bigAgent:[455,473,1382,2816,2060,473],
  toolTrace:[310,593,1184,1765,1305,310], mixedDoc:[386,676,1260,2140,1476,386],
};
let bad = 0;
for (const [name, text] of Object.entries(corpus())) {
  const got: number[] = [mosaicEncode(text,'o200k_base').outTokens, auroraEncode(text,'o200k_base').outTokens,
    atlasEncode(text,'o200k_base').deliveredTokens, lumenEncode(text,'o200k_base').outTokens,
    praxisEncode(text,'o200k_base').outTokens, signetEncode(text,'o200k_base').outTokens];
  const want = GOLD[name];
  for (let i=0;i<6;i++) if (got[i]!==want[i]) { console.log(`  ✗ REGRESSION ${name}[${i}] ${want[i]} -> ${got[i]}`); bad++; }
}
console.log(bad===0 ? 'R1 existing codecs BIT-IDENTICAL to pre-PRISM baseline' : `R1 ${bad} REGRESSIONS`);

const show = (t:string,rs:{name:string;pass:boolean;details:string}[]) => {
  const f = rs.filter(r=>!r.pass);
  console.log(`${t}: ${rs.length-f.length}/${rs.length} pass${f.length?' — FAILS: '+f.map(x=>x.name).join('; '):''}`);
  return f.length;
};
let f = bad;
f += show('MOSAIC self-test', mosaicSelfTest('o200k_base'));
f += show('ATLAS  self-test', atlasSelfTest('o200k_base'));
f += show('CROWN  self-test', await crownSelfTest('o200k_base'));
f += show('KERNEL self-test', await kernelSelfTest('o200k_base'));
f += show('PRISM  self-test', prismSelfTest('o200k_base'));
console.log(f===0 ? '\n✅ ALL GREEN' : `\n❌ ${f} failures`);
process.exit(f===0?0:1);
