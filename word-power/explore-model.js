/* Pure graph index: edges come only from the published group membership. */
(function (host, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else host.WordPowerExploreModel = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const norm = s => String(s || '').normalize('NFC').trim().toLowerCase();
  const wordId = word => 'word:' + word;
  const originId = root => 'origin:' + norm(root.lang) + ':' + norm(root.term);

  function build(data) {
    const nodes = new Map(), adjacency = new Map(), edges = new Map();
    function add(node) { nodes.set(node.id, node); adjacency.set(node.id, new Set()); }
    for (const [word, entry] of Object.entries(data.lexicon)) {
      add({id: wordId(word), kind: 'word', label: word, zh: entry.zh, word});
    }
    for (const group of data.groups) for (const root of group.roots) {
      const id = originId(root);
      if (!nodes.has(id)) add({id, kind: root.lang === '地名' ? 'place' : root.lang === '人名' ? 'person' : 'root',
        label: root.term, zh: root.zh, lang: root.lang, groups: []});
      const origin = nodes.get(id);
      if (!origin.groups.includes(group.name)) origin.groups.push(group.name);
      for (const word of root.words) {
        const wid = wordId(word);
        if (!nodes.has(wid)) throw new Error('Unknown word in group: ' + word);
        const key = id + '\u0000' + wid;
        if (!edges.has(key)) edges.set(key, {source: id, target: wid});
        adjacency.get(id).add(wid); adjacency.get(wid).add(id);
      }
    }
    const neighbors = id => [...(adjacency.get(id) || [])].sort((a, b) =>
      nodes.get(a).label.localeCompare(nodes.get(b).label, 'en'));
    return {nodes, adjacency, edges: [...edges.values()], neighbors};
  }

  function neighborhood(model, focus, batchSize = 20) {
    if (!model.nodes.has(focus)) throw new Error('Unknown graph focus: ' + focus);
    const visible = new Set([focus]), limits = new Map();
    function expand(id) {
      const adjacent = model.neighbors(id), limit = (limits.get(id) || 0) + batchSize;
      limits.set(id, limit); visible.add(id);
      adjacent.slice(0, limit).forEach(n => visible.add(n));
    }
    expand(focus);
    if (model.nodes.get(focus).kind === 'word') {
      for (const id of [...visible]) if (id !== focus) expand(id);
    }
    return {focus, visible, expand,
      remaining: id => model.neighbors(id).filter(n => !visible.has(n)).length,
      snapshot: () => ({nodes: [...visible].map(id => ({...model.nodes.get(id)})),
        edges: model.edges.filter(e => visible.has(e.source) && visible.has(e.target)).map(e => ({...e}))})};
  }

  function search(model, text, limit = 10) {
    const q = norm(text);
    if (!q) return [];
    const score = n => norm(n.label) === q ? 0 : norm(n.label).startsWith(q) ? 1 : 2;
    return [...model.nodes.values()].filter(n => norm(n.label + ' ' + n.zh).includes(q))
      .sort((a, b) => score(a) - score(b) || a.label.localeCompare(b.label, 'en')).slice(0, limit);
  }
  function fullGraph(model) {
    const seen = new Set(), components = [];
    for (const id of model.nodes.keys()) {
      if (seen.has(id)) continue;
      const members = [id]; seen.add(id);
      for (let i = 0; i < members.length; i++) for (const neighbor of model.neighbors(members[i])) {
        if (!seen.has(neighbor)) { seen.add(neighbor); members.push(neighbor); }
      }
      components.push(members);
    }
    components.sort((a, b) => b.length - a.length);
    const membership = new Map(components.flatMap((ids, index) => ids.map(id => [id, index])));
    return {nodes: [...model.nodes.values()].map(n => ({...n, degree: model.adjacency.get(n.id).size, component: membership.get(n.id)})),
      edges: model.edges.map(e => ({...e})), components};
  }
  return {norm, wordId, originId, build, neighborhood, fullGraph, search};
});
