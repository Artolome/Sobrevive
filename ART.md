# ¡Sobrevive! — art direction: tarot illustrations

## Essai illustré V2

Sur la branche `codex/v2-interface-pedagogie`, un échantillon demandé par l’utilisateur
remplace le rendu de la couverture El cole et de Señora Pons par des illustrations
PNG originales dans un esprit cartoon proche d’Adventure Time. Les SVG ci-dessous
restent conservés en source. Le manifest facultatif `art/raster/manifest.json`
et son intégration hors ligne sont documentés dans `classroom/README.md`.
Le cadre, les noms et les textes restent en HTML. L’échantillon attend une validation
visuelle avant extension ; il ne constitue pas un déploiement du site.

## Bibliothèque SVG d’origine

The game is a Reigns-style card game in Spanish for 12–13-year-olds. Every character is shown on a **tarot card**
(roman numeral on top, illustration in the middle, name cartouche at the bottom — the frame is drawn by the engine).
You draw **only the illustration**: inline SVG markup for a `viewBox="0 0 200 260"` window.

**Look at the reference first** (Read tool, it is an image): `shots/sheet-exemplars.png`, and read the markup of the two
exemplars in `art/exemplars.json` ("sancho" = a person, "molinos" = an object-character). Your drawings must look like
they were made by the same hand.

## The style: "Tarot de Marseille" woodcut, naive and warm
- **Thick ink outlines + flat colour fills.** Every shape has `stroke="#1f1a17"`. Main outlines `stroke-width="3"`,
  secondary details `2`–`2.5`, fine hatching `1.3`–`1.5`. Always `stroke-linejoin="round"` on closed shapes and
  `stroke-linecap="round"` on open strokes.
- **Flat fills only**, from this exact palette (the validator rejects any other colour):

  | name | hex | use |
  |---|---|---|
  | ink | `#1f1a17` | outlines, eyes, black hair, hatching |
  | blanco | `#fbf6ea` | shirts, walls, paper, teeth, highlights |
  | rojo | `#c4432e` | clothes, roofs, cheeks (with fill-opacity .45) |
  | azul | `#2c5a9a` | clothes, night, water |
  | celeste | `#86b3d4` | sky details, light cloth, glass, water |
  | amarillo | `#dfa92c` | sun, gold, ground, hair, cheese |
  | verde | `#4c8748` | hills, leaves, clothes |
  | carne | `#e7b78a` | light skin |
  | tostado | `#c98f62` | medium skin |
  | marron | `#8b5a3c` | dark skin, wood, hair, leather, animals |
  | gris | `#b3ada0` | armour, stone, metal, grey hair, donkeys |
  | paper | `#f1e6cc` | (card background — you may use it to "erase") |

  No gradients, no filters, no opacity tricks except `fill-opacity` on cheeks/shadows. The background stays empty
  (the card's paper shows through) — do **not** draw a background rectangle.
- **Hieratic, frontal, symmetrical-ish compositions**, like tarot arcana: the character stands or sits facing us
  (bust or three-quarter length), big head, simple body, and **holds or wears 1–2 attributes** that identify them
  (Sancho: wineskin + cheese; a maths teacher: chalk + set square; a queen: crown + fan).
- **Faces** (the recipe that keeps everything consistent):
  head = ellipse about `rx 28–32, ry 30–34`, skin fill, ink outline 3;
  eyes = two ink ellipses `rx 3, ry 4` about 24 units apart; eyebrows = short curved strokes (they carry the
  expression: angry `\ /`, worried `/ \`, proud = high arcs); nose = one small ink stroke; mouth = one short curve;
  cheeks = two rojo circles `r 5`, `fill-opacity=".45"`. No pupils, no eyelashes, no teeth unless it is the joke.
  Vary people with hair, hats, beards, glasses, skin tone, body shape and colour — not with facial detail.
  Children: bigger head, smaller body. Use all three skin tones across your set (the players live in French Guiana;
  the worlds are Spain and Latin America).
- **Hands** are simple circles (`r 8–9`, skin, ink outline) at the end of sleeve shapes. No fingers.
- **Ground**: a wavy strip at the bottom (top edge around y 215–232, fill amarillo or verde, ink outline 3) with 2–3
  grass tufts (three short strokes). Interiors may use a floor line or a table instead.
- **Tarot motifs** to fill the sky when it helps: a sun with a face, a crescent moon with a face, 4-point stars,
  wind curls (azul strokes), small hatching for shadow. Use them sparingly — at most one sky motif per card.
- **Objects, animals and places as characters** (a windmill, a cat, a house, an orange, a mirror, a bed): draw the
  thing big and central and, when it "speaks" in the game, give it a tiny face (two eyes + brows + mouth) like the
  windmill exemplar. Animals: simple side or front view, big readable silhouette.
- **No text, letters or numbers** in the illustration (the engine prints the name). Exception: tiny symbols
  (+ − ÷ on a blackboard, a musical note) drawn as shapes.
- **Readable small.** The card is ~200 px wide in play and ~70 px in the collection grid. One clear silhouette,
  3–5 colours per card, no micro-detail. If you squint and cannot tell who it is, simplify.
- **Humour is welcome**, tenderness too. Real people (Goya, Frida, Diego, Botero, kings, Breton…) are drawn with
  affection and dignity, recognisable by attributes — never caricatured cruelly. Illness or disability are not the joke.

## Technical rules (enforced by `render-sheet.js`)
- Allowed elements: `g path rect circle ellipse line polyline polygon`. Nothing else (no `text`, `defs`, `use`,
  `style`, `image`, gradients, filters, scripts).
- Allowed attributes: `d x y x1 y1 x2 y2 cx cy r rx ry width height points fill stroke stroke-width stroke-linecap
  stroke-linejoin stroke-dasharray fill-opacity stroke-opacity opacity transform fill-rule`. No `id`, `class`, `style`.
- `fill` / `stroke` values: only the palette hex codes above (lowercase), or `none`.
- Each character illustration: one string of markup, **≤ 6000 characters** (aim for 2000–4500). Double quotes inside
  the markup must be escaped in JSON (`\"`).
- Canvas `0 0 200 260`. The card crops a few units at the edges: keep everything important inside
  **x 14–186, y 12–214**; the ground strip may run to the bottom and full width.
- Draw back-to-front (ground first, then body, head, hat, arms/hands, held objects last).

## Gauge glyphs (4 per world)
Small one-colour icons shown inside round medallions at 20–40 px: `viewBox="0 0 24 24"`, solid silhouette, use only
`fill="currentColor"` and/or `stroke="currentColor"` (`stroke-width` 2, round caps) and `none`. ≤ 900 characters.
Bold, simple, instantly readable (see the sword for "valor" in the exemplars). No outlines-in-ink, no palette colours.

## World cover (1 per world)
Same canvas and rules as a character (≤ 8000 characters): the hero or emblem of the world, a little richer
(one sky motif + the hero + 1–2 emblematic objects). It is the big card players tap in the lobby.

## Output file
`art/<unit>.json`:
```json
{
  "world": "quijote",
  "chars": { "sancho": "<path …/><ellipse …/>…", "rocinante": "…" },
  "gauges": { "valor": "<path d=\"…\" fill=\"currentColor\"/>", "locura": "…" },
  "cover": "<path …/>…"
}
```
Keys of `chars` and `gauges` are exactly the keys of the deck (`decks/<world>.json` → `chars`, `gauges[].key`).

## How to work (mandatory render–look–fix loop)
1. Read the deck `decks/<world>.json`: for each character read its name, emoji and the cards where it speaks
   (`cards[].ch`) so the attributes you draw match what the character says and does.
2. Draw. Write the JSON file.
3. Render: `node render-sheet.js <unit>` (run it from the scratchpad directory). It prints validation problems and
   writes `shots/sheet-<unit>.png`. **Read that PNG** and look at your drawings critically. To inspect a few cards
   larger: `node render-sheet.js <unit> key1,key2,key3 --big` → `shots/sheet-<unit>-zoom.png`.
4. Fix what is ugly, confusing, off-centre, cropped, too detailed, or inconsistent with the exemplars. Typical
   failures to hunt: limbs that do not connect, objects floating, heads too small, faces that look creepy, a figure
   lost in empty space (make it bigger!), everything the same colour, strokes missing on a shape, ground missing.
5. Repeat render → look → fix at least twice, until the validator prints "validation du balisage: OK" and every
   card is one you would be proud to print.
