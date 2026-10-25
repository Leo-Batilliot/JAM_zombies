# Concept V2 : revamp du gameplay et du visuel

Ce document liste tout ce qui change par rapport à `docs/concept.md`, à partir des retours de jeu de L.BA et de l'interview qui a suivi. Il ne décrit que les différences : tout ce qui n'est pas cité ici reste valable dans le concept V1.

Objectif : plus de constance dans la qualité, moins de répétition dans le contenu.

---

## Mode d'emploi

- Chaque case est une tâche qu'un membre peut prendre seule. On la coche quand elle est fusionnée dans `main`.
- Chaque case porte un identifiant (`MOV-02`), un lot de priorité (`Lot 1` à `Lot 4`) et, si besoin, la section du concept V1 qu'elle remplace.
- Les nombres sont des valeurs de départ. Ils vont dans `shared/config/` comme toujours, et les valeurs marquées **À vérifier** sont à régler en jeu, puis à noter dans `docs/decisions.md`.
- **Toutes les listes de contenu (unités, lieux, champions, ennemis, décors, dons) sont une base, pas une limite.** Une nouvelle idée de monstre, de décor ou de mécanique est la bienvenue : on l'ajoute dans la section « Idées en plus » en bas, puis on la discute avant de l'implémenter.
- Quand une étape est prise, on lui donne un numéro `X.YY` dans `docs/plan.md` (phase 9 et suivantes) et on le reporte à côté de la case.

## Principes directeurs

Ces règles servent à trancher les cas que ce document ne prévoit pas.

1. **Le héros est un mage zombie.** Toutes les lignées sont des morts-vivants, mais le joueur incarne clairement un mage zombifié : le jeu reste un jeu de zombies.
2. **On reconnaît une unité à sa forme et à sa taille, puis à sa couleur.** Les petits détails ne se voient pas en bataille.
3. **Chaque couleur a un sens.** Vert : allié. Rouge : ennemi. Jaune : objet avec lequel on peut interagir. Vert nécrotique et violet : magie des mages, et rien d'autre. Le reste du monde est en tons naturels et sombres.
4. **Chaque élément a une raison d'être là.** Le décor raconte la ville : un cimetière est clos de murets, une voiture est arrêtée dans une rue, un camp est fait de barricades.
5. **Le gros joueur garde son avance, mais ne peut pas écraser le petit.** Plus on est puissant, plus on est lent, et plus on voit loin.
6. **Aucune valeur en dur.** Tout nouveau contenu passe par la config et les registres, comme en V1.

## Lots de priorité

- **Lot 1 : sensations et lisibilité.** Déplacement, vitesse, fuite, formations instantanées, barres de PV, contours, HUD. Gains rapides et visibles, sans nouvel asset.
- **Lot 2 : évolution permanente.** XP, level up à 3 cartes, mutations, fusions, dons du mage.
- **Lot 3 : direction artistique.** Palette, sol, mur d'enceinte, décor, lumière, nouveaux sprites des unités existantes.
- **Lot 4 : nouveau contenu.** Nouvelles lignées, ennemis naturels, lieux, champions, butin.

Un lot peut commencer avant la fin du précédent si ses dépendances sont prêtes.

---

## 1. Déplacement et poursuite (MOV)

Cause réelle des problèmes actuels, vérifiée dans le code :
- les places de formation sont recalculées à chaque tick à partir de l'orientation du mage (`server/src/systems/formation.ts`). Un clic à 10 px sur le côté fait tourner toute la formation, et chaque unité traverse l'armée pour rejoindre sa nouvelle place ;
- dès qu'une unité est à plus de 8 m de sa place, le multiplicateur de regroupement x2,5 s'active (`gameplay.json`, `regroup`). La rotation de la formation le déclenche en continu, d'où les accélérations.

- [ ] **MOV-01 Vitesse constante** | Lot 1 | 9.01
  Hors combat, toutes les unités d'une armée et le mage avancent à la même vitesse de marche : la plus petite entre celle du mage et celle du type d'unité le plus lent présent, multipliée par le ralentissement de MOV-03. Le mage attend donc ses unités lourdes, et une armée de lourds est lente. Aucune accélération : une unité ne sprinte plus pour rattraper sa place ou se positionner.
  Une unité qui a une cible (ennemi ou civil à infecter) utilise sa vitesse propre pour aller au contact : c'est là que les lignées rapides (Bêtes, Volants) font la différence. Le seul autre boost de vitesse est le retour après un combat gagné (FIGHT-03).
- [ ] **MOV-02 Formation qui se déplace en bloc** | Lot 1 | 9.02
  Chaque unité reçoit une place fixe dans la formation, attribuée une seule fois et redistribuée seulement quand la composition change (arrivée, mort, fusion), en minimisant les déplacements. La formation ne pivote plus à chaque clic : un petit déplacement la translate telle quelle (10 px à droite = toutes les unités font 10 px à droite). Elle ne pivote que pour un déplacement long dans une nouvelle direction (seuils de distance et d'angle **À vérifier**), et la rotation est progressive. Dépend de MOV-01 : sans vitesse de marche commune, les unités lentes déformeraient le bloc.
- [ ] **MOV-03 Ralentissement selon la puissance** | Lot 1 | remplace le ralentissement de 60 à 150 unités (§7.5) | 9.03
  Le malus de vitesse suit une courbe logarithmique de la force brute de l'armée, et s'applique au mage comme aux unités. Exemple de départ : force 50 : -10 %, force 200 : -25 %, force 600 : -40 % (**À vérifier**). L'écart doit être assez grand pour qu'un petit joueur distance facilement un gros. La courbe est à revoir quand les forces des paliers changent (EVO-05).
- [ ] **MOV-04 Civils beaucoup plus lents** | Lot 1 | 9.04
  On ne doit plus courir après un civil sur toute la carte. Vitesse de fuite nettement plus basse (aujourd'hui 4,5 m/s contre 7 m/s pour un zombie), et fatigue : après quelques secondes de fuite, le civil ralentit encore (valeurs **À vérifier**).
- [ ] **MOV-05 Formation instantanée** | Lot 1 | remplace le délai de 1,5 s (§5) | 9.05
  Le placement et les bonus de la nouvelle formation s'appliquent tout de suite. Une recharge de 3 s (**À vérifier**) empêche de changer en boucle, et s'affiche sur les boutons et les touches.
- [ ] **MOV-06 Les ennemis lâchent vite une proie trop faible** | Lot 1 | 9.06
  Un bot ou un PNJ hostile qui poursuit une armée beaucoup plus faible que lui abandonne au bout d'un temps qui diminue avec l'écart de force (**À vérifier**). Il préfère une cible à sa taille. Avec MOV-03, c'est ce qui empêche un gros de chasser un petit pendant des minutes.

## 2. Combat et fuite (FIGHT)

- [ ] **FIGHT-01 Fin du cercle d'aggro** | Lot 1 | remplace §4.4 | 9.07
  Le mage n'est plus enfermé dans un cercle pendant une bataille : il se déplace librement. L'état « en bataille » reste calculé de la même façon, parce qu'il bloque la réanimation (§4.2, règle 1) et pilote la musique.
- [ ] **FIGHT-02 Fuite libre par distance** | Lot 1 | remplace la Retraite (§4.2 règle 4, §4.5), l'encerclement (§4.4) | 9.08
  Quand le mage s'éloigne de plus de X m (**À vérifier**) de tout ennemi engagé, seules les unités **actuellement au corps à corps en train de frapper une unité** restent sur place et deviennent abandonnées. Toutes les autres le suivent. Les règles des unités abandonnées (§4.2, règle 5) et le transfert des cadavres du camp au tueur restent valables. Le bouton Retraite, le tunnel, l'encerclement et leurs drapeaux réseau disparaissent, les bots (4.14) sont adaptés.
- [ ] **FIGHT-03 Retour rapide après la victoire** | Lot 1 | modifie §4.2 règle 6 | 9.09
  Une unité abandonnée revient vers son mage à vitesse augmentée seulement quand la troupe en face d'elle est morte. C'est le seul boost de vitesse légitime des troupes.
- [ ] **FIGHT-04 Mage plus fragile** | Lot 1 | 9.10
  PV de base et PV par niveau du mage baissés (aujourd'hui 100 + 20 par niveau, cible **À vérifier**), pour que l'exposer soit un vrai risque. Le Lien d'âme (§4.3) est réglé en conséquence.

## 3. Évolution permanente (EVO)

Remplace le sacrifice de N unités et la popup d'évolution (§6.2), ainsi que l'usage actuel des âmes (§6.4).

### Règles

- [ ] **EVO-01 Expérience et level up** | Lot 2 | 10.02, 10.12
  Les âmes deviennent l'expérience du joueur. À chaque niveau, le joueur choisit une carte parmi 3 tirées au hasard. Le choix ne met pas le jeu en pause et ne masque pas le centre de l'écran. La carte reste en attente dans un coin si le joueur est en plein combat.
- [ ] **EVO-02 Contenu des cartes** | Lot 2 | 10.02
  Les cartes mélangent les mutations de troupes (le prochain palier d'une branche encore ouverte) et les dons du mage (EVO-10). Toutes les lignées peuvent sortir, mais celles déjà présentes dans l'armée sortent plus souvent (pondération **À vérifier**). Une fois les arbres terminés, les dons assurent toujours 3 choix.
- [ ] **EVO-03 Branches exclusives** | Lot 2 | 10.03
  Chaque lignée a 2 branches. Prendre le premier palier d'une branche ferme l'autre pour toute la vie du mage (choisir Gros zombie interdit la Goule et ses suites).
- [ ] **EVO-04 Mutation de toute la lignée, par fusion** | Lot 2 | 10.03-10.04
  Une mutation s'applique automatiquement à toutes les unités de la lignée, présentes et futures. Chaque palier vaut plusieurs unités du palier inférieur, et les unités fusionnent seules dès qu'il y en a assez : avec un ratio de 2, 3 zombies donnent 1 goule et 1 zombie, et le zombie suivant donne 2 goules. Ratio de départ : 2 par palier (**À vérifier**). La fusion réunit les unités les plus proches, avec une courte animation. L'unité obtenue garde le meilleur équipement, le reste retourne à l'inventaire (§6.3).
- [ ] **EVO-05 Force = équivalent en unités de base** | Lot 2 | remplace « force = coût d'évolution » (§7.4) | 10.05
  Une unité vaut le nombre d'unités de base qu'elle représente (1, 2, 4, 8 avec un ratio de 2). Cette force sert partout : classement, croix sacrées, remplacement des bots, MOV-03. Un palier est à peu près aussi fort que les unités qu'il remplace, avec un léger gain pour récompenser le choix (**À vérifier**).
- [ ] **EVO-06 Transfert recalculé chez le receveur** | Lot 2 | 10.06
  Une unité qui change de camp (mort du mage, fuite) compte pour son équivalent en unités de base, puis les mutations du receveur s'appliquent : un gros zombie reçu par un joueur qui a pris la Goule devient 2 zombies, qui fusionnent en 1 goule.
- [ ] **EVO-07 Réanimation au même palier** | Lot 2 | 10.06
  Une unité mutée qui meurt se relève au même palier pour son camp (§4.2 règle 1 inchangée).
- [ ] **EVO-08 Tout repart à zéro à la mort** | Lot 2 | confirme §4.2 règle 7 | 10.07
  Niveau, mutations et dons sont perdus à la mort du mage. Chaque vie est une nouvelle run avec des choix différents.
- [ ] **EVO-09 Plafond d'armée conservé** | Lot 2 | 10.07
  Le plafond de 150 unités (§6.4) reste, compté après fusion. Grâce aux fusions, il ne doit presque jamais être atteint : c'est un garde-fou de performance, plus un élément de jeu. Le surplus continue de donner des âmes.
- [ ] **EVO-10 Dons du mage** | Lot 2 | 10.08-10.09
  Base de départ, à compléter :
  - passifs : aura de soin des troupes proches, réanimation plus rapide, Lien d'âme renforcé, vitesse du mage, portée de détection et de caméra, butin amélioré, PV du mage, fusion à moindre coût pour une lignée ;
  - sorts actifs, sur un seul emplacement (touche Espace sur PC, un bouton sur téléphone), un nouveau sort remplace l'ancien : nova nécrotique (dégâts autour du mage), cri de ralliement (vitesse et dégâts des troupes quelques secondes), mur d'os (obstacle temporaire qui coupe une poursuite), relève immédiate (cadavres proches debout tout de suite, hors bataille).
- [ ] **EVO-11 Bots qui choisissent leurs cartes** | Lot 2 | 10.11
  Les bots tirent les mêmes cartes et choisissent selon leur armée (lignée majoritaire d'abord).

### Arbres des 5 lignées

Chaque lignée : une unité de base, 2 branches exclusives de 3 paliers. Soit 7 unités par lignée et 35 en tout. Le rôle et la silhouette de chaque unité doivent se lire au premier coup d'oeil (ART-06). Le palier 3 est rare : il représente 8 unités de base.

- [ ] **EVO-12 Zombies (mêlée)** | Lot 2 pour les règles, Lot 3 pour les sprites | 10.10
  Base : Zombie (voûté, bras tendus). Source : civils.
  - Masse : Gros zombie -> Abomination (colosse cousu) -> Titan de chair (géant, écrase les petites unités).
  - Vitesse : Goule (à quatre pattes) -> Rôdeur (bondit sur les unités à distance) -> Wendigo (grand, maigre, bois de cerf).
- [ ] **EVO-13 Squelettes (distance)** | Lot 2 et Lot 3 | 10.10
  Base : Squelette archer (fin, arc bien visible). Sources : soldats, chasseurs, pillards.
  - Siège : Arbalétrier à pavois (grand bouclier planté devant lui) -> Baliste d'os (squelette qui pousse une baliste) -> Catapulte d'os (engin de siège, tir en cloche de zone).
  - Sorcellerie : Pyromancien (feu follet dans la main, dégâts de zone) -> Liche (robe, couronne, ralentit) -> Roi liche (grand, trône flottant, aura).
  Le squelette évolué actuel n'est pas lisible : chaque palier doit montrer son arme ou son engin en gros.
- [ ] **EVO-14 Bêtes (rapides)** | Lot 2 et Lot 3 | 10.10
  Base : Chien zombie. Sources : chiens errants, chiens de garde, loups.
  - Meute : Molosse -> Cerbère (3 têtes, frappe 3 cibles) -> Chien des enfers (grand, enflammé).
  - Sang : Loup putride -> Loup-garou (bipède) -> Seigneur-garou (énorme, hurlement qui effraie).
- [ ] **EVO-15 Volants (harcèlement)** | Lot 4
  Base : Volée de charognards (petit groupe d'oiseaux qui tournent, une seule unité). Sources : corbeaux et chauves-souris. Les volants passent au-dessus des autres unités et des obstacles, sont fragiles et harcèlent les unités à distance. Silhouette : ailes et ombre au sol.
  - Nuée : Essaim de chauves-souris -> Vampire -> Nosferatu (référence au film de 1922).
  - Charogne : Harpie -> Vouivre d'os -> Dragon d'os.
- [ ] **EVO-16 Spectres (traversants)** | Lot 4
  Base : Âme errante. Sources : moines et templiers (processions dans les rues, cathédrale). Les spectres traversent les rangs, ignorent la séparation entre unités et sont semi-transparents.
  - Hantise : Spectre -> Banshee (cri qui étourdit) -> Reine des lamentations.
  - Ombre : Ombre (invisible hors combat) -> Faucheur -> Ankou (figure de la mort des légendes bretonnes).
- [ ] **EVO-17 Triangle de force étendu** | Lot 4
  Placer Volants et Spectres dans le triangle de force (§6.2) : par exemple, les volants battent les unités à distance et sont battus par les bêtes qui sautent, les spectres battent la mêlée lourde et sont battus par la sorcellerie (**À vérifier**).
- [ ] **EVO-18 Sources aussi fréquentes que les civils** | Lot 4
  On doit obtenir chaque lignée à peu près aussi souvent que des zombies. Chaque source (pillards, chiens errants, loups, corbeaux, processions) est répartie sur la carte et repeuplée comme les civils, pas seulement dans des lieux rares. Les zombies restent la lignée de départ, et le mage reste un mage zombie (ART-09).

## 4. Interface (UI)

- [ ] **UI-01 Barres de PV permanentes** | Lot 1 | 9.11-9.12
  Une petite barre sans chiffres sous chaque unité, toujours visible. Plus l'unité est évoluée, plus sa barre est grande, pour repérer les unités importantes en bataille. Couleur de la barre : vert pour les alliés, rouge pour les ennemis.
  Technique : le snapshot ne contient pas les PV des unités (seulement position et drapeaux). Il faut ajouter un octet de PV quantifié par entité, envoyé seulement quand il change, et mesurer le débit avec `docs/load-test.md` (**À vérifier**).
- [ ] **UI-02 Contours de couleur** | Lot 1 | 9.13
  Contour vert sur toutes les troupes alliées, rouge sur toutes les troupes ennemies, jaune sur tout ce qui est utile (points d'intérêt, coffres, voitures, tombeaux, champions à recruter). Le décor sans intérêt n'a pas de contour : on distingue d'un coup d'oeil la tombe décorative du tombeau à fouiller.
  La couleur d'armée de chaque joueur reste sur son mage (nom, bannière, grimoire) et sur la minimap, pour distinguer deux ennemis dans une bataille à 3.
  Technique : un filtre de contour sur des centaines de sprites peut coûter cher sur téléphone. Comparer un filtre et des contours précalculés dans l'atlas (une variante blanche teintée à l'affichage), et mesurer les fps (**À vérifier**).
- [ ] **UI-03 Grande barre des boss et événements** | Lot 1 | 9.14
  Pour la Citrouille, les champions et les événements : grande barre en haut de l'écran avec le nom et « X PV / Y ».
- [ ] **UI-04 Plaque des mages ennemis** | Lot 1 | 9.15
  Au-dessus du mage ennemi : son nom (dans sa couleur d'armée), sa puissance actuelle / sa puissance si toutes ses troupes revivent, et en dessous sa barre de PV, plus grande que celle des troupes.
- [ ] **UI-05 HUD en haut au centre** | Lot 1 | remplace le HUD de 2.17 | 9.16
  En haut au centre, toujours visible : niveau, barre d'expérience, PV du mage, puissance actuelle / puissance si tout revit, indicateur de lenteur (MOV-03). Le classement reste en haut à droite. Les cartes de level up et le sort actif ne recouvrent pas ce bloc.
- [ ] **UI-06 Minimap agrandie et détaillée** | Lot 1 pour la taille, Lot 3 pour le détail | remplace 5.11 | 9.17
  Nettement plus grande (taille dans `client.json`, adaptée au téléphone), avec le plan de la ville (quartiers, remparts, forêt) et des icônes : lieux, points d'intérêt, ressources, événements, boss, champions, prime. Les mages ennemis n'apparaissent que dans un rayon de détection autour du joueur, qui grandit avec sa puissance. Le premier du classement reste visible partout (prime, §7.6).
- [ ] **UI-07 Caméra qui dézoome avec la puissance** | Lot 1 | 9.18
  Plus l'armée est forte, plus la caméra dézoome, de façon continue et douce, entre un minimum et un maximum de config. La gestion d'intérêt (§9.2) s'élargit avec la vue : débit à mesurer (**À vérifier**).
- [ ] **UI-08 Écran de fin de run** | Lot 2 | 10.14
  Après le screamer : statistiques de la vie (puissance maximale, temps de survie, civils infectés, unités tuées, mages tués, niveau atteint, mutations choisies, champions recrutés, nom du tueur), puis le bouton Rejouer en dessous. Le serveur compte ces statistiques pendant la vie du mage.
- [ ] **UI-09 Recharges visibles** | Lot 1 et Lot 2 | 9.05, 10.13
  Recharge des formations (MOV-05) et du sort actif (EVO-10) affichée sur les boutons et à côté des touches.

## 5. Direction artistique (ART)

### Univers : la cité fortifiée maudite

Une vieille ville médiévale d'Europe, comme Carcassonne, de nos jours, envahie par les morts. Chaque élément a sa raison d'être :
- les **remparts** ferment la ville et marquent le bord de la carte ;
- la **cathédrale** et sa crypte expliquent les moines, les templiers, les croix sacrées et les spectres ;
- le **musée du château** expose les armures : c'est là que dort le Grand chevalier ;
- la **place du marché** et son échafaud accueillent le Bourreau ;
- les **voitures abandonnées** et les **barrages militaires** viennent de l'évacuation ratée, l'armée bombarde la ville (*28 semaines plus tard*) ;
- l'**hôpital de quarantaine** est le point de départ de l'épidémie ;
- la **forêt et le parc** entre les remparts abritent loups et corbeaux ;
- le **cimetière** clos de murets relève ses squelettes.

### Tâches

- [ ] **ART-01 Plan de la ville** | Lot 3
  Carte découpée en quartiers fixes ou tirés au hasard parmi des gabarits (centre pavé, quartier de la cathédrale, château, hôpital, caserne près des portes, parc et forêt). Rues et places assez larges pour les formations. Les points d'intérêt temporaires (§7.1) apparaissent dans les quartiers qui leur vont (les voitures dans les rues, les tombeaux au cimetière).
- [ ] **ART-02 Bâtiments et murets bloquants** | Lot 3
  Les bâtiments et les murets sont des obstacles simples (cercles et rectangles). Les unités, le mage et les bots les évitent par un évitement local, sans vrai pathfinding. Les ruelles deviennent tactiques (embuscades, goulets).
- [ ] **ART-03 Palette** | Lot 3
  Nuit d'automne : pierre gris-bleu, terre brune, mousse olive, feuilles rousses, lueurs orangées des lanternes et des feux. Le vert nécrotique et le violet sont réservés à la magie des mages. Fini le violet, le néon et le vert partout. La palette est fixée dans un fichier de référence et appliquée à tous les assets (ART-07).
- [ ] **ART-04 Interface dans le même style** | Lot 3
  L'interface (`client/src/style.css`, aujourd'hui violette) reprend la palette : cuir, parchemin et métal vieilli, dans l'esprit du grimoire du mage (proposition **À vérifier**).
- [ ] **ART-05 Sol en tuiles** | Lot 3
  Le sol n'est plus une texture répétée : tuiles de pavés, terre, herbe, mousse, feuilles, avec des transitions entre zones et des variantes pour casser la répétition.
- [ ] **ART-06 Lisibilité des silhouettes** | Lot 3
  Règles communes à toutes les unités :
  - sprites d'environ 48 px pour une unité de base, contour sombre d'1 px, palette limitée ;
  - chaque palier est nettement plus grand que le précédent (environ x1,3, **À vérifier**) ;
  - chaque branche a sa forme propre (massive, à quatre pattes, avec engin, avec robe...) ;
  - chaque lignée a sa signature : zombie voûté, squelette fin et blanc, bête à quatre pattes, volant avec ombre au sol, spectre semi-transparent ;
  - l'arme ou l'engin d'une unité à distance est dessiné en gros.
- [ ] **ART-07 Production des assets** | Lot 3
  Personne ne dessine dans l'équipe. On mélange trois sources, unifiées par la palette et le contour communs :
  - l'écosystème **LPC** (Liberated Pixel Cup) comme base : personnages d'environ 48 px avec marche, attaque et mort, tuiles de 32 px avec remparts et pavés, générateur de personnages pour le chevalier, les pillards, les civils et les soldats. Licence CC-BY-SA 3.0 / GPL 3.0 : crédits obligatoires, les sprites modifiés restent sous la même licence ;
  - des **packs itch.io** pour combler les manques (usage commercial autorisé, redistribution interdite, à vérifier pack par pack) ;
  - le **script de génération** pour les effets (halos, sorts, contours, barres, icônes de minimap), les variantes de palier et les monstres introuvables (assemblage, recoloration, agrandissement).
  Un script de normalisation ramène chaque sprite importé à la palette et au contour communs. Chaque asset et sa licence sont notés dans `docs/credits.md`. L'atlas actuel (512 x 512) ne suffira pas : prévoir plusieurs atlas ou un atlas plus grand.
- [ ] **ART-08 Recherche des assets** | Lot 3
  Avant d'importer : une liste par besoin (unité, tuile, décor, effet) avec la source retenue, sa licence et ce qui reste à générer. Premières pistes trouvées, licences à relire avant usage :
  - liste des assets du guide de style LPC : https://lpc.opengameart.org/static/LPC-Style-Guide/build/assets.html
  - LPC Skeleton : https://opengameart.org/content/lpc-skeleton
  - LPC Zombie : https://opengameart.org/content/lpc-zombie
  - pack Undead LPC de Sorthen : https://sorthen.itch.io/undead-lpc-pack
  - tuiles de remparts Castle Wall de Xanderwood : https://xanderwood.itch.io/castle-wall-tileset
  - squelettes top-down de Rogarca (usage commercial, pas de redistribution) : https://rogarca.itch.io/room-g16-skeleton
  - Little Lich pack (zombie, squelette, liche, tuiles) : https://insomniousnightgamekeeper.itch.io/little-lich-asset-pack
- [ ] **ART-09 Le mage est clairement un zombie** | Lot 3
  Le mage et ses apparences (nécromancien, liche, sorcière, médecin de peste) sont zombifiés : peau verdâtre, chairs abîmées, grimoire lumineux. On doit voir au premier coup d'oeil un mage zombie.
- [ ] **ART-10 Mur d'enceinte** | Lot 3
  Un haut mur de pierre entoure la carte, avec des tours, des créneaux et des portes fermées, au lieu du vide noir. Au-delà, des toits et une forêt sombre suggèrent le reste du monde. La Gargouille est perchée sur une tour.
- [ ] **ART-11 Décor composé** | Lot 3
  Le décor n'est plus éparpillé au hasard : il est placé par compositions qui ont un sens (tombes alignées dans un cimetière clos, buissons le long des murs, arbres en bosquets, lampadaires le long des rues, débris autour d'une voiture accidentée, bougies et fleurs autour d'un tombeau). Les compositions sont décrites dans la config.
- [ ] **ART-12 Nuit éclairée** | Lot 3
  Un voile sombre recouvre la carte, percé par des halos : lanternes, feux de camp, aura du mage, sorts, lieux importants. Les lieux intéressants attirent l'oeil par leur lumière. Un mode dégradé (moins de halos, sans voile) pour les téléphones faibles (**À vérifier**).
- [ ] **ART-13 Mécaniques existantes dans la nouvelle DA** | Lot 3
  Croix sacrées en calvaires de pierre ou parvis bénis, brumes, explosions des bombardements tirées par les mortiers de la caserne, camps armés en barricades de survivants, Citrouille dans un champ de citrouilles hors du centre (propositions **À vérifier**).
- [ ] **ART-14 Animations** | Lot 3
  Marche, attaque, mort et relève pour chaque unité, plus l'animation de fusion (EVO-04) et de level up.

## 6. Nouveau contenu (CONT)

### Ennemis naturels

- [ ] **CONT-01 Chiens errants** | Lot 4
  Meutes de quelques chiens dans les rues, agressifs envers les petites armées. Leurs cadavres donnent des chiens zombies.
- [ ] **CONT-02 Loups** | Lot 4
  Meutes dans la forêt et le parc, qui chassent en groupe et encerclent. Leurs cadavres donnent des chiens zombies.
- [ ] **CONT-03 Corbeaux et chauves-souris** | Lot 4
  Nuées volantes qui harcèlent et fuient, rapides. Leurs cadavres donnent des volées de charognards (lignée Volants).
- [ ] **CONT-04 Pillards survivants** | Lot 4
  Humains armés (torches, fusils) qui errent, attaquent les petites armées et fuient les grosses. Leurs cadavres donnent des squelettes archers.
- [ ] **CONT-05 Processions de moines** | Lot 4
  Moines et pèlerins qui circulent entre la cathédrale et la ville. Leurs cadavres donnent des âmes errantes (lignée Spectres).

### Lieux à conquérir

En plus du cimetière, des camps armés et des points d'intérêt actuels.

- [ ] **CONT-06 Cathédrale et crypte** | Lot 4
  Défendue par des moines et des templiers. Butin rare, source de spectres, repaire de l'Évêque déchu dans la crypte.
- [ ] **CONT-07 Caserne et barrages militaires** | Lot 4
  Soldats, mitrailleuse fixe et mortier qui bombarde les armées proches. Butin : casques et armes lourdes. Donne une origine visible aux bombardements.
- [ ] **CONT-08 Hôpital de quarantaine** | Lot 4
  Plein de civils malades, regroupés et peu mobiles : une grosse source de zombies d'un coup. En échange, des pièges de gaz blessent les troupes.
- [ ] **CONT-09 Forêt et parc** | Lot 4
  Zone sauvage entre les remparts : loups, corbeaux, cabane de chasseur avec butin. Casse la répétition des rues.
- [ ] **CONT-10 Musée du château et place du marché** | Lot 4
  Repaires du Grand chevalier et du Bourreau (CONT-12).

### Champions uniques

- [ ] **CONT-11 Règles des champions** | Lot 4
  Un seul exemplaire de chaque champion par lobby, dans son repaire. Le vaincre le relève pour son armée, comme tout cadavre. Il porte une icône sur la minimap de tous. Il suit les règles de nécromancie : il passe au tueur de son mage, et retourne à son repaire si son porteur meurt autrement (PNJ, brume, bombardement) ou quitte la partie. Il compte comme une unité de palier élevé pour la force, ne fusionne pas et n'est pas touché par les mutations.
- [ ] **CONT-12 Les 4 premiers champions** | Lot 4
  - Grand chevalier (musée) : tank de mêlée, charge qui renverse les petites unités.
  - Gargouille des remparts (tour du mur d'enceinte) : volante, plonge sur les armées qui passent, frappe les unités à distance.
  - Bourreau (échafaud de la place du marché) : hache en arc de cercle, exécute les unités sous 20 % de PV.
  - Évêque déchu (crypte) : lanceur de sorts à distance, soigne les morts-vivants autour de lui une fois converti.

### Butin

- [ ] **CONT-13 Équipement des nouvelles lignées** | Lot 4
  Une catégorie d'équipement par nouvelle lignée, sur le modèle du §6.3 : par exemple serres de fer pour les Volants, chaînes et lanternes spectrales pour les Spectres, avec commun, rare et légendaire (**À vérifier**).
- [ ] **CONT-14 Butin des nouveaux lieux** | Lot 4
  Tables de butin propres à chaque lieu (armes lourdes à la caserne, objets sacrés à la cathédrale...), dans `world.json`.

## 7. Ce qui reste du concept V1

Ces mécaniques restent, et passent dans la nouvelle DA (ART-13) :
- règles de nécromancie (§4.2), sauf la Retraite, remplacée par la fuite libre (FIGHT-02) ;
- Lien d'âme (§4.3), réglé pour les PV plus bas du mage ;
- équipement par lignée (§6.3) ;
- points d'intérêt temporaires (§7.1), camps armés et cimetières ;
- brumes et bombardements (§7.3), croix sacrées (§7.4), Citrouille maléfique et prime (§7.6) ;
- plafond d'armée, devenu un simple garde-fou (EVO-09) ;
- critères de la JAM, serveur persistant, bots, configuration (§2, §3, §9).

Ce qui disparaît : cercle d'aggro, bouton Retraite, tunnel de retraite, encerclement, sacrifice pour évoluer, popup d'évolution, délai de changement de formation, ralentissement par nombre d'unités.

## 8. Points techniques à surveiller

- [ ] **TECH-01 Débit réseau** | Lot 1 | 9.19
  L'octet de PV par entité (UI-01) et la vue élargie par le dézoom (UI-07) augmentent le débit. Nouvelle mesure avec le script de test de charge, résultats dans `docs/load-test.md`.
- [ ] **TECH-02 Performance du rendu** | Lot 1 et Lot 3 | 9.19
  Contours (UI-02), barres de PV permanentes, voile de nuit et halos (ART-12) : mesure des fps sur un vrai téléphone avant de valider chaque technique.
- [ ] **TECH-03 Obstacles côté serveur** | Lot 3
  Collisions des bâtiments (ART-02) dans la grille spatiale, et coût de l'évitement avec 40 participants (temps de tick).
- [ ] **TECH-04 Config et registres** | Lot 2 | 10.01
  Nouveaux schémas zod : arbres à branches et ratios de fusion, cartes et dons, courbe de ralentissement, champions, compositions de décor. Tests unitaires pour la fusion, le transfert recalculé et les branches exclusives.

## 9. Idées en plus

Les idées nouvelles se notent ici, avec leur auteur, avant d'être discutées puis déplacées dans la bonne section.

- [ ] **IDEA-01 Égouts** (proposition à discuter) : réseau souterrain qui relie des plaques d'égout éloignées, pour fuir ou surprendre, avec des nuées de rats.
- [ ] **IDEA-02 Relance des cartes** (proposition à discuter) : une relance des 3 cartes par run, ou gagnée en tuant un champion.
- [ ] **IDEA-03 Météo** (proposition à discuter) : pluie ou orage qui réduit la vue et masque les mages sur la minimap pendant une minute.
