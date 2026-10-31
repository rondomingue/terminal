# Island reference labels

Study-only labels supplement the 209-place quiz collection. They do not add quiz targets or change ranks.

- Natural Earth 1:10m Geography Regions Polygons (Island and Island group features), public domain: https://www.naturalearthdata.com/downloads/10m-physical-vectors/ and https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_regions_polys.geojson
- REST Countries territory names and representative coordinates: https://restcountries.com/

Retrieved October 31, 2026. Geographic island labels use an area centroid of the largest polygon, with longitude unwrapped around the antimeridian. Positions are cartographic label anchors, not boundaries or territorial claims. Existing quiz names take priority to avoid duplicate labels.

Regenerate with `python3 scripts/build-island-labels.py /path/to/rest-countries.json /path/to/ne_10m_geography_regions_polys.geojson`.
