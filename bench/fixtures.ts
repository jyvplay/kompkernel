/** Shared real-shape corpus for codec benchmarking (not shipped in the app bundle). */
export function corpus(): Record<string, string> {
  const jsonLog = Array.from({ length: 40 }, (_, i) =>
    `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`).join('\n');
  const csv = 'id,name,score,region\n' + Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n');
  const chat = Array.from({ length: 24 }, (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`).join('\n');
  const grid = Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n');
  const rle = 'A'.repeat(800) + 'B'.repeat(600);
  const idrun = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const prose = 'The quick brown fox jumps over the lazy dog while the committee deliberates on whether a second breakfast constitutes an institutional precedent.';
  const stack = Array.from({ length: 30 }, (_, i) =>
    `    at Object.handler (/srv/app/dist/server/routes/orders.js:${100 + i}:${7 + (i % 9)})`).join('\n');
  const code = Array.from({ length: 20 }, (_, i) =>
    `export function handler${i}(req: Request, res: Response): void {\n  const user = req.session.user;\n  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }\n  res.json({ ok: true, step: ${i} });\n}`).join('\n');
  const tsv = 'name\tvalue\tunit\n' + Array.from({ length: 40 }, (_, i) => `metric_${i}\t${i * 7}\tms`).join('\n');
  const yaml = Array.from({ length: 25 }, (_, i) =>
    `- name: service-${i}\n  image: registry.internal.example.com/team/gateway:1.4.${i}\n  replicas: 3\n  env:\n    - name: LOG_LEVEL\n      value: info`).join('\n');
  const md = Array.from({ length: 15 }, (_, i) =>
    `## Section ${i}\n\nThe deployment pipeline validates the artifact signature before promotion.\nSee \`docs/runbook-${i}.md\` for the escalation contacts and rollback procedure.\n`).join('\n');
  const sql = Array.from({ length: 30 }, (_, i) =>
    `INSERT INTO events (id, user_id, kind, created_at) VALUES (${i}, ${1000 + i}, 'page_view', '2026-07-01T00:00:0${i % 10}Z');`).join('\n');
  const agentTurn = prose + '\n' + jsonLog + '\n' + rle + '\n' + chat;
  const bigAgent = prose + '\n' + jsonLog + '\n' + stack + '\n' + code + '\n' + csv + '\n' + chat + '\n' + rle;
  const toolTrace = code + '\n' + stack + '\n' + jsonLog;
  const mixedDoc = md + '\n' + yaml + '\n' + sql + '\n' + tsv;
  const hetero300 =
    'Ship it: retry 3x, never log secrets.\n{"id":7,"ok":true}\n{"id":8,"ok":true}\nid,ms\na,12\nb,12\n##..##\n##..##\n' +
    'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}\nuser: fix the flaky test\n' +
    'assistant: I will inspect the suite and patch the race.\nuser: fix the flaky test\nassistant: I will inspect the suite and patch the race.';
  return { prose, jsonLog, csv, chat, grid, rle, idrun, stack, code, tsv, yaml, md, sql, hetero300, agentTurn, bigAgent, toolTrace, mixedDoc };
}
