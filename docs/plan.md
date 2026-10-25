# Plan

Format : voir `ressources/exemples/plan.md`. Les étapes sont numérotées `X.YY` (phase `X`, étape `YY`). Ce numéro sert de version dans `docs/history.md` et dans les messages de commit.

Chaque étape indique le rôle qui la porte : P1 réseau et serveur, P2 règles de jeu, P3 client, P4 monde et ambiance (voir `docs/concept.md` §12). Le rôle donne le domaine, un membre libre peut prendre une étape d'un autre rôle. Une branche peut regrouper plusieurs étapes.

Une étape ne dépend que d'étapes de numéro inférieur. Les phases donnent l'ordre logique, pas un ordre strict dans le temps : un membre peut commencer une étape d'une phase suivante dès que ses dépendances sont prêtes.

Règles communes à toutes les étapes :
- toute nouvelle valeur va dans `shared/config/` avec son schéma zod, jamais en dur dans le code ;
- tout nouveau contenu (unité, PNJ, objet, point d'intérêt, événement) est déclaré dans la config et son registre ;
- une étape qui touche la simulation, le protocole ou la config livre ses tests unitaires ;
- lint, typecheck et tests passent avant chaque push.

---

## Phase 0 : Initialisation du dépôt

Objectif : poser les règles de travail et la vision du projet.

### 0.01 Documents de départ | L.BA

Règles de travail, concept, décisions et plan.

## Phase 1 : Socle technique

Objectif : deux téléphones en 4G voient deux mages se déplacer en temps réel, via le tunnel.

### 1.01 Initialisation technique | P1

Workspaces npm `client/`, `server/` et `shared/`, TypeScript strict, ESLint et Prettier, Vitest. Scripts `dev`, `build`, `lint`, `typecheck` et `test` à la racine. `.nvmrc` (Node 24), `.env.example`, `.gitignore` complété. Versions exactes des dépendances fixées.

### 1.02 Intégration continue | P1

Workflow GitHub Actions qui lance lint, typecheck, tests et build sur chaque push.

### 1.03 Chargement et validation de la config | P1

`shared/src/config/schema.ts` avec un schéma zod par fichier, les 9 fichiers JSON du concept (§9.5) remplis avec les valeurs nécessaires à la phase 1. Les étapes suivantes ajoutent leurs propres clés et schémas. Chargement au démarrage, échec avec un message clair si un fichier est invalide, valeurs structurelles marquées dans le schéma.

### 1.04 Rechargement à chaud de la config | P1

Surveillance de `shared/config/` avec `fs.watch` et anti-rebond. Remplacement des valeurs dans l'objet de config, ancienne config conservée et erreur journalisée si le fichier est invalide, avertissement si une valeur structurelle a changé.

### 1.05 Registres de contenu | P2

Registres des types d'unités, de PNJ, d'objets, de points d'intérêt et d'événements, construits depuis la config et reconstruits au rechargement. Erreur claire sur une référence inconnue (par exemple une évolution vers un type absent).

### 1.06 Protocole binaire | P1

Messages client vers serveur (rejoindre, déplacer, cibler, formation, retraite, évoluer, démo) et serveur vers client (bienvenue, snapshot, événements ponctuels, config). Encodeur et décodeur `DataView` partagés dans `shared/`, positions quantifiées en `uint16`, tests aller-retour.

### 1.07 Serveur HTTP et WebSocket | P1

`node:http` sert `client/dist` et `ws` écoute sur le même port (variable d'environnement `PORT`). Connexion, entrée en jeu avec un pseudo validé (longueur, caractères), déconnexion propre.

### 1.08 Monde et boucle de tick | P1

Monde avec ses entités et leurs identifiants. Boucle à la fréquence de `network.json`, systèmes appelés dans un ordre fixe, mesure de la durée de chaque tick.

### 1.09 Banc de test de la simulation | P2

Outils de test : créer un monde avec une config de test, ajouter mages, unités et PNJ, avancer de N ticks, lire l'état. Toutes les règles suivantes sont testées avec.

### 1.10 Grille spatiale | P2

Grille uniforme : insertion, mise à jour, requêtes par rayon et par rectangle. Mesure du coût sur 4 000 entités.

### 1.11 Client de base | P3

Vite et PixiJS v8, canvas plein écran, densité de pixels plafonnée (`client.json`), message « rotate your phone » en portrait, couche DOM pour l'interface, connexion au WebSocket. Redirection du WebSocket vers le serveur par Vite en développement.

### 1.12 Écran d'accueil | P3

Saisie du pseudo, bouton Play (qui débloquera l'audio), citation de *La Nuit des morts-vivants*.

### 1.13 Placeholders et premier atlas | P4

Formes colorées pour le mage, le zombie, le civil, le cadavre et le sol. Premier atlas avec Free Texture Packer, convention de nommage des sprites, chargement de l'atlas par le client pendant l'écran d'accueil, création de `docs/credits.md`.

### 1.14 Déplacement du mage | P2

Intention de déplacement, mouvement vers la cible à la vitesse de config, arrêt aux bords de la carte, apparition à un endroit aléatoire.

### 1.15 Snapshots et gestion d'intérêt | P1

À chaque tick, envoi à chaque client des entités dans sa vue plus une marge (taille de vue envoyée par le client), calculées avec la grille spatiale.

### 1.16 Interpolation et rendu des entités | P3

Tampon de snapshots, interpolation avec le retard de `network.json`, pool de sprites, entités hors écran non dessinées.

### 1.17 Contrôles et caméra | P3

Clic droit ou tap sur le sol pour se déplacer, marqueur affiché tout de suite à l'endroit du clic, caméra qui suit le mage.

### 1.18 Déploiement de démo | P1

Script `demo` (build puis lancement), tunnel Cloudflare documenté dans `docs/deploy.md`, page `/share` qui affiche le QR code de l'URL courante (dépendance `qrcode`). Vérification du jalon sur deux téléphones en 4G.

## Phase 2 : Boucle de base jouable

Objectif : un joueur grossit son armée en tuant des civils, se bat contre des bots, meurt et réapparaît.

### 2.01 Unités et armée de départ | P2

Entités d'unités typées par le registre, une armée par mage, 5 zombies au départ placés autour du mage.

### 2.02 Suivi du mage | P2

Places de formation par défaut relatives au mage (mêlée lourde devant, distance derrière), steering de chaque unité vers sa place, séparation entre unités avec la grille spatiale.

### 2.03 Rendu des armées | P3

Sprites du mage et des unités, couleur d'aura par armée, grimoire flottant du mage (le Necronomicon d'*Evil Dead*), orientation et animation de marche.

### 2.04 Carte et décor | P4

Sol, taille de carte depuis `world.json`, décor sans collision placé selon la config, bords visibles.

### 2.05 Civils | P4

Groupes de civils qui errent et fuient les armées proches, population maintenue par réapparition.

### 2.06 Ciblage et combat d'usure | P2

Ciblage automatique de l'ennemi le plus proche à portée, cadence et dégâts lus dans le registre, points de vie. Ordre d'attaque explicite par clic ou tap sur un ennemi.

### 2.07 Cadavres et réanimation de base | P2

Cadavre qui garde son type, son camp, son tueur et son équipement. Relève après le délai de config près du mage propriétaire, avec la correspondance cadavre vers unité (un civil donne un zombie). Les PNJ ne récupèrent jamais de cadavres.

### 2.08 Âmes et niveau du mage | P2

Âmes gagnées pour chaque ennemi tué selon sa valeur de force, niveau du mage, PV max qui augmentent avec le niveau.

### 2.09 Mort et réapparition du mage | P2

Points de vie du mage, mort, réapparition loin des grosses armées avec 5 zombies et sans équipement. Version simple : l'armée disparaît, le transfert au tueur arrive en 4.06.

### 2.10 Rendu du combat et des morts | P3

Animations d'attaque, cadavres au sol, âme qui flotte au-dessus d'un cadavre en attente, animation de relève, mort du mage.

### 2.11 Points d'intérêt : socle | P4

Type de point d'intérêt dans le registre. Fouille de 2 s à proximité, interrompue si le mage est attaqué, une seule fouille par joueur. Durée de vie aléatoire, puis réapparition ailleurs.

### 2.12 Charnier | P4

Point d'intérêt qui contient des cadavres. La fouille les réanime pour le pilleur.

### 2.13 Lobby et remplacement des bots | P1

Bots ajoutés jusqu'au minimum de `lobby.json`, refus des connexions au-delà du maximum. À l'arrivée d'un joueur, le bot qui a la plus petite force quitte la partie et ses troupes forment un charnier. À la déconnexion d'un joueur, un bot reprend son mage. S'il revient pendant le délai de grâce (jeton de reprise gardé par le navigateur), il récupère son mage et son armée.

### 2.14 Bots : errer, chasser, piller | P1

Machine à états de base : errer, chasser les civils, piller les points d'intérêt. Les bots envoient les mêmes commandes qu'un joueur.

### 2.15 Diffusion de la config aux clients | P1

Envoi des valeurs utiles au client (`client.json`, statistiques affichées) à la connexion et après chaque rechargement.

### 2.16 Classement côté serveur | P1

Calcul périodique de la force totale de chaque armée, envoi du top 10 et du rang de chaque joueur.

### 2.17 HUD | P3

Taille et force de l'armée, PV et niveau du mage, classement en direct.

### 2.18 Test de charge | P1

Script de faux clients sans rendu, connectés en WebSocket. Mesure du temps de tick et du débit par client avec 40 participants et des armées pleines. Résultats notés dans `docs/`.

## Phase 3 : Critères de la JAM

Objectif : les 4 critères fonctionnent et peuvent être déclenchés à la demande pendant la démo.

### 3.01 Moteur audio | P4

Module Web Audio : déblocage au clic sur Play, volumes de `client.json`, effets ponctuels (coups, morts, relèves).

### 3.02 Musique dynamique | P4

Couches exploration, combat et boss, avec fondus entre elles. L'intensité de la couche combat suit le nombre d'unités visibles en train de se battre (ciblage de 2.06).

### 3.03 Screamer | P4

À la mort du mage : visage plein écran et cri pendant la durée de `client.json`, vibration sur Android, puis l'écran « You were devoured by X ». Assets libres crédités.

### 3.04 Citrouille maléfique : boss | P4

Événement périodique (`events.json`) : apparition au hasard, points de vie, attaques, invocation de citrouilles-lanternes (PNJ du registre). Tous les joueurs peuvent l'attaquer, la contribution relative de chacun est suivie.

### 3.05 Citrouille maléfique : récompenses en âmes | P4

À la mort du boss, âmes distribuées au prorata de la contribution relative. L'équipement s'ajoute en 5.04.

### 3.06 Rendu de la citrouille | P3

Sprite géant, citrouilles-lanternes, annonce à l'écran, flèche vers le boss, bascule sur la couche musicale du boss.

### 3.07 Références aux films | P4

Thème au piano inspiré d'*Halloween* pour le boss, pub *Winchester* dans le décor (*Shaun of the Dead*), crédits à jour.

### 3.08 Mode démo | P1

Si `DEMO_MODE` est actif sur le serveur, `?demo=1` donne des raccourcis : screamer, apparition de la citrouille, ajout d'unités. Commandes refusées par le serveur hors mode démo.

## Phase 4 : Règles de bataille et de nécromancie

Objectif : toutes les règles du §4 du concept sont en place et testées.

### 4.01 Détection de bataille | P2

Un mage est en bataille dès qu'une unité ennemie est à moins du rayon d'engagement de lui ou de ses unités. Liste des armées engagées, fin de bataille quand plus aucun ennemi n'est engagé.

### 4.02 Cercle d'aggro | P2

Cercle autour de chaque armée ennemie engagée plus la marge, union des cercles à 3 armées ou plus. Le mage ne peut pas en sortir, un clic à l'extérieur l'amène au bord.

### 4.03 Réanimation bloquée en bataille | P2

Pas de réanimation tant que le mage est en bataille, cadavres en attente sous forme d'âme, relève à la sortie de bataille si le délai est écoulé.

### 4.04 Affichage de la bataille | P3

Cercle d'aggro au sol en rouge pulsant, âmes en attente, état du bouton Retraite.

### 4.05 Lien d'âme | P1

Garde autour du mage, part des dégâts transférée à l'unité de la garde la plus proche, plafond de perte de PV par seconde. Le mage n'est ciblé en priorité que sur ordre explicite.

### 4.06 Mort du mage complète | P2

Les troupes vivantes et les cadavres en attente passent au tueur avec leur équipement, selon la part de config (70 %). Le reste (30 %) forme un charnier. Cas des batailles à 3 armées ou plus.

### 4.07 Retraite : ordre et transferts | P2

Ordre de Retraite avec un point de sortie. Les unités au contact deviennent abandonnées, les cadavres du camp dans cette bataille passent chacun à son tueur, le mage peut sortir du cercle.

### 4.08 Unités abandonnées | P2

Combat autonome, cadavres marqués pour passer à leur tueur, marques levées si le groupe gagne, transfert de tous ses cadavres s'il est détruit. Un groupe abandonné qui gagne convertit les ennemis loin de son mage.

### 4.09 Retour au mage | P2

Un groupe hors combat et loin de son mage le rejoint avec le multiplicateur de vitesse de config, jusqu'à reprendre sa place.

### 4.10 Encerclement | P1

Recherche d'un secteur libre de l'angle de config autour de l'armée. Sans secteur libre, la Retraite est impossible et le client en est informé.

### 4.11 Tunnel de retraite : murs et escorte | P2

Placement en flèche orienté de l'ennemi vers le point de sortie, deux murs qui bloquent les ennemis sans aller au contact, mage exposé seulement par la base. Escorte simple sous le minimum d'unités non engagées.

### 4.12 Tunnel de retraite : ailes et repli | P2

Ailes qui se déplacent pour couper la route aux ennemis qui contournent, adaptation aux pertes, repli des murs de la base vers la pointe une fois le mage passé.

### 4.13 Contrôles et rendu de la Retraite | P3

Touche R et bouton Retraite séparé sur mobile, choix du point de sortie, bouton grisé si l'armée est encerclée, drapeau en berne sur les unités abandonnées, tunnel visible.

### 4.14 Bots : combat et fuite | P1

Les bots attaquent plus faible qu'eux, fuient plus fort avec la Retraite et évitent de se faire encercler.

### 4.15 Réduction du débit | P1

Débit par client ramené sous ~64 Ko/s avec 40 participants et des armées pleines (voir `docs/load-test.md`) : snapshots en delta ou à fréquence réduite, identifiants plus courts, marge d'intérêt ajustée. Nouvelle mesure avec le script de test de charge.

## Phase 5 : Monde et équipement du MVP

Objectif : le MVP du concept (§11) est complet et testé à 4 joueurs et 8 bots sur téléphone.

### 5.01 Système d'équipement | P2

Catégories par lignée, raretés et bonus, inventaire du mage. Un objet ramassé équipe la meilleure unité compatible non équipée. L'équipement est conservé à la mort, à la relève et au changement de camp.

### 5.02 Armes de mêlée | P4

Pelle, batte de cricket (*Shaun of the Dead*) et tronçonneuse (*Evil Dead*) dans `equipment.json`, avec leurs sprites.

### 5.03 Voitures et coffres | P4

Points d'intérêt avec leurs tables de loot (`world.json`).

### 5.04 Citrouille maléfique : récompenses en équipement | P4

Équipement distribué à la mort du boss, objet légendaire tiré au sort et pondéré par la contribution relative.

### 5.05 Rendu de l'équipement et du loot | P3

Arme visible sur l'unité, barre de progression de la fouille, notification du butin.

### 5.06 Évolution vers le gros zombie | P2

Commande d'évolution validée par le serveur : sacrifice de 5 zombies, meilleur équipement gardé par l'unité obtenue, le reste retourne à l'inventaire.

### 5.07 Popup d'évolution simple | P3

Apparaît à 5 unités d'un même type de base, ne met pas le jeu en pause et ne masque pas le centre de l'écran.

### 5.08 Plafond d'armée et ralentissement | P2

Plafond de 150 unités, chaque cadavre en surplus devient des âmes. Ralentissement progressif de l'armée entre 60 et 150 unités.

### 5.09 Croix sacrées | P4

Force de chaque armée dans la zone, seuil, activation qui tue les unités de cette armée dans la zone (pas le mage), relève après 1 min sans transfert, recharge de la croix.

### 5.10 Rendu des croix sacrées | P3

Zone, seuil et force du joueur (« 12 / 40 »), état de recharge.

### 5.11 Minimap | P3

Carte réduite avec la position du joueur et celle de la citrouille.

### 5.12 Bots : loot et évolution | P1

Les bots pillent voitures et coffres, font évoluer leurs troupes et contournent les croix sacrées.

### 5.13 Jalon MVP : mesure côté serveur | P1

Test de charge à 4 joueurs et 8 bots (option `--bots`), temps de tick et débit notés dans `docs/load-test.md`.

### 5.14 Jalon MVP : test sur téléphone | Tous

Partie à 4 joueurs et 8 bots via le tunnel. Mesure des fps sur téléphone, correction des problèmes trouvés.

## Phase 6 : V1

Objectif : contenu V1 du concept (§11) : squelettes, camps armés, formations, évolutions complètes, brumes et prime.

### 6.01 Projectiles | P2

Projectiles côté serveur (vitesse, portée, dégâts). Ils brûlent en entrant dans une croix sacrée active.

### 6.02 Lignée Squelettes | P2

Squelette archer et arbalétrier squelette dans `units.json`, cadavres de chasseurs et de soldats qui donnent des squelettes archers, multiplicateurs du triangle de force.

### 6.03 Évolutions à 10 unités | P2

Golem de chair et baliste d'os.

### 6.04 Casques | P4

Casque de cuir, casque de fer et heaume maudit dans `equipment.json`, avec leurs sprites.

### 6.05 Cimetières | P4

Point d'intérêt dont la fouille relève 3 à 6 squelettes archers pour le pilleur.

### 6.06 Camps humains armés | P4

Camps fixes le temps de leur durée de vie, défendus par des chasseurs et des soldats, loot à leur destruction.

### 6.07 Formations | P2

Phalange, coin, cercle et nuée : places, bonus et malus de `formations.json`, délai de changement.

### 6.08 Contrôles des formations | P3

Touches 1 à 4 sur PC, 4 boutons en bas de l'écran sur mobile, indication du changement en cours.

### 6.09 Popup d'évolution complète | P3

Toutes les évolutions du type, celles encore inaccessibles grisées avec leur progression (« Flesh golem 7/10 »), réduction dans un coin si ignorée, retour à chaque palier.

### 6.10 Brume purificatrice | P4

Nuage qui dérive lentement et blesse les morts-vivants.

### 6.11 Brume nécrotique | P4

Nuage mobile dans lequel la réanimation prend le délai réduit de config.

### 6.12 Prime | P1

Le premier du classement est visible sur la minimap de tous, le tuer rapporte un bonus d'âmes.

### 6.13 Rendu V1 | P3

Squelettes, projectiles, camps, cimetières et brumes.

### 6.14 Bots V1 | P1

Les bots utilisent les formations, pillent les cimetières, attaquent les camps et chassent la prime.

## Phase 7 : Bonus

Objectif : contenu bonus du concept (§11), si le temps le permet.

### 7.01 Lignée Bêtes | P2

Chien zombie, molosse et cerbère, chiens de garde dans les camps, triangle de force complet.

### 7.02 Colliers | P4

Collier à clous, collier en os et chaîne de Cerbère dans `equipment.json`, avec leurs sprites.

### 7.03 Bombardements | P4

Zones marquées au sol puis bombardées après le délai de config (*28 semaines plus tard*), dégâts plus forts sur les armées nombreuses et serrées.

### 7.04 Mode spectateur | P3

Vue sans mage pour le projecteur, caméra qui suit le premier du classement ou les combats.

### 7.05 Cosmétiques du mage | P3

Choix d'une apparence du mage sur l'écran d'accueil.

### 7.06 Lobbys multiples | P1

Ouverture d'un nouveau lobby quand le maximum de participants est atteint.

## Phase 8 : Finitions et démo

Objectif : commence 2 h avant le rendu, quel que soit l'avancement. Plus aucune nouvelle fonctionnalité.

### 8.01 Équilibrage | Tous

Ajustement des valeurs en pleine partie grâce au rechargement à chaud, notées dans `docs/decisions.md` si elles changent un choix.

### 8.02 Performances sur téléphone | P3

Profiling sur un vrai téléphone et corrections.

### 8.03 Documentation de lancement | P1

README : installation, lancement en développement, lancement de la démo. Crédits complets.

### 8.04 Répétition de la démo | Tous

Déroulé de la présentation, lancement du tunnel, page `/share`, raccourcis du mode démo pour montrer chaque critère.

## Phase 9 : Concept V2, Lot 1 (sensations et lisibilité)

Objectif : les cases du Lot 1 de `docs/conceptV2.md`. Les identifiants entre parenthèses renvoient à ce document.

### 9.01 Vitesse de marche commune | T.BE

Hors combat, le mage et ses unités avancent à la vitesse de la plus lente, sans accélération pour rattraper une place (MOV-01).

### 9.02 Formation qui se déplace en bloc | T.BE

Places attribuées une fois et redistribuées seulement quand la composition change. Petit déplacement : la formation se translate. Long déplacement dans une nouvelle direction : rotation progressive (MOV-02).

### 9.03 Ralentissement selon la force | T.BE

Malus logarithmique de la force brute, pour le mage et les unités, à la place du ralentissement par nombre d'unités (MOV-03).

### 9.04 Civils plus lents qui se fatiguent | T.BE

Vitesse de fuite plus basse, ralentissement après quelques secondes de fuite (MOV-04).

### 9.05 Formations instantanées avec recharge | T.BE

Changement immédiat, recharge affichée sur les boutons (MOV-05, UI-09).

### 9.06 Abandon des proies trop faibles | T.BE

Bots et PNJ hostiles lâchent une proie beaucoup plus faible au bout d'un temps qui baisse avec l'écart de force (MOV-06).

### 9.07 Fin du cercle d'aggro | T.BE

Le mage se déplace librement en bataille. L'état en bataille reste calculé (FIGHT-01).

### 9.08 Fuite libre par distance | T.BE

Le mage qui s'éloigne assez des ennemis engagés laisse sur place les unités au corps à corps, les autres le suivent. Suppression de la Retraite, du tunnel, de l'encerclement et de leurs messages. Bots adaptés (FIGHT-02).

### 9.09 Retour rapide après la victoire | T.BE

Une unité abandonnée revient vite vers son mage seulement quand son adversaire est mort (FIGHT-03).

### 9.10 Mage plus fragile | T.BE

PV de base et par niveau baissés, Lien d'âme réglé en conséquence (FIGHT-04).

### 9.11 PV des entités dans les snapshots | T.BE

Un octet de PV quantifié par corps, envoyé seulement quand il change (UI-01).

### 9.12 Barres de PV permanentes | T.BE

Petite barre sous chaque corps, plus grande pour les unités évoluées, verte pour les alliés et rouge pour les ennemis (UI-01).

### 9.13 Contours de couleur | T.BE

Vert sur les alliés, rouge sur les ennemis, jaune sur ce qui est utile (UI-02).

### 9.14 Grande barre des boss | T.BE

Barre en haut de l'écran avec le nom et les PV du boss (UI-03).

### 9.15 Plaque des mages ennemis | T.BE

Nom dans la couleur de l'armée, puissance actuelle et puissance si tout revit, barre de PV (UI-04).

### 9.16 HUD en haut au centre | T.BE

Niveau, barre d'expérience, PV du mage, puissance actuelle et si tout revit, indicateur de lenteur (UI-05).

### 9.17 Minimap agrandie et rayon de détection | T.BE

Minimap plus grande, mages ennemis visibles seulement dans un rayon qui grandit avec la puissance (UI-06).

### 9.18 Caméra qui dézoome avec la puissance | T.BE

Dézoom continu entre un minimum et un maximum, gestion d'intérêt élargie (UI-07).

### 9.19 Mesures de débit et de fps | T.BE

Test de charge et mesure côté client, résultats dans `docs/load-test.md` (TECH-01, TECH-02).

## Phase 10 : Concept V2, Lot 2 (évolution permanente)

Objectif : les cases du Lot 2 de `docs/conceptV2.md`.

### 10.01 Config des arbres, des cartes et des dons | T.BE

Schémas zod et registres : lignées, branches, paliers, ratio de fusion, dons et sorts (TECH-04).

### 10.02 XP et level up à 3 cartes | T.BE

Les âmes deviennent l'expérience. Chaque niveau propose 3 cartes tirées au hasard, pondérées par les lignées présentes (EVO-01, EVO-02).

### 10.03 Branches exclusives et mutation de lignée | T.BE

Prendre un palier ferme l'autre branche, la mutation s'applique à toute la lignée. Suppression du sacrifice et de la popup d'évolution (EVO-03, EVO-04).

### 10.04 Fusion automatique | T.BE

Les unités fusionnent seules selon le ratio, en gardant le meilleur équipement (EVO-04).

### 10.05 Force en équivalent d'unités de base | T.BE

Une unité vaut le nombre d'unités de base qu'elle représente, partout (EVO-05).

### 10.06 Transfert recalculé et réanimation au même palier | T.BE

Une unité reçue est convertie selon les mutations du receveur, une unité mutée se relève au même palier (EVO-06, EVO-07).

### 10.07 Remise à zéro à la mort et plafond après fusion | T.BE

Niveau, mutations et dons perdus à la mort, plafond compté après fusion (EVO-08, EVO-09).

### 10.08 Dons passifs | T.BE

Soin des troupes proches, réanimation plus rapide, Lien d'âme renforcé, vitesse du mage, vue, butin, PV du mage, fusion moins chère (EVO-10).

### 10.09 Sort actif | T.BE

Un emplacement de sort (Espace ou bouton) : nova nécrotique, cri de ralliement, mur d'os, relève immédiate (EVO-10).

### 10.10 Arbres Zombies, Squelettes et Bêtes | T.BE

Les 21 unités des trois lignées, avec des sprites empruntés aux unités existantes en attendant le Lot 3 (EVO-12 à EVO-14).

### 10.11 Bots qui choisissent leurs cartes | T.BE

Lignée majoritaire d'abord (EVO-11).

### 10.12 Cartes de level up côté client | T.BE

Trois cartes sans pause ni masquer le centre, en attente dans un coin pendant un combat (EVO-01).

### 10.13 Sort actif et recharges à l'écran | T.BE

Bouton et touche du sort, recharge visible (UI-09).

### 10.14 Écran de fin de run | T.BE

Statistiques de la vie après le screamer, puis Rejouer (UI-08).
