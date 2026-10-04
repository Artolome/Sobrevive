# Proposition d’interface et d’accompagnement V2

Base : `ameliorations/mode-classe-v2`, commit `ec55ebe779d80e39c3e047e473930bbd04ef9d64`.
Travail isolé sur `codex/v2-interface-pedagogie`. Aucun changement de workflow, aucune publication.

## Changements proposés

- Accueil agrandi, palette verte et disposition de partie sur deux colonnes sur ordinateur. Les SVG existants sont conservés. Sur téléphone, les textes longs restent accessibles par défilement.
- Retours bilingues explicitement rédigés pour 15 cartes (30 choix), dont les cinq entrées de partie. Les autres cartes annoncent que leur retour narratif reste à rédiger ; aucun récit n’est déduit automatiquement des signes des effets.
- Lexique de 92 entrées attestées dans les situations et réponses. La recherche respecte les limites de mots.
- Paroles et indication d’action distinguées sur la première carte de Señora Pons.
- Option « Lire le retour après chaque choix » : dialogue de lecture qui bloque l’interaction avec la carte suivante, déjà rendue derrière lui.
- Conséquences et traduction reprises dans l’export du bilan. Affichage explicite des limites : 80 dernières décisions conservées/exportées, 30 affichées.
- Annulation d’un glissement interrompu, sortie de partie modale, focus restitué vers une commande visible. Aucune sauvegarde complète d’une partie n’est promise.

## Contenu

Les retours sont dans `content.json`, sous `feedback[worldId][cardId][side]`, avec `{ "es": "…", "fr": "…" }`. Les effets restent exclusivement dans les decks. Le journal mémorise le retour effectivement présenté ainsi que les variations réellement appliquées, y compris leur plafonnement.

Échantillon : cole `intro`, `mama1`, `bus` ; quijote `salida`, `molinos`, `velar` ; goya `salida`, `quitasol`, `familia` ; botero `salida`, `toro_modelo`, `academia` ; frida `salida`, `diego_cuadros`, `diego_cejas`.

## Vérification reproductible

Le jeu n’a aucune nouvelle dépendance de fonctionnement. Depuis la racine :

```sh
node build.js
node check.js
node --check classroom/learning.js
node classroom/check-content.js --base ec55ebe
git diff --check
```

Le contrôle de contenu valide la structure, les références aux cartes et la présence des expressions du lexique. Avec `--base`, il compare les règles, effets, paliers et paramètres de tirage avec la V2. Il ne certifie pas la qualité pédagogique des textes.

Le test navigateur facultatif `classroom/check-browser.cjs` utilise Playwright et Microsoft Edge. `SV_PLAYWRIGHT` peut désigner un paquet Playwright installé en dehors du dépôt ; `SV_BROWSER_CHANNEL` permet de sélectionner un autre canal disponible. Ces outils servent uniquement aux tests.

## Limites et suite à valider

La relecture des 225 cartes reste partielle. Certaines associations héritées entre choix et jauges méritent une discussion pédagogique ; l’équilibrage n’a pas été modifié. Les retours ajoutés décrivent la fiction, sans apporter de nouveaux faits historiques.

Les propositions d’illustrations sont livrées séparément pour avis. Elles n’ont remplacé aucun SVG ; une adoption d’images matricielles demanderait une adaptation distincte du constructeur pour conserver l’usage hors ligne et maîtriser la taille du fichier.

Tests de cette itération effectués sous Node 24 et Edge sur Windows. Node 22, Safari, Firefox, lecteur d’écran et appareil tactile physique restent à vérifier. Le contrôle de fenêtre réduite ne remplace pas un essai du zoom natif à 200 %.

Collections, notes et journal sont partagés sur le navigateur, sans compte élève. La partie en cours ne reprend pas après fermeture. Aucune fusion ou mise en ligne avant accord explicite.
