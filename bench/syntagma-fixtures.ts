/**
 * bench/syntagma-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for SYNTAGMA, mirroring the rigor of
 * bench/caesura-fixtures.ts / bench/circe-fixtures.ts.
 *
 * The headline fixture (nfdKoreanBusinessMessage) reproduces the EXACT
 * real-world artifact class documented in bench/syntagma-report.md: text
 * that has passed through a macOS filesystem boundary (HFS+/APFS store
 * Unicode names in NFD by policy) and now carries canonically-decomposed
 * Hangul jamo instead of precomposed syllables -- confirmed via multiple
 * live, dated (2025-2026) GitHub issues describing exactly this failure
 * mode across unrelated tools (a terminal emulator, a code-search tool, a
 * remote file browser) plus a dedicated open-source CLI tool that exists
 * solely to batch-fix it.
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running syntagmaEncode/syntagmaDecode via
 * `npx tsx bench/syntagma-fixtures.ts` against the live o200k_base
 * tokenizer -- never estimated.
 * =============================================================================
 */
import { syntagmaEncode, syntagmaDecode, syntagmaDecoderPrompt } from '../src/lib/omega/syntagma';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

const koreanSentences = [
  '안녕하세요, 오늘 회의는 오후 세 시에 시작합니다.',
  '준비 자료를 미리 확인해 주시기 바랍니다.',
  '회의실은 3층 대회의실로 예약되어 있습니다.',
  '참석자 명단은 이메일로 발송해 드렸으니 확인 부탁드립니다.',
  '혹시 일정 변경이 필요하시면 미리 알려주시기 바랍니다.',
  '회의 후에는 간단한 다과가 준비되어 있을 예정입니다.',
  '모든 팀원들의 적극적인 참여를 부탁드립니다.',
  '이번 분기 목표에 대해 자세히 논의할 예정이니 관련 자료를 미리 검토해 주시기 바랍니다.',
];

/* ---------------------------------------------------------------------------
 * Headline fixture: a realistic Korean business message that leaked NFD
 * (e.g. copy-pasted from a macOS Notes/TextEdit export, or extracted from
 * a macOS-authored file whose contents inherited filesystem normalization
 * via some pipeline step).
 * ------------------------------------------------------------------------- */

export const nfdKoreanBusinessMessage = koreanSentences.join(' ').normalize('NFD');

/* ---------------------------------------------------------------------------
 * Realistic embedded scenario: an English email referencing a Korean
 * filename that leaked NFD from macOS (the exact scenario in the cited
 * GitHub issues -- "almost no Korean file name can be opened").
 * ------------------------------------------------------------------------- */

export const embeddedNfdFilename = `Hi,\n\nI'm having trouble opening this file you sent over AirDrop: ${'회의록_9월정리'.normalize('NFD')}.docx -- it won't open on my Windows laptop and the filename looks garbled in the file browser.\n\nCan you rename it to English or resend it zipped?\n\nThanks!`;

/* ---------------------------------------------------------------------------
 * Negative space: SYNTAGMA must decline cleanly.
 * ------------------------------------------------------------------------- */

export const cleanPrecomposedKorean = koreanSentences.join(' ');
export const compatibilityJamoControl = 'The Korean consonant ㄱ (romanized "g/k") is called "giyeok" and is the first letter of the Hangul alphabet, followed by ㄴ ("nieun") and ㄷ ("digeut").';
export const cleanEnglishProse = 'Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.';
export const shortFragment = '안녕하세요';

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const SYNTAGMA_FIXTURES: Record<string, string> = {
  nfdKoreanBusinessMessage,
  embeddedNfdFilename,
  cleanPrecomposedKorean,
  compatibilityJamoControl,
  cleanEnglishProse,
  shortFragment,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== SYNTAGMA fixture report (live o200k_base measurements) ===\n');
  for (const [name, text] of Object.entries(SYNTAGMA_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = syntagmaEncode(text, ENC);
    const decoded = syntagmaDecode(r.wire);
    const promptOk = syntagmaDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(25)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.syntagmaApplied} spans=${r.syntagmaSpans} syllables=${r.syntagmaSyllables} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
  }

  console.log('\n--- Headline receipt: nfdKoreanBusinessMessage (vs plain DAEDALUS) ---');
  const r = syntagmaEncode(nfdKoreanBusinessMessage, ENC);
  console.log(r.notes);
}

main();
