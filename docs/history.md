# Historique

Format : voir `ressources/exemples/history.md`. Entrée la plus récente en haut.

---

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

