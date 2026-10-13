// Z43: generic evaluator for UNREGISTERED codec modules (encode/decode pairs). Honest one-chat accounting.
import fs from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
const MODS: [string, any][] = [];
import * as M0 from '@/lib/omega/banyan';
MODS.push(['banyan', M0 as any]);
import * as M1 from '@/lib/omega/column';
MODS.push(['column', M1 as any]);
import * as M2 from '@/lib/omega/ctxcopy';
MODS.push(['ctxcopy', M2 as any]);
import * as M3 from '@/lib/omega/hermes-fractal';
MODS.push(['hermes-fractal', M3 as any]);
import * as M4 from '@/lib/omega/hermes-contract';
MODS.push(['hermes-contract', M4 as any]);
import * as M5 from '@/lib/omega/input-memory';
MODS.push(['input-memory', M5 as any]);
import * as M6 from '@/lib/omega/lattice';
MODS.push(['lattice', M6 as any]);
import * as M7 from '@/lib/omega/trie';
MODS.push(['trie', M7 as any]);
import * as M8 from '@/lib/omega/splice';
MODS.push(['splice', M8 as any]);
import * as M9 from '@/lib/omega/sigma';
MODS.push(['sigma', M9 as any]);
import * as M10 from '@/lib/omega/strand';
MODS.push(['strand', M10 as any]);
import * as M11 from '@/lib/omega/stencil';
MODS.push(['stencil', M11 as any]);
import * as M12 from '@/lib/omega/zeta';
MODS.push(['zeta', M12 as any]);
import * as M13 from '@/lib/omega/veritas-a';
MODS.push(['veritas-a', M13 as any]);
import * as M14 from '@/lib/omega/veritas-g';
MODS.push(['veritas-g', M14 as any]);
import * as M15 from '@/lib/omega/veritas-s';
MODS.push(['veritas-s', M15 as any]);
import * as M16 from '@/lib/omega/padtab';
MODS.push(['padtab', M16 as any]);
import * as M17 from '@/lib/omega/padtab2';
MODS.push(['padtab2', M17 as any]);
import * as M18 from '@/lib/omega/repair';
MODS.push(['repair', M18 as any]);
import * as M19 from '@/lib/omega/morph';
MODS.push(['morph', M19 as any]);
import * as M20 from '@/lib/omega/nexus';
MODS.push(['nexus', M20 as any]);
import * as M21 from '@/lib/omega/pronoia';
MODS.push(['pronoia', M21 as any]);
import * as M22 from '@/lib/omega/recall';
MODS.push(['recall', M22 as any]);
import * as M23 from '@/lib/omega/koine';
MODS.push(['koine', M23 as any]);
import * as M24 from '@/lib/omega/orbit';
MODS.push(['orbit', M24 as any]);
import * as M25 from '@/lib/omega/kallos';
MODS.push(['kallos', M25 as any]);
import * as M26 from '@/lib/omega/hyle';
MODS.push(['hyle', M26 as any]);
import * as M27 from '@/lib/omega/antiphon';
MODS.push(['antiphon', M27 as any]);
import * as M28 from '@/lib/omega/starlight-inline';
MODS.push(['starlight-inline', M28 as any]);
import * as M29 from '@/lib/omega/starlight';
MODS.push(['starlight', M29 as any]);
const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
const OUT = process.env.OUT!;
const enc = (process.env.ENC ?? 'o200k_base') as EncodingName;
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
function pairs(ns: any): [string, string][] {
  const names = Object.keys(ns);
  const out: [string, string][] = [];
  for (const n of names) {
    if (!/Encode(Body)?$/.test(n) || /^(encode|decode)$/.test(n)) continue;
    const base = n.replace(/Encode(Body)?$/, '');
    const d = names.find((x) => x === base + 'Decode' || x === base + 'DecodeBody' || x === base + 'Restore');
    if (d && typeof ns[n] === 'function' && typeof ns[d] === 'function' && n.endsWith('Encode')) out.push([n, d]);
  }
  return out;
}
async function main() {
  for (const [mname, ns] of MODS) {
    if (only.length && !only.includes(mname)) continue;
    for (const [en, dn] of pairs(ns)) {
      for (const f of files) {
        const text = fs.readFileSync(f, 'utf8');
        const t0 = Date.now();
        const row: any = { mod: mname, fn: en, file: f, enc, inTokens: countTokens(text, enc) };
        try {
          const r = ns[en](text, enc);
          const wire: string = typeof r === 'string' ? r : (r.wire ?? r.output ?? '');
          let decoded: string | null = null;
          try { decoded = ns[dn](wire, enc) ?? null; } catch (e) { decoded = null; row.decodeError = (e as Error).message.slice(0, 80); }
          if (typeof decoded !== 'string') decoded = ns[dn](wire) ?? null;
          row.wireTokens = countTokens(wire, enc);
          row.exact = typeof decoded === 'string' ? decoded === text : null;
          let oneChat: number | null = null; let src = '';
          if (r && typeof r === 'object' && typeof r.messageTokens === 'number') { oneChat = r.messageTokens; src = 'reported'; }
          else {
            const sp = Object.keys(ns).find((k) => /_SYSTEM_PROMPT$/.test(k) && k.toLowerCase().startsWith(mname.replace(/-/g, '').toLowerCase().slice(0, 3)));
            const dp = Object.keys(ns).find((k) => k === en.replace(/Encode$/, '') + 'DecoderPrompt');
            if (dp) { oneChat = countTokens(ns[dp](wire), enc); src = 'decoderPrompt(wire)'; }
            else if (sp) { oneChat = countTokens(ns[sp], enc) + row.wireTokens; src = 'systemPrompt+wire(' + sp + ')'; }
          }
          row.oneChat = oneChat; row.oneChatSrc = src || 'NONE(wire-only, inadmissible)';
        } catch (e) { row.error = (e as Error).message.slice(0, 120); }
        row.ms = Date.now() - t0;
        fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
        console.error(`${mname}.${en} ${f.split('/').slice(-1)[0]} in=${row.inTokens} oneChat=${row.oneChat} exact=${row.exact} ${row.error ? 'ERR ' + row.error : ''} ${row.ms}ms`);
      }
    }
  }
  console.error('done');
}
main();
