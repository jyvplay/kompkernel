// Probe: o200k token cost of Cyrillic text vs a bijective ASCII transliteration (ISO-9-style, escape-safe).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const MAP: Record<string,string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'j','к':'k','л':'l','м':'m',
  'н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'shch',
  'ъ':'"','ы':'y','ь':"'",'э':'eh','ю':'yu','я':'ya',
};
const UP: Record<string,string> = {};
for (const k of Object.keys(MAP)) { const u = k.toUpperCase(); UP[u] = MAP[k].length ? MAP[k][0].toUpperCase() + MAP[k].slice(1) : ''; }
function translit(s: string): string {
  let out = '';
  for (const ch of s) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (UP[ch] !== undefined) out += UP[ch];
    else out += ch;
  }
  return out;
}
for (const f of ['bench/holdout-lang/ru-kb.txt','bench/holdout-lang/pl-kb.txt','bench/holdout-lang/de-kb.txt','bench/holdout-lang/tr-kb.txt']) {
  const t = fs.readFileSync(f,'utf8');
  const tr = translit(t);
  console.log(JSON.stringify({ f, chars: t.length, tok: countTokens(t,'o200k_base'), trTok: countTokens(tr,'o200k_base') }));
}
