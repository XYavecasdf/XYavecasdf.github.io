/* Full-library force graph. Layout mutations never touch the source index. */
(function () {
  'use strict';
  function createLayout(model) {
    const d3 = window.d3, layout = window.WordPowerExploreModel.fullGraph(model);
    const clusters = layout.components.map((ids,index) => ({index,r:Math.sqrt(ids.length)*34+25}));
    d3.packSiblings(clusters);
    const center = d3.packEnclose(clusters);
    const byCluster = new Map(clusters.map(c => [c.index,{x:c.x-center.x,y:c.y-center.y}]));
    const offsets = new Map();
    for (const node of layout.nodes) {
      const offset = offsets.get(node.component) || 0, anchor = byCluster.get(node.component);
      const radius = Math.sqrt(offset)*24, angle = offset*2.399963;
      node.anchor = anchor; node.x=anchor.x+Math.cos(angle)*radius; node.y=anchor.y+Math.sin(angle)*radius;
      node.radius=node.kind==='word'?2.7+Math.min(1.2,node.degree*.35):5+Math.sqrt(node.degree)*.8;
      offsets.set(node.component,offset+1);
    }
    layout.byId = new Map(layout.nodes.map(n => [n.id,n]));
    layout.simulation = d3.forceSimulation(layout.nodes).randomSource(d3.randomLcg(.42))
      .force('link',d3.forceLink(layout.edges).id(n => n.id).distance(55).strength(.8))
      .force('charge',d3.forceManyBody().strength(-85))
      .force('collision',d3.forceCollide(n => n.kind==='word'?11:18).iterations(2))
      .force('x',d3.forceX(n => n.anchor.x).strength(.035))
      .force('y',d3.forceY(n => n.anchor.y).strength(.035)).stop();
    layout.steps=0; layout.ready=false;
    return layout;
  }

  function draw({svg,layer,width,height,model,layout,savedTransform,selected,onSelect,onOpenWord,onCamera}) {
    const d3=window.d3;
    let disposed=false,frame=0,zoomFrame=0,current=selected,hover=null,transform=d3.zoomIdentity;
    let fitTransform=null,pendingCenter=null;
    svg.classed('global-network',true).attr('data-words',layout.nodes.filter(n=>n.kind==='word').length)
      .attr('data-origins',layout.nodes.filter(n=>n.kind!=='word').length).attr('data-layout-ready','false')
      .attr('aria-busy','true')
      .attr('aria-label','全部词库关系网，搜索可定位单词或词根，Enter 选择节点');
    const edge=layer.append('g').attr('class','global-edges').selectAll('line').data(layout.edges).join('line')
      .attr('class','global-edge').attr('data-source',e=>e.source.id).attr('data-target',e=>e.target.id);
    const node=layer.append('g').selectAll('g').data(layout.nodes,n=>n.id).join('g')
      .attr('class',n=>'global-node '+n.kind).attr('data-node-id',n=>n.id)
      .attr('role','button').attr('aria-label',n=>n.label+'，'+n.zh)
      .on('pointerenter',(event,n)=>{if(!event.buttons){hover=n.id;highlight();}})
      .on('pointerleave',()=>{hover=null;highlight();})
      .on('click',(event,n)=>{event.stopPropagation();if(!event.defaultPrevented)onSelect(n.id,false);})
      .on('dblclick',(event,n)=>{event.stopPropagation();if(n.kind==='word')onOpenWord(n.word);})
      .on('keydown',(event,n)=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(n.id,false);}
      });
    node.append('circle').attr('class','global-hit').attr('r',11);
    node.append('circle').attr('class','global-halo').attr('r',n=>n.radius+5);
    node.append('circle').attr('class','global-dot').attr('r',n=>n.radius);
    node.append('text').attr('class','global-label').attr('x',n=>n.radius+5).attr('y',4).text(n=>n.label);
    node.append('title').text(n=>n.label+' · '+n.zh);
    svg.on('click.global',event=>{if(event.target===svg.node())onSelect(null,false);})
      .on('pointerleave.global',()=>{hover=null;highlight();})
      .on('keydown.global',event=>{
        if(event.target===svg.node()&&event.key==='Enter'){
          event.preventDefault();const id=current||layout.nodes.find(n=>n.kind==='root')?.id;
          if(id){onSelect(id,true);node.filter(n=>n.id===id).node()?.focus();}
        }
      });
    function positions() {
      edge.attr('x1',e=>e.source.x).attr('y1',e=>e.source.y).attr('x2',e=>e.target.x).attr('y2',e=>e.target.y);
      node.attr('transform',n=>`translate(${n.x},${n.y}) scale(${1/transform.k})`);
      const size=nodeSize();
      node.select('.global-dot').attr('r',n=>n.radius*size);
      node.select('.global-halo').attr('r',n=>n.radius*size+5);
      node.select('.global-label').attr('x',n=>n.radius*size+5);
    }
    function nodeSize(){const detail=fitTransform?transform.k/fitTransform.k:1;return Math.min(1,(width<500?.42:.85)*Math.sqrt(detail));}
    function labelVisibility() {
      if(disposed)return;
      const id=hover||current,neighbors=id?model.adjacency.get(id):null;
      const detail=fitTransform?transform.k/fitTransform.k:1,size=nodeSize(),occupied=[];
      for(const n of detail>=2.2?layout.nodes:[]){
        const [x,y]=transform.apply([n.x,n.y]),r=n.radius*size+1;
        if(x>=-10&&x<=width+10&&y>=-10&&y<=height+10)occupied.push({x:x-r,y:y-r,w:r*2,h:r*2});
      }
      const labels=new Set();
      const ordered=[...layout.nodes].sort((a,b)=>
        Number(b.id===id)-Number(a.id===id)||Number(neighbors?.has(b.id))-Number(neighbors?.has(a.id))||
        Number(b.kind!=='word')-Number(a.kind!=='word')||b.degree-a.degree);
      for(const n of ordered){
        const priority=n.id===id||neighbors?.has(n.id);
        if(!priority&&(n.kind==='word'?detail<3.2:detail<1.7&&n.degree<(width<500?6:4)))continue;
        const [x,y]=transform.apply([n.x,n.y]);
        if(x < -100||x>width+30||y<0||y>height)continue;
        const box={x:x+n.radius*size+4,y:y-9,w:Math.min(240,n.label.length*6.7+5),h:15};
        if(!priority&&occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
        occupied.push(box);labels.add(n.id);
      }
      node.select('text').attr('display',n=>labels.has(n.id)?null:'none');
    }
    function highlight() {
      const id=hover||current,neighbors=id?model.adjacency.get(id):null;
      node.classed('selected',n=>n.id===current).classed('highlight',n=>n.id===id||neighbors?.has(n.id))
        .classed('dimmed',n=>Boolean(id&&n.id!==id&&!neighbors?.has(n.id)))
        .attr('tabindex',n=>n.id===(current||firstRoot)?0:-1)
        .attr('aria-pressed',n=>String(n.id===current));
      edge.classed('highlight',e=>e.source.id===id||e.target.id===id)
        .classed('dimmed',e=>Boolean(id&&e.source.id!==id&&e.target.id!==id));
      labelVisibility();
    }
    function camera(next) { svg.call(zoom.transform,next); }
    function fit() {
      const x0=d3.min(layout.nodes,n=>n.x)-42,x1=d3.max(layout.nodes,n=>n.x)+42;
      const y0=d3.min(layout.nodes,n=>n.y)-42,y1=d3.max(layout.nodes,n=>n.y)+42;
      const scale=Math.min((width-36)/(x1-x0),(height-36)/(y1-y0));
      fitTransform=d3.zoomIdentity.translate(width/2,height/2).scale(scale).translate(-(x0+x1)/2,-(y0+y1)/2);
      return fitTransform;
    }
    function centerOn(id) {
      if(!layout.ready){pendingCenter=id;return;}
      const n=layout.byId.get(id);if(!n)return;
      const adjacent=[n,...model.neighbors(id).map(i=>layout.byId.get(i))];
      const spanX=d3.max(adjacent,n=>n.x)-d3.min(adjacent,n=>n.x)+190;
      const spanY=d3.max(adjacent,n=>n.y)-d3.min(adjacent,n=>n.y)+120;
      const scale=Math.max(fitTransform.k*2,Math.min(fitTransform.k*6,width/spanX,height/spanY));
      camera(d3.zoomIdentity.translate(width/2,height/2).scale(scale).translate(-n.x,-n.y));
    }
    const firstRoot=layout.nodes.find(n=>n.kind==='root')?.id;
    const zoom=d3.zoom().scaleExtent([.04,8]).extent([[0,0],[width,height]]).on('zoom',event=>{
      transform=event.transform;layer.attr('transform',transform);onCamera(transform);
      if(!zoomFrame)zoomFrame=requestAnimationFrame(()=>{zoomFrame=0;positions();labelVisibility();});
    });
    svg.call(zoom).on('dblclick.zoom',null);
    node.call(d3.drag().clickDistance(4)
      .on('start',(event,n)=>{hover=null;n.dragging=false;})
      .on('drag',(event,n)=>{
        // The parent layer already applies the camera transform, so D3's
        // drag coordinates are in layout space.
        if(!n.dragging){n.dragging=true;if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)layout.simulation.alpha(.15).alphaTarget(.04).restart();}
        n.fx=n.x=event.x;n.fy=n.y=event.y;positions();
      }).on('end',(event,n)=>{if(n.dragging)layout.simulation.alphaTarget(0);labelVisibility();}));
    layout.simulation.on('tick.global',positions);
    function ready() {
      if(disposed)return;
      layout.ready=true;fit();positions();
      camera(savedTransform||fitTransform);highlight();
      svg.attr('data-layout-ready','true').attr('aria-busy','false').classed('layout-pending',false);
      if(pendingCenter){centerOn(pendingCenter);pendingCenter=null;}
    }
    function warmup() {
      if(disposed)return;
      for(let i=0;i<20&&layout.steps<240;i++,layout.steps++)layout.simulation.tick();
      if(layout.steps>=240){ready();return;}
      frame=requestAnimationFrame(warmup);
    }
    if(layout.ready)ready();
    else{svg.classed('layout-pending',true);fit();camera(fitTransform);positions();frame=requestAnimationFrame(warmup);}
    return {layout,zoom,
      select(id,{center=false}={}){current=id;hover=null;highlight();if(center&&id)centerOn(id);},
      fit(){if(layout.ready){layout.simulation.alphaTarget(0).stop();camera(fit());}},
      dispose(){disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(zoomFrame);layout.simulation.stop().on('tick.global',null);svg.on('.global',null);}
    };
  }
  window.WordPowerGlobalNetwork={createLayout,draw};
})();
