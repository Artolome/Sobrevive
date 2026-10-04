/* Aides de classe pour le moteur existant. Aucune donnée n'est envoyée à un serveur. */
(() => {
  'use strict';
  if (!window.__SV || typeof Core === 'undefined') return;
  const cfg=window.SV_LEARNING||{}, $s=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='sobrevive-v2-learning';
  const REPORT_KEY='sobrevive-v2-reports';
  let history=[],notes='',lastFocus=null,readAfterChoice=false,reportState=null;
  function store(){let ok=true;try{localStorage.setItem(KEY,JSON.stringify({history,notes,readAfterChoice}));}catch(_){ok=false;}try{if(reportState)localStorage.setItem(REPORT_KEY,JSON.stringify(reportState));}catch(_){ok=false;}return ok;}
  try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');history=Array.isArray(data.history)?data.history.slice(-80):[];notes=typeof data.notes==='string'?data.notes:'';readAfterChoice=data.readAfterChoice===true;reportState=data.reports||null;}catch(_){}
  try{const separate=localStorage.getItem(REPORT_KEY);if(separate)reportState=JSON.parse(separate);}catch(_){}
  // Compléter uniquement les anciens retours absents, avec une correspondance exacte et unique.
  let restored=false;
  for(const item of history){
    if(!item||item.narrative)continue;
    const matches=[];
    for(const world of Object.values(WORLDS)){
      if(item.worldId?item.worldId!==world.id:item.world!==world.name)continue;
      for(const card of world.cards)for(const side of ['l','r']){
        if(item.text===card.t&&item.choice===card[side].es&&item.translation===card[side].fr&&
          (!item.cardId||item.cardId===card.id)&&(!item.side||item.side===side)&&cfg.feedback?.[world.id]?.[card.id]?.[side]){
          matches.push({worldId:world.id,cardId:card.id,side,narrative:cfg.feedback[world.id][card.id][side]});
        }
      }
    }
    if(matches.length===1){Object.assign(item,matches[0]);restored=true;}
  }
  if(restored)store();
  const reports=window.SVReport.create({saved:reportState,legacyEntries:history,legacyNotes:notes,persist:data=>{reportState=data;return store();}});
  reports.save();
  const dialog=document.createElement('dialog');dialog.id='sv-dialog';dialog.setAttribute('aria-labelledby','sv-title');document.body.appendChild(dialog);
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;};
  function close(){
    dialog.close();
    const target=lastFocus?.isConnected&&lastFocus.getClientRects().length?lastFocus:
      (!$s('#app').hidden?$s('#btnL'):!$s('#end').hidden?$s('#againBtn'):!$s('#ficha').hidden?$s('#startBtn'):$s('#worlds button'));
    target?.focus();
  }
  function modal(title,html){if(!dialog.open)lastFocus=document.activeElement;dialog.innerHTML='<button id="sv-close" class="sv-button" aria-label="Fermer">×</button><h2 id="sv-title">'+esc(title)+'</h2><div id="sv-modal-body">'+html+'</div>';$s('#sv-close').onclick=close;if(!dialog.open)dialog.showModal();$s('#sv-close').focus();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  document.addEventListener('keydown',e=>{
    if(!dialog.open)return;
    if(['ArrowLeft','ArrowRight','Escape'].includes(e.key)){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close();}}
    if(e.key==='Tab'){
      const all=[...dialog.querySelectorAll('button,textarea,input,select,a[href],summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
      if(!all.length)return;const first=all[0],last=all.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  },true);
  function tutorial(){
    modal('Trois repères pour commencer',
      '<h3>1 · Lis et choisis</h3><p>Lis la situation en espagnol. Choisis une réponse en cliquant, en glissant la carte ou avec les flèches du clavier.</p>'+
      '<h3>2 · Cherche un équilibre</h3><p>Les quatre jauges commencent à <strong>50/100</strong>. À <strong>0 ou 100</strong>, l’aventure s’arrête. Clique sur une jauge pour comprendre ses deux limites.</p>'+
      '<h3>3 · Comprends les conséquences</h3><p>Après chaque choix, un court commentaire explique ce qui se passe. « Comprendre » donne le retour en espagnol et en français, avec les jauges. « Mots utiles » aide à lire et « Traduire » affiche le français.</p>'+
      '<p class="sv-note">Les jauges décrivent une fiction. Elles ne mesurent ni ton niveau d’espagnol ni ta valeur personnelle.</p>'+
      '<label class="sv-option"><input id="sv-read-after" type="checkbox" '+(readAfterChoice?'checked':'')+'> Lire le retour après chaque choix</label><p class="sv-muted">Une pause de lecture permet de discuter du choix. Tu peux aussi consulter « Comprendre » quand tu le souhaites.</p>'+
      '<p class="sv-muted">Collections et bilan sont partagés sur ce navigateur. La partie en cours ne reprend pas après fermeture.</p>'+
      '<div class="sv-actions"><button class="sv-button" id="sv-ready">¡Vamos! · J’ai compris</button></div>');
    $s('#sv-ready').onclick=()=>{try{localStorage.setItem('sobrevive-v2-tutorial','1');}catch(_){}close();};
    $s('#sv-read-after').onchange=e=>{readAfterChoice=e.target.checked;store();};
  }
  function gauges(selected){
    const world=U||WORLDS[fichaId];if(!world){tutorial();return;}
    const list=selected?world.gauges.filter(g=>g.key===selected):world.gauges;
    modal('Comprendre les jauges', '<p>La zone de jeu va de <strong>1 à 99</strong>. Une limite atteinte produit une fin narrative, pas une évaluation scolaire.</p>'+list.map(g=>{
      const d=world.deaths?.[g.key]||{};
      return '<h3>'+esc(g.label)+'</h3><p><strong>À 0 :</strong> '+esc(d.lo?.fr||'La ressource est épuisée.')+'</p><p><strong>À 100 :</strong> '+esc(d.hi?.fr||'L’équilibre de cette ressource est rompu.')+'</p>';
    }).join('')+'<p class="sv-muted">Ces limites sont des règles fictives du jeu, pas des conseils de vie ou de santé.</p>');
  }
  function words(){
    const text=[cur?.t,cur?.l?.es,cur?.r?.es].join(' ').toLocaleLowerCase('es');
    const dictionary=cfg.glossary||[],matches=dictionary.filter(([es])=>{
      const term=es.toLocaleLowerCase('es').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp('(^|[^\\p{L}\\p{N}])'+term+'(?=$|[^\\p{L}\\p{N}])','u').test(text);
    });
    const list=matches;
    modal('Mots utiles', '<p>'+ (matches.length?'Quelques mots présents dans cette carte :':'Cette carte n’a pas encore d’entrée dans le lexique. La traduction complète reste disponible.')+'</p><dl>'+list.map(([es,fr])=>'<dt lang="es">'+esc(es)+'</dt><dd>'+esc(fr)+'</dd>').join('')+'</dl><div class="sv-actions"><button class="sv-button" id="sv-translate">Voir aussi la traduction de la carte</button></div>');
    $s('#sv-translate').onclick=()=>{close();if(!$s('#app').hidden&&!$s('#app').classList.contains('showfr'))$s('#helpBtn').click();};
  }
  function effects(item){return item.effects.map(e=>'<span class="sv-fx">'+esc(e.label)+' : '+e.before+' → '+e.after+' ('+(e.delta>0?'+':'')+e.delta+')</span>').join('')||'<p>Aucune jauge modifiée.</p>';}
  function narrative(item){return item.narrative?'<div class="sv-note"><p lang="es">'+esc(item.narrative.es)+'</p><p lang="fr">'+esc(item.narrative.fr)+'</p></div>':'<p class="sv-muted">Ce commentaire n’a pas été conservé dans cette ancienne décision. Les variations enregistrées restent consultables.</p>';}
  function decision(item){if(!item)return;modal('Ta dernière décision','<p lang="es"><strong>'+esc(item.text)+'</strong></p><p lang="es">'+esc(item.choice)+'</p><p>'+esc(item.translation)+'</p>'+narrative(item)+effects(item)+'<p class="sv-muted">Conséquences dans la fiction et variations réellement appliquées. Ce n’est pas une correction de ta réponse en espagnol.</p><div class="sv-actions"><button class="sv-button" id="sv-continue">Continuer</button></div>');$s('#sv-continue').onclick=close;}
  function renderFeedback(box,item){
    box.replaceChildren();
    if(!item){box.textContent='Première carte · les jauges commencent à 50/100.';return;}
    const title=document.createElement('strong');title.className='sv-feedback-title';title.textContent='Dernier choix · '+item.translation;box.appendChild(title);
    if(item.narrative?.fr){const text=document.createElement('p');text.className='sv-feedback-story';text.textContent=item.narrative.fr;box.appendChild(text);}
    const detail=document.createElement('div');detail.className='sv-feedback-detail';detail.textContent=item.effects.map(e=>e.label+' '+(e.delta>0?'+':'')+e.delta).join(' · ')||'Aucune jauge modifiée.';
    detail.appendChild(button('Comprendre',()=>decision(item)));box.appendChild(detail);
  }
  function feedback(item){
    renderFeedback($s('#sv-feedback'),item);
    $s('#app footer').textContent=(S?.plays||0)+' choix effectué'+(S?.plays===1?'':'s')+' · progression de jeu, pas une note de langue';
  }
  function journal(){reports.show(modal);}
  const lobby=$s('#lobby .panel'),banner=document.createElement('p');banner.className='sv-preview';banner.textContent='V2 · '+(cfg.notice||'Préversion pédagogique');lobby.insertBefore(banner,$s('#lobby .rule'));
  const menu=document.createElement('div');menu.className='sv-toolbar';menu.append(button('Comment jouer',tutorial),button('Mon bilan',journal));lobby.insertBefore(menu,$s('#worlds'));
  const tools=document.createElement('nav');tools.className='sv-toolbar';tools.id='sv-tools';tools.setAttribute('aria-label','Aides de jeu');tools.append(button('Mots utiles',words),button('Règles et options',tutorial),button('Mon bilan',journal));$s('#gauges').after(tools);
  $s('#lobby .foot').textContent='225 cartes · cinq univers · collections et bilan partagés sur ce navigateur. La partie en cours ne se sauvegarde pas.';
  const box=document.createElement('div');box.id='sv-feedback';box.className='sv-feedback';box.setAttribute('lang','fr');box.setAttribute('role','status');box.setAttribute('aria-live','polite');$s('#choices').after(box);
  const endFeedback=document.createElement('div');endFeedback.id='sv-end-feedback';endFeedback.className='sv-feedback';endFeedback.setAttribute('lang','fr');endFeedback.hidden=true;$s('#endTxtFr').after(endFeedback);
  const speaker=document.createElement('p');speaker.id='sv-speaker';$s('#speechBox').prepend(speaker);
  $s('#speech').setAttribute('lang','es');$s('#speechFr').setAttribute('lang','fr');$s('#btnL .es').setAttribute('lang','es');$s('#btnR .es').setAttribute('lang','es');
  $s('#helpBtn').innerHTML='<i class="flag" aria-hidden="true"></i> Traduire';$s('#helpBtn').setAttribute('aria-pressed','false');
  $s('#helpBtn').addEventListener('click',()=>{$s('#helpBtn').setAttribute('aria-pressed',String($s('#app').classList.contains('showfr')));});
  const baseGauges=renderGauges;
  renderGauges=function(){baseGauges();if(!U||!S)return;U.gauges.forEach(g=>{
    const el=$s('#gauges .gauge[data-g="'+g.key+'"]');if(!el)return;
    let val=el.querySelector('.sv-value');if(!val){val=document.createElement('span');val.className='sv-value';el.appendChild(val);el.tabIndex=0;el.setAttribute('role','button');el.onclick=()=>gauges(g.key);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();gauges(g.key);}};}
    val.textContent=S.g[g.key]+'/100';el.setAttribute('aria-label',g.label+' : '+S.g[g.key]+' sur 100. Expliquer les limites.');
  });};
  const baseCard=renderCard;
  renderCard=function(){baseCard();$s('#helpBtn').setAttribute('aria-pressed','false');speaker.textContent=U.chars[cur.ch]?.name||'';
    for(const id of ['btnL','btnR']){const el=$s('#'+id+' .es');const match=el.textContent.match(/^(.*?)\s*(\([^()]+\))$/);if(match){el.textContent=match[1];const action=document.createElement('span');action.className='sv-choice-action';action.textContent=match[2];el.appendChild(action);}}
  };
  const baseStart=startGame;
  startGame=function(id){baseStart(id);if(U?.id!==id||!S)return;reports.start(U,S);feedback(null);$s('#btnL').focus();let seen=false;try{seen=localStorage.getItem('sobrevive-v2-tutorial')==='1';}catch(_){}if(!seen)tutorial();};
  const baseApply=Core.apply;
  Core.apply=function(world,state,card,side){
    const tracked=state===S,before={...state.g},gameTime=tracked?Core.timeLabel(world,state):'',place=tracked?Core.place(world,state):'';
    if(tracked&&!reports.hasActive())reports.start(world,state,{partial:state.plays>0});
    const result=baseApply.call(this,world,state,card,side);
    if(tracked){const item={worldId:world.id,cardId:card.id,side,world:world.name,text:card.t,textFr:card.f,choice:card[side].es,translation:card[side].fr,turn:state.plays,recordedAt:new Date().toISOString(),gameTime,place,character:world.chars[card.ch]?.name||'',narrative:cfg.feedback?.[world.id]?.[card.id]?.[side]||null,effects:world.gauges.filter(g=>before[g.key]!==state.g[g.key]).map(g=>({key:g.key,label:g.label,before:before[g.key],after:state.g[g.key],delta:state.g[g.key]-before[g.key]}))};history.push(item);history=history.slice(-80);reports.record(world,state,item);if(result.dead||result.win)reports.finish(result.dead?'lost':'won',world,state,result.dead?world.deaths?.[result.dead.g]?.[result.dead.dir]:world.win);feedback(item);if(readAfterChoice)queueMicrotask(()=>decision(item));}
    return result;
  };
  const baseEnd=showEnd;
  showEnd=function(dead){baseEnd(dead);if(!dead){$s('#endTxtEs').textContent=U.win?.es||'¡Has ganado!';$s('#endTxtFr').textContent=(U.win?.fr||'Tu as gagné !')+' La réussite du jeu n’est pas une note d’espagnol.';}reports.finish(dead?'lost':'won',U,S,dead?U.deaths?.[dead.g]?.[dead.dir]:U.win);const last=reports.lastChoice(U.id);endFeedback.hidden=!last;if(last)renderFeedback(endFeedback,last);if(!dialog.open)$s('#againBtn').focus();};
  const baseQuit=askQuit;
  $s('#quitBtn').removeEventListener('click',baseQuit);
  askQuit=function(){
    if(busy||!U)return;
    modal('Quitter cette partie ?', '<p>Les collections, tes décisions et tes notes restent sur ce navigateur. Cette partie ne pourra pas être reprise.</p><div class="sv-actions"><button class="sv-button" id="sv-stay">Continuer à jouer</button><button class="sv-button" id="sv-quit-confirm">Quitter la partie</button></div>');
    $s('#sv-stay').onclick=close;
    $s('#sv-quit-confirm').onclick=()=>{reports.finish('quit',U,S,null,'La partie a été quittée depuis le jeu.');close();leaveGame();$s('#startBtn').focus();};
  };
  $s('#quitBtn').addEventListener('click',askQuit);
  const endButton=button('Mon bilan · Exporter',journal);endButton.className='sv-button';$s('#end .panel').appendChild(endButton);
  if(U&&S){if(!$s('#app').hidden)reports.start(U,S,{partial:S.plays>0});renderGauges();speaker.textContent=cur?U.chars[cur.ch]?.name||'':'';feedback(reports.lastChoice(U.id));}
  requestAnimationFrame(()=>fit());
})();
