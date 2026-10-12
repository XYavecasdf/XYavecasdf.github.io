const test=require('node:test'),assert=require('node:assert/strict'),D=require('../data.js');
test('all profile symbols can be rendered, with no duplicate profile entries',()=>{const rendered=new Set([...D.grid.flat().flatMap(c=>c?c.split(' '):[]),...D.extras]);for(const p of Object.values(D.profiles)){assert.equal(new Set(p.sounds).size,p.sounds.length);for(const s of p.sounds)assert.ok(rendered.has(s),s);}});
test('Mandarin aspiration is distinct from English b/p spelling',()=>{assert.ok(D.profiles.mandarin.sounds.includes('pʰ'));assert.ok(!D.profiles.mandarin.sounds.includes('b'));assert.ok(D.profiles.us.sounds.includes('b'));assert.ok(!D.profiles.us.sounds.includes('pʰ'));});
test('rhoticity changes English distribution rather than core inventory',()=>assert.deepEqual(D.profiles.us.sounds,D.profiles.uk.sounds));
test('pulmonic table has eight manners and eleven places',()=>{assert.equal(D.grid.length,8);for(const row of D.grid)assert.equal(row.length,11);});
