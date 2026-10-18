import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aetosEncode, aetosContract, aetosCollapse, aetosCandidates } from '@/lib/omega/aetos';
import { psephosEncode, psephosContract, psephosCollapse, PSEPHOS_FORMATS } from '@/lib/omega/psephos';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = 'bench/z47/corpus/changelog/svenstaro_miniserve.md';
const t = fs.readFileSync(f, 'utf8');

const p: any = polytroposEncode(t, enc);
const pc = String(p.decoderPrompt).slice(String(p.wire).length + 1);
console.log('polytropos wire', T(String(p.wire)), 'contract', T(pc));

// PSEPHOS 'in'
const ps = psephosCollapse(t, PSEPHOS_FORMATS);
const ps2: any = polytroposEncode(ps.text, enc);
const psc = psephosContract(ps.stats);
console.log('PSEPHOS  in: wire', T(String(ps2.wire)), 'contract', JSON.stringify(psc), T(psc),
  '=> total', T(String(ps2.wire)) + T(pc) + T(psc));

// AETOS 'in' with ONLY date8
const onlyDate8 = aetosCandidates(t).filter((c) => c.name === 'date8');
const as = aetosCollapse(t, onlyDate8);
const as2: any = polytroposEncode(as.text, enc);
const asc = aetosContract(as.stats);
console.log('AETOS(d8) in: wire', T(String(as2.wire)), 'contract', JSON.stringify(asc), T(asc),
  '=> total', T(String(as2.wire)) + T(pc) + T(asc));
console.log('collapsed text identical?', ps.text === as.text, '| collapsed', ps.stats.totalCollapsed, as.stats.totalCollapsed);

const full = aetosEncode(t, enc);
console.log('AETOS full: msg', full.messageTokens, full.parent + '/' + full.order, full.shapes.join(' '));
console.log('  contract', JSON.stringify(full.contract));
console.log('  wireTok', T(full.wire), 'contractTok', full.messageTokens - T(full.wire));
