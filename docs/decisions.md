# Décisions

Format : voir `ressources/exemples/decisions.md`. Entrée la plus récente en haut.

---

### Revamp du concept : V2 en différences, par lots | L.BA

- **Quoi** : `docs/conceptV2.md` liste en cases à cocher tout ce qui change par rapport au concept V1, par thème et par lot de priorité. Choix principaux : vitesse constante et formation qui se déplace en bloc, ralentissement selon la force brute, fin du cercle d'aggro et de la Retraite au profit d'une fuite libre par distance, évolution permanente par level up à 3 cartes avec 5 lignées de 2 branches exclusives sur 3 paliers et fusion automatique des unités, tout perdu à la mort, contours vert, rouge et jaune, barres de PV permanentes, cité fortifiée maudite en pixel art d'environ 48 px sous une nuit éclairée, assets LPC, itch.io et générés, champions uniques au serveur.
- **Pourquoi** : les retours de jeu pointent des déplacements chaotiques, des poursuites sans fin, une évolution peu engageante, un visuel incohérent et des troupes difficiles à reconnaître. L'objectif est plus de constance dans la qualité et moins de répétition dans le contenu.
- **Impact** : le concept V1 reste valable pour tout ce que la V2 ne cite pas. Les listes de contenu sont une base ouverte à de nouvelles idées. Les étapes recevront un numéro `X.YY` dans `docs/plan.md` (phase 9 et suivantes) quand l'équipe les prendra.
- **Avis** : À vérifier. Les valeurs marquées comme telles dans la V2 sont à régler en jeu, et le coût réseau et rendu des barres de PV, du dézoom et des contours est à mesurer.

### Lobbys multiples ouverts à la demande | G.WI

- **Quoi** : un joueur entre dans le premier lobby qui peut l'accueillir (place libre ou bot à remplacer). Si aucun ne le peut, un nouveau lobby s'ouvre, avec son monde, sa boucle de tick et ses bots, jusqu'au maximum de `lobby.json` (3). Au-delà, le joueur est refusé. Un jeton de reprise ramène le joueur dans son lobby. Un lobby autre que le premier se ferme dès qu'il n'a plus de joueur connecté ni en délai de grâce.
- **Pourquoi** : c'est l'étape 7.06, sans changer les règles d'un lobby. La config et les registres sont partagés, le rechargement à chaud vaut pour tous.
- **Impact** : le serveur journalise l'ouverture et la fermeture des lobbys. Les spectateurs regardent toujours le premier lobby. Deux lobbys pleins partagent le même processus : le temps de tick de chacun s'ajoute.
- **Avis** : À vérifier. Le maximum de lobbys est à régler avec un test de charge à plusieurs lobbys.

### Mode spectateur depuis l'écran d'accueil | G.WI

- **Quoi** : le bouton « Watch the game » de l'écran d'accueil entre sans mage (identifiant 0 dans le message de bienvenue). Le serveur choisit qui suivre : la plus grosse bataille (force des deux camps) si elle atteint le seuil de `lobby.json`, sinon le premier vivant du classement. Il garde sa cible 8 s au moins, sauf si son mage meurt, et l'annonce au client par un message « Focus ». Le spectateur reçoit les snapshots autour de ce mage, le classement et les événements, sans état du joueur ni commandes. Ses ordres sont ignorés. 4 spectateurs au plus.
- **Pourquoi** : seul le serveur voit toute la carte, le client ne peut pas trouver les combats lui-même. Un bouton plutôt qu'un paramètre d'URL, parce que le clic débloque l'audio du projecteur.
- **Impact** : la musique suit les combats du spectateur comme pour un joueur. Le spectateur ne voit pas le screamer du mage qu'il suit.
- **Avis** : À vérifier. Seuil de bataille et durée de maintien à régler sur le projecteur.

### Config envoyée dès la connexion | G.WI

- **Quoi** : le serveur envoie la config du client à l'ouverture du WebSocket, avant toute demande d'entrée, et plus après le message de bienvenue. Le client se connecte au chargement de la page, puis envoie l'entrée en jeu ou l'entrée en spectateur. Un refus garde la connexion ouverte pour réessayer.
- **Pourquoi** : l'écran d'accueil a besoin de la liste des apparences du mage avant que le joueur entre en jeu.
- **Impact** : remplace l'ordre « bienvenue puis config » de la phase 1. Le rechargement de config est envoyé à toutes les connexions, entrées ou non.
- **Avis** : Validée.

### Apparence du mage dans le type du snapshot | G.WI

- **Quoi** : les apparences sont listées dans `gameplay.json` (`mage.skins`), la première est celle par défaut. L'écran d'accueil les montre avec leur sprite, l'entrée en jeu envoie la position de l'apparence choisie, et le serveur la renvoie comme type du mage dans le snapshot. Une position inconnue donne la première apparence. Un joueur qui revient avec son jeton peut changer d'apparence. Les bots gardent l'apparence par défaut.
- **Pourquoi** : aucun octet de plus dans le snapshot, le type du mage valait toujours 0.
- **Impact** : les sprites du mage s'appellent `mage-<apparence>-walk-<image>` (l'ancien `mage-walk-*` devient `mage-necromancer-walk-*`). Purement visuel, aucun effet sur le jeu.
- **Avis** : Validée.

### Bombardements sur les armées, dégâts selon la densité | G.WI

- **Quoi** : toutes les 75 à 120 s (première vague après 150 s), 3 zones de 7 m sont marquées au sol, chacune sur une armée vivante tirée au sort selon sa force, avec un décalage de 5 m au plus. 10 s plus tard, chaque unité et chaque mage dans la zone subit 20 dégâts, multipliés par 1 + 0,03 par autre corps de la même armée dans la zone, jusqu'à x3. Les dégâts passent par les règles habituelles (Lien d'âme, défense, armure), sans tueur. Le client dessine la zone qui se remplit pendant le compte à rebours, puis l'explosion, avec un son.
- **Pourquoi** : des zones au hasard sur une carte de 400 x 400 m ne toucheraient presque personne. Viser surtout les grosses armées et compter la densité donne l'effet anti-boule de neige du concept (§7.5) : une armée nombreuse et serrée perd beaucoup, une armée en nuée beaucoup moins.
- **Impact** : comme pour la brume, une unité tuée par un bombardement reste à son camp et un mage tué affiche « the bombing ». Les PNJ ne sont pas touchés. Les bots ne fuient pas encore les zones. Le compte à rebours passe dans les 3 bits de niveau des drapeaux (7 pour l'explosion).
- **Avis** : À vérifier. Fréquence, nombre de zones, rayon et dégâts à équilibrer en jeu.

### Colliers en vitesse et morsure | G.WI

- **Quoi** : un objet peut donner un multiplicateur de vitesse. Les colliers (à clous, en os, chaîne de Cerbère) donnent vitesse et dégâts à la lignée Bêtes. Les voitures, les coffres et les coffres de camp peuvent en donner, leurs tables de butin ont été rééquilibrées.
- **Pourquoi** : le concept donne « vitesse et morsure » aux colliers. La vitesse s'applique au déplacement de l'unité, comme le bonus de dégâts de l'arme.
- **Impact** : une bête équipée court devant sa place de formation plus vite que les autres, sans effet sur le mage.
- **Avis** : À vérifier. Valeurs et poids des tables à équilibrer en jeu.

### Lignée Bêtes et chiens de garde des camps | G.WI

- **Quoi** : chien zombie (force 1, rapide), molosse (5 chiens) et cerbère (10 chiens), de la lignée `beast`, plus forts contre les squelettes. Chaque camp a 3 chiens de garde, PNJ hostiles dont le cadavre se relève en chien zombie pour l'armée qui les tue.
- **Pourquoi** : ferme le triangle de force décidé en phase 6 sans code en plus : tout passe par `units.json` et les registres.
- **Impact** : les camps sont la seule source de bêtes. Les bots font évoluer leurs chiens comme les autres unités.
- **Avis** : À vérifier. Statistiques à équilibrer en jeu.

### Sprites et son de la phase 7 générés | G.WI

- **Quoi** : chien zombie, molosse, cerbère, chien de garde, colliers et les trois nouvelles apparences du mage (liche, sorcière, médecin de peste) sont dessinés par un script jetable et ajoutés à l'atlas. Le son d'explosion est synthétisé puis encodé en MP3.
- **Pourquoi** : même démarche que les assets des phases précédentes.
- **Impact** : les zones de bombardement sont dessinées par le client, pas par l'atlas.
- **Avis** : Provisoire. À remplacer avec les vrais sprites et sons.

### Bots V1 : formation selon la situation, camps et prime | A.PI

- **Quoi** : hors bataille, un bot prend la formation d'exploration (nuée). Quand il marche sur une cible, il prend la formation d'attaque (coin). En bataille, il garde le coin s'il est au moins aussi fort, prend la phalange sinon, et bat en retraite comme avant. Ses priorités hors bataille deviennent : prime (le premier du classement à moins de 120 m, s'il n'est pas plus fort que lui), armée plus faible, camp (à moins de 60 m, s'il a 1,5 fois la force des défenseurs), pillage, chasse, errance.
- **Pourquoi** : les mêmes ordres qu'un joueur, avec des formations qui collent à leur usage dans le concept.
- **Impact** : les cimetières passent par la recherche de points d'intérêt existante. Les formations et les seuils sont dans `lobby.json`.
- **Avis** : À vérifier. Seuils à équilibrer en jeu.

### Prime sur le premier du classement | A.PI

- **Quoi** : le classement envoyé chaque seconde contient l'armée et la position du premier, s'il est vivant et a une force non nulle. La minimap l'affiche en rouge, sauf pour lui-même. Le tueur de ce mage gagne 100 âmes (`events.json`), en plus des règles habituelles.
- **Pourquoi** : la position change à chaque seconde du classement, ce qui suffit pour une minimap.
- **Impact** : le premier est calculé au moment de sa mort, avant le transfert de son armée.
- **Avis** : À vérifier. Montant à équilibrer en jeu.

### Brumes envoyées à tous les joueurs | A.PI

- **Quoi** : une brume a un type de `world.json` (rayon, vitesse, dégâts par seconde, délai de réanimation optionnel), dérive en ligne droite, change de direction toutes les 20 s et rebondit sur les bords. La purificatrice blesse les unités et les mages (Lien d'âme et plafond compris), sans tueur. La nécrotique ramène à 10 s le délai des cadavres qui y sont. Les brumes sont envoyées à tous les joueurs, où qu'ils soient.
- **Pourquoi** : une brume de 14 m de rayon peut couvrir l'écran sans que son centre y soit. Elles sont 4, le coût réseau est négligeable.
- **Impact** : un mage tué par la brume affiche son nom. Le délai d'une croix (60 s) l'emporte sur la brume nécrotique.
- **Avis** : À vérifier. Nombre, rayon, vitesse et dégâts à équilibrer en jeu.

### Camps armés avec coffre au sol | A.PI

- **Quoi** : 3 camps de 4 chasseurs (tir à distance) et 4 soldats (mêlée), placés loin des mages, pour 5 à 8 min. Les défenseurs sont des PNJ hostiles en laisse autour de leur position. Quand le dernier tombe, un coffre de camp apparaît à la place du camp et chaque armée peut le fouiller une fois. Un camp dont la durée est écoulée part dès que ses défenseurs n'ont plus de cible.
- **Pourquoi** : choix de l'équipe. Les cadavres des défenseurs (squelettes archers) récompensent déjà ceux qui se battent.
- **Impact** : un camp compte comme une seule force dans les batailles et le cercle d'aggro. Le camp est un nouveau genre d'entité, dessiné au sol.
- **Avis** : À vérifier. Nombre, défenseurs et butin à équilibrer en jeu.

### Cimetières au butin individuel | A.PI

- **Quoi** : nouveau type de récompense `units` : la fouille d'un cimetière relève 3 à 6 squelettes archers près du mage, avec le plafond d'armée. Comme les voitures, chaque armée peut le fouiller une fois.
- **Pourquoi** : c'est la règle commune des points d'intérêt du concept.
- **Impact** : 4 cimetières sur la carte. C'est, avec les camps, la porte d'entrée de la lignée Squelettes.
- **Avis** : À vérifier. Nombre et quantité à équilibrer en jeu.

### Casques en PV et armure | A.PI

- **Quoi** : un objet peut donner un multiplicateur de dégâts, un multiplicateur de PV et une armure (part des dégâts évitée). Les casques (cuir, fer, heaume maudit) donnent PV et armure à la lignée Squelettes. L'équiper augmente aussi les PV actuels. Les voitures, les coffres et les coffres de camp peuvent en donner.
- **Pourquoi** : le concept donne « PV et armure » aux casques. Le multiplicateur suit l'unité à la relève comme l'arme.
- **Impact** : les tables de butin des voitures et des coffres de la phase 5 ont changé. Le décalage d'affichage de l'objet dépend maintenant de sa catégorie (`client.json`).
- **Avis** : À vérifier. Valeurs à équilibrer en jeu.

### Formations : neutre au départ, effets suspendus pendant le changement | A.PI

- **Quoi** : l'armée démarre et réapparaît dans la formation neutre (le placement d'avant). Les touches 1 à 4 lancent un changement de 1,5 s : l'ancien placement reste, sans aucun bonus ni malus, puis la nouvelle formation s'applique. Placements : phalange en bloc trois fois plus large, coin en triangle devant le mage, cercle en anneaux autour du mage (distance à l'intérieur), nuée en spirale espacée. Effets : vitesse (mage et unités), défense (dégâts reçus par les unités), bonus de dégâts du coin pendant 3 s après le contact de chaque unité, garde du cercle qui prend l'unité la plus proche quelle que soit sa distance.
- **Pourquoi** : choix de l'équipe pour le neutre. Suspendre les effets rend le changement en plein combat coûteux, comme le veut le concept.
- **Impact** : la Retraite remplace toujours le placement par le tunnel. Une formation retirée de la config ramène au neutre.
- **Avis** : À vérifier. Placements et valeurs à confirmer en jeu.

### Triangle de force par lignée | A.PI

- **Quoi** : chaque type d'unité a une lignée et une table de bonus par lignée visée. Gros zombie et golem frappent plus fort les bêtes, les squelettes frappent plus fort les zombies (les unités lentes), et les bêtes (phase 7) frapperont plus fort les squelettes.
- **Pourquoi** : le triangle du concept, sans tester de type précis dans le code.
- **Impact** : le zombie de base n'a pas de bonus. Les PNJ n'ont pas de lignée et ne reçoivent ni ne donnent de bonus.
- **Avis** : À vérifier. Multiplicateurs à équilibrer en jeu.

### Projectiles à tête chercheuse | A.PI

- **Quoi** : une unité ou un PNJ qui a un projectile tire au lieu de frapper. Le projectile (vitesse dans `units.json`) suit sa cible et lui inflige les dégâts calculés au tir, avec les règles habituelles à l'arrivée. Il disparaît si sa cible meurt avant. S'il a été tiré de l'extérieur d'une croix active, il brûle en y entrant, ou en atteignant une cible qui s'y trouve.
- **Pourquoi** : choix de l'équipe : simple, lisible, pas de collisions à calculer.
- **Impact** : un projectile est un nouveau genre d'entité, envoyé dans les snapshots et orienté par le client selon son déplacement.
- **Avis** : Validée.

### Sprites de la phase 6 générés | A.PI

- **Quoi** : squelettes, golem, baliste, chasseur, soldat, projectiles, casques, cimetière, coffre de camp et camp sont dessinés par un script jetable et ajoutés à l'atlas, agrandi à 512 x 512.
- **Pourquoi** : même démarche que les sprites des phases précédentes.
- **Impact** : les brumes sont dessinées par le client (cercles colorés), pas par l'atlas.
- **Avis** : Provisoire. À remplacer avec les vrais sprites.

### Jalon MVP mesuré côté serveur, test sur téléphone à part | L.BA

- **Quoi** : l'étape 5.13 se limite au test de charge à 4 joueurs et 8 bots, avec la nouvelle option `--bots` du script. La partie sur téléphone via le tunnel devient l'étape 5.14.
- **Pourquoi** : la mesure serveur peut se faire seul et tout de suite, la partie sur téléphone demande l'équipe et le tunnel.
- **Impact** : les fps sur téléphone restent à mesurer. Les résultats serveur sont dans `docs/load-test.md`.
- **Avis** : Reportée. Le test sur téléphone se fait en 5.14.

### Bots qui évoluent et contournent les croix | L.BA

- **Quoi** : hors bataille, un bot fait l'évolution la plus chère qu'il peut payer dès qu'il réfléchit. Avant chaque déplacement, si la force totale de son armée atteint le seuil des croix, il remplace sa destination par un point sur le côté de la première croix prête que son chemin traverse, à la distance du rayon plus la marge de `lobby.json` (3 m). Le pillage des voitures et des coffres passe par la recherche de points d'intérêt existante.
- **Pourquoi** : mêmes commandes qu'un joueur, et un détour recalculé à chaque réflexion suffit sans pathfinding.
- **Impact** : une croix en recharge ne gêne pas les bots. Une proie réfugiée dans une croix reste hors de portée d'un gros bot.
- **Avis** : À vérifier. Le détour ne garantit pas que les unités en formation ne mordent pas sur la zone.

### Croix sacrées placées au hasard et déplacées rarement | L.BA

- **Quoi** : 8 croix de 6 m de rayon, placées au hasard en s'écartant des autres croix (60 m visés), avec une durée de vie de 8 à 12 min. Une croix ne change de place qu'une fois sa durée écoulée et sa recharge finie. À chaque tick, la force de chaque armée dans la zone est recalculée. Une armée qui atteint le seuil (40) perd toutes ses unités dans la zone, mage épargné, et la croix se recharge 1 min. Si plusieurs armées atteignent le seuil au même tick, toutes sont frappées.
- **Pourquoi** : le concept demande des zones qui changent rarement de place. Le calcul par tick reste léger avec une requête de rayon par croix.
- **Impact** : les unités tuées laissent des cadavres marqués, qui se relèvent après le délai de croix de `gameplay.json` (60 s) au lieu de 30 s, sans tueur donc sans transfert. Une croix est un nouveau genre d'entité.
- **Avis** : À vérifier. Nombre, rayon, seuil et durée de vie à équilibrer en jeu.

### Recharge des croix et force du joueur dans les croix | L.BA

- **Quoi** : les 3 bits de niveau des drapeaux d'une croix donnent sa recharge (7 quand elle est prête). La force du joueur dans chaque croix où il a des unités est envoyée dans l'état du joueur. Le client dessine la zone en or quand elle est prête, en gris avec un arc de progression pendant la recharge, et « force / seuil » au-dessus.
- **Pourquoi** : la force dans une croix est propre à chaque joueur, elle n'a pas sa place dans le snapshot commun.
- **Impact** : le rayon et le seuil sont envoyés dans la config du client.
- **Avis** : Validée.

### Plafond de 150 pour toute arrivée dans l'armée | L.BA

- **Quoi** : toute unité qui rejoindrait une armée déjà à 150 unités (relève, infection, charnier, mode démo, unités vivantes reçues à la mort d'un mage) est convertie en âmes, à raison de sa force multipliée par `perStrength`. Son objet va dans l'inventaire.
- **Pourquoi** : un seul passage pour toutes les arrivées évite que le plafond fuie. Le concept ne parlait que des cadavres.
- **Impact** : `concept.md` §6.4 mis à jour. Les évolutions ne passent pas par le plafond, elles réduisent le nombre d'unités.
- **Avis** : À vérifier. À confirmer en jeu avec de grosses armées.

### Ralentissement linéaire de toute l'armée | L.BA

- **Quoi** : de 60 à 150 unités, la vitesse du mage et de ses unités baisse linéairement jusqu'à 35 %, retour accéléré compris.
- **Pourquoi** : ralentir seulement le mage laisserait l'armée filer devant lui, ralentir seulement les unités la laisserait derrière.
- **Impact** : les unités abandonnées comptent dans le total et ralentissent aussi.
- **Avis** : À vérifier. Seuils et pénalité à équilibrer en jeu.

### Évolution par sacrifice des unités les plus proches | L.BA

- **Quoi** : l'ordre d'évolution donne le type visé. Le serveur trouve le type de base qui y mène, prend les unités de ce type les plus proches du mage, hors unités abandonnées, et les remplace par une seule unité à leur barycentre, avec l'animation de relève. L'évolution est possible en bataille. L'unité obtenue garde le meilleur objet compatible des unités sacrifiées, les autres retournent à l'inventaire.
- **Pourquoi** : les unités proches du mage sont celles qui ne sont pas au contact, et une évolution ne doit pas vider un groupe abandonné.
- **Impact** : le gros zombie (force 5, 180 PV, 20 de dégâts) est le premier type obtenu par évolution.
- **Avis** : À vérifier. Statistiques du gros zombie et évolution en bataille à confirmer en jeu.

### Popup d'évolution à partir des compteurs du serveur | L.BA

- **Quoi** : l'état du joueur contient le nombre d'unités de chaque type qui a une évolution, hors unités abandonnées. Le client affiche à droite, au-dessus du bouton Retraite, un bouton par évolution payable. La config du client donne le nom et les évolutions de chaque type d'unité.
- **Pourquoi** : le client ne voit que les unités dans sa vue, il ne peut pas compter toute son armée.
- **Impact** : la popup complète de 6.09 (progression des évolutions grisées) pourra s'appuyer sur les mêmes compteurs.
- **Avis** : Validée.

### Objet porté dans les 3 bits de niveau des drapeaux | L.BA

- **Quoi** : les 3 bits hauts des drapeaux deviennent un niveau dont le sens dépend du genre : taille pour un point d'intérêt, recharge pour une croix, objet porté pour une unité. Pour une unité, c'est la position de l'objet parmi ceux de sa catégorie, plus un (0 sans objet). Le registre refuse plus de 7 objets par catégorie.
- **Pourquoi** : aucun octet de plus dans le snapshot, et 3 objets par lignée sont prévus.
- **Impact** : complète la décision « Taille du charnier sur une échelle logarithmique ». Un changement d'objet passe par une mise à jour de 9 octets.
- **Avis** : Validée.

### Message de butin et barre de fouille | L.BA

- **Quoi** : chaque objet gagné pendant un tick (voiture, coffre, boss) est envoyé au joueur dans un message séparé, affiché « Found: X » en haut au centre. La progression de la fouille en cours est envoyée dans l'état du joueur et dessinée en barre au-dessus du mage.
- **Pourquoi** : le butin est un événement ponctuel comme la mort du mage, la fouille change à chaque tick.
- **Impact** : les objets rendus à l'inventaire par une évolution ou le plafond ne sont pas annoncés.
- **Avis** : Validée.

### Butin de la citrouille en équipement | L.BA

- **Quoi** : à la mort du boss, chaque armée vivante qui a contribué reçoit un objet tiré dans la table de `events.json` (pelle ou batte), puis une seule d'entre elles reçoit l'objet légendaire (tronçonneuse), tirée au sort selon sa contribution relative.
- **Pourquoi** : tous les participants repartent avec quelque chose, et la récompense rare suit la règle de contribution relative du concept.
- **Impact** : un contributeur mort au moment de la victoire ne reçoit pas d'objet, mais garde sa part d'âmes.
- **Avis** : À vérifier. Table et poids à équilibrer en jeu.

### Voitures et coffres au butin individuel | L.BA

- **Quoi** : nouveau type de récompense `items` : la fouille donne un objet tiré dans la table pondérée du point d'intérêt (voiture : pelle 70, batte 30, coffre : batte 85, tronçonneuse 15). Le point reste en place et chaque armée peut le fouiller une fois.
- **Pourquoi** : c'est le butin individuel du concept, à la différence du charnier.
- **Impact** : 10 voitures et 5 coffres sur la carte. Le banc de test met à zéro le nombre de points d'intérêt et de croix, chaque test ajoute ce dont il a besoin.
- **Avis** : À vérifier. Nombre et tables à équilibrer en jeu.

### Équipement par catégorie, auto-équipé depuis l'inventaire | L.BA

- **Quoi** : chaque objet a une catégorie, une rareté (ordre de `rarities`) et un bonus de dégâts. Chaque type d'unité indique sa catégorie. Un objet gagné va dans l'inventaire du mage, qui équipe à chaque tick l'unité compatible la plus forte sans objet, hors unités abandonnées, en commençant par le meilleur objet. L'objet suit l'unité à sa mort, à sa relève, au changement de camp et dans un charnier. L'inventaire est perdu à la mort du mage.
- **Pourquoi** : un objet qui attend dans l'inventaire équipe tout seul la prochaine unité, sans interface à ajouter.
- **Impact** : seul le bonus de dégâts existe. Les casques (6.04) et colliers (7.02) ajouteront leurs bonus.
- **Avis** : Validée.

### Sprites de la phase 5 générés | L.BA

- **Quoi** : le gros zombie (zombie agrandi et assombri), les armes, la voiture, le coffre et la croix sont dessinés par un script jetable et ajoutés à l'atlas existant.
- **Pourquoi** : même démarche que les sprites provisoires des phases précédentes.
- **Impact** : l'atlas passe à 48 sprites dans une texture de 512 x 256.
- **Avis** : Provisoire. À remplacer avec les vrais sprites.

### Taille du charnier sur une échelle logarithmique | A.PI

- **Quoi** : le serveur envoie pour chaque point d'intérêt un niveau de taille égal au logarithme en base 2 de son nombre de cadavres, de 0 à 7, dans les 3 bits libres des drapeaux. Le client agrandit le sprite de 25 % par niveau : 1 cadavre au niveau 0, 2 à 3 au niveau 1, 45 (le charnier d'une armée pleine) au niveau 5, 128 et plus au niveau 7, soit 2,75 fois la taille de base.
- **Pourquoi** : aucun octet de plus dans le snapshot, et l'échelle logarithmique distingue les petits charniers sans rendre les gros énormes.
- **Impact** : seul l'affichage change, le rayon de fouille reste celui de `world.json`. Les drapeaux n'ont plus de bit libre.
- **Avis** : À vérifier. Agrandissement à régler en jeu.

### Snapshots en delta par joueur | A.PI

- **Quoi** : le serveur garde pour chaque joueur le dernier état envoyé de chaque entité. Un snapshot ne contient plus que les entités nouvelles ou qui ont changé de genre, de type ou d'armée (12 octets), celles dont la position quantifiée ou les drapeaux ont changé (9 octets) et les identifiants de celles qui ont quitté la vue (4 octets). Le client reconstruit l'état complet avant l'interpolation.
- **Pourquoi** : le WebSocket est fiable et ordonné, un delta ne peut donc pas se perdre. Les entités immobiles faisaient l'essentiel du débit.
- **Impact** : débit mesuré sous 64 Ko/s au pire (voir `docs/load-test.md`). Le format du snapshot de la décision « Snapshot à 12 octets par entité » ne s'applique plus qu'aux nouvelles entités.
- **Avis** : À vérifier. Le test de charge ne fait pas encore marcher les armées. Si le débit dépasse la cible en jeu réel, envoyer un snapshot tous les 2 ticks.

### Contrôle de la Retraite en deux temps | A.PI

- **Quoi** : la touche R ou le bouton Retraite (en bas à droite) passe en mode visée, et le clic ou le tap suivant donne le point de sortie. Le bouton est grisé hors bataille ou si l'armée est encerclée. Pendant la retraite, le client dessine une flèche du mage vers le point de sortie qu'il a envoyé.
- **Pourquoi** : même geste sur PC et sur téléphone, et le concept demande de choisir la direction de fuite.
- **Impact** : le serveur ignore une retraite hors bataille. Le cercle d'aggro et l'état du bouton viennent de l'état du joueur, envoyé à chaque tick.
- **Avis** : Validée.

### Bots : fuir, attaquer plus faible, puis piller | A.PI

- **Quoi** : en bataille, un bot bat en retraite par le plus grand secteur libre si les ennemis engagés sont plus de 1,3 fois plus forts que lui, ou si le secteur libre passe sous 120° face à une force au moins égale. Hors bataille, il marche sur l'armée la plus proche à moins de 40 m si elle a moins de 70 % de sa force, sinon il pille, chasse ou erre comme avant.
- **Pourquoi** : c'est la machine à états du concept, avec les mêmes ordres qu'un joueur.
- **Impact** : les bots fuient aussi la citrouille et ses lanternes quand ils sont trop faibles. Tous les seuils sont dans `lobby.json`.
- **Avis** : À vérifier. Seuils à équilibrer en jeu.

### Tunnel de retraite fixé au départ | A.PI

- **Quoi** : à l'ordre, le tunnel est posé dans le monde, de la position du mage vers le point de sortie. Les unités non engagées sont réparties en deux murs selon leur côté, puis en rangées selon leur position. Les 2 premières rangées s'évasent en ailes, qui se placent entre le mage et un ennemi qui contourne le mur de leur côté. Une rangée se replie dès que le mage l'a dépassée, et ses unités reprennent leur place autour de lui. Quand une unité meurt, son mur glisse vers la base. Sous 6 unités, le reste forme une escorte en cercle autour du mage.
- **Pourquoi** : un tunnel fixe ne suit pas le mage, il le laisse courir dedans, et le repli de la base vers la pointe vient du suivi de sa progression.
- **Impact** : les murs ne poursuivent personne, ils se battent seulement contre un ennemi à leur portée. Les unités rejoignent leur place avec la vitesse de retour (x2,5) si elles en sont loin.
- **Avis** : À vérifier. Largeur, espacement et ailes à régler en jeu.

### Retour au mage selon la distance à sa place | A.PI

- **Quoi** : une unité sans cible à plus de 8 m de sa place y retourne à 2,5 fois sa vitesse, jusqu'à en être à moins de 1,5 m. La même règle vaut pour les places du tunnel.
- **Pourquoi** : la distance à la place couvre tous les cas (groupe abandonné libéré, unités transférées, tunnel) sans état en plus.
- **Impact** : une armée qui suit son mage normalement n'est jamais accélérée.
- **Avis** : À vérifier. Distances à régler en jeu.

### Groupes abandonnés autonomes | A.PI

- **Quoi** : les unités au contact lors d'une retraite forment un groupe. Il ne suit plus le mage et tient sa position quand il n'a pas de cible, avec une laisse autour du point d'abandon. Il a gagné après 1 s sans contact : ses unités redeviennent normales et ses cadavres restent à son camp. S'il est détruit, chaque cadavre passe à son tueur s'il est une armée en jeu, sinon il reste au camp d'origine.
- **Pourquoi** : c'est la règle 5 du concept. Le délai évite qu'un trou de ciblage d'une fraction de seconde fasse gagner le groupe.
- **Impact** : les cadavres d'un groupe ne se relèvent pas tant que son issue n'est pas connue.
- **Avis** : Validée.

### Retraite seulement en bataille | A.PI

- **Quoi** : la Retraite n'est possible qu'en bataille et sans encerclement. Elle abandonne les unités au contact, transfère à leur tueur les cadavres tués par une armée de cette bataille, et laisse le mage sortir du cercle jusqu'au point de sortie. Elle se termine quand il y arrive, ou plus tôt si le joueur donne un ordre de déplacement.
- **Pourquoi** : hors bataille, il n'y a rien à fuir, et un ordre ignoré évite un tap malheureux sur téléphone.
- **Impact** : si une armée ennemie le rattrape après la sortie, le mage est de nouveau en bataille et doit refaire une retraite.
- **Avis** : Validée.

### Armée du mage tué : 70 % au tueur, le reste en charnier | A.PI

- **Quoi** : à la mort du mage, ses unités et ses cadavres sont mélangés au hasard. 70 % d'entre eux passent à leur destinataire : le tueur du mage pour les unités, le tueur du cadavre pour un cadavre (le tueur du mage à défaut). Le reste, et tout ce qui n'a aucune armée en jeu pour le recevoir, forme un charnier à la position du mage.
- **Pourquoi** : c'est la règle 3 du concept. Un mage tué par un PNJ laisse tout dans le charnier, puisque les PNJ ne récupèrent rien.
- **Impact** : le screamer du mode démo ne fait plus disparaître l'armée, il laisse un charnier. `concept.md` §4.2 règle 3 mis à jour.
- **Avis** : Validée.

### Lien d'âme avec un budget de perte | A.PI

- **Quoi** : quand le mage subit des dégâts, 80 % vont à l'unité de son armée la plus proche à moins de 6 m (hors unités abandonnées). Le reste est limité par un budget qui se remplit de 8 % des PV max par seconde, plafonné à cette valeur. Le plafond vaut pour tous les dégâts, PNJ compris.
- **Pourquoi** : un budget est simple à suivre par tick et donne bien les ~12 s de focus minimum du concept.
- **Impact** : seul le mode démo tue un mage d'un coup (il passe directement par la mort).
- **Avis** : À vérifier. Part, rayon et plafond à équilibrer en jeu.

### Le mage visé en dernier | A.PI

- **Quoi** : une unité ou un PNJ hostile ne choisit un mage comme cible que si aucun autre ennemi n'est à portée. L'ordre d'attaque explicite sur un mage reste prioritaire.
- **Pourquoi** : c'est la règle de ciblage du §4.3 du concept.
- **Impact** : un mage dont l'armée est détruite redevient la cible de tout le monde.
- **Avis** : Validée.

### Encerclement et secteur de fuite | A.PI

- **Quoi** : les ennemis engagés contre l'armée sont repérés par leur angle autour du centre de l'armée (mage et unités non abandonnées). Le plus grand écart entre deux angles est le secteur libre. Sous 60°, l'armée est encerclée. Le milieu de ce secteur sert de direction de fuite aux bots.
- **Pourquoi** : c'est la définition du concept, avec les ennemis déjà connus par la détection de bataille.
- **Impact** : le client est prévenu par un drapeau de l'état du joueur, qui grise le bouton Retraite.
- **Avis** : À vérifier. À confirmer en jeu avec de grosses armées.

### Cercle d'aggro par force engagée | A.PI

- **Quoi** : chaque force ennemie engagée (corps principal d'une armée, groupe abandonné, ou boss et sbires d'un même événement) donne un cercle autour de ses corps, plus la marge de 8 m. Le mage peut aller partout dans l'union de ces cercles. S'il est dehors au début de la bataille, il ne peut que s'en rapprocher.
- **Pourquoi** : un cercle autour d'une armée entière engloberait ses groupes abandonnés loin de là. Le mage dehors au départ ne doit pas être téléporté au bord.
- **Impact** : les cercles sont envoyés au client dans l'état du joueur.
- **Avis** : Validée.

### Bataille détectée par les cibles | A.PI

- **Quoi** : une force est en bataille quand une de ses unités cible un ennemi à moins de 8 m, ou qu'un ennemi la cible à cette distance. Les PNJ hostiles (citrouille, lanternes, futurs camps) comptent comme une armée, les civils non. La bataille se termine après 1 s sans engagement.
- **Pourquoi** : le ciblage cherche déjà l'ennemi le plus proche, il n'y a aucune requête spatiale à ajouter. Le délai absorbe les trous du ciblage échelonné.
- **Impact** : la réanimation et le blocage dans le cercle concernent aussi les combats contre les PNJ hostiles. `concept.md` §4.4 mis à jour.
- **Avis** : Validée.

### Âme seulement sur les cadavres en attente | A.PI

- **Quoi** : un cadavre porte le drapeau « en attente » une fois son délai de réanimation écoulé, c'est-à-dire quand il ne se relève pas à cause d'une bataille ou de l'issue d'un groupe abandonné. Le client n'affiche l'âme que sur ces cadavres.
- **Pourquoi** : c'est le comportement du concept, prévu par la décision provisoire de la phase 2.
- **Impact** : remplace la décision « Âme affichée sur chaque cadavre ».
- **Avis** : Validée.

### Raccourcis du mode démo | G.WI

- **Quoi** : avec `?demo=1`, le client affiche 3 boutons en bas à gauche et écoute les touches de `client.json` (K, P, U). Le serveur n'exécute ces commandes que si `DEMO_MODE=true`, sinon il les ignore. Screamer : le mage meurt pour de vrai, tué par le nom de `gameplay.json`. Citrouille : l'événement démarre près du mage et remplace le boss en cours. Unités : des zombies se relèvent autour du mage.
- **Pourquoi** : montrer le vrai screamer et le vrai écran de mort au jury, au moment choisi. Les boutons servent sur téléphone.
- **Impact** : le screamer de démo fait perdre l'armée, le raccourci Unités permet de la reconstruire.
- **Avis** : Validée.

### Thème du boss : composition originale au piano | G.WI

- **Quoi** : la couche boss de la musique (3.02) est un ostinato de piano en 5/4 dans l'esprit du thème d'*Halloween*, mais avec une mélodie originale (arpèges descendants en la mineur, accords la mineur, fa, ré mineur, mi).
- **Pourquoi** : la référence doit être reconnaissable sans reprendre le thème de Carpenter, qui n'est pas libre de droits.
- **Impact** : le critère 3.07 s'appuie sur ce thème et sur le pub *Winchester*.
- **Avis** : Validée.

### Décor à position fixe | G.WI

- **Quoi** : `world.json` liste des éléments de décor avec leur position (`decor.fixed`), placés par le client en plus du décor aléatoire. Le premier est le pub *Winchester* de *Shaun of the Dead*.
- **Pourquoi** : la décision sur le décor généré depuis une graine prévoyait une liste de placements pour les décors uniques.
- **Impact** : pas de collision, comme le reste du décor. Un élément aléatoire peut chevaucher le pub.
- **Avis** : Validée.

### Musique du boss pendant tout l'événement | G.WI

- **Quoi** : tant qu'une Citrouille maléfique est en jeu, la couche du boss remplace la couche exploration pour tous les joueurs, où qu'ils soient. La couche combat continue de s'ajouter par-dessus.
- **Pourquoi** : l'événement concerne toute la carte (annonce et flèche pour tous), la musique le fait sentir à chacun.
- **Impact** : un joueur loin du boss entend son thème pendant toute la durée de vie de l'événement (3 min au plus).
- **Avis** : À vérifier. À limiter à une distance du boss si c'est trop envahissant.

### Événements envoyés par différence d'état | G.WI

- **Quoi** : à chaque tick, le serveur compare pour chaque joueur le boss en jeu avec le dernier qu'il lui a annoncé. Il envoie un début (position du boss) ou une fin (victoire ou départ, âmes gagnées par ce joueur). Un joueur qui arrive pendant l'événement reçoit son début.
- **Pourquoi** : même principe que la mort du mage, sans file de messages à gérer. Le boss ne bouge pas, sa position suffit pour la flèche même hors de la vue.
- **Impact** : un boss mobile demandera d'envoyer sa position régulièrement.
- **Avis** : Validée.

### Contribution relative au boss | G.WI

- **Quoi** : chaque coup porté au boss ajoute à l'armée les dégâts divisés par sa force totale (au moins 1). À la mort du boss, les âmes de `rewardSouls` sont partagées au prorata des contributions. Le coup fatal rapporte en plus les âmes normales du boss au tueur. Un boss qui part sans être tué ne rapporte rien.
- **Pourquoi** : c'est la règle du concept, une petite armée qui participe gagne autant qu'une grosse. Les lanternes ne comptent pas, pour ne pas récompenser le farm des sbires.
- **Impact** : le premier du classement gagne moins par dégât infligé, sans perdre ce qu'il a.
- **Avis** : À vérifier. Récompense et PV du boss à équilibrer en jeu.

### Citrouille maléfique immobile qui invoque des lanternes | G.WI

- **Quoi** : le boss et les lanternes sont des PNJ hostiles du registre (champ `attack`). Ils ciblent l'unité ou le mage le plus proche dans leur portée, sans s'éloigner de leur point d'attache au-delà de leur laisse. Le boss a une vitesse nulle : il ne se déplace pas et les autres corps ne le poussent pas. Il apparaît loin des mages, invoque des lanternes autour de lui jusqu'à un maximum, et disparaît avec elles après sa durée de vie. Ni le boss ni les lanternes ne laissent de cadavre.
- **Pourquoi** : un boss fixe est facile à trouver avec la flèche et à encercler par plusieurs armées. Le comportement hostile servira aussi aux camps armés (6.06).
- **Impact** : une unité tuée par le boss ou une lanterne reste à son camp (règle 8), un mage tué affiche le nom du PNJ.
- **Avis** : À vérifier. PV, dégâts, fréquence et nombre d'invocations à équilibrer en jeu.

### Bots qui ignorent les PNJ hostiles | G.WI

- **Quoi** : un bot ne chasse que les PNJ sans attaque. Ses unités se battent quand même contre les lanternes ou le boss qui arrivent à leur portée.
- **Pourquoi** : la priorité des bots est de chasser les civils, et un bot qui fonce sur le boss y perd son armée.
- **Impact** : le boss est surtout attaqué par les joueurs. Les bots pourront le viser plus tard (4.14).
- **Avis** : À vérifier.

### PNJ immobiles hors du rayon de séparation | G.WI

- **Quoi** : la recherche de voisins de la séparation n'utilise que le rayon des corps mobiles. Un PNJ immobile cherche lui-même les corps qui le touchent et les repousse.
- **Pourquoi** : avec le rayon de 2 m du boss dans cette recherche, le temps de tick du test de charge passait d'environ 18 à 29 ms, boss absent.
- **Impact** : le temps de tick revient à environ 20 ms dans les mêmes conditions.
- **Avis** : Validée.

### Screamer avant l'écran de mort | G.WI

- **Quoi** : à la réception du message de mort, le client affiche le visage en plein écran, joue le cri et fait vibrer le téléphone pendant la durée de `client.json`, puis affiche l'écran de mort. Le chargement de la config échoue si la réapparition du mage est plus courte que le screamer.
- **Pourquoi** : le screamer doit être vu en entier, et le mage ne doit pas réapparaître pendant qu'il est affiché.
- **Impact** : la vibration ne marche que sur Android, iOS ne la propose pas aux pages web.
- **Avis** : Validée.

### Effets sonores déduits des snapshots | G.WI

- **Quoi** : le client joue un coup quand une entité visible porte le drapeau de combat, une mort quand un corps visible disparaît du snapshot, une relève quand une entité visible commence à se relever. Chaque effet a un écart minimal entre deux lectures (`gapMs`).
- **Pourquoi** : pas de nouveau message à envoyer, et des centaines d'unités ne doivent pas jouer des centaines de sons.
- **Impact** : une téléportation de la caméra (réapparition) peut jouer une mort de trop. Les coups ne dépendent pas du nombre d'unités, la musique de combat s'en charge.
- **Avis** : À vérifier. Écarts et volumes à régler en jeu.

### Musique en 3 couches synchronisées | G.WI

- **Quoi** : les 3 couches (exploration, combat, boss) ont le même tempo (120 BPM en 5/4), la même tonalité (la mineur) et la même durée (20 s). Elles démarrent ensemble en boucle et seul leur volume change, en fondu. Exploration et boss s'échangent, la couche combat s'ajoute par-dessus selon le nombre d'entités visibles en train de se battre (`combatFullUnits` pour le volume maximal).
- **Pourquoi** : des boucles calées entre elles restent musicales quel que soit le moment du changement.
- **Impact** : une vraie musique de remplacement doit respecter le même tempo, la même tonalité et la même durée pour les 3 couches.
- **Avis** : Validée.

### Sons et musiques générés en attendant les assets libres | G.WI

- **Quoi** : musiques, effets et visage du screamer sont générés par un script jetable (synthèse en Python, dessin pixel art), et les sons sont encodés en MP3. Les chemins sont dans `client.json`.
- **Pourquoi** : les assets libres n'ont pas pu être téléchargés pendant la phase, et le MP3 se lit sur tous les navigateurs.
- **Impact** : remplacer un son revient à déposer un fichier et changer son chemin. Chromium décode les boucles MP3 sans blanc, Safari n'a pas été testé.
- **Avis** : Provisoire. À remplacer par des assets libres (Pixabay, freesound, incompetech) si le temps le permet.

### Civils infectés sur place | L.BA

- **Quoi** : un PNJ marqué `infects` dans `units.json` ne meurt pas : quand une armée le tue, il devient tout de suite une unité du type `corpse` de cette armée, à l'endroit où il est tombé, avec l'animation de relève. Les civils sont marqués ainsi. Les autres PNJ (chasseurs et soldats des camps, 6.06) laisseront un cadavre normal.
- **Pourquoi** : pour un civil, c'est une infection et non une mort. L'armée grossit aussitôt, ce qui rend la chasse plus satisfaisante.
- **Impact** : le délai de réanimation de 30 s ne concerne plus que les unités tuées. `concept.md` §3 et §4.2 règle 1 mis à jour.
- **Avis** : Validée.

### Déplacement et attaque au clic gauche | L.BA

- **Quoi** : sur PC, le clic gauche déplace le mage sur le sol et lance une attaque sur un ennemi. Le clic droit ne fait plus rien, et le menu contextuel reste désactivé sur le canvas.
- **Pourquoi** : plus naturel pour un jeu .io joué au navigateur que le clic droit à la League of Legends.
- **Impact** : `concept.md` §4.1 mis à jour. Le tap sur téléphone ne change pas.
- **Avis** : Validée.

### État du joueur envoyé à chaque tick | L.BA

- **Quoi** : avec chaque snapshot, le serveur envoie au joueur l'emplacement de son armée, ses PV et PV max, son niveau, ses âmes, son nombre d'unités et sa force (22 octets). Le HUD affiche ces valeurs en haut à gauche et le classement en haut à droite.
- **Pourquoi** : ces valeurs changent souvent en combat, et un message aussi petit ne pèse pas sur le débit.
- **Impact** : le client ne calcule rien lui-même. Le joueur est mis en avant dans le classement, et ajouté sous le top 10 avec son rang s'il n'y figure pas.
- **Avis** : Validée.

### Test de charge avec des clients dans un processus séparé | L.BA

- **Quoi** : le script de test de charge lance le serveur dans son propre processus et les faux clients dans un processus enfant. Les paramètres (participants, unités, durée, vue) sont passés en arguments par `server/package.json`. La boucle de tick garde maintenant la somme et le nombre de ticks pour donner une moyenne.
- **Pourquoi** : décoder les snapshots des 40 clients dans le même processus aurait gonflé le temps de tick mesuré.
- **Impact** : les résultats sont dans `docs/load-test.md`, à refaire après 4.15.
- **Avis** : Validée.

### Jeton de reprise et remplacement des bots | L.BA

- **Quoi** : à l'entrée en jeu, le serveur donne un jeton aléatoire de 16 octets que le navigateur garde. À la déconnexion, un bot prend l'armée et le jeton reste valable pendant le délai de grâce. Un jeton ne rend l'armée que si un bot la pilote. Un nouveau joueur remplace le bot le plus faible, mais jamais un bot qui garde l'armée d'un joueur en délai de grâce. Le lobby refuse un joueur quand il compte déjà le maximum de participants.
- **Pourquoi** : c'est la règle de reprise décidée en phase 0. Le maximum, plafonné à 254 dans le schéma, empêche aussi de manquer d'emplacements d'armée.
- **Impact** : un deuxième onglet avec le même jeton reçoit une nouvelle armée. Les troupes et les cadavres d'un bot remplacé forment un charnier à la position de son mage.
- **Avis** : Validée.

### Priorités des bots | L.BA

- **Quoi** : toutes les 0,5 à 1,5 s, un bot va fouiller le point d'intérêt le plus proche à moins de 40 m, sinon il attaque le civil le plus proche à moins de 40 m, sinon il erre jusqu'à 60 m. Il passe par les mêmes ordres qu'un joueur.
- **Pourquoi** : c'est la machine à états de base du concept. Le délai aléatoire étale le travail des bots sur les ticks.
- **Impact** : les bots s'attaquent entre eux seulement quand leurs unités se croisent. Combat volontaire et fuite arrivent en 4.14.
- **Avis** : À vérifier. Portées et fréquence à ajuster en jeu.

### Classement envoyé chaque seconde | L.BA

- **Quoi** : chaque seconde, le serveur classe toutes les armées par force totale (égalité départagée par l'emplacement) et envoie à chaque joueur le top 10 et son propre rang.
- **Pourquoi** : la force change lentement, un envoi par seconde suffit et reste léger.
- **Impact** : le classement affiché peut avoir jusqu'à une seconde de retard.
- **Avis** : Validée.

### Config complète renvoyée au rechargement | L.BA

- **Quoi** : après chaque rechargement réussi, quel que soit le fichier, le serveur renvoie toute la config du client à tous les joueurs. Le client remplace la sienne, reconstruit la carte et met à jour le délai d'interpolation.
- **Pourquoi** : la config du client est petite, un seul message évite de suivre quel fichier touche quelle valeur.
- **Impact** : le client doit toujours lire sa config via la connexion, jamais en garder une copie.
- **Avis** : Validée.

### Âmes et niveau perdus à la mort du mage | L.BA

- **Quoi** : à sa mort, le mage perd ses troupes, ses cadavres, ses âmes et son niveau. Il réapparaît au niveau 1.
- **Pourquoi** : comme dans un .io classique, mourir remet le joueur au départ. Le concept ne citait que les troupes et l'équipement.
- **Impact** : le niveau ne s'accumule pas d'une vie à l'autre. `concept.md` §4.2 règle 7 mis à jour.
- **Avis** : Validée.

### Réapparition automatique loin des grosses armées | L.BA

- **Quoi** : le mage réapparaît seul après 3 s, au point le plus éloigné des armées de force 20 ou plus parmi quelques tirages, avec son armée de départ et ses PV pleins. Le joueur garde le même identifiant de mage.
- **Pourquoi** : pas d'écran à valider, le joueur revient vite dans la partie. Le screamer de 3.03 se jouera pendant ce délai.
- **Impact** : le délai doit rester plus long que le screamer et l'écran de mort.
- **Avis** : À vérifier. Délai, seuil de force et distance à ajuster en jeu.

### Régénération du mage hors combat | L.BA

- **Quoi** : le mage regagne 4 PV/s après 5 s sans subir de dégât, jusqu'à ses PV max.
- **Pourquoi** : sans régénération, un mage blessé le resterait jusqu'à sa mort ou à sa prochaine montée de niveau.
- **Impact** : fuir un combat assez longtemps permet de revenir à pleine santé.
- **Avis** : À vérifier. Délai et vitesse à équilibrer en jeu.

### Fouille automatique et charnier au premier pilleur | L.BA

- **Quoi** : un mage qui reste près d'un point d'intérêt qu'il n'a pas encore fouillé le fouille tout seul, et la fouille repart de zéro s'il subit des dégâts. Le charnier fait exception au butin individuel : le premier qui le fouille relève tous ses cadavres et le charnier disparaît.
- **Pourquoi** : aucun bouton à ajouter sur téléphone. Un charnier copié pour chaque pilleur dupliquerait des armées entières.
- **Impact** : le type de récompense (`reward`) de chaque point d'intérêt choisit son effet. Seul `corpses` existe pour l'instant.
- **Avis** : Validée.

### Premier message ponctuel : la mort du mage | L.BA

- **Quoi** : le serveur envoie au joueur un message séparé à sa mort, avec le nom de son tueur (vide si aucun). Les autres états visibles (combat, relève, déjà fouillé) passent par les drapeaux du snapshot.
- **Pourquoi** : la mort doit déclencher l'écran du joueur une seule fois, sans dépendre d'un snapshot.
- **Impact** : les autres joueurs voient le mage disparaître dans un fondu. Le screamer (3.03) s'appuiera sur ce message.
- **Avis** : Validée.

### Âme affichée sur chaque cadavre | L.BA

- **Quoi** : tout cadavre au sol affiche une âme qui flotte, puisque tous attendent leur relève.
- **Pourquoi** : en phase 2, aucun cadavre n'est bloqué par une bataille, il n'y a donc rien à distinguer.
- **Impact** : la réanimation bloquée en bataille (4.03) devra ajouter un drapeau pour ne montrer l'âme que sur les cadavres en attente.
- **Avis** : Validée. Remplacée en 4.03 par « Âme seulement sur les cadavres en attente ».

### Cadavre d'un PNJ au tueur | L.BA

- **Quoi** : le cadavre d'une unité appartient à son armée. Le cadavre d'un PNJ appartient directement à l'armée qui l'a tué, et se relève avec le type donné par `corpse` dans `units.json`. Un PNJ tué sans armée (plus tard par un autre PNJ) ne laisse pas de cadavre. Les PNJ marqués `infects` ne laissent pas de cadavre (voir l'infection des civils).
- **Pourquoi** : les PNJ ne récupèrent jamais de cadavres, et tuer des civils doit faire grossir l'armée.
- **Impact** : chaque cadavre garde aussi son tueur, utilisé par les transferts des phases suivantes. Les cadavres disparaissent avec leur armée.
- **Avis** : Validée.

### Ciblage échelonné, laisse et ordre d'attaque | L.BA

- **Quoi** : chaque unité cherche l'ennemi le plus proche dans sa portée d'aggro toutes les 0,25 à 0,75 s, tirées au hasard pour que les unités ne cherchent pas toutes au même tick. Elle ne poursuit pas un ennemi à plus de 18 m de son mage. Un ordre d'attaque vise une cible jusqu'à 30 m du mage pour toute l'armée, et un ordre de déplacement l'annule.
- **Pourquoi** : chercher une cible à chaque tick pour des milliers d'unités coûte trop cher, et sans laisse l'armée se disperse sur la carte.
- **Impact** : une unité réagit avec jusqu'à 0,75 s de retard. Le mage ennemi est une cible comme une autre, le Lien d'âme (4.05) le protégera.
- **Avis** : À vérifier. Intervalle, laisse et portée de l'ordre à ajuster en jeu.

### Population de civils en groupes | L.BA

- **Quoi** : chaque population de `world.json` maintient un nombre de PNJ en groupes de 3 à 6. Elle est remplie d'un coup au démarrage, puis un groupe réapparaît toutes les 2 s tant qu'il en manque, au point le plus éloigné des mages parmi quelques tirages. Un groupe erre, et chaque membre fuit l'unité ou le mage le plus proche à moins de 10 m.
- **Pourquoi** : la ressource de base doit rester disponible partout, sans réapparaître sous les yeux d'un joueur.
- **Impact** : les civils fuient à 4,5 m/s et les zombies courent à 7 m/s, il faut donc les approcher pour les attraper.
- **Avis** : À vérifier. Nombre, vitesses et rayon de fuite à ajuster en jeu.

### Coût des niveaux en progression géométrique | L.BA

- **Quoi** : chaque ennemi tué rapporte sa force multipliée par `perStrength` en âmes. Le niveau 2 coûte 10 âmes, puis chaque niveau coûte 1,5 fois le précédent. Le mage gagne 20 PV max par niveau et récupère la différence en montant.
- **Pourquoi** : la progression est rapide au début et ralentit ensuite, sans plafond de niveau à fixer.
- **Impact** : le niveau sert aux PV max du mage. Les âmes du surplus au-delà du plafond (5.08) passeront par la même fonction.
- **Avis** : À vérifier. À équilibrer en jeu.

### Snapshot à 12 octets par entité | L.BA

- **Quoi** : chaque entité du snapshot porte son type (position dans son registre), l'emplacement de son armée et des drapeaux d'état, en plus de son identifiant, de son genre et de sa position. L'orientation et la marche sont déduites par le client à partir du déplacement.
- **Pourquoi** : le client doit savoir quel sprite dessiner et de quelle couleur, sans message supplémentaire.
- **Impact** : avec ~400 entités visibles, le débit monte à ~96 Ko/s, au-dessus des ~64 Ko/s prévus. Le registre est limité à 256 types par genre, et le lobby à 255 armées.
- **Avis** : À vérifier. Le test de charge (2.18) mesure ~55 Ko/s en moyenne avec une vue de téléphone et 80 à 90 Ko/s avec une vue de PC, avec des pointes au-delà de 100 Ko/s. Réduction prévue en 4.15.

### Emplacement d'armée et couleur d'aura | L.BA

- **Quoi** : chaque armée reçoit le plus petit emplacement libre entre 1 et 255, envoyé sur un octet. L'emplacement 0 désigne les entités neutres. La couleur d'aura est prise dans la palette de `client.json` selon l'emplacement.
- **Pourquoi** : un octet suffit pour reconnaître son armée, celle des autres et les neutres, et la couleur reste stable pendant toute la partie.
- **Impact** : si la palette est plus courte que le nombre d'armées, deux armées peuvent partager une couleur.
- **Avis** : Validée.

### Placement par défaut de l'armée | L.BA

- **Quoi** : les unités de rang `front` se placent en rangées devant le mage, celles de rang `back` derrière, chaque rangée centrée sur lui. L'avant est la direction du dernier ordre de déplacement. Le rang est lu dans `units.json`.
- **Pourquoi** : c'est la règle du concept (mêlée lourde devant, distance derrière) sans tester de type précis dans le code.
- **Impact** : quand le mage fait demi-tour, toute l'armée le traverse pour reprendre sa place. Les formations de 6.07 remplaceront ce placement.
- **Avis** : À vérifier. Espacement et distances au mage à ajuster en jeu.

### Cellules de grille de 4 m | L.BA

- **Quoi** : la taille des cellules de la grille spatiale passe de 10 à 4 m.
- **Pourquoi** : la séparation fait une requête de rayon très court par unité. Avec 10 m, une cellule contient toute une armée serrée.
- **Impact** : les requêtes de la gestion d'intérêt parcourent plus de cellules.
- **Avis** : À vérifier. Le test de charge (2.18) tient dans le budget du tick avec ces cellules (29 ms en moyenne pour 50 ms).

### Décor placé par le client depuis une graine | L.BA

- **Quoi** : `world.json` donne une graine et un nombre d'éléments par sprite de décor. Le client place le décor lui-même avec un générateur pseudo-aléatoire partagé, le serveur ne le connaît pas.
- **Pourquoi** : le décor n'a pas de collision, il n'a donc aucun effet sur la simulation et n'a pas à passer par le réseau.
- **Impact** : tous les clients voient le même décor tant qu'ils ont la même config. Un décor à position fixe (pub *Winchester*, 3.07) demandera une liste de placements.
- **Avis** : Validée.

### Valeurs de départ des unités et du mage | L.BA

- **Quoi** : zombie à 7 m/s et 0,45 m de rayon, mage à 6 m/s et 0,6 m de rayon, 5 zombies placés à 2 m du mage.
- **Pourquoi** : les unités doivent aller un peu plus vite que le mage pour garder leur place pendant qu'il avance.
- **Impact** : aucune autre valeur n'en dépend pour l'instant.
- **Avis** : À vérifier. À équilibrer en jeu.

### Positions en mètres, sprites à leur taille native | T.BE

- **Quoi** : le serveur et la config travaillent en mètres. Le client met le monde à l'échelle avec `pixelsPerMeter` (`client.json`) et affiche chaque sprite à sa taille en pixels.
- **Pourquoi** : les distances du concept sont en mètres (8 m, 6 m). Les sprites de 32 à 64 px restent nets.
- **Impact** : la carte fait 400 x 400 m au départ. Le protocole quantifie les positions sur la taille de la carte.
- **Avis** : À vérifier. Taille de carte, vitesse du mage et échelle à ajuster en jeu.

### Nommage des sprites et atlas provisoire | T.BE

- **Quoi** : chaque sprite est nommé `<catégorie>-<nom>`, avec `-<animation>-<image>` pour les animations (par exemple `unit-zombie-walk-0`). L'atlas provisoire est généré par un script jetable, pas par Free Texture Packer.
- **Pourquoi** : les noms restent lisibles et triables dans l'atlas. Le script évite d'installer l'application pour des formes provisoires.
- **Impact** : le premier vrai atlas devra être produit avec Free Texture Packer, avec l'extension retirée des noms.
- **Avis** : Provisoire. À remplacer avec les vrais sprites.

### Messages hors périmètre ignorés par le serveur | T.BE

- **Quoi** : le protocole contient déjà tous les messages prévus (cible, formation, retraite, évolution, démo), mais le serveur ne traite que ceux dont l'étape est faite : rejoindre, taille de vue, déplacement, cible (2.06). Les autres sont décodés puis ignorés. Un message mal formé ou envoyé avant d'avoir rejoint ferme la connexion.
- **Pourquoi** : le format est fixé une fois, chaque étape suivante ne fait que brancher son traitement.
- **Impact** : les événements ponctuels (mort, relève, loot) n'ont pas encore de message, ils seront ajoutés avec leur premier usage.
- **Avis** : Validée.

### Chemins du serveur relatifs à server/ | T.BE

- **Quoi** : les scripts du serveur tournent depuis `server/`, et `CONFIG_DIR` et `CLIENT_DIR` sont relatifs à ce dossier. Toutes les variables de `.env.example` sont obligatoires.
- **Pourquoi** : npm lance les scripts d'un workspace depuis son dossier, aucun chemin n'est écrit en dur.
- **Impact** : il faut un `.env` pour lancer le serveur. Une variable d'environnement déjà définie prend le pas sur le `.env`.
- **Avis** : Validée.

### Schéma de config dans shared/src | T.BE

- **Quoi** : les fichiers JSON restent dans `shared/config/`, mais le schéma zod est dans `shared/src/config/schema.ts`. Chaque objet est strict : une clé inconnue fait échouer le chargement. Le dossier de config est donné par la variable `CONFIG_DIR`, obligatoire.
- **Pourquoi** : tout le code TypeScript de `shared/` est compilé depuis `src/`. Une clé mal orthographiée serait sinon ignorée sans erreur.
- **Impact** : `concept.md` §9.5 et `plan.md` (1.03) mis à jour. Il faut copier `.env.example` en `.env` avant de lancer le serveur.
- **Avis** : Validée.

### TypeScript 6.0 au lieu de 7 | T.BE

- **Quoi** : TypeScript est fixé en 6.0.3.
- **Pourquoi** : typescript-eslint ne supporte pas encore TypeScript 7 (il demande une version inférieure à 6.1).
- **Impact** : aucun sur le code. Passer en 7 demande d'attendre une version compatible de typescript-eslint.
- **Avis** : Provisoire. À remonter quand typescript-eslint suivra.

### Code partagé lu depuis ses sources en développement | T.BE

- **Quoi** : `@horde/shared` expose `src/` sous la condition `development` et `dist/` sinon. tsx, Vite, Vitest et le typecheck utilisent les sources, le build du serveur utilise `dist/`.
- **Pourquoi** : pas besoin de compiler `shared/` pendant le développement, et le serveur compilé tourne en JavaScript pur.
- **Impact** : le build compile `shared/` avant `server/` (ordre des workspaces). Le build du serveur désactive la condition dans `server/tsconfig.build.json`.
- **Avis** : Validée.

### Markdown exclu de Prettier | T.BE

- **Quoi** : Prettier ne vérifie que le code et la config, pas les fichiers Markdown.
- **Pourquoi** : la doc suit les formats de `ressources/exemples/`, que Prettier réécrirait.
- **Impact** : `npm run lint` ne bloque pas sur la doc.
- **Avis** : Validée.

### Un bot reprend l'armée d'un joueur déconnecté | L.BA

- **Quoi** : quand un joueur se déconnecte ou recharge la page, un bot prend le contrôle de son mage. S'il revient pendant le délai de grâce de `lobby.json`, il récupère son mage et son armée grâce à un jeton gardé par le navigateur. Sinon le bot reste et compte dans le minimum du lobby.
- **Pourquoi** : un rechargement accidentel sur téléphone ne doit pas faire perdre son armée, et une armée ne doit pas rester immobile sans joueur.
- **Impact** : le remplacement des bots et la reconnexion sont traités dans la même étape (2.13).
- **Avis** : À vérifier. La durée du délai de grâce est à ajuster en jeu.

### Mode démo activé par le serveur | L.BA

- **Quoi** : le paramètre `?demo=1` n'a d'effet que si la variable d'environnement `DEMO_MODE` est active sur le serveur. Il donne alors des raccourcis : déclencher le screamer, faire apparaître la citrouille, ajouter des unités.
- **Pourquoi** : pouvoir montrer chaque critère de la JAM au bon moment devant le jury, sans qu'un joueur puisse tricher sur le serveur normal.
- **Impact** : les commandes de démo passent par le protocole et sont refusées par le serveur hors mode démo.
- **Avis** : Validée. Le jour du rendu, le serveur de démo tourne avec `DEMO_MODE` actif.

### Classement sur la force totale de l'armée | L.BA

- **Quoi** : le score d'un joueur est la somme des valeurs de force de ses unités vivantes (zombie 1, gros zombie 5, golem 10, etc.).
- **Pourquoi** : récompense l'évolution des troupes et pas seulement leur nombre, ce qui va dans le sens du plafond d'armée.
- **Impact** : la valeur de force de chaque unité, déjà utilisée par les croix sacrées, sert aussi au classement et au remplacement des bots.
- **Avis** : À vérifier. À confirmer en jeu : un joueur avec beaucoup d'âmes mais une petite armée n'apparaît pas en haut.

### Encodage binaire du protocole écrit à la main | L.BA

- **Quoi** : snapshots et messages encodés avec `DataView`, positions quantifiées en `uint16`. L'encodeur et le décodeur sont partagés dans `shared/`.
- **Pourquoi** : c'est ce qui permet de tenir ~400 unités visibles en 4G (~64 Ko/s), une sérialisation générique serait 2 à 3 fois plus grosse.
- **Impact** : chaque message a un format décrit dans `shared/` et des tests aller-retour. Ajouter un champ demande de toucher l'encodeur et le décodeur.
- **Avis** : Validée.

### Déplacements et collisions écrits à la main | L.BA

- **Quoi** : grille spatiale uniforme, unités en cercles qui se repoussent, steering vers une place de formation. Pas de moteur physique.
- **Pourquoi** : prévisible et assez rapide pour des milliers d'unités à 20 ticks par seconde, et assez souple pour les murs du tunnel et l'encerclement.
- **Impact** : la grille spatiale sert aussi au ciblage, à la détection de bataille et à la gestion d'intérêt.
- **Avis** : Validée.

### Atlas de textures avec Free Texture Packer | L.BA

- **Quoi** : tous les sprites sont regroupés dans un seul atlas au format PixiJS, généré avec l'application gratuite Free Texture Packer. L'atlas généré est commité.
- **Pourquoi** : un seul atlas limite les appels de dessin sur téléphone, sans ajouter d'outil dans le build.
- **Impact** : ajouter un sprite demande de régénérer l'atlas à la main. La convention de nommage des sprites est fixée à la création de l'atlas.
- **Avis** : Validée.

### Rechargement à chaud avec fs.watch | L.BA

- **Quoi** : le serveur surveille `shared/config/` avec `fs.watch` natif et un délai anti-rebond.
- **Pourquoi** : aucune dépendance à ajouter pour un besoin simple.
- **Impact** : selon l'éditeur et l'OS, certains enregistrements peuvent déclencher plusieurs événements ou aucun.
- **Avis** : Provisoire. À remplacer par chokidar si le rechargement se montre peu fiable sur les machines de l'équipe.

### Page /share avec un QR code | L.BA

- **Quoi** : une page `/share` affiche en grand le QR code de l'URL courante, générée avec la bibliothèque `qrcode`.
- **Pourquoi** : l'URL du tunnel change à chaque lancement, la page reste juste sans rien refaire. Elle s'ouvre sur le projecteur.
- **Impact** : une dépendance côté client.
- **Avis** : Validée.

### Un seul port pour le client et le WebSocket | L.BA

- **Quoi** : le serveur Node sert le client construit (`client/dist`) et le WebSocket sur le même port. En développement, Vite redirige le WebSocket vers le serveur.
- **Pourquoi** : un seul tunnel à ouvrir pour la démo, une seule origine, pas de configuration CORS.
- **Impact** : le serveur contient un petit service de fichiers statiques. Le port vient d'une variable d'environnement.
- **Avis** : Validée.

### Simulation en objets, systèmes et registres | L.BA

- **Quoi** : les entités sont des objets typés. Chaque règle est un système (mouvement, combat, réanimation, bataille, etc.) appelé à chaque tick dans un ordre fixe. Les types d'unités, d'objets, de PNJ, de points d'intérêt et d'événements sont dans des registres alimentés par la config.
- **Pourquoi** : simple à lire et à tester, chaque personne travaille sur ses systèmes sans toucher ceux des autres.
- **Impact** : un banc de test permet de construire un monde, d'avancer de N ticks et de vérifier le résultat.
- **Avis** : Validée.

### Extensibilité par la donnée | L.BA

- **Quoi** : ajouter un type d'unité, un ennemi, un objet, un point d'intérêt ou un événement revient à ajouter une entrée dans la config et dans le registre correspondant, sans modifier le moteur. Seuls les comportements vraiment nouveaux demandent du code.
- **Pourquoi** : le contenu doit pouvoir grandir au fur et à mesure, pendant et après la JAM.
- **Impact** : les systèmes lisent les caractéristiques depuis les registres et ne testent jamais un type précis dans le code.
- **Avis** : Validée.

### Audio en Web Audio natif | L.BA

- **Quoi** : un module audio maison sur l'API Web Audio : un `GainNode` par couche de musique pour les fondus, déblocage au clic sur Play.
- **Pourquoi** : les fondus entre couches sont simples à faire en natif, aucune dépendance.
- **Impact** : les cas particuliers des navigateurs mobiles (déblocage, mise en veille) sont à gérer à la main.
- **Avis** : Validée.

### Interface en HTML et CSS par-dessus le canvas | L.BA

- **Quoi** : écran d'accueil, HUD, classement, popup d'évolution et boutons sont en HTML et CSS, en TypeScript sans framework. Le canvas PixiJS ne dessine que le monde.
- **Pourquoi** : mise en page responsive et boutons tactiles beaucoup plus rapides à faire qu'en PixiJS, aucune dépendance.
- **Impact** : le client a deux couches, le monde (PixiJS) et l'interface (DOM), qui communiquent par un petit état partagé.
- **Avis** : Validée.

### tsx en développement, tsc pour le build | L.BA

- **Quoi** : le serveur tourne avec `tsx watch` en développement. Pour la démo, `tsc` compile vers `dist/` et Node lance le résultat.
- **Pourquoi** : redémarrage automatique pendant le développement, sans les contraintes du TypeScript natif de Node (pas d'enum, extensions `.ts` imposées).
- **Impact** : une dépendance de développement.
- **Avis** : Validée.

### Tests avec Vitest sur les règles, le protocole et la config | L.BA

- **Quoi** : tests unitaires avec Vitest sur la simulation serveur (combat, réanimation, retraite, croix, etc.), l'encodage binaire et la validation de config. Le rendu PixiJS n'est pas testé automatiquement, il est vérifié à la main sur téléphone.
- **Pourquoi** : les règles de nécromancie sont nombreuses et s'enchaînent, c'est là qu'une régression passe inaperçue en jouant.
- **Impact** : chaque étape qui touche ces parties livre ses tests.
- **Avis** : Validée.

### ESLint et Prettier | L.BA

- **Quoi** : typescript-eslint en mode strict pour le lint, Prettier pour le formatage.
- **Pourquoi** : standard connu de toute l'équipe.
- **Impact** : lint et formatage vérifiés par la CI.
- **Avis** : Validée.

### Monorepo avec npm workspaces | L.BA

- **Quoi** : trois paquets `client/`, `server/` et `shared/` gérés par les workspaces npm.
- **Pourquoi** : intégré à npm, rien à installer en plus pour les 4 membres ni pour la CI.
- **Impact** : `shared/` est importé par le client et le serveur.
- **Avis** : Validée.

### ws pour le WebSocket | L.BA

- **Quoi** : le serveur utilise la bibliothèque `ws` au lieu de uWebSockets.js prévu dans le concept.
- **Pourquoi** : s'installe depuis npm, pur JavaScript, partage le serveur HTTP qui sert le client. Largement suffisant pour ~40 clients à 20 ticks par seconde.
- **Impact** : `concept.md` §9.1 mis à jour.
- **Avis** : Validée. À reconsidérer seulement si le réseau devient le goulot d'étranglement.

### Stack TypeScript, PixiJS v8, Vite, Node.js 24, zod | L.BA

- **Quoi** : TypeScript partout. Client en PixiJS v8 avec Vite, serveur en Node.js 24 LTS, validation de la config avec zod.
- **Pourquoi** : un seul langage pour partager protocole, tables et config. PixiJS tient des milliers de sprites à 60 fps sur téléphone.
- **Impact** : les versions exactes sont fixées à l'initialisation (1.01).
- **Avis** : Validée.

### Sources d'âmes et niveau du mage | L.BA

- **Quoi** : en plus du surplus au-delà du plafond, de la citrouille et de la prime, chaque ennemi tué rapporte des âmes (en fonction de sa valeur de force).
- **Pourquoi** : avec les seules sources du concept, le niveau du mage ne progresserait presque jamais avant 150 unités.
- **Impact** : le niveau, et donc les PV max du mage, progresse dès le début de partie.
- **Avis** : À vérifier. Les quantités d'âmes par source sont à équilibrer en jeu.

### Taille du lobby : 12 minimum, 40 maximum | L.BA

- **Quoi** : des bots complètent le lobby jusqu'à 12 participants, et il accepte jusqu'à 40 participants. La carte est dimensionnée pour ~20 participants. Toutes ces valeurs sont en config.
- **Pourquoi** : 12 seul est peu pour une grande carte, mais il faut garder une charge serveur raisonnable (40 x 150 unités au maximum).
- **Impact** : au-delà de 40, l'ouverture d'un second lobby est prévue en bonus.
- **Avis** : À vérifier. Taille de la carte, minimum et maximum à ajuster avec les tests de charge et de jeu.

### Plan complet, arrêt possible sur une version jouable | L.BA

- **Quoi** : le plan couvre tout le concept (MVP, V1, bonus). Ordre : socle technique, boucle de base jouable, critères de la JAM, règles de bataille avancées, monde du MVP, V1, bonus, finitions.
- **Pourquoi** : les critères de la JAM sont ce qui est évalué, ils doivent exister même si on s'arrête tôt. Le reste ne doit pas être bridé par peur du manque de temps.
- **Impact** : chaque fin de phase donne un jeu jouable. La phase de finitions commence 2 h avant le rendu, quel que soit l'avancement.
- **Avis** : Validée.

### Carte ouverte sans collision de décor | L.BA

- **Quoi** : le décor ne bloque pas les déplacements, seuls les bords de la carte arrêtent les unités. Les croix sacrées restent des zones.
- **Pourquoi** : évite un pathfinding pour des centaines d'unités, la plus grosse complexité cachée du projet.
- **Impact** : les seuls obstacles sont les unités elles-mêmes, ce qui suffit pour les murs du tunnel et l'encerclement.
- **Avis** : Validée.

### Hébergement de la démo sur un PC avec Cloudflare Tunnel | L.BA

- **Quoi** : le serveur tourne sur un PC de l'équipe et un tunnel Cloudflare gratuit l'expose en HTTPS (donc `wss://`), sans domaine ni ouverture de port.
- **Pourquoi** : c'est l'option gratuite la plus simple : pas de compte ni de carte bancaire, le WebSocket passe, et les téléphones du jury se connectent en 4G.
- **Impact** : l'URL change à chaque lancement (d'où la page `/share`). Le PC doit rester allumé et connecté pendant toute la démo. `concept.md` §9.1 mis à jour.
- **Avis** : Provisoire. Un VPS pourra remplacer le tunnel après la JAM.

### Tout en mémoire, sans compte | L.BA

- **Quoi** : le joueur choisit un pseudo, aucun compte, aucune base de données. Le classement est perdu au redémarrage du serveur.
- **Pourquoi** : rien dans le concept ne demande de persistance.
- **Impact** : seuls les fichiers de config sont stockés sur disque.
- **Avis** : Validée.

### Configuration en JSON et en variables d'environnement | L.BA

- **Quoi** : toutes les valeurs de gameplay sont dans `shared/config/*.json`, validées par zod au démarrage et rechargées à chaud (§9.5 du concept). Les valeurs d'infrastructure (port, mode démo) passent par des variables d'environnement, avec un `.env.example` commité.
- **Pourquoi** : équilibrer en pleine partie sans redémarrer, et aucune valeur en dur dans le code.
- **Impact** : chaque étape qui introduit une valeur ajoute sa clé et son schéma. Le code lit toujours la config via l'objet de config, jamais par une copie locale.
- **Avis** : Validée.

### Serveur autoritaire à 20 ticks par seconde | L.BA

- **Quoi** : le serveur simule tout, les clients n'envoient que des intentions. Le client affiche à 60 fps en interpolant avec 100 ms de retard, et ne reçoit que les entités proches de son écran.
- **Pourquoi** : pas de triche possible sur les règles, et une bande passante compatible avec la 4G.
- **Impact** : seul le marqueur de clic est affiché par le client sans attendre le serveur.
- **Avis** : Validée.

### Bots avec la machine à états du concept | L.BA

- **Quoi** : les bots errent, chassent les civils, pillent, attaquent plus faible qu'eux et fuient plus fort, avec les mêmes commandes qu'un joueur. Ils utilisent aussi la Retraite, les formations et les évolutions.
- **Pourquoi** : le lobby doit être vivant même avec peu de vrais joueurs pendant la démo.
- **Impact** : le comportement des bots est enrichi à chaque phase, en même temps que les règles.
- **Avis** : Validée.

### Assets libres en pixel art | L.BA

- **Quoi** : sprites issus de packs libres (Kenney, itch.io, OpenGameArt), musique et sons libres de droits (Pixabay, freesound, incompetech), y compris le visage et le cri du screamer. Formes colorées en attendant les sprites. Tous les crédits vont dans `docs/credits.md`.
- **Pourquoi** : pas le temps de produire des assets en 2 jours.
- **Impact** : le jeu est jouable avec des placeholders dès la phase 1, les vrais sprites arrivent sans bloquer le reste.
- **Avis** : Validée.

### Interface en anglais, paysage imposé | L.BA

- **Quoi** : tous les textes du jeu sont en anglais. Sur téléphone, le jeu n'est jouable qu'en paysage, avec un message pour tourner l'écran en portrait.
- **Pourquoi** : plus naturel pour un jeu .io. Le paysage laisse la place de voir l'armée et les boutons.
- **Impact** : pas de traduction. Le HUD n'est mis en page que pour le paysage.
- **Avis** : Validée.

### GitHub, CI et une branche par push | L.BA

- **Quoi** : dépôt sur GitHub. Une CI GitHub Actions lance lint, typecheck, tests et build sur chaque branche. Chaque push se fait sur sa propre branche, qui peut regrouper plusieurs étapes du plan.
- **Pourquoi** : la JAM demande au moins 5 push par personne, et 4 personnes sur le même code ont besoin d'un filet de sécurité.
- **Impact** : chaque étape du plan porte un rôle (P1 à P4), attribué à une personne plus tard.
- **Avis** : Validée.

### Règle de propriété des cadavres | L.BA

- **Quoi** : un cadavre se relève toujours pour son propre camp. Il ne passe à son tueur que si son mage fuit (Retraite) ou meurt. Le pitch de `concept.md` a été corrigé, il décrivait l'ancienne règle (le camp qui remporte la bataille).
- **Pourquoi** : c'est la règle détaillée en §4.2 du concept, le pitch la contredisait.
- **Impact** : la règle §4.2 fait foi pour toute l'implémentation.
- **Avis** : Validée.
