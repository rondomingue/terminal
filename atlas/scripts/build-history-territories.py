"""Build grouped study/quiz polygons from the public DARMC map services.
Inputs: Roman ca. AD117 layer 14, Medieval ca. AD1200 layer 11.
Preserve geographical groupings; never substitute modern country borders.
"""
import json,re,sys
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'dist'
roman=json.load(open(sys.argv[1]));medieval=json.load(open(sys.argv[2]))
config={
 'roman':{'BRITANNIA':('britannia','Britannia'),'BAETICA':('baetica','Hispania Baetica'),'LUGDUNENSIS':('lugdunensis','Gallia Lugdunensis'),'AEGYPTUS':('aegyptus','Aegyptus'),'DACIA':('dacia','Dacia'),'AFRICA PROCONSULARIS':('africa','Africa Proconsularis'),'ITALIA':('italia','Italia'),'SYRIA':('syria','Syria'),'ASIA':('asia','Asia'),'NORGIUM':('noricum','Noricum')},
 'medieval':{'Kingdom of England':('england','Kingdom of England'),'Kingdom of Scotland':('scotland','Kingdom of Scotland'),'Kingdom of France':('france','Kingdom of France'),'Holy Roman Empire':('hre','Holy Roman Empire'),'Byzantine Empire':('byzantium','Byzantine Empire'),'Almohad Dynasty':('almohads','Almohad Caliphate'),'Venetian Areas':('venetian','Republic of Venice'),'Kingdom of Castille':('castile','Kingdom of Castile'),'Kingdom of Sicily':('sicily','Kingdom of Sicily')}}
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def rounded(v):return [rounded(x) for x in v] if isinstance(v,list) else round(v,5) if isinstance(v,float) else v
def anchor(polys):
 ring=max((p[0] for p in polys),key=lambda r:abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(r,r[1:]))))
 area=cx=cy=0
 for a,b in zip(ring,ring[1:]):
  v=a[0]*b[1]-b[0]*a[1];area+=v;cx+=(a[0]+b[0])*v;cy+=(a[1]+b[1])*v
 return [cx/(3*area),cy/(3*area)] if area else ring[0]
for era,collection in [('roman',roman),('medieval',medieval)]:
 groups={}
 for f in collection['features']:
  p=f['properties']
  if era=='roman':name=' '.join(p['PROV_NAME'].split())
  else:
   region=p['REGIONNAME'];kingdom=p['KINGDOMNAME']
   # The source contains some later polities under the ca. 1200 heading; omit them.
   if 'Golden' in kingdom or region in ['Kingdom of Granada','Duchy of Edessa']:continue
   name=region if kingdom=='Islamic World' or region=='Papal States' else kingdom
  id,label=config[era].get(name,(slug(name),name.title() if era=='roman' else name))
  group=groups.setdefault(id,{'label':label,'parts':[]})
  geometry=f['geometry'];group['parts'].extend(geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']])
 features=[];labels=[]
 for i,(id,g) in enumerate(groups.items()):
  props={'id':id,'name':g['label'],'tone':i%6,'era':era}
  features.append({'type':'Feature','id':id,'properties':props,'geometry':{'type':'MultiPolygon','coordinates':rounded(g['parts'])}})
  labels.append({'type':'Feature','properties':props,'geometry':{'type':'Point','coordinates':rounded(anchor(g['parts']))}})
 attribution='Harvard Mapping Past Societies / DARMC. '+('Matthew Polk; Barrington Atlas, ed. Richard J. A. Talbert (2000).' if era=='roman' else 'Darryl Campbell, Nathaniel Donoghue, Kelly Gibson, Matthew Polk.')
 for suffix,fs in [('',features),('-labels',labels)]:
  (out/(era+'-territories'+suffix+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','attribution':attribution,'features':fs},ensure_ascii=False,separators=(',',':')))
 print(era,len(features),'territories')
