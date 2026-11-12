import { tachygrafiaApplyTraced, tachygrafiaApply } from '../../src/lib/omega/tachygrafia';
for (const s of ['printed like v','v plus k sec','body = header then rows','the line above','the line two above']) {
  console.log(JSON.stringify(s), '->', JSON.stringify(tachygrafiaApply(s)), 'steps', tachygrafiaApplyTraced(s).steps.length);
}
