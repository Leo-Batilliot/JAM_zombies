# Horde.io

Jeu multijoueur en ligne (.io) sur le thème des zombies, jouable sur navigateur, PC et téléphone. Chaque joueur est un mage zombifié qui commande une armée de morts : les unités tuées se relèvent 30 s plus tard, et passent à l'ennemi si leur mage fuit ou meurt.

Le concept est dans `docs/concept.md`, et les changements du revamp dans `docs/conceptV2.md`.

## Prérequis

- Node 24 (`nvm use` lit `.nvmrc`).
- Pour la démo en ligne : `cloudflared` (voir `docs/deploy.md`).

## Installation

```bash
nvm use
npm ci
cp .env.example .env
```

Les variables de `.env` sont toutes obligatoires. Les chemins sont relatifs au dossier `server/`. Si le port de `PORT` est déjà pris, en choisir un autre.

## Lancer

- Développement : `npm run dev`. Lance le serveur (rechargé à chaque modification) et Vite. Le jeu est sur l'URL affichée par Vite.
- Démo : `npm run demo`. Build complet, puis serveur sur `PORT`, qui sert aussi le jeu. Pour l'ouvrir aux téléphones, voir `docs/deploy.md`.
- Page du QR code : `/share`.

Les valeurs de jeu sont dans `shared/config/*.json`. Elles sont validées au démarrage et rechargées à chaud en pleine partie.

## Contrôles

PC :
- clic gauche sur le sol : déplacer le mage et son armée ;
- clic gauche sur un ennemi : l'attaquer ;
- `1` à `4` : formations (Phalanx, Wedge, Circle, Swarm) ;
- s'éloigner d'une bataille : fuir, seules les unités au corps à corps restent sur place ;
- cartes de level up : choisir une mutation, un don ou un sort ;
- `Espace` : lancer le sort actif.

Téléphone, en paysage : tap à la place du clic, et boutons à l'écran pour les formations, les cartes et le sort.

Mode démo (`DEMO_MODE=true` et `?demo=1` dans l'URL) : `K` screamer, `P` Citrouille maléfique, `U` renforts.

## Vérifier

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Test de charge : `npm run load-test --workspace server` (résultats dans `docs/load-test.md`).

## Structure

- `client/` : rendu PixiJS, interface, sons.
- `server/` : simulation, lobby, bots, réseau.
- `shared/` : protocole binaire, schéma de config, registres de contenu.
- `shared/config/` : toutes les valeurs ajustables.
- `docs/` : concept, plan, décisions, historique, déploiement, démo, crédits.

## Travailler sur le projet

Règles de travail dans `AGENTS.md`. Les prompts du cycle de travail sont dans `ressources/prompts/`, les modèles des fichiers de `docs/` dans `ressources/exemples/`.
