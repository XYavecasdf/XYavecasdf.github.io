// Test utility: execute the real static page with simulated browser boundaries.
// This is not an audio-device or browser scheduling emulator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readPageSource} from './page_source.mjs';

export function loadPage(page, {search = '', navigator = {}, window: extras = {}, patch = ''} = {}) {
  const {html, inline: script, prefix} = readPageSource(page);
  const marker = '    requestAnimationFrame(frame);';
  assert.ok(script?.includes(marker), 'Production page instrumentation marker missing');
  const canvas = new Proxy({measureText: s => ({width: String(s).length * 10})}, {
    get: (target, key) => key in target ? target[key] : () => {},
    set(target, key, value) { target[key] = value; return true; }
  });
  const nodes = new Map();
  const make = () => {
    const listeners = new Map(), classes = new Set();
    return {children: [], dataset: {}, style: {}, value: '', textContent: '', disabled: false,
      classList: {add: c => classes.add(c), remove: c => classes.delete(c),
        toggle(c, force) { const on = force ?? !classes.has(c); on ? classes.add(c) : classes.delete(c); },
        contains: c => classes.has(c)},
      getContext: () => canvas, appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; }, setAttribute(k, v) { this[k] = v; },
      addEventListener(event, callback) { listeners.set(event, callback); },
      dispatch(event) { return listeners.get(event)?.(); }};
  };
  // Read actual slider defaults instead of assigning an invented test value.
  for (const tag of html.matchAll(/<(?:input|button)\b[^>]*>/g)) {
    const id = tag[0].match(/\bid="([^"]+)"/)?.[1];
    if (!id) continue;
    const node = make();
    node.value = tag[0].match(/\bvalue="([^"]+)"/)?.[1] ?? '';
    node.disabled = /\sdisabled(?:\s|>)/.test(tag[0]);
    nodes.set(id, node);
  }
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); },
    createElement: make
  };
  const windowListeners = new Map();
  const window = {location: {search}, addEventListener(event, callback) { windowListeners.set(event, callback); }, ...extras};
  const expose = `window.__productionTest = {state, processAudio, acceptFormants,
    preprocess, estimateFormants, startMic, stopMic, setTrackingMode,
    setBuffer(buffer) { audioBuffer = buffer; }};`;
  vm.runInNewContext(prefix + script.replace(marker, patch + '\n' + expose),
    {document, window, navigator, performance, requestAnimationFrame() {}}, {timeout: 5000, filename: page});
  return {api: window.__productionTest, nodes, dispatchWindow: event => windowListeners.get(event)?.()};
}
