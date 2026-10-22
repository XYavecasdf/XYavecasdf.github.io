// Read the actual static page and its local scripts, in browser execution order.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readPageSource(filename) {
  const html = fs.readFileSync(filename, 'utf8');
  const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!inline) throw Error('Inline VowelScope script not found: ' + filename);
  const inlineAt = html.indexOf('<script>');
  const files = [], contents = [];
  const hash = crypto.createHash('sha256').update(html);
  for (const match of html.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g)) {
    if (match.index > inlineAt) throw Error('Local dependency must load before the production script');
    const relative = match[1];
    if (/^(?:[a-z]+:|\/)/i.test(relative)) throw Error('Validation requires local scripts: ' + relative);
    // Query/fragment version selectors change browser identity/provenance, not
    // the on-disk file that the browser receives from the static site.
    const file = path.resolve(path.dirname(filename), relative.split(/[?#]/, 1)[0]);
    const content = fs.readFileSync(file, 'utf8');
    files.push(relative); contents.push(content);
    hash.update('\0').update(relative).update('\0').update(content);
  }
  return {html, inline, prefix: contents.join('\n;\n') + '\n;\n', files,
    codeDigest: hash.digest('hex')};
}
