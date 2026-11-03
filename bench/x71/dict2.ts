import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import * as A from '../../src/lib/omega/veritas-a';
import * as C from '../../src/lib/omega/veritas-c';
import * as G from '../../src/lib/omega/veritas-g';
import * as K from '../../src/lib/omega/veritas-k';
import * as M from '../../src/lib/omega/veritas-m';
import * as N from '../../src/lib/omega/veritas-n';
import * as P from '../../src/lib/omega/veritas-p';
import * as Q from '../../src/lib/omega/veritas-q';
import * as R from '../../src/lib/omega/veritas-r';
import * as S from '../../src/lib/omega/veritas-s';
import * as U from '../../src/lib/omega/veritas-u';
import * as W from '../../src/lib/omega/veritas-w';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const mods: Array<[string, any]> = [['A', A], ['C', C], ['G', G], ['K', K], ['M', M], ['N', N], ['P', P], ['Q', Q], ['R', R], ['S', S], ['U', U], ['W', W]];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const out: string[] = [];
  for (const [n, mod] of mods) {
    const fn = Object.keys(mod).find((k) => /^veritas[A-Z]Encode$/.test(k)) as string | undefined;
    if (!fn) { out.push(`${n}?`); continue; }
    try {
      const r: any = (mod as any)[fn](text, enc);
      const tok = r.outTokens ?? r.messageTokens ?? r.decoderPromptTokens ?? 0;
      out.push(`${n}=${tok}${r.decoded === text ? '' : '!'}`);
    } catch (e) { out.push(`${n}=ERR`); }
  }
  const f: any = tagstackEncode(text, enc);
  console.error(`${p}\n  raw ${countTokens(text, enc)} frontier ${f.messageTokens} | ${out.join(' ')}`);
}
