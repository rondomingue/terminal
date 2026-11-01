"""Group AWMC 60 BC extent polygons into broad geographic learning regions. Input: original AWMC roman_empire_bce_60 GeoJSON; ODbL 1.0."""
import json,math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'dist'
import sys
x=json.load(open(sys.argv[1]))
# Broad geographic groups, not reconstructed provincial administrative boundaries.
regions=[('italia','Italia & Cisalpine Gaul',[12.5,43],14),('gallia','Transalpine Gaul',[4.3,44],18),('greece','Macedonia & Greece',[22,39],26),('hispania','Hispania',[-3,40],33),('corsica','Corsica',[9,42],39),('bithynia','Bithynia & Pontus',[33,40],44),('sardinia','Sardinia',[9,40],45),('asia','Asia',[28.5,38.5],50),('syria','Syria',[36.5,35],122),('sicilia','Sicilia',[14,37.5],77),('cyrenaica','Cyrenaica',[22,32],79),('africa','Africa',[9.5,35.5],90),('crete','Crete',[25,35.2],112)]
groups={r[0]:[] for r in regions};byoid={r[3]:r for r in regions}
for f in x['features']:
 ring=f['geometry']['coordinates'][0];center=[sum(p[i] for p in ring)/len(ring) for i in [0,1]]
 r=byoid.get(f['properties']['OBJECTID']) or min(regions,key=lambda r:(center[0]-r[2][0])**2*math.cos(math.radians(center[1]))**2+(center[1]-r[2][1])**2)
 groups[r[0]].append(f['geometry']['coordinates'])
attr='Ancient World Mapping Center (AWMC), Roman territory 60 BC; Barrington Atlas / AWMC modifications to OpenStreetMap. ODbL 1.0. Atlas groups source polygons into broad geographic regions; these are not exact provincial boundaries.'
for labels in [False,True]:
 fs=[]
 for i,(id,name,center,oid) in enumerate(regions):
  fs.append({'type':'Feature','properties':{'id':id,'name':name,'tone':i%6,'era':'republic'},'geometry':{'type':'Point','coordinates':center} if labels else {'type':'MultiPolygon','coordinates':groups[id]}})
 (out/('republic-territories'+('-labels' if labels else '')+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','attribution':attr,'license':'https://opendatacommons.org/licenses/odbl/1-0/','source':'https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60','features':fs},separators=(',',':')))
