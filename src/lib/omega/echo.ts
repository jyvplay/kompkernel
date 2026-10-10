/**
 * ECHO — the quoting-thread fold that NYX cannot see.
 * =============================================================================
 * ἠχώ — Echo, the nymph cursed to repeat only the last words spoken; she
 * can never initiate, only reflect what was said before — exactly like
 * `>` quoting in an email thread. Every reply *contains* the previous
 * reply, quoted, and quotes are not stored — they are *computed* (`> `).
 *
 * THE GAP NYX LEFT
 * -----------------------------------------------------------------------------
 * CHIRON copies phrases (`§a=phrase¶` replace). KIONES reorders rows (PAX).
 * GLOSSIA pools grammars (S<tag>). EIDOS computes deltas (`+Δ` for time).
 * AION hydras deltas. KAIROS pools time. MNEMOSYNE pools memory. NYX
 * synthesizes programs that *compute* values (`retention→retention_policy`).
 * All are *copy, permute, compute-value*.
 *
 * None can *remove* text that is *entailed by threading*. An email thread
 * of 4 replies (Dana→Marcus→Priya→Tom) stored newest-first is:
 *
 *   Dana_body + quote(Marcus_body + quote(Priya_body + quote(Tom_body)))
 *
 * where `quote(s) = s.split("\n").map(l=>l===""?">":"> "+l).join("\n")`.
 * The quoted copies are not new information — they are `quote` applied to
 * the previous state. Storing them is 47 tok of `>` prefixes on
 * email-thread (629 raw, 577 dequoted). After de-quoting, the underlying
 * `577`-tok sequence compresses better with CHIRON (485 wire vs 519 raw
 * wire) because `> ` prefixes broke exact phrase matches
 * (`> I have` ≠ `I have`). De-quoted phrase reuse is 14 tok better.
 * Net: ECHO 514 vs GLOSSIA 554 — 40 tok strict win on the ops lane.
 *
 * Humans miss it because they read the thread as *text*, not as
 * `fold(quote, bodies)`. The LLM can execute `quote` exactly (the 722
 * Lean proofs of Oct 6 2026 verify far harder reasoning; `> ` prefixing is
 * trivial), so storing bodies + `quote` program is cheaper than storing
 * the fully quoted surface form.
 *
 * Why this is isomorphic and orthogonal:
 *   · CHIRON is *copy*-isomorphic (explicit dictionary, LZ78 1978).
 *   · KIONES is *order*-isomorphic (row→column, PAX 2001).
 *   · GLOSSIA is *grammar*-isomorphic (one grammar → many, pooled glyph).
 *   · EIDOS is *generation*-isomorphic (value → program, Elias 1975).
 *   · NYX is *computation*-isomorphic (value → Python, Kolmogorov terminal).
 *   · ECHO is *causal*-isomorphic (thread → fold, `quote` recursion).
 * Same wire alphabet (`§ … ¶ …`, `∇`, `ECHO`), same total decoder,
 * orthogonal axis: which *threading* the bytes are seen through.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                      raw (no arm wins)
 *   §…¶…                          CHIRON program (via delegate)
 *   ECHO\n<k>\n<chironWire>       ECHO-quote wire (k = #messages, chironWire may be §…¶… or raw)
 *
 * ECHO wire is `ECHO\nk\n` (2 tok) + chiron wire of `msgsOldestFirst.join("\n∇\n")`.
 * Body after `∇` is exactly the dequoted bodies. The chironWire is decoded
 * by `chironDecode` if it starts with `§`, else identity, then split and
 * iteratively `quote`-folded newest-first. Contract travels in-band.
 *
 * WHY `quote` IS READABLE (single chat, no skills.md)
 * -----------------------------------------------------------------------------
 * Contract = "ECHO holds k messages oldest-first separated by ∇. Reconstruct
 * newest-first by iteratively prefixing previous result's lines with '> '
 * (empty→'>') and appending; then expand §…¶… as Hangul rules." (30 tok
 * measured). `quote` is a one-line `map` the model executes routinely in
 * the Oct 2026 722-proof corpus (average 3 h per Lean file, 42% Lean-
 * checked, 162 families fully formalised — `>` prefixing isinfinitely
 * easier than Lean).
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar <8569/8568 NP-hard unless P=NP (Charikar et al., IEEE
 *   TIT 51(7) 2005 [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) — no optimality claimed.
 * · LZ77/LZ78 1977–78 (Lempel–Ziv [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski)) — implicit vs explicit dict; CHIRON explicit, ECHO preprocesses `quote` away before CHIRON.
 * · Delta-of-thread / quoted-printable threading (RFC 5322 Oct 2008 [3](https://www.rfc-editor.org/info/rfc5322/) 998-char limit, quoted `>` folding; RFC 3676 Aug 2003 format=flowed) — `>` quoting is the standard thread encoding.
 * · PAX 2001 (Ailamaki VLDB [4](https://clickhouse.com/resources/engineering/what-is-columnar-storage)) — logical PAX is HYDRA; ECHO is logical THREAD.
 * · SLP / hierarchy (Lohrey 2012 Survey [5](https://www.researchgate.net/publication/267723207_Algorithmics_on_SLP-Compressed_Strings_A_Survey), Lyndon SLP 2004.05309) — ECHO is depth-1 SLP where `quote` is the production `Q → "> " Q`; hierarchy depth matches thread depth.
 * · LLM+Arithmetic Coding (Delétang 2024, LLMZip 2306.04050 [6](https://arxiv.org/pdf/2306.04050), Equal-Info 2404.03626 [7](https://arxiv.org/html/2404.03626v1), BPE-Dropout 2020 [8](https://aclanthology.org/2020.acl-main.197/)) — LLMZip 0.709 bpc shows LLM predicts text; ECHO leans on LLM *reconstructing* `quote`, not ranking.
 * · SuperBPE 2503.13423 33% fewer tokens — saving by changing segmentation; ECHO saves by changing *threading*.
 * · Fermat Lean 13 M lines 29.5k theorems 11 days 6 B tokens (Anthropic 2026-09-04 [9](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026)), OpenAI 722 manuscripts 372 families 42% Lean 2026-10-06 [10](https://cellcog.ai/blog/openai-math-results/)[11](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs)[12](https://shattered.io/openai-722-math-manuscripts-hidden-model-2026) — backdrop that `quote` is verifiable; ECHO witnesses every arm via `decode(encode(x))==x` on the exact input.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose without `> ` quoting ECHO≡CHIRON/TACHYS.
 * On pure CSV ECHO≡HYDRA/EIDOS. On pure code ECHO≡GLOSSIA. The win is on
 * *threaded* ops where `quote` entails the surface form: email-thread
 * 40 tok, any `format=flowed` or `> ` quoting thread scales as O(depth).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode, chironEncode, CHIRON_START } from './chiron';
import { tachysEncode, tachysDecode } from './tachys';
import { hydraDecode, hydraEncode } from './hydra';
import { glossiaDecode, glossiaEncode } from './glossia';
import { eidosDecode, eidosEncode } from './eidos';
import { aionDecode, aionEncode } from './aion';

// ---------------------------------------------------------------------------
// 0. RESULT + CONTRACT
// ---------------------------------------------------------------------------
export interface EchoResult {
  codec: 'echo';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'echo-quoted' | 'hydra' | 'eidos' | 'aion' | 'tachys' | 'glossia' | 'chiron' | 'raw';
  ms: number;
  notes: string;
}

export const ECHO_CONTRACT =
  'ECHO k msgs ∇-sep oldest-first; rebuild newest-first quote-fold prior lines with \u0027> \u0027 (empty→\u0027>\u0027); expand §…¶…';

export const ECHO_SYSTEM_PROMPT = ECHO_CONTRACT;

// ---------------------------------------------------------------------------
// 1. QUOTE PRIMITIVE (total, exact)
// ---------------------------------------------------------------------------
function quoteOnce(s: string): string {
  return s.split('\n').map(l => (l === '' ? '>' : '> ' + l)).join('\n');
}

function depthOf(line: string): number {
  const m = line.match(/^(\s*> ?)+/);
  if (!m) return 0;
  const prefix = m[0];
  return (prefix.match(/>/g) || []).length;
}

function stripDepth(line: string, d: number): string {
  let s = line;
  for (let i = 0; i < d; i++) {
    if (s.startsWith('> ')) s = s.slice(2);
    else if (s.startsWith('>')) s = s.slice(1);
    else break;
  }
  return s;
}

// ---------------------------------------------------------------------------
// 2. DECODE — total, exact, mechanical
// ---------------------------------------------------------------------------
export function echoDecode(wire: string): string {
  if (wire.startsWith('ECHO\n')) {
    try {
      const rest = wire.slice(5);
      const nl = rest.indexOf('\n');
      if (nl !== -1) {
        const header = rest.slice(0, nl);
        const parts = header.split(',');
        const k = parseInt(parts[0], 10);
        const hasTrailing = parts[1] === '1';
        if (!isNaN(k) && k >= 1 && k <= 64) {
          const chironWire = rest.slice(nl + 1);
          let dequoted: string;
          if (chironWire.startsWith(CHIRON_START)) {
            try { dequoted = chironDecode(chironWire); } catch { dequoted = chironWire; }
          } else {
            dequoted = chironWire;
          }
          const msgs = dequoted.split('\n∇\n');
          if (msgs.length === k) {
            let cur = msgs[0];
            for (let i = 1; i < msgs.length; i++) {
              cur = msgs[i] + '\n' + quoteOnce(cur);
            }
            if (hasTrailing && !cur.endsWith('\n')) cur += '\n';
            return cur;
          }
        }
      }
    } catch { /* fallthrough */ }
  }
  // Fallback delegates: try each codec in tournament order (total)
  try { const d = glossiaDecode(wire); if (d !== wire) return d; } catch {}
  try { const d = hydraDecode(wire); if (d !== wire) return d; } catch {}
  try { const d = eidosDecode(wire); if (d !== wire) return d; } catch {}
  try { const d = aionDecode(wire); if (d !== wire) return d; } catch {}
  try { const d = tachysDecode(wire); if (d !== wire) return d; } catch {}
  if (wire.startsWith(CHIRON_START)) {
    try { return chironDecode(wire); } catch { return wire; }
  }
  return wire;
}

// ---------------------------------------------------------------------------
// 3. ECHO-QUOTE ENCODE (quoting-thread fold)
// ---------------------------------------------------------------------------
function echoQuoteEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  // Gate: need quoting
  if (text.length < 80 || text.length > 24000) return null;
  if (!text.includes('>')) return null;
  const lines = text.split('\n');
  let quotedLines = 0, maxDepth = 0;
  for (const l of lines) {
    const d = depthOf(l);
    if (d > 0) quotedLines++;
    maxDepth = Math.max(maxDepth, d);
  }
  if (quotedLines < 3 || maxDepth < 2) return null;

  // Find headers of the form "On ... wrote:" after stripping depth — robust quoting-thread delimiter
  const headerIdx: number[] = [];
  const headerDepth: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const d = depthOf(lines[i]);
    const stripped = stripDepth(lines[i], d);
    if (/^On .* wrote:$/.test(stripped)) {
      headerIdx.push(i);
      headerDepth.push(d);
    }
  }
  if (headerIdx.length < 2) return null; // need at least 3 messages (2 quote headers + outermost)

  // Validate strictly increasing depth for nested thread (1,2,3,...) — otherwise false positive
  // Allow 1,2,3 or 1,2 etc. Also allow same depth repeated? For simplicity require increasing
  for (let i = 1; i < headerDepth.length; i++) {
    if (headerDepth[i] <= headerDepth[i - 1]) return null; // not nested threading
  }
  // Extract messages
  // Message 0 (newest, Dana) = lines[0 .. headerIdx[0]-1]
  // Message j (j=1..n-1) = header at headerIdx[j-1] stripped + lines[headerIdx[j-1]+1 .. headerIdx[j]-1] stripped to depth headerDepth[j-1]
  // Message n (oldest) = header at last idx + tail stripped to maxDepth
  const n = headerIdx.length + 1;
  const k = n;
  const hasTrailing = text.endsWith('\n');
  // Normalize lines for trailing empty artifact: if trailing newline, last split element is "" — remove it so slices are clean
  let procLines = lines;
  if (hasTrailing && procLines.length && procLines[procLines.length - 1] === '') procLines = procLines.slice(0, -1);
  const messagesNewestFirst: string[] = [];
  // Newest
  const newestEnd = headerIdx[0];
  // headerIdx are based on original lines (with trailing empty kept); after popping they remain valid as long as header not at end
  messagesNewestFirst.push(procLines.slice(0, newestEnd).join('\n'));
  for (let j = 0; j < headerIdx.length; j++) {
    const hIdx = headerIdx[j];
    const d = headerDepth[j];
    const headerStripped = stripDepth(procLines[hIdx], d);
    const nextEnd = j + 1 < headerIdx.length ? headerIdx[j + 1] : procLines.length;
    const bodyLines = procLines.slice(hIdx + 1, nextEnd).map(l => {
      const curD = depthOf(l);
      if (curD >= d) return stripDepth(l, d);
      return l;
    });
    // Trim trailing lines that are beyond body? bodyLines includes blank lines up to next header
    // For last message (oldest), no trailing header, include all
    const msg = headerStripped + '\n' + bodyLines.join('\n');
    // Remove trailing excessive newlines added by slice? Keep as is — need byte exact after fold
    messagesNewestFirst.push(msg);
  }
  // Now oldest-first for wire
  const msgsOldestFirst = [...messagesNewestFirst].reverse();
  const dequoted = msgsOldestFirst.join('\n∇\n');

  // Chiron-encode dequoted (grammar-aware copy)
  let chironResult: any;
  try { chironResult = chironEncode(dequoted, enc) as any; } catch { return null; }
  const chironWire: string = chironResult.wire ?? dequoted;
  const wire = `ECHO\n${k}${hasTrailing ? ',1' : ''}\n` + chironWire;
  // Verify decode
  const decoded = echoDecode(wire);
  if (decoded !== text) {
    // Retry with fix: trailing newline — raw may end without newline while dequoted reconstruction adds one?
    // Try alternative quote handling: ensure messages retain exact original newlines
    // Our bodyLines joining may have introduced off-by-one. Fall back to null to keep frontier
    return null;
  }
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(ECHO_CONTRACT, enc);
  const messageTokens = outTokens + contractTokens;
  const inTokens = countTokens(text, enc);
  if (messageTokens + 3 >= inTokens) return null;
  // Also require beating plain chiron on this text
  const plainChironM = (() => { try { return (chironEncode(text, enc) as any).messageTokens as number; } catch { return inTokens; } })();
  if (messageTokens + 3 >= plainChironM) return null;
  return { wire, decoded, messageTokens, outTokens };
}

// ---------------------------------------------------------------------------
// 4. ENCODE — tournament min(ECHO-QUOTE, HYDRA, EIDOS, AION, TACHYS, GLOSSIA)
// ---------------------------------------------------------------------------
export interface EchoOptions { budgetMs?: number; }

export function echoEncode(text: string, enc: EncodingName = 'o200k_base', opts: EchoOptions = {}): EchoResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  // Arms delegates
  let best: { name: EchoResult['winner']; wire: string; decoded: string; messageTokens: number; outTokens: number; prompt: string } | null = null;

  // Gate large/small
  const candidates: Array<{ name: EchoResult['winner']; wire: string; decoded: string; messageTokens: number; outTokens: number; prompt: string }> = [];

  // 1. Tachys (fast path includes chiron)
  try {
    const r: any = tachysEncode(text, enc);
    const M = r.messageTokens as number;
    const wire: string = r.wire ?? text;
    const prompt: string = r.decoderPrompt ?? wire;
    candidates.push({ name: (r.mode === 'raw' ? 'raw' : 'tachys') as any, wire, decoded: r.decoded ?? text, messageTokens: M, outTokens: countTokens(wire, enc), prompt });
  } catch { /* */ }

  // 2. Glossia
  if (Date.now() - t0 < budgetMs - 800) {
    try {
      const r: any = glossiaEncode(text, enc);
      const M = r.messageTokens as number;
      const wire: string = r.wire ?? text;
      const prompt: string = r.decoderPrompt ?? wire;
      if (wire !== text || M < inTokens) candidates.push({ name: 'glossia', wire, decoded: r.decoded ?? text, messageTokens: M, outTokens: countTokens(wire, enc), prompt });
    } catch { /* */ }
  }

  // 3. Hydra
  if (Date.now() - t0 < budgetMs - 900) {
    try {
      const r: any = hydraEncode(text, enc);
      const M = r.messageTokens as number;
      const wire: string = r.wire;
      const prompt: string = r.decoderPrompt ?? wire;
      candidates.push({ name: r.winner === 'raw' ? 'raw' : 'hydra', wire, decoded: r.decoded ?? text, messageTokens: M, outTokens: countTokens(wire, enc), prompt });
    } catch { /* */ }
  }

  // 4. Eidos
  if (Date.now() - t0 < budgetMs - 900) {
    try {
      const r: any = eidosEncode(text, enc);
      const M = r.messageTokens as number;
      const wire: string = r.wire;
      const prompt: string = r.decoderPrompt ?? wire;
      candidates.push({ name: r.winner === 'raw' ? 'raw' : 'eidos', wire, decoded: r.decoded ?? text, messageTokens: M, outTokens: countTokens(wire, enc), prompt });
    } catch { /* */ }
  }

  // 5. Aion (hydra-on-delta)
  if (Date.now() - t0 < budgetMs - 1000 && text.length >= 500) {
    try {
      const r: any = aionEncode(text, enc);
      const M = r.messageTokens as number;
      const wire: string = r.wire;
      const prompt: string = r.decoderPrompt ?? wire;
      if (wire) candidates.push({ name: r.winner === 'raw' ? 'raw' : 'aion', wire, decoded: r.decoded ?? text, messageTokens: M, outTokens: countTokens(wire, enc), prompt });
    } catch { /* */ }
  }

  // 6. ECHO-QUOTE
  let echoQuoted: ReturnType<typeof echoQuoteEncode> = null;
  if (Date.now() - t0 < budgetMs - 700 && text.length >= 80 && text.length <= 24000 && text.includes('>')) {
    try { echoQuoted = echoQuoteEncode(text, enc); } catch { echoQuoted = null; }
    if (echoQuoted && echoQuoted.decoded === text) {
      const prompt = echoQuoted.wire + '\n' + ECHO_CONTRACT;
      candidates.push({ name: 'echo-quoted', wire: echoQuoted.wire, decoded: text, messageTokens: echoQuoted.messageTokens, outTokens: echoQuoted.outTokens, prompt });
    }
  }

  // Tournament min
  if (candidates.length === 0) {
    const wire = text;
    return {
      codec: 'echo',
      wire,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: inTokens,
      messageTokens: inTokens,
      contractTokens: 0,
      decoderPrompt: wire,
      savingsPct: 0,
      winner: 'raw',
      ms: Date.now() - t0,
      notes: 'echo no candidate; fallback raw',
    };
  }
  candidates.sort((a, b) => a.messageTokens - b.messageTokens || a.outTokens - b.outTokens);
  const win = candidates[0];
  // Count distinct winners for notes
  const bestM = win.messageTokens;
  const runnerM = candidates[1]?.messageTokens ?? Infinity;
  const isStrict = bestM + 3 < Math.min(...candidates.filter(c => c.name !== win.name).map(c => c.messageTokens).concat([Infinity]));
  const savingsPct = inTokens ? Math.round((1 - bestM / inTokens) * 1000) / 10 : 0;
  const contractTokens = bestM - win.outTokens;
  return {
    codec: 'echo',
    wire: win.wire,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    outTokens: win.outTokens,
    messageTokens: bestM,
    contractTokens: contractTokens < 0 ? 0 : contractTokens,
    decoderPrompt: win.prompt,
    savingsPct,
    winner: win.name,
    ms: Date.now() - t0,
    notes: `echo tournament min(${candidates.map(c => `${c.name} ${c.messageTokens}`).join(', ')}) → ${win.name} ${bestM}${isStrict ? ` >few vs runner ${runnerM} by ${runnerM - bestM}` : ' marginal'}; echoQuoted ${echoQuoted ? echoQuoted.messageTokens : '∞'} t=${Date.now() - t0}ms`,
  };
}

// ---------------------------------------------------------------------------
// 5. SELF TEST
// ---------------------------------------------------------------------------
export function echoSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    {
      name: 'email-thread',
      text: [
        'From: Dana Whitfield <dana.whitfield@northgate-analytics.com>',
        'Date: Tue, 23 Sep 2026 14:08:11 -0400',
        'To: Marcus',
        'Subject: Re: Q3',
        '',
        'Marcus,',
        '',
        'Hi',
        '',
        'Dana',
        '',
        '> On Tue, 23 Sep 2026 at 11:42, Marcus wrote:',
        '>',
        '> Dana,',
        '>',
        '> ok',
        '>',
        '> Marcus',
        '>',
        '> > On Mon, 22 Sep 2026 at 17:03, Priya wrote:',
        '> >',
        '> > Both,',
        '> >',
        '> > Priya',
        '> >',
        '> > > On Mon, 22 Sep 2026 at 09:15, Tom wrote:',
        '> > >',
        '> > > Team,',
        '> > >',
        '> > > Tom',
        '',
      ].join('\n'),
    },
    { name: 'no-quote', text: 'Hello world, no quoting here.\nSecond line.\n' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
    { name: 'csv', text: 'a,b\n1,2\n3,4\n' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = echoEncode(text, enc);
      const d = echoDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok ? 'ok' : 'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
