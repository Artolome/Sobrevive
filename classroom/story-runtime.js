/* Installed before learning.js so reports observe the narrative transition. */
(() => {
  'use strict';
  const data=window.SV_STORY;
  window.SVStoryEngine.validate(data,WORLDS);
  window.SVStory=window.SVStoryEngine.install(Core,data);
  const previousTiers=tiersOf;
  tiersOf=function(id){return data.worlds[id]?new Set([0,...(WORLDS[id].tiers||[]).map(t=>t.id)]):previousTiers(id);};
  for(const [id,definition] of Object.entries(data.worlds)){
    for(const field of ['intro_fr','sub','tagline'])if(definition[field])WORLDS[id][field]=definition[field];
    for(const [cardId,patch] of Object.entries(data.choiceTextPatches?.[id]||{})){
      const card=WORLDS[id].cards.find(c=>c.id===cardId);
      for(const side of ['l','r'])if(patch[side])Object.assign(card[side],patch[side]);
    }
    const ids=new Set(window.SVStoryEngine.flatten(definition).flatMap(({slot})=>[slot.card,...(slot.variants||[]).map(v=>v.card)]));
    WORLDS[id].cards=WORLDS[id].cards.filter(card=>ids.has(card.id));
    const chars=new Set(WORLDS[id].cards.map(card=>card.ch));
    WORLDS[id].chars=Object.fromEntries(Object.entries(WORLDS[id].chars).filter(([key])=>chars.has(key)));
  }
  // A week at school has its own epilogues; the isolated collection never rewrites V2 memories.
  for(const [id,patch] of Object.entries(data.endingPatches||{})){
    const ending=Object.values(window.SV_ENDINGS.worlds).flat().find(e=>e.id===id);
    if(ending)Object.assign(ending,patch);
  }
  renderLobby();
})();
