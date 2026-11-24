# Bundled exploration assets

All exploration requests stay on the site's origin. No API key or runtime CDN
is required. These files load only when the exploration view opens.

- `d3.v7.9.0.min.js`: D3 7.9.0, downloaded from
  https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js.
  SHA-256: `f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539`.
  See `D3-LICENSE.txt` (ISC license).
- `countries-110m.json`: Natural Earth 1:110m Admin 0 countries, downloaded
  2026-11-24 from
  https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson.
  Public domain: https://www.naturalearthdata.com/about/terms-of-use/.
  Coordinates rounded to three decimals; only `ADMIN` and `ADM0_A3` retained.
  This is a geographic reference basemap, not historical territorial boundaries.

`../places.json` records word-to-place claims and Wikidata coordinate references.
The markers represent cities rather than exact sites of invention. Egypt is
represented by its country polygon and explicitly marked as a historical
misidentification in the name *Gypsy*, not a claim about Romani origins.
