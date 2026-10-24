# Déploiement de la démo

Le serveur tourne sur un PC de l'équipe, exposé en HTTPS par un tunnel Cloudflare gratuit (voir `decisions.md`).

## Prérequis

- Node 24 (`nvm use`).
- `cloudflared` : https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- Un fichier `.env` à la racine, copié depuis `.env.example`.

## Lancer

1. `npm ci`
2. `npm run demo` : build complet, puis lancement du serveur sur `PORT`.
3. Dans un autre terminal : `cloudflared tunnel --url http://localhost:<PORT>`
4. Ouvrir l'URL `https://....trycloudflare.com/share` affichée par cloudflared sur le projecteur : le QR code mène au jeu.

L'URL change à chaque lancement du tunnel, la page `/share` suit automatiquement. Le PC doit rester allumé et connecté pendant toute la démo.

## Développement

`npm run dev` lance le serveur (`tsx watch`) et Vite. Vite redirige le WebSocket vers le serveur, le jeu est sur l'URL affichée par Vite.
