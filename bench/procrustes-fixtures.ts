/**
 * bench/procrustes-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for PROCRUSTES, mirroring the rigor of
 * bench/abacus-fixtures.ts / bench/stentor-fixtures.ts: genuine document
 * TYPES a real user would paste into a chat, not synthetic stress tests.
 *
 * Two families, matched to PROCRUSTES's two independent mechanisms:
 *   - DESTRETCH (letter-spacing): certificates/awards, ASCII banner-style
 *     announcements, a plain-text warning notice, a README-style ASCII
 *     header — documents that use manual letter-spacing for emphasis
 *     because bold/italic formatting isn't available in the medium.
 *   - DEWIDE (fullwidth/halfwidth): emails and chat messages where an
 *     input method was accidentally left in "fullwidth" (zenkaku) mode
 *     for part of the message — a real, well-documented CJK-input-method
 *     accident (see bench/procrustes-report.md section on prior art).
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running procrustesEncode/procrustesDecode via
 * `npx tsx bench/procrustes-fixtures.ts` against the live o200k_base
 * tokenizer — never estimated.
 * =============================================================================
 */
import { procrustesEncode, procrustesDecode, procrustesDecoderPrompt } from '../src/lib/omega/procrustes';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';
const OPTS = { budgetMs: 15000 };

function toFullwidth(s: string): string {
  return Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!;
      if (cp === 0x20) return '\u3000';
      if (cp >= 0x21 && cp <= 0x7e) return String.fromCodePoint(cp + 0xfee0);
      return c;
    })
    .join('');
}

/* ---------------------------------------------------------------------------
 * DESTRETCH fixtures
 * ------------------------------------------------------------------------- */

export const certificateOfCompletion = `C E R T I F I C A T E   O F   A C H I E V E M E N T

P R E S E N T E D   T O

Jordan Alvarez Martinez

I N   R E C O G N I T I O N   O F   O U T S T A N D I N G   P E R F O R M A N C E   A N D   D E D I C A T I O N   T O   E X C E L L E N C E

Awarded this 15th day of September, 2026, in recognition of exceptional contributions to the engineering team and unwavering commitment to quality throughout the project lifecycle.`;

export const safetyWarningNotice = `W A R N I N G

D O   N O T   E N T E R   T H I S   A R E A   W I T H O U T   P R O P E R   S A F E T Y   E Q U I P M E N T

Hard hats, safety glasses, and steel-toed boots are required at all times in this section of the facility. Violation of this policy may result in disciplinary action. Please see your supervisor with any questions about site safety requirements before proceeding past this point.`;

export const announcementBanner = `A T T E N T I O N   A L L   E M P L O Y E E S

P L E A S E   R E A D   B E F O R E   F R I D A Y

The office will be closed for the long weekend starting Friday at 3pm and reopening Tuesday morning. Please make sure any time-sensitive requests are submitted to your manager before end of day Thursday. Building access will still work for anyone who needs to come in over the weekend, but the front desk will be unstaffed.`;

export const readmeAsciiHeader = `P R O J E C T   S E T U P   G U I D E

I N S T A L L A T I O N   I N S T R U C T I O N S

Clone the repository, run npm install to fetch dependencies, then run npm run dev to start the local development server. Configuration values live in the .env file, which should be copied from .env.example before your first run. See CONTRIBUTING.md for the pull request process and code style guidelines.`;

export const congratulationsNote = `C O N G R A T U L A T I O N S   O N   Y O U R   P R O M O T I O N

Everyone on the team wanted to take a moment to say how proud we are of you and how much we're looking forward to seeing what you accomplish in this new role. You've earned this, and we can't wait to celebrate with you at the team lunch on Friday.`;

/* ---------------------------------------------------------------------------
 * DEWIDE fixtures
 * ------------------------------------------------------------------------- */

export const zenkakuStuckEmail = `Hi Sarah,

${toFullwidth('Thank you for your email. Please find the updated schedule attached and let me know if you have any questions before our call on Thursday.')}

Best regards,
Jordan`;

export const zenkakuStuckSlackMessage = `${toFullwidth('Hey team, quick update: the deploy finished successfully and all the tests are passing.')} Let me know if anyone sees anything weird in staging before we push to prod tonight.`;

export const zenkakuStuckMeetingNotes = `Meeting notes - Tuesday standup

${toFullwidth('We reviewed the Q3 roadmap and agreed to prioritize the search improvements over the notification redesign this sprint.')}

Action items:
- Priya to finalize the API spec by Wednesday
- Miguel to follow up with the design team about the mockups
- ${toFullwidth('Everyone should update their tickets before Friday retro.')}`;

export const japaneseBusinessEmailWithZenkakuSlip = `お世話になっております。

${toFullwidth('Attached is the revised proposal for your review.')}

ご確認のほど、よろしくお願いいたします。`;

export const PROCRUSTES_FIXTURES: Record<string, string> = {
  certificateOfCompletion,
  safetyWarningNotice,
  announcementBanner,
  readmeAsciiHeader,
  congratulationsNote,
  zenkakuStuckEmail,
  zenkakuStuckSlackMessage,
  zenkakuStuckMeetingNotes,
  japaneseBusinessEmailWithZenkakuSlip,
};

function pct(before: number, after: number): string {
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== PROCRUSTES fixture report (live o200k_base measurements) ===\n');
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [name, text] of Object.entries(PROCRUSTES_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = procrustesEncode(text, ENC, OPTS);
    const decoded = procrustesDecode(r.wire);
    const promptOk = procrustesDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(28)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.procrustesApplied} destretch=${r.procrustesDestretchSpans} dewide=${r.procrustesDewideSpans} exact=${exact} promptOk=${promptOk}`,
    );
    if (!exact) throw new Error(`FIXTURE FAILED EXACTNESS: ${name}`);
    if (!promptOk) throw new Error(`FIXTURE decoderPrompt MISMATCH: ${name}`);
    totalBefore += before;
    totalAfter += r.messageTokens;
  }
  console.log(
    `\nTOTAL (individually, as separate messages): before=${totalBefore} after=${totalAfter} ` +
    `saved=${totalBefore - totalAfter} (${pct(totalBefore, totalAfter)})`,
  );

  const combo = Object.values(PROCRUSTES_FIXTURES).join('\n\n---\n\n');
  const comboBefore = countTokens(combo, ENC);
  const comboResult = procrustesEncode(combo, ENC, OPTS);
  const comboDecoded = procrustesDecode(comboResult.wire);
  const comboExact = comboDecoded === combo;
  console.log(
    `\nCOMBO (all fixtures pasted as one realistic multi-topic message): before=${comboBefore} ` +
    `messageTokens=${comboResult.messageTokens} saved=${comboBefore - comboResult.messageTokens} ` +
    `(${pct(comboBefore, comboResult.messageTokens)}) applied=${comboResult.procrustesApplied} ` +
    `destretch=${comboResult.procrustesDestretchSpans} dewide=${comboResult.procrustesDewideSpans} exact=${comboExact}`,
  );
  if (!comboExact) throw new Error('COMBO FAILED EXACTNESS');
}

main();
