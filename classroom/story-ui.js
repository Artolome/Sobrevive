(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=KIT.esc,story=window.SVStory,config=window.SV_STORY;
  document.body.classList.add('sv-story-mode');
  $('.sv-edition').textContent='✦ LES HISTOIRES PRENNENT UN CHEMIN';
  $('#lobby .sv-preview').textContent='Parcours narratifs · version à essayer';
  $('#lobby .rule').textContent='Un jour après l’autre. Un choix après l’autre.';
  $('#lobby .foot').textContent='Une semaine au collège, une aventure de chevalier, trois vies d’artistes. Cette variante possède ses propres collections et bilans sur ce navigateur.';
  const intro=document.createElement('p');intro.className='sv-story-intro';
  intro.textContent='Les étapes se suivent. Tes décisions ouvrent certaines rencontres et en laissent d’autres pour une prochaine partie.';
  $('#worlds').before(intro);
  const position=document.createElement('div');position.id='sv-story-position';position.innerHTML='<span id="sv-story-chapter"></span><button id="sv-story-map" type="button">Mon parcours ↗</button>';
  $('#speechBox').prepend(position);
  const context=document.createElement('div');context.id='sv-story-context';context.innerHTML='<p lang="es"></p><p lang="fr"></p>';
  $('#speech').before(context);
  const trail=document.createElement('section');trail.id='sv-story-outline';$('#fIntro').closest('.fhead').after(trail);
  function outline(id,current=-1){return '<ol class="sv-story-stages">'+config.worlds[id].stages.map((stage,i)=>'<li'+(i===current?' aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(stage.title.fr)+'</b><small>'+esc(stage.period.fr)+'</small></div></li>').join('')+'</ol>';}
  function worldMap(id){
    const definition=config.worlds[id],entry=U?.id===id&&S?.story?story.current(U,S):null;
    window.SVStoryModal('Le fil de '+WORLDS[id].name,'<p>'+esc(definition.intro_fr)+'</p>'+outline(id,entry?.stageIndex??-1)+'<p class="sv-note">Les étapes reviennent dans cet ordre. À l’intérieur, tes réponses décident de certaines scènes. Rejouer avec d’autres choix permet de rencontrer une autre suite.</p>'+(id==='cole'?'<p>Une semaine de cinq journées. Les jauges, les engagements et les rencontres continuent d’un jour à l’autre.</p>':'<p>Les repères situent le récit. Les dialogues et décisions sont une fiction de jeu ; ils ne réécrivent pas les faits historiques ou le texte du roman.</p>'));
  }
  $('#sv-story-map').onclick=()=>worldMap(U.id);
  const originalFicha=openFicha;
  openFicha=function(id){originalFicha(id);if(!config.worlds[id])return;trail.innerHTML='<h3>Ton aventure en '+config.worlds[id].stages.length+' étapes</h3>'+outline(id)+'<p>Une seule carte à la fois. Les choix faits dans une scène peuvent changer les rencontres suivantes.</p>';
    $('#fUnlock').textContent='Les rencontres s’ouvrent au fil du récit et de tes réponses. Tous les chapitres sont accessibles dès la première partie.';
  };
  const originalCard=renderCard;
  renderCard=function(){originalCard();const entry=story.current(U,S);if(!entry)return;
    $('#sv-story-chapter').textContent=entry.stage.title.fr+' · '+(S.story.index+1)+'/'+window.SVStoryEngine.flatten(config.worlds[U.id]).length;
    context.querySelector('[lang="es"]').textContent=entry.context.es;
    context.querySelector('[lang="fr"]').textContent=entry.context.fr;
    context.classList.toggle('sv-story-consequence',entry.via.length>0);
    context.dataset.nodeId=entry.nodeId;
    context.dataset.branched=String(entry.via.length>0);
  };
  const originalEnd=showEnd;
  showEnd=function(dead){
    if(!dead&&U&&S?.story&&!Core.isWin(U,S)&&!Core.checkDeath(U,S))return;
    originalEnd(dead);
  };
  // Only navigational links are allowed here; V2's debug anchors must not award a story ending.
  route=function(){
    const match=/^#(ficha|juego)-(cole|quijote|goya|botero|frida)(-fr)?$/.exec(location.hash);
    if(!match)return false;
    if(match[1]==='ficha')openFicha(match[2]);else{startGame(match[2]);if(match[3])$('#app').classList.add('showfr');}
    return true;
  };
  showLobby();route();
})();
