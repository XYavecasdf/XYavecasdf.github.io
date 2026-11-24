const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../explore-model.js');
const root = path.join(__dirname,'..');
const data = JSON.parse(fs.readFileSync(path.join(root,'lexicon.json')));
const model = M.build(data);
const expected = new Set();
for (const group of data.groups) for (const r of group.roots) for (const w of r.words) expected.add(M.originId(r)+'\0'+M.wordId(w));
assert.equal(model.nodes.size,527+257);
assert.deepEqual(new Set(model.edges.map(e=>e.source+'\0'+e.target)),expected,'No inferred or missing edges');
assert.equal(model.neighbors('origin:古希腊语:philein').filter(n=>n==='word:philanthropy').length,1,'Shared roots merged across themes');
const local=M.neighborhood(model,'word:philanthropy');
assert.equal(local.snapshot().nodes.length,11);
assert.ok(local.visible.has('word:anthropomorphic'));
assert.equal(model.nodes.get('origin:地名:egypt').kind,'place');
assert.equal(model.nodes.get('origin:人名:boycott').kind,'person');
assert.equal(M.search(model,'philanthropy')[0].id,'word:philanthropy');
assert.ok(M.search(model,'慈善').some(n=>n.id==='word:philanthropy'));
for (const word of Object.keys(data.lexicon)) assert.ok(M.neighborhood(model,M.wordId(word)).snapshot().nodes.length>1,word);

// Future high-degree roots must retain a visible, bounded expansion path.
const words=Array.from({length:51},(_,i)=>'w'+String(i).padStart(2,'0'));
const fixture={lexicon:Object.fromEntries(words.map(w=>[w,{zh:w}])),groups:[{name:'test',roots:[{term:'one',lang:'test',zh:'one',words}]}]};
const f=M.build(fixture), neighborhood=M.neighborhood(f,'origin:test:one');
assert.equal(neighborhood.visible.size,21);assert.equal(neighborhood.remaining('origin:test:one'),31);
neighborhood.expand('origin:test:one');assert.equal(neighborhood.visible.size,41);assert.equal(neighborhood.remaining('origin:test:one'),11);
neighborhood.expand('origin:test:one');assert.equal(neighborhood.visible.size,52);assert.equal(neighborhood.remaining('origin:test:one'),0);

const geo=JSON.parse(fs.readFileSync(path.join(root,'places.json')));
const world=JSON.parse(fs.readFileSync(path.join(root,'vendor/countries-110m.json')));
assert.equal(new Set(geo.places.map(p=>p.id)).size,8);
for(const place of geo.places){
 const entry=data.lexicon[place.word];assert.ok(entry,place.word);
 assert.ok(entry.roots.some(r=>r.lang==='地名'&&r.term===place.origin),place.id);
 assert.ok(model.adjacency.get(M.wordId(place.word)).has(M.originId({lang:'地名',term:place.origin})),place.id);
 assert.ok(place.coordinate_source.startsWith('https://www.wikidata.org/wiki/Q'));
 assert.ok(place.etymology_source.startsWith(entry.wiktionary_url));
 if(place.kind==='city')assert.ok(place.coordinates.length===2&&Math.abs(place.coordinates[0])<=180&&Math.abs(place.coordinates[1])<=90);
 else {assert.equal(place.id,'egypt');assert.equal(place.relation,'historical-misidentification');assert.equal(place.coordinates,undefined);assert.ok(world.features.some(f=>f.properties.ADM0_A3===place.country_code));}
}
console.log('PASS: 527 word nodes, 257 merged origins, exact explicit edges, bounded expansion, 8 sourced map relationships and country-level Egypt');
