/* Lazy, same-origin map and evidence-based word neighborhood explorer. */
(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kindName = kind => ({word:'单词',root:'词根',place:'地名',person:'人名'}[kind]);
  const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`;
  async function json(file) {
    const response = await fetch(new URL(file, base), {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Could not load ' + file);
    return response.json();
  }

  async function mount(host, options) {
    const [geography, world] = await Promise.all([json('places.json'), json('vendor/countries-110m.json')]);
    const d3 = window.d3, M = window.WordPowerExploreModel, model = M.build(options.data);
    const places = geography.places, placesById = new Map(places.map(p => [p.id, p]));
    const byWord = new Map(places.map(p => [p.word, p]));
    const nodesByLabel = new Map([...model.nodes.values()].filter(n => n.kind === 'word').map(n => [M.norm(n.word), n.id]));
    let state = {view:'map', place:'quanzhou', focus:M.wordId('philanthropy')};
    let selected = state.focus, graph = null, simulation = null, zoom = null, svg = null;
    let width = 0, height = 0, mapTransform = null, graphTransform = null, active = false;
    const positions = new Map();
    host.innerHTML = `
      <div class="explore-toolbar">
        <button type="button" class="explore-back" id="explore-back">← 词库</button>
        <div class="explore-tabs" role="tablist" aria-label="探索方式">
          <button type="button" role="tab" id="tab-map" aria-controls="explore-panel" aria-selected="true">地图</button>
          <button type="button" role="tab" id="tab-network" aria-controls="explore-panel" aria-selected="false" tabindex="-1">关系网</button>
        </div>
        <form class="explore-search" role="search" autocomplete="off">
          <label class="sr-only" for="explore-search">搜索单词、词根或地点</label>
          <input type="search" id="explore-search" placeholder="搜索单词、词根或地点…" aria-controls="explore-results" aria-expanded="false">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <div class="explore-results" id="explore-results" hidden></div>
        </form>
      </div>
      <div class="explore-body" id="explore-panel" role="tabpanel" aria-labelledby="tab-map">
        <section class="explore-viz" aria-label="探索画布">
          <div class="viz-caption"><strong id="viz-title"></strong><span id="viz-count"></span></div>
          <div class="explore-canvas" id="explore-canvas"></div>
          <div class="canvas-controls" aria-label="画布控制">
            <button type="button" id="explore-zoom-in" aria-label="放大">+</button>
            <button type="button" id="explore-zoom-out" aria-label="缩小">−</button>
            <button type="button" id="explore-reset" aria-label="重置当前视图">重置</button>
          </div>
          <div class="viz-legend" id="viz-legend"></div>
        </section>
        <aside class="explore-card" id="explore-card" aria-label="当前选择"></aside>
      </div>
      <p class="explore-status" id="explore-status" role="status" aria-live="polite"></p>
      <details class="explore-footer"><summary>资料与操作</summary>
        <p>拖动画布平移，双指或滚轮缩放。键盘聚焦画布后可用方向键平移、+ / − 缩放、0 重置；节点可用 Tab 与 Enter 选择。</p>
        <p>关系仅来自词库已收录的词根关联；人名、地名分别标记，不视为可自由拼接的词根。地点使用城市级参照位置，不表示具体发明地点或传播路线。埃及区域表示旧称中的历史误认。</p>
        <p>底图：${link('https://www.naturalearthdata.com/about/terms-of-use/', 'Natural Earth · 公有领域')} · 当代地理参照。坐标：Wikidata；词源与原书故事见词条。${link('./vendor/README.md', '数据与授权')}</p>
      </details>`;
    const $ = id => host.querySelector('#' + id);
    const canvas = $('explore-canvas'), card = $('explore-card'), status = $('explore-status');
    const search = $('explore-search'), results = $('explore-results');
    function emit() { options.onState({...state}); }
    function clearSearch() { search.value = ''; results.hidden = true; search.setAttribute('aria-expanded', 'false'); }
    function resolveFocus(value) {
      return model.nodes.has(value) ? value : nodesByLabel.get(M.norm(value)) || M.wordId('philanthropy');
    }
    function setTab(view, notify = true) {
      state.view = view === 'network' ? 'network' : 'map';
      host.dataset.view = state.view;
      for (const tab of ['map','network']) {
        $('tab-' + tab).setAttribute('aria-selected', String(state.view === tab));
        $('tab-' + tab).tabIndex = state.view === tab ? 0 : -1;
      }
      $('explore-panel').setAttribute('aria-labelledby', 'tab-' + state.view);
      clearSearch(); render(); if (notify) emit();
    }
    function choosePlace(id, recenter = true) {
      if (!placesById.has(id)) return;
      state.place = id; clearSearch();
      if (state.view !== 'map') setTab('map', false);
      else { drawMapSelection(); renderPlaceCard(); }
      if (recenter) centerPlace();
      status.textContent = placesById.get(id).zh + ' · ' + placesById.get(id).word;
      emit();
    }
    function focusGraph(id) {
      id = resolveFocus(id); state.focus = id; selected = id;
      graph = M.neighborhood(model, id); positions.clear(); graphTransform = null;
      clearSearch();
      if (state.view !== 'network') setTab('network', false);
      else render();
      status.textContent = '以 ' + model.nodes.get(id).label + ' 为中心'; emit();
    }
    function selectNode(id) {
      focusGraph(id);
    }
    function wireCard() {
      card.querySelectorAll('[data-open-word]').forEach(b => b.onclick = () => options.onOpenWord(b.dataset.openWord));
      card.querySelectorAll('[data-graph-node]').forEach(b => b.onclick = () => selectNode(b.dataset.graphNode));
      card.querySelectorAll('[data-place]').forEach(b => b.onclick = () => choosePlace(b.dataset.place));
    }
    function renderPlaceCard() {
      const place = placesById.get(state.place), word = options.data.lexicon[place.word];
      card.innerHTML = `<p class="explore-kicker">${esc(place.region)}${place.kind === 'country' ? ' · 国家区域' : ''}</p>
        <h2>${esc(place.name)}</h2><p class="place-zh">${esc(place.zh)}</p>
        <button class="explore-word" data-open-word="${esc(place.word)}">${esc(place.word)}</button>
        <p class="explore-definition">${esc(word.zh)} ${options.posHTML(word)}</p>
        <div class="explore-actions"><button class="control primary" data-open-word="${esc(place.word)}">查看词条</button><button class="control" data-graph-node="${esc(M.wordId(place.word))}">关系网 →</button></div>
        <p class="explore-note">${esc(place.note)}</p>
        <details class="explore-evidence"><summary>地点与词源出处</summary>${link(place.coordinate_source, place.kind === 'country' ? '区域参照' : '坐标参照（城市级）')}${link(place.etymology_source, '词源对照')}</details>
        <div class="place-list" aria-label="全部地点">${places.map(p => `<button class="place-choice" data-place="${p.id}" aria-pressed="${p.id === place.id}"><span>${esc(p.zh)}</span><small>${esc(p.word)}</small></button>`).join('')}</div>`;
      wireCard();
    }
    function renderGraphCard() {
      const node = model.nodes.get(selected), word = options.data.lexicon[node.word], remaining = graph.remaining(selected);
      const neighbors = model.neighbors(selected).filter(id => graph.visible.has(id));
      card.innerHTML = `<p class="explore-kicker">${kindName(node.kind)}${node.lang && node.kind === 'root' ? ' · ' + esc(node.lang) : ''}</p>
        <h2>${esc(node.label)}</h2><p class="explore-definition">${esc(node.zh)} ${word ? options.posHTML(word) : ''}</p>
        <div class="explore-actions">${word ? `<button class="control primary" data-open-word="${esc(word.word)}">查看词条</button>` : ''}
        ${byWord.has(node.word) ? `<button class="control" data-place="${byWord.get(node.word).id}">在地图上看 ↗</button>` : ''}</div>
        ${['person','place'].includes(node.kind) ? '<p class="explore-note">专名词源：名称与这个人或地方有关，不作为可自由拼接的词根。</p>' : ''}
        <div class="graph-related" aria-label="关联节点">${neighbors.map(id => `<button data-graph-node="${esc(id)}">${esc(model.nodes.get(id).label)}</button>`).join('')}</div>
        ${remaining ? `<button class="control explore-more" id="explore-more">展开更多 · 余 ${remaining}</button>` : ''}
        <p class="explore-summary">${model.neighbors(selected).length} 个直接关联 · 已显示 ${neighbors.length}</p>`;
      wireCard();
      if ($('explore-more')) $('explore-more').onclick = () => {
        graph.expand(selected); drawNetwork(); renderGraphCard(); status.textContent = '已展开更多关联';
      };
    }
    function prepare() {
      simulation?.stop(); svg?.on('.zoom', null);
      width = canvas.clientWidth; height = canvas.clientHeight;
      canvas.replaceChildren();
      svg = d3.select(canvas).append('svg').attr('viewBox', [0,0,width,height]).attr('tabindex', 0)
        .attr('role', 'group').attr('aria-label', state.view === 'map' ? '词源地图，可平移缩放' : '词源关系网，可平移缩放');
      svg.on('keydown.pan', event => {
        if (event.target !== svg.node()) return;
        const delta = {ArrowLeft:[55,0],ArrowRight:[-55,0],ArrowUp:[0,55],ArrowDown:[0,-55]}[event.key];
        if (delta) { event.preventDefault(); svg.call(zoom.translateBy, delta[0] / d3.zoomTransform(svg.node()).k, delta[1] / d3.zoomTransform(svg.node()).k); }
        if (['+','=','-','0'].includes(event.key)) { event.preventDefault(); if (event.key === '0') reset(); else svg.call(zoom.scaleBy, event.key === '-' ? 1 / 1.4 : 1.4); }
      });
      return svg.append('g');
    }
    function zoomable(layer, extent, saved, onZoom) {
      zoom = d3.zoom().scaleExtent(extent).extent([[0,0],[width,height]]).on('zoom', event => {
        layer.attr('transform', event.transform); onZoom(event.transform);
      });
      svg.call(zoom).on('dblclick.zoom', null);
      svg.call(zoom.transform, saved || d3.zoomIdentity);
    }
    let projection, mapLayer;
    function renderMap() {
      const layer = prepare(); mapLayer = layer;
      projection = d3.geoNaturalEarth1().fitExtent([[20,24],[width-20,height-24]], {type:'Sphere'});
      const path = d3.geoPath(projection);
      layer.append('path').attr('class','world-sphere').attr('d', path({type:'Sphere'}));
      layer.append('path').attr('class','world-graticule').attr('d', path(d3.geoGraticule10()));
      layer.selectAll('.world-country').data(world.features).join('path')
        .attr('class', f => 'world-country' + (f.properties.ADM0_A3 === 'EGY' ? ' egypt' : ''))
        .attr('d', path).filter(f => f.properties.ADM0_A3 === 'EGY')
        .attr('tabindex',0).attr('role','button').attr('aria-label','埃及 · Gypsy · 历史误认')
        .on('click', () => choosePlace('egypt')).on('keydown', activate(() => choosePlace('egypt')));
      const marker = layer.selectAll('.place-marker').data(places.filter(p => p.kind === 'city')).join('g')
        .attr('class','place-marker').attr('data-place-id', p => p.id).attr('tabindex',0).attr('role','button')
        .attr('aria-label', p => p.zh + ' · ' + p.word)
        .on('click', (event,p) => choosePlace(p.id)).on('keydown', activate((event,p) => choosePlace(p.id)));
      marker.append('circle').attr('class','marker-halo').attr('r',13);
      marker.append('circle').attr('class','marker-dot').attr('r',4.8);
      marker.append('text').attr('class','place-label').attr('y',-12).text(p => p.zh);
      marker.append('title').text(p => p.name + ' · ' + p.word);
      const egypt = world.features.find(f => f.properties.ADM0_A3 === 'EGY');
      layer.append('text').attr('class','egypt-label').attr('data-geo',projection(d3.geoCentroid(egypt)).join(','))
        .text('埃及 · 历史误认').attr('text-anchor','middle').on('click', () => choosePlace('egypt'));
      zoomable(layer,[1,10],mapTransform, transform => {
        mapTransform = transform;
        marker.attr('transform',p => `translate(${projection(p.coordinates)}) scale(${1 / transform.k})`);
        marker.select('text').attr('x', p => projection(p.coordinates)[0] > width * .68 ? -10 : 10)
          .attr('text-anchor', p => projection(p.coordinates)[0] > width * .68 ? 'end' : 'start');
        layer.select('.egypt-label').attr('transform', function () { return `translate(${this.dataset.geo}) scale(${1 / transform.k})`; });
      });
      drawMapSelection(); renderPlaceCard();
      $('viz-title').textContent = '名字里的地方'; $('viz-count').textContent = '8 处地名词源';
      $('viz-legend').innerHTML = '<span class="legend-item"><i class="legend-dot"></i>地名</span><span class="legend-item"><i class="legend-dot place"></i>历史误认 · 区域</span>';
    }
    function drawMapSelection() {
      if (!mapLayer || state.view !== 'map') return;
      mapLayer.selectAll('.place-marker').classed('selected', p => p.id === state.place).attr('aria-pressed',p => String(p.id === state.place));
      mapLayer.select('.egypt').classed('selected', state.place === 'egypt').attr('aria-pressed',String(state.place === 'egypt'));
    }
    function centerPlace() {
      if (!svg || !projection || state.view !== 'map') return;
      const place = placesById.get(state.place);
      const point = place.kind === 'country' ? projection(d3.geoCentroid(world.features.find(f => f.properties.ADM0_A3 === place.country_code))) : projection(place.coordinates);
      const scale = Math.max(2.2, Math.min(4, d3.zoomTransform(svg.node()).k));
      svg.call(zoom.transform, d3.zoomIdentity.translate(width/2,height/2).scale(scale).translate(-point[0],-point[1]));
    }
    function activate(fn) {
      return function(event, datum) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fn(event,datum); } };
    }
    function renderNetwork() {
      if (!graph) { graph = M.neighborhood(model,state.focus); selected = state.focus; }
      drawNetwork(); renderGraphCard();
      $('viz-title').textContent = '词源关系';
      $('viz-legend').innerHTML = ['word','root','person','place'].map(kind => `<span class="legend-item"><i class="legend-dot ${kind}"></i>${kindName(kind)}</span>`).join('');
    }
    function drawNetwork() {
      const layer = prepare(), snapshot = graph.snapshot();
      const ns = snapshot.nodes, es = snapshot.edges;
      for (let i=0;i<ns.length;i++) {
        const node = ns[i], previous = positions.get(node.id);
        node.width = Math.max(82, Math.min(260, node.label.length * (node.id === graph.focus ? 8.5 : 7.4) + 28));
        Object.assign(node, previous || {x:width/2 + Math.cos(i * 2.4) * 160,y:height/2 + Math.sin(i * 2.4) * 160});
        if (node.id === graph.focus) { node.fx=width/2; node.fy=height/2; }
      }
      const edge = layer.append('g').selectAll('line').data(es).join('line').attr('class','graph-edge');
      const node = layer.append('g').selectAll('g').data(ns,d => d.id).join('g')
        .attr('class',d => 'graph-node ' + d.kind + (d.id === selected ? ' selected' : '') + (d.id === graph.focus ? ' center' : ''))
        .attr('data-node-id',d => d.id).attr('role','button').attr('tabindex',0)
        .attr('aria-label',d => kindName(d.kind) + ' ' + d.label + '，' + d.zh)
        .on('click',(event,d) => { if (!event.defaultPrevented) selectNode(d.id); })
        .on('keydown',activate((event,d) => { selectNode(d.id); svg.selectAll('.graph-node').filter(n => n.id === d.id).node()?.focus(); }));
      node.append('rect').attr('x',d => -d.width/2).attr('y',-23).attr('width',d => d.width).attr('height',46);
      node.append('text').attr('text-anchor','middle').attr('y',d => d.kind === 'word' ? 5 : -1)
        .style('font-size',d => Math.min(d.id === graph.focus ? 16 : 13,(d.width-20) / Math.max(1,d.label.length) * 1.7)+'px').text(d => d.label);
      node.filter(d => d.kind !== 'word').append('text').attr('class','node-sub').attr('text-anchor','middle').attr('y',13).text(d => kindName(d.kind) + ' · ' + d.zh);
      simulation = d3.forceSimulation(ns).randomSource(d3.randomLcg(.42))
        .force('link',d3.forceLink(es).id(d => d.id).distance(d => (d.source.width + d.target.width)/2 + 60))
        .force('charge',d3.forceManyBody().strength(-330))
        .force('collide',d3.forceCollide(d => d.width/2 + 12))
        .force('x',d3.forceX(width/2).strength(.035)).force('y',d3.forceY(height/2).strength(.035)).stop();
      for (let i=0;i<160;i++) simulation.tick();
      function tick() {
        edge.attr('x1',d => d.source.x).attr('y1',d => d.source.y).attr('x2',d => d.target.x).attr('y2',d => d.target.y);
        node.attr('transform',d => `translate(${d.x},${d.y})`);
        ns.forEach(n => positions.set(n.id,{x:n.x,y:n.y}));
      }
      tick(); simulation.on('tick',tick);
      node.call(d3.drag().on('start',(event,d) => { if (!event.active) simulation.alphaTarget(.18).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',(event,d) => { d.fx=event.x; d.fy=event.y; })
        .on('end',(event,d) => { if (!event.active) simulation.alphaTarget(0); positions.set(d.id,{x:d.x,y:d.y}); }));
      const x0=d3.min(ns,n=>n.x-n.width/2)-30,x1=d3.max(ns,n=>n.x+n.width/2)+30;
      const y0=d3.min(ns,n=>n.y-23)-40,y1=d3.max(ns,n=>n.y+23)+40;
      const scale=Math.max(width < 500 ? .72 : .3,Math.min(1.1,width/(x1-x0),height/(y1-y0)));
      const fitted=d3.zoomIdentity.translate(width/2,height/2).scale(scale).translate(-(x0+x1)/2,-(y0+y1)/2);
      zoomable(layer,[.15,4],graphTransform || fitted,t => { graphTransform=t; });
      $('viz-count').textContent=ns.length+' 个节点';
    }
    function render() { if (!active) return; status.textContent=''; state.view === 'map' ? renderMap() : renderNetwork(); }
    function reset() {
      clearSearch();
      if (state.view === 'map') { mapTransform=null; svg.call(zoom.transform,d3.zoomIdentity); }
      else { graph=M.neighborhood(model,state.focus); selected=state.focus; positions.clear(); graphTransform=null; renderNetwork(); }
      status.textContent='视图已重置';
    }
    function showResults() {
      const q=M.norm(search.value); results.replaceChildren();
      if (!q) { results.hidden=true; search.setAttribute('aria-expanded','false'); return; }
      const matches=places.filter(p => M.norm([p.name,p.zh,p.word,p.region].join(' ')).includes(q));
      const found=M.search(model,q,10);
      const entries=[];
      if (state.view === 'map') matches.forEach(p => entries.push({label:p.zh+' · '+p.word,kind:'地图',choose:()=>choosePlace(p.id)}));
      found.forEach(n => entries.push({label:n.label+' · '+n.zh,kind:kindName(n.kind)+(state.view==='map'?' · 关系网':''),choose:()=>focusGraph(n.id)}));
      for (const result of entries.slice(0,10)) {
        const button=document.createElement('button');button.type='button';
        button.innerHTML=`<span>${esc(result.label)}</span><small>${result.kind}</small>`;
        button.onclick=()=>{result.choose();search.focus();};results.append(button);
      }
      if (!entries.length) results.innerHTML='<p>没有找到，试试英文单词或中文释义。</p>';
      results.hidden=false;search.setAttribute('aria-expanded','true');
    }
    $('explore-back').onclick=options.onBack;
    for (const view of ['map','network']) $('tab-'+view).onclick=()=>setTab(view);
    host.querySelector('[role=tablist]').onkeydown=event=>{
      if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault();const view=event.key==='Home'?'map':event.key==='End'?'network':state.view==='map'?'network':'map';setTab(view);$('tab-'+view).focus();
      }
    };
    $('explore-zoom-in').onclick=()=>svg.call(zoom.scaleBy,1.4);
    $('explore-zoom-out').onclick=()=>svg.call(zoom.scaleBy,1/1.4);
    $('explore-reset').onclick=reset;
    search.addEventListener('input',showResults);
    search.onkeydown=event=>{if(event.key==='Escape')clearSearch();if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}};
    host.querySelector('form').onsubmit=event=>{event.preventDefault();results.querySelector('button')?.click();};
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.explore-search')){results.hidden=true;search.setAttribute('aria-expanded','false');}});
    const observer=new ResizeObserver(()=>{if(active && (canvas.clientWidth!==width || canvas.clientHeight!==height)){mapTransform=null;graphTransform=null;positions.clear();render();}});
    observer.observe(canvas);
    return {
      activate(next) {
        const focus=resolveFocus(next.focus || state.focus);
        if(focus!==state.focus){graph=null;selected=focus;positions.clear();graphTransform=null;}
        if(next.place && next.place!==state.place)mapTransform=null;
        state={view:next.view==='network'?'network':'map',place:placesById.has(next.place)?next.place:state.place,focus};
        active=true;setTab(state.view,false);emit();
      },
      pause() { active=false;simulation?.stop();clearSearch(); },
      state:()=>({...state})
    };
  }
  window.WordPowerExplore = {mount};
})();
