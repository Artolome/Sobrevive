# Parcours narratifs — variante locale

Cette variante prolonge le jeu illustré et les vingt réussites du commit `aa7226c`. Elle vit sur `codex/parcours-narratifs`. Le fichier classique `index.html`, les cinq decks et la préversion livrée précédemment restent conservés. Aucun déploiement n’est associé à ce travail.

## Déroulement

| Monde | Parcours | Scènes dans une partie complète |
| --- | --- | --- |
| El cole | Lundi à vendredi, six moments par jour ; décisions et jauges conservées le lendemain | 30 |
| Don Quijote | Départ, aventures sur les routes, nouvelle sortie, palais et retour | 28 |
| Goya | Quatre périodes des années 1770 à Bordeaux, jusqu’en 1828 | 27 |
| Botero | Formation, recherche du style, sculpture et expositions, espaces publics jusqu’en 2003 | 26 |
| Frida | Débuts, voyages, portraits et expositions, Casa Azul jusqu’en 1954 | 26 |

Une partie garde un ordre de chapitres et de moments. Chaque moment présente une scène par défaut ou une variante sélectionnée à partir des réponses réellement jouées. Les choix influencent toujours les jauges ; certains ouvrent aussi une autre carte. Une seule scène est jouée à chaque emplacement. Le hasard n’intervient plus dans cette sélection.

El cole représente une semaine complète, pas une année condensée ni une journée remise à zéro. Les cours, la récréation et la cantine reviennent. Les scènes à la maison sont annoncées comme telles. À la fin du vendredi, une réussite termine la campagne ; rejouer commence une nouvelle semaine de jeu sans reprendre l’état précédent.

Les trois parcours d’artistes sélectionnent des moments de vie. Leurs repères chronologiques reposent sur les ressources officielles référencées dans chaque JSON. Dialogues, alternatives et conséquences restent une fiction. Quelques formulations héritées sont clarifiées dans la variante : exposition des Champs-Élysées de 1992 (32 sculptures), acquisition du Cadre par l’État français en 1939, contrôle de langue annoncé en amont.

## Compatibilité

- Le moteur original applique toujours les effets, les flags et les limites 0/100. Une limite atteinte l’emporte sur la dernière scène réussie.
- Les vingt réussites restent attribuées par `endings.js`. Les épilogues d’El cole sont adaptés à la semaine dans `story-endings.json`. Les quarante fins de jauge restent accessibles.
- Les fenêtres de temps et paliers de l’ancienne pioche sont remplacés par les chapitres du parcours. Les rencontres nécessaires sont donc accessibles dès la première partie. Les préconditions `cond` des cartes restent vérifiées ; aucun défaut de données ne produit une victoire de substitution.
- La collection de cette variante présente les cartes et personnages présents dans ses parcours : 171 situations possibles, choisies parmi les 225 originales. Les cartes répétées de cantine restent une même découverte.
- Illustrations, glissement, animation, traduction, aide, commentaires et téléchargements de bilan sont réutilisés.
- Les clés locales sont distinctes : `sobrevive-story-progress-v1`, `sobrevive-story-learning-v1`, `sobrevive-story-reports-v1`, `sobrevive-story-endings-v1`, `sobrevive-story-tutorial-v1`. Les anciennes données de V2 ne sont ni migrées ni écrasées.
- Chaque décision du nouveau rapport conserve `journey` : occurrence, chapitre, période, contexte et conditions de la variante. Le contexte décrit la scène effectivement jouée avant l’avancement du parcours. HTML et TXT l’incluent.

## Données et moteur

`story/{world}.json` contient les étapes `stages`, puis leurs emplacements `slots`. Chaque slot a un identifiant local, un `card` de repli, un `label` et un `context` bilingues. Ses `variants` possèdent une condition `when`, une carte et un contexte. `when` est la conjonction de réponses antérieures `{cardId, side}` ; la première variante correspondante est retenue. `override` peut préciser les textes `t`/`f` de la scène sans modifier ses choix ni ses effets.

L’identifiant d’occurrence est `stage.id + '/' + slot.id`. Un même moment, par exemple `comedor`, peut ainsi revenir plusieurs jours sans confondre les traces. Les contextes de repli doivent eux aussi correspondre aux chemins qui y arrivent.

`story-engine.js` est un module UMD testable sans navigateur. Il adapte les méthodes temporelles et la sélection de `Core`, puis délègue l’application des effets à la méthode originale. `pick()` ne consomme rien et peut être rappelé sans faire avancer le récit. Un choix prépare son contexte, puis l’adaptateur d’`advance()` le conserve et passe au moment suivant avant le calcul de victoire. `game.src.html` reste inchangé.

`story-runtime.js` installe cet adaptateur avant les aides et le rapport. `story-ui.js` ajoute le contexte, le bouton « Mon parcours » et les étapes sur les fiches d’univers. Les anciennes ancres de débogage ne donnent pas de victoire : seules les ancres de navigation `#ficha-cole` et `#juego-cole` (et les autres mondes, avec suffixe `-fr` facultatif) sont actives.

## Construction et contrôles

Depuis la racine du dépôt :

```sh
node classroom/build-story.cjs sobrevive-parcours-narratifs.html
node classroom/check-story.cjs
node classroom/check-story-browser.cjs sobrevive-parcours-narratifs.html
node classroom/build-story-guide.cjs guide-parcours-narratifs.html
```

`build-story.cjs` peut recevoir un autre fichier HTML de destination. Son défaut est `story-preview.html`. Il ne touche pas `index.html`. La commande classique `node build.js` continue de construire la version classique.

Le test Node vérifie les références, l’ordre, les conditions, les effets contre le moteur classique, les limites et l’atteignabilité des vingt réussites. Le test navigateur utilise Playwright et Edge, avec `SV_PLAYWRIGHT` pour un paquet installé hors du dépôt. Les parcours témoins partent des quatre jauges à 50 ; ils ne sont pas obtenus en modifiant les valeurs en cours de partie. Les contrôles de disposition sur téléphone utilisent une fenêtre de navigateur, pas un appareil physique.

Le guide propre à la variante décrit ses étapes et ses bifurcations ; le walkthrough de la version classique reste un document séparé.
