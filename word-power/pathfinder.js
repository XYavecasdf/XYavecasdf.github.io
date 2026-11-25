/* Compact game presentation; round state and validation live in the model. */
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({model,data,posHTML,onOpenWord,onChange,onExplore}){
    const P=window.WordPowerPathfinderModel,deck=P.challenges(model);
    let round=P.createRound(model,deck[0]);
    const label=id=>model.nodes.get(id).label;
    function activate(id){const challenge=deck.find(c=>c.id===id)||deck[0];if(challenge.id!==round.snapshot().id)round=P.createRound(model,challenge);return challenge.id;}
    function action(name,value,keyboard=false){
      let message='',changed=false,completed=false;
      if(name==='move'){
        const result=round.move(value);changed=result.changed;
        if(result.reason==='not-adjacent')message='沿当前节点的连线走，或点击右侧的下一步。';
        if(changed){completed=round.snapshot().phase==='completed';message=completed?'抵达终点！':'已走到 '+label(value);}
      }else if(name==='hint'){
        const id=round.hint();changed=Boolean(id);if(id)message='下一步试试 '+label(id)+' · '+model.nodes.get(id).zh;
      }else if(name==='undo'){changed=round.undo();message=changed?'已后退一步':'';}
      else if(name==='rewind'){changed=round.rewind(value);message=changed?'已回到 '+label(round.snapshot().current):'';}
      else if(name==='restart'){round.restart();changed=true;message='从起点重新开始';}
      else if(name==='reveal'){changed=round.reveal();message='参考路线已显示，本题未计为完成。';}
      else if(name==='next'){
        const index=deck.findIndex(c=>c.id===round.snapshot().id);round=P.createRound(model,deck[(index+1)%deck.length]);changed=true;message='新的寻路题';
      }
      onChange({changed,message,keyboard,completed,action:name});
    }
    function pathHTML(ids,rewind=false){return `<ol class="pathfinder-trail" aria-label="${rewind?'当前路线':'参考路线'}">${ids.map((id,i)=>`<li><span class="trail-step">${i}</span>${rewind&&i<ids.length-1?`<button type="button" data-game-rewind="${i}" title="回到这一步">${esc(label(id))}</button>`:`<span>${esc(label(id))}</span>`}</li>`).join('')}</ol>`;}
    function renderPanel(banner,card){
      const s=round.snapshot(),current=model.nodes.get(s.current),word=data.lexicon[current.word],start=model.nodes.get(s.start),goal=model.nodes.get(s.goal);
      const level=s.shortestSteps<=2?'入门':s.shortestSteps<=4?'进阶':'挑战';
      banner.innerHTML=`<div class="pathfinder-endpoints"><div><span class="pathfinder-caption">起点</span><button type="button" data-game-word="${esc(start.word)}">${esc(start.label)}</button><small>${esc(start.zh)}</small></div><span class="pathfinder-arrow" aria-hidden="true">→</span><div><span class="pathfinder-caption">终点</span><button type="button" data-game-word="${esc(goal.word)}">${esc(goal.label)}</button><small>${esc(goal.zh)}</small></div></div><div class="pathfinder-goal-tools"><span>${level} · 最短 ${s.shortestSteps} 步</span><button type="button" class="control" data-game-action="next">换题</button></div>`;
      if(s.phase==='playing'){
        card.innerHTML=`<p class="explore-kicker">图谱寻路 · 第 ${s.steps} 步</p><h2 id="pathfinder-current">${esc(current.label)}</h2><p class="explore-definition">${esc(current.zh)} ${word?posHTML(word):'<span class="pathfinder-root-tag">词根 · '+esc(current.lang)+'</span>'}</p><p class="pathfinder-instruction">选择相连节点，走到终点。</p><div class="pathfinder-choices" role="group" aria-label="下一步">${s.choices.map(id=>{const n=model.nodes.get(id);return `<button type="button" data-game-move="${esc(id)}" class="${id===s.hint?'suggested':''}"><b>${esc(n.label)}</b><small>${esc(n.zh)}</small>${id===s.hint?'<span class="pathfinder-hint-tag">提示</span>':''}</button>`;}).join('')}</div><p class="pathfinder-hint" id="pathfinder-hint" role="status">${s.hint?'下一步试试 '+esc(label(s.hint)):''}</p><div class="pathfinder-actions"><button type="button" class="control" data-game-action="hint">提示</button><button type="button" class="control" data-game-action="undo" ${s.steps?'':'disabled'}>后退</button><details class="pathfinder-more"><summary>更多</summary><div><button type="button" data-game-action="restart">重新开始</button><button type="button" data-game-action="reveal">看答案</button></div></details></div><details class="pathfinder-route"><summary>当前路线 · ${s.steps} 步</summary>${pathHTML(s.path,true)}</details>`;
      }else{
        const won=s.phase==='completed';
        card.innerHTML=`<p class="explore-kicker ${won?'pathfinder-success':''}">${won?'✓ 抵达终点':'参考路线 · 未完成'}</p><h2 id="pathfinder-result" tabindex="-1">${esc(goal.label)}</h2><p class="explore-definition">${esc(goal.zh)} ${posHTML(data.lexicon[goal.word])}</p><p class="pathfinder-result-copy">${won?(s.steps===s.shortestSteps?'你找到了最短路线。':`你走了 ${s.steps} 步，最短需要 ${s.shortestSteps} 步。`):'可以沿着这条路线，看看词根怎样连接起两个词。'}${s.hintsUsed?' 使用了 '+s.hintsUsed+' 次提示。':''}</p>${pathHTML(won?s.path:s.reference)}<div class="pathfinder-actions"><button type="button" class="control primary" data-game-action="next">下一题</button><button type="button" class="control" data-game-action="restart">重走</button></div><div class="pathfinder-result-links"><button type="button" data-game-word="${esc(goal.word)}">查看词条 ↗</button><button type="button" id="pathfinder-explore">在全图中看 ↗</button></div>${won&&s.steps>s.shortestSteps?`<details class="pathfinder-route"><summary>最短路线 · ${s.shortestSteps} 步</summary>${pathHTML(s.reference)}</details>`:''}`;
      }
      for(const parent of [banner,card]){
        parent.querySelectorAll('[data-game-word]').forEach(b=>b.onclick=()=>onOpenWord(b.dataset.gameWord));
        parent.querySelectorAll('[data-game-action]').forEach(b=>b.onclick=e=>action(b.dataset.gameAction,null,e.detail===0));
        parent.querySelectorAll('[data-game-move]').forEach(b=>b.onclick=e=>action('move',b.dataset.gameMove,e.detail===0));
        parent.querySelectorAll('[data-game-rewind]').forEach(b=>b.onclick=e=>action('rewind',Number(b.dataset.gameRewind),e.detail===0));
      }
      const explore=card.querySelector('#pathfinder-explore');if(explore)explore.onclick=()=>onExplore(s.goal);
      card.dataset.phase=s.phase;card.dataset.steps=s.steps;card.dataset.challenge=s.id;
    }
    function draw({svg,layer,width,height,savedTransform,onCamera}){
      const d3=window.d3,s=round.snapshot(),snapshot=P.visibleGraph(model,s),nodes=snapshot.nodes,edges=snapshot.edges;
      svg.attr('class','pathfinder-network').attr('data-phase',s.phase).attr('aria-label','图谱寻路，点选相连的节点向终点前进');
      for(let i=0;i<nodes.length;i++){
        const n=nodes[i];n.width=Math.max(105,Math.min(230,n.label.length*7.4+30));
        n.x=width/2+Math.cos(i*2.4)*160;n.y=height/2+Math.sin(i*2.4)*160;
        if(n.current&&s.phase==='playing'){n.fx=width/2;n.fy=height/2;}
      }
      const line=layer.append('g').selectAll('line').data(edges).join('line').attr('class',e=>'pathfinder-edge'+(e.walked?' walked':''));
      const node=layer.append('g').selectAll('g').data(nodes,n=>n.id).join('g')
        .attr('class',n=>'pathfinder-node '+n.kind+(n.current?' current':'')+(n.available?' available':'')+(n.visited?' visited':'')+(n.goal?' goal':'')+(n.hint?' suggested':''))
        .attr('data-game-node',n=>n.id).attr('role','button').attr('tabindex',n=>n.available?0:-1)
        .attr('aria-disabled',n=>String(!n.available)).attr('aria-label',n=>n.label+'，'+n.zh+(n.current?'，当前位置':n.available?'，可以前往':'，已走过'))
        .on('click',(event,n)=>{if(!event.defaultPrevented)action('move',n.id);})
        .on('keydown',(event,n)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();action('move',n.id,true);}});
      node.append('rect').attr('x',n=>-n.width/2).attr('y',-26).attr('width',n=>n.width).attr('height',52).attr('rx',11);
      node.append('text').attr('class','pathfinder-node-label').attr('text-anchor','middle').attr('y',-2).text(n=>n.label);
      node.append('text').attr('class','pathfinder-node-meaning').attr('text-anchor','middle').attr('y',15).text(n=>(n.kind==='root'?'词根 · ':'')+(n.zh.length>14?n.zh.slice(0,13)+'…':n.zh));
      node.append('title').text(n=>n.label+' · '+n.zh);
      const force=d3.forceSimulation(nodes).randomSource(d3.randomLcg(.42))
        .force('link',d3.forceLink(edges).id(n=>n.id).distance(e=>(e.source.width+e.target.width)/2+65))
        .force('charge',d3.forceManyBody().strength(-360)).force('collision',d3.forceCollide(n=>n.width/2+18))
        .force('x',d3.forceX(width/2).strength(.04)).force('y',d3.forceY(height/2).strength(.04)).stop();
      for(let i=0;i<160;i++)force.tick();
      // Small rounds need readable labels even on narrow screens. Preserve
      // the recorded edges while giving two/three choices a compact layout.
      if(nodes.length<=4){
        const centerY=(height-65)/2,dy=Math.min(130,(height-170)/2),dx=Math.min(170,width*.18);
        const center=nodes.find(n=>n.current)||nodes[0],others=nodes.filter(n=>n!==center);
        center.x=width/2;center.y=centerY;
        const slots=others.length===1?[[width/2,centerY-dy]]:others.length===2?[[width/2+dx,centerY-dy],[width/2-dx,centerY+dy]]:[[width*.27,centerY-dy],[width*.73,centerY-dy],[width/2,centerY+dy]];
        others.forEach((n,i)=>{[n.x,n.y]=slots[i];});
      }
      function tick(){line.attr('x1',e=>e.source.x).attr('y1',e=>e.source.y).attr('x2',e=>e.target.x).attr('y2',e=>e.target.y);node.attr('transform',n=>`translate(${n.x},${n.y})`);}
      tick();
      node.call(d3.drag().clickDistance(4).on('drag',(event,n)=>{n.x=event.x;n.y=event.y;tick();}));
      const x0=d3.min(nodes,n=>n.x-n.width/2)-25,x1=d3.max(nodes,n=>n.x+n.width/2)+25,y0=d3.min(nodes,n=>n.y-26)-40,y1=d3.max(nodes,n=>n.y+26)+40;
      // Keep the lower canvas controls clear of every initially visible node.
      const fitted=d3.zoomIdentity.translate(width/2,(height-65)/2).scale(Math.min(1.1,(width-20)/(x1-x0),(height-90)/(y1-y0))).translate(-(x0+x1)/2,-(y0+y1)/2);
      const zoom=d3.zoom().scaleExtent([.12,4]).extent([[0,0],[width,height]]).on('zoom',event=>{layer.attr('transform',event.transform);onCamera(event.transform);});
      svg.call(zoom).on('dblclick.zoom',null);svg.call(zoom.transform,savedTransform||fitted);
      return {zoom,fit:()=>svg.call(zoom.transform,fitted),dispose:()=>{force.stop();}};
    }
    return {activate,action,draw,renderPanel,snapshot:()=>round.snapshot(),challengeCount:deck.length};
  }
  window.WordPowerPathfinder={create};
})();
