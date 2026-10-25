# Historique

Format : voir `ressources/exemples/history.md`. Entrée la plus récente en haut.

---

### Retours de jeu sur les Lots 3 et 4 | 14.01-14.04 | L.BA

- `shared/config/world.json` : carte en forêt sans bâtiments ni remparts, 130 civils, apparitions espacées, pub *Winchester* dans la clairière.
- `shared/config/client.json` : sol d'herbe, minimap unie, caméra 30 % plus loin, créatures 20 % plus petites, voiture des points d'intérêt agrandie.
- `shared/config/gameplay.json`, `units.json` : civils près du mage à l'apparition, attaque magique du mage et son projectile.
- `shared/src/config/schema.ts` : zoom de base, fond de minimap, civils de départ, espacement des apparitions, attaque du mage.
- `server/src/systems/magic.ts`, `server/src/world/loop.ts` : tir de base du mage.
- `server/src/systems/army.ts`, `mage.ts`, `server/src/world/spawn.ts`, `world.ts` : apparition loin des ennemis, civils de départ, points aléatoires espacés.
- `client/src/game/camera.ts`, `decor.ts`, `client/src/minimap.ts` : zoom de base, décor hors des arbres, minimap unie et gros points.
- `tools/assets/creatures.json`, `city.json`, `client/public/atlas/` : goule en zombie accroupi, voiture agrandie.
- `server/tests/`, `client/tests/`, `shared/tests/` : magie du mage, réglages de caméra et de minimap.

### Concept V2, Lot 4 : nouveau contenu et sprites générés | 13.01-13.19 | L.BA

- `shared/src/config/schema.ts`, `shared/src/registry.ts` : couche des corps, comportement de raid, quartiers et trajets des populations, lieux, champions et capacités, couche et apparence envoyées au client, vérification des lieux et des champions.
- `shared/src/protocol/messages.ts` : position des champions dans le statut.
- `shared/config/units.json` : lignées Volants et Spectres, triangle étendu, chiens errants, pillards, loups, corbeaux, chauves-souris, moines, templiers, patients, mitrailleuse, mortier, 4 champions.
- `shared/config/world.json` : populations du Lot 4 (150 PNJ errants au total), lieux en garnison, repaires, gaz, coffres et butin par lieu, caserne, place et forêt dans chaque ville.
- `shared/config/equipment.json` : serres et reliques des nouvelles lignées.
- `shared/config/client.json`, `lobby.json` : ombre et transparence, échelles des sprites, couleur du gaz, portée de chasse aux champions.
- `server/src/systems/bodies.ts`, `separation.ts`, `walls.ts`, `mists.ts` : volants au-dessus des murs, spectres à travers les rangs, gaz pour les corps au sol.
- `server/src/systems/civilians.ts`, `hostiles.ts` : bandes qui attaquent les petites armées et fuient les grosses, encerclement, processions.
- `server/src/systems/places.ts` : garnisons, coffres, réapparition, repaires de champions, mortier, gaz.
- `server/src/systems/abilities.ts`, `combat.ts` : charge, piqué, exécution, frappe en arc, soins.
- `server/src/systems/mage.ts`, `points.ts`, `transfer.ts`, `server/src/lobby/handicap.ts` : champions transmis entiers ou renvoyés au repaire, hors fosse commune, transferts limités sous le plafond des bots.
- `server/src/systems/detection.ts`, `server/src/net/sockets.ts`, `interest.ts` : positions des champions, marqueur des lieux.
- `server/src/lobby/bots.ts` : chasse aux repaires de champions.
- `client/src/game/entities.ts`, `sprites.ts`, `client/src/minimap.ts`, `game.ts` : ombre des volants, transparence des spectres, sprites des lieux, champions sur la minimap.
- `tools/assets/draw/`, `creatures.json`, `city.json`, `build.py`, `recipes.json` : sprites générés pour les unités, PNJ, champions, mages, sols, bâtiments et décor, chaîne LPC retirée.
- `assets/` : packs LPC supprimés, ancien atlas gardé.
- `client/public/atlas/` : atlas régénéré.
- `server/tests/`, `shared/tests/`, `client/tests/` : couches, raids, lieux, champions, capacités, transferts, chasse des bots, sprites du contenu.
- `docs/assets.md`, `docs/credits.md`, `docs/load-test.md`, `docs/conceptV2.md`, `docs/plan.md` : génération des sprites, crédits, mesures du Lot 4, numéros d'étape, phase 13.

### Ville dessinée, nuit, effets et interface du Lot 3 | 12.01, 12.07-12.17 | L.BA

- `tools/assets/recipes.json` : sols, toits, murs, remparts, tours, porte, arbres, fontaine, étals, tombes, lampadaires, tonneaux, voiture, calvaire et palissade tirés des packs LPC.
- `client/public/atlas/` : atlas régénéré.
- `client/src/game/decor.ts` : plan de la ville reconstruit depuis la graine envoyée, sols, variantes de tuiles, compositions de décor, lumières, tours et portes des remparts, forêt au-delà.
- `client/src/game/map.ts` : sols en tuiles par quartier, bâtiments en toit et façade, obstacles ronds en sprites, remparts, forêt assombrie hors de la carte.
- `client/src/game/night.ts` : voile de nuit percé de halos (lampadaires, mages, camps, points d'intérêt, croix, bombardements), coupé si les fps restent bas.
- `client/src/game/effects.ts` : anneaux de fusion et de level up.
- `client/src/minimap.ts` : plan de la ville, obstacles et repères des quartiers.
- `client/src/style.css` : interface en cuir et parchemin à la place du violet.
- `client/src/game/game.ts` : nuit, effets et plan de la minimap branchés.
- `server/src/world/world.ts`, `server/src/systems/walls.ts`, `server/src/systems/movement.ts` : point libre toujours à l'intérieur des remparts, pour les corps repoussés et pour les cibles de déplacement.
- `server/src/lobby/bots.ts` : fuite qui contourne les remparts et les murets.
- `server/src/systems/events.ts` : quartiers d'apparition des événements.
- `shared/src/config/schema.ts`, `shared/src/registry.ts` : apparence de la ville, nuit, effets, quartiers des événements vérifiés.
- `shared/config/client.json`, `world.json`, `events.json` : apparence de la ville, nuit, effets, rues en dalles, champ de citrouilles au parc, Citrouille au parc ou en forêt.
- `.prettierignore` : atlas généré et assets bruts ignorés.
- `client/tests/`, `server/tests/`, `shared/tests/` : plan identique côté serveur et client, sprites présents dans l'atlas, nuit, effets, point libre, bords de carte.
- `docs/assets.md`, `docs/credits.md`, `docs/load-test.md`, `docs/conceptV2.md` : sources des assets, crédits LPC, mesures du Lot 3, numéros d'étape.

### Chaîne d'assets LPC, sprites en 4 directions et ville côté serveur | 12.02-12.07, 12.12-12.13 | A.PI

- `assets/` : PNG LPC bruts avec leurs licences, ancien atlas dans `assets/legacy`, sources dans `sources.json`.
- `tools/assets/build.py`, `recipes.json`, `palette.json` : découpe des planches, superposition des calques, recoloration, palette, contour, paquetage en plusieurs atlas.
- `client/public/atlas/` : atlas généré et manifeste.
- `client/src/game/assets.ts` : chargement de plusieurs atlas.
- `client/src/game/sprites.ts`, `entities.ts` : animations en 4 directions, mort et relève animées, repli sur les sprites de profil.
- `client/src/game/outlines.ts` : contours précalculés sur plusieurs pages.
- `shared/src/city.ts` : plan de la ville en gabarits de quartiers, remparts, obstacles en rectangles et cercles.
- `server/src/world/obstacles.ts`, `server/src/systems/walls.ts` : grille des obstacles, corps repoussés le long des murs.
- `server/src/world/world.ts`, `spawn.ts`, `server/src/systems/points.ts`, `camps.ts` : ville générée au démarrage, apparitions hors des obstacles et dans les quartiers qui leur vont.
- `server/src/lobby/bots.ts` : bots qui se débloquent par un détour.
- `server/src/net/sockets.ts` : graine de la ville envoyée au client.
- `shared/config/world.json`, `client.json`, `lobby.json` : gabarits de quartiers et compositions, sprites des 21 unités, déblocage des bots.

### Retours de jeu sur les Lots 1 et 2 | 11.01-11.05 | A.PI

- `server/src/lobby/handicap.ts` : plafond des bots selon le meilleur joueur humain, handicap calculé sur la force potentielle (vivants et cadavres).
- `server/src/lobby/bots.ts`, `lobby.ts` : réflexion ralentie avec le handicap, errance seule au plafond, choix de la mutation de la lignée qui a le plus d'unités en attente de fusion.
- `server/src/systems/souls.ts` : âmes des bots multipliées par leur handicap.
- `server/src/systems/transfer.ts`, `death.ts`, `points.ts` : un bot au plafond ne reçoit plus de troupes ni de cadavres, ne gagne rien sur les PNJ et ne fouille plus.
- `server/src/systems/targeting.ts` : pas de ciblage automatique d'un ennemi nettement plus fort que l'armée, sauf au contact ou s'il attaque, civils ignorés par un bot au plafond.
- `server/src/world/world.ts`, `loop.ts` : handicap des bots, mis à jour à chaque tick.
- `shared/src/config/schema.ts` : réglages du handicap et de l'attraction, taille des images de carte, stats des unités, branches des lignées et effets des dons et des sorts envoyés au client.
- `shared/config/gameplay.json`, `lobby.json`, `client.json` : croissance des niveaux à x1,2, attraction (rapport 1,5, contact à 3 m), handicap (marge 40, ratio 1,2), images de carte x2.
- `client/src/cards.ts` : cartes illustrées avec type, lignée, branche et palier, stats et description, dépliées à chaque niveau.
- `client/src/game/game.ts`, `assets.ts`, `style.css` : image des cartes tirée de l'atlas, cartes en haut au centre sous le HUD.
- `client/public/atlas/` : icônes des dons et des sorts, une par effet.
- `docs/conceptV2.md`, `docs/plan.md` : retours de jeu (MOV-07, FIGHT-05, EVO-01, EVO-19), phase 11.
- `docs/load-test.md` : mesures et simulation de la phase 11.
- `server/tests/`, `shared/tests/`, `client/tests/` : plafond et handicap, croissance bloquée, attraction, choix des cartes, cartes illustrées.

### Concept V2, Lot 2 : évolution permanente | 10.01-10.14 | T.BE

- `shared/config/units.json` : lignées à deux branches de trois paliers, 21 unités, ratio de fusion, PNJ obstacle du mur d'os.
- `shared/config/gameplay.json` : cartes de level up, fusion, dons et sorts.
- `shared/config/client.json` : touche du sort, sprites empruntés.
- `shared/src/config/schema.ts` : schémas des lignées, dons et sorts, contenu client des lignées, dons, sorts et obstacles.
- `shared/src/registry.ts` : arbre des lignées vérifié (famille, force, appartenance), registres des dons et sorts.
- `shared/src/protocol/messages.ts` : messages `Choose`, `Cast` et `Respawn`, cartes, sort, vision et statistiques de la vie.
- `server/src/systems/evolution.ts` : tirage des cartes, mutations exclusives, fusion automatique, découpage en unités de base.
- `server/src/systems/gifts.ts` : effets des dons, soin des troupes.
- `server/src/systems/spells.ts` : nova, cri de ralliement, mur d'os, relève immédiate, recharge.
- `server/src/systems/enlist.ts`, `mage.ts` : unités reçues ou relevées recalculées selon les mutations, remise à zéro et statistiques à la mort, réapparition sur demande.
- `server/src/systems/` : effets des dons dans la réanimation, le Lien d'âme, la marche, la détection et le butin.
- `server/src/lobby/bots.ts` : choix des cartes par lignée majoritaire.
- `server/src/net/sockets.ts` : cartes, sort et statistiques envoyés, suppression de l'ancienne évolution.
- `client/src/cards.ts`, `spell.ts`, `death.ts` : cartes de level up, bouton de sort, écran de fin de run.
- `client/src/game/entities.ts` : sprites empruntés, obstacles sans barre ni contour.
- `server/tests/systems/evolution.test.ts`, `client/tests/levelup.test.ts` : tests des cartes, fusions, transferts, dons, sorts et de l'écran de fin.

### Concept V2, Lot 1 : sensations et lisibilité | 9.01-9.19 | T.BE

- `shared/config/` : ralentissement selon la force, fuite, recharge et rotation des formations, fatigue des civils, mage plus fragile, détection, abandon des proies, réglages des barres, contours, plaques et caméra.
- `shared/src/protocol/messages.ts` : PV dans les snapshots, barres des boss, puissance si tout revit, expérience, lenteur, mages détectés. Suppression de la Retraite et des cercles d'aggro.
- `server/src/systems/pace.ts` : vitesse de marche commune et ralentissement logarithmique.
- `server/src/systems/movement.ts`, `formation.ts` : formation en bloc à places fixes, rotation progressive, retour rapide après la victoire.
- `server/src/systems/flee.ts` : fuite libre par éloignement, remplace `retreat.ts`.
- `server/src/systems/battle.ts`, `targeting.ts`, `tactics.ts` : bataille sans cercle ni encerclement, cible gardée au contact, formations instantanées avec recharge.
- `server/src/systems/civilians.ts`, `separation.ts`, `combat.ts` : fatigue des civils, unités qui traversent leur mage, tolérance de portée.
- `server/src/systems/detection.ts`, `strength.ts` : mages détectés selon la puissance, puissance si tout revit.
- `server/src/lobby/` : bots qui fuient en marchant et lâchent les proies faibles, classement complet.
- `server/src/net/` : PV et données du HUD envoyés.
- `client/src/game/outlines.ts`, `entities.ts` : contours calculés depuis l'atlas, barres de PV.
- `client/src/game/plates.ts`, `camera.ts` : plaques des mages ennemis, dézoom selon la puissance.
- `client/src/hud.ts`, `bossbar.ts`, `minimap.ts`, `formations.ts` : HUD en haut au centre, barre des boss, mages détectés, recharge des formations. Suppression de la Retraite et du cercle d'aggro.
- `server/tests/`, `shared/tests/`, `client/tests/` : tests de la marche, de la fuite, des formations, du protocole et du HUD.
- `docs/load-test.md` : mesures du Lot 1.
- `docs/plan.md`, `docs/conceptV2.md` : phases 9 et 10, numéros reportés à côté des cases.
- `README.md`, `docs/demo.md` : contrôles sans Retraite, cartes et sort.

### Concept V2 du revamp | L.BA

- `docs/conceptV2.md` : revamp du gameplay et du visuel en cases à cocher, par thème et par lot.
- `docs/concept.md` : renvoi vers la V2 pour les sections remplacées.
- `docs/decisions.md` : décision sur le revamp.

### Préparation de la démo et documentation de lancement | 8.02-8.04 | T.BE

- `client/src/style.css` : boutons du mode démo en haut au centre, ils passaient sous les boutons de formation sur téléphone.
- `README.md` : présentation du jeu, installation, lancement, contrôles, vérifications et structure.
- `docs/demo.md` : préparation, déroulé de la présentation et plan B.
- `docs/load-test.md` : mesure indicative côté client sur écran de téléphone simulé.

### Contenu bonus | 7.01-7.06 | G.WI

- `shared/src/config/schema.ts` : apparences du mage, vitesse des objets, bombardements, nombre de lobbys et spectateurs, son et couleurs des bombardements, apparences et bombardements envoyés au client.
- `shared/config/units.json` : chien zombie, molosse, cerbère, chien de garde.
- `shared/config/equipment.json` : collier à clous, collier en os, chaîne de Cerbère.
- `shared/config/world.json` : chiens de garde dans les camps, colliers dans les tables de butin, bombardements.
- `shared/config/gameplay.json`, `lobby.json`, `client.json` : quatre apparences du mage, 3 lobbys et 4 spectateurs au plus, son d'explosion, décalage des colliers, couleurs des zones.
- `shared/src/registry.ts` : registre des apparences.
- `shared/src/protocol/messages.ts` : apparence dans l'entrée en jeu, message d'entrée en spectateur, message de cible suivie, genre bombardement, identifiant de mage du spectateur.
- `server/src/world/world.ts` : apparence de l'armée, bombardements et prochaine vague.
- `server/src/world/loop.ts` : système des bombardements, arrêt de la boucle possible pendant un tick.
- `server/src/systems/bombings.ts` : vagues de zones sur les armées, explosion selon la densité de chaque armée.
- `server/src/systems/equipment.ts`, `formation.ts` : bonus de vitesse de l'objet porté.
- `server/src/systems/army.ts` : armée créée avec son apparence.
- `server/src/lobby/lobby.ts` : apparence à l'entrée et au retour, test de place libre, reprise possible, joueurs présents.
- `server/src/lobby/lobbies.ts` : ouverture et fermeture des lobbys, choix du lobby d'un joueur.
- `server/src/net/spectate.ts` : choix de la cible suivie par un spectateur.
- `server/src/net/interest.ts` : apparence comme type du mage, compte à rebours des bombardements, vue sans armée.
- `server/src/net/sockets.ts` : config à la connexion, sessions rattachées à leur lobby, spectateurs.
- `server/src/main.ts`, `server/scripts/load-test.ts` : lancement par les lobbys, faux clients qui attendent la bienvenue.
- `client/src/net/connection.ts` : connexion au chargement de la page, entrée en jeu ou en spectateur, cible suivie.
- `client/src/main.ts`, `home.ts`, `game/preview.ts` : choix de l'apparence avec son sprite, bouton de spectateur.
- `client/src/game/game.ts`, `hud.ts` : caméra sur la cible suivie, interface du spectateur, zones de bombardement.
- `client/src/game/bombings.ts`, `audio/cues.ts` : zones, explosion et son d'explosion.
- `client/src/game/sprites.ts`, `entities.ts` : sprite selon l'apparence, bombardements hors des sprites.
- `client/src/style.css` : apparences, bouton de spectateur, interface du spectateur, écran d'accueil sur petit écran.
- `client/public/atlas/` : bêtes, chien de garde, colliers, apparences du mage.
- `client/public/audio/` : explosion.
- `docs/deploy.md`, `docs/credits.md`, `docs/load-test.md` : spectateur sur le projecteur, lobbys, crédits, mesures de la phase 7.
- `server/tests/`, `shared/tests/`, `client/tests/` : bêtes, colliers, bombardements, lobbys, apparences, spectateur, protocole, registres.

### Correctifs de la phase 6 | 6.01-6.07 | A.PI

- `server/src/systems/projectiles.ts` : un projectile tiré de l'extérieur d'une croix active brûle aussi s'il atteint une cible qui s'y trouve, au lieu de la toucher depuis le bord.
- `server/src/systems/tactics.ts`, `shared/src/registry.ts` : une formation n'est reconnue que si elle est une clé propre de `formations.json` (une clé héritée comme `toString` est refusée).
- `server/tests/`, `shared/tests/` : cible dans une croix active, formation de clé héritée.
- `docs/load-test.md`, `docs/decisions.md` : nouveau passage du test de charge, règle du projectile précisée.

### Contenu V1 | 6.01-6.14 | A.PI

- `shared/src/config/schema.ts` : lignée et bonus de lignée des unités, projectiles, casques (PV et armure), récompense en unités, brumes, camps, formations (placement, vitesse, défense, impact, garde), prime, réglages des bots V1, décalage d'objet par catégorie, couleurs des brumes, touches de formation, réduction de la popup d'évolution, contenu envoyé au client.
- `shared/config/units.json` : golem de chair, squelette archer, arbalétrier squelette, baliste d'os, chasseur, soldat, quatre projectiles, lignées et triangle de force.
- `shared/config/equipment.json` : casque de cuir, casque de fer, heaume maudit.
- `shared/config/world.json` : cimetières, coffre de camp, casques dans les voitures et les coffres, deux brumes de chaque sorte, trois camps.
- `shared/config/formations.json` : formation neutre, phalange, coin, cercle et nuée, changement en 1,5 s.
- `shared/config/events.json`, `lobby.json`, `client.json` : prime de 100 âmes, camps, prime et formations des bots, réglages du client.
- `shared/src/registry.ts` : registres des projectiles et des brumes, vérification des projectiles, des unités des cimetières, des défenseurs et du coffre des camps, des formations des bots.
- `shared/src/protocol/messages.ts` : genres projectile, brume et camp, formation et changement en cours dans l'état du joueur, prime dans le classement.
- `server/src/world/world.ts` : formation de l'armée, instant du contact des unités, camp des PNJ, projectiles, brumes et camps, PV max avec le casque.
- `server/src/systems/projectiles.ts` : projectiles à tête chercheuse, brûlés en entrant dans une croix active.
- `server/src/systems/tactics.ts` : choix et changement de formation, effets de la formation en cours.
- `server/src/systems/formation.ts` : placements en bloc, en coin, en cercles et en nuée.
- `server/src/systems/mists.ts` : dérive, dégâts de la brume purificatrice, délai de la brume nécrotique.
- `server/src/systems/camps.ts` : camps et défenseurs, coffre à la destruction, départ une fois la durée écoulée.
- `server/src/systems/combat.ts`, `death.ts`, `hostiles.ts` : bonus de lignée, bonus d'impact du coin, tirs des unités et des PNJ à distance, défense de la formation et armure du casque.
- `server/src/systems/equipment.ts`, `points.ts` : armure et PV du casque, récompense en unités des cimetières.
- `server/src/systems/mage.ts`, `enlist.ts`, `reanimation.ts`, `battle.ts` : garde toujours pleine en cercle, prime, formation neutre à la mort, vitesse de la formation, délai de la brume nécrotique, camp comme force engagée.
- `server/src/world/loop.ts` : systèmes des formations, projectiles, brumes et camps.
- `server/src/lobby/bots.ts` : formations selon la situation, attaque des camps, chasse à la prime.
- `server/src/net/interest.ts`, `sockets.ts` : nouveaux genres dans le snapshot, brumes toujours envoyées, ordre de formation, formation dans l'état du joueur, prime dans le classement.
- `client/src/formations.ts` : boutons et touches 1 à 4, formation active et changement en cours.
- `client/src/evolution.ts` : toutes les évolutions avec la progression des inaccessibles, réduction dans un coin, retour à chaque palier.
- `client/src/game/mists.ts` : brumes.
- `client/src/game/entities.ts`, `sprites.ts` : projectiles orientés, camps, objet placé selon sa catégorie.
- `client/src/minimap.ts`, `net/connection.ts`, `game/game.ts`, `style.css` : prime sur la minimap, branchement des nouveaux éléments.
- `client/public/atlas/` : squelettes, golem, baliste, chasseur, soldat, projectiles, casques, cimetière, coffre de camp et camp, atlas agrandi à 512 x 512.
- `docs/concept.md` : formation neutre, coffre des camps, brume qui blesse le mage.
- `docs/load-test.md` : mesures de la phase 6.
- `server/tests/`, `shared/tests/`, `client/tests/` : projectiles, lignée, évolutions, casques, cimetières, camps, brumes, prime, formations, bots, protocole, registres, popup, touches.

### Monde et équipement du MVP | 5.01-5.13 | L.BA

- `shared/src/config/schema.ts` : équipement (raretés, objets, bonus de dégâts), catégorie et nom des unités, tables de loot, croix sacrées, plafond et ralentissement de l'armée, délai de relève après une croix, butin du boss, marge des bots autour des croix, durée de la notification de butin et taille de la minimap, contenu envoyé au client.
- `shared/config/equipment.json` : pelle, batte de cricket et tronçonneuse.
- `shared/config/units.json` : gros zombie, évolution du zombie à 5 unités, catégorie d'arme de la lignée.
- `shared/config/world.json` : voitures et coffres avec leurs tables de loot, 8 croix sacrées.
- `shared/config/gameplay.json`, `events.json`, `lobby.json`, `client.json` : plafond de 150 et ralentissement de 60 à 150 unités, relève à 60 s après une croix, butin de la citrouille, marge des bots, notification et minimap.
- `shared/src/registry.ts` : vérification des tables de loot, du butin du boss et du nombre d'objets par catégorie.
- `shared/src/protocol/messages.ts` : croix comme genre d'entité, 3 bits de niveau génériques, progression de fouille, compteurs d'unités évolutives et force dans les croix dans l'état du joueur, message de butin.
- `server/src/world/world.ts` : objet porté par les unités et les cadavres, inventaire et butin du tick, restes avec leur objet, croix sacrées.
- `server/src/systems/equipment.ts` : rang des objets, équipement de la meilleure unité libre, tirage pondéré, bonus de dégâts.
- `server/src/systems/enlist.ts` : entrée d'une unité dans l'armée, surplus converti en âmes, ralentissement.
- `server/src/systems/evolution.ts` : sacrifice des unités les plus proches du mage, objet gardé, compteurs.
- `server/src/systems/crosses.ts` : placement, force par armée, déclenchement, recharge et déplacement.
- `server/src/systems/points.ts`, `death.ts`, `reanimation.ts`, `mage.ts`, `combat.ts`, `demo.ts` : objet conservé à la mort, à la relève, au transfert et au charnier, butin des voitures et coffres, délai propre aux cadavres d'une croix, plafond au transfert, inventaire perdu à la mort, dégâts de l'arme.
- `server/src/systems/events.ts` : un objet par contributeur et légendaire tiré selon la contribution.
- `server/src/systems/movement.ts`, `formation.ts`, `orders.ts` : ralentissement du mage et des unités, ordre d'évolution.
- `server/src/world/loop.ts` : systèmes d'équipement et de croix.
- `server/src/lobby/bots.ts`, `lobby.ts` : évolution, détour autour des croix, charnier avec les objets.
- `server/src/net/interest.ts`, `sockets.ts` : objet porté et recharge des croix dans les drapeaux, état du joueur étendu, message de butin, ordre d'évolution.
- `server/scripts/load-test.ts` : option `--bots`.
- `client/src/game/entities.ts`, `sprites.ts` : arme sur l'unité, croix au sol.
- `client/src/game/crosses.ts` : zone, recharge et force du joueur sur chaque croix.
- `client/src/game/search.ts` : barre de progression de la fouille.
- `client/src/evolution.ts`, `loot.ts`, `minimap.ts` : popup d'évolution, notification du butin, minimap.
- `client/src/game/game.ts`, `events.ts`, `net/connection.ts`, `style.css` : branchement des nouveaux éléments.
- `client/public/atlas/` : gros zombie, armes, voiture, coffre et croix.
- `server/tests/`, `shared/tests/`, `client/tests/` : équipement, loot, butin du boss, évolution, plafond, ralentissement, croix, bots, protocole.
- `docs/plan.md` : 5.13 limité à la mesure serveur, test sur téléphone en 5.14.
- `docs/concept.md` : surplus du plafond étendu aux unités transférées.
- `docs/load-test.md` : mesures de la phase 5.

### Taille du charnier selon son contenu | 4.06 | A.PI

- `shared/src/protocol/messages.ts` : niveau de taille de 0 à 7 dans les 3 bits libres des drapeaux.
- `shared/src/config/schema.ts`, `shared/config/client.json` : agrandissement du sprite par niveau (25 %).
- `server/src/net/interest.ts` : niveau d'un point d'intérêt selon le nombre de cadavres qu'il contient.
- `client/src/game/entities.ts` : sprite agrandi selon le niveau, test de visibilité sur la taille affichée.
- `server/tests/`, `shared/tests/` : niveau selon le contenu, lecture et écriture du niveau.

### Règles de bataille et de nécromancie, réduction du débit | 4.01-4.15 | A.PI

- `shared/src/config/schema.ts` : réglages de bataille, Lien d'âme, transfert, retraite, retour au mage, combat des bots, touche de retraite et pulsation du cercle.
- `shared/config/gameplay.json` : engagement à 8 m, marge de 8 m, fin de bataille après 1 s, secteur libre de 60°, garde de 6 m, 80 % transférés, 8 % de PV par seconde, transfert de 70 %, tunnel et escorte, retour à x2,5.
- `shared/config/lobby.json` : portée d'attaque, rapports de force pour attaquer et fuir, secteur d'alerte et distance de fuite des bots.
- `shared/config/client.json` : touche R et pulsation du cercle d'aggro.
- `shared/src/protocol/messages.ts` : drapeaux en attente et abandonnée, état de bataille et cercles d'aggro dans l'état du joueur, snapshot en delta (nouvelles entités, mises à jour, retraits).
- `server/src/world/world.ts` : bataille, retraite et groupes abandonnés de l'armée, groupe d'une unité ou d'un cadavre, retour au mage, budget de perte de PV du mage.
- `server/src/systems/battle.ts` : forces engagées déduites des cibles (armées, groupes abandonnés, PNJ hostiles), fin de bataille, encerclement et secteur de fuite, issue des groupes abandonnés, cercles d'aggro et blocage du mage.
- `server/src/systems/retreat.ts` : ordre de retraite, abandon des unités au contact, transfert des cadavres de la bataille, murs du tunnel, ailes qui coupent la route, repli rangée par rangée, escorte.
- `server/src/systems/transfer.ts` : changement de camp d'une unité ou d'un cadavre.
- `server/src/systems/mage.ts` : transfert de 70 % de l'armée au tueur et charnier pour le reste, garde du Lien d'âme, plafond de perte de PV par seconde.
- `server/src/systems/death.ts` : part des dégâts du mage reportée sur la garde, cadavre marqué pour une unité abandonnée.
- `server/src/systems/targeting.ts`, `server/src/systems/hostiles.ts` : le mage n'est visé que si aucun autre ennemi n'est à portée, laisse des unités abandonnées autour de leur point d'abandon.
- `server/src/systems/formation.ts` : places du tunnel, unités abandonnées qui tiennent leur position, retour accéléré vers sa place.
- `server/src/systems/movement.ts`, `server/src/systems/orders.ts` : mage bloqué dans le cercle d'aggro, fin de la retraite au point de sortie, un déplacement annule la retraite.
- `server/src/systems/reanimation.ts` : pas de réanimation en bataille ni pour un cadavre en attente de l'issue d'un groupe abandonné.
- `server/src/systems/strength.ts` : force d'un corps et d'une liste de corps.
- `server/src/world/loop.ts` : système de bataille après le combat.
- `server/src/lobby/bots.ts` : fuite par la retraite face à plus fort ou avant d'être encerclé, attaque d'une armée plus faible.
- `server/src/net/delta.ts` : delta de snapshot par joueur par rapport au dernier envoi.
- `server/src/net/interest.ts` : drapeaux en attente et abandonnée.
- `server/src/net/sockets.ts` : ordre de retraite, état de bataille et cercles envoyés, snapshots en delta.
- `client/src/net/snapshots.ts`, `client/src/net/connection.ts` : état complet reconstruit à partir des deltas.
- `client/src/game/battle.ts` : cercle d'aggro rouge pulsant, flèche de retraite.
- `client/src/retreat.ts` : bouton Retraite et touche R, choix du point de sortie, bouton grisé hors bataille ou encerclé.
- `client/src/game/entities.ts` : âme seulement sur les cadavres en attente, drapeau en berne sur les unités abandonnées.
- `client/src/game/game.ts`, `client/src/style.css` : branchement de la retraite et de l'affichage de la bataille.
- `client/public/atlas/` : drapeau en berne.
- `docs/load-test.md` : mesures de la phase 4.
- `docs/concept.md` : bataille contre les PNJ hostiles, mort du mage sans armée tueuse.
- `server/tests/`, `shared/tests/`, `client/tests/` : bataille, cercle, encerclement, réanimation bloquée, Lien d'âme, transfert, retraite, groupes abandonnés, retour, tunnel, bots, delta, drapeaux et protocole.

### Références aux films et mode démo | 3.07-3.08 | G.WI

- `shared/src/config/schema.ts` : décor à position fixe, réglages et touches du mode démo.
- `shared/config/world.json` : pub *Winchester* près du centre de la carte.
- `shared/config/gameplay.json` : nom du tueur du screamer de démo, événement et distance de la citrouille, unités ajoutées.
- `shared/config/client.json` : touches K, P et U du mode démo.
- `shared/src/registry.ts` : vérification de l'événement et de l'unité du mode démo.
- `shared/src/protocol/messages.ts` : commandes de démo (screamer, citrouille, unités), commande inconnue refusée.
- `server/src/env.ts`, `server/src/main.ts` : variable `DEMO_MODE` lue et transmise aux sockets.
- `server/src/systems/demo.ts` : mort du mage, citrouille près du mage, unités ajoutées.
- `server/src/net/sockets.ts` : commandes de démo exécutées seulement en mode démo.
- `client/src/demo.ts`, `client/src/style.css`, `client/src/game/game.ts` : boutons et raccourcis clavier avec `?demo=1`.
- `client/src/game/decor.ts` : décor à position fixe.
- `client/public/atlas/` : pub *Winchester*.
- `docs/credits.md`, `docs/deploy.md` : références aux films, lancement en mode démo.
- `server/tests/`, `shared/tests/`, `client/tests/` : commandes de démo avec et sans mode démo, décor fixe, touches.

### Citrouille maléfique | 3.04-3.06 | G.WI

- `shared/src/config/schema.ts` : PNJ hostiles (nom, attaque, cadavre et fuite optionnels, vitesse nulle possible), événements de boss, annonce et flèche du client, liste des événements envoyée au client.
- `shared/config/units.json` : Citrouille maléfique immobile, citrouilles-lanternes, nom de chaque PNJ.
- `shared/config/events.json` : événement `pumpkin` toutes les 6 min (première apparition après 2 min), 3 min de durée de vie, invocations, 200 âmes de récompense.
- `shared/config/client.json` : son du boss, durée de l'annonce, marge de la flèche.
- `shared/src/registry.ts` : vérification du boss et du sbire de chaque événement, vitesse de fuite obligatoire pour une population, cadavre optionnel.
- `shared/src/protocol/messages.ts` : messages de début (position du boss) et de fin d'événement (victoire, âmes gagnées).
- `server/src/world/world.ts` : PNJ d'événement avec point d'attache, cible et recharge, liste des PNJ hostiles, état des événements.
- `server/src/systems/events.ts` : apparition loin des mages, invocation des lanternes, fin à la mort ou après la durée de vie, contribution relative, âmes au prorata.
- `server/src/systems/hostiles.ts` : ciblage, poursuite en laisse et attaque des PNJ hostiles.
- `server/src/systems/death.ts`, `server/src/systems/mage.ts` : contribution enregistrée à chaque coup sur le boss, nom du PNJ tueur, PNJ sans cadavre.
- `server/src/systems/separation.ts`, `server/src/systems/bodies.ts` : un PNJ immobile repousse les corps sans bouger, rayon de recherche limité aux corps mobiles.
- `server/src/systems/civilians.ts` : vitesse de fuite lue avec la vitesse normale par défaut.
- `server/src/lobby/bots.ts` : les bots ne chassent que les PNJ non hostiles.
- `server/src/net/interest.ts` : drapeau de combat des PNJ.
- `server/src/net/sockets.ts` : début et fin d'événement envoyés à chaque joueur, y compris à son arrivée.
- `server/src/world/loop.ts` : systèmes des événements et des PNJ hostiles.
- `client/src/events.ts`, `client/src/style.css` : annonce à l'écran, flèche au bord de l'écran vers le boss.
- `client/src/net/connection.ts`, `client/src/game/game.ts` : réception des événements, son du boss, bascule sur la couche musicale du boss.
- `client/public/atlas/` : atlas agrandi à 512 x 256, Citrouille maléfique et citrouilles-lanternes.
- `server/tests/`, `shared/tests/`, `client/tests/` : apparition, invocations, fin sans récompense, partage des âmes, PNJ hostiles, boss immobile, messages d'événement, bots, flèche et annonces.

### Audio, musique dynamique et screamer | 3.01-3.03 | G.WI

- `shared/src/config/schema.ts` : volumes, fondu, couches de musique, effets (volume et écart minimal), réglages du screamer.
- `shared/config/client.json` : chemins des sons, volumes, screamer de 0,8 s avec vibration.
- `shared/src/registry.ts` : vérification que la réapparition du mage dure plus longtemps que le screamer.
- `client/src/audio/engine.ts` : moteur Web Audio, déblocage au clic sur Play, pause quand la page est cachée, effets limités dans le temps.
- `client/src/audio/music.ts` : couches exploration, combat et boss jouées en boucle et synchronisées, fondus entre elles.
- `client/src/audio/cues.ts` : coups, morts et relèves visibles déduits des snapshots.
- `client/src/screamer.ts`, `client/src/style.css` : visage plein écran qui tremble, cri et vibration, puis écran de mort.
- `client/src/main.ts`, `client/src/game/game.ts` : déblocage de l'audio, musique selon les unités qui se battent, effets, screamer à la mort.
- `client/public/audio/`, `client/public/screamer/` : musiques, effets et visage générés par script.
- `docs/credits.md` : sons et visage générés.
- `shared/tests/`, `client/tests/` : config du client, délai de réapparition, mélange des couches, limite des effets, détection des coups, morts et relèves.

### Infection des civils, clic gauche et clics bloqués par le HUD | 2.07-2.17 | L.BA

- `shared/src/config/schema.ts`, `shared/config/units.json` : option `infects` des PNJ, activée pour le civil.
- `server/src/systems/death.ts` : un PNJ qui infecte devient une unité de son tueur sur place, sans cadavre.
- `client/src/game/game.ts` : déplacement et attaque au clic gauche.
- `client/src/style.css` : le HUD et l'écran de mort laissent passer les clics vers le canvas.
- `client/index.html` : message de rotation masqué avant le chargement de la CSS.
- `docs/concept.md` : infection des civils, contrôles au clic gauche.
- `server/tests/`, `shared/tests/` : infection immédiate, PNJ sans infection.

### HUD et test de charge | 2.17-2.18 | L.BA

- `shared/src/protocol/messages.ts` : message d'état du joueur (armée, PV, niveau, âmes, unités, force).
- `server/src/net/sockets.ts` : état du joueur envoyé avec chaque snapshot.
- `server/src/systems/targeting.ts` : intervalle de ciblage tiré au hasard pour étaler la charge sur les ticks.
- `server/src/world/loop.ts` : somme et nombre de ticks pour le temps moyen.
- `server/scripts/load-test.ts` : serveur et faux clients dans deux processus, mesure du temps de tick et du débit par client.
- `server/package.json`, `server/tsconfig.json` : script `load-test` et ses paramètres, dossier `scripts` vérifié.
- `client/src/hud.ts`, `client/src/leaderboard.ts`, `client/src/style.css` : PV et niveau du mage, taille et force de l'armée, classement en direct.
- `client/src/net/connection.ts`, `client/src/game/game.ts` : réception de l'état du joueur.
- `client/src/game/picking.ts` : un mage ennemi peut être choisi comme cible.
- `server/src/world/world.ts` : retrait d'une fonction inutilisée.
- `docs/load-test.md` : méthode et résultats.
- `docs/plan.md` : étape 4.15 de réduction du débit.
- `docs/concept.md` : âmes et niveau perdus à la mort du mage.
- `shared/tests/`, `client/tests/` : message d'état, lignes du classement.

### Lobby, bots, diffusion de la config et classement | 2.13-2.16 | L.BA

- `shared/src/config/schema.ts` : minimum, maximum (254 au plus) et délai de grâce du lobby, réglages des bots et du classement.
- `shared/config/lobby.json` : 12 à 40 participants, 60 s de grâce, noms des bots tirés des films de zombies.
- `shared/src/protocol/messages.ts` : jeton de reprise dans l'entrée en jeu et la bienvenue, refus pour lobby plein, message de classement.
- `shared/src/protocol/bytes.ts` : correction de l'écriture qui tombait hors du tampon quand il devait s'agrandir.
- `server/src/lobby/lobby.ts` : bots ajoutés jusqu'au minimum, remplacement du bot le plus faible par un charnier, refus au-delà du maximum, reprise par un bot à la déconnexion, retour avec le jeton pendant le délai de grâce.
- `server/src/lobby/bots.ts` : machine à états des bots (piller, chasser les civils, errer) avec les commandes d'un joueur.
- `server/src/lobby/leaderboard.ts` : classement par force totale, top 10 et rang de chaque armée.
- `server/src/world/world.ts` : armée pilotée par un bot, jetons de reprise.
- `server/src/net/sockets.ts`, `server/src/main.ts` : entrée par le lobby, classement périodique, config renvoyée après chaque rechargement.
- `client/src/net/connection.ts` : jeton gardé dans le navigateur, config et classement reçus en cours de partie.
- `client/src/game/game.ts`, `client/src/game/interpolation.ts` : délai d'interpolation et carte mis à jour au rechargement.
- `client/src/home.ts` : message de lobby plein.
- `server/tests/`, `shared/tests/` : lobby, bots, classement, sockets, agrandissement du tampon, banc de la grille mesuré sur le meilleur passage.

### Mort du mage, rendu du combat et points d'intérêt | 2.09-2.12 | L.BA

- `shared/src/config/schema.ts` : régénération et réapparition du mage, durée de relève, types de points d'intérêt et charnier, durées d'animation du client.
- `shared/config/` : réapparition après 3 s loin des armées de force 20, régénération de 4 PV/s après 5 s sans dégât, charnier.
- `shared/src/registry.ts` : vérification du type de charnier.
- `shared/src/protocol/messages.ts` : entité de point d'intérêt, drapeaux combat, relève et déjà fouillé, message de mort du mage.
- `server/src/world/world.ts` : état de vie de l'armée, nom du tueur, fouille en cours, points d'intérêt.
- `server/src/systems/mage.ts` : dégâts au mage, mort, réapparition loin des grosses armées, régénération hors combat.
- `server/src/systems/strength.ts` : force totale d'une armée.
- `server/src/systems/points.ts` : fouille à proximité interrompue par une attaque, une fouille par armée, durée de vie et réapparition ailleurs, charnier qui réanime ses cadavres pour le premier pilleur.
- `server/src/systems/targeting.ts`, `server/src/systems/combat.ts` : le mage ennemi devient une cible, état de combat de chaque unité.
- `server/src/net/` : drapeaux par spectateur, message de mort envoyé au joueur.
- `client/src/game/entities.ts` : animation d'attaque, animation de relève, cadavres avec leur âme, points d'intérêt, disparition du mage.
- `client/src/death.ts`, `client/src/style.css` : écran de mort jusqu'à la réapparition.
- `client/src/net/connection.ts` : réception de la mort du mage.
- `server/tests/`, `shared/tests/`, `client/tests/` : mort et réapparition, régénération, fouille, charnier, drapeaux.

### Civils, combat, cadavres et âmes | 2.05-2.08 | L.BA

- `shared/src/config/schema.ts` : statistiques de combat des unités, PNJ, populations, combat, réanimation, âmes et niveaux, PV du mage, rayon de sélection d'un ennemi.
- `shared/config/` : civil, population de 150 civils, PV et dégâts du zombie, délai de réanimation de 30 s, coût des niveaux.
- `shared/src/registry.ts` : vérification du PNJ de chaque population.
- `shared/src/protocol/messages.ts` : entités de PNJ et de cadavre.
- `server/src/world/world.ts` : PNJ et groupes, cadavres avec propriétaire et tueur, PV des unités et du mage, âmes et niveau de l'armée.
- `server/src/world/grid.ts` : éléments stockés directement dans les cellules, plus rapide sur les requêtes.
- `server/src/world/spawn.ts` : choix d'un point loin des mages.
- `server/src/systems/civilians.ts` : groupes qui errent et fuient les armées, population maintenue.
- `server/src/systems/targeting.ts` : ciblage échelonné de l'ennemi le plus proche, laisse autour du mage, ordre d'attaque.
- `server/src/systems/combat.ts` : poursuite et attaques selon la cadence et les dégâts du registre.
- `server/src/systems/death.ts` : mort d'une unité ou d'un PNJ, âmes du tueur, cadavre.
- `server/src/systems/reanimation.ts` : relève près du mage propriétaire après le délai.
- `server/src/systems/souls.ts` : niveau selon les âmes, PV max selon le niveau.
- `server/src/systems/orders.ts` : ordres de déplacement et d'attaque.
- `server/src/net/` : ordre d'attaque, PNJ et cadavres dans le snapshot.
- `client/src/game/picking.ts`, `client/src/game/game.ts` : clic ou tap sur un ennemi pour l'attaquer.
- `client/src/game/marker.ts` : marqueur rouge pour un ordre d'attaque.
- `server/tests/`, `shared/tests/`, `client/tests/` : civils, ciblage, combat, cadavres, réanimation, âmes, sélection d'un ennemi.

### Armées, suivi du mage et carte | 2.01-2.04 | L.BA

- `shared/src/config/schema.ts` : armée de départ, rayon du mage, séparation, placement par défaut, statistiques de déplacement des unités, décor, palette d'auras et durées d'animation, types d'unités envoyés au client.
- `shared/config/` : zombie, armée de départ de 5 zombies, placement par défaut, décor, cellules de grille de 4 m, palette d'auras.
- `shared/src/registry.ts` : position de chaque type dans son registre, vérification de l'armée de départ.
- `shared/src/random.ts` : générateur pseudo-aléatoire avec graine, partagé par le serveur et le client.
- `shared/src/protocol/messages.ts` : entité d'unité, snapshot à 12 octets par entité (type, armée, drapeaux).
- `server/src/world/world.ts` : armées avec un emplacement unique, mage orienté, unités typées.
- `server/src/systems/army.ts` : apparition d'une armée avec ses unités de départ autour du mage.
- `server/src/systems/formation.ts` : places par défaut relatives au mage, steering vers sa place.
- `server/src/systems/separation.ts` : séparation des unités entre elles et avec les mages.
- `server/src/systems/movement.ts` : orientation du mage vers sa cible.
- `server/src/net/` : une armée par joueur, type et armée de chaque entité dans le snapshot.
- `client/src/game/entities.ts` : sprites par type, aura colorée par armée, grimoire flottant, orientation et marche.
- `client/src/game/map.ts`, `client/src/game/decor.ts` : sol, décor placé depuis la graine de config, bords de la carte.
- `client/src/game/sprites.ts` : animations lues dans l'atlas, couleur d'armée.
- `client/public/atlas/` : atlas provisoire de la phase 2 (marche, attaque, grimoire, aura, âme, cadavre, charnier, décor).
- `server/tests/`, `shared/tests/`, `client/tests/` : armée de départ, places, suivi, séparation, protocole, animations, décor.

### Socle technique de la phase 1 | 1.04-1.18 | T.BE

- `shared/src/config/schema.ts` : clés de la phase 1 (mage, monde, lobby, réseau, client), registres de contenu, sous-ensemble de config envoyé au client, liste des valeurs structurelles.
- `shared/config/` : valeurs de départ de la phase 1.
- `shared/src/registry.ts` : registres d'unités, de PNJ, d'objets, de points d'intérêt et d'événements, vérification des références.
- `shared/src/protocol/` : lecture et écriture binaires, quantification des positions, messages client et serveur.
- `server/src/env.ts` : validation des variables d'environnement.
- `server/src/config/watch.ts` : rechargement à chaud avec anti-rebond, valeurs structurelles conservées.
- `server/src/world/` : monde, grille spatiale, boucle de tick avec mesure de durée.
- `server/src/systems/movement.ts` : déplacement du mage vers sa cible, arrêt aux bords.
- `server/src/lobby/name.ts` : validation du pseudo.
- `server/src/net/` : fichiers statiques, WebSocket, gestion d'intérêt et envoi des snapshots.
- `server/src/main.ts` : assemblage du serveur.
- `server/tests/` : banc de test de la simulation et tests du serveur.
- `shared/tests/` : tests des registres et du protocole.
- `client/index.html`, `client/share.html` : page du jeu et page du QR code.
- `client/vite.config.ts` : redirection du WebSocket en développement, build des deux pages.
- `client/src/home.ts` : écran d'accueil avec la citation.
- `client/src/net/connection.ts` : connexion, entrée en jeu, réception des snapshots.
- `client/src/game/` : rendu PixiJS, interpolation, pool de sprites, marqueur de clic, caméra et contrôles.
- `client/src/share.ts` : QR code de l'URL courante.
- `client/tests/` : tests de l'interpolation.
- `client/public/atlas/` : atlas de formes provisoires.
- `package.json` : scripts `dev` (serveur et Vite) et `demo`.
- `.env.example` : variables du serveur.
- `docs/deploy.md`, `docs/credits.md` : lancement de la démo et crédits.

### Chargement et validation de la config | 1.03 | T.BE

- `shared/src/config/schema.ts` : schéma zod strict par fichier, marquage des valeurs structurelles.
- `shared/config/` : les 9 fichiers JSON, avec `tickRate`, `interpolationDelayMs` et `maxPixelRatio`.
- `docs/concept.md`, `docs/plan.md` : chemin du schéma mis à jour.
- `shared/tsconfig.build.json` : build séparé du typecheck, qui inclut les tests.
- `server/src/config/load.ts` : lecture et validation de chaque fichier, erreur claire avec le fichier et la clé.
- `server/src/main.ts` : chargement de la config au démarrage depuis `CONFIG_DIR`.
- `server/package.json` : chargement du `.env` en développement, dépendance zod.
- `.env.example` : variable `CONFIG_DIR`.
- `shared/tests/config/`, `server/tests/config/` : tests du marquage structurel et du chargement.

### Initialisation technique et CI | 1.01-1.02 | T.BE

- `package.json` : workspaces `shared`, `server` et `client`, scripts `dev`, `build`, `lint`, `format`, `typecheck` et `test`, outillage en versions exactes.
- `tsconfig.base.json` : options TypeScript strictes communes, condition `development` pour lire `shared/` depuis ses sources.
- `shared/` : paquet `@horde/shared`, sources en développement et `dist/` une fois compilé.
- `server/` : paquet `@horde/server`, `tsx watch` en développement, build `tsc` vers `dist/`.
- `client/` : paquet `@horde/client`, typecheck seul en attendant Vite (1.11).
- `eslint.config.js` : typescript-eslint en mode strict avec typage.
- `.prettierrc.json`, `.prettierignore` : Prettier par défaut, Markdown exclu.
- `vitest.config.js` : tests dans `*/tests/`.
- `.nvmrc`, `.env.example` : Node 24, variables `PORT` et `DEMO_MODE`.
- `.github/workflows/ci.yml` : lint, typecheck, tests et build sur chaque push.

