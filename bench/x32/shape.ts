import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const H='Before ¶ k=v. ';
const cands=[
 'expand repeatedly and 8 digits become YYYY-MM-DD; print only.',
 'expand repeatedly and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, ^ marks those digits so drop it; print only.',
 'expand repeatedly, 8→YYYY-MM-DD; print only.',
 'expand repeatedly, 8→YYYY-MM-DD, 4→dd:dd, ^ marks those so drop it; print only.',
 'expand repeatedly, 8=YYYY-MM-DD; print only.',
 'expand repeatedly, 8=YYYY-MM-DD, 4=dd:dd, ^marks those, drop it; print only.',
 'expand repeatedly; 8→YYYY-MM-DD; print only.',
 'expand repeatedly; 8→YYYY-MM-DD; 4→dd:dd; ^→drop; print only.',
 'expand repeatedly; 8:YYYY-MM-DD; print only.',
 'expand repeatedly; 8d→YYYY-MM-DD; print only.',
 'expand repeatedly; 8d→YYYY-MM-DD; 4d→dd:dd; ^d: drop it; print only.',
 'expand repeatedly; 8→YYYY-MM-DD; 4→dd:dd; ^: drop; print only.',
];
for(const c of cands) console.log(String(countTokens(H+c,enc)).padStart(3), JSON.stringify(H+c));
