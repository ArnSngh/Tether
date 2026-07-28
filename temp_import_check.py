import os
import re
import glob
from pathlib import Path

root = Path(r"c:/Users/Aryan Singh/OneDrive/Desktop/MERN chat app")
patterns = [
    "Backend/**/*.js",
    "Backend/**/*.jsx",
    "Backend/**/*.ts",
    "Backend/**/*.tsx",
    "frontend/src/**/*.js",
    "frontend/src/**/*.jsx",
    "frontend/src/**/*.ts",
    "frontend/src/**/*.tsx",
]
files = []
for pattern in patterns:
    files.extend(glob.glob(str(root / pattern), recursive=True))
files = sorted(set(files))
import_re = re.compile(r"(?:from|require)\s*\(?['\"](\.?\.?/[^'\"]+)['\"]")

for f in files:
    path = Path(f)
    if "node_modules" in str(path) or ".git" in str(path):
        continue
    rel = path.relative_to(root).as_posix()
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        continue
    for match in import_re.finditer(text):
        spec = match.group(1)
        if not spec.startswith('.'):
            continue
        target = (path.parent / spec).resolve()
        candidates = []
        if path.suffix:
            candidates = [target]
        else:
            candidates = [target]
        if target.suffix == '':
            candidates += [target.with_suffix('.js'), target.with_suffix('.jsx'), target.with_suffix('.ts'), target.with_suffix('.tsx'), target.with_suffix('.json')]
        found = any(c.exists() for c in candidates)
        if not found:
            print(f"{rel} -> {spec} MISSING")
