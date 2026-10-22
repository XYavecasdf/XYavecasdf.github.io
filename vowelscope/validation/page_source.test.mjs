import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readPageSource} from './page_source.mjs';

test('versioned local script URLs load the actual file and retain URL provenance', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vowelscope-source-'));
  try {
    fs.writeFileSync(path.join(root, 'player.js'), 'window.referenceVersion = 2;');
    const html = path.join(root, 'index.html');
    fs.writeFileSync(html, '<script src="player.js?v=20261022"></script><script>window.ready = true;</script>');
    const versioned = readPageSource(html);
    assert.ok(versioned.prefix.includes('window.referenceVersion = 2;'));
    assert.deepEqual(versioned.files, ['player.js?v=20261022']);
    fs.writeFileSync(html, '<script src="player.js?v=older"></script><script>window.ready = true;</script>');
    assert.notEqual(readPageSource(html).codeDigest, versioned.codeDigest);
  } finally { fs.rmSync(root, {recursive:true, force:true}); }
});
