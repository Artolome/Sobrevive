# ¡Sobrevive! — deck format contract

A Reigns-style swipe card game in Spanish for French 12–13-year-olds (collège, 5ème, level A1, teacher in Guyane).
Each **universe** ("mundo") is one JSON file: `decks/<id>.json`. The engine is generic; only the JSON changes.

## Gameplay recap (so the content makes sense)
- The player gets one card at a time: a character says something; the player swipes LEFT or RIGHT (two choices).
- Each choice moves 1–3 of the universe's **4 gauges** (0–100, start 50). If any gauge reaches **0 or 100 → run ends** with a funny "fin de la aventura" text specific to that gauge and that extreme. Both extremes must be bad in an amusing way (Reigns logic: too much popularity is as fatal as none).
- Time advances each card. Reaching the end of the timeline = **win**.
- A run lasts ~26–40 cards. Cards without `once` recycle (the engine avoids repeating the last 10).
- **Progression**: cards and characters have a `tier`. Tier 0 is available from the start. Tier 1 unlocks after surviving 12 cards in one run; tier 2 unlocks after winning once. Unlocking shows "¡Nuevo personaje!" toasts. Tier ≥1 cards should feel like a reward: new characters, new episodes, deeper story.
- A 🇫🇷 button shows the French translation of the card and of both choices. Reading Spanish IS the game, so Spanish text must be short and A1-accessible, with the French as a safety net.

## JSON structure (strict — valid JSON, UTF-8, no comments, no trailing commas)
```json
{
  "id": "quijote",
  "name": "Don Quijote",
  "emoji": "🐴",
  "tagline": "¡Gigantes! Digo… molinos.",
  "sub": "Tu es Don Quichotte : moulins, géants et chevalerie en Castille",
  "intro_fr": "2–3 phrases en français : qui tu es, l'époque, ton objectif. Pas d'explication des règles.",
  "time": { "mode": "chapter", "total": 26 },
  "places": [[0, "La Mancha"], [0.75, "Barcelona"]],
  "gauges": [
    { "key": "valor", "icon": "⚔️", "label": "Valor" },
    { "key": "locura", "icon": "🌀", "label": "Locura" },
    { "key": "fuerzas", "icon": "🍗", "label": "Fuerzas" },
    { "key": "sancho", "icon": "🤝", "label": "Sancho" }
  ],
  "tiers": [
    { "id": 1, "cond": { "cards": 12 }, "es": "Sobrevive 12 cartas", "fr": "Survis à 12 cartes" },
    { "id": 2, "cond": { "win": 1 }, "es": "Termina la aventura", "fr": "Termine l'aventure" }
  ],
  "chars": {
    "sancho": { "emoji": "🧔", "name": "Sancho Panza", "tier": 0 },
    "duquesa": { "emoji": "👑", "name": "La duquesa", "tier": 1 }
  },
  "start": "salida",
  "cards": [
    {
      "id": "salida", "ch": "rocinante", "tier": 0, "once": true,
      "t": "Decides ser caballero andante. Tu caballo flaco necesita un nombre glorioso.",
      "f": "Tu décides de devenir chevalier errant. Ton cheval maigre a besoin d'un nom glorieux.",
      "l": { "es": "¡Rocinante!", "fr": "Rossinante !", "fx": { "valor": 6, "locura": 4 } },
      "r": { "es": "¿Nombre? Es un esqueleto con orejas.", "fr": "Un nom ? C'est un squelette avec des oreilles.", "fx": { "locura": -4, "fuerzas": 3 } }
    },
    {
      "id": "fiesta0", "ch": "lucia", "tier": 0, "once": true,
      "t": "Es mi cumpleaños el sábado. ¿Vienes a mi fiesta?",
      "f": "C'est mon anniversaire samedi. Tu viens à ma fête ?",
      "l": { "es": "No puedo… examen el lunes.", "fr": "Je ne peux pas… contrôle lundi.", "fx": { "notas": 7, "amigos": -8 }, "set": { "fiesta": "no" } },
      "r": { "es": "¡Claro que sí! 🎉", "fr": "Bien sûr que oui ! 🎉", "fx": { "amigos": 9 }, "set": { "fiesta": "si" } }
    },
    {
      "id": "fiestaSi", "ch": "finde", "tier": 0, "once": true, "cond": { "fiesta": "si" },
      "t": "La fiesta de Lucía: música, tarta y karaoke.", "f": "La fête de Lucía : musique, gâteau et karaoké.",
      "l": { "es": "(Cantas «Despacito». Mal.)", "fr": "(Tu chantes « Despacito ». Mal.)", "fx": { "amigos": 8, "energia": -7 } },
      "r": { "es": "(Comes tarta en el sofá.)", "fr": "(Tu manges du gâteau sur le canapé.)", "fx": { "energia": 6, "amigos": 2 } }
    }
  ],
  "deaths": {
    "valor": {
      "lo": { "m": "🐔", "es": "Un gato te asusta y huyes. Un caballero sin valor… vuelve a casa.", "fr": "Un chat te fait peur et tu fuis. Un chevalier sans courage… rentre chez lui." },
      "hi": { "m": "⚔️", "es": "Retas a duelo al rey, al mar y a tu propia sombra. Te encierran «por tu bien».", "fr": "Tu provoques en duel le roi, la mer et ta propre ombre. On t'enferme « pour ton bien »." }
    }
  },
  "win": { "m": "📖", "es": "Vuelves a casa con mil historias. Un tal Cervantes las escribe… y naces para siempre.", "fr": "Tu rentres avec mille histoires. Un certain Cervantès les écrit… et te rend immortel." }
}
```

### Field rules
- `id`, `name`, `emoji`, `tagline` (ES, ≤ 60 chars), `sub` (FR, ≤ 75 chars), `intro_fr` (FR, 2–3 sentences).
- `time`: given in the universe brief — do not change. Modes: `{"mode":"date"}` (school year), `{"mode":"year","start":Y1,"end":Y2}` (1–2 years per card; win when year > end), `{"mode":"chapter","total":N}` (1 chapter per card; win when chapter > total).
- `places`: array of `[progress 0..1, "Label"]`, ascending; shown in the header. Given in the brief.
- `gauges`: exactly 4, given in the brief — do not change keys/icons/labels.
- `tiers`: given in the brief (tier 1 = `{"cards":12}`, tier 2 = `{"win":1}`). You MAY add one optional secret tier 3 with `"cond": {"flag": ["flagKey", "value"]}` if a story choice naturally unlocks a secret character (e.g. befriending someone). Then that character and its cards get `"tier": 3`.
- `chars`: object keyed by short lowercase key. `emoji` (one emoji, may include skin tone), `name` (ES, as displayed: e.g. "Señor García · mates", "Garfio, el gato del cole"), `tier` 0/1/2(/3). Every character used by a card must exist here. A character of tier N must only be used by cards of tier ≥ N.
- `start`: id of the first card of every run (tier 0, `once: true`). It sets the scene.
- `cards[]`:
  - `id` unique, lowercase letters/digits/underscore.
  - `ch` character key.
  - `tier` 0/1/2(/3).
  - `once` (true) = appears at most once per run. Required when the card has `set`, `cond`, `after`, `before`, or `month`. Omit otherwise (card recycles).
  - `after` / `before` (0..1, optional): progress window in the timeline (e.g. `"after": 0.5` = second half). Use for chronological episodes (a war, a trip, an exhibition). Keep windows wide enough (≥ 0.3) so the card actually appears.
  - `cond`: `{ "flag": "value" }` — only shown when the flag matches. `set` (inside a choice): `{ "flag": "value" }` — sets a flag. Use for 1–3 small arcs (2–3 cards each). Flags are strings. Every `cond` must be reachable from some `set`.
  - `month` (1–12): only for `"mode":"date"` universes — card appears in that month.
  - `t` Spanish card text, target ≤ 100 chars, hard max 130. `f` French translation (faithful, natural).
  - `l` / `r`: `es` choice label ≤ 34 chars (hard max 40), `fr` translation (may add a short pedagogical note in parentheses for quiz/trap answers), `fx` 1–3 gauges with non-zero integers in **[-10, 10]**; optional `set`.
  - Convention: direct speech is written plainly; actions the player takes are in parentheses: `"(Atacas. Son molinos.)"`. Dashes `—` introduce a character's quoted words when useful.
- `deaths`: for EACH of the 4 gauge keys, both `lo` (gauge hit 0) and `hi` (gauge hit 100): `m` emoji, `es` (≤ 150 chars), `fr`. Non-lethal, comic "end of the adventure" framing (sent home, retired, locked up "for your own good", career over…). Never gory. Both extremes must make sense for that gauge.
- `win`: `m` emoji, `es`, `fr` — triumphant, references a real culminating moment.

## Content rules
1. **Spanish level A1**: present tense (a little pretérito perfecto is fine: "has ganado"), short sentences, high-frequency vocabulary, concrete nouns. One idea per card. Humor through situations and emoji, not through complex language. Numbers written as words when small.
2. **Regional variety**: given in the brief. Spain → `vosotros` allowed, "vale", "el móvil", "el cole". Latin America (Colombia/Mexico) → `ustedes` only (no `vosotros`), neutral vocabulary with a few local flavors ("jugo", "pesos", "ajiaco", "mole", "¡qué padre!" sparingly).
3. **Player voice**: when the player IS a historical character (Goya, Botero, Don Quijote, Frida), adjectives agree with that character. When the player is "you, a student", stay gender-neutral (avoid adjectives that need -o/-a; if unavoidable write "cansado/a").
4. **Real episodes first**: cards must be grounded in iconic, verifiable episodes, works, places, habits or sayings of the universe (the brief lists must-haves). Playful exaggeration is welcome, but do not invent "facts" a student would repeat as true (no invented quotes presented as real quotes, no invented dates). The French translation may carry a short "authentique : …" note when something surprising is true.
5. **Both choices matter**: each side has 1–3 effects, both sides are plausible, neither is "obviously correct" — except quiz cards (1–2 per deck: a cultural or linguistic question where the right answer rewards and the wrong one costs a little; put the explanation in the French of the choices).
6. **Balance**: across the whole deck, for each gauge, the sum of all `fx` values over all choices stays within **±15 of zero**, and the number of positive and negative effects per gauge is roughly even. Typical magnitudes 3–8; 9–10 only for pivotal moments.
7. **Kid-appropriate**: no sex, no graphic violence, no drugs/alcohol as a joke for the player, no real-person cruelty. Death culture (Día de Muertos, calaveras) is festive. Illness/disability are shown with dignity and the character's own humor.
8. **Variety**: alternate home/work/public scenes, friends/authority/animals, calm/absurd. Include at least 2 animals or objects as "characters" (a horse, a monkey, a canvas, a city…) — they make great cards.
9. **Tier design**: tier 0 = ~22 cards, 6–8 characters, the famous episodes. Tier 1 = ~8 cards introducing 2 new characters. Tier 2 = ~6 cards introducing 1–2 new characters and the late/culminating episodes. Mark `after` on late episodes so the timeline reads right.
10. **French**: natural French for 12-year-olds; translate meaning, keep the joke. Use « » for quotes.

## Writing style examples (from the "El cole" deck)
- Card: `"t": "¿Quién sale a la pizarra?"`, L `"(Te escondes detrás del libro.)"` {notas -5, energia +4}, R `"¡Yo!"` {notas +9, energia -7}
- Card: `"t": "Tu examen de mates: un 4,5. Casi…"`, L `"¿Puedo repetirlo, por favor?"` {notas +8, energia -5}, R `"Casi aprobado es… ¿aprobado?"` {notas -5, amigos +4}
- Quiz: `"t": "¿Cómo se dice «bibliothèque» en español?"`, L `"La biblioteca."` {notas +7}, R `"La librería."` {notas -5, amigos +3}, R.fr `"La librería (piège : c'est la boutique de livres !)"`
- Death: `"es": "Demasiada popularidad: no puedes ni caminar por el pasillo. Te mudas a una isla secreta."`
