/* Cartes et collection de dénouements. Le choix d'une fin appartient à endings.js. */
(() => {
  'use strict';
  const KEY='sobrevive-v2-endings';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.SVEndingView={create({modal}){
    const data=window.SV_ENDINGS,engine=window.SVEndings,$=s=>document.querySelector(s);
    let discoveries={version:1,worlds:{}},storageFailed=false,selectedWorld='';
    function read(){
      try{
        const saved=JSON.parse(localStorage.getItem(KEY)||'null');
        if(saved?.version!==1||!saved.worlds)return;
        for(const worldId of ORDER)for(const ending of engine.list(worldId,data)){
          const item=saved.worlds[worldId]?.[ending.id];
          if(item?.id===ending.id&&item.worldId===worldId&&item.title?.es&&item.title?.fr&&item.epilogue?.es&&item.epilogue?.fr){
            discoveries.worlds[worldId]??={};discoveries.worlds[worldId][ending.id]=item;
          }
        }
      }catch(_){/* Le jeu et le téléchargement du bilan restent disponibles. */}
    }
    read();
    const known=(worldId,id)=>discoveries.worlds[worldId]?.[id];
    const count=worldId=>(worldId?[worldId]:ORDER).reduce((n,id)=>n+engine.list(id,data).filter(e=>known(id,e.id)).length,0);
    function card(ending){
      const art=artOf(ending.worldId),index=engine.list(ending.worldId,data).findIndex(e=>e.id===ending.id);
      const image=ending.artCharacter?art.charImages?.[ending.artCharacter]:art.coverImage;
      return KIT.cardHTML({num:index+1,name:ending.title.es,sub:WORLDS[ending.worldId].name,image:image||art.coverImage});
    }
    function reason(ending){return '<details class="sv-ending-reason"><summary>Pourquoi cette fin ?</summary><p lang="es">'+esc(ending.evidence?.es||'')+'</p><p lang="fr">'+esc(ending.evidence?.fr||'')+'</p><p class="sv-muted">Le jeu donne la priorité à certaines rencontres accomplies, puis à l’équilibre des quatre jauges, puis à leur comparaison. Ces dénouements ne sont pas classés du meilleur au moins bon.</p></details>';}
    function updateCounters(){
      $('#sv-endings-menu')?.setAttribute('aria-label','Mes fins · '+count()+' sur 20 découvertes');
      if($('#sv-world-endings')&&fichaId)$('#sv-world-endings').textContent='Les fins de cet univers · '+count(fichaId)+'/4';
      if($('#sv-ending-open'))$('#sv-ending-open').textContent='Mes fins · '+count()+'/20';
    }
    function remember(world,state,ending){
      if(!ending)return false;
      read();discoveries.worlds[world.id]??={};
      const isNew=!known(world.id,ending.id);
      if(isNew)discoveries.worlds[world.id][ending.id]={...JSON.parse(JSON.stringify(ending)),discoveredAt:new Date().toISOString()};
      try{localStorage.setItem(KEY,JSON.stringify(discoveries));storageFailed=false;}catch(_){storageFailed=true;}
      updateCounters();return isNew;
    }
    function detail(ending){
      modal(ending.title.fr,'<div class="sv-ending-detail-card">'+card(ending)+'</div><p class="sv-overline" lang="es">'+esc(ending.title.es)+'</p><p lang="es">'+esc(ending.epilogue.es)+'</p><p lang="fr">'+esc(ending.epilogue.fr)+'</p>'+reason(ending)+'<p class="sv-muted">Le « pourquoi » conserve les repères de la première découverte de cette fin.</p><div class="sv-actions"><button id="sv-ending-back" class="sv-button">← Retour à mes fins</button></div>');
      $('#sv-ending-back').onclick=()=>collection(selectedWorld);
    }
    function collection(worldId=''){
      selectedWorld=ORDER.includes(worldId)?worldId:'';read();
      const worlds=selectedWorld?[selectedWorld]:ORDER;
      const html='<p class="sv-note">'+count()+' dénouement'+(count()===1?'':'s')+' de réussite découvert'+(count()===1?'':'s')+' sur 20. Chaque univers en possède quatre.</p><p>Atteins le terme de l’aventure pour découvrir une fin. D’autres rencontres et d’autres équilibres peuvent ouvrir un autre dénouement.</p><label for="sv-endings-world">Explorer un univers</label><select id="sv-endings-world"><option value="">Tous les univers</option>'+ORDER.map(id=>'<option value="'+id+'"'+(id===selectedWorld?' selected':'')+'>'+esc(WORLDS[id].name)+'</option>').join('')+'</select>'+
        worlds.map(id=>'<section class="sv-ending-world"><h3>'+esc(WORLDS[id].name)+' <span>'+count(id)+'/4</span></h3><div class="sv-ending-grid">'+engine.list(id,data).map((definition,index)=>{
          const item=known(id,definition.id);
          return '<article class="sv-ending-slot" data-ending-id="'+esc(definition.id)+'" data-discovered="'+!!item+'">'+(item?
            '<div class="sv-ending-thumb" aria-hidden="true">'+card(item)+'</div><div><span class="sv-ending-number">FIN '+(index+1)+' · DÉCOUVERTE</span><h4>'+esc(item.title.fr)+'</h4><p lang="es">'+esc(item.title.es)+'</p><button class="sv-ending-read sv-button" data-world="'+id+'" data-id="'+esc(item.id)+'" aria-label="Lire la fin : '+esc(item.title.fr)+'">Relire cette fin</button></div>':
            '<div class="sv-ending-thumb" aria-hidden="true">'+KIT.backHTML({image:artOf(id).backImage})+'</div><div><span class="sv-ending-number">FIN '+(index+1)+'</span><h4>Une autre histoire t’attend</h4><p>À découvrir en allant au bout d’une aventure.</p></div>')+'</article>';
        }).join('')+'</div></section>').join('')+
        '<p class="sv-muted">Les découvertes sont partagées sur ce navigateur. Les anciennes victoires restent dans les records ; elles ne sont pas classées rétroactivement dans cette collection.</p>'+
        (storageFailed?'<p id="sv-ending-storage" role="status">La collection n’a pas pu être sauvegardée. Télécharge ton bilan avant de fermer la page.</p>':'');
      modal('Mes fins découvertes',html);$('#sv-dialog').classList.add('sv-ending-collection-dialog');
      $('#sv-endings-world').onchange=e=>{collection(e.target.value);$('#sv-endings-world').focus();};
      document.querySelectorAll('.sv-ending-read').forEach(button=>{button.onclick=()=>detail(known(button.dataset.world,button.dataset.id));});
    }
    const titleFr=document.createElement('p');titleFr.id='sv-ending-title-fr';titleFr.lang='fr';titleFr.hidden=true;$('#endTitle').after(titleFr);
    const evidence=document.createElement('div');evidence.id='sv-ending-evidence';evidence.hidden=true;$('#endTxtFr').after(evidence);
    const note=document.createElement('p');note.id='sv-ending-note';note.className='sv-muted';note.hidden=true;evidence.after(note);
    const badge=document.createElement('p');badge.id='sv-ending-badge';badge.className='sv-ending-badge';badge.hidden=true;$('#endTitle').before(badge);
    const open=document.createElement('button');open.type='button';open.id='sv-ending-open';open.className='sv-button';open.textContent='Mes fins';open.onclick=()=>collection(U?.id);$('#end .panel').append(open);
    const menu=document.createElement('button');menu.type='button';menu.id='sv-endings-menu';menu.textContent='Mes fins';menu.onclick=()=>collection();$('#lobby .sv-toolbar').append(menu);
    const worldButton=document.createElement('button');worldButton.type='button';worldButton.id='sv-world-endings';worldButton.className='sv-button';worldButton.onclick=()=>collection(fichaId);$('#fRecord').before(worldButton);
    function render(world,state,ending){
      const screen=$('#end');screen.dataset.endingKind=ending?'success':'death';
      titleFr.hidden=evidence.hidden=note.hidden=badge.hidden=!ending;
      if(!ending){delete screen.dataset.endingId;titleFr.textContent='';evidence.replaceChildren();note.textContent='';badge.textContent='';return;}
      screen.dataset.endingId=ending.id;
      $('#endTitle').textContent=ending.title.es;$('#endTitle').lang='es';
      titleFr.textContent=ending.title.fr;
      $('#endTxtEs').textContent=ending.epilogue.es;$('#endTxtEs').lang='es';
      $('#endTxtFr').textContent=ending.epilogue.fr;$('#endTxtFr').lang='fr';
      $('#endCard').innerHTML=card(ending);
      $('#endCard img')?.setAttribute('alt','Carte de fin : '+ending.title.fr);
      evidence.innerHTML=reason(ending);
      badge.textContent=(state.endingIsNew?'✦ Nouvelle fin découverte':'✦ Fin retrouvée')+' · '+count(world.id)+'/4 dans cet univers';
      note.textContent='La réussite du jeu n’est pas une note d’espagnol.'+(storageFailed?' La collection n’a pas pu être sauvegardée ; télécharge ton bilan.':'');
      updateCounters();
    }
    const baseFicha=openFicha;
    openFicha=function(id){baseFicha(id);updateCounters();};
    window.addEventListener('storage',event=>{if(event.key===KEY){read();updateCounters();}});
    updateCounters();
    return {remember,render,collection,count};
  }};
})();
