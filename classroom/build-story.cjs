'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {build}=require('../build.js'),Engine=require('./story-engine.js');
const ids=['cole','quijote','goya','botero','frida'];
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const safe=text=>text.replace(/<\/script/gi,'<\\/script');
function loadConfig(){return {version:1,worlds:Object.fromEntries(ids.map(id=>[id,JSON.parse(read('story/'+id+'.json'))])),endingPatches:JSON.parse(read('story-endings.json')),choiceTextPatches:{botero:{campos_eliseos:{l:{es:'(Aceptas. Treinta y dos esculturas.)',fr:'(Tu acceptes. Trente-deux sculptures.)'}}}}};}
function buildStory(out){
  const config=loadConfig(),worlds=Object.fromEntries(ids.map(id=>[id,JSON.parse(read('../decks/'+id+'.json'))]));
  Engine.validate(config,worlds);
  build({out,transform(source){
    const boot=/try\{\s*window\.claude\?\.hot\?\.ready\?window\.claude\.hot\.ready\(boot\):boot\(window\.claude\?\.hot\?\.data\?\?null\);\s*\}catch\(e\)\{boot\(null\);\}/;
    assert.ok(boot.test(source),'Point de chargement manquant');
    source=source.replace(boot,'loadProgress();loadWorlds();renderLobby();');
    const keys={'sobrevive-preview-progress-v2':'sobrevive-story-progress-v1','sobrevive-v2-learning':'sobrevive-story-learning-v1','sobrevive-v2-reports':'sobrevive-story-reports-v1','sobrevive-v2-endings':'sobrevive-story-endings-v1','sobrevive-v2-tutorial':'sobrevive-story-tutorial-v1'};
    for(const [oldKey,newKey] of Object.entries(keys))source=source.replaceAll(oldKey,newKey);
    const needle='<script>\n/* Aides de classe';assert.ok(source.includes(needle),'Point d’intégration des aides manquant');
    const runtime='<script>window.SV_STORY='+safe(JSON.stringify(config))+';</script>\n'+['story-engine.js','story-runtime.js'].map(name=>'<script>'+safe(read(name))+'</script>').join('\n');
    source=source.replace(needle,()=>runtime+'\n'+needle);
    return source.replace(/<\/html>\s*$/,()=>'<style>'+read('story.css')+'\n'+read('story-motion.css')+'\n'+read('rights.css')+'</style>\n<script>'+safe(read('story-motion.js'))+'</script>\n<script>'+safe(read('story-ui.js'))+'</script>\n<script>window.SV_RIGHTS='+safe(JSON.stringify(JSON.parse(read('rights.json'))))+';</script>\n<script>'+safe(read('rights.js'))+'</script>\n</html>');
  }});
}
if(require.main===module)buildStory(path.resolve(process.argv[2]||path.join(__dirname,'../story-preview.html')));
module.exports={loadConfig,buildStory};
