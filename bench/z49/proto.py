# Z49 prototype: induce sibling-template fields in pretty-printed JSON, emit sentence + reduced text (no exactness guard yet).
import re, sys, json
from collections import defaultdict, Counter
FIELD = re.compile(r'^(\s*)"((?:[^"\\]|\\.)*)": (.*?)(,?)$')
CLOSER = re.compile(r'^(\s*)([}\]])(,?)$')
OPENER = re.compile(r'^(\s*)([{\[])$')
def parse(lines):
    # returns list of objects: dict(open=i, close=j, fields=[(line_idx, key, valtext, is_opener)])
    stack=[]; objects=[]
    for i,l in enumerate(lines):
        m=FIELD.match(l)
        if m:
            key, val = m.group(2), m.group(3)
            cur = stack[-1] if stack else None
            if cur is not None and cur['kind']=='{': cur['fields'].append([i,key,val,val in ('{','[')])
            if val in ('{','['):
                o={'kind':val,'open':i,'close':None,'fields':[],'key':key}; stack.append(o)
                if val=='{': objects.append(o)
            continue
        m=OPENER.match(l)
        if m:
            o={'kind':m.group(2),'open':i,'close':None,'fields':[],'key':None}; stack.append(o)
            if m.group(2)=='{': objects.append(o)
            continue
        m=CLOSER.match(l)
        if m and stack:
            o=stack.pop(); o['close']=i
    return objects
def unq(v):
    if len(v)>=2 and v[0]=='"' and v[-1]=='"': return v[1:-1]
    return v
def skeleton(obj, fi):
    i,key,val,isop = obj['fields'][fi]
    if isop: return None
    sibs=[(unq(v),k) for (j,k,v,op) in obj['fields'] if not op and k!=key]
    sibs=[(s,k) for s,k in sibs if len(s)>=3 and s not in ('true','false','null')]
    sibs.sort(key=lambda x:(-len(x[0]), x[1]))
    sk=val; slots=[]
    for s,k in sibs:
        # replace boundary-delimited occurrences not inside a placeholder
        out=''; p=0; found=False
        while True:
            q=sk.find(s,p)
            if q<0: break
            before=sk[q-1] if q>0 else ''; after=sk[q+len(s)] if q+len(s)<len(sk) else ''
            inside = sk.rfind('<',0,q) > sk.rfind('>',0,q)
            if not inside and not (before.isalnum()) and not (after.isalnum()):
                out+=sk[p:q]+'<'+k+'>'; p=q+len(s); found=True
            else:
                out+=sk[p:q+1]; p=q+1
        out+=sk[p:]
        if found: sk=out; slots.append(k)
    return sk, slots
def induce(text):
    lines=text.split('\n'); objects=parse(lines)
    groups=defaultdict(list)  # (key, anchor, skeleton) -> [(obj, fi)]
    for o in objects:
        for fi in range(len(o['fields'])):
            r=skeleton(o,fi)
            if r is None: continue
            sk,slots=r
            if '<' in sk and not slots: continue
            anchor = o['fields'][fi-1][1] if fi>0 else '{'
            groups[(o['fields'][fi][1], anchor, sk)].append((o,fi))
    return lines, objects, groups
if __name__=='__main__':
    text=open(sys.argv[1]).read(); minc=int(sys.argv[2]) if len(sys.argv)>2 else 2
    lines,objects,groups=induce(text)
    chosen=[(k,v) for k,v in groups.items() if len(v)>=minc]
    # skip constants unless count>=4
    chosen=[(k,v) for k,v in chosen if ('<' in k[2]) or len(v)>=4]
    removed=set()
    for (key,anchor,sk),v in chosen:
        for o,fi in v: removed.add(o['fields'][fi][0])
    # kind key per group: the key present in all group objects (choose 'login' etc: first field key of objects)
    by_kind=defaultdict(list)
    for (key,anchor,sk),v in chosen:
        kinds=Counter(o['fields'][0][1] for o,fi in v)
        kind=kinds.most_common(1)[0][0]
        by_kind[kind].append((anchor,key,sk,len(v), v[0][1]))
    sent=[]
    for kind,items in by_kind.items():
        items.sort(key=lambda x:x[4])
        runs=[]; 
        for anchor,key,sk,n,pos in items:
            if runs and runs[-1]['last']==anchor: runs[-1]['items'].append((key,sk)); runs[-1]['last']=key
            else: runs.append({'anchor':anchor,'items':[(key,sk)],'last':key})
        parts=[]
        for r in runs:
            parts.append(('at start' if r['anchor']=='{' else 'after "%s"'%r['anchor'])+': '+', '.join('"%s": %s'%(k,sk) for k,sk in r['items']))
        sent.append('objects with "%s" — %s'%(kind,'; '.join(parts)))
    clause='≡ '+' | '.join(sent)
    reduced='\n'.join(l for i,l in enumerate(lines) if i not in removed)
    sys.stderr.write('templates=%d removedLines=%d clauseChars=%d\n'%(len(chosen),len(removed),len(clause)))
    out=sys.argv[3] if len(sys.argv)>3 else None
    if out: open(out,'w').write(clause+'\n'+reduced)
    else: print(clause); print(reduced[:1500])
