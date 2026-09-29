/**
 * bench/abacus-fixtures.ts
 * =============================================================================
 * Realistic "everyday work" fixtures for ABACUS-M1, mirroring the rigor of
 * bench/stentor-fixtures.ts and bench/orthos-fixtures.ts: genuine document
 * TYPES a real user would paste into a chat, not synthetic stress tests.
 *
 * Two families, matched to ABACUS's two independent mechanisms:
 *   - NUMERIC: financial reports, population/business statistics, expense
 *     reports, e-commerce order confirmations — documents containing
 *     thousands-separator-comma-grouped numbers.
 *   - UNICODE: international business correspondence, academic/conference
 *     email threads — documents containing NFD-decomposed accented names
 *     (the realistic scenario: text extracted via a legacy pipeline that
 *     emits decomposed Unicode, e.g. certain PDF extractors, older
 *     Java/ICU-based exports, historically HFS+-originated metadata).
 *
 * Every raw/messageTokens/percentage number below is produced by actually
 * running abacusEncode/abacusDecode via `npx tsx bench/abacus-fixtures.ts`
 * against the live o200k_base tokenizer — never estimated.
 * =============================================================================
 */
import { abacusEncode, abacusDecode, abacusDecoderPrompt } from '../src/lib/omega/abacus';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

const ENC: EncodingName = 'o200k_base';

/** DAEDALUS's own search is wall-clock budgeted (see daedalus.ts's
 *  budgetMs). Its short, auto-computed default budget for small/medium
 *  documents can leave the "plain DAEDALUS" comparator under-searched,
 *  which would unfairly INFLATE ABACUS's apparent advantage. Every
 *  measurement in this file therefore uses the same generous, fixed
 *  budget DAEDALUS's own docstring reports as sufficient for stable
 *  results ("9s, 30s and 90s give byte-identical M on three large
 *  pastes") — see bench/abacus-report.md section F for the full
 *  discovered-characteristic writeup and a side-by-side of default-budget
 *  vs fixed-budget numbers on the combo fixture. */
const OPTS = { budgetMs: 15000 };

export const financialReport = `Total revenue for the quarter reached $12,450,000, up from $10,320,000 in the prior period. Operating expenses were $8,750,300, leaving net income of $3,699,700. The company's total assets grew to $145,230,000, while liabilities remained steady at $67,890,000. Shareholder equity now stands at $77,340,000. Headcount grew from 1,250 employees to 1,410 employees this quarter. The marketing budget of $2,500,000 was fully utilized, and R&D spending reached $4,125,000, a 15% increase year over year.`;

export const populationStats = `According to the latest census data, the city's population grew to 1,245,890 residents, an increase of 45,320 from the previous count of 1,200,570. The metro area now houses 3,780,450 people across 12 counties. Median household income rose to $68,450, while the number of registered businesses climbed to 24,670, up from 22,150 five years ago.`;

export const expenseReport = `I'm submitting my expense report for the March conference trip. Flight cost was $1,245.50, hotel for 4 nights came to $2,340.00, and meals totaled $487.25. Ground transportation added another $312.00. The total comes to $4,384.75, which is within the $5,000 budget allocated for this trip. Please let me know if you need the original receipts, which are attached as scanned copies.`;

export const ecommerceOrder = `Your order #A1023456 has shipped. Order total: $1,299.99 for 3 items, plus $45.00 shipping, for a grand total of $1,344.99. You earned 1,344 reward points on this purchase, bringing your lifetime total to 15,780 points. Your account balance after this transaction is $2,450.00.`;

const bigEmailNFC = `Hi team,

Quick recap from this week's international partner calls. We spoke with François Léger and his colleague Cécile Dupré from the Montréal office about the Québec distribution agreement. They confirmed the timeline discussed with José Martínez and María Fernández from the Madrid team last month.

On the technical side, André Bernard and Zoé Lévesque reviewed the API integration with our Zürich engineering group, led by Jürgen Müller and Katharina Schönberg. They raised a few concerns about latency between the São Paulo data center and the European nodes, and asked Renato Peixoto and João Araújo to run additional load tests.

The Milan office, represented by Chiara Bianchi and Salvatore Esposito, confirmed the Italian launch is still on track for next quarter, pending final sign-off from Françoise Rousseau in legal. Meanwhile, the Copenhagen team — Sofía Málaga (visiting from our Málaga office) and Niels Björk — flagged a minor localization issue that Adrián Núñez is already fixing.

We also heard from Beyoncé's licensing team regarding the naming rights renewal, and from the naïve-Bayes research group at the university about the joint publication. The résumé database migration championed by González and Ibañez is complete, and the café-chain partnership deck (prepared by René Girard and Éléonore Lefèvre) is ready for Monday's review with Sébastien Côté and Angélique Pérez.

Finally, the façade renovation project in Zürich, coordinated by Benoît Marchand and Verónica Torrés, should wrap up by the end of September, and the Málaga expansion, led by Ricardo Núñez, remains on schedule.`;

/** NFD (decomposed) form of the fixture above — the realistic wire shape
 *  produced by a legacy export pipeline. This, not the NFC form, is what
 *  ABACUS targets: see the module docstring's mechanism (2). */
export const internationalEmailNFD = bigEmailNFC.normalize('NFD');

export const mixedFinancialAndNFD = `Client update: François confirmed the $2,450,000 contract renewal for the Zürich office. Total pipeline value across the region is now $18,900,500, up from $14,250,000 last quarter. The résumé database now has 45,890 entries.`.normalize('NFD');

const academicEmailNFC = `Dear colleagues,

Following up on the joint symposium proposal. Professor Émile Durand and Dr. Aurélie Béchard from Université de Montréal have confirmed their keynote slots. We also received acceptance from Dr. Björn Håkansson at the Malmö Institute and Dr. Renée Côté-Lévesque, who will present alongside Dr. Iñaki Etxeberria from the Bilbao research group.

The abstract review committee — chaired by Dr. José Ángel Ibáñez and including Dr. Agnès Dupré, Dr. Sœren Nørgaard, and Dr. Håkan Öberg — completed evaluation of 84 submissions. Notable accepted papers include work by Muñoz and Peña on distributed systems, a collaboration between Schäfer and Müller on formal verification, and a paper by Andrade and Araújo on quantum error correction.

Logistics: the venue in Zürich has confirmed catering for 240 attendees, with dietary accommodations coordinated by Bérénice Lefèvre. Visa letters for international attendees, including those from São Paulo and Montréal, are being processed by François-Xavier Béliveau this week. Please forward any additional dietary or accessibility needs to Chloé Bérubé by Friday.

We are grateful to our sponsors, coordinated locally by Käthe Brünner and Sofía Jiménez-Núñez, for making this event possible, and look forward to seeing everyone in September.`;

export const academicEmailNFD = academicEmailNFC.normalize('NFD');

export const ABACUS_FIXTURES: Record<string, string> = {
  financialReport,
  populationStats,
  expenseReport,
  ecommerceOrder,
  internationalEmailNFD,
  mixedFinancialAndNFD,
  academicEmailNFD,
};

function pct(before: number, after: number): string {
  return `${(100 * (before - after) / before).toFixed(1)}%`;
}

function main() {
  console.log('=== ABACUS-M1 fixture report (live o200k_base measurements) ===\n');
  let totalBefore = 0;
  let totalAfter = 0;
  for (const [name, text] of Object.entries(ABACUS_FIXTURES)) {
    const before = countTokens(text, ENC);
    const r = abacusEncode(text, ENC, OPTS);
    const decoded = abacusDecode(r.wire);
    const promptOk = abacusDecoderPrompt(r.wire) === r.decoderPrompt;
    const exact = decoded === text;
    console.log(
      `${name.padEnd(22)} before=${String(before).padStart(4)} messageTokens=${String(r.messageTokens).padStart(4)} ` +
      `saved=${String(before - r.messageTokens).padStart(4)} (${pct(before, r.messageTokens).padStart(6)}) ` +
      `applied=${r.abacusApplied} num=${r.abacusNumSpans} uni=${r.abacusUniSpans} exact=${exact} promptOk=${promptOk}`,
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

  const combo = Object.values(ABACUS_FIXTURES).join('\n\n---\n\n');
  const comboBefore = countTokens(combo, ENC);
  const comboResult = abacusEncode(combo, ENC, OPTS);
  const comboDecoded = abacusDecode(comboResult.wire);
  const comboExact = comboDecoded === combo;
  console.log(
    `\nCOMBO (all fixtures pasted as one realistic multi-topic message): before=${comboBefore} ` +
    `messageTokens=${comboResult.messageTokens} saved=${comboBefore - comboResult.messageTokens} ` +
    `(${pct(comboBefore, comboResult.messageTokens)}) applied=${comboResult.abacusApplied} ` +
    `num=${comboResult.abacusNumSpans} uni=${comboResult.abacusUniSpans} exact=${comboExact}`,
  );
  if (!comboExact) throw new Error('COMBO FAILED EXACTNESS');
}

main();
