"""Extract current data into an audit inventory; no application writes."""
from pathlib import Path
import json, re
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
record = json.loads((OUT / 'production_inventory.json').read_text())
locale = {lang: json.loads((ROOT / f'locales/{lang}.json').read_text()) for lang in ['ko','en']}
npc_i18n = (ROOT / 'locales/npcI18n.ts').read_text()
names = {}
for lang, nextlang in [('ko','en'), ('en','ja')]:
    chunk = npc_i18n.split('  '+lang+': {',1)[1].split('  '+nextlang+': {',1)[0]
    names[lang] = {int(id_): (title if title==name else title+' '+name) for id_,title,name in
                   re.findall(r"'(\d+)': \{ title: '([^']+)', name: '([^']+)'", chunk)}
chunks = re.split(r'\n  npc\(', (ROOT / 'constants/npcs.ts').read_text().split('export const NPCS:',1)[1])[1:]
speeds = [int(x) for x in re.findall(r"\['[^']+', (\d+)\]", (ROOT / 'constants/npcRoster.ts').read_text())]
abilities = ['none']*12 + ['mirror','thunderbolt','blindBang','screenShakeLight','screenShakeMedium','screenShakeHeavy','invertedSignals','echoReady','chaosRandom','paleSilence']
for e in record['entries']:
    id_ = e['number']
    if e['kind']=='player':
        e.update({lang+'_name':locale[lang]['character']['list'][str(id_)]['name'] for lang in ['ko','en']})
        e.update(tier=None, reaction_ms=None, boss=False, hidden_flag=False,
                 hidden_unlock=id_==4, role='selectable_player', special_duel=False,
                 ability_key=[None,'lastStand','headshot','revive'][id_-1],
                 ability_description=locale['ko']['character']['list'][str(id_)]['abilityDesc'].replace('{{ms}}', '80'),
                 unlock_condition=['default','10 NPC clears','15 NPC clears','all NPC clears and average reaction <=200ms'][id_-1],
                 design_keywords=None, lore=None)
    else:
        chunk = chunks[id_-1]
        header = re.match(r"(\d+), (\d+), '([^']+)', (true|false)",chunk)
        assert int(header[1])==id_
        keywords = re.search(r"designKeywords:\s*'([^']+)'",chunk)[1]
        e.update({lang+'_name':names[lang][id_] for lang in ['ko','en']})
        e.update(tier=header[3], reaction_ms=speeds[id_-1], boss=header[4]=='true',
                 hidden_flag=id_==22, masked_until_n18_clear=19<=id_<=21,
                 role=('speed/brown_cowboy' if id_<=9 else 'skill/sheriff' if id_<=12 else 'skill/red_gunslinger' if id_<=18 else 'skill/undead'),
                 special_duel=id_>=13, ability_key=abilities[id_-1], design_keywords=keywords, lore=None)
        if id_>=13:
            ko_chunk=npc_i18n.split('  en: {',1)[0]
            ability=re.search(r'\b'+abilities[id_-1]+r": \{\s*name: '([^']+)',\s*desc: '([^']+)'",ko_chunk)
            e['ability_description']=ability[2]
        else: e['ability_description']=None
(OUT / 'identity_inventory.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('Enriched 26 runtime identities, retaining measured source data.')
