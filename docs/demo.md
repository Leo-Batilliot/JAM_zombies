# Démo devant le jury

Déroulé proposé pour l'étape 8.04, à répéter au moins une fois en entier. Durées indicatives, à adapter au temps de passage.

## Matériel

- Le PC serveur, branché sur secteur, sans mise en veille.
- Le projecteur, branché sur un second PC ou sur le PC serveur.
- Le téléphone du présentateur, en 4G ou 5G, chargé.
- Une vidéo de secours d'une partie, enregistrée pendant la répétition.

## 30 min avant

1. `.env` : `DEMO_MODE=true`, `PORT` sur un port libre.
2. `npm ci`, puis `npm run demo`. La console affiche `(demo mode)`.
3. Dans un autre terminal : `cloudflared tunnel --url http://localhost:<PORT>`.
4. Sur le projecteur : ouvrir `https://<tunnel>/share`.
5. Sur le téléphone du présentateur : ouvrir `https://<tunnel>/?demo=1`, entrer un pseudo, vérifier que les boutons Screamer, Pumpkin et Units sont en haut de l'écran.
6. Vérifier le son sur le projecteur et sur le téléphone.

## Déroulé (environ 6 min)

1. Pitch (30 s) : un mage zombifié commande une armée de morts qui se relèvent 30 s après leur mort. Inspiré d'agar.io, avec des combats d'usure et des formations.
2. Le jury rejoint la partie (1 min) : QR code sur le projecteur, chacun choisit un pseudo. Montrer la citation de *La Nuit des morts-vivants* sur l'écran d'accueil. Pendant ce temps, le projecteur passe sur le jeu en cliquant sur « Watch the game » : la caméra suit les combats.
3. La boucle de jeu (1 min 30) : tuer des civils qui se relèvent en zombies, piller une voiture ou un coffre, changer de formation, montrer le cercle d'aggro et la Retraite. Si l'armée est trop petite, `U` pour des renforts.
4. Musique spooky (pendant la boucle) : faire remarquer le passage de la musique d'exploration à celle du combat quand l'armée se bat.
5. Citrouille maléfique (1 min) : `P`. Le boss apparaît près du mage avec son thème au piano inspiré d'*Halloween*. Tous les joueurs peuvent l'attaquer, les récompenses vont au prorata de la contribution.
6. Références aux films (30 s) : grimoire du mage (*Evil Dead*), tronçonneuse et batte de cricket, pub *Winchester* (*Shaun of the Dead*), bombardements (*28 semaines plus tard*), noms des bots.
7. Screamer (30 s) : prévenir le jury, puis `K`. Le mage meurt pour de vrai, le visage et le cri s'affichent, le téléphone vibre sur Android. Le mage réapparaît ensuite avec 5 zombies.
8. Technique (1 min) : serveur autoritaire à 20 ticks par seconde, snapshots binaires, config rechargée à chaud, résultats du test de charge (`docs/load-test.md`).

## Plan B

- Le tunnel ne répond pas : relancer `cloudflared`, rouvrir `/share`, l'URL a changé.
- Plus d'Internet : mettre les téléphones sur le même Wi-Fi que le PC et ouvrir `http://<IP du PC>:<PORT>`.
- Le serveur plante : relancer `npm run start --workspace server` (pas besoin de rebuild).
- Rien ne marche : passer la vidéo de secours.

## À noter pendant la répétition

- Les valeurs qui paraissent mal réglées (8.01), avec le fichier de config concerné.
- Les fps et la fluidité sur les téléphones (8.02).
- Le temps réel de chaque partie du déroulé.
