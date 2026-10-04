/* Présentation des menus : le moteur, la pioche et les collections restent inchangés. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const panel = $('#lobby .panel');
  const top = document.createElement('div');
  top.className = 'sv-menu-top';
  top.innerHTML = '<span class="sv-edition"><span aria-hidden="true">✦</span> LE CARNET DES POSSIBLES</span>';
  top.append($('#lobby .sv-toolbar'));
  panel.prepend(top);
  $('#lobby .sv-preview').textContent = 'Un jeu de choix, en español';
  $('#lobby .sv-preview').before($('#lobby .brand'));
  $('#lobby .rule').textContent = 'De petits choix. De grandes histoires.';
  const heading = document.createElement('div');
  heading.className = 'sv-world-heading';
  heading.innerHTML = '<h2>Où commence ton aventure ?</h2><span>5 univers à explorer</span>';
  $('#worlds').before(heading);
  const instructions = $('#lobby .parch');
  instructions.className = 'sv-howto';
  instructions.setAttribute('aria-label', 'Le jeu en trois étapes');
  instructions.innerHTML = '<div><span class="sv-step">01</span><p><strong>Lis la carte.</strong>Une situation en espagnol. Un coup de pouce en français si besoin.</p></div>' +
    '<div><span class="sv-step">02</span><p><strong>À toi de choisir.</strong>Deux réponses. Clique, glisse la carte ou utilise les flèches du clavier.</p></div>' +
    '<div><span class="sv-step">03</span><p><strong>Découvre la suite.</strong>Observe les conséquences et garde tes quatre jauges entre 1 et 99.</p></div>';
  $('#worlds').after(instructions);
  $('#lobby .foot').textContent = '225 cartes · un bilan à télécharger · sans compte élève. Collections et bilans partagés sur ce navigateur ; la partie en cours ne reprend pas après fermeture.';

  function dressWorlds() {
    for (const button of document.querySelectorAll('#worlds .world')) {
      const id = button.dataset.u, world = WORLDS[id], progress = prog(id);
      button.setAttribute('aria-label', 'Explorer ' + world.name + ' · ' + progress.seen.length + ' cartes découvertes sur ' + world.cards.length);
      button.querySelector('.tarot').setAttribute('lang', 'es');
      const status = button.querySelector('.wprog');
      status.textContent = progress.seen.length + '/' + world.cards.length + ' cartes découvertes';
      status.title = progress.chars.length + '/' + Object.keys(world.chars).length + ' personnages' + (progress.wins ? ' · ' + progress.wins + ' victoire(s)' : '');
      const meter = document.createElement('span');
      meter.className = 'sv-discovery-meter';
      meter.setAttribute('aria-hidden', 'true');
      meter.innerHTML = '<i></i>';
      meter.firstChild.style.width = Math.min(100, progress.seen.length / world.cards.length * 100) + '%';
      status.after(meter);
      const enter = document.createElement('span');
      enter.className = 'sv-world-enter';
      enter.innerHTML = 'Explorer <span aria-hidden="true">↗</span>';
      button.append(enter);
    }
  }
  const baseLobby = renderLobby;
  renderLobby = function() { baseLobby(); dressWorlds(); };
  dressWorlds();

  const actions = $('#ficha .row');
  const overline = document.createElement('p');
  overline.className = 'sv-overline';
  overline.textContent = 'UNE NOUVELLE HISTOIRE T’ATTEND';
  $('#fName').before(overline);
  $('#fName').setAttribute('lang', 'es');
  $('#fTag').setAttribute('lang', 'es');
  $('#ficha .fhead').after(actions);
  $('#backBtn').textContent = '← Les univers';
  $('#startBtn').textContent = 'Jouer · ¡Vamos!';
  const gaugesTitle = document.createElement('h3');
  gaugesTitle.className = 'sv-menu-section';
  gaugesTitle.textContent = 'Quatre équilibres à préserver';
  $('#fLegend').before(gaugesTitle);
  const collection = document.createElement('details');
  collection.className = 'sv-collection';
  const summary = document.createElement('summary');
  summary.append('Les personnages à rencontrer ', $('#fCharCount'));
  collection.append(summary, $('#fChars'));
  $('#ficha .sec').replaceWith(collection);
  collection.before($('#fUnlock'));
  const baseFicha = openFicha;
  openFicha = function(id) {
    baseFicha(id);
    if (!WORLDS[id]) return;
    collection.open = false;
    $('#startBtn').focus({preventScroll:true});
  };
  for (const id of ['backBtn', 'worldsBtn']) {
    $('#' + id).addEventListener('click', () => {
      if (!$('#lobby').hidden) $('#worlds .world[data-u="' + fichaId + '"]')?.focus({preventScroll:true});
    });
  }
  $('#worldsBtn').textContent = 'Changer d’univers';
  $('#againBtn').textContent = 'Rejouer · Otra vez';
  const endKicker = document.createElement('p');
  endKicker.className = 'sv-overline';
  endKicker.textContent = 'UNE PAGE SE TOURNE';
  $('#endTitle').before(endKicker);
})();
