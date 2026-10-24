# Historique

Format : voir `ressources/exemples/history.md`. Entrée la plus récente en haut.

---

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

