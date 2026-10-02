"""Compose the audit report from read-only inventory and explicit judgments."""
from pathlib import Path
import hashlib, json
from collections import Counter
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
inventory=json.loads((OUT/'identity_inventory.json').read_text())
decisions=json.loads((OUT/'decisions.json').read_text())
by_id={d['id']:d for d in decisions}
assert len(by_id)==len(inventory['entries'])==26
counts=Counter(d['classification'] for d in decisions)
priorities=Counter(d['priority'] for d in decisions if d['priority'])
assert sum(counts.values())==26
changed=[]
for path,f in inventory['files'].items():
    if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=f['sha256']:changed.append(path)
assert not changed, changed
summary={'TOTAL_CHARACTERS':26, 'KEEP':counts['KEEP'],'MINOR_REDESIGN':counts['MINOR REDESIGN'],
         'MAJOR_REDESIGN':counts['MAJOR REDESIGN'],**{p:priorities[p] for p in ['P0','P1','P2','P3']},
         'PLAYER_AUDIT':'COMPLETE_4','NPC_AUDIT':'COMPLETE_22','PALE_RIDER':'MAJOR_P1',
         'SUPERNATURAL':'P04_N15_N19_N20_MAJOR_P0','HIGH_TIER':'PROGRESSION_WEAK_EXCEPT_N21_ANCHOR',
         'COMBAT_READY':[d['id'] for d in decisions if d['classification']=='KEEP'],
         'COMBAT_BLOCKED':[d['id'] for d in decisions if d['classification']!='KEEP'],
         'ADDITIONAL_APPROVAL_METADATA_HOLD':['P02'], 'PRODUCTION_FILES_HASH_VERIFIED':156,
         'SIMULATOR_REFERENCE':'NOT_CAPTURED_ORCA_UNAVAILABLE','CODE_CHANGED':'NO_APP_CODE',
         'ASSETS_CHANGED':'NO','DATABASE_CHANGED':'NO','GENERATION':'NONE','STATUS':'AUDIT_COMPLETE_HUMAN_CLASSIFICATION_REVIEW_PENDING'}
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
report=['# HIGH NOON — Character Identity Production Audit','', '2026-09-30 · dev-2.0 · AUDIT ONLY','',
        f'26명 감사 완료: **KEEP {counts["KEEP"]} / MINOR {counts["MINOR REDESIGN"]} / MAJOR {counts["MAJOR REDESIGN"]}**.',
        '', '우선 P0: P04(망령 사수), NPC15(그림자 사냥꾼), NPC19(보이드 워커), NPC20(에코 팬텀).',
        'P1: NPC06, 09, 10, 12, 13, 14, 16, 17, 18, 22. P2: P03, NPC07,08. P3: NPC02,04.', '',
        '## 26명 필수 판정 표','',
        '현재 asset은 IDLE 경로. 포스터와 모든 pose의 실제 경로/해시는 identity_inventory.json 참조.', '',
        '| ID | NAME (KO / EN) | TIER / TYPE | CURRENT ASSET | IDENTITY CLASS | CLASSIFICATION | PRIORITY | MAIN ISSUE | REDESIGN DIRECTION | COMBAT POSE STATUS |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for e in inventory['entries']:
    d=by_id[e['id']]
    status='현재 identity 가능 / 생성 안 함' if d['classification']=='KEEP' else 'minor 승인 후 제작' if d['classification']=='MINOR REDESIGN' else 'BLOCK: 새 identity 승인 전 금지'
    if e['id']=='N01':status='승인 FALL/DOWN 보호 / 변경 금지'
    if e['id']=='P02':status='identity 가능; 승인 metadata hold'
    tier=e['tier'] or 'tier 미정의'
    meta=f'{tier} / {e["role"]}'+(' / BOSS' if e['boss'] else '')+(' / SPECIAL' if e['special_duel'] else '')+(' / SECRET' if e['hidden_flag'] else '')
    path=ROOT/e['poses']['idle']
    report.append('| '+' | '.join([e['id'],e['ko_name']+' / '+e['en_name'],meta,f'[{e["poses"]["idle"]}]({path})',d['identity_class'],d['classification'],d['priority'] or '—',d['issue'],d['direction'],status])+' |')
report+=['', (OUT/'REPORT_BODY.md').read_text(), '', '## DATA / IDENTITY INVENTORY — 26명', '']
for e in inventory['entries']:
    report += [f'### {e["id"]} — {e["ko_name"]} / {e["en_name"]}', '',
               f'- tier/type: {e["tier"] or "미정의"} / {e["role"]}; boss={e["boss"]}; hidden/secret={e["hidden_flag"]}; special={e["special_duel"]}.',
               f'- reaction: {str(e["reaction_ms"])+"ms" if e["reaction_ms"] else "미정의 (Player 반응은 사용자 입력)"}.',
               f'- unlock: {e.get("unlock_condition", "진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도")}.',
               f'- ability: {e["ability_key"] or "none"}; {e["ability_description"] or "없음"}',
               f'- designKeywords: {e["design_keywords"] or "미정의; locale 이름/능력만 사용"}.',
               '- lore 전용 필드: 미정의 (새로 만들지 않음).',
               f'- idle: {e["poses"]["idle"]}',f'- poster: {e["poster"]}',
               f'- pose evidence: [5-pose sheet]({OUT / ("poses-"+e["id"]+"-dark.png")})','']
report+=['## Contact sheets / outputs','']
for group in ['A-players','B-npc01-11','C-npc12-22','D-boss-special-supernatural','E-full26-silhouettes','select-thumbnails','duel-approx241','duel-thumbnails','players-original-canvas']:
    report.append(f'- {group}: [neutral dark]({OUT/(group+"-dark.png")}) / [neutral light]({OUT/(group+"-light.png")})')
report+=['', '## Final checkpoint', '', '```text']
for k,v in summary.items(): report.append(f'{k}={json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v}')
report+=['MOST_SIMILAR_PAIRS=NPC19/20;P01/P04;NPC01/15;P03/NPC06;NPC03/22;NPC05/12;NPC13/19/20',
         'QUALITY_ISSUES=P02_RIM_WARNING;P02_APPROVAL_MANIFEST_MISMATCH',
         'CONTACT_SHEETS=A_B_C_D_E_DARK_AND_LIGHT',
         'SMALL_SIZE_SHEETS=SELECT256_DUEL241_STRESS160_DARK_AND_LIGHT','STOP=YES','```','']
(OUT/'AUDIT_REPORT.md').write_text('\n'.join(report))
print(json.dumps(summary,ensure_ascii=False))
