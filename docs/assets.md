# Assets

Tous les sprites sont générés par script, dans l'esprit de l'atlas d'avant la V2 (ART-07). Les packs LPC du Lot 3 ont été retirés après retour de jeu (voir `docs/decisions.md`).

## Reconstruire l'atlas

`python3 tools/assets/build.py` (Pillow, voir `tools/assets/requirements.txt`). Le script réunit :
- `assets/legacy/` : l'atlas d'avant la V2, pour ce qui n'est pas régénéré (Citrouille, citrouilles-lanternes, pub *Winchester*, objets, icônes, projectiles, coffres, âmes, buissons, rochers) ;
- `tools/assets/creatures.json` : unités, PNJ, champions et apparences du mage ;
- `tools/assets/city.json` : sols, toits, façades, remparts, tours, porte, arbres, fontaine, étals, lampadaires, tonneaux, voiture, tombes, calvaires et palissades.

Chaque entrée choisit un modèle de `tools/assets/draw/` (humanoïde, quadrupède, volant, spectre, engin, sol, toit, façade, tour, arbre, fontaine, accessoire) et ses couleurs. Le contour sombre vient de `tools/assets/palette.json`, la taille finale de `generatedScale` dans `tools/assets/recipes.json`.

## Ajouter un sprite

Ajouter une entrée dans `creatures.json` ou `city.json` avec le nom attendu par le client (`unit-<id>`, `npc-<id>`, `mage-<apparence>`, `ground-<sol>`...), relancer le script, puis régler l'échelle dans `spriteAliases` de `shared/config/client.json` si besoin. Un test client vérifie que chaque unité, PNJ, objet, point d'intérêt et lieu a un sprite dans l'atlas.
