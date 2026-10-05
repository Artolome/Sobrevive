/* Réussites narratives : sélection pure. Le moteur décide d'abord si la partie est gagnée. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SVEndings=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const LIMIT=300;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const list=(worldId,data)=>copy(data?.worlds?.[worldId]||[]);
  function record(state,card,side){
    if(!state||!card||typeof card.id!=='string'||!['l','r'].includes(side)||!card[side])return;
    if(!Array.isArray(state.endingTrail))state.endingTrail=[];
    state.endingTrail.push({cardId:card.id,side});
    if(state.endingTrail.length>LIMIT)state.endingTrail.splice(0,state.endingTrail.length-LIMIT);
  }
  function matchingChoice(trail,condition){return trail.find(item=>item.cardId===condition.cardId&&(!condition.side||item.side===condition.side));}
  function matches(world,state,rule){
    if(rule.type==='choices')return rule.all.length>0&&rule.all.every(condition=>matchingChoice(state.endingTrail||[],condition));
    if(rule.type==='balance')return world.gauges.every(g=>Number.isFinite(state.g[g.key])&&state.g[g.key]>=rule.min&&state.g[g.key]<=rule.max);
    if(rule.type==='compare')return rule.op==='>='&&Number.isFinite(state.g[rule.left])&&Number.isFinite(state.g[rule.right])&&state.g[rule.left]>=state.g[rule.right];
    return rule.type==='fallback';
  }
  function evidence(world,state,ending,profiles){
    const rule=ending.rule,label=key=>world.gauges.find(g=>g.key===key)?.label||key;
    if(rule.type==='choices'){
      const pieces={es:[],fr:[]};
      for(const condition of rule.all){
        const item=matchingChoice(state.endingTrail||[],condition),card=world.cards.find(c=>c.id===condition.cardId);
        for(const lang of ['es','fr'])pieces[lang].push((world.chars[card.ch]?.name||card.ch)+' : « '+card[item.side][lang]+' »');
      }
      return {es:'Escenas jugadas y respuestas elegidas: '+pieces.es.join(' · ')+'.',fr:'Scènes jouées et réponses choisies : '+pieces.fr.join(' · ')+'.'};
    }
    if(rule.type==='balance'){
      const values=world.gauges.map(g=>g.label+' '+state.g[g.key]).join(' · ');
      return {es:'Los cuatro medidores terminan entre '+rule.min+' y '+rule.max+', incluidos: '+values+'.',fr:'Les quatre jauges finissent entre '+rule.min+' et '+rule.max+' inclus : '+values+'.'};
    }
    // Le repli est le complément strict de la comparaison qui le précède.
    const compare=rule.type==='compare'?rule:[...profiles].reverse().find(p=>p.rule.type==='compare')?.rule;
    if(!compare)return {es:'Ningún perfil anterior corresponde a este recorrido.',fr:'Aucun des profils précédents ne correspond à ce parcours.'};
    const isCompare=rule.type==='compare',left=isCompare?compare.left:compare.right,right=isCompare?compare.right:compare.left;
    const relation=isCompare?'≥':'>';
    const values=label(left)+' ('+state.g[left]+') '+relation+' '+label(right)+' ('+state.g[right]+')';
    return {es:'Comparación al final: '+values+'. Se comparan estos dos medidores; no significa que sus valores sean altos.',fr:'Comparaison finale : '+values+'. On compare ces deux jauges ; cela ne signifie pas que leurs valeurs sont élevées.'};
  }
  function select(world,state,data){
    const profiles=data?.worlds?.[world.id]||[];
    const ending=profiles.find(profile=>matches(world,state,profile.rule));
    if(!ending)return null;
    return {...copy(ending),worldId:world.id,evidence:evidence(world,state,ending,profiles)};
  }
  return {select,record,list};
});
