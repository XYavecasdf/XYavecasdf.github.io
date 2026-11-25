/* Graph-walking rules. Only recorded word/root edges are playable. */
(function(host,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else host.WordPowerPathfinderModel=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const CHALLENGES=[
    {id:'shared-humanity',start:'philanthropy',goal:'misanthropy'},
    {id:'horse-family',start:'equine',goal:'equestrian'},
    {id:'fields-of-study',start:'psychology',goal:'biology'},
    {id:'words-and-people',start:'pedagogue',goal:'democracy'},
    {id:'love-and-humanity',start:'philosophy',goal:'anthropology'},
    {id:'marriage-branches',start:'monologue',goal:'polygamy'},
    {id:'books-and-people',start:'bibliophile',goal:'anthropologist'},
    {id:'books-and-aversion',start:'bibliophile',goal:'misogyny'},
    {id:'women-and-marriage',start:'gynecologist',goal:'polygamy'},
    {id:'one-and-aversion',start:'monotheism',goal:'misogyny'},
    {id:'humanity-and-marriage',start:'philanthropy',goal:'monogamy'},
    {id:'writing-and-light',start:'autobiography',goal:'photograph'}
  ];
  const playable=(model,id)=>['word','root'].includes(model.nodes.get(id)?.kind);
  const neighbors=(model,id)=>model.neighbors(id).filter(n=>playable(model,n));
  function shortestPath(model,start,goal){
    if(!playable(model,start)||!playable(model,goal))return null;
    const queue=[start],previous=new Map([[start,null]]);
    for(let i=0;i<queue.length;i++){
      const id=queue[i];
      if(id===goal){const path=[];for(let n=goal;n!==null;n=previous.get(n))path.unshift(n);return path;}
      for(const next of neighbors(model,id))if(!previous.has(next)){previous.set(next,id);queue.push(next);}
    }
    return null;
  }
  function challenges(model){
    return CHALLENGES.map(seed=>{
      const start='word:'+seed.start,goal='word:'+seed.goal,path=shortestPath(model,start,goal);
      if(!path||path.length<3)throw new Error('Unplayable pathfinder challenge: '+seed.id);
      return {id:seed.id,start,goal,shortestSteps:path.length-1};
    });
  }
  function createRound(model,challenge){
    if(model.nodes.get(challenge.start)?.kind!=='word'||model.nodes.get(challenge.goal)?.kind!=='word'||challenge.start===challenge.goal)throw new Error('A challenge requires two different words');
    const solution=shortestPath(model,challenge.start,challenge.goal);
    if(!solution)throw new Error('Challenge words are disconnected');
    let path=[challenge.start],phase='playing',hint=null;
    const hinted=new Set();
    function snapshot(){return {id:challenge.id,start:challenge.start,goal:challenge.goal,current:path.at(-1),path:[...path],phase,hint,
      steps:path.length-1,shortestSteps:solution.length-1,hintsUsed:hinted.size,
      choices:phase==='playing'?neighbors(model,path.at(-1)):[],
      // A reference route is deliberately absent until completion or reveal.
      reference:phase==='playing'?null:[...solution]};}
    return {
      snapshot,
      move(next){
        if(phase!=='playing')return {changed:false,reason:'finished'};
        if(next===path.at(-1))return {changed:false,reason:'current'};
        if(!neighbors(model,path.at(-1)).includes(next))return {changed:false,reason:'not-adjacent'};
        path.push(next);hint=null;if(next===challenge.goal)phase='completed';return {changed:true};
      },
      undo(){if(phase!=='playing'||path.length<2)return false;path.pop();hint=null;return true;},
      rewind(index){if(phase!=='playing'||!Number.isInteger(index)||index<0||index>=path.length-1)return false;path=path.slice(0,index+1);hint=null;return true;},
      hint(){
        if(phase!=='playing')return null;
        const onward=shortestPath(model,path.at(-1),challenge.goal);
        hint=onward[1];hinted.add(path.at(-1));return hint;
      },
      reveal(){if(phase!=='playing')return false;phase='revealed';hint=null;return true;},
      restart(){path=[challenge.start];phase='playing';hint=null;hinted.clear();}
    };
  }
  function visibleGraph(model,round){
    const shown=round.phase==='revealed'?round.reference:round.path;
    const ids=new Set([...shown,...round.choices]);
    const walked=new Set();
    for(let i=1;i<shown.length;i++){walked.add(shown[i-1]+'\0'+shown[i]);walked.add(shown[i]+'\0'+shown[i-1]);}
    return {nodes:[...ids].map(id=>({...model.nodes.get(id),current:id===round.current,start:id===round.start,goal:id===round.goal,
        available:round.choices.includes(id),hint:id===round.hint,visited:shown.includes(id)})),
      edges:model.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({...e,walked:walked.has(e.source+'\0'+e.target)}))};
  }
  return {CHALLENGES,neighbors,shortestPath,challenges,createRound,visibleGraph};
});
