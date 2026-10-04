# Proposition d’interface et d’accompagnement V2

Base : `ameliorations/mode-classe-v2`, commit `ec55ebe779d80e39c3e047e473930bbd04ef9d64`.
Travail isolé sur `codex/v2-interface-pedagogie`. Aucun changement de workflow, aucune publication.

## Changements proposés

- Accueil agrandi, palette verte et disposition de partie sur deux colonnes sur ordinateur. Les SVG existants sont conservés en source. Sur téléphone, les textes longs restent accessibles par défilement.
- Collection cartoon étendue, après accord, aux 76 personnages utilisés par les 225 situations, aux cinq couvertures et à un dos commun : 82 illustrations originales. Les noms et les cadres restent en HTML.
- Arrivée, inclinaison au glissement et sortie des cartes conservées. Un léger mouvement de l’illustration accompagne l’attente ; il s’arrête pendant un glissement ou l’ouverture d’une aide. Il est désactivé si le système demande de réduire les animations.
- Retours bilingues explicitement rédigés pour les 225 cartes et leurs 450 choix. Chaque commentaire relie l’action aux conséquences de la scène et aux jauges concernées. Aucun récit n’est fabriqué automatiquement à partir des signes des effets.
- Après le choix, le commentaire français s’affiche directement avec la réponse précédente et les variations réellement appliquées. « Comprendre » affiche les deux langues. Ce retour reste consultable sur l’écran de fin de partie.
- Lexique de 92 entrées attestées dans les situations et réponses. La recherche respecte les limites de mots.
- Paroles et indication d’action distinguées sur la première carte de Señora Pons.
- Option « Lire le retour après chaque choix » : dialogue de lecture qui bloque l’interaction avec la carte suivante, déjà rendue derrière lui.
- Conséquences et traduction reprises dans l’export du bilan. Affichage explicite des limites : 80 dernières décisions conservées/exportées, 30 affichées.
- Annulation d’un glissement interrompu, sortie de partie modale, focus restitué vers une commande visible. Aucune sauvegarde complète d’une partie n’est promise.

## Contenu

Les retours sont dans `content.json`, sous `feedback[worldId][cardId][side]`, avec `{ "es": "…", "fr": "…" }`, au maximum 200 caractères par langue. Les effets restent exclusivement dans les decks. Le journal mémorise l’univers, la carte, le côté choisi, le retour effectivement présenté et les variations réellement appliquées, y compris leur plafonnement.

Couverture : El cole 65 cartes / 130 choix ; Don Quijote 40 / 80 ; Goya 40 / 80 ; Botero 39 / 78 ; Frida 41 / 82.

Les anciens journaux sans commentaire sont complétés lorsqu’un univers, une situation et une réponse correspondent exactement à une unique décision du contenu actuel. Les commentaires déjà enregistrés, les notes et les valeurs des jauges sont conservés. Une décision ancienne non identifiable conserve ses variations sans recevoir de récit supposé.

## Vérification reproductible

Le jeu n’a aucune nouvelle dépendance de fonctionnement. Depuis la racine :

```sh
node build.js
node check.js
node --check classroom/learning.js
node classroom/check-content.js --base ec55ebe
node classroom/check-raster.cjs
node classroom/check-illustrations.cjs
git diff --check
```

Le contrôle de contenu valide la structure, les références aux cartes et la présence des expressions du lexique. Avec `--base`, il compare les règles, effets, paliers et paramètres de tirage avec la V2. Il ne certifie pas la qualité pédagogique des textes.

Le test navigateur facultatif `classroom/check-browser.cjs` utilise Playwright et Microsoft Edge. `SV_PLAYWRIGHT` peut désigner un paquet Playwright installé en dehors du dépôt ; `SV_BROWSER_CHANNEL` permet de sélectionner un autre canal disponible. Ces outils servent uniquement aux tests.

`node classroom/check-motion.cjs` vérifie aussi le mouvement au repos, sa suspension dans les aides, un véritable glissement avec sortie/arrivée de carte et le réglage de réduction des animations. Il utilise les mêmes variables de configuration que le test navigateur. Un chemin JSON facultatif en argument permet de conserver son rapport.

`node classroom/check-feedback.cjs [rapport.json] [dossier-captures]` vérifie les 450 choix avec des états moteur de test : commentaire affiché, journal, variations réelles et identifiants. Il contrôle aussi la restauration d’anciens commentaires absents, un vrai clic avec consultation bilingue et téléchargement du bilan, le dernier choix d’une défaite, le plafonnement des valeurs et 15 mises en page longues sur ordinateur, téléphone et écran en paysage. Ces contrôles utilisent aussi Playwright et Edge ; les assertions de structure ne remplacent pas une relecture du sens.

## Limites et suite à valider

Tous les retours ont été rédigés et relus avec leurs choix et leurs effets. Certaines associations héritées entre choix et jauges restent des conventions du jeu : les commentaires les présentent comme telles, sans modifier l’équilibrage ni leur inventer une causalité réelle. Les retours décrivent la fiction ; ils ne constituent pas une validation historique des événements ou une certification de niveau linguistique. Le lexique de 92 entrées n’est pas exhaustif.

La collection illustrée complète est intégrée au prototype local sur la branche de travail, conformément à l’accord d’extension. Les 225 situations réutilisent l’illustration de leur personnage : il y a 76 portraits ou lieux/objets-personnages, et non 225 images de scène distinctes. Aucun site n’est publié. Les textes, les noms, les cadres et les icônes des jauges restent générés en HTML/SVG.

### Illustrations matricielles facultatives

Le constructeur accepte `art/raster/manifest.json`, par exemple :

```json
{
  "cole": {
    "cover": "cole-cover-cartoon.webp",
    "back": "shared-back-cartoon.webp",
    "chars": { "pons": "cole-pons-cartoon.webp" }
  }
}
```

Les fichiers doivent être dans `art/raster/`, avec un nom simple en minuscules (lettres, chiffres, tirets et underscores). Les formats PNG, JPEG et WebP sont reconnus par leur signature et leur extension ; chaque fichier est limité à 4 Mio. Le constructeur refuse les chemins externes, les traversées de répertoire, les liens symboliques, les mondes/personnages inconnus, les fichiers absents et les manifests invalides. Un échec arrête la construction avant l’écriture d’`index.html`. Le contrôle de signature ne remplace pas la vérification du décodage et du rendu dans un navigateur.

Les images sont embarquées en base64 dans les données `coverImage`, `charImages` et `backImage`. Le jeu reste autonome et utilisable hors ligne, au prix d’un HTML plus lourd (le base64 ajoute environ un tiers au poids des fichiers). Les WebP sont encodés à qualité 90, sans redimensionnement ni recadrage, depuis les originaux PNG conservés dans les livrables locaux. Sans manifest ou sans image pour une carte, le gabarit conserve le SVG existant. Les personnages non découverts gardent leur silhouette SVG masquée dans la collection ; leur nouvelle image n’est pas affichée. `check-raster.cjs` vérifie les contrôles d’entrée et ces replis avec des fixtures temporaires, sans toucher aux illustrations du jeu. `check-illustrations.cjs` contrôle l’exhaustivité des 82 visuels et la couverture des 225 situations.

Tests de cette itération effectués sous Node 24 et Edge sur Windows. Node 22, Safari, Firefox, lecteur d’écran et appareil tactile physique restent à vérifier. Le contrôle de fenêtre réduite ne remplace pas un essai du zoom natif à 200 %.

Collections, notes et journal sont partagés sur le navigateur, sans compte élève. La partie en cours ne reprend pas après fermeture. Aucune fusion ou mise en ligne avant accord explicite.
