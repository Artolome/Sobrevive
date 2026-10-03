// Intègre le mode classe dans le HTML autonome, sans charger de dépendance réseau.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function enhance(source) {
  const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  const safe = text => text.replace(/<\/script/gi, '<\\/script');
  source = source.replace(/<link\b[^>]*fonts\.googleapis\.com[^>]*>\s*/g, '');
  if (!source.includes('name="viewport"')) source = '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + source;
  source = '<!doctype html>\n<html lang="fr">\n' + source;
  source = source.replace('</style>', () => '</style>\n<style>' + read('learning.css') + '</style>');
  return source + '\n<script>window.SV_LEARNING=' + safe(read('content.json')) + ';</script>\n<script>\n' + safe(read('learning.js')) + '\n</script>\n</html>\n';
};
