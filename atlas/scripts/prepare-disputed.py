"""Add Kosovo and Western Sahara after preparing the standard collection.
Inputs: cached REST Countries JSON and archived Factbook directory.
"""
import sys,json,re,html
from pathlib import Path
root=Path(__file__).resolve().parents[1];dist=root/'dist'
raw={c['cca3']:c for c in json.loads(Path(sys.argv[1]).read_text())};fb=Path(sys.argv[2])
cs=json.loads((dist/'countries.json').read_text());facts=json.loads((dist/'facts.json').read_text());geo=json.loads((dist/'world.geojson').read_text())
def clean(x):
 if isinstance(x,dict):x=x.get('text','')
 return re.sub(r'\s+',' ',re.sub('<[^>]+>','',html.unescape(str(x or '')))).strip()
items=[('XKX','UNK','Europe','europe/kv.json','Partially recognized state','Kosovo declared independence from Serbia in 2008. Its recognition is not universal, and Serbia contests its independence.','https://www.dfat.gov.au/geo/kosovo/kosovo-country-brief'),('ESH','ESH','Africa','africa/wi.json','Disputed territory','Western Sahara is listed by the United Nations as a Non-Self-Governing Territory. Its final status is unresolved; Morocco and the Polisario Front contest sovereignty. The flag shown is the Sahrawi Arab Democratic Republic (SADR) flag.','https://www.un.org/dppa/decolonization/en/nsgt/western-sahara')]
for id,key,region,path,status,note,url in items:
 r=raw[key];c=dict(id=id,code=r['cca2'].lower(),name=r['name']['common'],continent=region,center=list(reversed(r['latlng'])),capital=', '.join(r['capital']),area=r['area'],flag=r['flag'],territory=True,disputed=True,statusLabel=status,statusNote=note,capitalLocations=[dict(name=r['capital'][0],center=list(reversed(r['capitalInfo']['latlng'])))],cityChoices=[])
 if id=='ESH':c.update(capital='El Aaiún (Laayoune)',capitalLabel='Administrative centre',capitalQuiz=False,capitalLocations=[dict(name='El Aaiún (Laayoune)',center=[-13.2033,27.1536])],flagDescription='Sahrawi Arab Democratic Republic flag associated with Western Sahara')
 cs=[x for x in cs if x['id']!=id];cs.append(c)
 for f in geo['features']:
  if f['properties']['name']==c['name']:f['properties'].update(code=id,continent=region,territory=True,disputed=True)
 x=json.loads((fb/path).read_text());people=x.get('People and Society',{});g=x.get('Geography',{});langs=people.get('Languages',{});rel=people.get('Religions',{})
 f=dict(languages=clean(langs.get('Languages',langs)),languageNote=clean(langs.get('note')),religions=clean(rel),religionNote=clean(rel.get('note')),government=clean(x.get('Government',{}).get('Government type')),governmentNote=note,population=clean(people.get('Population',{}).get('total',people.get('Population',{}))),location=clean(g.get('Location')),climate=clean(g.get('Climate')),terrain=clean(g.get('Terrain')),currency='Euro (EUR)' if id=='XKX' else 'Moroccan dirham (MAD) in Moroccan-administered areas.',sources=[dict(label='Status reference',url=url),dict(label='Archived World Factbook profile',url='https://github.com/factbook/factbook.json/blob/master/'+path)])
 if id=='ESH':
  f['government']='Disputed territory with unresolved sovereignty; Morocco administers most of the territory, while the Polisario Front/SADR administers other areas.'
  f['governmentNote']=note+' El Aaiún (Laayoune) is presented as an administrative centre, not an uncontested national capital; this place is omitted from capital-city quizzes.'
 facts['countries'][id]=f
cs.sort(key=lambda c:c['name'])
for name,data in [('countries.json',cs),('facts.json',facts),('world.geojson',geo)]: (dist/name).write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False))
print('Added Kosovo and Western Sahara with disputed-status profiles and selectable boundaries.')
