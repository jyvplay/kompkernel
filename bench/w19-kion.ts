/** Generalised BLOCK transpose: maximal runs of consistent lines, any separator. */
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const MARKS=['⇵','⇅','⌸','⎅','‖','⫼','⧉','⨝','≣','⋮'];
for(const m of MARKS) console.log(JSON.stringify(m),T(m),'| in ctx', T('x\n'+m+',\na,b\n'+m+'\ny'));
const C=[
'Between the two ⇵ marks the lines are columns; print them back as rows, joining with the character after the first ⇵.',
'Between ⇵ marks each line is a column. Re-emit as rows, fields joined by the character after the first ⇵.',
'⇵c starts columns, ⇵ ends them: print the lines back as rows with fields joined by c.',
'⇵c ... ⇵ holds columns; print them as rows, fields joined by c.',
];
for(const x of C) console.log(String(T(x)).padStart(3), JSON.stringify(x));
