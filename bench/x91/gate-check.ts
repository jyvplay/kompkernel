// Direct check that the shipped gate now resolves to 0.25 below the threshold and 1 above,
// and that ls-l-real -- the one lane whose wire moves when work is halved -- is excluded.
import { workBudgetFor, chironBudgetFor } from '../../src/lib/omega/workmeter';
import { euthynteriaFactor, euthynteriaApplies, EUTHYNTERIA_FACTOR, EUTHYNTERIA_MAX_CHARS, euthynteriaAudit } from '../../src/lib/omega/euthynteria';
delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
console.log(`EUTHYNTERIA_FACTOR=${EUTHYNTERIA_FACTOR}  EUTHYNTERIA_MAX_CHARS=${EUTHYNTERIA_MAX_CHARS}`);
const cases = [132, 1000, 6751, 7999, 8000, 8001, 10692, 40000];
let bad = 0;
for (const c of cases) {
  const f = euthynteriaFactor(c), w = workBudgetFor(c), ch = chironBudgetFor(c);
  const a = euthynteriaAudit(c, workBudgetFor, chironBudgetFor);
  const expectW = Math.round((2_000_000 + 100 * c) * f);
  const ok = w === expectW && a.gated === (c <= EUTHYNTERIA_MAX_CHARS);
  if (!ok) bad++;
  console.log(`  chars=${String(c).padStart(6)} factor=${f} work=${String(w).padStart(9)} chiron=${String(ch).padStart(9)} gated=${a.gated} preGateWork=${a.workPreGate} ${ok ? 'ok' : 'MISMATCH'}`);
}
console.log(`\nls-l-real (10692 chars) reached by this arm? ${euthynteriaApplies(10692)} (must be false)`);
console.log(`node-help (6751 chars, largest verified sufficient at X89) reached? ${euthynteriaApplies(6751)} (must be true)`);
if (euthynteriaApplies(10692) || !euthynteriaApplies(6751)) bad++;
console.log(bad === 0 ? 'GATE CHECK: all assertions hold' : `GATE CHECK: ${bad} FAILURES`);
process.exit(bad === 0 ? 0 : 1);
