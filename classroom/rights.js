/* Shared, offline credits. Learner notes are never claimed as the game's content. */
(() => {
  'use strict';
  const rights=window.SV_RIGHTS,esc=KIT.esc;
  if(!rights)return;
  const sourceLink='<a href="'+esc(rights.siteUrl)+'">¡Sobrevive! · site officiel</a>';
  const sections=()=>rights.sections.map(section=>'<h3>'+esc(section.title)+'</h3>'+section.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')).join('');
  function show(){
    window.SVStoryModal('Crédits et conditions d’utilisation',
      '<p class="sv-note"><strong>'+esc(rights.credit)+'</strong></p><p>'+esc(rights.summary)+'</p>'+sections()+
      '<p>Pour demander une autorisation : <a href="'+esc(rights.contactUrl)+'" target="_blank" rel="noopener noreferrer">profil GitHub d’Arthur Méligne</a>. L’accord doit être explicite avant l’usage demandé.</p>'+
      '<details><summary>Licences des polices · SIL OFL 1.1</summary><pre class="sv-font-license">'+esc(document.querySelector('#sv-font-licenses').textContent)+'</pre></details>'+
      '<p class="sv-muted">Conditions du '+esc(rights.version)+' · '+sourceLink+'</p>');
  }
  function button(text){
    const b=document.createElement('button');b.type='button';b.className='sv-credits-link';b.textContent=text;
    b.addEventListener('click',show);return b;
  }
  function signature(){
    const box=document.createElement('div');box.className='sv-authorship';
    const line=document.createElement('p');line.textContent=rights.credit;
    box.append(line,button('Crédits et conditions d’utilisation'));return box;
  }
  document.querySelector('#lobby .rule').after(signature());
  for(const selector of ['#ficha .panel','#end .panel'])document.querySelector(selector).append(signature());
  const inGame=button('Crédits · '+rights.author);inGame.title=rights.credit;
  document.querySelector('#sv-tools').append(inGame);
  window.SVRights={
    htmlReportCredit:()=>'<p class="fine"><strong>¡Sobrevive! — '+esc(rights.credit)+'</strong><br>'+sourceLink+'</p><p class="fine">'+esc(rights.summary)+' Les notes et réponses personnelles restent celles du joueur. Ce bilan peut être imprimé et partagé dans un cadre pédagogique non commercial.</p><p class="fine"><a href="'+esc(rights.siteUrl)+'#credits">Crédits et conditions d’utilisation · '+esc(rights.version)+'</a></p>',
    textReportCredit:()=>['','CRÉDITS DU JEU','¡Sobrevive! — '+rights.credit,rights.siteUrl,rights.summary,'Les notes et réponses personnelles restent celles du joueur. Ce bilan peut être imprimé et partagé dans un cadre pédagogique non commercial.','Crédits et conditions : '+rights.siteUrl+'#credits — version '+rights.version].join('\n')
  };
  if(location.hash==='#credits')show();
  window.addEventListener('hashchange',()=>{if(location.hash==='#credits')show();});
})();
