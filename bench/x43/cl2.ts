import { diastemaPlan, diastemaClause } from '@/lib/omega/diastema';
import { countTokens } from '@/lib/omega/bpe';
import * as fs from 'node:fs';
const ENC: any = 'o200k_base';
const t = fs.readFileSync('bench/holdout-ops/find-listing.txt', 'utf8');
const p: any = diastemaPlan(t, ENC)!;
const c = diastemaClause(p);
console.log('clause tokens:', countTokens(' ' + c + '; print only.', ENC) - countTokens('; print only.', ENC));
console.log(c);
