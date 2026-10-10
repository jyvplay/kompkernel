/**
 * bench/synizesis-fixtures.ts
 * Fixtures for the SYNIZESIS lane.
 *
 * PROVENANCE (important — no fabricated "results" anywhere):
 *  - `ops/*`        : REAL artifacts captured from this sandbox by running the
 *                     named command (git log, find, node, npm ls, ls).  Files
 *                     live in bench/holdout-ops/ and are read from disk.
 *  - `synth/*`      : SYNTHETIC but format-faithful renderings of widely used
 *                     log/CSV/JSON shapes.  Labelled synthetic in every report.
 *  - `holdout/*`    : the repo's pre-existing held-out documents, untouched.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Fixture { name: string; kind: 'ops-real' | 'synth' | 'holdout' | 'train'; text: string }

function pad(n: number, w: number) { return String(n).padStart(w, '0'); }

export function synthFixtures(): Fixture[] {
  const isoLog = Array.from({ length: 40 }, (_, i) =>
    `2026-09-${pad(10 + (i % 20), 2)}T${pad(8 + (i % 12), 2)}:${pad((i * 7) % 60, 2)}:${pad((i * 13) % 60, 2)}.${pad((i * 137) % 1000, 3)}Z INFO  [scheduler-${i % 4}] tenant=t-${1000 + i} req=${((i * 7919) >>> 0).toString(16).padStart(12, '0')} latency=${12 + i * 3}ms status=200`).join('\n');

  const nginx = Array.from({ length: 35 }, (_, i) =>
    `10.${i % 12}.${(i * 7) % 255}.${(i * 13) % 255} - - [${pad(1 + (i % 28), 2)}/Sep/2026:${pad(i % 24, 2)}:${pad((i * 7) % 60, 2)}:${pad((i * 3) % 60, 2)} +0000] "GET /api/v2/orders/${20000 + i} HTTP/1.1" 200 ${1200 + i * 37} "-" "Mozilla/5.0"`).join('\n');

  const jsonLog = Array.from({ length: 30 }, (_, i) => JSON.stringify({
    ts: `2026-09-${pad(1 + (i % 28), 2)}T${pad(i % 24, 2)}:${pad((i * 7) % 60, 2)}:${pad((i * 11) % 60, 2)}.${pad((i * 137) % 1000, 3)}Z`,
    level: 'info',
    trace: `550e8400-e29b-41d4-a716-${446655440000 + i}`,
    svc: 'orders', msg: 'request completed', dur_ms: 12 + i,
  })).join('\n');

  const csv = 'id,date,time,amount,ref\n' + Array.from({ length: 30 }, (_, i) =>
    `${10000 + i},2026-${pad(1 + (i % 9), 2)}-${pad(1 + (i % 28), 2)},${pad(i % 24, 2)}:${pad((i * 7) % 60, 2)}:${pad((i * 3) % 60, 2)},${(1000 + i * 37).toFixed(2)},REF-2026-${pad(i, 6)}`).join('\n');

  const k8s = 'NAME                        READY   STATUS    RESTARTS   AGE     IP             NODE\n' +
    Array.from({ length: 25 }, (_, i) =>
      `api-server-7d9f8b${pad(i, 2)}-${'abcde'[i % 5]}${pad(i * 3, 4)}   1/1     Running   ${i % 3}          ${i + 2}d${i % 24}h   10.244.${i % 8}.${(i * 11) % 255}   node-${i % 5}.cluster.internal`).join('\n');

  const stack = Array.from({ length: 18 }, (_, i) =>
    `    at Object.<anonymous> (/home/user/app/packages/core/src/runtime/scheduler.ts:${120 + i * 7}:${3 + (i % 20)})`).join('\n');

  const prose = `In the 2019 cohort study (Smith et al., 2019, pp. 45-67), 1,284 of 3,912 participants (32.8%) reported symptom onset between 14:30 and 18:45 on 2019-03-14. The adjusted odds ratio was 1.47 (95% CI: 1.12-1.93, p=0.006). Follow-up at 6.5 months showed a 12.4% reduction (95% CI: 8.1-16.7). Costs fell from 1,245,600 to 982,300 per annum, a 21.1% decrease. See RFC 8446 clause 4.1.2 and ISO 8601:2019 clause 5.4.2.1. Measurements were 25.4 mm x 12.7 mm x 3.175 mm at 23.0 C and 101.325 kPa. Sample IDs: SP-2019-00147, SP-2019-00148, SP-2019-00231, SP-2019-00404, SP-2019-00512.`;

  const syslog = Array.from({ length: 30 }, (_, i) =>
    `Sep ${String(1 + (i % 28)).padStart(2, ' ')} ${pad(i % 24, 2)}:${pad((i * 7) % 60, 2)}:${pad((i * 3) % 60, 2)} host-${i % 4} sshd[${10000 + i * 7}]: Accepted publickey for deploy from 203.0.113.${(i * 11) % 255} port ${40000 + i * 13} ssh2`).join('\n');

  const prom = Array.from({ length: 30 }, (_, i) =>
    `http_requests_total{method="GET",route="/api/v2/orders",status="200",instance="10.0.${i % 8}.${(i * 7) % 255}:9090"} ${100000 + i * 731} 17${pad(59000000 + i * 1000, 8)}`).join('\n');

  return [
    { name: 'synth/iso-log-40', kind: 'synth', text: isoLog },
    { name: 'synth/nginx-35', kind: 'synth', text: nginx },
    { name: 'synth/jsonlog-30', kind: 'synth', text: jsonLog },
    { name: 'synth/csv-txn-30', kind: 'synth', text: csv },
    { name: 'synth/k8s-pods-25', kind: 'synth', text: k8s },
    { name: 'synth/node-stack-18', kind: 'synth', text: stack },
    { name: 'synth/academic-prose', kind: 'synth', text: prose },
    { name: 'synth/syslog-30', kind: 'synth', text: syslog },
    { name: 'synth/prometheus-30', kind: 'synth', text: prom },
  ];
}

export function opsFixtures(root = 'bench/holdout-ops'): Fixture[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).sort().map((f) => ({
    name: 'ops/' + f, kind: 'ops-real' as const, text: fs.readFileSync(path.join(root, f), 'utf8'),
  })).filter((f) => f.text.length > 100);
}

export function holdoutFixtures(): Fixture[] {
  const out: Fixture[] = [];
  if (fs.existsSync('bench/holdout')) for (const f of fs.readdirSync('bench/holdout').sort())
    out.push({ name: 'ho/' + f.replace(/\.txt$/, ''), kind: 'holdout', text: fs.readFileSync(path.join('bench/holdout', f), 'utf8') });
  return out;
}

export function trainFixtures(): Fixture[] {
  const out: Fixture[] = [];
  if (fs.existsSync('bench/train')) for (const f of fs.readdirSync('bench/train').sort())
    out.push({ name: 'tr/' + f.replace(/\.txt$/, ''), kind: 'train', text: fs.readFileSync(path.join('bench/train', f), 'utf8') });
  return out;
}

/** real public tabular data fetched this session (see bench/synizesis-report.md) */
export function tabFixtures(): Fixture[] { return opsFixtures('bench/holdout-tab').map((f) => ({ ...f, name: 'tab/' + f.name.slice(4) })); }

export function allFixtures(): Fixture[] {
  return [...synthFixtures(), ...tabFixtures(), ...opsFixtures(), ...holdoutFixtures()];
}
