# Décisions

Format : voir `ressources/exemples/decisions.md`. Entrée la plus récente en haut.

---

### Snapshot à 12 octets par entité | L.BA

- **Quoi** : chaque entité du snapshot porte son type (position dans son registre), l'emplacement de son armée et des drapeaux d'état, en plus de son identifiant, de son genre et de sa position. L'orientation et la marche sont déduites par le client à partir du déplacement.
- **Pourquoi** : le client doit savoir quel sprite dessiner et de quelle couleur, sans message supplémentaire.
- **Impact** : avec ~400 entités visibles, le débit monte à ~96 Ko/s, au-dessus des ~64 Ko/s prévus. Le registre est limité à 256 types par genre, et le lobby à 255 armées.
- **Avis** : À vérifier. Le test de charge (2.18) dira s'il faut réduire le format.

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
- **Avis** : À vérifier. À confirmer par le test de charge (2.18).

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

- **Quoi** : le protocole contient déjà tous les messages prévus (cible, formation, retraite, évolution, démo), mais le serveur n'en traite que trois : rejoindre, taille de vue, déplacement. Les autres sont décodés puis ignorés. Un message mal formé ou envoyé avant d'avoir rejoint ferme la connexion.
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
