/**
 * REPAIR-R1 — local grammar compression by repeated-bigram substitution.
 *
 * This is a small exact Re-Pair-style lane: repeatedly replace the most useful
 * repeated adjacent token pair with a fresh one-token nonterminal. Later rules
 * may reference earlier nonterminals, so the result is a straight-line grammar
 * rather than a flat phrase dictionary. The complete wire is admitted only
 * after recursive expansion and real-BPE costing succeed.
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { ideographPool } from './strata';

const START = '[RP1]\n';
const END = '[/RP1]\n';
const MAX_RULES = 80;

interface Rule { alias: string; left: string; right: string }
export interface RepairResult {
  wire: string; decoded: string; exact: boolean; applied: boolean;
  inTokens: number; outTokens: number; rules: number; notes: string;
}

function expandSymbol(symbol: string, rules: Map<string, Rule>, guard: Set<string>): string {
  const r = rules.get(symbol);
  if (!r || guard.has(symbol)) return symbol;
  const next = new Set(guard); next.add(symbol);
  return expandSymbol(r.left, rules, next) + expandSymbol(r.right, rules, next);
}

export function repairDecode(wire: string): string {
  if (!wire.startsWith(START)) return wire;
  const cut = wire.indexOf(END, START.length);
  if (cut < 0) return wire;
  const rules = new Map<string, Rule>();
  for (const line of wire.slice(START.length, cut).split('\n').filter(Boolean)) {
    try {
      const x = JSON.parse(line) as [string, string, string];
      if (!Array.isArray(x) || x.length !== 3) return wire;
      rules.set(x[0], { alias: x[0], left: x[1], right: x[2] });
    } catch { return wire; }
  }
  const body = wire.slice(cut + END.length);
  let out = '';
  for (const symbol of body) out += expandSymbol(symbol, rules, new Set());
  return out;
}

function assemble(rules: Rule[], symbols: string[]): string {
  return START + rules.map((r) => JSON.stringify([r.alias, r.left, r.right])).join('\n') + '\n' + END + symbols.join('');
}

export function repairEncode(text: string, enc: EncodingName = 'o200k_base'): RepairResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): RepairResult => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, rules: 0, notes });
  if (text.length < 96 || !text) return identity('below grammar admission floor');
  const free = ideographPool(enc).filter((x) => !text.includes(x));
  if (free.length < 1) return identity('no free nonterminal');
  const toks = tokenStrings(text, enc).map((x) => x.s);
  let symbols = toks.slice();
  const rules: Rule[] = [];
  let bestWire = text;
  let bestTokens = inTokens;

  for (let pass = 0; pass < MAX_RULES && symbols.length > 1 && pass < free.length; pass++) {
    const counts = new Map<string, { left: string; right: string; n: number }>();
    for (let i = 0; i + 1 < symbols.length; i++) {
      const left = symbols[i], right = symbols[i + 1];
      const key = left + '\u0000' + right;
      const old = counts.get(key);
      if (old) old.n++; else counts.set(key, { left, right, n: 1 });
    }
    let best: { left: string; right: string; n: number } | null = null;
    for (const c of counts.values()) if (c.n >= 2 && (!best || c.n > best.n)) best = c;
    if (!best) break;
    const alias = free[pass];
    const next: string[] = [];
    for (let i = 0; i < symbols.length;) {
      if (i + 1 < symbols.length && symbols[i] === best.left && symbols[i + 1] === best.right) { next.push(alias); i += 2; }
      else { next.push(symbols[i]); i++; }
    }
    const rule: Rule = { alias, left: best.left, right: best.right };
    const candidateRules = [...rules, rule];
    const wire = assemble(candidateRules, next);
    const tokens = countTokens(wire, enc);
    if (tokens < bestTokens) {
      rules.push(rule); symbols = next; bestWire = wire; bestTokens = tokens;
    } else break;
  }
  if (rules.length === 0) return identity('no positive-gain grammar');
  const decoded = repairDecode(bestWire);
  if (decoded !== text || bestTokens >= inTokens) return identity('exactness or cost gate rejected grammar');
  return { wire: bestWire, decoded, exact: true, applied: true, inTokens, outTokens: bestTokens, rules: rules.length, notes: `REPAIR grammar: ${rules.length} rules · exact BPE-gated` };
}

export const REPAIR_SYSTEM_PROMPT = 'REPAIR-R1 exact: [RP1] JSON rule rows [alias,left,right] define nonterminals; after [/RP1], expand every alias recursively into left then right; unbound characters are literal.';
