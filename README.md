# ¡Sobrevive!

Un jeu de cartes en espagnol pour le collège (niveau A1), dans l'esprit de *Reigns*, illustré comme un jeu de tarot.
Chaque carte parle en espagnol ; on la glisse à gauche ou à droite pour répondre. Il faut garder quatre jauges
ni vides ni pleines pour survivre jusqu'au bout — et débloquer de nouvelles cartes et de nouveaux personnages.

**Jouer : https://artolome.github.io/Sobrevive/**

## Les cinq mondes

| Monde | On incarne | Jauges |
|---|---|---|
| El cole | un·e élève du Colegio Cervantes | Notas · Amigos · Energía · Dinero |
| Don Quijote | Alonso Quijano, le chevalier de Cervantès | Valor · Locura · Fuerzas · Sancho |
| Goya | Francisco de Goya, de Madrid à Bordeaux | Corte · Genio · Dinero · Salud |
| Botero | Fernando Botero, de Medellín à Paris | Estilo · Fama · Dinero · Raíces |
| Frida | Frida Kahlo, à Coyoacán | Arte · Salud · Alegría · México |

Dans chaque monde, survivre à 12 cartes débloque un deuxième palier de cartes et de personnages ; gagner débloque le troisième.
Le bouton « traduire » affiche la traduction française de la carte. La progression est gardée sur l'appareil du joueur.

## Modifier le jeu

Le jeu publié est un seul fichier, `index.html`, fabriqué à partir des sources par `node build.js` (Node.js suffit, aucune dépendance).
À chaque envoi sur la branche `main`, GitHub reconstruit et republie le jeu — et refuse de publier si un deck contient une erreur.

- **Changer ou ajouter une carte** : modifier `decks/<monde>.json` (format décrit dans `FORMAT.md`).
- **Vérifier** : `node check.js` contrôle la structure des decks et simule des milliers de parties (taux de victoire, cartes jamais tirées…).
- **Régler la difficulté** : `node tune.js` affiche le taux de victoire selon l'amplification des effets ; `node tune.js --apply` l'applique.
- **Illustrations** : `art/*.json` contient les dessins (SVG) de chaque personnage ; le style est décrit dans `ART.md`.
  `node render-sheet.js <fichier>` produit une planche de contrôle en image (nécessite Microsoft Edge).
- **Ajouter un monde** : un nouveau fichier `decks/<id>.json`, ses illustrations `art/<id>.json`, puis l'ajouter à la liste `IDS`
  dans `game.src.html` et dans `build.js`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | le jeu complet, prêt à ouvrir (même hors ligne) |
| `game.src.html` | interface et moteur du jeu |
| `tarot-kit.js` | gabarit des cartes de tarot (cadre, numéral, cartouche, dos) |
| `decks/` | les cartes de chaque monde, en espagnol avec traduction française |
| `art/` | les illustrations |
| `build.js`, `check.js`, `tune.js`, `render-sheet.js`, `shot.js` | assemblage, validation, réglage, planches et captures |

## À savoir

Les textes et les illustrations ont été écrits et dessinés avec Claude, puis relus automatiquement (langue, niveau A1, exactitude culturelle).
Une relecture par l'enseignant·e reste recommandée avant usage en classe.
