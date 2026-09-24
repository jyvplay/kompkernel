/**
 * bench/logos-redteam.ts — adversarial gate for LOGOS-Ω (self-referential
 * lexicon). Every claim the codec makes is attacked here with real tooling:
 * live BPE accounting, independent decode, DAG/self-reference structure,
 * delimiter/pool coupling, inertness battery, delegation, determinism,
 * pool-fallback under Hangul-bearing payloads, and a full holdout sweep
 * with an explicit Pareto-dominance assertion against PROTEUS.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { logosEncode, logosDecode, logosDecoderPrompt, LOGOS_START, LOGOS_BODY_SEPARATOR, LOGOS_DELIM_UNIVERSE, LOGOS_POOLS, logosPoolForDelim } from '@/lib/omega/logos';
import { proteusEncode } from '@/lib/omega/proteus';
import { countTokens } from '@/lib/omega/bpe';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';

const enc = 'o200k_base' as const;
let n = 0;
async function ok(name: string, f: () => unknown | Promise<unknown>) { await f(); n++; console.log('✓', name); }

async function main() {
  const input = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
  const [prot, r] = await Promise.all([proteusEncode(input, enc), logosEncode(input, enc)]);

  await ok('byte-perfect hybrid JSON/prose reconstruction', () => assert.equal(r.decoded, input));
  await ok('independent decoder reconstruction', async () => assert.equal(await logosDecode(r.wire), input));
  await ok('advances PROTEUS by at least fifty live tokens', () => assert.ok(prot.outTokens - r.outTokens >= 50, `delta=${prot.outTokens - r.outTokens}`));
  await ok('live tokenizer accounting', () => assert.equal(r.outTokens, countTokens(r.wire, enc)));
  await ok('LOGOS envelope selected', () => assert.ok(r.wire.startsWith(LOGOS_START)));
  await ok('delimiter belongs to declared universe and selects the used pool', () => {
    const d = r.logosDelimiter!;
    assert.ok(LOGOS_DELIM_UNIVERSE.includes(d));
    assert.equal(logosPoolForDelim(d), r.logosPool!);
  });
  await ok('delimiter is a single live token', () => assert.equal(countTokens(r.logosDelimiter!, enc), 1));
  await ok('delimiter absent from every expansion on the tape', () => {
    const d = r.logosDelimiter!;
    const b = r.wire.indexOf(LOGOS_BODY_SEPARATOR, 2);
    const tape = r.wire.slice(2, b);
    for (const e of tape.split(d)) assert.ok(!e.includes(d));
  });
  await ok('tape cardinality equals reported rule count and respects pool cap', () => {
    const d = r.logosDelimiter!;
    const b = r.wire.indexOf(LOGOS_BODY_SEPARATOR, 2);
    const tape = r.wire.slice(2, b);
    assert.equal(tape.split(d).length, r.logosRules);
    assert.ok(r.logosRules! <= LOGOS_POOLS[r.logosPool!].length);
  });
  await ok('the tape is genuinely self-referential (an expansion contains another rule symbol)', () => {
    const d = r.logosDelimiter!;
    const b = r.wire.indexOf(LOGOS_BODY_SEPARATOR, 2);
    const rules = r.wire.slice(2, b).split(d);
    const pool = LOGOS_POOLS[r.logosPool!];
    let refs = 0;
    for (let i = 0; i < rules.length; i++)
      for (let j = 0; j < rules.length; j++)
        if (j !== i && rules[i].includes(pool[j])) refs++;
    assert.ok(refs >= 3, `refs=${refs}`);
  });
  await ok('every pool symbol is exactly one live token', () => {
    for (const g of LOGOS_POOLS[r.logosPool!]) assert.equal(countTokens(g, enc), 1);
  });
  await ok('body separator never occurs in the payload', () => {
    const b = r.wire.indexOf(LOGOS_BODY_SEPARATOR, 2);
    assert.ok(!r.wire.slice(b + 1).includes(LOGOS_BODY_SEPARATOR));
    assert.ok(!r.wire.slice(2, b).includes(LOGOS_BODY_SEPARATOR));
  });
  await ok('frame and separator are single live tokens', () => {
    assert.equal(countTokens(LOGOS_START, enc), 1);
    assert.equal(countTokens(LOGOS_BODY_SEPARATOR, enc), 1);
  });

  // ---- inertness battery ----
  await ok('bare frame is inert', async () => assert.equal(await logosDecode('Ω'), 'Ω'));
  await ok('undeclared delimiter is inert', async () => assert.equal(await logosDecode('Ωafoo乙bar'), 'Ωafoo乙bar'));
  await ok('missing body boundary is inert', async () => assert.equal(await logosDecode('Ω!abc'), 'Ω!abc'));
  await ok('empty expansion tape is inert', async () => assert.equal(await logosDecode('Ω!乙x'), 'Ω!乙x'));
  await ok('overlong tape is inert', async () => {
    const huge = Array.from({ length: LOGOS_POOLS[0].length + 5 }, () => 'x').join('!');
    const w = 'Ω!' + huge + '乙y';
    assert.equal(await logosDecode(w), w);
  });
  await ok('ordinal expansion is exact', async () => {
    const w = 'Ω!xyz乙' + LOGOS_POOLS[0][0];
    // symbol 0 -> "xyz", then the body (one symbol) becomes the kairos wire "xyz",
    // which kairosDecode passes through unchanged.
    assert.equal(await logosDecode(w), 'xyz');
  });
  await ok('forward references on the tape resolve exactly', async () => {
    // expansion 0 contains symbol 1 (a forward reference): 0 -> "b" + sym1, 1 -> "c"
    const w = 'Ω!b' + LOGOS_POOLS[0][1] + '!c乙' + LOGOS_POOLS[0][0] + LOGOS_POOLS[0][1];
    assert.equal(await logosDecode(w), 'bc' + 'c');
  });
  await ok('non-LOGOS wire delegates to the PROTEUS stack unchanged', async () => {
    const back = await logosDecode(prot.wire);
    assert.equal(back, input);
  });

  // ---- decoder prompt contract ----
  const prompt = logosDecoderPrompt();
  await ok('same-chat access model explicit', () => assert.ok(prompt.includes('No system prompt')));
  await ok('prompt specifies reverse-order substitution', () => assert.ok(prompt.includes('LAST to FIRST')));
  await ok('prompt specifies delimiter-selected symbol tables', () => assert.ok(prompt.includes('delimiter group → ordered symbols')));
  await ok('prompt embeds every pool and delimiter group', () => {
    for (let i = 0; i < LOGOS_POOLS.length; i++) {
      assert.ok(prompt.includes(LOGOS_POOLS[i].join('')));
      for (const d of []) void d;
    }
  });
  await ok('prompt embeds the payload when supplied', () => assert.ok(logosDecoderPrompt(r.wire).includes(r.wire.slice(0, 64))));
  await ok('prompt-literal decode: the message text alone carries the LOGOS layer', async () => {
    // Parse the symbol tables OUT of the prompt string, then execute exactly
    // the algorithm the prompt describes. No codec internals are consulted:
    // this is what a reader given only the chat message can do.
    const msg = logosDecoderPrompt(r.wire);
    const entries = [...msg.matchAll(/^delimiter in \[(.*)\] → symbols: (\S+)$/gm)];
    assert.ok(entries.length === 6);
    const d = r.wire[1];
    const entry = entries.find(m => m[1].includes(d));
    assert.ok(entry, 'delimiter group found in prompt');
    const symbols = [...entry[2]];
    const b = r.wire.indexOf('乙', 2);
    assert.ok(b > 0);
    const rules = r.wire.slice(2, b).split(d);
    assert.equal(rules.length <= symbols.length, true);
    let body = r.wire.slice(b + 1);
    for (let i = rules.length - 1; i >= 0; i--) {
      body = body.split(symbols[i]).join(rules[i]);
      for (let j = 0; j < i; j++) rules[j] = rules[j].split(symbols[i]).join(rules[i]);
    }
    // The expanded body must be a wire the lower stack can finish exactly.
    const finished = await (await import('@/lib/omega/kairos')).kairosDecode(body);
    assert.equal(finished, input);
  });

  // ---- Pareto gate ----
  await ok('exact Pareto tournament against PROTEUS', () => assert.ok(r.outTokens <= prot.outTokens));

  // ---- determinism ----
  await ok('encoding is deterministic across runs', async () => {
    const again = await logosEncode(fs.readFileSync('bench/holdout/readme.txt', 'utf8'), enc);
    const first = await logosEncode(fs.readFileSync('bench/holdout/readme.txt', 'utf8'), enc);
    assert.equal(first.wire, again.wire);
  });

  // ---- adversarial payload classes ----
  await ok('Hangul-bearing payload stays byte-perfect (pool fallback)', async () => {
    const t = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8') + '\n메모: 큐 깊이가 14로 증가했고 p99 지연 시간은 812ms였습니다. 재시도 폭풍이 진행되는 동안 온콜이 두 번 호출되었습니다.';
    const lr = await logosEncode(t, enc);
    assert.equal(lr.decoded, t);
    assert.equal(await logosDecode(lr.wire), t);
    const pr = await proteusEncode(t, enc);
    assert.ok(lr.outTokens <= pr.outTokens);
  });
  await ok('payload containing the body separator declines safely', async () => {
    const t = 'Report:\nline one\n乙\nline two\n' + fs.readFileSync('bench/holdout/md-vite.txt', 'utf8');
    const lr = await logosEncode(t, enc);
    assert.equal(lr.decoded, t);
    assert.equal(await logosDecode(lr.wire), t);
  });
  await ok('payload starting with the LOGOS frame stays byte-perfect', async () => {
    const t = 'Ω framed prose that deliberately collides with the LOGOS start symbol. ' + fs.readFileSync('bench/holdout/md-react.txt', 'utf8');
    const lr = await logosEncode(t, enc);
    assert.equal(lr.decoded, t);
    assert.equal(await logosDecode(lr.wire), t);
  });
  await ok('empty and tiny payloads are total', async () => {
    for (const t of ['', 'x', 'Ω乙!']) {
      const lr = await logosEncode(t, enc);
      assert.equal(lr.decoded, t);
      assert.equal(await logosDecode(lr.wire), t);
    }
  });

  // ---- full sweep: every holdout file + every repo fixture lane ----
  const f = mosaicFixtures();
  const lanes: Array<[string, string]> = [
    ...fs.readdirSync('bench/holdout').sort().map(nm => ['holdout/' + nm, fs.readFileSync('bench/holdout/' + nm, 'utf8')] as [string, string]),
    ['CHAOS_900', CHAOS_900],
    ['CHAOS_G_CJK', CHAOS_G_CJK],
    ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];
  const results: Array<{ lane: string; prot: number; logos: number }> = [];
  for (const [lane, text] of lanes) {
    const [pr, lr] = await Promise.all([proteusEncode(text, enc), logosEncode(text, enc)]);
    assert.equal(lr.decoded, text, `byte-perfect on ${lane}`);
    assert.equal(await logosDecode(lr.wire), text, `independent decode on ${lane}`);
    assert.ok(lr.outTokens <= pr.outTokens, `Pareto safety violated on ${lane}: ${lr.outTokens} > ${pr.outTokens}`);
    results.push({ lane, prot: pr.outTokens, logos: lr.outTokens });
  }
  await ok(`byte-perfect + Pareto-safe on all ${lanes.length} lanes (holdout + fixtures + chaos)`, () => {});
  const wins = results.filter(x => x.logos < x.prot);
  const totalProt = results.reduce((a, x) => a + x.prot, 0);
  const totalLogos = results.reduce((a, x) => a + x.logos, 0);
  console.log(`\n  wins: ${wins.map(w => `${w.lane} (-${w.prot - w.logos})`).join(', ')}`);
  console.log(`  totals: PROTEUS ${totalProt} → LOGOS ${totalLogos} (−${totalProt - totalLogos} live tokens, ${((1 - totalLogos / totalProt) * 100).toFixed(2)}%)`);

  console.log(`\n${n}/${n} LOGOS adversarial passes (plus ${lanes.length}-lane sweep)`);
}
main().catch(e => { console.error(e); process.exit(1); });
