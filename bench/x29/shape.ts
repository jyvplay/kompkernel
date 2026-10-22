import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const H='Letters before ¶ name the phrases after them. Then ';
const variants: Record<string,(a:string,b:string)=>string> = {
  'cur:  and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ before digits marks them; drop it; print result only.':
    ()=>'expand repeatedly and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ before digits marks them; drop it; print result only.',
  'to instead of become': ()=>'expand repeatedly and 8 digits to YYYY-MM-DD, 4 digits to dd:dd, where ^ before digits marks them; drop it; print result only.',
  'arrow':                ()=>'expand repeatedly; 8 digits -> YYYY-MM-DD, 4 digits -> dd:dd; ^ before digits marks them, drop it; print result only.',
  'digits8= compact':     ()=>'expand repeatedly; 8 digits=YYYY-MM-DD, 4 digits=dd:dd; ^ marks digits: drop it; print result only.',
  'as-template':          ()=>'expand repeatedly; write 8 digits as YYYY-MM-DD and 4 as dd:dd; ^ marks those digits, drop it; print result only.',
  'unpad':                ()=>'expand repeatedly, 8 digits as YYYY-MM-DD and 4 as dd:dd, ^ marks those digits so drop it; print result only.',
  'shortest':             ()=>'expand repeatedly, 8 digits: YYYY-MM-DD, 4 digits: dd:dd, ^ marks digits to keep, drop it; print result only.',
  'sentinel last':        ()=>'expand repeatedly, 8 digits as YYYY-MM-DD, 4 as dd:dd. Drop ^; print result only.',
  'digits->date':         ()=>'expand repeatedly, reformat 8 digits as YYYY-MM-DD and 4 as dd:dd, drop ^; print result only.',
};
for (const [name,fn] of Object.entries(variants)) {
  const s = H + fn('','');
  console.log(String(T(s)).padStart(3), name);
}
console.log('\nsingle-shape clause variants:');
for (const c of ['expand repeatedly and 8 digits become YYYY-MM-DD; print result only.',
                 'expand repeatedly; 8 digits to YYYY-MM-DD; print result only.',
                 'expand repeatedly, 8 digits as YYYY-MM-DD; print result only.',
                 'expand repeatedly, reformat 8 digits as YYYY-MM-DD; print result only.',
                 'expand repeatedly, 8 digits into YYYY-MM-DD; print result only.'])
  console.log(String(T(H+c)).padStart(3), JSON.stringify(c));
