/* Rapports locaux de parcours : aucun appel réseau, aucune reprise de partie. */
(() => {
  'use strict';
  const LIMITS={sessions:20,choicesPerSession:300,totalChoices:1500};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const date=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Non connu';
  const statusLabel={active:'En cours',won:'Aventure réussie',lost:'Fin de l’aventure',quit:'Partie quittée',interrupted:'Partie interrompue'};
  const gaugeSnapshot=(world,state)=>world.gauges.map(g=>({key:g.key,label:g.label,value:state.g[g.key]}));
  const signed=value=>(value>0?'+':'')+value;
  const effectText=item=>(item.effects||[]).map(e=>e.label+' : '+e.before+' → '+e.after+' ('+signed(e.delta)+')').join(' · ')||'Aucune jauge modifiée.';
  function download(content,type,name){
    const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type}));
    const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function create({saved,legacyEntries=[],legacyNotes='',persist}){
    let data=saved?.version===1?copy(saved):{version:1,sessions:[],legacy:{entries:copy(legacyEntries),notes:legacyNotes},removedSessions:0};
    data.sessions=Array.isArray(data.sessions)?data.sessions.filter(s=>s&&typeof s.id==='string'&&Array.isArray(s.choices)):[];
    data.legacy=data.legacy&&Array.isArray(data.legacy.entries)?data.legacy:{entries:copy(legacyEntries),notes:legacyNotes};
    data.legacy.notes=typeof data.legacy.notes==='string'?data.legacy.notes:legacyNotes;
    data.legacy.entries=data.legacy.entries.slice(-80);
    data.removedSessions=Number.isInteger(data.removedSessions)?data.removedSessions:0;
    let activeId=null,currentId=null,selectedId=null,storageFailed=false;
    // Une fermeture ne donne pas son heure exacte : conserver le dernier instant connu.
    for(const session of data.sessions){
      if(session.status==='active'){
        session.status='interrupted';session.endedAt=null;session.interruptionDetectedAt=now();
        session.endReason='La page a été fermée ou rechargée. Cette partie ne peut pas être reprise.';
      }
    }
    function trim(){
      for(const session of data.sessions){
        if(session.choices.length>LIMITS.choicesPerSession){
          const removed=session.choices.length-LIMITS.choicesPerSession;
          session.choices=session.choices.slice(-LIMITS.choicesPerSession);session.omittedChoices=(session.omittedChoices||0)+removed;
        }
      }
      while(data.sessions.length>LIMITS.sessions||data.sessions.reduce((n,s)=>n+s.choices.length,0)>LIMITS.totalChoices){
        data.sessions.shift();data.removedSessions++;
      }
    }
    function save(){trim();storageFailed=persist(data)===false;return !storageFailed;}
    const active=()=>data.sessions.find(s=>s.id===activeId&&s.status==='active');
    function finish(status,world,state,ending=null,reason=''){
      const session=active();if(!session||session.worldId!==world.id)return;
      session.status=status;session.endedAt=now();session.lastActivityAt=session.endedAt;
      session.finalGauges=gaugeSnapshot(world,state);session.totalChoices=state.plays;session.ending=ending?copy(ending):null;session.endReason=reason;
      activeId=null;save();
    }
    function start(world,state,{partial=false}={}){
      const previous=active();
      if(previous){previous.status='interrupted';previous.endedAt=now();previous.endReason='Une nouvelle partie a été commencée.';}
      const time=now(),id=globalThis.crypto?.randomUUID?.()||'partie-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      const session={id,worldId:world.id,world:world.name,startedAt:partial?null:time,recordingStartedAt:time,endedAt:null,lastActivityAt:time,status:'active',partialStart:partial,initialGauges:partial?null:gaugeSnapshot(world,state),finalGauges:gaugeSnapshot(world,state),choices:[],totalChoices:state.plays,omittedChoices:partial?state.plays:0,notes:'',ending:null};
      data.sessions.push(session);activeId=id;currentId=id;selectedId=id;save();return id;
    }
    function record(world,state,item){
      const session=active();if(!session||session.worldId!==world.id)return;
      session.choices.push(copy(item));session.totalChoices=state.plays;session.finalGauges=gaugeSnapshot(world,state);session.lastActivityAt=item.recordedAt||now();save();
    }
    function model(){
      const session=data.sessions.find(s=>s.id===selectedId);
      if(session)return {legacy:false,...session};
      return {legacy:true,id:'legacy',world:data.legacy.entries.length?'Anciennes décisions':data.legacy.notes?'Notes sans partie':'Aucune partie enregistrée',choices:data.legacy.entries,notes:data.legacy.notes,status:'legacy'};
    }
    function gaugeTable(session){
      if(session.legacy)return '';
      const initial=new Map((session.initialGauges||[]).map(g=>[g.key,g.value]));
      const title=session.status==='active'?'Maintenant':session.status==='interrupted'&&!session.endedAt?'Dernier état connu':'À la fin';
      return '<div class="sv-report-gauges"><table><caption>Évolution des quatre jauges</caption><thead><tr><th scope="col">Jauge</th><th scope="col">Au départ</th><th scope="col">'+title+'</th></tr></thead><tbody>'+session.finalGauges.map(g=>'<tr><th scope="row">'+esc(g.label)+'</th><td>'+esc(initial.has(g.key)?initial.get(g.key):'Non connu')+'</td><td>'+esc(g.value)+'</td></tr>').join('')+'</tbody></table></div>';
    }
    function summary(session){
      if(session.legacy)return session.choices.length?'<div class="sv-report-summary"><p>Ces décisions viennent de l’ancien journal. Leur date, leur début et leur fin de partie ne sont pas connus ; elles restent regroupées sans reconstituer de parties.</p><p>'+session.choices.length+' décision'+(session.choices.length===1?'':'s')+' conservée'+(session.choices.length===1?'':'s')+'.</p></div>':'<div class="sv-report-summary"><p>Commence une aventure : tes choix et leurs conséquences formeront ici ton compte rendu. Tu peux déjà garder une note de préparation.</p></div>';
      const end=session.status==='active'?'Partie en cours.':session.status==='interrupted'&&!session.endedAt?'Fin exacte non connue · dernier passage enregistré : '+date(session.lastActivityAt)+'.':'Fin : '+date(session.endedAt)+'.';
      return '<div class="sv-report-summary"><p class="sv-report-status">'+esc(statusLabel[session.status]||session.status)+' · '+esc(session.totalChoices)+' choix</p><p>Début : '+esc(date(session.startedAt))+'. '+esc(end)+'</p>'+
        (session.endReason?'<p>'+esc(session.endReason)+'</p>':'')+
        (session.partialStart?'<p>Le relevé a commencé en cours de partie. Les jauges initiales et les décisions précédentes ne sont pas connues.</p>':'')+
        (session.omittedChoices?'<p class="sv-report-limit">'+esc(session.omittedChoices)+' décision(s) antérieure(s) ne figurent pas dans ce relevé. Les dernières décisions sont présentées dans leur ordre réel.</p>':'')+
        (session.ending?'<div class="sv-report-ending">'+
          (session.ending.title?'<h3 lang="fr">'+esc(session.ending.title.fr)+'</h3><p lang="es"><strong>'+esc(session.ending.title.es)+'</strong></p>':'')+
          '<p lang="es">'+esc(session.ending.es)+'</p><p lang="fr">'+esc(session.ending.fr)+'</p>'+
          (session.ending.evidence?'<p><strong>Pourquoi cette fin ?</strong></p><p lang="es">'+esc(session.ending.evidence.es)+'</p><p lang="fr">'+esc(session.ending.evidence.fr)+'</p>':'')+'</div>':'')+'</div>'+gaugeTable(session);
    }
    function stepBody(item){
      return (item.journey?'<div class="sv-note"><p><strong>'+esc(item.journey.period.fr)+' · '+esc(item.journey.stageTitle.fr)+'</strong></p><p lang="es">'+esc(item.journey.context.es)+'</p><p lang="fr">'+esc(item.journey.context.fr)+'</p></div>':'')+
        (item.character||item.place?'<p class="sv-muted">'+(item.character?'Rencontre : '+esc(item.character):'')+(item.character&&item.place?' · ':'')+(item.place?'Lieu : '+esc(item.place):'')+'</p>':'')+'<p lang="es"><strong>'+esc(item.text)+'</strong></p>'+(item.textFr?'<p lang="fr">'+esc(item.textFr)+'</p>':'')+
        '<p lang="es">Mi elección : '+esc(item.choice)+'</p><p lang="fr">Mon choix : '+esc(item.translation)+'</p>'+
        (item.narrative?'<div class="sv-note"><p lang="es">'+esc(item.narrative.es)+'</p><p lang="fr">'+esc(item.narrative.fr)+'</p></div>':'<p>Commentaire non conservé dans cette ancienne décision.</p>')+
        '<p class="sv-report-effects">'+esc(effectText(item))+'</p>';
    }
    function stepTitle(item,index,session){return (item.turn||(session.omittedChoices||0)+index+1)+'. '+(item.gameTime?item.gameTime+' · ':'')+(session.legacy?item.world+' · ':'')+item.choice;}
    function htmlReport(session){
      const title='Mon cheminement · '+session.world;
      const css=':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#ede8dc;color:#24372f;font:16px/1.65 system-ui,sans-serif}main{max-width:900px;margin:36px auto;background:#fffdf7;padding:48px;border-top:7px solid #b0823e;box-shadow:0 8px 40px #24372f12}header{border-bottom:1px solid #d8c8aa;padding-bottom:24px;margin-bottom:28px}h1,h2,h3{font-family:Georgia,serif;line-height:1.25}h1{font-size:38px;margin:10px 0}h2{font-size:25px;margin-top:32px}.eyebrow{letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#75572e}.intro{max-width:65ch}.sv-report-status{font-weight:700}.sv-report-summary{background:#f3efe3;padding:16px 20px;border-radius:8px}table{width:100%;border-collapse:collapse;margin:22px 0}caption{text-align:left;font-weight:700;padding:8px 0}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #ddd3bf}thead{background:#e8edde}.step{border-top:1px solid #ddcfb6;padding:18px 0;break-inside:avoid}.step h3{font-size:19px;color:#685023}.step p{margin:8px 0}.sv-note{border-left:3px solid #b0823e;padding:4px 16px;background:#f6f2e8}.sv-report-effects{font-size:14px;color:#446253}.notes{white-space:pre-wrap;background:#f4f0e6;padding:18px;border-radius:8px}.fine{font-size:13px;color:#5d675f}button{background:#244c3b;color:#fff;padding:11px 18px;border:0;border-radius:6px;font:inherit;cursor:pointer}.print-help{font-size:13px}.sv-report-limit{font-weight:700}footer{border-top:1px solid #d8c8aa;margin-top:30px;padding-top:18px}@page{size:A4;margin:16mm}@media(max-width:650px){main{margin:0;padding:24px}h1{font-size:28px}th,td{padding:7px}}@media print{body{background:#fff;font-size:10.5pt;color:#111}main{max-width:none;margin:0;padding:0;border:0;box-shadow:none}h1{font-size:25pt}.print-tools{display:none}header{padding-bottom:10px;margin-bottom:15px}.sv-note,.sv-report-summary,.notes{background:#f6f4ed;print-color-adjust:exact}h2,h3{break-after:avoid}a{color:inherit}footer{font-size:9pt}}';
      return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+css+'</style></head><body><main><header><p class="eyebrow">¡Sobrevive! · Carnet de parcours</p><h1>'+esc(session.world)+'</h1><p class="intro">Mes décisions, leurs conséquences dans la fiction et ce que je retiens de mon aventure.</p><div class="print-tools"><button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button><p class="print-help">Pour un PDF, choisir « Enregistrer au format PDF » dans la fenêtre d’impression du navigateur.</p></div></header>'+summary(session)+'<h2>Ma réflexion</h2><div class="notes">'+esc(session.notes||'Aucune note personnelle ajoutée.')+'</div><h2>Mon cheminement, dans l’ordre</h2>'+
        (session.choices.length?session.choices.map((item,i)=>'<article class="step"><h3>'+esc(stepTitle(item,i,session))+'</h3>'+stepBody(item)+'</article>').join(''):'<p>Aucun choix enregistré pour cette partie.</p>')+
        '<footer>'+(window.SVRights?.htmlReportCredit()||'')+'<p class="fine">Rapport exporté le '+esc(date(now()))+'. Les jauges décrivent une fiction ; elles ne mesurent pas le niveau d’espagnol. Ce fichier autonome contient les notes et décisions de la partie sélectionnée. Aucune donnée n’est envoyée automatiquement.</p></footer></main></body></html>';
    }
    function textReport(session){
      const lines=['¡Sobrevive! — Mon cheminement',session.world,'Les jauges décrivent une fiction, pas un niveau d’espagnol.',''];
      if(session.legacy)lines.push(session.choices.length?'Ancien journal : dates et limites des parties non connues.':'Aucune décision enregistrée. Notes de préparation sans partie associée.');
      else{
        lines.push(statusLabel[session.status], 'Début : '+date(session.startedAt),'Fin : '+(session.status==='active'?'En cours':date(session.endedAt)), 'Dernier passage enregistré : '+date(session.lastActivityAt),'Choix effectués : '+session.totalChoices);
        if(session.endReason)lines.push(session.endReason);
        const initial=new Map((session.initialGauges||[]).map(g=>[g.key,g.value]));
        for(const g of session.finalGauges)lines.push(g.label+' : '+(initial.has(g.key)?initial.get(g.key):'Non connu')+' → '+g.value);
        if(session.ending){
          if(session.ending.title)lines.push('DÉNOUEMENT',session.ending.title.es,session.ending.title.fr);
          lines.push(session.ending.es,session.ending.fr);
          if(session.ending.evidence)lines.push('Pourquoi cette fin ?',session.ending.evidence.es,session.ending.evidence.fr);
        }
        if(session.omittedChoices)lines.push(session.omittedChoices+' décision(s) antérieure(s) non conservée(s) dans ce relevé.');
      }
      lines.push('','MA RÉFLEXION',session.notes||'Aucune note personnelle ajoutée.','','DÉCISIONS — ordre chronologique');
      session.choices.forEach((item,i)=>lines.push('',stepTitle(item,i,session),...(item.journey?['Étape : '+item.journey.period.fr+' · '+item.journey.stageTitle.fr,item.journey.context.es,item.journey.context.fr]:[]),[item.character?'Rencontre : '+item.character:'',item.place?'Lieu : '+item.place:''].filter(Boolean).join(' · '),item.text,item.textFr||'','Mon choix : '+item.choice,'Traduction : '+item.translation,...(item.narrative?['Dans la fiction : '+item.narrative.es,item.narrative.fr]:[]),effectText(item)));
      return lines.join('\n')+(window.SVRights?.textReportCredit()||'');
    }
    function show(modal){
      if(selectedId!=='legacy'&&!data.sessions.some(s=>s.id===selectedId))selectedId=data.sessions.at(-1)?.id||'legacy';
      const session=model(),hasLegacy=data.legacy.entries.length||data.legacy.notes;
      const options=[...data.sessions].reverse().map(s=>'<option value="'+esc(s.id)+'"'+(s.id===selectedId?' selected':'')+'>'+esc('Partie '+(data.removedSessions+data.sessions.indexOf(s)+1)+' · '+s.world+' · '+date(s.startedAt||s.recordingStartedAt)+' · '+s.totalChoices+' choix · '+(statusLabel[s.status]||s.status))+'</option>').join('')+
        (hasLegacy||!data.sessions.length?'<option value="legacy"'+(selectedId==='legacy'?' selected':'')+'>'+(data.legacy.entries.length?'Anciennes décisions · dates non connues':data.legacy.notes?'Notes sans partie':'Aucune partie enregistrée')+'</option>':'');
      const downloads='<div class="sv-actions"><button class="sv-button" id="sv-export-html">Télécharger mon compte rendu (.html)</button><button class="sv-button" id="sv-export">Exporter mon bilan (.txt)</button></div><p class="sv-muted">Le compte rendu HTML s’ouvre hors ligne et propose « Imprimer / Enregistrer en PDF ».</p>';
      modal('Mon bilan de partie','<p class="sv-note">Retrouve ton cheminement, garde une trace de tes choix et explique ce que tu as découvert.</p><label for="sv-report-session">Choisir une partie</label><select id="sv-report-session">'+options+'</select>'+downloads+'<h3>'+esc(session.world)+'</h3>'+summary(session)+
        '<p lang="es"><strong>Elijo esta respuesta porque…</strong><br>He descubierto la palabra…</p><label for="sv-notes">Ma réflexion : une décision, un mot, une justification</label><textarea id="sv-notes" maxlength="10000" placeholder="Elijo… porque…">'+esc(session.notes||'')+'</textarea>'+
        '<p id="sv-report-storage" class="sv-muted" role="status">'+(storageFailed?'Le navigateur n’a pas pu sauvegarder ce rapport. Télécharge-le avant de fermer la page.':'Rapport conservé sur ce navigateur. Aucun envoi automatique.')+'</p>'+
        '<h3>Mon cheminement · '+session.choices.length+' décisions conservées</h3>'+
        (session.choices.length?session.choices.map((item,i)=>'<details><summary>'+esc(stepTitle(item,i,session))+'</summary>'+stepBody(item)+'</details>').join(''):'<p>Ton cheminement apparaîtra après ton premier choix.</p>')+
        '<p class="sv-muted">Conservation locale : '+LIMITS.sessions+' dernières parties, '+LIMITS.totalChoices+' décisions au total et '+LIMITS.choicesPerSession+' au maximum par partie. Les anciennes décisions restent dans un journal séparé. Notes et rapports sont partagés sur ce navigateur.</p>'+
        (data.removedSessions?'<p class="sv-muted">'+data.removedSessions+' ancienne(s) partie(s) ont quitté le relevé pour respecter cette limite.</p>':''));
      document.querySelector('#sv-report-session').onchange=e=>{selectedId=e.target.value;show(modal);document.querySelector('#sv-report-session').focus();};
      document.querySelector('#sv-notes').oninput=e=>{
        if(selectedId==='legacy')data.legacy.notes=e.target.value;else{const selected=data.sessions.find(s=>s.id===selectedId);if(selected)selected.notes=e.target.value;}
        save();document.querySelector('#sv-report-storage').textContent=storageFailed?'Le navigateur n’a pas pu sauvegarder ce rapport. Télécharge-le avant de fermer la page.':'Notes enregistrées sur ce navigateur.';
      };
      document.querySelector('#sv-export').onclick=()=>download(textReport(model()),'text/plain;charset=utf-8','sobrevive-mon-bilan.txt');
      document.querySelector('#sv-export-html').onclick=()=>{const selected=model();download(htmlReport(selected),'text/html;charset=utf-8','sobrevive-cheminement-'+(selected.legacy?'ancien-journal':selected.worldId)+'-'+(selected.startedAt||selected.recordingStartedAt||now()).slice(0,10)+'.html');};
    }
    trim();
    return {start,record,finish,show,snapshot:()=>data,save,hasActive:()=>!!active(),lastChoice:worldId=>{const session=data.sessions.find(s=>s.id===currentId&&s.worldId===worldId);return session?.choices.at(-1)||null;},limits:{...LIMITS}};
  }
  window.SVReport={create};
})();
