"""Independent Python macro reader, never encoder self-report or native LLM."""
import json,pathlib,importlib.util
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cd',root/'bench/chiron_decode.py');cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
headers=['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n','¶ k=v; expand recursively. Print only.\n']
n=0
for name in ['unit-wires','integration','probe','heldout','heldout-baseline']:
 for line in (root/f'bench/x145/receipts/{name}.jsonl').read_text().splitlines():
  a=json.loads(line)
  if name=='probe':
   if not a['result']:continue
   m=a['result']['message']
  else:m=a['message']
  source=(root/a['path']).read_bytes() if 'path'in a else a['source'].encode('utf8')
  m.encode('utf8',errors='strict');h=next((h for h in headers if m.startswith(h+'§')),None)
  out=cd.decode(m[len(h):]) if h else m
  assert out.encode('utf8')==source,(name,a.get('path'))
  n+=1
print(json.dumps({'independentSourceReads':n,'native':'NOT_RUN'}))
