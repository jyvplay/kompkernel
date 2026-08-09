'use client';

/**
 * src/components/OmegaLab.tsx
 * =============================================================================
 * Ω-Ξ LAB — real-tokenizer instrumentation, hand-trace, self-tests and a
 * full-repository codec audit. Persistent workspace component: it mounts BELOW
 * the shipped application and changes none of its behaviour.
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ENCODINGS,
  buildAtomAlphabet,
  countTokens,
  tokenStrings,
  type AtomAlphabet,
  type EncodingName,
} from '../lib/omega/bpe';
import {
  alephAnalyze,
  EXTENDED_FIXTURE,
  HANDTRACE_SAMPLE,
  hasCompressionStreams,
  OMEGA_XI_SYSTEM_PROMPT,
  omegaSelfTest,
  omegaXiCompress,
  type OmegaXiResult,
  type SelfTest,
} from '../lib/omega/atom-codec';
import { runCodecAudit, type CodecRun } from '../lib/omega/registry';
import { CM_INFO } from '../lib/omega/cm';
import { ltpProject, ltpSelfTest, type LtpResult, type LtpSelfTest } from '../lib/omega/ltp';
import {
  compressPrometheusICDM,
  universalAdaptiveRoute,
  run120kScaleBenchmark,
  type PrometheusResult,
  type UniversalRouteDecision,
} from '../lib/omega/prometheus-icdm';
import {
  buildJanusSession,
  janusRoi,
  janusSelfTest,
  type JanusSession,
  type JanusSelfTest,
} from '../lib/omega/janus';
import {
  zetaEncode,
  zetaSelfTest,
  type ZetaResult,
  type ZetaSelfTest,
} from '../lib/omega/zeta';
import {
  compressHypercubeV5,
  runHypercube120kBenchmark,
  type HypercubeResult,
} from '../lib/omega/hypercube-v5';

function pct(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
        ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
      }`}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function Cell({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
      <div className={`font-mono text-lg font-semibold ${good ? 'text-emerald-300' : 'text-slate-200'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function OmegaLab() {
  const [enc, setEnc] = useState<EncodingName>('o200k_base');
  const [alpha, setAlpha] = useState<AtomAlphabet | null>(null);
  const [building, setBuilding] = useState(true);
  const [text, setText] = useState(HANDTRACE_SAMPLE);
  const [res, setRes] = useState<OmegaXiResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tests, setTests] = useState<SelfTest[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [audit, setAudit] = useState<CodecRun[] | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [deep, setDeep] = useState(false);
  const [progress, setProgress] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(true);
  const runId = useRef(0);

  // v7: LTP, Prometheus ICDM, Universal Router, Janus duplex
  const [ltpRes, setLtpRes] = useState<LtpResult | null>(null);
  const [ltpTests, setLtpTests] = useState<LtpSelfTest[] | null>(null);
  const [promRes, setPromRes] = useState<PrometheusResult | null>(null);
  const [route, setRoute] = useState<UniversalRouteDecision | null>(null);
  const [hasMw, setHasMw] = useState(false);
  const [bench120k, setBench120k] = useState<string>('');
  const [bench120kBusy, setBench120kBusy] = useState(false);
  const [janus, setJanus] = useState<JanusSession | null>(null);
  const [janusTests, setJanusTests] = useState<JanusSelfTest[] | null>(null);
  const [duplexBusy, setDuplexBusy] = useState(false);
  const [zetaRes, setZetaRes] = useState<ZetaResult | null>(null);
  const [zetaTests, setZetaTests] = useState<ZetaSelfTest[] | null>(null);
  const [hcRes, setHcRes] = useState<HypercubeResult | null>(null);
  const [hcBench, setHcBench] = useState('');
  const [hcBenchBusy, setHcBenchBusy] = useState(false);

  const runDuplexSuite = useCallback(async () => {
    setDuplexBusy(true);
    try {
      setLtpRes(ltpProject(text, enc));
      setLtpTests(ltpSelfTest(enc));
      setPromRes(await compressPrometheusICDM(text, enc));
      setRoute(await universalAdaptiveRoute(text, enc, hasMw));
      setJanus(buildJanusSession(text, enc));
      setJanusTests(janusSelfTest(enc));
      setZetaRes(await zetaEncode(text, enc));
      setZetaTests(await zetaSelfTest(enc));
      setHcRes(await compressHypercubeV5(text, enc));
    } catch (e) {
      setBench120k(`suite error: ${(e as Error).message}`);
    }
    setDuplexBusy(false);
  }, [text, enc, hasMw]);

  const runHcBench = useCallback(async () => {
    setHcBenchBusy(true);
    setHcBench('running V5 Hypercube 120k benchmark…');
    try {
      const r = await runHypercube120kBenchmark(enc);
      setHcBench(`${r.passed ? '✓ PASS' : '✗ FAIL'} · ${r.details}`);
    } catch (e) { setHcBench(`✗ ${(e as Error).message}`); }
    setHcBenchBusy(false);
  }, [enc]);

  const run120k = useCallback(async () => {
    setBench120kBusy(true);
    setBench120k('running 120k-char benchmark…');
    try {
      const r = await run120kScaleBenchmark(enc);
      setBench120k(`${r.passed ? '✓ PASS' : '✗ FAIL'} · ${r.details}`);
    } catch (e) {
      setBench120k(`✗ ${(e as Error).message}`);
    }
    setBench120kBusy(false);
  }, [enc]);

  // Alphabet construction scans the live vocabulary; keep the first paint free.
  useEffect(() => {
    setBuilding(true);
    setAlpha(null);
    const t = setTimeout(() => {
      try {
        setAlpha(buildAtomAlphabet(enc));
      } catch {
        setAlpha(null);
      }
      setBuilding(false);
    }, 30);
    return () => clearTimeout(t);
  }, [enc]);

  useEffect(() => {
    if (!alpha) return;
    const id = ++runId.current;
    setBusy(true);
    const t = setTimeout(() => {
      void omegaXiCompress(text, enc)
        .then((r) => {
          if (runId.current === id) {
            setRes(r);
            setErr(r.ok ? null : (r.error ?? 'unknown encode failure'));
          }
        })
        .catch((e: Error) => {
          if (runId.current === id) {
            setRes(null);
            setErr(e.message);
          }
        })
        .finally(() => {
          if (runId.current === id) setBusy(false);
        });
    }, 220);
    return () => clearTimeout(t);
  }, [text, enc, alpha]);

  const copy = useCallback(async () => {
    if (!res) return;
    try {
      await navigator.clipboard.writeText(res.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }, [res]);

  const runTests = useCallback(async () => {
    setTesting(true);
    setTests(null);
    try {
      setTests(await omegaSelfTest(enc));
    } catch (e) {
      setTests([{ name: 'suite crashed', pass: false, detail: (e as Error).message }]);
    }
    setTesting(false);
  }, [enc]);

  const runAudit = useCallback(async () => {
    setAuditing(true);
    setAudit(null);
    try {
      const rows = await runCodecAudit(text, enc, deep, (d, t2, label) =>
        setProgress(`${d}/${t2} · ${label}`),
      );
      rows.sort((a, b) => b.savingsPct - a.savingsPct);
      setAudit(rows);
    } catch (e) {
      setProgress((e as Error).message);
    }
    setAuditing(false);
    setProgress('');
  }, [text, enc, deep]);

  const inTokens = alpha ? countTokens(text, enc) : 0;
  const traceIn = alpha ? tokenStrings(text, enc).slice(0, 16) : [];
  const outAtoms = res ? (res.output.match(/\S+/g) ?? []).slice(0, 12) : [];
  const outIds = res ? tokenStrings(res.output, enc).slice(0, 12) : [];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-fuchsia-900/40 bg-slate-900/60 p-4">
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fuchsia-200">
              Ω-Ξ ATOM CODEC · real-BPE laboratory
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Byte-exact lossless · every number below is produced by{' '}
              <span className="font-mono text-slate-300">gpt-tokenizer</span> (tiktoken port), never
              by a chars/4 estimate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ENCODINGS.map((e) => (
              <button
                key={e.key}
                onClick={() => setEnc(e.key)}
                title={e.models}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  enc === e.key
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- alphabet ---------------- */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
          {building && <div className="text-amber-300">Scanning live vocabulary and verifying atoms…</div>}
          {!building && !alpha && <div className="text-rose-300">Alphabet construction failed.</div>}
          {alpha && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-fuchsia-300">
                  Atom alphabet
                </span>
                <span className="font-mono text-slate-300">
                  {alpha.atoms.length.toLocaleString()} atoms · {alpha.bits} bits/atom ·{' '}
                  {alpha.candidates.toLocaleString()} verified candidates from{' '}
                  {alpha.scanned.toLocaleString()} vocab ids · fp {alpha.fingerprint} ·{' '}
                  {alpha.buildMs.toFixed(0)} ms
                </span>
                <Badge ok={alpha.proof.exact} label={`concat proof ${alpha.proof.tokens}/${alpha.proof.sample}`} />
              </div>
              <div className="font-mono text-[11px] leading-relaxed text-slate-400">
                longest atoms:{' '}
                <span className="text-emerald-300">{alpha.atoms.slice(0, 8).join(' ·')}</span>
                {' · '}
                mean {alpha.meanChars.toFixed(2)} chars/atom (min {alpha.minChars}, max {alpha.maxChars})
              </div>
              <div className="text-[11px] text-slate-500">
                Each atom is a verified single token of shape{' '}
                <span className="font-mono">&quot; &quot; + [A-Za-z]+</span>. The tiktoken
                pre-tokenizer cannot merge across the leading space, so a concatenation of N atoms
                costs exactly N tokens — proven above against the live encoder, not assumed.
              </div>
            </div>
          )}
        </div>

        {/* ---------------- input ---------------- */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
              <span>Source</span>
              <span className="font-mono normal-case text-slate-500">
                {text.length} chars · {new TextEncoder().encode(text).length} bytes · {inTokens} real tokens
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="h-56 w-full resize-y rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none ring-1 ring-slate-800 focus:ring-fuchsia-500"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setText(HANDTRACE_SAMPLE)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-fuchsia-300 hover:bg-slate-700"
              >
                Load hand-trace fixture
              </button>
              <button
                onClick={() => setText(HANDTRACE_SAMPLE.repeat(8))}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-fuchsia-300 hover:bg-slate-700"
              >
                ×8 (scaling probe)
              </button>
              <button
                onClick={() => setText(EXTENDED_FIXTURE)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-fuchsia-300 hover:bg-slate-700"
              >
                Extended (350ch + 150 lines prose)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
              <span>Ω-Ξ wire {busy && <span className="text-amber-400">· computing…</span>}</span>
              <button onClick={copy} className="font-mono normal-case text-fuchsia-400 hover:text-fuchsia-200">
                {copied ? 'copied' : 'copy'}
              </button>
            </div>
            <div className="h-56 w-full overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-relaxed text-emerald-200 ring-1 ring-slate-800 break-words">
              {res?.output || (res ? '' : '…')}
            </div>
            {res && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge ok={res.exact} label="byte-exact round trip" />
                <Badge ok={res.invariantHolds} label={`1.000 token/atom (${res.tokenPerAtom.toFixed(3)})`} />
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                  {res.codecName}
                </span>
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-rose-700/50 bg-rose-500/10 p-3 font-mono text-[11px] text-rose-200">
            Ω-Ξ refused to emit a wire: {err}
          </div>
        )}

        {/* ---------------- headline metrics ---------------- */}
        {res && res.ok && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Cell label="real tokens in" value={String(res.inTokens)} />
            <Cell label="real tokens out" value={String(res.outTokens)} good={res.outTokens < res.inTokens} />
            <Cell label="real token savings" value={pct(res.savingsPct)} good={res.savingsPct > 0} />
            <Cell label="payload bits/char" value={res.bitsPerInputChar.toFixed(3)} />
            <Cell label="src chars / out token" value={res.charsPerOutToken.toFixed(2)} />
            <Cell label="encode ms" value={res.encodeMs.toFixed(0)} />
          </div>
        )}

        {/* ---------------- ℵ Aleph structural analysis strip ---------------- */}
        {res && res.ok && (() => {
          const raw = new TextEncoder().encode(text);
          const a = alephAnalyze(raw);
          const savedBytes = a.rawBytes - a.encodedBytes;
          const savedPct = a.rawBytes ? (savedBytes / a.rawBytes) * 100 : 0;
          const totalChunks = a.intRuns + a.decRuns + a.isoDt + a.isoDate + a.timeHms + a.timeHm;
          return (
            <div className="mt-3 rounded-xl border border-fuchsia-700/40 bg-fuchsia-950/30 p-3 text-[11px] leading-relaxed text-fuchsia-100">
              <div className="mb-1 flex items-center justify-between font-semibold uppercase tracking-wider text-fuchsia-300">
                <span>ℵ Aleph v3 typed-chunk analysis (structural prepass diagnostic)</span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                    res.codecName.startsWith('ℵ') ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  {res.codecName.startsWith('ℵ') ? '✓ Aleph pipeline won' : `winner: ${res.codecName}`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono text-[11px] sm:grid-cols-6">
                <div><span className="text-slate-400">INT≥4:</span> {a.intRuns}</div>
                <div><span className="text-slate-400">DEC:</span> {a.decRuns}</div>
                <div><span className="text-slate-400">ISO_DT:</span> {a.isoDt}</div>
                <div><span className="text-slate-400">ISO_DATE:</span> {a.isoDate}</div>
                <div><span className="text-slate-400">HH:MM:SS:</span> {a.timeHms}</div>
                <div><span className="text-slate-400">HH:MM:</span> {a.timeHm}</div>
              </div>
              <div className="mt-1 font-mono text-slate-300">
                pre-entropy bytes: {a.rawBytes} → {a.encodedBytes} (
                <span className={savedBytes > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {savedBytes > 0 ? '−' : '+'}
                  {Math.abs(savedBytes)}B, {savedBytes > 0 ? '−' : '+'}
                  {Math.abs(savedPct).toFixed(1)}%
                </span>
                ) · {totalChunks} typed chunks · {a.escapes} 0x1F literals escaped
              </div>
              <div className="mt-1 text-[10px] text-fuchsia-300/80">
                ℵ savings shown above are <em>byte-count</em> deltas before entropy coding. The
                final atom count depends on how the entropy coder (CM-Ω or LZ77-seeded Brotli)
                compresses the reduced byte stream. When Aleph does not win, another pipeline in the
                13-candidate portfolio produced a smaller payload for this input.
              </div>
            </div>
          );
        })()}

        {/* ---------------- limitation & system prompt ---------------- */}
        <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100">
          <span className="font-semibold">Scope, stated honestly.</span> Ω-Ξ is a{' '}
          <em>transport</em> codec: it is byte-exact and token-minimal, and it requires the exact programmatic decompressor specification below to read. Unlike semantic or lossy summarization notation, an LLM should not attempt to decompress or guess the plaintext of an Ω-Ξ wire directly from the surface word-salad in-context. If you need a wire an LLM can reason over directly without execution tools, use the semantic codecs in the application above — they trade fidelity for readability. The two solve different problems and both are measured in the audit below.
          {!hasCompressionStreams() && (
            <span className="block pt-1 text-amber-300">
              CompressionStream is unavailable in this runtime, so deflate/gzip/brotli candidates were
              skipped; the CM stage carries the payload alone.
            </span>
          )}
          <div className="mt-3 rounded-lg border border-amber-600/40 bg-slate-950/80 p-3 font-mono text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between font-sans text-xs font-semibold uppercase tracking-wider text-amber-300">
              <span>Verbatim System Prompt &amp; Decompressor Specification for LLMs / Agents</span>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(OMEGA_XI_SYSTEM_PROMPT);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                  } catch {}
                }}
                className="font-mono normal-case text-amber-400 hover:text-amber-200"
              >
                {copied ? 'copied!' : 'copy exact sys prompt'}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300">
              {OMEGA_XI_SYSTEM_PROMPT}
            </pre>
          </div>
        </div>

        {/* ---------------- landscape ---------------- */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Where this sits in the 2026 literature
          </span>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              <span className="text-slate-300">LTSC, arXiv:2506.00307</span> — lossless token-sequence
              compression with meta-tokens reports token reduction of{' '}
              <span className="font-mono">15.7–27%</span> while keeping the wire LLM-readable.
            </li>
            <li>
              <span className="text-slate-300">Dictionary-encoding lossless prompt compression,
              arXiv:2604.13066</span> — reports ratios up to <span className="font-mono">80%</span>{' '}
              on highly repetitive LogHub 2.0 data, with in-context exact-match ≈0.99; ratios on
              heterogeneous prose are far lower.
            </li>
            <li>
              LLMLingua-2 / Selective-Context / CPC are <em>lossy</em> selectors: they delete
              content. They cannot appear in a byte-exact comparison at all.
            </li>
          </ul>
          <p className="mt-1">
            Those figures are quoted from the papers, not measured here. Ω-Ξ occupies the different
            corner of the design space they leave open: machine-decodable, byte-exact, and optimised
            against the tokenizer itself rather than against the language model&apos;s comprehension.
            The only number that matters for a claim is the one the audit table below computes on
            your own input.
          </p>
        </div>

        {/* ---------------- economics & strategic analysis ---------------- */}
        {res && res.ok && (() => {
          const inCostPer1M = 2.50; // GPT-5.4 input $/1M
          const outCostPer1M = 15.00; // GPT-5.4 output $/1M (reasoning tokens billed here too)
          const cachedCostPer1M = 0.25; // GPT-5.4 cached input $/1M
          const inputSaved = res.inTokens - res.outTokens;
          const costSavedPerCall = inputSaved > 0 ? (inputSaved / 1_000_000) * inCostPer1M : 0;
          const costAt1MCallsInput = costSavedPerCall * 1_000_000;
          const decoderPromptTokens = countTokens(OMEGA_XI_SYSTEM_PROMPT, enc);
          const netSaved = inputSaved - decoderPromptTokens;
          const netPositive = netSaved > 0;
          return (
            <div className="mt-4 rounded-xl border border-rose-700/40 bg-rose-950/30 p-3 text-[11px] leading-relaxed text-rose-100">
              <span className="mb-2 block font-semibold uppercase tracking-wider text-rose-300">
                ⚠ Token Economics Reality Check (July 2026 pricing, stated honestly)
              </span>
              <div className="space-y-2 text-rose-100/90">
                <p>
                  <span className="font-semibold text-white">Q: Does Ω-Ξ actually reduce total token cost?</span>
                  {' '}Only in <strong>API middleware / tool-use / MCP pipelines</strong> where the decoder runs
                  as <em>executed code</em> (not LLM reasoning). If the LLM itself must decompress the payload
                  via CoT, you are transferring input tokens → output/reasoning tokens, which cost{' '}
                  <span className="font-mono text-rose-300">4-8× more</span> per token (GPT-5.4: input $2.50/M,
                  output $15/M; o3: input $2/M, output $8/M). That is a net cost <em>increase</em>.
                </p>
                <p>
                  <span className="font-semibold text-white">Q: Do hidden CoT / reasoning tokens count as output?</span>
                  {' '}<span className="text-rose-300 font-semibold">Yes.</span> Across all providers (OpenAI o3/o4,
                  Anthropic Claude extended thinking, Google Gemini thinking), reasoning tokens are billed at
                  the <strong>output token rate</strong> and are invisible in the response. A single o3 request
                  can burn 5,000-20,000 reasoning tokens at $8/M each. They do not benefit from prompt caching.
                </p>
                <p>
                  <span className="font-semibold text-white">Q: Does this work in web UI chat interfaces?</span>
                  {' '}<span className="text-rose-300 font-semibold">No.</span> Ω-Ξ transport requires code execution
                  to decompress. ChatGPT / Claude.ai / Gemini web UIs have no code execution sandbox for
                  arbitrary TypeScript imports. The LLM would attempt in-context decompression via reasoning
                  tokens, fail on the arithmetic coding, and produce garbage. For web UI chat,{' '}
                  <strong>the semantic codecs above (CaveMan, DRAGI, Wenyan, etc.) are the correct tool</strong>
                  {' '}— they produce text the LLM reads directly with zero decompression cost.
                </p>
                <p>
                  <span className="font-semibold text-white">Q: When IS Ω-Ξ the right tool?</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>API middleware / proxy layer</strong>: Compress prompts in storage/transit, decompress
                    programmatically before sending to the LLM. Saves input tokens with zero output token cost.</li>
                  <li><strong>MCP / tool-calling agents</strong>: LLM invokes <code className="font-mono text-rose-300">omega_xi_decode</code>
                    {' '}as a tool call. Tool execution is not billed as reasoning tokens.</li>
                  <li><strong>Prompt database / retrieval</strong>: Store compressed; decompress at query time.</li>
                  <li><strong>Context window management</strong>: Fit more content into fixed-size context windows
                    (1M token models still have hard limits; compression extends effective capacity).</li>
                  <li><strong>Prompt caching amplification</strong>: Compressed prompts have higher cache hit rates
                    because the prefix is shorter and more likely to match. Cached input costs{' '}
                    <span className="font-mono">$0.25/M</span> vs $2.50/M (90% discount).</li>
                </ul>
                <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/80 p-2 font-mono text-[11px] text-slate-300">
                  <div className="text-slate-500 mb-1">Live cost estimate for this input (GPT-5.4, $2.50/$15 per 1M):</div>
                  <div>
                    Input saved: {inputSaved} tokens · ${costSavedPerCall.toFixed(6)}/call ·{' '}
                    <span className="text-emerald-300">${costAt1MCallsInput.toFixed(2)}/1M calls</span>
                  </div>
                  <div>
                    Decoder system prompt overhead: {decoderPromptTokens} tokens ·{' '}
                    net {netPositive ? 'savings' : 'LOSS'}: {netSaved} tokens ·{' '}
                    <span className={netPositive ? 'text-emerald-300' : 'text-rose-300'}>
                      {netPositive ? '✓ net positive' : '✗ overhead exceeds savings — use semantic codecs instead'}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    Break-even: input must be {'>'}{decoderPromptTokens} tokens for Ω-Ξ to pay for the decoder prompt.
                    For shorter inputs, semantic compression (CaveMan/Wenyan/DRAGI) saves more at zero overhead.
                  </div>
                </div>
                <p className="mt-2">
                  <span className="font-semibold text-white">The blindspot you identified:</span>
                  {' '}The real opportunity is <strong>not</strong> compressing short chat messages — it is
                  compressing <strong>system prompts, RAG context, and few-shot examples</strong> that are
                  repeated across millions of API calls. A 10K-token system prompt compressed to 3K tokens
                  saves $17.50/M calls at GPT-5.4 input rates. With prompt caching, the savings compound:
                  the compressed prefix is more likely to stay in cache. The venture-investable product is
                  an <strong>API proxy / middleware layer</strong> (like a CDN for prompts) that sits between
                  the application and the LLM API, compresses/caches automatically, and passes savings through
                  — not a web UI chat tool.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ---------------- v7: LTP · Prometheus ICDM · Router · Janus ---------------- */}
        <div className="mt-4 rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                v7 Suite · LTP + OMEGA-V4 Prometheus (ICDM) + Universal Router + OMEGA-V5 Janus
              </span>
              <p className="text-[11px] text-slate-500">
                Web-UI-compatible codecs: no in-context decompression, zero CoT decode tokens.
                All numbers below are real tokenizer counts computed live.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-slate-400">
                <input type="checkbox" checked={hasMw} onChange={(e) => setHasMw(e.target.checked)} />
                host has middleware
              </label>
              <button
                onClick={runDuplexSuite}
                disabled={duplexBusy || !alpha}
                className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                {duplexBusy ? 'running…' : 'Run v7 suite'}
              </button>
            </div>
          </div>

          {ltpRes && (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px]">
              <div className="font-semibold text-cyan-200">
                LTP · Lossless Token Projection (whitespace → local residual)
              </div>
              <div className="font-mono text-slate-300">
                {ltpRes.inTokens}→{ltpRes.outTokens} tok ({pct(ltpRes.savingsPct)}) · applied=
                {String(ltpRes.applied)} · {ltpRes.opCount} residual ops ({ltpRes.residualBytes}B
                stored locally, never sent) · exact={String(ltpRes.exact)}
              </div>
              <div className="text-slate-500">{ltpRes.notes}</div>
              {ltpTests && (
                <div className={`mt-1 font-mono ${ltpTests.every((t) => t.pass) ? 'text-emerald-300' : 'text-rose-300'}`}>
                  self-tests: {ltpTests.filter((t) => t.pass).length}/{ltpTests.length} passed
                  {ltpTests.filter((t) => !t.pass).map((t, i) => (
                    <div key={i} className="text-rose-300">✗ {t.name} — {t.detail}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {promRes && (
            <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px]">
              <div className="font-semibold text-cyan-200">
                OMEGA-V4 Prometheus · In-Context Dictionary Meta-Tokens (web-UI wire)
              </div>
              <div className="font-mono text-slate-300">
                {promRes.inTokens}→{promRes.outTokens} tok (−{promRes.savingsPct.toFixed(1)}%) ·{' '}
                {promRes.dictionaryCount} dictionary entries · byte-exact local recovery=
                {String(promRes.exact)} · encode {promRes.encodeMs.toFixed(0)}ms / decode{' '}
                {promRes.decodeMs.toFixed(1)}ms
              </div>
              {promRes.dictionaryCount > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px]">
                  {promRes.candidates.slice(0, 6).map((c) => (
                    <span key={c.metaToken} className="rounded bg-slate-800/80 px-1.5 py-0.5">
                      <span className="text-cyan-300">{c.metaToken}</span>
                      <span className="text-slate-500">×{c.count}·net+{c.netTokenSavings}t</span>
                    </span>
                  ))}
                  {promRes.candidates.length > 6 && (
                    <span className="text-slate-500">+{promRes.candidates.length - 6} more</span>
                  )}
                </div>
              )}
              <div className="text-slate-500">
                Comprehension-without-decompression fidelity (≈0.99) is quoted from arXiv:2604.13066
                benchmarks, not re-measured here; token counts and byte-exact recovery ARE measured live.
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={run120k}
                  disabled={bench120kBusy}
                  className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-slate-700 disabled:opacity-40"
                >
                  run 120k-char scale benchmark
                </button>
                {bench120k && <span className="font-mono text-[10px] text-slate-300">{bench120k}</span>}
              </div>
            </div>
          )}

          {route && (
            <div className="mt-2 rounded-lg border border-indigo-700/40 bg-indigo-950/40 p-2 text-[11px]">
              <div className="font-semibold text-indigo-200">
                Universal Adaptive Router → <span className="font-mono">{route.selectedTier}</span>
              </div>
              <div className="font-mono text-slate-300">
                {route.recommendedCodec} · {route.inTokens}→{route.outTokens} tok (
                {route.savingsPct.toFixed(1)}%) · middleware={String(route.requiresMiddleware)} ·
                CoT penalty={route.cotTokenPenalty}
              </div>
              <div className="text-slate-500">{route.explanation}</div>
            </div>
          )}

          {janus && (
            <div className="mt-2 rounded-lg border border-fuchsia-700/40 bg-fuchsia-950/30 p-2 text-[11px]">
              <div className="font-semibold text-fuchsia-200">
                OMEGA-V5 JANUS · Duplex Token Contract (terminal architecture — compresses the
                OUTPUT side, where tokens cost 5-8×)
              </div>
              <div className="font-mono text-slate-300">
                face-1 input: {janus.inputOriginalTokens}→{janus.inputWireTokens} tok (saved{' '}
                {janus.inputSavedTokens}) · {janus.entries.length} contract entries · header{' '}
                {janus.contractHeaderTokens} tok · built {janus.buildMs.toFixed(0)}ms
              </div>
              {(() => {
                const roi = janusRoi(janus, 3, 0.6);
                return (
                  <div className="font-mono text-slate-300">
                    face-2 ROI @60% adoption, 3 uses/entry: ~
                    {roi.expectedOutputTokensSaved.toFixed(0)} output tok saved · net $
                    {roi.netDollarsSavedPerCall.toFixed(6)}/call · break-even adoption{' '}
                    {(roi.breakEvenAdoptionRate * 100).toFixed(1)}%
                  </div>
                );
              })()}
              <div className="text-slate-500">
                The reply arrives abbreviated at the expensive output rate and is expanded locally by
                deterministic string replacement — zero decode tokens. Code fences are exempted by
                contract (models write code verbatim; prose explainers carry the dictionary). Whether
                the model honours the contract is behavioural: the ROI prices adoption explicitly and
                expansion is idempotent/safe on non-conforming replies.
              </div>
              {janusTests && (
                <div className={`mt-1 font-mono ${janusTests.every((t) => t.pass) ? 'text-emerald-300' : 'text-rose-300'}`}>
                  self-tests: {janusTests.filter((t) => t.pass).length}/{janusTests.length} passed
                  {janusTests.filter((t) => !t.pass).map((t, i) => (
                    <div key={i} className="text-rose-300">✗ {t.name} — {t.detail}</div>
                  ))}
                </div>
              )}
              {janus && janus.entries.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] text-slate-500 uppercase">Janus Contract Header (paste before your prompt):</div>
                  <textarea readOnly value={janus.contractHeader} className="h-24 w-full rounded bg-slate-950 p-2 font-mono text-[11px] text-fuchsia-200 ring-1 ring-slate-800 resize-y" />
                  <div className="mt-1 mb-1 text-[10px] text-slate-500 uppercase">Janus Face-1 Wire (compressed input):</div>
                  <textarea readOnly value={janus.inputWire} className="h-24 w-full rounded bg-slate-950 p-2 font-mono text-[11px] text-emerald-200 ring-1 ring-slate-800 resize-y" />
                </div>
              )}
            </div>
          )}

          {zetaRes && (
            <div className="mt-2 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-2 text-[11px]">
              <div className="font-semibold text-emerald-200">
                OMEGA-ZETA (Ζ) · Duplex Sidecar (LTP + Prometheus orthogonal composition)
              </div>
              <div className="font-mono text-slate-300">
                mode={zetaRes.mode} · {zetaRes.inTokens}→{zetaRes.outTokens} tok ({pct(zetaRes.savingsPct)}) · LTP={zetaRes.ltpSavedTokens} · Prom={zetaRes.prometheusSavedTokens} · residual={zetaRes.residual.length} ops ({zetaRes.residualBytes}B local) · dict={zetaRes.dictionary.length} · exact={String(zetaRes.exact)}
              </div>
              <div className="text-slate-500">{zetaRes.notes}</div>
              {zetaTests && (
                <div className={`mt-1 font-mono ${zetaTests.every((t) => t.pass) ? 'text-emerald-300' : 'text-rose-300'}`}>
                  self-tests: {zetaTests.filter((t) => t.pass).length}/{zetaTests.length} passed
                  {zetaTests.filter((t) => !t.pass).map((t, i) => (
                    <div key={i} className="text-rose-300">✗ {t.name} — {t.detail}</div>
                  ))}
                </div>
              )}
              {zetaRes.mode !== 'IDENTITY' && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] text-slate-500 uppercase">ZETA Wire (paste into chat UI — directly readable):</div>
                  <textarea readOnly value={zetaRes.wire} className="h-32 w-full rounded bg-slate-950 p-2 font-mono text-[11px] text-emerald-200 ring-1 ring-slate-800 resize-y" />
                  {zetaRes.arenaDecoderBlock && (
                    <>
                      <div className="mt-1 mb-1 text-[10px] text-slate-500 uppercase">Arena.ai Embedded Decoder (run in code interpreter for byte-exact recovery):</div>
                      <textarea readOnly value={zetaRes.arenaDecoderBlock} className="h-28 w-full rounded bg-slate-950 p-2 font-mono text-[10px] text-cyan-200 ring-1 ring-slate-800 resize-y" />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {hcRes && (
            <div className="mt-2 rounded-lg border border-violet-700/40 bg-violet-950/30 p-2 text-[11px]">
              <div className="font-semibold text-violet-200">
                OMEGA-V5 HYPERCUBE · Bi-Directional Client Bridge (arena.ai / Code Interpreter)
              </div>
              <div className="font-mono text-slate-300">
                {hcRes.inTokens}→{hcRes.outTokens} tok (−{hcRes.savingsPct.toFixed(1)}% input) · est output channel: −{hcRes.outputChannelSavingsEstPct.toFixed(1)}% · dict={hcRes.dictionaryCount} · exact={String(hcRes.exact)} · {hcRes.encodeMs.toFixed(0)}ms
              </div>
              {hcRes.dictionaryCount > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] text-slate-500 uppercase">Hypercube V5 Wire (paste into scripted chat UI):</div>
                  <textarea readOnly value={hcRes.output} className="h-32 w-full rounded bg-slate-950 p-2 font-mono text-[11px] text-violet-200 ring-1 ring-slate-800 resize-y" />
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <button onClick={runHcBench} disabled={hcBenchBusy} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-violet-300 hover:bg-slate-700 disabled:opacity-40">
                  run V5 Hypercube 120k benchmark
                </button>
                {hcBench && <span className="font-mono text-[10px] text-slate-300">{hcBench}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- hand trace ---------------- */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <button
            onClick={() => setShowTrace((v) => !v)}
            className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200"
          >
            {showTrace ? '▾' : '▸'} Hand trace (live, real values)
          </button>
          {showTrace && res && (
            <div className="mt-3 flex flex-col gap-3 font-mono text-[11px] text-slate-300">
              <div>
                <div className="text-slate-500">STEP 1 · source → real tokens</div>
                <div>
                  chars={text.length} bytes={res.inBytes} tokens={res.inTokens} (
                  {(text.length / Math.max(1, res.inTokens)).toFixed(2)} chars/token)
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {traceIn.map((t, i) => (
                    <span key={i} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-slate-300">
                      {t.id}
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300">{JSON.stringify(t.s)}</span>
                    </span>
                  ))}
                  {res.inTokens > 16 && <span className="text-slate-500">… +{res.inTokens - 16} more</span>}
                </div>
              </div>

              <div>
                <div className="text-slate-500">STEP 2 · payload portfolio (byte-minimal wins)</div>
                <table className="mt-1 w-full text-left">
                  <thead className="text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="pb-1 font-medium">candidate</th>
                      <th className="pb-1 font-medium">payload bytes</th>
                      <th className="pb-1 font-medium">atoms</th>
                      <th className="pb-1 font-medium">exact</th>
                      <th className="pb-1 font-medium">selected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {res.candidates.map((c) => (
                      <tr key={c.id} className={c.selected ? 'text-emerald-300' : 'text-slate-400'}>
                        <td className="py-1">{c.name}</td>
                        <td className="py-1">{c.bytes}</td>
                        <td className="py-1">{c.atoms}</td>
                        <td className="py-1">{c.ok ? '✓' : `✗ ${c.note ?? ''}`}</td>
                        <td className="py-1">{c.selected ? '◀ winner' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="text-slate-500">STEP 3 · bit budget → atom count</div>
                <div>
                  header={res.headerBits} bits (4 codec + varint length) · payload=
                  {res.payloadBytes}B={res.payloadBits} bits · total={res.totalBits} bits
                </div>
                <div>
                  atoms = ceil({res.totalBits} / {res.bitsPerAtom}) ={' '}
                  {Math.ceil(res.totalBits / res.bitsPerAtom)} · emitted={res.atomCount}
                </div>
              </div>

              <div>
                <div className="text-slate-500">STEP 4 · digits → atoms (first 12)</div>
                <div className="flex flex-wrap gap-1">
                  {outAtoms.map((a, i) => (
                    <span key={i} className="rounded bg-slate-800/80 px-1.5 py-0.5">
                      <span className="text-slate-500">
                        {res.alphabet.index.get(' ' + a)}
                        {' → '}
                      </span>
                      <span className="text-emerald-300">{a}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-500">STEP 5 · wire → real tokens (invariant check)</div>
                <div className="flex flex-wrap gap-1">
                  {outIds.map((t, i) => (
                    <span key={i} className="rounded bg-slate-800/80 px-1.5 py-0.5">
                      {t.id}
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300">{JSON.stringify(t.s)}</span>
                    </span>
                  ))}
                </div>
                <div className={res.invariantHolds ? 'text-emerald-300' : 'text-rose-300'}>
                  atoms={res.atomCount} tokens={res.outTokens} → ratio={res.tokenPerAtom.toFixed(4)}
                </div>
              </div>

              <div>
                <div className="text-slate-500">STEP 6 · decode → byte comparison</div>
                <div className={res.exact ? 'text-emerald-300' : 'text-rose-300'}>
                  decoded length={res.decoded.length} · identical={String(res.exact)} · decode
                  {' '}{res.decodeMs.toFixed(0)} ms
                </div>
                <div className="text-slate-500">
                  CM engine: {CM_INFO.models} models · {CM_INFO.mixerInputs} mixer inputs ·{' '}
                  {(CM_INFO.memoryBytes / 1048576).toFixed(1)} MB tables · {CM_INFO.priorChars}-char
                  warm-start prior
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- self tests ---------------- */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Executable self-test suite
            </span>
            <button
              onClick={runTests}
              disabled={testing || !alpha}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {testing ? 'running…' : 'Run tests'}
            </button>
          </div>
          {tests && (
            <div className="mt-2 flex flex-col gap-1 font-mono text-[11px]">
              <div className={tests.every((t) => t.pass) ? 'text-emerald-300' : 'text-rose-300'}>
                {tests.filter((t) => t.pass).length}/{tests.length} passed
              </div>
              {tests.map((t, i) => (
                <div key={i} className={t.pass ? 'text-slate-300' : 'text-rose-300'}>
                  {t.pass ? '✓' : '✗'} {t.name} <span className="text-slate-500">— {t.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- audit ---------------- */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Whole-repository codec audit · real tokens
              </span>
              <p className="text-[11px] text-slate-500">
                Runs every codec in the package on the source above, including the 16 omega-pareto
                portfolios that the shipped page never mounts, driven with{' '}
                <span className="font-mono">metric:&quot;tokens&quot;</span> and a real tokenizer
                injected through the repo&apos;s own <span className="font-mono">makeExactTokenCounter</span>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-slate-400">
                <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                deep (all 16 layers + TW7, slow)
              </label>
              <button
                onClick={runAudit}
                disabled={auditing || !alpha}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {auditing ? 'auditing…' : 'Run audit'}
              </button>
            </div>
          </div>
          {auditing && <div className="mt-2 font-mono text-[11px] text-amber-300">{progress}</div>}
          {audit && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] uppercase text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="pb-2 font-medium">codec</th>
                    <th className="pb-2 font-medium">class</th>
                    <th className="pb-2 font-medium">real tok</th>
                    <th className="pb-2 font-medium">real savings</th>
                    <th className="pb-2 font-medium">repo estimator</th>
                    <th className="pb-2 font-medium">estimate error</th>
                    <th className="pb-2 font-medium">exact</th>
                    <th className="pb-2 font-medium">ms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {audit.map((r) => (
                    <tr
                      key={r.key}
                      className={r.key === 'omega_xi' ? 'bg-fuchsia-950/30 text-fuchsia-100' : 'text-slate-300'}
                    >
                      <td className="py-1.5 font-sans">{r.label}</td>
                      <td className="py-1.5 font-sans text-slate-500">{r.family}</td>
                      <td className="py-1.5">
                        {r.inTokens}→{r.error ? '—' : r.outTokens}
                      </td>
                      <td
                        className={`py-1.5 font-bold ${
                          r.error ? 'text-slate-600' : r.savingsPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {r.error ? 'error' : pct(r.savingsPct)}
                      </td>
                      <td className="py-1.5 text-slate-500">{r.error ? '—' : pct(r.heuristicSavingsPct)}</td>
                      <td
                        className={`py-1.5 ${
                          Math.abs(r.estimateErrorPts) > 10 ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {r.error ? '—' : `${r.estimateErrorPts > 0 ? '+' : ''}${r.estimateErrorPts.toFixed(1)} pts`}
                      </td>
                      <td className="py-1.5">
                        {r.error ? (
                          <span className="text-rose-400" title={r.error}>
                            fail
                          </span>
                        ) : r.exact === null ? (
                          <span className="text-slate-500">lossy</span>
                        ) : r.exact ? (
                          <span className="text-emerald-400">byte-exact</span>
                        ) : (
                          <span className="text-amber-400">not exact</span>
                        )}
                      </td>
                      <td className="py-1.5 text-slate-500">{r.ms.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                &quot;repo estimator&quot; is what the shipped character-run heuristic reports for
                the same run. Where the estimate error column is large, the shipped metric is
                overstating or understating savings against the real tokenizer. Lossy rows cannot be
                compared to exact rows on savings alone — they are not solving the same problem.
              </p>
              <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-100">
                <span className="font-semibold">Audit finding (verified by source inspection).</span>{' '}
                The fields this repository names <span className="font-mono">realInTokens</span> /
                <span className="font-mono"> realOutTokens</span> / <span className="font-mono">realSavingsPct</span>,
                and the column the shipped page labels &quot;Real BPE Tok&quot;, are produced by{' '}
                <span className="font-mono">estimateTokensBPE()</span> in{' '}
                <span className="font-mono">neuralese-metrics.ts</span>, whose body is a character-run
                heuristic: <span className="font-mono">tokens += Math.max(1, Math.round(asciiRun / 4))</span>{' '}
                (its own comment reads <em>&quot;~4 chars/token for English&quot;</em>). It is not a BPE
                tokenizer. It cannot see digit chunking (BPE emits ≤3 digits per token), punctuation
                runs, casing splits or whitespace tokens, so it systematically <em>undercounts</em>{' '}
                CSV/JSON/numeric text. That estimator is not merely displayed — it is load bearing:
                it drives the &quot;BPE non-inflation gate&quot; in{' '}
                <span className="font-mono">omega-pareto-patch-v16</span> and candidate selection in{' '}
                <span className="font-mono">noether</span>, <span className="font-mono">caveholo</span>,{' '}
                <span className="font-mono">ib</span>, <span className="font-mono">holographic</span> and{' '}
                <span className="font-mono">hilbert</span>. A gate driven by an estimator can admit a
                wire that inflates real tokens. Nothing in the package was modified to make this
                point; the table above simply re-measures every one of them with the real encoder.
              </div>
              <div className="mt-2 rounded-lg border border-indigo-700/40 bg-indigo-500/10 p-2 text-[11px] leading-relaxed text-indigo-100">
                <span className="font-semibold">Second finding.</span> The omega-pareto portfolios
                default to <span className="font-mono">vectorCharCounter</span> and{' '}
                <span className="font-mono">metric:&quot;chars&quot;</span>, i.e. out of the box they
                optimise <em>characters</em>, not tokens. The rows above are run with{' '}
                <span className="font-mono">metric:&quot;tokens&quot;</span> and a real tokenizer
                injected through the repository&apos;s own{' '}
                <span className="font-mono">makeExactTokenCounter()</span> port — the integration the
                code was clearly designed for but never wired up.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
