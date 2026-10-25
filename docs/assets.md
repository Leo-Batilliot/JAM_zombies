# Assets du Lot 3

Liste par besoin des sources retenues (ART-08). Les PNG bruts et leurs licences sont dans `assets/`, la liste complète des sources dans `assets/sources.json` et les crédits dans `docs/credits.md`. L'atlas se reconstruit avec `python3 tools/assets/build.py` (Pillow, voir `tools/assets/requirements.txt`) : les recettes sont dans `tools/assets/recipes.json`, la palette dans `tools/assets/palette.json`.

Licences : CC-BY-SA 3.0 et GPL 3.0 pour la plupart des packs LPC. Les sprites recolorés restent sous la même licence et chaque auteur doit être crédité.

## Unités, PNJ et mages

- Zombies (zombie, gros zombie, abomination, titan de chair, rôdeur, wendigo) : `lpc/zombie` recoloré par palier.
- Goule, molosse, cerbère, chien des enfers, loup putride : `lpc/wolf` recoloré.
- Chien zombie et chien de garde : `lpc/cats-and-dogs`.
- Loup-garou et seigneur-garou : `lpc/wolfman`.
- Squelettes (archer, arbalétrier, pyromancien, liche, roi liche) : `lpc/medieval-characters` (corps squelette, arcs, robes).
- Civils, chasseurs, soldats : `lpc/medieval-characters`.
- Apparences du mage : `lpc/medieval-characters`, peau zombifiée par recoloration.
- Reste à générer : baliste et catapulte d'os (encore empruntées), Citrouille et ses citrouilles-lanternes (atlas d'origine).

## Ville

- Sols : `lpc/base-assets/tiles` (pavés et dalles de `castlefloors_outside`, terre, herbe, herbe recolorée en feuilles, mousse).
- Toits et murs des bâtiments : `lpc/base-assets/tiles/house.png`.
- Remparts, tours et pierre : `lpc/castle-mega-pack`, porte de `lpc/base-assets/tiles/castle_outside.png`.
- Arbres et sapins : `lpc/misc-tile-atlas`.
- Fontaine, étals, tombes, calvaires : `lpc/medieval-village-decorations`.
- Palissades des camps : `lpc/medieval-village-decorations/fence_medieval.png`.
- Lampadaires : `lpc/lamp-posts`. Tonneaux : `lpc/base-assets/tiles/barrel.png`. Voitures : `lpc/modern-cars`. Fissures : `lpc/modern-streets`.

## Effets et interface

- Halos de la nuit, anneaux de fusion et de level up : générés par le client.
- Icônes des dons et des sorts, objets, projectiles : atlas d'origine (`assets/legacy`).
