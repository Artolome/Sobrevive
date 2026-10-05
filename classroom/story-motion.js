/* Visual response only: choices are still applied immediately by the existing loop. */
(() => {
  'use strict';
  const app=document.querySelector('#app'),card=document.querySelector('#cardWrap');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard=false,dealTimer,pickTimer;
  const allowed=()=>!app.hidden&&!busy&&cur&&!document.querySelector('dialog[open]')&&document.querySelector('#quitBox').hidden;
  const originalDots=showDots;
  showDots=function(side){
    originalDots(side);
    if(side)app.dataset.svPreview=side;else delete app.dataset.svPreview;
  };
  function clearPreview(){showDots(null);}
  function clearPick(){
    delete app.dataset.svPicking;
    app.querySelectorAll('.sv-picked,.sv-gauge-picked').forEach(el=>el.classList.remove('sv-picked','sv-gauge-picked'));
  }
  function reset(){clearPreview();clearTimeout(pickTimer);clearPick();}
  document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboard=true;},true);
  document.addEventListener('pointerdown',()=>{keyboard=false;},true);
  for(const [id,side] of [['btnL','l'],['btnR','r']]){
    const button=document.getElementById(id);
    button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&allowed()&&!card.classList.contains('drag'))showDots(side);});
    button.addEventListener('pointerleave',()=>{if(!card.classList.contains('drag'))clearPreview();});
    button.addEventListener('pointerdown',()=>{if(allowed())showDots(side);});
    button.addEventListener('pointercancel',clearPreview);
    button.addEventListener('focus',()=>{if(keyboard&&allowed())showDots(side);});
    button.addEventListener('blur',()=>{if(!card.classList.contains('drag'))clearPreview();});
  }
  card.addEventListener('pointerdown',clearPreview);
  card.addEventListener('pointercancel',clearPreview);
  card.addEventListener('lostpointercapture',()=>{if(!card.classList.contains('drag'))clearPreview();});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  new MutationObserver(()=>{if(document.querySelector('dialog[open]'))reset();}).observe(document.querySelector('#sv-dialog'),{attributes:true,attributeFilter:['open']});
  new MutationObserver(()=>{if(app.hidden)reset();}).observe(app,{attributes:true,attributeFilter:['hidden']});
  reduced.addEventListener('change',reset);
  const originalRender=renderCard;
  renderCard=function(){clearPreview();originalRender();};
  // A single timer prevents an earlier deal from cutting short a later arrival.
  deal=function(){
    clearTimeout(dealTimer);
    card.classList.remove('outL','outR','deal');
    if(reduced.matches)return;
    void card.offsetWidth;
    card.classList.add('deal');
    dealTimer=setTimeout(()=>card.classList.remove('deal'),340);
  };
  const originalChoice=applyChoice;
  applyChoice=function(side){
    if(!allowed()||!['l','r'].includes(side))return;
    clearTimeout(dealTimer);card.classList.remove('deal');
    clearTimeout(pickTimer);clearPick();clearPreview();
    app.dataset.svPicking=side;
    document.getElementById(side==='l'?'btnL':'btnR').classList.add('sv-picked');
    for(const key of Object.keys(cur[side].fx))app.querySelector('.gauge[data-g="'+key+'"]')?.classList.add('sv-gauge-picked');
    originalChoice(side);
    pickTimer=setTimeout(clearPick,620);
  };
})();
