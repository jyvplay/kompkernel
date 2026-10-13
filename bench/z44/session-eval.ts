// Z44: measure the ANAMNESIS session codec against (a) raw and (b) the same messages
// each sent as its own chat (contract every time), on eight real sessions.
import fs from 'node:fs';
import { buildSessions } from './sessions';
import { anamnesisEncodeSession, anamnesisDecodeWith, anamnesisMessagePrompt, createSession, anamnesisEncodeMessage } from '@/lib/omega/anamnesis';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript } from '@/lib/omega/chiron';

const enc = (process.env.ENC ?? 'o200k_base') as EncodingName;
const OUT = process.env.OUT!;
const withDae = process.env.DAE === '1';
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);

const rows: any[] = [];
for (const s of buildSessions()) {
  if (only.length && !only.includes(s.name)) continue;
  console.log(`\n== ${s.name}  (${s.messages.length} messages)`);
  console.log(`   ${s.how}`);
  const t0 = Date.now();
  const r = anamnesisEncodeSession(s.messages, enc);
  const ms = Date.now() - t0;

  // independent re-decode from the wires alone, in a fresh pass
  const session = createSession(enc);
  let reExact = true;
  const prompts: string[] = [];
  for (let i = 0; i < s.messages.length; i++) {
    const wire = r.messages[i].wire;
    const C = s.messages.slice(0, i).join('\n');
    // Rebuild the rule table the way the reader would: the PRIOR messages only.
    // This wire's own tape defines the rest, and the decoder splits the two by
    // "which letters were already defined".
    const tbl = rebuildTable(r.messages.slice(0, i), enc);
    const dec = anamnesisDecodeWith(wire, tbl, C);
    if (dec !== s.messages[i]) { reExact = false; console.log(`   m${i} INDEPENDENT RE-DECODE MISMATCH`); }
    prompts.push(anamnesisMessagePrompt(r.messages[i]));
    void session;
  }

  let daeTot = 0;
  if (withDae) for (const m of s.messages) { try { daeTot += daedalusEncode(m, enc).messageTokens; } catch { daeTot += countTokens(m, enc); } }

  const rawTot = r.rawTokens;
  console.log(`   raw=${rawTot}  session=${r.sessionTokens}  isolated(contract every msg)=${r.isolatedTokens}  saving vs isolated=${r.savingVsIsolated} (${(100 * r.savingVsIsolated / r.isolatedTokens).toFixed(1)}%)  exact=${r.exactAll} reDecode=${reExact} ${ms}ms`);
  if (withDae) console.log(`   DAEDALUS per-message total=${daeTot}  ANAMNESIS ${r.sessionTokens}  delta=${r.sessionTokens - daeTot}`);
  for (const m of r.messages) {
    console.log(`     m${m.index} raw=${m.rawTokens} msg=${m.messageTokens} mode=${m.mode} new=${m.newRules} recollected=${m.reusedRules} copies=${m.copies}`);
  }
  rows.push({
    session: s.name, how: s.how, messages: s.messages.length, raw: rawTot,
    sessionTokens: r.sessionTokens, isolatedTokens: r.isolatedTokens, savingVsIsolated: r.savingVsIsolated,
    exact: r.exactAll, reDecode: reExact, ms, daeTotal: withDae ? daeTot : null,
    perMessage: r.messages.map(m => ({ i: m.index, raw: m.rawTokens, msg: m.messageTokens, mode: m.mode, newRules: m.newRules, reused: m.reusedRules, copies: m.copies })),
  });
  fs.writeFileSync(OUT, rows.map(x => JSON.stringify(x)).join('\n') + '\n');
}

/** Rebuild the cumulative rule table from the wires a reader has already seen. */
function rebuildTable(msgs: Array<{ wire: string }>, e: EncodingName) {
  const out: Array<{ glyph: string; text: string; toks: string[] }> = [];
  for (const m of msgs) {
    const w = m.wire;
    if (!w.startsWith('§')) continue;
    const cut = w.indexOf('¶', 1);
    if (cut < 0) continue;
    const tape = w.slice(1, cut);
    if (!tape) continue;
    const sc = CHIRON_SCRIPTS.find((s2) => chironInScript(s2, tape[0].codePointAt(0)!));
    if (!sc) continue;
    const seen = new Set<string>(out.map(o => o.glyph));
    let i = 0;
    while (i < tape.length) {
      const gl = tape[i];
      if (seen.has(gl)) break;
      seen.add(gl);
      let j = i + 1;
      while (j < tape.length && !(chironInScript(sc, tape[j].codePointAt(0)!) && !seen.has(tape[j]))) j++;
      const text = tape.slice(i + 1, j);
      out.push({ glyph: gl, text, toks: tokenStrs(text, e) });
      i = j;
    }
  }
  return out;
}
function tokenStrs(t: string, e: EncodingName) { return tokenStrings(t, e).map(x => x.s); }
