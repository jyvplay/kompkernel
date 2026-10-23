/**
 * X42 screen 3 — WHY did the other lanes not ship?
 * Per lane, per candidate: the rejection reason.
 *   COLLIDE-k  another candidate with a bigger saving owns surviving width k
 *   AMBIG      adding it breaks exact invertibility or reader-unambiguity
 *   SHIPPED    accepted
 * No stack encode.
 */
import { readFileSync, existsSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { systoleRuns, systoleShapeOf, systoleDigits } from '@/lib/omega/systole';
import {
  apocopeFind, apocopeRender, apocopeApply, apocopeUndo, apocopeUnambiguous, type ApocopeTemplate,
} from '@/lib/omega/apocope';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

function runsOfLen(s: string, L: number): number {
  let n = 0;
  for (const m of s.matchAll(/\p{N}+/gu)) if (m[0].length === L) n++;
  return n;
}

for (const name of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  if (!existsSync(name)) { console.log(`${name} MISSING`); continue; }
  const text = readFileSync(name, 'utf8');
  const all = apocopeFind(text, enc);
  if (!all.length) { console.log(`\n${name}  (no candidates)`); continue; }
  console.log(`\n${name}`);
  const chosen: ApocopeTemplate[] = [];
  const used = new Set<number>();
  let added = true;
  const verdict = new Map<ApocopeTemplate, string>();
  while (added && chosen.length < 3) {
    added = false;
    for (const t of all) {
      if (used.has(t.keep) || chosen.length >= 3) continue;
      const blocked = all.some((u) => u.keep === t.keep && u.save > t.save && !chosen.includes(u));
      if (blocked) { verdict.set(t, 'COLLIDE-' + t.keep); continue; }
      if (!apocopeUnambiguous(text, [...chosen, t])) { verdict.set(t, 'AMBIG'); continue; }
      used.add(t.keep); chosen.push(t); added = true; verdict.set(t, 'SHIPPED');
    }
  }
  for (const t of all) {
    const v = verdict.get(t) ?? 'NOT-REACHED';
    let extra = '';
    if (v.startsWith('AMBIG')) {
      const cut = apocopeApply(text, [...chosen, t]);
      const rt = apocopeUndo(cut, [...chosen, t]) === text;
      const want = (chosen.filter((c) => c.keep === t.keep).reduce((s, c) => s + c.count, 0)) + t.count;
      const got = runsOfLen(cut, t.keep);
      extra = `  rt=${rt ? 'ok' : 'FAIL'} width${t.keep}: want ${want} got ${got}`;
    }
    console.log(`   ${v.padEnd(11)} keep=${String(t.keep).padStart(2)} n=${String(t.count).padStart(4)} save=${String(t.save).padStart(5)} ${apocopeRender(t).padEnd(18)}${extra}`);
  }
  const raw = chosen.reduce((s, t) => s + t.save, 0);
  console.log(`   -> shipped ${chosen.length}, raw=${raw}`);
}
void systoleRuns; void systoleShapeOf; void systoleDigits; void countTokens;
