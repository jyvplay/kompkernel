#!/usr/bin/env python3
"""X53 probe1: (a) markdown anchor-slug entailment mass; (b) df/free derived columns."""
import os, re, subprocess, math, sys

ROOT = '/home/user/kompkernel'

def gh_slug(s):
    # GitHub heading slug: lowercase, strip punct except -_, spaces->-, dedupe handled by -N suffix
    s = s.strip().lower()
    s = re.sub(r'[^\w\- ]', '', s, flags=re.UNICODE)
    return s.replace(' ', '-')

md_files = []
for base, dirs, files in os.walk(ROOT):
    if 'node_modules' in base or '.git' in base: continue
    for f in files:
        if f.endswith('.md'):
            md_files.append(os.path.join(base, f))
print(f'md files: {len(md_files)}')

link_re = re.compile(r'\[([^\]]*)\]\((#[^)]+)\)')
head_re = re.compile(r'^#{1,6}\s+(.+?)\s*$', re.M)
tot_links = 0; text_slug_match = 0; heading_found = 0; heading_match = 0
slug_chars = 0; match_slug_chars = 0
examples = []
for path in md_files:
    try: txt = open(path, encoding='utf-8').read()
    except Exception: continue
    # build heading slug set with GitHub dedup
    slugs = {}
    for h in head_re.findall(txt):
        base = gh_slug(re.sub(r'`|[*_~]', '', h))
        n = slugs.get(base, 0); slugs[base] = n + 1
        key = base if n == 0 else f'{base}-{n}'
        slugs.setdefault('__set__', set()).add(key)
    hset = slugs.get('__set__', set())
    for m in link_re.finditer(txt):
        text, href = m.group(1), m.group(2)
        slug = href[1:]
        tot_links += 1; slug_chars += len(slug)
        if gh_slug(text) == slug:
            text_slug_match += 1; match_slug_chars += len(slug)
            if len(examples) < 6: examples.append((os.path.basename(path), text, slug))
        if slug in hset: heading_found += 1
print(f'anchor links total: {tot_links}, text-slugify==slug: {text_slug_match}, slug in heading set: {heading_found}')
print(f'slug chars total: {slug_chars}, in text-derivable matches: {match_slug_chars}')
for e in examples: print('  ex:', e)

print('\n--- df / df -k derived column checks (real output, this sandbox) ---')
for args in (['df', '-k'], ['df', '-k', '-T'], ['df', '-h']):
    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=20).stdout
    except Exception as e:
        print(args, 'ERR', e); continue
    lines = out.strip().split('\n')
    print(f'{args}: {len(lines)} lines; header: {lines[0]!r}')
    ok = tot = 0; av_ok = 0
    for ln in lines[1:]:
        toks = ln.split()
        try:
            if args[-1] == '-k' and '-T' not in args:
                total, used, avail, pct = int(toks[1]), int(toks[2]), int(toks[3]), toks[4]
            elif '-T' in args:
                total, used, avail, pct = int(toks[2]), int(toks[3]), int(toks[4]), toks[5]
            else:
                continue
        except Exception:
            continue
        if pct == '-': continue
        tot += 1
        p = int(pct.rstrip('%'))
        pred = math.ceil(100 * used / (used + avail)) if (used + avail) else 0
        if pred == p: ok += 1
        if total - used == avail: av_ok += 1
    print(f'  Use%=ceil(100*Used/(Used+Avail)): {ok}/{tot}; Avail==Total-Used: {av_ok}/{tot}')

print('\n--- free (kB) ---')
try:
    out = subprocess.run(['free', '-k'], capture_output=True, text=True, timeout=20).stdout
    print(out)
    for ln in out.strip().split('\n')[1:]:
        t = ln.split()
        if t[0] == 'Mem:':
            total, used, free_, shared, bc, avail = map(int, t[1:7])
            print(f'  Mem: total-(used+free+bc)={total-used-free_-bc} (0 iff exact identity)')
        if t[0] == 'Swap:':
            total, used, free_ = map(int, t[1:4])
            print(f'  Swap: total-(used+free)={total-used-free_}')
except Exception as e:
    print('free ERR', e)
