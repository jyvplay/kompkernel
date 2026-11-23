"""Compare complete speed wires, not a wire hash against a payload-object hash."""
import json
from pathlib import Path
fresh={r['path']:r for r in map(json.loads,Path('bench/x163/receipts/frontier.jsonl').read_text().splitlines())}
n=0
for r in map(json.loads,Path('bench/x163/receipts/speed.jsonl').read_text().splitlines()):
 assert fresh[r['path']]['message']==r['message']
 assert fresh[r['path']]['tokens']==r['tokens']
 n+=1
assert n==12
Path('bench/x163/receipts/speed-frontier.json').write_text(json.dumps({'checks':n,'allWiresMatchFreshCanonical':True,'method':'direct complete wire and token equality; runner hash covers JSON payload, not wire alone'},indent=2))
print(n)
