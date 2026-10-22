import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef', A='etaoinsrkldcumyp', M='~';
const opts={
  a:`Then ${M} begins a hex run: letters ${A} mean ${HEX}; drop the ${M}.`,
  b:`Then ${M}: ${A} mean ${HEX}.`,
  c:`Then in ${M} runs ${A} mean ${HEX}.`,
  d:`${M} starts hex: ${A} = ${HEX}.`,
  e:`After expanding, ${M}: ${A} mean ${HEX}.`,
  f:`Then ${M} means hex follows: ${A}=${HEX}.`,
};
for(const k of Object.keys(opts)) console.log('  ',k, String(countTokens(' '+(opts as any)[k],enc)-countTokens(' ',enc)).padStart(3),'tok  ', (opts as any)[k]);
