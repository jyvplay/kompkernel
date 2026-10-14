import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
// unambiguous contraction bare forms (bare form is not an English word / not plausibly in text)
const SAFE = new Set(['dont','doesnt','didnt','isnt','arent','wasnt','werent','hasnt','havent','hadnt','wouldnt','couldnt','shouldnt','mustnt','neednt','thats','whats','theres','heres','youre','theyre','youll','theyll','youve','theyve','weve','ive','im','youd','theyd','wouldve','couldve','shouldve','whos','hows','wheres','whens','whys','aint','isnt','itll','thatll','therell','thats']);
let totC=0, totSaved=0, totUrl=0, totUrlSaved=0, totIn=0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const inTok = countTokens(t, enc); totIn += inTok;
  let n=0, saved=0;
  const re = /\b([A-Za-z]+)'([a-z]{1,2})\b/g;
  const out = t.replace(re, (m, a, b) => {
    const bare = (a + b).toLowerCase();
    if (!SAFE.has(bare)) return m;
    n++;
    return a + b;
  });
  // ambiguity check: does bare form of any SAFE word appear literally in the text already? (would break decode)
  let amb = 0;
  for (const w of SAFE) if (new RegExp(`\\b${w}\\b`, 'i').test(t)) amb++;
  if (n) saved = inTok - countTokens(out, enc);
  // URLs
  const urls = (t.match(/https?:\/\//g) || []).length;
  const allHttps = urls > 0 && !/http:\/\//.test(t);
  let usaved = 0;
  if (allHttps) usaved = inTok - countTokens(t.replace(/https:\/\//g, ''), enc);
  totC += n; totSaved += saved; totUrl += urls; totUrlSaved += usaved;
  if (n || urls) console.log(`${f.padEnd(60)} in=${inTok} contractions=${n} saved=${saved} ambiguousBare=${amb} urls=${urls} https-only=${allHttps} urlSaved=${usaved}`);
}
console.log(`TOTAL in=${totIn} contractions=${totC} saved=${totSaved} urls=${totUrl} urlSaved=${totUrlSaved}`);
