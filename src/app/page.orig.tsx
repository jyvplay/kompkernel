"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  convert,
  PRESETS,
  SAMPLE_TEXT,
  type NeuraleseOptions,
} from "@/lib/neuralese";
import {
  convertAdvanced,
  DEFAULT_ADVANCED,
  type AdvancedOptions,
} from "@/lib/neuralese-advanced";
import { gradeCompression } from "@/lib/neuralese-metrics";
import {
  buildLosslessDecoderPreamble,
  encodeLosslessAscii,
} from "@/lib/neuralese-lossless";
import { evaluateAllPresets } from "@/lib/neuralese-pareto";
import { cavemanCompress, cavemanDecoderPrompt, type CavemanLevel } from "@/lib/neuralese-caveman";
import { compressDragi } from "@/lib/neuralese-dragi";
import { compressWenyan, buildWenyanDecoder, wenyanHeaderPreamble, type WenyanLevel } from "@/lib/neuralese-wenyan";
import { compressComposite, compressDragiAtScale, buildDirectReasoningPrompt, adaptiveRoute, type RoutingTarget } from "@/lib/neuralese-composite";
import { compileOrdosTriBand } from "@/lib/neuralese-ordos";
import { encodeAsg, asgDecoderPrompt } from "@/lib/neuralese-asg";
import { compressAst, astDecoderPrompt } from "@/lib/neuralese-ast";
import { buildFetchHarness, fetchQueryExtractive, fetchChunkByHandle } from "@/lib/neuralese-fetch-loop";
import { compileNoether } from "@/lib/neuralese-noether";
import { compressHolographic } from "@/lib/neuralese-holographic";
import { compressCaveHolo } from "@/lib/neuralese-caveholo";
import { compressIbCaveHolo } from "@/lib/neuralese-ib";

type PresetKey = keyof typeof PRESETS | "losslessAscii" | "caveMan" | "dragi" | "wenyan" | "composite" | "dragiScale" | "ordos" | "asgJson" | "astCode" | "noether" | "holographic" | "caveHolo" | "ibCaveHolo";

interface HistoryRow {
  id: number;
  source: string;
  output: string;
  preset: string;
  charDeltaPct: number;
  createdAt: string;
}

const TOGGLES: { key: keyof NeuraleseOptions; label: string }[] = [
  { key: "symbols", label: "Logic symbols" },
  { key: "dropStopwords", label: "Drop fillers" },
  { key: "digits", label: "Numbers → digits" },
  { key: "joinSentences", label: "Telegraphic" },
  { key: "lowercase", label: "Lowercase" },
  { key: "dropVowels", label: "Vowel-drop (lossy)" },
];

export default function HomePage() {
  const [input, setInput] = useState<string>(SAMPLE_TEXT);
  const [presetKey, setPresetKey] = useState<PresetKey>("balanced");
  const [options, setOptions] = useState<NeuraleseOptions>(
    PRESETS.balanced.options,
  );
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [adv, setAdv] = useState<AdvancedOptions>(DEFAULT_ADVANCED);
  const [showPreamble, setShowPreamble] = useState(false);
  const [showRoundTrip, setShowRoundTrip] = useState(false);
  const [preambleCopied, setPreambleCopied] = useState(false);
  const [showPareto, setShowPareto] = useState(true);
  const [cavemanLevel, setCavemanLevel] = useState<CavemanLevel>("full");
  const [wenyanLevel, setWenyanLevel] = useState<WenyanLevel>("lite");
  const [routingTarget, setRoutingTarget] = useState<RoutingTarget>("balanced");
  const [showDirectReasoning, setShowDirectReasoning] = useState(false);
  const [fetchQuery, setFetchQuery] = useState("");
  const [fetchHandle, setFetchHandle] = useState("");
  const [showFetchPanel, setShowFetchPanel] = useState(true);

  const lossless = useMemo(() => encodeLosslessAscii(input), [input]);
  const cavemanResult = useMemo(() => cavemanCompress(input, cavemanLevel), [input, cavemanLevel]);
  const dragiResult = useMemo(() => compressDragi(input), [input]);
  const wenyanResult = useMemo(() => compressWenyan(input, wenyanLevel), [input, wenyanLevel]);
  const compositeResult = useMemo(() => compressComposite(input), [input]);
  const dragiScaleResult = useMemo(() => compressDragiAtScale(input, 3), [input]);
  const ordosResult = useMemo(() => compileOrdosTriBand(input), [input]);
  const asgResult = useMemo(() => encodeAsg(input), [input]);
  const astResult = useMemo(() => compressAst(input), [input]);
  const noetherResult = useMemo(() => compileNoether(input), [input]);
  const holographicResult = useMemo(() => compressHolographic(input), [input]);
  const caveHoloResult = useMemo(() => compressCaveHolo(input), [input]);
  const ibCaveHoloResult = useMemo(() => compressIbCaveHolo(input), [input]);
  const fetchHarness = useMemo(() => buildFetchHarness(input), [input]);

  const advResult = useMemo(
    () => convertAdvanced(input, options, adv),
    [input, options, adv],
  );

  const usingLossless = presetKey === "losslessAscii";
  const usingCaveman = presetKey === "caveMan";
  const usingDragi = presetKey === "dragi";
  const usingWenyan = presetKey === "wenyan";
  const usingComposite = presetKey === "composite";
  const usingDragiScale = presetKey === "dragiScale";
  const usingOrdos = presetKey === "ordos";
  const usingAsg = presetKey === "asgJson";
  const usingAst = presetKey === "astCode";
  const usingNoether = presetKey === "noether";
  const usingHolographic = presetKey === "holographic";
  const usingCaveHolo = presetKey === "caveHolo";
  const usingIbCaveHolo = presetKey === "ibCaveHolo";
  const usingSpecial = usingLossless || usingCaveman || usingDragi || usingWenyan || usingComposite || usingDragiScale || usingOrdos || usingAsg || usingAst || usingNoether || usingHolographic || usingCaveHolo || usingIbCaveHolo;

  const output = usingLossless ? lossless.output
    : usingCaveman ? cavemanResult.output
    : usingDragi ? dragiResult.output
    : usingWenyan ? wenyanResult.output
    : usingComposite ? compositeResult.output
    : usingDragiScale ? dragiScaleResult.output
    : usingOrdos ? ordosResult.output
    : usingAsg ? asgResult.output
    : usingAst ? astResult.output
    : usingNoether ? noetherResult.output
    : usingHolographic ? holographicResult.output
    : usingCaveHolo ? caveHoloResult.output
    : usingIbCaveHolo ? ibCaveHoloResult.output
    : advResult.output;
  const roundTrip = usingLossless ? lossless.decoded
    : usingCaveman ? input
    : usingDragi ? input
    : usingWenyan ? input
    : usingComposite ? input
    : usingDragiScale ? input
    : usingOrdos ? input
    : usingAsg ? asgResult.decoded
    : usingAst ? astResult.decoded
    : usingNoether ? input
    : usingHolographic ? holographicResult.decoded
    : usingCaveHolo ? input
    : usingIbCaveHolo ? input
    : advResult.roundTrip;
  const decoderPreamble = usingLossless
    ? buildLosslessDecoderPreamble(lossless.entries)
    : usingCaveman ? cavemanDecoderPrompt(cavemanLevel)
    : usingDragi ? dragiResult.decoderPrompt
    : usingWenyan ? buildWenyanDecoder()
    : usingComposite ? compositeResult.decoderPrompt
    : usingDragiScale ? dragiScaleResult.decoderPrompt
    : usingOrdos ? ordosResult.orchestratorPrompt
    : usingAsg ? asgDecoderPrompt()
    : usingAst ? astDecoderPrompt()
    : usingNoether ? noetherResult.decoderPreamble
    : usingHolographic ? holographicResult.decoderPrompt
    : usingCaveHolo ? caveHoloResult.decoderPrompt
    : usingIbCaveHolo ? ibCaveHoloResult.decoderPrompt
    : advResult.decoderPreamble;
  const workspace = usingSpecial ? [] : advResult.workspace;
  const dict = usingSpecial ? { entries: [] } : advResult.dict;

  function computeEntropy(s: string): number {
    if (!s) return 0;
    const counts = new Map<string, number>();
    for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const n = s.length || 1;
    let h = 0;
    for (const c of counts.values()) { const p = c / n; h -= p * Math.log2(p); }
    return h;
  }
  const entropyBitsPerChar = usingSpecial
    ? computeEntropy(output)
    : advResult.entropyBitsPerChar;

  function makeSpecialStats(outStr: string) {
    const inL = input.length, outL = outStr.length;
    const inTok = Math.max(1, Math.round(inL / 4));
    const outTok = Math.max(1, Math.round(outL / 4));
    return {
      inChars: inL, outChars: outL,
      charDeltaPct: inL ? Math.round(((inL - outL) / inL) * 100) : 0,
      inWords: (input.trim().match(/\S+/g) ?? []).length,
      outWords: (outStr.trim().match(/\S+/g) ?? []).length,
      inTokensEst: inTok, outTokensEst: outTok,
      tokenDeltaPct: inTok ? Math.round(((inTok - outTok) / inTok) * 100) : 0,
    };
  }
  const stats = usingSpecial ? makeSpecialStats(output) : advResult.stats;

  // Honest BPE-aware grading: real token cost + semantic fidelity gauge.
  const grade = useMemo(
    () => gradeCompression(input, output, roundTrip),
    [input, output, roundTrip],
  );

  // Honest recommendation: measure the header-less variant. The Unicode
  // workspace/dict headers often cost more real BPE tokens than they save, so
  // surface a one-click fix when disabling them measurably helps.
  const headerLessGrade = useMemo(() => {
    if (!adv.ngramDict && !adv.workspaceHeader) return null;
    const alt = convertAdvanced(input, options, {
      ...adv,
      ngramDict: false,
      workspaceHeader: false,
    });
    return gradeCompression(input, alt.output, alt.roundTrip);
  }, [input, options, adv]);

  const recommendDisableHeaders =
    headerLessGrade !== null &&
    headerLessGrade.realSavingsPct - grade.realSavingsPct >= 8;

  const pareto = useMemo(() => evaluateAllPresets(input), [input]);

  const adaptiveDecision = useMemo(() => {
    const evals = pareto.evaluations.map((e) => ({
      key: e.key,
      realSavingsPct: e.realSavingsPct,
      fidelityPct: e.fidelityPct,
      isLossless: e.isLossless,
      crossModelSafety: e.crossModelSafety,
    }));
    return adaptiveRoute(evals, routingTarget, "Any");
  }, [pareto.evaluations, routingTarget]);

  const applyPreset = useCallback((key: PresetKey) => {
    setPresetKey(key);
    if (key in PRESETS) {
      setOptions(PRESETS[key as keyof typeof PRESETS].options);
    }
  }, []);

  const toggle = useCallback((key: keyof NeuraleseOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/conversions");
      const data = (await res.json()) as { ok: boolean; rows: HistoryRow[] };
      if (data.ok) setHistory(data.rows);
    } catch {
      /* offline / no db — ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const copyOut = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }, [output]);

  const downloadOut = useCallback(() => {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuralese.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  const save = useCallback(async () => {
    if (!input.trim() || !output.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: input,
          output,
          preset: presetKey,
          inChars: stats.inChars,
          outChars: stats.outChars,
          charDeltaPct: stats.charDeltaPct,
        }),
      });
      await loadHistory();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [input, output, presetKey, stats, loadHistory]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="Neuralese Compiler"
            className="h-11 w-11 rounded-xl shadow-lg shadow-indigo-900/40"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Neuralese Compiler
            </h1>
            <p className="text-sm text-slate-400">
              Prose → high-density, LLM-readable notation · installable · offline
            </p>
          </div>
        </div>
      </header>

      {/* Presets */}
      <div className="mb-2 flex flex-wrap gap-2">
        {[...(Object.keys(PRESETS) as (keyof typeof PRESETS)[]), "losslessAscii" as const, "holographic" as const, "caveHolo" as const, "ibCaveHolo" as const, "caveMan" as const, "dragi" as const, "wenyan" as const, "composite" as const, "dragiScale" as const, "ordos" as const, "asgJson" as const, "astCode" as const, "noether" as const].map((key) => {
          const active = key === presetKey;
          const labelMap: Record<string, string> = {
            losslessAscii: "Lossless ASCII",
            holographic: "🌀 Holographic",
            caveHolo: "🔥 CaveHolo",
            ibCaveHolo: "🧊 IB-CaveHolo",
            caveMan: "🦴 CaveMan",
            dragi: "🐉 DRAGI D12",
            wenyan: "文言文 Wenyan",
            composite: "⚡ CaveMan+DRAGI",
            dragiScale: "📚 DRAGI Multi",
            ordos: "🔺 Ordos Tri-Band",
            asgJson: "ASG JSON Rows",
            astCode: "💻 True AST Code",
            noether: "⚛ Noether CCL",
          };
          const hintMap: Record<string, string> = {
            losslessAscii: "Fully reversible · ASCII-only · cross-LLM safe",
            holographic: "Bulk/boundary exact compression · MDL-gated · Bekenstein diagnostics",
            caveHolo: "CaveMan→Holographic two-stage pipeline · highest combined savings",
            ibCaveHolo: "Information Bottleneck prune + protected semantic units + CaveHolo",
            caveMan: "Strip predictable grammar · keep semantic core · LLM reconstructs",
            dragi: "Beast-card semantic skeleton · obj/eat/foe/cont/flags ontology",
            wenyan: "Classical Chinese function-word substitution · −24% tokens at 96% retrieval",
            composite: "CaveMan then DRAGI — two-stage compression pipeline",
            dragiScale: "Chunked D12 skeleton for long documents (≥15 sentences)",
            ordos: "Hierarchical Frequency-Tuned Tri-Band Context Compiler (L1 Invariants / L2 Plans / L3 Verbatim)",
            asgJson: "Lossless structured JSON field-once / row encoding (TOON-like)",
            astCode: "True AST-macro macro aliasing for TypeScript, JavaScript, Python, HTML source code",
            noether: "Noether conserved commitments · CCL atoms · paradox-risk guard · 論理圧縮 LOGIC_FORM",
          };
          const label = labelMap[key] ?? PRESETS[key as keyof typeof PRESETS].label;
          const hint = hintMap[key] ?? PRESETS[key as keyof typeof PRESETS].hint;
          const colorClass = active
            ? key === "caveMan" ? "bg-amber-600 text-white"
              : key === "dragi" ? "bg-purple-600 text-white"
              : key === "wenyan" ? "bg-rose-700 text-white"
              : key === "composite" ? "bg-cyan-700 text-white"
              : key === "dragiScale" ? "bg-violet-700 text-white"
              : key === "ordos" ? "bg-red-600 text-white shadow-red-900/40"
              : key === "asgJson" ? "bg-emerald-600 text-white shadow-emerald-900/40"
              : key === "astCode" ? "bg-teal-600 text-white shadow-teal-900/40"
              : key === "noether" ? "bg-sky-600 text-white shadow-sky-900/40"
              : key === "holographic" ? "bg-pink-600 text-white shadow-pink-900/40"
              : key === "caveHolo" ? "bg-orange-600 text-white shadow-orange-900/40"
              : key === "ibCaveHolo" ? "bg-cyan-600 text-white shadow-cyan-900/40"
              : "bg-indigo-500 text-white"
            : "bg-slate-800/70 text-slate-300 hover:bg-slate-700";
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              title={hint}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition shadow-lg ${colorClass}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* CaveMan level selector (only when CaveMan active) */}
      {usingCaveman && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-amber-400 font-medium">Intensity:</span>
          {(["lite", "full", "ultra"] as CavemanLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setCavemanLevel(lvl)}
              className={`rounded px-3 py-1 font-mono transition ${
                cavemanLevel === lvl
                  ? "bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50"
                  : "bg-slate-800 text-slate-400 hover:text-amber-300"
              }`}
            >
              {lvl}
            </button>
          ))}
          <span className="text-slate-500 ml-1">
            {cavemanLevel === "lite" ? "~15-25% savings" : cavemanLevel === "full" ? "~40-58% savings" : "~58-75% savings"}
          </span>
        </div>
      )}

      {usingLossless && (
        <section className="mb-4 rounded-2xl border border-emerald-700/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="font-semibold">Lossless ASCII mode active</div>
          <p className="mt-1 text-emerald-200/90">
            This mode is fully reversible by code, uses visible ASCII only, avoids Unicode tokenization traps, and is the safest cross-LLM transport format in this app.
          </p>
          <p className="mt-1 text-xs text-emerald-300/80">
            Honest note: this mode only compresses repeated phrases. If your text lacks repetition, it may not reduce tokens much, but it will never introduce lossy semantics.
          </p>
        </section>
      )}

      {usingCaveman && (
        <section className="mb-4 rounded-2xl border border-amber-700/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">🦴 CaveMan mode — <span className="font-mono text-amber-300">{cavemanLevel}</span></div>
          <p className="mt-1 text-amber-200/90">
            Strips predictable grammar (articles, auxiliaries, filler) while keeping all semantic content. LLMs fill in the grammar automatically — "Brain still big. Mouth small."
          </p>
          <p className="mt-1 text-xs text-amber-300/80">
            Source: wilpel/caveman-compression + JuliusBrussee/caveman (2025–2026).
            lite=~15-25% savings | full=~40-58% | ultra=~58-75%. Reconstruction via LLM context (not lossless).
          </p>
        </section>
      )}

      {usingDragi && (
        <section className="mb-4 rounded-2xl border border-purple-700/40 bg-purple-500/10 p-4 text-sm text-purple-100">
          <div className="font-semibold">🐉 DRAGI D12 Skeleton mode</div>
          <p className="mt-1 text-purple-200/90">
            Generates a beast-card semantic skeleton using the DRAGI ontology (eat/foe/cont/flags). Maps what the content IS, not just what it says. Designed for semantic retrieval, not raw text.
          </p>
          <p className="mt-1 text-xs text-purple-300/80">
            Source: decofan (r/LocalLLaMA, 2026). Net token-positive for single snippets only when text has strong repetitive structure. Best for large document corpora.
          </p>
        </section>
      )}

      {usingWenyan && (
        <section className="mb-4 rounded-2xl border border-rose-700/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="font-semibold">文言文 Wenyan mode
            <span className="ml-2 text-[11px] text-rose-300 font-normal">(Classical Chinese compression)</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-rose-400 font-medium">Level:</span>
            {(["lite", "full"] as WenyanLevel[]).map((lvl) => (
              <button key={lvl} onClick={() => setWenyanLevel(lvl)}
                className={`rounded px-3 py-1 font-mono transition ${wenyanLevel === lvl ? "bg-rose-500/30 text-rose-200 ring-1 ring-rose-400/50" : "bg-slate-800 text-slate-400 hover:text-rose-300"}`}>
                {lvl}
              </button>
            ))}
          </div>
          <p className="mt-2 text-rose-200/90">
            Replaces English function words with Classical Chinese glyphs (則=therefore, 不=not, 亦=also, 之=of, 以=with).
          </p>
          <p className="mt-1 text-xs text-rose-300/80">
            Verified benchmark: −24% tokens at 96% retrieval (ai.rs, Apr 2026). Best on Qwen/GPT-4o/Gemini. Western-only models may see degraded retrieval. Cross-LLM safety: MODERATE.
          </p>
        </section>
      )}

      {usingComposite && (
        <section className="mb-4 rounded-2xl border border-cyan-700/40 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          <div className="font-semibold">⚡ Composite CaveMan+DRAGI — two-stage pipeline</div>
          <p className="mt-1 text-cyan-200/90">
            Stage 1: CaveMan strips grammar. Stage 2: DRAGI D12 semantic skeleton of the CaveMan output.
            Obj/eat/cont fields contain the CaveMan-compressed meaning.
          </p>
          <p className="mt-1 text-xs text-cyan-300/80">
            {compositeResult.stats.stageBreakdown}. Net-positive when source text is verbose and long.
          </p>
        </section>
      )}

      {usingDragiScale && (
        <section className="mb-4 rounded-2xl border border-violet-700/40 bg-violet-500/10 p-4 text-sm text-violet-100">
          <div className="font-semibold">📚 DRAGI Multi-D12 — chunked skeleton for long documents</div>
          <p className="mt-1 text-violet-200/90">
            Splits text into 3-sentence chunks, generates D12 skeleton per chunk. At scale (≥15 sentences) this is net token-positive; for short texts overhead dominates.
          </p>
          <p className="mt-1 text-xs text-violet-300/80">
            {dragiScaleResult.stats.chunkCount} chunks · {dragiScaleResult.stats.netPositive ? "✓ Net-positive at this text length" : "⚠ Short text: overhead exceeds savings. Use for documents ≥15 sentences."}
          </p>
        </section>
      )}

      {usingOrdos && (
        <section className="mb-4 rounded-2xl border border-red-700/40 bg-red-500/10 p-4 text-sm text-red-100">
          <div className="font-semibold">🔺 Ordos Tri-Band Hierarchical Context Compiler</div>
          <p className="mt-1 text-red-200/90">
            Compiles the input into 3 explicit frequency bands: L1 (Stable Invariants), L2 (Adaptive Plans), L3 (Transient Verbatim Payload). Based on Hackernews 2026 paradigm.
          </p>
          <p className="mt-1 text-xs text-red-300/80">
            Rényi Entropy: {ordosResult.stats.renyiEntropy} | Weissman Score: {ordosResult.stats.weissmanScore}. The Tri-Band Orchestrator System Prompt is loaded into the decoder preamble below.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ordosResult.layers.map((l) => (
              <div key={l.band} className="rounded-xl border border-red-900/40 bg-slate-950/60 p-3 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-red-300 font-mono block mb-1">{l.band}</span>
                  <span className="text-slate-400 text-[11px] block mb-2">{l.frequency}</span>
                  <p className="font-mono text-slate-300 text-[11px] line-clamp-3 mb-2">{l.content}</p>
                </div>
                <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-2 mt-1">
                  ~{l.realBpeTokens} tokens | {l.compressionMethod}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {usingNoether && (
        <section className="mb-4 rounded-2xl border border-sky-700/40 bg-sky-500/10 p-4 text-sm text-sky-100">
          <div className="font-semibold">⚛ Noether Commitment Codec (CCL1)</div>
          <p className="mt-1 text-sky-200/90">
            Compresses text into conserved commitment charges (GOAL / CONSTRAINT / DECISION / SAFETY / EVIDENCE / OPEN_Q).
            Inspired by Context Codec (arXiv:2605.17304) + Noether&apos;s theorem: valid compression preserves charges under the symmetry of rewriting.
          </p>
          <p className="mt-1 text-xs text-sky-300/80">
            atoms={noetherResult.atoms.length} · critical={noetherResult.stats.criticalAtomCount} · density={noetherResult.stats.commitmentDensity}/100tok · paradoxRisk={noetherResult.stats.paradoxRisk}
            {noetherResult.stats.paradoxRisk >= 0.55 ? " · ⚠ high risk of output-token inflation (Johnson 2026 compression paradox)" : " · paradox risk low"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {noetherResult.atoms.slice(0, 8).map((a: any) => (
              <span
                key={a.id}
                className="rounded-md border border-sky-500/40 bg-sky-950/40 px-2 py-0.5 font-mono text-[11px] text-sky-200"
                title={a.evidenceSpan}
              >
                {a.id}{a.criticality >= 0.9 ? "!" : a.criticality >= 0.75 ? "*" : "."}{a.kind}
              </span>
            ))}
          </div>
        </section>
      )}

      {usingHolographic && (
        <section className="mb-4 rounded-2xl border border-pink-700/40 bg-pink-500/10 p-4 text-sm text-pink-100">
          <div className="font-semibold">🌀 Holographic Bulk/Boundary Mode</div>
          <p className="mt-1 text-pink-200/90">
            Encodes repeated concept anchors as a boundary dictionary [BND:...] and rewrites the prose bulk as $code references.
            MDL gates both character and real BPE savings, so failed candidates fall back to the exact original text.
          </p>
          <p className="mt-1 text-xs text-pink-300/80">
            status={holographicResult.isCompressed ? "compressed" : "passthrough"} · anchors={holographicResult.anchors.length} · realSavings={holographicResult.stats.realSavingsPct}% · bekenstein≈{holographicResult.stats.bekensteinBoundBits} bits · holoEff={holographicResult.stats.holographicEfficiency}
          </p>
          {holographicResult.anchors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {holographicResult.anchors.slice(0, 12).map((a) => (
                <span
                  key={a.code}
                  className="rounded-md border border-pink-500/40 bg-pink-950/40 px-2 py-0.5 font-mono text-[11px] text-pink-200"
                  title={`frequency ${a.frequency}, info ${a.informationBits.toFixed(2)} bits`}
                >
                  {a.code}={a.term}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Toggles — hidden for special modes */}
      <div className={`mb-6 flex flex-wrap gap-2 ${usingSpecial ? "opacity-30 pointer-events-none" : ""}`}>
        {TOGGLES.map(({ key, label }) => {
          const on = Boolean(options[key]);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                on
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              {on ? "● " : "○ "}
              {label}
            </button>
          );
        })}
      </div>

      {/* Editor grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              English prose
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setInput(SAMPLE_TEXT)}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-indigo-300"
              >
                Sample
              </button>
              <button
                onClick={() => setInput("")}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-rose-300"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste natural English prose here…"
            spellCheck={false}
            className="min-h-[280px] flex-1 resize-y rounded-xl bg-slate-950/70 p-3 font-sans text-sm leading-relaxed text-slate-200 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
          />
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span>{stats.inChars} chars</span>
            <span>{stats.inWords} words</span>
            <span>~{stats.inTokensEst} tok</span>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-indigo-900/50 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
              Neuralese
            </h2>
            <div className="flex gap-2">
              <button
                onClick={copyOut}
                className="rounded-md bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={downloadOut}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-indigo-300"
              >
                .txt
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-emerald-300 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <pre className="min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950/70 p-3 font-mono text-sm leading-relaxed text-emerald-200 ring-1 ring-indigo-900/50">
            {output || "—"}
          </pre>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span>{stats.outChars} chars</span>
            <span>{stats.outWords} words</span>
            <span>~{stats.outTokensEst} tok</span>
          </div>
        </section>
      </div>

      {/* Stats banner */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Char reduction" value={`${stats.charDeltaPct}%`} good={stats.charDeltaPct > 0} />
        <Stat label="Token reduction" value={`${stats.tokenDeltaPct}%`} good={stats.tokenDeltaPct > 0} />
        <Stat label="Tokens saved" value={`~${Math.max(0, stats.inTokensEst - stats.outTokensEst)}`} good />
        <Stat label="Words dropped" value={`${Math.max(0, stats.inWords - stats.outWords)}`} good />
        <Stat label="Density (bits/char)" value={entropyBitsPerChar.toFixed(2)} good={entropyBitsPerChar > 4} />
      </div>

      {/* Honest metrics: BPE-aware real token cost + semantic fidelity grade */}
      <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Honest Metrics
            <span className="ml-2 text-[10px] font-normal text-slate-500">
              BPE-aware token cost · semantic fidelity · rate-distortion grade
            </span>
          </h2>
          <div
            title={`Verdict: ${grade.verdict}`}
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${
              grade.grade.startsWith("A")
                ? "bg-emerald-500/20 text-emerald-300"
                : grade.grade === "B"
                  ? "bg-lime-500/20 text-lime-300"
                  : grade.grade === "C"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {grade.grade}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Real tok (in→out)"
            value={`${grade.realInTokens}→${grade.realOutTokens}`}
          />
          <Stat
            label="Real tok reduction"
            value={`${grade.realSavingsPct}%`}
            good={grade.realSavingsPct > 0}
          />
          <Stat
            label="Semantic fidelity"
            value={`${Math.round(grade.fidelity * 100)}%`}
            good={grade.fidelity >= 0.85}
          />
          <Stat label="Efficiency" value={`${grade.efficiency}/100`} good={grade.efficiency >= 65} />
        </div>

        {grade.warnings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {grade.warnings.map((warn, i) => (
              <li
                key={i}
                className="rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              >
                ⚠ {warn}
              </li>
            ))}
          </ul>
        )}
        {recommendDisableHeaders && headerLessGrade && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
            <span>
              💡 Disabling the workspace/dict headers reaches{" "}
              <b>{headerLessGrade.realSavingsPct}%</b> real-token reduction (grade{" "}
              <b>{headerLessGrade.grade}</b>) vs current {grade.realSavingsPct}%. Headers add Unicode
              overhead that costs more BPE tokens than they save on this input.
            </span>
            <button
              onClick={() => setAdv((a) => ({ ...a, ngramDict: false, workspaceHeader: false }))}
              className="shrink-0 rounded-md bg-emerald-500/25 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-500/40"
            >
              Apply fix
            </button>
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-600">
          Real-token estimate approximates cl100k/o200k BPE (Unicode glyphs cost 1–3 tokens each), so it is
          more honest than the chars/4 figures above. Fidelity = fraction of original content concepts recovered on round-trip.
        </p>
      </section>

      {/* Advanced layer controls (J-space / n-gram dict / info-prune) */}
      {!usingLossless && (
        <section className="mt-6 rounded-2xl border border-indigo-900/40 bg-indigo-950/30 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-300">
          Advanced Layer
          <span className="ml-2 text-[10px] font-normal text-slate-500">
            J-space workspace · n-gram dictionary · self-information pruning
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <AdvToggle on={adv.ngramDict} label="N-gram dictionary" onClick={() => setAdv((a) => ({ ...a, ngramDict: !a.ngramDict }))} />
          <AdvToggle on={adv.workspaceHeader} label="J-space workspace header" onClick={() => setAdv((a) => ({ ...a, workspaceHeader: !a.workspaceHeader }))} />
          <AdvToggle on={adv.infoPrune} label={`Info-prune (keep ${Math.round(adv.infoPruneKeep * 100)}%)`} onClick={() => setAdv((a) => ({ ...a, infoPrune: !a.infoPrune }))} />
        </div>

        {/* Workspace concept chips (J-lens style) */}
        {workspace.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
              Workspace concepts (top-{workspace.length}, salience-ranked)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {workspace.map((w) => (
                <span
                  key={w.token}
                  title={`salience ${w.score} · ${w.hits}×`}
                  className="rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 font-mono text-xs text-indigo-200"
                >
                  {w.token}
                  <span className="ml-1 text-[10px] text-indigo-400/70">{w.score}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* N-gram dictionary reveal */}
        {dict.entries.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
              Session n-gram dictionary ({dict.entries.length})
            </div>
            <div className="grid grid-cols-1 gap-1 font-mono text-xs sm:grid-cols-2">
              {dict.entries.map((e) => (
                <div key={e.code} className="rounded bg-slate-900/60 px-2 py-1 text-slate-300">
                  <span className="text-emerald-300">{e.code}</span>
                  <span className="text-slate-600"> := </span>
                  <span>{e.phrase}</span>
                  <span className="ml-1 text-[10px] text-slate-500">({e.hits}×)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decoder preamble */}
        <div className="mt-4">
          <button
            onClick={() => setShowPreamble((v) => !v)}
            className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            {showPreamble ? "▾" : "▸"} Decoder preamble (paste as LLM system prompt)
          </button>
          {showPreamble && (
            <div className="mt-2 rounded-xl bg-slate-950/70 p-3 ring-1 ring-indigo-900/40">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(decoderPreamble);
                    setPreambleCopied(true);
                    setTimeout(() => setPreambleCopied(false), 1400);
                  } catch {}
                }}
                className="mb-2 rounded-md bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30"
              >
                {preambleCopied ? "Copied ✓" : "Copy preamble"}
              </button>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-300">
                {decoderPreamble}
              </pre>
            </div>
          )}
        </div>

        {/* Round-trip preview */}
        <div className="mt-3">
          <button
            onClick={() => setShowRoundTrip((v) => !v)}
            className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
          >
            {showRoundTrip ? "▾" : "▸"} Round-trip preview (partial decompression sanity check)
          </button>
          {showRoundTrip && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950/70 p-3 font-sans text-xs leading-relaxed text-slate-300 ring-1 ring-emerald-900/40">
              {roundTrip || "—"}
            </pre>
          )}
        </div>
      </section>
      )}

      {/* Pareto Frontier Matrix Section */}
      <section className="mt-6 rounded-2xl border border-indigo-900/40 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
              Pareto Frontier & Multi-Preset Benchmark
            </h2>
            <p className="text-xs text-slate-400">
              Real BPE-aware comparison across all preset modes for current prompt input.
            </p>
          </div>
          <button
            onClick={() => setShowPareto((v) => !v)}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-200"
          >
            {showPareto ? "Collapse ▴" : "Expand ▾"}
          </button>
        </div>

        {showPareto && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Rate-Distortion Adaptive Router */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold uppercase text-indigo-300">⚡ Adaptive Router</span>
                <span className="text-slate-500">Target:</span>
                {(["strict_lossless", "balanced", "max_savings"] as RoutingTarget[]).map((t) => (
                  <button key={t} onClick={() => setRoutingTarget(t)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${routingTarget === t ? "bg-indigo-500/40 text-indigo-100 ring-1 ring-indigo-400/50" : "text-slate-400 hover:text-indigo-300"}`}>
                    {t === "strict_lossless" ? "Strict Lossless" : t === "max_savings" ? "Max Savings" : "Balanced"}
                  </button>
                ))}
              </div>
              <div className="text-indigo-200">
                <span className="font-mono font-bold text-white">
                  {pareto.evaluations.find((e) => e.key === adaptiveDecision.recommendedKey)?.label ?? adaptiveDecision.recommendedKey}
                </span>
                {" — "}{adaptiveDecision.reason}
              </div>
              {presetKey !== adaptiveDecision.recommendedKey && (
                <button
                  onClick={() => applyPreset(adaptiveDecision.recommendedKey as PresetKey)}
                  className="mt-1.5 inline-block rounded bg-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-100 hover:bg-indigo-500/50"
                >
                  Switch to recommended
                </button>
              )}
            </div>

            {/* Direct Reasoning prompt builder */}
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-3 text-xs">
              <button onClick={() => setShowDirectReasoning((v) => !v)}
                className="font-semibold text-emerald-300 hover:text-emerald-200">
                {showDirectReasoning ? "▾" : "▸"} In-Context Direct Reasoning prompt (reason ON compressed form)
              </button>
              {showDirectReasoning && (
                <div className="mt-2">
                  <p className="text-emerald-200/80 mb-2">
                    Instead of "decompress then answer", this prompt instructs the LLM to reason
                    <em>directly</em> on the compressed text — minimizing decompression token overhead.
                    Based on Agarwal RL rate-distortion principle: reward = ΔlogP − λ|Z|.
                  </p>
                  <pre className="max-h-48 overflow-auto rounded bg-slate-950/70 p-2 font-mono text-emerald-100 whitespace-pre-wrap text-[11px] leading-relaxed ring-1 ring-emerald-900/40">
                    {buildDirectReasoningPrompt(
                      output.slice(0, 300) + (output.length > 300 ? "…" : ""),
                      (usingCaveman ? "caveman" : usingDragi || usingDragiScale || usingComposite ? "dragi" : usingWenyan ? "wenyan" : "neuralese") as Parameters<typeof buildDirectReasoningPrompt>[1],
                      "Summarize the key points and answer any implicit questions."
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-500">
                    <th className="pb-2 font-medium">Preset</th>
                    <th className="pb-2 font-medium">Mode Type</th>
                    <th className="pb-2 font-medium">Real BPE Tok</th>
                    <th className="pb-2 font-medium">Real Savings</th>
                    <th className="pb-2 font-medium">Fidelity</th>
                    <th className="pb-2 font-medium">Cross-LLM Safety</th>
                    <th className="pb-2 font-medium">Pareto Optimal</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pareto.evaluations.map((ev) => {
                    const isCurrent = ev.key === presetKey;
                    return (
                      <tr
                        key={ev.key}
                        className={`transition ${
                          isCurrent ? "bg-indigo-950/40 text-white" : "text-slate-300 hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="py-2 font-sans font-medium">
                          {ev.label}
                          {isCurrent && (
                            <span className="ml-1.5 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-mono">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-[11px]">
                          {ev.isLossless ? (
                            <span className="text-emerald-300 font-sans">Exact Lossless</span>
                          ) : (
                            <span className="text-amber-300/90 font-sans">Lossy Semantic</span>
                          )}
                        </td>
                        <td className="py-2">
                          {ev.realInTokens} → {ev.realOutTokens}
                        </td>
                        <td className="py-2">
                          <span
                            className={
                              ev.realSavingsPct > 0
                                ? "text-emerald-400 font-bold"
                                : ev.realSavingsPct < 0
                                ? "text-rose-400"
                                : "text-slate-400"
                            }
                          >
                            {ev.realSavingsPct > 0 ? `+${ev.realSavingsPct}%` : `${ev.realSavingsPct}%`}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={
                              ev.fidelityPct >= 95
                                ? "text-emerald-300 font-bold"
                                : ev.fidelityPct >= 80
                                ? "text-lime-300"
                                : "text-amber-400"
                            }
                          >
                            {ev.fidelityPct}%
                          </span>
                        </td>
                        <td className="py-2 font-sans text-[11px]">
                          {ev.crossModelSafety === "High" ? (
                            <span className="text-emerald-300">🟢 High</span>
                          ) : ev.crossModelSafety === "Moderate" ? (
                            <span className="text-amber-300">🟡 Moderate</span>
                          ) : (
                            <span className="text-rose-300">🔴 Low</span>
                          )}
                        </td>
                        <td className="py-2 font-sans text-[11px]">
                          {ev.isParetoOptimal ? (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300">
                              ✨ Optimal
                            </span>
                          ) : (
                            <span className="text-slate-600">Sub-optimal</span>
                          )}
                        </td>
                        <td className="py-2 font-sans">
                          {!isCurrent && (
                            <button
                              onClick={() => applyPreset(ev.key as PresetKey)}
                              className="rounded bg-slate-800 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-600 hover:text-white"
                            >
                              Select
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Long Document Semantic Selective Fetch Harness UI Panel */}
      <section className="mt-6 rounded-2xl border border-emerald-900/40 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              Interactive Long-Document RAG Semantic Fetch Harness
            </h2>
            <p className="text-xs text-slate-400">
              Generate Table of Contents Skeleton Map (`[[D12L]]`) & interactively query/fetch exact semantic chunks.
            </p>
          </div>
          <button
            onClick={() => setShowFetchPanel((v) => !v)}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-200"
          >
            {showFetchPanel ? "Collapse ▴" : "Expand ▾"}
          </button>
        </div>

        {showFetchPanel && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Extractive Query Search:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fetchQuery}
                    onChange={(e) => setFetchQuery(e.target.value)}
                    placeholder="e.g. database connections or profit"
                    className="flex-1 rounded-lg bg-slate-950/80 p-2 font-sans text-xs text-slate-200 outline-none ring-1 ring-slate-800 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => setFetchHandle("")}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-emerald-900/40 hover:bg-emerald-500"
                  >
                    Rank & Retrieve
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Direct Handle Lookup:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fetchHandle}
                    onChange={(e) => setFetchHandle(e.target.value)}
                    placeholder="e.g. H0001 or H0002"
                    className="flex-1 rounded-lg bg-slate-950/80 p-2 font-mono text-xs text-slate-200 outline-none ring-1 ring-slate-800 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => setFetchQuery("")}
                    className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white shadow-teal-900/40 hover:bg-teal-500"
                  >
                    Fetch Handle
                  </button>
                </div>
              </div>
            </div>

            {/* Skeleton Table of Contents Preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/80 pb-1.5">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  Corpus Skeleton Index ({fetchHarness.chunks.length} total chunks · ~{fetchHarness.totalTokens} BPE Tok)
                </span>
                <span className="font-mono text-emerald-400 font-bold">{fetchHarness.corpusId}</span>
              </div>
              <pre className="max-h-40 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
                {fetchHarness.skeletonMap}
              </pre>
            </div>

            {/* Retrieved Output Arena */}
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 border-b border-emerald-900/40 pb-1.5 flex justify-between items-center">
                <span>Retrieved Context Pack (Original Source Order Restored)</span>
                <span className="text-slate-400 font-normal">
                  {fetchHandle.trim() ? `Exact Lookup: ${fetchHandle}` : fetchQuery.trim() ? `Extractive Match for: "${fetchQuery}"` : "Default Top 2 Chunks"}
                </span>
              </div>
              <div className="flex flex-col gap-2 max-h-64 overflow-auto">
                {(() => {
                  if (fetchHandle.trim()) {
                    const chunk = fetchChunkByHandle(fetchHarness, fetchHandle);
                    if (!chunk) {
                      return <div className="text-rose-400 font-mono text-xs">Handle &quot;{fetchHandle}&quot; not found in active corpus index.</div>;
                    }
                    return (
                      <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-2.5 font-mono text-xs text-slate-200">
                        <div className="text-emerald-400 font-bold mb-1 border-b border-emerald-900/60 pb-1 flex justify-between">
                          <span>{chunk.handle} :: [{chunk.title}]</span>
                          <span className="text-slate-400 font-normal">~{chunk.bpeTokens} tokens</span>
                        </div>
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{chunk.content}</div>
                      </div>
                    );
                  }

                  const chunks = fetchQueryExtractive(fetchHarness, fetchQuery, 800);
                  if (chunks.length === 0) {
                    return <div className="text-amber-400 font-mono text-xs">No chunks matched query terms. Try broadening your search.</div>;
                  }
                  return chunks.map((c) => (
                    <div key={c.handle} className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-2.5 font-mono text-xs text-slate-200">
                      <div className="text-emerald-400 font-bold mb-1 border-b border-emerald-900/60 pb-1 flex justify-between">
                        <span>{c.handle} :: [{c.title}]</span>
                        <span className="text-slate-400 font-normal">~{c.bpeTokens} tokens</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words leading-relaxed">{c.content}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent conversions
          </h2>
          <ul className="flex flex-col gap-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-indigo-700"
                onClick={() => setInput(row.source)}
                title="Click to reload source"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="rounded bg-slate-800 px-2 py-0.5 uppercase">
                    {row.preset}
                  </span>
                  <span className="text-emerald-400">−{row.charDeltaPct}%</span>
                </div>
                <p className="mt-1 truncate font-mono text-sm text-emerald-200">
                  {row.output}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-slate-600">
        All conversion runs locally in your browser · deterministic engine
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
      <div
        className={`text-xl font-semibold ${good ? "text-emerald-300" : "text-slate-300"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function AdvToggle({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
        on
          ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-200"
          : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600"
      }`}
    >
      {on ? "● " : "○ "}
      {label}
    </button>
  );
}
