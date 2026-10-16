"""X17b: split each saved LAKONIKOS-D prompt into wire + trailing instruction and count o200k tokens.
Uses the gpt-tokenizer o200k encoder through node (same package as bpe.ts). No encoder is re-run.
Input: bench/x16/lakonikos-d/<lane>.prompt.txt, bench/x16/lakonikos-d/<lane>.wire.txt
Output: bench/x17/contract/split.tsv
"""
import glob, os, json, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'bench/x16/lakonikos-d')
lanes = sorted(os.path.basename(p)[:-len('.prompt.txt')] for p in glob.glob(os.path.join(D, '*.prompt.txt')))
items = []
for lane in lanes:
    prompt = open(os.path.join(D, lane + '.prompt.txt'), encoding='utf8').read()
    wire = open(os.path.join(D, lane + '.wire.txt'), encoding='utf8').read()
    assert prompt.startswith(wire) or wire in prompt, lane
    tail = prompt[len(wire):] if prompt.startswith(wire) else prompt.replace(wire, '', 1)
    items.append({'lane': lane, 'wire': wire, 'prompt': prompt, 'tail': tail})
js = os.path.join(ROOT, 'bench/x17/contract/_items.json')
json.dump(items, open(js, 'w', encoding='utf8'))
code = r"""
const fs=require('fs');const {encode}=require('gpt-tokenizer/encoding/o200k_base');
const items=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const out=items.map(it=>({lane:it.lane, prompt:encode(it.prompt).length, wire:encode(it.wire).length, tail:encode(it.tail).length, tailText:it.tail}));
process.stdout.write(JSON.stringify(out));
"""
r = subprocess.run(['node', '-e', code, js], cwd=ROOT, capture_output=True, text=True)
if r.returncode != 0:
    raise SystemExit(r.stderr[-2000:])
res = json.loads(r.stdout)
with open(os.path.join(ROOT, 'bench/x17/contract/split.tsv'), 'w', encoding='utf8') as f:
    f.write('lane\tprompt\twire\ttail\n')
    for x in res:
        f.write(f"{x['lane']}\t{x['prompt']}\t{x['wire']}\t{x['tail']}\n")
print('lanes', len(res), 'mean tail tokens', round(sum(x['tail'] for x in res)/len(res),1), 'min', min(x['tail'] for x in res), 'max', max(x['tail'] for x in res))
print('distinct tails', len(set(x['tailText'] for x in res)))
