"""Mechanically package already-written briefs; no generation or source mutation."""
from pathlib import Path
import json, hashlib
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
text=(OUT/'PRODUCTION_BRIEFS.md').read_text()
shared=text.split('## Shared production contract',1)[1].split('## P04 —',1)[0]
sources=json.loads((OUT/'source_references.json').read_text())
ids=['P04','NPC15','NPC19','NPC20']
for index,id_ in enumerate(ids):
    section=text.split('## '+id_+' —',1)[1]
    next_heading='## '+ids[index+1]+' —' if index<3 else '## Silhouette / color / weapon differentiation matrix'
    section=section.split(next_heading,1)[0]
    source=next(s for s in sources['sources'] if s['id']==id_)
    header=f'# HIGH NOON — {id_} production brief\n\nBRIEF ONLY. No image has been generated. Human direction approval pending.\n\nAttach this ONE current source to the future generation call:\n{source["high_res_source_path"]}\n\nSource:1254×1254 true-alpha PNG. SHA-256:{source["source_sha256"]}\n\n'
    (OUT/(id_+'_BRIEF.md')).write_text(header+'## Shared production contract'+shared+'## '+id_+' —'+section+
        '\nStop after this single IDLE candidate for human identity review. No FALL/DOWN, no runtime replacement.\n')
inventory=json.loads((ROOT/'artifacts/character-identity-audit/production_inventory.json').read_text())
assert all(hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==m['sha256'] for path,m in inventory['files'].items())
assert all(hashlib.sha256(Path(path).read_bytes()).hexdigest()==digest for path,digest in sources['protected_sha256'].items())
print('Packaged four briefs. All 156 audit sources and protected Combat masters unchanged.')
