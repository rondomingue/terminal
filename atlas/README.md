# Atlas — Know your world

A dark, interactive Mapbox globe quiz covering 195 countries: 193 UN member states, Palestine and Vatican City. Choose one continent or the whole world. Each country appears once in a shuffled expedition. Optional flags-only play, answer reveals, saved progress, regional bests, completion badges, and missed-country practice are included. Larger, high-resolution flags accompany each question. After answering, a country profile reveals languages spoken, religions and government type, with a full profile dialog, estimate years and source links.

## Run locally

From this directory, run `python3 -m http.server 4173 --directory dist` and open http://localhost:4173. Internet access is needed for Mapbox GL JS and web fonts. Country geometry, metadata and all 195 flag images are bundled locally.

## Verify

Run `node --check dist/game.js` and `node scripts/verify-game.cjs`. Verification checks dataset completeness, flags, continent counts, complete quiz runs for every region and the world, scoring, out-of-region rejection, skips and local persistence.

## Data

- Country metadata: https://github.com/mledoze/countries
- Generalised Natural Earth boundaries: https://github.com/datasets/geo-countries
- Flag images: https://flagcdn.com

Each country belongs to one continent for quiz purposes. Russia is in Europe; Cyprus, Türkiye, Armenia, Azerbaijan, Georgia and Kazakhstan are in Asia. North America includes Central America and the Caribbean. See the in-game country notes.

The Mapbox public client token is intended for browser use. Deployment access remains owner-private.

## Country reference profiles

`dist/facts.json` contains profiles for all 195 countries, drawn from the public-domain World Factbook archive at https://github.com/factbook/factbook.json, with supplementary official sources for Palestine and Saint Kitts and Nevis. Profiles are archived reference data, not live government classifications. Source estimate years, notes and links are preserved. Retrieved October 26, 2026. To rebuild from a downloaded archive checkout, run `python3 scripts/prepare-facts.py /path/to/factbook.json`. The explicit country-to-profile mapping is in `scripts/factbook-map.json`. Facts load independently, so reference-file failures do not interrupt the quiz.

## Discovery cards and outlines

A correct answer automatically opens the country profile, with a silhouette and flag, capital, population, area, currency, location, climate, terrain, languages, religions and government type. Dated estimates and archival source context are retained. The card includes a Next country button and can be reopened after answering. Wrong answers and skips do not automatically open it. Country silhouettes are bundled SVGs generated with `python3 scripts/prepare-outlines.py` from the quiz geometry; they show simplified main territory and nearby islands, with distant dependencies sometimes omitted. No third-party image service is used for outlines.

Globe position and zoom remain unchanged on correct answers, advancing to the next country, and completing an expedition. Misses and skips move to the correct country and highlight it in green. A Show correct location button repeats the reveal. Choosing a new expedition or using the recenter control resets the view.
