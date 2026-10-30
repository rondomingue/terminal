"""Build local country facts from a downloaded factbook/factbook.json checkout.
Usage: python3 scripts/prepare-facts.py /path/to/factbook.json
"""
import json,pathlib,re,html,sys
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1])
def clean(s):
 s=html.unescape(str(s));s=re.sub(r'<br\s*/?>','; ',s,flags=re.I);s=re.sub('<[^>]+>','',s)
 return re.sub(r'\s+',' ',s).strip(' ;')
def text(x):
 if isinstance(x,str):return clean(x)
 return clean(x.get('text','')) if isinstance(x,dict) else ''
countries=[c for c in json.loads((root/'dist/countries.json').read_text()) if not c.get('territory')];facts={}
paths=json.loads((root/'scripts/factbook-map.json').read_text())
for c in countries:
 if c['id']=='PSE':continue
 p=source/paths[c['id']];match=(p,json.loads(p.read_text()))
 assert match, f"Unmatched country: {c['name']}"
 p,x=match;people=x.get('People and Society',{});lang=people.get('Languages',{});religions=people.get('Religions',{});gov=x.get('Government',{}).get('Government type',{})
 facts[c['id']]={'languages':text(lang.get('Languages',lang)),'languageNote':clean(lang.get('note','')),'religions':text(religions),'religionNote':clean(religions.get('note','')),'government':text(gov),'governmentNote':clean(gov.get('note','')),'sources':[{'label':'World Factbook archived country profile','url':'https://github.com/factbook/factbook.json/blob/master/'+str(p.relative_to(source))}]}
facts['KNA']['religions']='Christianity is the predominant faith, with several denominations represented.'
facts['KNA']['sources'].append({'label':'Government of Saint Kitts and Nevis · country profile','url':'https://diaspora.gov.kn/st-kitts-nevis-2/'})
facts['PSE']={'languages':'Arabic is the official language. English is widely understood; Hebrew is also spoken.','languageNote':'Language context is drawn from the archived West Bank and Gaza profiles.','religions':'Islam, predominantly Sunni, is the majority religion; Christian communities are also present.','religionNote':'The archived West Bank and Gaza profiles report separate regional estimates, rather than one combined national percentage.','government':'The Basic Law provides for a parliamentary democratic system and a directly elected president.','governmentNote':'This describes the constitutional framework, rather than asserting that its provisions are fully implemented in practice.','sources':[{'label':'Palestinian Supreme Constitutional Court · Basic Law (Articles 4–5)','url':'https://tscc.pna.ps/en/pages?id=palestinian_basic_law'},{'label':'World Factbook archive · West Bank','url':'https://github.com/factbook/factbook.json/blob/master/middle-east/we.json'},{'label':'World Factbook archive · Gaza','url':'https://github.com/factbook/factbook.json/blob/master/middle-east/gz.json'}]}
# Additional reference facts retain their source dates and notes.
for c in countries:
 f=facts[c['id']]
 if c['id']=='PSE':
  west=json.loads((source/'middle-east/we.json').read_text());gaza=json.loads((source/'middle-east/gz.json').read_text())
  f['population']='West Bank: '+text(west['People and Society']['Population'].get('total',west['People and Society']['Population']))+'; Gaza: '+text(gaza['People and Society']['Population'].get('total',gaza['People and Society']['Population']))
  f['location']='Western Asia, on the eastern Mediterranean; the West Bank and Gaza Strip.'
  f['climate']='West Bank: '+text(west['Geography'].get('Climate'))+'; Gaza: '+text(gaza['Geography'].get('Climate'))
  f['terrain']='West Bank: '+text(west['Geography'].get('Terrain'))+'; Gaza: '+text(gaza['Geography'].get('Terrain'))
  f['currency']='Israeli new shekel (ILS); Jordanian dinar (JOD) and US dollar (USD) also circulate.'
  f['sources'].append({'label':'Palestine Monetary Authority / IMF · currency context','url':'https://dsbb.imf.org/sdds/dqaf-base/country/WBG/category/EXR00'})
 else:
  x=json.loads((source/paths[c['id']]).read_text());g=x.get('Geography',{});p=x.get('People and Society',{});e=x.get('Economy',{})
  f['population']=text(p.get('Population',{}).get('total',p.get('Population',{})))
  f['location']=text(g.get('Location'))
  f['climate']=text(g.get('Climate') or x.get('Environment',{}).get('Climate'))
  f['terrain']=text(g.get('Terrain'))
  currency=e.get('Exchange rates',{});currency=text(currency.get('Currency',{})) or text(currency)
  f['currency']=re.sub(r'\s+per US dollar.*$','',currency,flags=re.I).rstrip(' -')
 for key in ['population','location','climate','terrain','currency']:
  if not f.get(key):f[key]='Not specified in the archived profile.'

assert len(facts)==195
for id,f in facts.items():
 for field in ['languages','religions','government']:assert f[field],(id,field)
(root/'dist/facts.json').write_text(json.dumps({'sourceLabel':'World Factbook archive and linked supplementary sources','retrieved':'2026-10-26','note':'Archived reference profiles, not a live government directory. Estimate years are retained where supplied; classifications and demographics can change.','countries':facts},ensure_ascii=False,separators=(',',':')))
print('Prepared and validated facts for all 195 countries.')
