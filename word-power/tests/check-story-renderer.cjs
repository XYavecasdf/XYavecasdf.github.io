// Exercise the pure HTML renderer for every entry, including escaping and missing data.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'lexicon.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
new vm.Script(app); // Syntax-check the actual application, not a duplicate.
const renderer = app.slice(app.indexOf('const storyKinds='), app.indexOf('function analysisHTML('));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context = vm.createContext({data, lex: data.lexicon, esc});
vm.runInContext(renderer + '\nthis.renderStory=storyHTML;this.copyStory=storyCopy;this.pages=pageLabel;', context);
for (const [word, entry] of Object.entries(data.lexicon)) {
  const output = context.renderStory(entry);
  const refs = entry.book_stories || [];
  if (!refs.length) {
    assert.equal(output, '', word);
    assert.equal(context.copyStory(entry).length, 0, word);
    continue;
  }
  assert.equal((output.match(/class="book-story"/g) || []).length, refs.length, word);
  let relatedCount = 0;
  for (const ref of refs) {
    const story = data.book_stories[ref.story_id];
    assert.ok(output.includes(esc(story.title)), word);
    assert.ok(output.includes(esc(story.summary)), word);
    assert.ok(context.copyStory(entry).includes(story.summary), word);
    relatedCount += story.related_words.length - 1;
  }
  assert.ok(output.includes('PDF 第 '), word);
  assert.ok(!output.includes('undefined'), word);
  assert.equal((output.match(/class="story-word"/g) || []).length, relatedCount, word);
}
assert.equal(context.renderStory({word:'unknown'}), '');
for (const kind of ['explanation', 'context', 'exercise']) {
  const stale = {...data.lexicon.laconic, book_stories: [{...data.lexicon.laconic.book_stories[0], kind}]};
  assert.equal(context.renderStory(stale), '', kind);
  assert.equal(context.copyStory(stale).length, 0, kind);
}
assert.equal(context.pages([3,1,2,7,7]), '1–3、7');
const fixture = data.book_stories[data.lexicon.laconic.book_stories[0].story_id];
const original = fixture.summary;
fixture.summary = '<img src=x onerror=alert(1)> & "quoted"';
const escaped = context.renderStory(data.lexicon.laconic);
assert.ok(escaped.includes('&lt;img'));
assert.ok(!escaped.includes('<img'));
fixture.summary = original;
console.log('PASS: all linked stories render and copy, unrelated panels omitted, stale types rejected, escaping and application syntax');
