import { codecEntries, measure } from '@/lib/omega/registry';
(async () => {
  const entries = codecEntries();
  const want = ['henosis','sige','lakonikos-d','hora','hemera','stathmos','dendrons','akolouthia2','daedalus-dual','daedalus','phalanx-a10','diaphora','homoios','kladios','anaphora-fold','onomasia','synartesis','gnomon','dendron'];
  const text = 'hello world hello world hello world hello world';
  for (const k of want) {
    const e = entries.find((x: any) => x.key === k) as any;
    if (!e) { console.log(k.padEnd(15), 'MISSING'); continue; }
    try {
      const r = await measure(e, text, 'o200k_base', 16);
      console.log(k.padEnd(15), 'ok  outTokens=' + r.outTokens, 'exact=' + r.exact, 'oneChat=' + r.oneChatTokens, 'err=' + (r.error ?? '-'));
    } catch (err: any) { console.log(k.padEnd(15), 'THREW', String(err?.message ?? err).slice(0, 120)); }
  }
  console.log('registry entries', entries.length);
})();
