import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
const a='; ◈→###; ◇→##; ☑→- [x]; ☐→- [ ]';
const b=' ◈=### ◇=## ☑=- [x] ☐=- [ ]';
const c=' ◈###◇##☑- [x]☐- [ ]';
const d='; ◈=###, ◇=##, ☑=- [x], ☐=- [ ]';
for(const [n,x] of [['arrow+semi',a],['eq+space',b],['delimiter-free',c],['eq+comma',d]] as Array<[string,string]>) console.log(String(T(x)).padStart(3), n, JSON.stringify(x));
