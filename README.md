# ¡Sobrevive!

Un jeu de cartes en espagnol pour le collège (niveau A1), dans l'esprit de *Reigns*, illustré comme un jeu de tarot.
Chaque carte parle en espagnol ; on la glisse à gauche ou à droite pour répondre. Il faut garder quatre jauges
ni vides ni pleines pour survivre jusqu'au bout — et débloquer de nouvelles cartes et de nouveaux personnages.

**Jouer à la version illustrée avec parcours narratifs : https://artolome.github.io/Sobrevive/**

La même version reste accessible sous [/parcours/](https://artolome.github.io/Sobrevive/parcours/). L’ancien jeu est archivé sous [/classique/](https://artolome.github.io/Sobrevive/classique/) ; la première préversion pédagogique reste sous [/v2/](https://artolome.github.io/Sobrevive/v2/).

## Les cinq mondes

| Monde | On incarne | Jauges |
|---|---|---|
| El cole | un·e élève du Colegio Cervantes | Notas · Amigos · Energía · Dinero |
| Don Quijote | Alonso Quijano, le chevalier de Cervantès | Valor · Locura · Fuerzas · Sancho |
| Goya | Francisco de Goya, de Madrid à Bordeaux | Corte · Genio · Dinero · Salud |
| Botero | Fernando Botero, de Medellín à Paris | Estilo · Fama · Dinero · Raíces |
| Frida | Frida Kahlo, à Coyoacán | Arte · Salud · Alegría · México |

La version principale propose une semaine de cours pour El cole, l’aventure de Don Quijote et les parcours de vie de Goya, Botero et Frida. Les décisions influencent les rencontres et les fins. Les illustrations, les aides, les retours après chaque choix, les animations et l’export du bilan sont inclus.
Les collections et les bilans sont conservés dans ce navigateur ; une partie interrompue ne se reprend pas après fermeture.

## Sources et publication de la version principale

Les sources narratives se trouvent sur [`codex/parcours-narratifs`](https://github.com/Artolome/Sobrevive/tree/codex/parcours-narratifs), avec les instructions dans [`classroom/STORY.md`](https://github.com/Artolome/Sobrevive/blob/codex/parcours-narratifs/classroom/STORY.md).
Le workflow de `main` construit le commit validé `e6716a1d74a6b0f8ad41e90fe974639a22ebef3f` avec `node classroom/build-story.cjs`, contrôle son empreinte puis publie le même HTML à la racine et sous `/parcours/`. Un changement de la branche narrative ne publie rien tant que cette référence et l’empreinte attendue ne sont pas actualisées.

## Modifier le jeu classique archivé

Les fichiers de `main` décrits ci-dessous restent ceux de l’ancienne version. Le jeu classique est un seul fichier, `index.html`, fabriqué à partir des sources par `node build.js` (Node.js suffit, aucune dépendance).
À chaque envoi sur la branche `main`, GitHub reconstruit les trois versions et refuse de publier si un contrôle échoue.

- **Changer ou ajouter une carte** : modifier `decks/<monde>.json` (format décrit dans `FORMAT.md`).
- **Vérifier** : `node check.js` contrôle la structure des decks et simule des milliers de parties (taux de victoire, cartes jamais tirées…).
- **Régler la difficulté** : `node tune.js` affiche le taux de victoire selon l'amplification des effets ; `node tune.js --apply` l'applique.
- **Illustrations** : `art/*.json` contient les dessins (SVG) de chaque personnage ; le style est décrit dans `ART.md`.
  `node render-sheet.js <fichier>` produit une planche de contrôle en image (nécessite Microsoft Edge).
- **Ajouter un monde** : un nouveau fichier `decks/<id>.json`, ses illustrations `art/<id>.json`, puis l'ajouter à la liste `IDS`
  dans `game.src.html` et dans `build.js`.

## Fichiers du jeu classique

| Fichier | Rôle |
|---|---|
| `index.html` | le jeu complet, prêt à ouvrir (même hors ligne) |
| `game.src.html` | interface et moteur du jeu |
| `tarot-kit.js` | gabarit des cartes de tarot (cadre, numéral, cartouche, dos) |
| `decks/` | les cartes de chaque monde, en espagnol avec traduction française |
| `art/` | les illustrations |
| `build.js`, `check.js`, `tune.js`, `render-sheet.js`, `shot.js` | assemblage, validation, réglage, planches et captures |

## À savoir

Les textes et les illustrations du jeu classique ont été écrits et dessinés avec Claude, puis relus automatiquement (langue, niveau A1, exactitude culturelle).
Une relecture par l'enseignant·e reste recommandée avant usage en classe.
