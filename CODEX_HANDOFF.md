# Reprise de ¡Sobrevive! dans Codex

## Demande de l’utilisateur

Poursuivre l’amélioration du jeu pédagogique d’espagnol ¡Sobrevive! dans Codex : interface, compréhension des choix, accompagnement linguistique, usage en classe, fiabilité et propositions d’illustrations. Ne pas repartir de zéro. Préserver les cinq univers et la version originale. Communiquer en français et distinguer clairement réalisation, proposition et test non effectué.

Ce fichier est une passation du travail de ChatGPT, pas la preuve qu’une tâche Codex a déjà été lancée ni que toute la refonte est terminée.

## Dépôt et séparation des versions

- Dépôt : https://github.com/Artolome/Sobrevive
- Base de travail V2 : `ameliorations/mode-classe-v2`.
- Jeu original : https://artolome.github.io/Sobrevive/
- Préversion V2 : https://artolome.github.io/Sobrevive/v2/
- Le workflow actuellement lu sur `main` publie l’original à la racine et une V2 figée au commit `97988752bc50fbfb410c4fa01be1f27431736027` dans `/v2/`.
- Un nouveau commit sur la branche V2 ne met donc pas automatiquement à jour la préversion publique.

Au démarrage, vérifier les références distantes actuelles et lire les instructions du dépôt. Partir de la branche V2, ou créer une branche Codex dérivée de celle-ci. Ne pas écraser `main`, fusionner, forcer un push, supprimer des fichiers ou déclencher un déploiement sans autorisation explicite. Le workflow présent sur une ancienne branche peut différer de celui de `main` : ne pas lancer aveuglément son déploiement.

## Architecture à conserver

- `game.src.html` : interface et moteur originaux.
- `decks/*.json` : situations, choix, traductions, jauges, fins et personnages.
- `art/*.json` : dessins SVG existants.
- `tarot-kit.js` : gabarits des cartes.
- `build.js` : assemble un fichier `index.html` autonome.
- `check.js` : validation des decks et simulations ; ce contrôle ne remplace pas des tests de navigateur.
- `classroom/build-extra.js` : intègre les ajouts V2 à la construction.
- `classroom/learning.js` : comportement des aides de classe.
- `classroom/learning.css` : styles complémentaires.
- `classroom/content.json` : notice de préversion et petit lexique.
- `README.md`, `FORMAT.md`, `ART.md` : documentation à lire avant de modifier les données ou illustrations.

Ne pas modifier uniquement le HTML généré. Maintenir une construction reproductible et le fonctionnement hors ligne. Les SVG sont filtrés par le constructeur : vérifier les éléments et attributs autorisés avant toute nouvelle illustration. Aucune refonte de framework n’est demandée.

## État constaté dans les sources V2

Le fichier `classroom/learning.js` contient déjà :

- Un tutoriel court, un dialogue modal et des commandes d’aide.
- Des jauges chiffrées, consultables pour lire les conséquences aux limites.
- L’affichage du nom du personnage au-dessus de la situation.
- Un bouton « Traduire » explicitement nommé et un lexique « Mots utiles ».
- Un relevé des variations réellement appliquées après chaque choix, avec un bouton « Comprendre ».
- Un journal local des décisions, une zone de notes et l’export d’un bilan en `.txt`.
- Des amorces pour une justification en espagnol et le jeu en binôme.
- Des précautions de navigation clavier dans le dialogue.

Ce relevé provient de la lecture du code, pas d’une nouvelle campagne complète de tests. Le feedback actuel explique surtout les chiffres : il ne fournit pas encore systématiquement le pourquoi narratif du choix. Le lexique est limité. La relecture exhaustive des cartes et les nouvelles illustrations ne sont pas terminées.

Ne pas assimiler conservation des collections/journal à sauvegarde complète d’une partie en cours. Vérifier cette distinction avant d’afficher « Reprendre » ou de promettre une reprise après fermeture. Les collections sur un navigateur partagé ne représentent pas des comptes individuels d’élèves.

## Travail restant, par priorité

### 1. Vérifier puis consolider le fonctionnement

Lancer les contrôles existants et reproduire les parcours dans le navigateur. Tester les cinq univers, la traduction de la situation et des deux réponses, l’aide lexicale, les jauges, les dialogues, les choix au clic/glisser/clavier, la sortie de partie, la défaite, la victoire, le journal et son export. Vérifier les jeux de données sans modifier arbitrairement l’équilibrage.

Un audit automatique initial avait signalé à tort Botero inaccessible, traducteur absent et jauges à zéro. Ces conclusions ont été contredites par des vérifications ultérieures ; ne pas les traiter comme des bugs établis.

### 2. Mieux expliquer les décisions

Conserver les conséquences effectivement calculées par le moteur. Ajouter des retours narratifs courts et cohérents avec le choix : ce que le personnage fait, ce qui en résulte et pourquoi les jauges évoluent. Les écrire explicitement dans les données plutôt que produire une causalité inventée à partir des seuls signes +/−. Préserver le rythme avec une lecture facultative ou une pause réglable.

Les jauges sont des règles fictives, pas des conseils de santé ni une note d’espagnol. Expliquer pourquoi un excès peut terminer une partie. Ne pas donner un sens moral à une valeur maximale sans justification narrative.

### 3. Relecture linguistique et exploitation en classe

Homogénéiser la présentation des deux choix : paroles prononcées et indications d’action clairement séparées. Exemple proposé, à vérifier dans le deck avant édition : première carte de Señora Pons, « Me llamo… » avec indication « en voz baja », face à « ¡Buenos días! Me llamo… ».

Relire les cinq decks pour la clarté, les traductions, la longueur des phrases et les difficultés lexicales. Cibler des collégiens débutants à intermédiaires A1/A2 sans prétendre certifier un niveau à partir de quelques phrases. Préserver les références culturelles mais distinguer dialogues fictifs et faits historiques ; consulter des sources primaires lorsqu’un fait nécessite une vérification.

Élargir l’aide lexicale, puis laisser la traduction complète accessible. Conserver une justification orale ou écrite très courte, par exemple « Elijo esta respuesta porque… », sans transformer chaque carte en exercice lourd. Aucune collecte de données personnelles ni création de comptes élèves n’est demandée.

### 4. Direction visuelle et illustrations

Deux images ont été générées dans la conversation ChatGPT : une maquette d’accueil avec cinq grandes cartes illustrées et une maquette de partie avec Señora Pons. Ce sont des PROPOSITIONS, pas des captures du site déployé, ni des illustrations déjà intégrées. Leurs fichiers ne sont pas inclus par cette passation dans le dépôt. Ne pas prétendre disposer des originaux s’ils ne sont pas joints à la tâche.

Direction proposée : tarot narratif, papier crème, filets dorés, fond sombre texturé, portraits expressifs avec vrais décors, contours dessinés et couleurs chaleureuses, lisibles sur téléphone et adaptés à des collégiens. Conserver une identité cohérente tout en différenciant les cinq mondes. Réserver les textes, noms et boutons au HTML plutôt que les cuire dans les images.

Pistes : El cole, élève avec cahier dans un cadre scolaire contemporain ; Don Quijote, chevalier, Sancho et moulins ; Goya, atelier, lumière contrastée et motifs graphiques ; Botero, atelier et volumes picturaux, sans accessoires biographiques inventés ; Frida, atelier de la Casa Azul, végétation et outils de peinture. Éviter les clichés systématiques, notamment de transformer tout personnage espagnol en personnage de flamenco.

Préparer des propositions distinctes pour les couvertures, les personnages et les dos de cartes. Présenter un petit échantillon cohérent avant de remplacer toutes les illustrations. Les maquettes n’ont pas reçu de validation explicite pour une adoption finale.

### 5. Accessibilité et responsive

Vérifier au minimum 390×844, 844×390 et un écran de bureau. Contrôler les réponses longues avec traduction, la visibilité des boutons, le défilement, le focus clavier, la fermeture et restitution du focus des dialogues, le zoom et les animations réduites. Les flèches ne doivent pas jouer une carte pendant la saisie dans le bilan ou dans un dialogue.

## Commandes de départ

Utiliser Node.js 22, conformément au workflow actuellement lu. Ne pas inventer de commande npm si le dépôt ne contient pas de configuration correspondante.

```sh
node build.js
node check.js
node --check classroom/learning.js
```

Pour les tests navigateur, servir le résultat localement et utiliser les outils réellement présents. Consigner les commandes exécutées, les résultats et les limites. Ne pas présenter un rendu local ou une maquette générée comme une version en ligne.

## Livraison attendue

Des changements limités et relisibles sur une branche séparée, un bilan de tests reproductibles, des captures du vrai rendu et une liste honnête des tâches restantes. Ne mettre à jour la préversion publique qu’après autorisation, en conservant l’original. Le lien du site ne change pas par le seul fait d’ajouter ce fichier de passation.
