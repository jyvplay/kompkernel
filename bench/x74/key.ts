import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const cands = [
 `X74 PAD. Decode the body below with this stack's rules, giving TSV lines. Then, for each line: if it begins with \\ drop the \\ and keep it; otherwise split at TAB and write the cells in order, padding every cell but the last with spaces on the side shown by the alignment string, to the widths given, then the last cell as written. widths 27,6,6,5,10 alignment <<<<<. (>=left-pad, <=right-pad, .=last). Print only the result.`,
 `X74: body = stack output of TSV lines. For each: \\-prefixed is literal; else split TAB, pad cell i to 27,6,6,5,10 on side <<<<<. (>=pad left, <=pad right, .=last cell as-is). Print only.`,
 `Busy. Apply before decoding it — decode the body, then each line: split TAB, and write cell i left-padded to width 27,6,6,5,10 if the mark below is > else right-padded; last cell raw; lines starting \\ are literal. marks <<<<<. Print only.`,
 `Expand TSV body then re-pad: cells 27,6,6,5,10, marks <<<<<. ; >=pad left, <=pad right, .=last raw; \\lines literal. Print only.`,
 `After decoding the body to TSV, print each line by writing cell i padded to 27,6,6,5,10 (side: <<<<<., > left, < right, . last cell as-is). A line starting \\ is literal: drop the \\ and print it. Print only.`,
];
for (const c of cands) console.log(String(T(c, enc)).padStart(4) + ' ' + c.slice(0, 70));
