/* Ordered scenes over the existing gauge engine. No browser dependency. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SVStoryEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const flatten=definition=>definition.stages.flatMap((stage,stageIndex)=>stage.slots.map(slot=>({stage,stageIndex,slot,nodeId:stage.id+'/'+slot.id})));
  function validate(config,worlds){
    if(config.version!==1)throw new Error('Version de parcours inconnue');
    const expected=['cole','quijote','goya','botero','frida'];
    if(!config.worlds||Object.keys(config.worlds).length!==5||expected.some(id=>!config.worlds[id]))throw new Error('Cinq univers sont nécessaires');
    for(const [id,def] of Object.entries(config.worlds)){
      const world=worlds[id];if(!world||id!==def.id)throw new Error('Univers absent : '+id);
      const plan=flatten(def),seen=new Set(),stageIds=new Set();
      if(!plan.length||plan.length>100)throw new Error('Longueur de parcours invalide : '+id);
      for(const stage of def.stages){
        if(stageIds.has(stage.id)||!stage.slots.length)throw new Error('Étape invalide : '+id);
        if(typeof stage.place!=='string'||!stage.place.trim())throw new Error('Lieu absent : '+id+'/'+stage.id);
        stageIds.add(stage.id);
        for(const field of ['title','period'])for(const lang of ['es','fr'])if(!stage[field]?.[lang])throw new Error('Repère absent : '+id+'/'+stage.id);
      }
      for(const {slot,nodeId} of plan){
        if(!slot.id||seen.has(nodeId))throw new Error('Scène dupliquée : '+id+'/'+nodeId);seen.add(nodeId);
        for(const item of [slot,...slot.variants||[]]){
          if(!world.cards.some(c=>c.id===item.card))throw new Error('Carte absente : '+id+'/'+item.card);
          if(item!==slot&&(!item.when?.length||!item.when.every(c=>world.cards.some(d=>d.id===c.cardId)&&['l','r'].includes(c.side))))throw new Error('Condition invalide : '+id+'/'+slot.id);
          if(item.override&&Object.keys(item.override).some(k=>!['t','f'].includes(k)))throw new Error('Seuls les textes de scène peuvent être adaptés');
          if(item.override&&['t','f'].some(key=>typeof item.override[key]!=='string'||!item.override[key].trim()))throw new Error('Adaptation bilingue incomplète');
          if(item.context&&['es','fr'].some(lang=>typeof item.context[lang]!=='string'||!item.context[lang].trim()))throw new Error('Contexte bilingue incomplet');
        }
        for(const lang of ['es','fr'])if(!slot.label?.[lang]||!slot.context?.[lang])throw new Error('Contexte absent : '+id+'/'+slot.id);
      }
    }
    return true;
  }
  function install(Core,config){
    const base={};for(const name of ['newState','pick','advance','apply','isWin','progress','timeLabel','place','survived','newUnlocks'])base[name]=Core[name];
    const plans=Object.fromEntries(Object.entries(config.worlds).map(([id,d])=>[id,flatten(d)]));
    const pending=new WeakMap();
    const active=(world,state)=>!!(plans[world.id]&&state?.story?.version===1);
    const matches=(state,conditions)=>conditions.every(condition=>state.story.choices.some(choice=>choice.cardId===condition.cardId&&choice.side===condition.side));
    function current(world,state){
      const plan=plans[world.id],entry=plan[state.story.index];if(!entry)return null;
      const variant=(entry.slot.variants||[]).find(v=>matches(state,v.when));
      const selected=variant||entry.slot;
      const context=selected.context||entry.slot.context;
      return {...entry,cardId:selected.card,override:selected.override,context,via:variant?copy(variant.when):[]};
    }
    function meta(world,state,entry){
      return {nodeId:entry.nodeId,step:state.story.index+1,total:plans[world.id].length,stageIndex:entry.stageIndex,stageId:entry.stage.id,stageTitle:copy(entry.stage.title),period:copy(entry.stage.period),label:copy(entry.slot.label),context:copy(entry.context),via:copy(entry.via)};
    }
    Core.newState=function(world){const state=base.newState.call(this,world);if(plans[world.id])state.story={version:1,index:0,choices:[],current:null,last:null};return state;};
    Core.pick=function(world,state,unlocked){
      if(!active(world,state))return base.pick.call(this,world,state,unlocked);
      const entry=current(world,state);if(!entry)return null;
      const original=world.cards.find(c=>c.id===entry.cardId);
      if(!original)throw new Error('Carte du parcours introuvable : '+entry.cardId);
      if(original.cond&&!Object.entries(original.cond).every(([key,value])=>state.flags[key]===value))throw new Error('Précondition narrative non accomplie : '+world.id+'/'+entry.slot.id+'/'+entry.cardId);
      state.story.current=meta(world,state,entry);
      return entry.override?{...original,...entry.override}:original;
    };
    Core.apply=function(world,state,card,side){
      if(!active(world,state))return base.apply.call(this,world,state,card,side);
      const entry=current(world,state);
      if(!entry||entry.cardId!==card.id||!['l','r'].includes(side))throw new Error('Choix hors de la scène courante');
      pending.set(state,{entry,card,side});
      try{return base.apply.call(this,world,state,card,side);}finally{pending.delete(state);}
    };
    Core.advance=function(world,state){
      if(!active(world,state))return base.advance.call(this,world,state);
      const turn=pending.get(state);if(!turn)throw new Error('Une scène avance seulement après un choix');
      state.story.last=meta(world,state,turn.entry);
      state.story.choices.push({nodeId:turn.entry.nodeId,cardId:turn.card.id,side:turn.side});
      state.story.index++;
      state.story.current=null;
      // The original time value is kept for compatibility; narrative labels use the stage.
    };
    Core.isWin=function(world,state){return active(world,state)?state.story.index>=plans[world.id].length:base.isWin.call(this,world,state);};
    Core.progress=function(world,state){return active(world,state)?Math.min(1,state.story.index/plans[world.id].length):base.progress.call(this,world,state);};
    Core.timeLabel=function(world,state){
      if(!active(world,state))return base.timeLabel.call(this,world,state);
      const entry=current(world,state);return entry?entry.stage.period.es+' · '+entry.slot.label.es:'Fin del recorrido';
    };
    Core.place=function(world,state){if(!active(world,state))return base.place.call(this,world,state);return (current(world,state)||plans[world.id].at(-1)).stage.place;};
    Core.survived=function(world,state){if(!active(world,state))return base.survived.call(this,world,state);const completed=config.worlds[world.id].stages.filter(stage=>stage.slots.every(slot=>state.story.choices.some(c=>c.nodeId===stage.id+'/'+slot.id))).length;return [completed,world.id==='cole'?'días completos':'etapas completas'];};
    Core.newUnlocks=function(world,state,unlocked,wins){return active(world,state)?[]:base.newUnlocks.call(this,world,state,unlocked,wins);};
    return {definition:id=>config.worlds[id],current:(world,state)=>active(world,state)?current(world,state):null,snapshot:(world,state)=>active(world,state)&&state.story.last?copy(state.story.last):null};
  }
  return {validate,install,flatten};
});
