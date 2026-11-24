"""Concrete falsifiers of shortcuts; not implementations of six Pareto codecs."""
import itertools,json
from pathlib import Path
rows=[]
def record(branch,artifact,gap):rows.append(dict(branch=branch,artifact=artifact,gap=gap))
# Sum constraints cannot recover order in a mixed two-site assignment.
a=['a','bb'];collisions={}
for seq in itertools.product(a,repeat=2):collisions.setdefault(sum(map(len,seq)),[]).append(seq)
assert len(collisions[3])==2
record('ambiguous alias / METRIDA',collisions[3],'Reject both rather than guess; paid headers still need parent gains.')
# Temporal alternation cannot represent arbitrary occurrence order.
seq=['a','a','bb'];cycle=['a','bb'];assert seq!=[cycle[i%2] for i in range(3)]
record('temporal cycle',seq,'KYKLOS prior art; exceptions and reset state cost bits.')
# Case normalization merges distinct original bytes.
assert 'API'.lower()=='api'.lower() and b'API'!=b'api'
record('normalization plus repair',['API','api'],'Case repair must be transmitted and priced; not a new codec.')
# Shared prior/semantic guessing is not source identification.
assert 'The server restarted.'!='The server rebooted.'
record('semantic side information',['The server restarted.','The server rebooted.'],'A plausible paraphrase fails byte identity; shared prior not free.')
# Ordered references need occurrence information beyond a dictionary.
assert sorted(['a','bb'])==sorted(['bb','a'])
record('dictionary with order tape',[['a','bb'],['bb','a']],'DEIKTIS-family tape is paid; not novel by renaming.')
# Length-only surrogate score does not define tokenizer cost.
record('streamed BPE counting','receipts/runtime-summary.json','Exact count gates pass but six-lane ABBA fails speed threshold; benchmark-only.')
Path('bench/x171/receipts/structural.json').write_text(json.dumps(rows,indent=2));print(len(rows),'mechanism branches with concrete artifacts; only METRIDA is a new codec')
