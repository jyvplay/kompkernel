/**
 * X42 registry smoke test — loads 'analepsis' from the registry BY KEY (not by
 * direct import), runs it on the smallest lanes, and byte-compares the decoded
 * output. This is what proves the registry entry is wired correctly rather than
 * merely present.
 */
import { readFileSync } from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const CODECS = codecEntries();

const c = CODECS.find((x: any) => x.key === 'analepsis');
if (!c) { console.log('*** apocope NOT FOUND in registry ***'); process.exit(1); }
const idx = CODECS.findIndex((x: any) => x.key === 'analepsis');
const sysIdx = CODECS.findIndex((x: any) => x.key === 'krisis');
console.log(`registry: ${CODECS.length} codecs; krisis at ${sysIdx}, analepsis at ${idx}`);
console.log(`label: ${c.label.slice(0, 60)}...  [${c.label.length} chars]`);
console.log(`family=${c.family} fidelity=${c.fidelity}\n`);

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = await (c as any).run(t, 'o200k_base');
  const ok = r.decoded === t;
  console.log(
    p.split('/').pop()!.padEnd(22),
    'oneChat=' + String(r.oneChat).padStart(5),
    ok ? 'EXACT' : '***MISMATCH***',
    ((Date.now() - t0) / 1000).toFixed(1) + 's',
  );
  console.log('   note: ' + r.note);
}
