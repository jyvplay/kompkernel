/**
 * bench/chimera-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for CHIMERA, mirroring the rigor of
 * bench/circe-fixtures.ts / bench/procrustes-fixtures.ts.
 *
 * CHIMERA's headline, RELIABLE value is automatic, ZERO-EXTRA-COST
 * delegation to whichever of the five existing canonicalization lanes
 * (ORTHOS/STENTOR/ABACUS/PROCRUSTES/CIRCE) is cheapest for a GIVEN
 * document -- a user pastes ONE message and never has to know, or guess,
 * which of the five lanes applies; CHIMERA finds it, including CIRCE's own
 * large invisible-character-guard win (up to ~24-37%, see
 * bench/circe-report.md), reusing that lane's wire/decoderPrompt VERBATIM
 * (no CHIMERA framing overhead at all when delegating -- see "zero-overhead
 * degeneracy" in chimera.ts's docstring, same discipline as MOSAIC's own).
 * `zwspWatermarkedReport` below demonstrates this directly and is the
 * headline receipt.
 *
 * The SECOND mechanism -- the genuinely new composed pipeline that runs all
 * five canonicalizations together on documents carrying MULTIPLE
 * simultaneous artifact types -- is real, safe, and self-verified (see
 * `multiMechanismReport` below and bench/chimera-report.md section E for
 * the full honesty accounting), but empirically its net win on realistic
 * prose was found this session to be narrow and sensitive to DAEDALUS's
 * own search variance and phrase-dictionary competition; it is reported
 * honestly as a real, additive, always-safe capability, not as this
 * lane's headline gain.
 *
 * Every raw/messageTokens number below is produced by actually running
 * chimeraEncode/chimeraDecode via `npx tsx bench/chimera-fixtures.ts`
 * against the live o200k_base tokenizer -- never estimated.
 * =============================================================================
 */
import { chimeraEncode, chimeraDecode, chimeraDecoderPrompt } from '../src/lib/omega/chimera';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

function zwspWatermark(text: string): string {
  return text.split(' ').join('\u200B ');
}

/* ---------------------------------------------------------------------------
 * Headline fixture: CHIMERA automatically finds and delegates to CIRCE's
 * own invisible-character-guard mechanism, at zero extra cost, on a
 * realistic watermarked article -- no manual lane selection needed.
 * ------------------------------------------------------------------------- */

export const zwspWatermarkedReport = zwspWatermark(
  `The quarterly report shows steady growth across every region we track this year, with the strongest gains coming from overseas markets. Meanwhile, the engineering team shipped three major releases, each one focused on reliability improvements rather than new features. Customer feedback has been largely positive, though several users flagged confusing onboarding steps that the design team is now revising. Looking ahead, leadership expects continued investment in infrastructure, along with a renewed push into international markets next spring. The finance department also noted that operating margins improved slightly despite rising costs in logistics and raw materials. Several partnerships announced earlier this year are already contributing meaningfully to revenue, and two additional deals are expected to close before the end of the fiscal year. Employee retention remains strong, with turnover rates well below the industry average across nearly every department. The board expressed confidence in the current strategy while encouraging management to explore additional cost efficiencies where reasonable. Overall sentiment among analysts covering the company has shifted noticeably more positive since the last earnings call.`,
);

/* ---------------------------------------------------------------------------
 * Second mechanism: the composed pipeline, exercised directly. Real,
 * self-verified, safe -- honestly reported (see report for the full
 * accounting of why its net win on this fixture is small/zero).
 * ------------------------------------------------------------------------- */

const invoiceParas = [
  `I\u2019ve reviewed the invoice you sent and there are several problems that need to be fixed before I can approve payment. First, the total shows $12,450,000 but our contract says $11,200,500 &mdash; that\u2019s a difference of more than a million dollars, and I don\u2019t understand how that happened. I\u2019ve checked it three times and I still can\u2019t make the numbers line up, no matter how I look at it.`,
  `PLEASE STOP SENDING REVISED INVOICES WITHOUT EXPLAINING WHAT CHANGED. Every time I ask for clarification I get a new PDF with no notes at all, and it\u2019s starting to feel like nobody on your team is actually checking these before they go out.`,
  `Second, the &ldquo;shipping and handling&rdquo; line item wasn\u2019t on any of the three quotes we approved earlier this year, so I\u2019d like an explanation for where that came from before we pay it. Third, the &ldquo;early payment discount&rdquo; that was promised in writing &mdash; twice &mdash; never actually showed up on any version of the invoice, and I&#8217;d like to know why. Fourth, the &ldquo;service fee&rdquo; line wasn&#8217;t part of the original quote either, and nobody has explained where it came from or why it wasn&#8217;t flagged sooner.`,
];

export const multiMechanismReport = invoiceParas.join('\n\n');

/* ---------------------------------------------------------------------------
 * Single-artifact / negative-space controls
 * ------------------------------------------------------------------------- */

export const onlyEntities = `The CEO&#8217;s remarks acknowledged that communication &ldquo;hasn&#8217;t been where it needs to be,&rdquo; and the board agreed &mdash; without much debate &mdash; that a change was overdue.`;
export const cleanProseControl = `Our team is meeting on Thursday to review the quarterly roadmap and finalize the launch checklist. Please bring your notes from the customer interviews so we can prioritize the next sprint together.`;
export const shortFragment = `It's fine, thanks.`;

/* ---------------------------------------------------------------------------
 * Runner
 * ------------------------------------------------------------------------- */

export const CHIMERA_FIXTURES: Record<string, string> = {
  zwspWatermarkedReport,
  multiMechanismReport,
  onlyEntities,
  cleanProseControl,
  shortFragment,
};

function pct(before: number, after: number): string {
  if (before === 0) return '0.0%';
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== CHIMERA fixture report (live o200k_base measurements) ===\n');
  for (const [name, text] of Object.entries(CHIMERA_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = chimeraEncode(text, ENC);
    const decoded = chimeraDecode(r.wire);
    const promptOk = chimeraDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(24)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `winner=${r.chimeraWinner.padEnd(11)} applied=${r.chimeraApplied} stages=${r.chimeraStagesFired} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
  }

  console.log('\n--- Headline receipt: automatic zero-cost delegation to CIRCE\'s invisible-guard mechanism ---');
  const r = chimeraEncode(zwspWatermarkedReport, ENC);
  console.log(`messageTokens=${r.messageTokens} winner=${r.chimeraWinner} (a user pasting this message with no lane pre-selected still gets CIRCE's full win automatically)`);
  console.log(r.notes);
}

main();
