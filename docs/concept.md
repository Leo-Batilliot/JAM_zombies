# Horde.io — Document de concept

> Nom provisoire. Jeu multijoueur en ligne (.io) jouable sur navigateur, PC et téléphone.
> Thème de la JAM : les zombies.
>
> Le revamp de `docs/conceptV2.md` prime sur les sections qu'il remplace.

---

## 1. Pitch

Chaque joueur incarne un **mage zombifié**, un nécromancien mort-vivant qui commande une armée de morts.
Il parcourt une ville infestée, tue des civils, pille des voitures et des cimetières, rase des camps de survivants
et affronte les armées des autres joueurs.

Sa particularité : **il relève les morts**. Toute unité tombée au combat se relève **30 secondes plus tard**,
pour son propre camp. Elle ne passe à celui qui l'a tuée que si son mage fuit (Retraite) ou meurt (§4.2).
Une armée sort donc affaiblie d'un combat, puis se reconstitue, et grossit en récupérant les morts des mages
qu'elle fait fuir ou qu'elle tue.

Le jeu s'inspire d'agar.io (serveur persistant, classement, grossir pour dominer), mais repose sur :
- des **troupes variées et équipées**, qui évoluent ;
- des **formations militaires** ;
- des **combats d'usure** plutôt qu'une absorption instantanée ;
- une **carte vivante** qui change en permanence.

## 2. Critères de la JAM

| Critère | Implémentation |
|---|---|
| 😱 Screamer | À la mort du mage : visage plein écran et cri pendant 0,8 s (avec vibration sur Android), puis l'écran « Vous avez été dévoré par X ». Un mode démo (`?demo=1` + une touche) permet de le déclencher au bon moment devant le jury. |
| 🎃 Citrouille maléfique | Boss d'événement récurrent, **la Citrouille maléfique** (voir §7.6) : un boss géant qui invoque des citrouilles-lanternes et que tous les joueurs peuvent attaquer. |
| 🎵 Musique spooky | Musique dynamique en 3 couches qui s'enchaînent en fondu : exploration, combat (l'intensité monte avec le nombre d'unités engagées) et thème du boss citrouille. |
| 🎬 Référence à un film | Plusieurs références (voir §10). La principale : *Evil Dead* / *L'Armée des ténèbres*, avec le grimoire du mage (Necronomicon), la tronçonneuse légendaire et l'armée de squelettes. |

Il faut en implémenter au moins 3, on fait les 4 pour être sûr d'en avoir au moins 3 valides.

## 3. Boucle de jeu

1. Le joueur arrive sur la page (QR code pendant la démo), choisit un pseudo et apparaît avec **son mage et 5 zombies**.
2. Il se déplace en cliquant (§4.1) et infecte des civils, qui rejoignent aussitôt son armée.
3. Il fouille les points d'intérêt (voitures, coffres, cimetières) pour s'équiper.
4. Il fait évoluer ses troupes, choisit ses formations, attaque des camps humains puis d'autres joueurs.
5. Les événements de la carte (brume, bombardements, boss citrouille) le forcent à bouger et ouvrent des occasions de remonter au classement.
6. S'il meurt, il réapparaît ailleurs avec 5 zombies, et son armée passe chez son tueur.

### 3.1 Serveur persistant et bots

- La partie **ne s'arrête jamais** (comme agar.io), avec un classement en direct.
- Chaque lobby a un nombre minimum de participants (valeur de départ : **12**). Des **bots** complètent le lobby.
- Quand un vrai joueur se connecte, il **remplace automatiquement un bot** : le bot qui a la plus petite armée quitte la partie.
  Ses troupes s'effondrent en un **charnier**, un point de loot temporaire que tout le monde peut piller (§7.1).
- Les bots utilisent exactement les mêmes commandes qu'un joueur (déplacement, cible, formation, évolution).
  Leur comportement est une machine à états simple : errer, chasser des civils, piller, attaquer plus faible, fuir plus fort.

## 4. Le mage zombifié

### 4.1 Contrôles (style League of Legends)

| Action | PC | Téléphone |
|---|---|---|
| Déplacer le mage et l'armée | Clic gauche sur le sol | Tap sur le sol |
| Attaquer une cible | Clic gauche sur un ennemi | Tap sur un ennemi |
| Changer de formation | Touches 1 à 4 | 4 boutons en bas de l'écran |
| Battre en retraite | Touche R | Bouton Retraite, distinct des formations |
| Choisir une évolution | Clic dans la popup | Tap dans la popup |

- L'armée suit le mage en restant dans sa formation.
- En bataille, le cercle d'aggro (§4.4) est affiché au sol, pour que le joueur sache jusqu'où il peut reculer.
- Un marqueur s'affiche à l'endroit du clic, sans attendre la réponse du serveur, pour que le jeu paraisse réactif.
- La popup d'évolution **ne met pas le jeu en pause** et ne masque pas le centre de l'écran.

### 4.2 Les règles de la nécromancie

Ces règles sont au cœur du jeu et doivent être implémentées telles quelles.

1. **Réanimation** : toute unité tuée laisse un cadavre qui se relève **30 s après sa mort**, **près du mage** du camp propriétaire, avec son équipement. Les civils font exception : ils ne meurent pas, ils sont **infectés** et deviennent des zombies sur place, aussitôt, dans l'armée qui les a infectés.
   **Le mage ne peut pas réanimer tant qu'il est lui-même en bataille** (§4.4). Ses cadavres attendent alors sous forme d'âme qui flotte au-dessus du corps, et se relèvent dès qu'il sort de bataille, si leurs 30 s sont écoulées.
2. **Propriété des cadavres** : un cadavre appartient par défaut au camp de l'unité morte. Il **ne change de propriétaire que dans deux cas : la fuite (Retraite) ou la mort du mage.**
   Chaque cadavre retient le camp qui lui a porté le coup fatal (son **tueur**). C'est ce camp qui le récupère lors d'un transfert, ce qui règle aussi les batailles à 3 armées ou plus.
3. **Mort du mage** : ses troupes vivantes et ses cadavres en attente passent à son tueur, avec leur équipement, avec une perte (§7.5) :
   - **70 %** passent au tueur (les vivants changent de camp immédiatement, les cadavres se relèvent chez lui) ;
   - **30 %** s'effondrent en un **charnier**, que tout le monde peut piller (§7.1).
   Ce qui n'a aucune armée pour le recevoir (mage tué par un PNJ, cadavre dont le tueur n'est plus en jeu) tombe aussi dans le charnier.
4. **Retraite** : c'est le **seul moyen de quitter une bataille** (§4.4). Quand le joueur l'active :
   - les unités **au contact** (face à face avec un ennemi) restent sur place et deviennent **abandonnées**, marquées par un drapeau en berne ;
   - les unités **non engagées** forment un **tunnel de retraite** (§4.5) par lequel le mage s'enfuit ;
   - la Retraite est **impossible si l'armée est complètement encerclée** au moment où elle est activée (§4.4) ;
   - les cadavres du camp déjà au sol dans cette bataille sont **transférés**, chacun à son tueur.
5. **Unités abandonnées** :
   - elles **continuent de se battre** de façon autonome ;
   - si l'une d'elles **meurt**, son cadavre est marqué pour **passer à son tueur** ;
   - si le groupe abandonné **remporte finalement le combat**, les marques sont levées : ses morts restent à son camp d'origine. Les mages ennemis qui fuient ou meurent face à lui transfèrent leurs cadavres selon les règles 3 et 4. Le groupe convertit donc des ennemis **même loin de son mage** ;
   - si le groupe abandonné est entièrement détruit, tous ses cadavres passent à leurs tueurs.
6. **Retour au mage** : un groupe d'unités qui n'est plus en combat et se trouve loin de son mage le rejoint à **vitesse fortement augmentée** (×2,5) jusqu'à reprendre sa place dans la formation.
7. **Réapparition du mage** : il réapparaît à un endroit aléatoire éloigné des grosses armées, avec 5 zombies, et perd son équipement, ses troupes, ses âmes et son niveau.
8. **Combats contre les PNJ** (civils, camps armés) : les mêmes règles s'appliquent, mais les PNJ ne récupèrent jamais de cadavres. Une unité tuée par un PNJ reste à son camp.

### 4.3 Protection du mage : le Lien d'âme

Objectif : le mage doit pouvoir être tué quand son armée ne le protège plus, ce qui donne tout leur intérêt aux formations.
Il ne doit pas en revanche se faire abattre en deux secondes par des archers alors que toute son armée est encore debout.

- Tant que des unités alliées se trouvent dans un rayon de 6 m autour du mage (sa *garde*), **80 % des dégâts** qu'il subit sont **transférés** à l'unité de la garde la plus proche.
- **Plafond** : le mage ne peut pas perdre plus de **8 % de ses PV max par seconde**. Il faut donc au moins 12 s de focus pour le tuer depuis ses PV pleins.
- **Ciblage** : les unités ciblent automatiquement l'ennemi le plus proche. Le mage n'est visé en priorité que sur ordre explicite (tap sur le mage ennemi).
- **Progression** : les PV max du mage augmentent avec son niveau (§6.4), et le niveau dépend des âmes récoltées, pas de la taille de l'armée.

Le mage reste ainsi vulnérable s'il s'expose ou si son armée est détruite, et la formation *Cercle* (§5) devient un vrai choix défensif.

### 4.4 Bataille et cercle d'aggro

- **Être en bataille** : un mage est en bataille dès que lui ou ses unités sont engagés contre une armée ennemie ou des PNJ hostiles (citrouille, lanternes, camps armés), c'est-à-dire qu'un ennemi se trouve à moins de 8 m d'eux. Les civils ne comptent pas.
- **Cercle d'aggro** : un cercle qui englobe l'armée ennemie engagée, plus une marge de 8 m. Dans une bataille à 3 armées ou plus, c'est l'union des cercles de toutes les armées ennemies engagées.
- **À l'intérieur du cercle**, le mage se déplace librement : il peut se repositionner, changer de formation ou reculer un peu.
- **Il ne peut pas en sortir** sans la Retraite (règle 4) : un clic à l'extérieur l'amène jusqu'au bord, pas plus loin. Aucune fuite ne peut donc arriver par accident.
- **Affichage** : le cercle est dessiné au sol (contour rouge pulsant) pendant toute la bataille, pour que le joueur ne soit pas frustré.
- **Encerclement** : une armée est complètement encerclée quand il ne reste autour d'elle **aucun secteur libre** d'au moins 60° sans unité ennemie à portée d'engagement.
  Dans ce cas, le bouton Retraite est grisé et le mage est piégé. Encercler devient donc une vraie tactique offensive.
- **Fin de la bataille** : il n'y a plus aucune unité ennemie engagée dans le cercle (ennemis détruits, en retraite, ou mage adverse mort). Le mage sort alors de bataille et ses cadavres en attente se relèvent (règle 1).

### 4.5 Tunnel de retraite

Quand le joueur active la Retraite, il indique un **point de sortie**, par un tap ou un clic dans la direction de fuite.
Les unités non engagées se placent alors en **forme de flèche, qui pointe de l'ennemi vers le point de sortie**.

```
   ennemis
 \  \     /  /     ← ailes : elles s'évasent côté ennemi pour bloquer le contournement
  \  \   /  /
   |  | M |  |      ← deux murs d'unités, le mage (M) court dans le couloir
   |  |   |  |
      ▼ sortie
```

- **Murs** : les unités forment deux murs qui **bloquent physiquement** les ennemis, sans aller au corps à corps. Elles ne se battent que si un ennemi les touche.
- **Exposition** : le mage ne peut être atteint **que par l'extrémité ouverte côté ennemi**, la base de la flèche.
- **Ailes** : à la base, les murs s'évasent en ailes, et les unités des ailes **se déplacent pour couper la route** à un ennemi qui tente de contourner le tunnel. Le tunnel s'adapte tant qu'il reste assez d'unités pour le former.
- **Repli** : une fois le mage passé, les murs se referment derrière lui et se replient à leur tour, de la base vers la pointe, pour le rejoindre.
- **Tunnel incomplet** : sous un minimum de 6 unités non engagées, le tunnel est remplacé par une simple escorte autour du mage, beaucoup moins protectrice.

## 5. Formations

Quatre formations prédéfinies. Dans toutes les formations, les unités de mêlée lourdes se placent devant et les unités à distance derrière.

| Formation | Bonus | Malus | Usage |
|---|---|---|---|
| **Phalange** | +25 % de défense | −20 % de vitesse | Tenir une position ou encaisser une charge |
| **Coin** | +40 % de dégâts pendant les 3 s après l'impact | −15 % de défense | Charger et percer jusqu'au mage adverse |
| **Cercle** | La garde du mage est toujours pleine | −30 % de vitesse | Protéger le mage, se replier |
| **Nuée** | +30 % de vitesse | −25 % de défense | Explorer, poursuivre, fuir |

Changer de formation prend 1,5 s, ce qui empêche de changer à volonté en plein combat. Pendant le changement, l'armée n'a ni les bonus ni les malus d'aucune formation.

L'armée commence, et recommence après chaque réapparition, dans une formation neutre sans bonus ni malus. Les touches 1 à 4 la font passer dans une des quatre formations.

La **Retraite** n'est pas une formation de combat : c'est un ordre de fuite (§4.2, règle 4). Les unités non engagées forment le tunnel en flèche (§4.5) pendant que le mage s'enfuit, et toutes les unités au contact sont abandonnées.
Elle a son propre bouton, à l'écart des quatre formations, pour éviter de la déclencher par erreur.

## 6. Troupes, évolutions et équipement

### 6.1 Le type dépend du cadavre

Le type d'unité réanimée dépend de ce qui a été tué.

| Cadavre | Unité réanimée | Lignée |
|---|---|---|
| Civil | Zombie | Zombies (mêlée) |
| Chasseur ou soldat (camps armés) | Squelette archer | Squelettes (distance) |
| Chien de garde (camps armés) | Chien zombie | Bêtes (rapides), en bonus |
| Unité d'un autre joueur | La même unité, avec son équipement | Inchangée |

### 6.2 Arbres d'évolution

Le joueur fait évoluer ses troupes en **sacrifiant N unités de base** pour obtenir une unité plus puissante.
Les évolutions restent volontairement peu nombreuses.

```
Zombies (mêlée)      Zombie ──5──▶ Gros zombie
                           └─10──▶ Golem de chair

Squelettes (distance) Squelette archer ──5──▶ Arbalétrier squelette
                                       └─10──▶ Baliste d'os

Bêtes (bonus)        Chien zombie ──5──▶ Molosse
                                  └─10──▶ Cerbère
```

**Popup de choix** :
- dès que le joueur possède **5 unités d'un même type de base**, une popup présente **toutes les évolutions** de ce type ;
- les évolutions encore inaccessibles s'affichent **grisées avec leur progression** (« Golem de chair — 7/10 ») ;
- la popup se réduit dans un coin si le joueur l'ignore et revient à chaque nouveau palier.

**Triangle de force** (pour que la composition de l'armée compte) :
- les zombies lourds (gros zombie, golem) écrasent les bêtes ;
- les bêtes flanquent et déchirent les squelettes ;
- les squelettes déciment les unités lentes avant qu'elles arrivent au contact.

### 6.3 Équipement par catégorie

Chaque lignée a **sa propre catégorie d'équipement**, qui reste valable sur toute la lignée.

| Lignée | Catégorie | Commun | Rare | Légendaire |
|---|---|---|---|---|
| Zombies | Armes de mêlée (dégâts) | Pelle | Batte de cricket (*Shaun of the Dead*) | Tronçonneuse (*Evil Dead*) |
| Squelettes | Casques (PV et armure) | Casque de cuir | Casque de fer | Heaume maudit |
| Bêtes | Colliers (vitesse et morsure) | Collier à clous | Collier en os | Chaîne de Cerbère |

- Les objets ramassés **équipent automatiquement** la meilleure unité compatible qui n'est pas encore équipée.
- Lors d'une évolution, l'unité obtenue **garde le meilleur équipement** parmi les unités sacrifiées. Les autres équipements retournent dans l'inventaire du mage.
- L'équipement est conservé après la mort et la réanimation, y compris quand l'unité change de camp.

### 6.4 Plafond d'armée et âmes

Le plafond est fixé pour garantir un jeu fluide sur téléphone et limiter l'effet boule de neige.

- **Plafond** : 150 unités par armée (valeur de départ, à ajuster selon les tests).
- Au-delà, chaque cadavre ou unité qui devrait rejoindre l'armée est converti en **âmes**.
- Les âmes font monter le **niveau du mage** (plus de PV max, voir §4.3).
- Ce système incite à **faire évoluer** les troupes : moins d'unités mais plus fortes, ce qui allège aussi le rendu.

## 7. Une carte vivante

But : le joueur doit **toujours avoir une raison de bouger**, et deux parties à 10 minutes d'écart ne doivent pas se ressembler.

### 7.1 Points d'intérêt temporaires

| Point d'intérêt | Contenu |
|---|---|
| Voiture abandonnée | Équipement commun ou rare |
| Coffre | Équipement rare, parfois légendaire |
| Cimetière | 3 à 6 squelettes archers qui se relèvent pour le pilleur |
| Charnier | Laissé par un bot remplacé ou par les 30 % perdus à la mort d'un mage. Contient des cadavres à réanimer. |

Règles communes :
- chaque point d'intérêt se **fouille une seule fois par joueur** (le butin est individuel : deux joueurs peuvent piller la même voiture) ;
- la fouille dure **2 s** à proximité et est interrompue si le mage est attaqué ;
- chaque point d'intérêt a une **durée de vie** de 2 à 4 min, puis **disparaît et réapparaît ailleurs**, au hasard sur la carte.

### 7.2 Population

- **Civils** : errent en groupes et fuient les armées. C'est la ressource de base, qui donne des zombies.
- **Camps humains armés** : fixes le temps de leur durée de vie, défendus par des chasseurs, des soldats et des chiens. Les raser donne des squelettes et des bêtes (leurs cadavres), et laisse un coffre au sol que chaque armée peut fouiller une fois.

### 7.3 Zones et phénomènes mobiles

| Phénomène | Effet |
|---|---|
| **Brume purificatrice** | Nuage qui dérive lentement et blesse les morts-vivants, unités et mage. Il faut le contourner ou le traverser vite. |
| **Brume nécrotique** | Nuage mobile dans lequel la réanimation ne prend que 10 s au lieu de 30. Il attire les combats. |
| **Bombardement** (*28 semaines plus tard*) | Des zones sont marquées au sol, puis bombardées 10 s plus tard. Les grosses armées en formation serrée sont les plus touchées. |

### 7.4 Croix sacrées (l'équivalent des piques verts d'agar.io)

Des **zones circulaires** réparties sur la carte, qui changent rarement de place. Une petite armée y passe sans problème. Une grosse armée doit les contourner, et ne peut pas atteindre un joueur réfugié dedans, à moins d'attendre qu'il sorte.

- **Force** : chaque unité a une valeur de force égale à son coût d'évolution (zombie = 1, gros zombie = 5, golem = 10, et de même pour les autres lignées).
  La force est calculée **séparément pour chaque armée**, à partir de ses unités présentes dans la zone.
- **Affichage** : la croix indique son **seuil**, et chaque joueur voit **sa propre force** dans la zone (par exemple « 12 / 40 »).
- **Déclenchement** : si la force d'une armée dans la zone atteint le seuil, la croix s'active et **tue toutes les unités de cette armée qui sont dans la zone**. Le mage n'est pas touché.
- **Conséquences** :
  - les unités tuées par une croix se relèvent pour leur propriétaire au bout de **1 min** au lieu de 30 s, sans transfert : on perd du temps, pas des troupes ;
  - la croix s'éteint et **se recharge pendant 1 min**. Un gros joueur peut donc sacrifier un passage pour atteindre sa cible, mais il le paie cher.
- **Sanctuaire** : tant que la croix est active, **les projectiles qui y entrent brûlent**. Les archers d'un gros joueur ne peuvent pas tirer dedans depuis l'extérieur.

### 7.5 Anti-boule de neige

Comme les morts reviennent sans fin et que tuer un mage rapporte son armée, les grosses armées grossiraient sans limite. Plusieurs mécanismes les freinent **sans retirer son avance au premier** :

| Mécanisme | Effet |
|---|---|
| Plafond et âmes (§6.4) | 150 unités au maximum. Le surplus devient des âmes, qui augmentent le niveau du mage. |
| Ralentissement | Au-delà de 60 unités, l'armée ralentit progressivement, jusqu'à −35 % à 150 unités. |
| Perte au transfert (§4.2, règle 3) | Le tueur d'un mage ne récupère que 70 % de son armée, et le reste tombe en charnier pillable. |
| Croix sacrées (§7.4) | Elles n'affectent que les grosses armées et servent de refuge aux petites. |
| Bombardements (§7.3) | Ils touchent surtout les armées nombreuses et serrées. |
| Prime (§7.6) | Le premier du classement est visible par tous. |

Une petite armée peut ainsi **gêner** une grosse, sans pour autant pouvoir combler l'écart d'un coup.

### 7.6 Événements de rattrapage

Le serveur est persistant, donc ces événements donnent régulièrement une chance aux joueurs moins bien classés **sans pénaliser le premier**.
Le principe : les récompenses dépendent de la **contribution relative** (dégâts infligés rapportés à la taille de l'armée), pas de la taille brute.

| Événement | Fréquence | Description |
|---|---|---|
| **La Citrouille maléfique** 🎃 | Toutes les 6 min environ | Boss géant qui apparaît au hasard et invoque des citrouilles-lanternes. À sa mort, des âmes et des équipements sont distribués au prorata de la contribution relative. L'objet légendaire est tiré au sort, pondéré par la contribution. |
| **Prime** | En continu | Le premier du classement est visible sur la minimap de tous les joueurs. Le tuer rapporte un bonus d'âmes. |

## 8. Ambiance et direction artistique

- **Ton** : cartoon sombre (dans l'esprit de *Plants vs Zombies* et *Don't Starve*). Le screamer est d'autant plus efficace que le reste du jeu est mignon.
- **Vue** : de dessus, en 2D. Les sprites font environ 32 à 64 px et utilisent des animations courtes (marche, attaque, mort, relève).
- **Assets** : packs libres (itch.io, Kenney, OpenGameArt), regroupés dans un seul atlas de textures.
- **Sons et musique** : sources libres de droits (Pixabay, freesound, incompetech).
- **Lisibilité** : chaque armée a une couleur d'aura, et le mage porte un grimoire flottant bien visible.

## 9. Stack technique

**Contrainte n°1 : un jeu fluide sur téléphone avec des centaines d'unités à l'écran.** Toutes les décisions ci-dessous en découlent.

### 9.1 Choix

| Couche | Choix | Pourquoi |
|---|---|---|
| Client | TypeScript, **PixiJS v8**, Vite | Rendu WebGL qui regroupe les sprites d'un même atlas en très peu d'appels de dessin, donc des milliers de sprites à 60 fps, y compris sur téléphone. Pas de moteur lourd à charger. |
| Serveur | **Node.js + TypeScript + ws** | Le même langage que le client permet de partager le protocole, les constantes et les statistiques des unités. Avec le plafond d'armée et une grille spatiale, Node tient facilement environ 4 000 entités à 20 ticks par seconde. |
| Code partagé | Dossier `shared/` | Format du protocole, tables d'unités, d'équipement et d'évolution, constantes de jeu. |
| Hébergement | Serveur sur un PC de l'équipe exposé par Cloudflare Tunnel (gratuit, HTTPS donc `wss://`, sans domaine ni ouverture de port) | Les téléphones du jury se connectent en 4G via le QR code, sans dépendre du Wi-Fi d'Epitech. Un VPS pourra remplacer le tunnel après la JAM. |

### 9.2 Réseau

- **Serveur autoritaire** : il simule tout, et les clients n'envoient que des intentions (déplacement, cible, formation, évolution).
- **20 ticks par seconde** côté serveur. Le client affiche à 60 fps en **interpolant** avec 100 ms de retard.
- **Snapshots binaires** (`ArrayBuffer` / `DataView`), pas de JSON. Les positions sont quantifiées en `uint16`. Un état d'unité tient en environ 8 octets.
- **Gestion d'intérêt** : chaque client ne reçoit que les entités proches de son écran (vue + marge), calculées avec la grille spatiale.
  Avec environ 400 unités visibles, cela représente ~3 Ko par tick, soit ~64 Ko/s : ça passe en 4G.
- Les événements ponctuels (mort, relève, loot, popup) passent par des messages séparés et fiables.

### 9.3 Performances côté client

- Un seul atlas de textures et des sprites réutilisés (pooling) pour éviter les pauses du ramasse-miettes.
- Pas de rendu des entités hors écran, et une densité de pixels plafonnée à 2.
- **Tester sur un vrai téléphone dès la mi-journée du J1.**

### 9.4 Arborescence proposée

```
client/          # PixiJS : rendu, interpolation, contrôles, HUD, sons
server/          # simulation, lobby, bots, événements, réseau
shared/          # protocole binaire, types, chargement de la config
shared/config/   # toutes les valeurs ajustables (§9.5)
docs/            # ce document
```

### 9.5 Configuration

**Règle : aucune valeur de gameplay ou d'équilibrage n'est écrite en dur dans le code.**
Tous les nombres de ce document (durées, rayons, pourcentages, seuils, statistiques) sont des valeurs de départ, rangées dans des fichiers JSON par thème.

| Fichier | Contenu |
|---|---|
| `gameplay.json` | Réanimation (30 s, 10 s en brume nécrotique, 1 min après une croix), mage (PV de base, PV par niveau, Lien d'âme : 80 %, rayon de garde 6 m, plafond 8 %/s), bataille (rayon d'engagement 8 m, marge du cercle d'aggro 8 m, secteur libre 60°), retraite (géométrie du tunnel, minimum de 6 unités), retour ×2,5, transfert 70 % / 30 %, plafond 150, ralentissement (60 unités → −35 %), armée de départ (5 zombies) |
| `formations.json` | Bonus et malus de chaque formation, délai de changement (1,5 s) |
| `units.json` | Statistiques de chaque unité, valeur de force, coûts d'évolution (5 et 10), multiplicateurs du triangle de force, correspondance cadavre → unité |
| `equipment.json` | Objets, catégories, raretés, bonus |
| `world.json` | Taille de la carte, points d'intérêt (durée de vie 2 à 4 min, fouille 2 s, tables de loot), civils, camps, croix sacrées (seuil, rayon, recharge 1 min), brumes, bombardements |
| `events.json` | Citrouille maléfique (fréquence 6 min, PV, récompenses), prime |
| `lobby.json` | Nombre minimum de participants (12), réglages du comportement des bots |
| `network.json` | Ticks par seconde (20), délai d'interpolation (100 ms), marge de la gestion d'intérêt |
| `client.json` | Volumes audio, densité de pixels maximale (2), durée du screamer (0,8 s) |

- **Validation** : chaque fichier est décrit par un schéma zod (`shared/src/config/schema.ts`) et validé au démarrage. Un fichier invalide fait échouer le démarrage avec un message clair.
- **Rechargement à chaud** : le serveur surveille `shared/config/` et recharge les fichiers modifiés **en pleine partie**, puis envoie les valeurs utiles aux clients connectés. Si un fichier rechargé est invalide, le serveur garde l'ancienne config et journalise l'erreur.
- **Exceptions** : les valeurs structurelles (`network.json`, taille de la carte) demandent un redémarrage. Elles sont signalées comme telles dans le schéma.
- **Accès dans le code** : les valeurs passent toujours par l'objet de config (`config.gameplay.reanimation.delaySec`), jamais par une copie locale. C'est ce qui permet au rechargement à chaud de fonctionner.

## 10. Références aux films

- ***Evil Dead* / *L'Armée des ténèbres*** : le grimoire du mage (Necronomicon), la tronçonneuse légendaire, l'armée de squelettes.
- ***La Nuit des morts-vivants*** (1968, domaine public) : citation culte sur l'écran d'accueil, et extraits sonores utilisables librement.
- ***Halloween*** : le boss Citrouille maléfique, accompagné d'un thème au piano *inspiré* de celui de Carpenter (pas l'original, pour les droits).
- ***28 semaines plus tard*** : les bombardements de zones.
- ***Shaun of the Dead*** : la batte de cricket, et un pub *Winchester* comme décor sur la carte.

## 11. Périmètre : MVP, V1, bonus

Le concept complet ne tient pas en 2 jours. Voici ce qui doit marcher, dans l'ordre.

### MVP (J1 + J2 matin) : jouable de bout en bout
- Serveur persistant avec 1 lobby et des bots basiques qui sont remplacés quand un joueur arrive.
- Déplacement au clic ou au tap, et l'armée qui suit le mage.
- Lignée Zombies seulement (zombie et gros zombie).
- Fichiers de config JSON validés et rechargés à chaud, en place dès le premier jour.
- Combat d'usure, réanimation à 30 s, cercle d'aggro, Retraite avec tunnel, encerclement, règles du mage (mort, fuite, abandon, retour), Lien d'âme.
- Croix sacrées, ralentissement et plafond d'armée.
- Civils, voitures et coffres (loot une fois par joueur, qui se déplace sur la carte), armes de mêlée.
- Boss Citrouille maléfique, screamer, musique (exploration et combat), écran d'accueil avec la citation.
- Fluide sur téléphone, déployé en ligne, QR code.

### V1 (J2 après-midi)
- Lignée Squelettes, casques, cimetières, camps humains armés.
- Les 4 formations.
- Popup d'évolution complète (Golem de chair, Baliste d'os).
- Brume purificatrice et brume nécrotique, prime sur le premier du classement.

### Bonus (si le temps le permet)
- Lignée Bêtes, bombardements, mode spectateur sur le projecteur, cosmétiques du mage.

## 12. Répartition à 4

| Rôle | Responsabilités |
|---|---|
| **P1 — Réseau et serveur** | Boucle de tick, lobby, protocole binaire, gestion d'intérêt, remplacement des bots, chargement et rechargement à chaud de la config, déploiement |
| **P2 — Règles de jeu** | Combat d'usure, batailles et cercle d'aggro, encerclement, Retraite et tunnel, propriété des cadavres, règles du mage (§4.2), Lien d'âme, évolutions, équipement |
| **P3 — Client** | Rendu PixiJS, interpolation, caméra, contrôles clic et tap, HUD, popup d'évolution, boutons de formation |
| **P4 — Monde et ambiance** | Carte, points d'intérêt et loot, civils et camps, événements (citrouille, brumes), musique, screamer, assets |

Chacun travaille sur des branches par fonctionnalité avec des commits fréquents, ce qui dépasse largement les 5 push par personne.

### Jalons
- **J1 midi** : deux téléphones voient deux mages se déplacer en temps réel sur le serveur en ligne.
- **J1 soir** : combat d'usure, réanimation et règles du mage fonctionnels contre des bots.
- **J2 midi** : MVP complet, testé à 4 joueurs et 8 bots sur téléphone.
- **J2, 2 h avant le rendu** : plus de nouvelles fonctionnalités. Le reste du temps sert aux finitions, à l'équilibrage et à la répétition de la démo.
