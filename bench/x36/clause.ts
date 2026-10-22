import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const V=[
 '⟦N⇤X⟧ means X written N times.',
 '⟦N⇤X⟧ means X N times.',
 '⟦N⇤X⟧: X, N times.',
 'In ⟦N⇤X⟧ write X N times.',
 '⟦N⇤X⟧ = X times N.',
];
for(const c of V) console.log(String(countTokens(' '+c,enc)-countTokens(' ',enc)).padStart(3),JSON.stringify(c));
