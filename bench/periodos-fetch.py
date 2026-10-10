"""bench/periodos-fetch.py — regenerate the PERIODOS wrapped-prose corpus (outside git).

Sources (both reachable from the sandbox allow-list):
  1. github.com/github/choosealicense.com  _licenses/*.txt   via api.github.com (contents API, base64)
  2. pypi.org JSON + files.pythonhosted.org sdists           plain-text NEWS/CHANGES/README/LICENSE files

Writes to ${PERIODOS_CORPUS:-/home/user/corpus}/{licenses,pypi}. Verify with bench/periodos-corpus-manifest.json.
"""
import base64, io, json, os, re, tarfile, urllib.request

ROOT = os.environ.get('PERIODOS_CORPUS', '/home/user/corpus')
H = {'User-Agent': 'periodos-fetch', 'Accept': 'application/vnd.github+json'}
PKGS = ['six', 'pyparsing', 'docopt', 'tabulate', 'colorama', 'ply', 'pluggy', 'mock', 'toml', 'pytz',
        'python-dateutil', 'idna', 'chardet', 'certifi', 'click', 'jinja2', 'markupsafe', 'werkzeug', 'docutils',
        'pyflakes', 'pycodestyle', 'simplejson', 'tqdm', 'pexpect', 'pyyaml', 'psutil', 'attrs', 'pygments',
        'bleach', 'html5lib', 'wheel', 'virtualenv', 'pkginfo', 'twine', 'pytest', 'coverage', 'nose', 'paramiko',
        'ptyprocess', 'requests', 'urllib3', 'packaging', 'filelock', 'platformdirs', 'typing-extensions', 'zipp',
        'iniconfig', 'pathspec', 'shellingham', 'wcwidth', 'pyasn1', 'rsa', 'oauthlib', 'sqlparse', 'mccabe', 'isort',
        'tomli', 'exceptiongroup', 'greenlet', 'mako', 'itsdangerous', 'blinker', 'dill', 'cloudpickle', 'parso',
        'jedi', 'executing', 'stack-data', 'asttokens', 'pure-eval', 'decorator', 'traitlets', 'prompt-toolkit',
        'pickleshare', 'wrapt', 'deprecated', 'gitpython', 'smmap', 'regex']
NAME = re.compile(r'^(LICENSE|LICENCE|COPYING|NEWS|CHANGES|CHANGELOG|HISTORY|AUTHORS|THANKS|README|INSTALL|ChangeLog|NOTICE)(\.(txt|rst|md))?$', re.I)

def get(url, binary=False):
    data = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
    return data if binary else json.loads(data)

os.makedirs(f'{ROOT}/licenses', exist_ok=True)
os.makedirs(f'{ROOT}/pypi', exist_ok=True)
for it in get('https://api.github.com/repos/github/choosealicense.com/contents/_licenses'):
    if it['name'].endswith('.txt'):
        d = get(it['url'])
        open(f"{ROOT}/licenses/{it['name']}", 'wb').write(base64.b64decode(d['content']))
for p in PKGS:
    try:
        meta = get(f'https://pypi.org/pypi/{p}/json')
    except Exception:
        continue
    sd = [u for u in meta['urls'] if u['packagetype'] == 'sdist']
    if not sd or sd[0]['size'] > 3_000_000:
        continue
    try:
        tf = tarfile.open(fileobj=io.BytesIO(get(sd[0]['url'], binary=True)), mode='r:*')
    except Exception:
        continue
    for m in tf.getmembers():
        base = os.path.basename(m.name)
        if not m.isfile() or not NAME.match(base) or not (2000 <= m.size <= 200_000):
            continue
        raw = tf.extractfile(m).read()
        if b'\x00' in raw:
            continue
        try:
            raw.decode('utf8')
        except Exception:
            continue
        open(f'{ROOT}/pypi/{p}__{base}', 'wb').write(raw)
print('done', ROOT)
