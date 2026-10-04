// Intègre le mode classe dans le HTML autonome, sans charger de dépendance réseau.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function enhance(source) {
  const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  const safe = text => text.replace(/<\/script/gi, '<\\/script');
  source = source.replace(/<link\b[^>]*fonts\.googleapis\.com[^>]*>\s*/g, '');
  source = source.replace('const PKEY="sobrevive-progress-v1";', 'const PKEY="sobrevive-preview-progress-v2";');
  if (!source.includes('name="viewport"')) source = '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + source;
  source = '<!doctype html>\n<html lang="fr">\n' + source;
  const fonts = read('fonts/fonts.css').replace(/url\(([^)]+)\)/g, (_, name) => {
    if (!/^[a-z-]+\.woff2$/.test(name)) throw new Error('Nom de police locale invalide : ' + name);
    const bytes = fs.readFileSync(path.join(__dirname, 'fonts', name));
    if (bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Police WOFF2 invalide : ' + name);
    return 'url(data:font/woff2;base64,' + bytes.toString('base64') + ')';
  });
  source = source.replace('</style>', () => '</style>\n<style>' + fonts + '\n' + read('learning.css') + '\n' + read('menus.css') + '</style>');
  return source + '\n<script type="text/plain" id="sv-font-licenses">' + safe((read('fonts/fraunces-OFL.txt') + '\n\n' + read('fonts/nunitosans-OFL.txt')).replace(/[ \t]+$/gm, '')) + '</script>\n<script>window.SV_LEARNING=' + safe(read('content.json')) + ';</script>\n' +
    ['report.js', 'learning.js', 'menus.js'].map(name => '<script>\n' + safe(read(name)) + '\n</script>').join('\n') + '\n</html>\n';
};
