# Test de charge

Script : `npm run load-test --workspace server` (paramètres dans `server/package.json`). Le serveur tourne dans le processus du script, avec la config de `CONFIG_DIR`, sans bots. Les faux clients tournent dans un processus séparé pour ne pas fausser le temps de tick : ils rejoignent la partie, envoient leur taille de vue et comptent les octets reçus. Une fois tous les joueurs entrés, chaque armée est remplie jusqu'au nombre d'unités demandé.

Le temps de tick mesuré comprend la simulation et l'envoi des snapshots à tous les clients. Le débit compte la charge utile des messages, sans l'en-tête WebSocket.

## Résultats de la phase 2

Machine : Intel Core i5-12450H, Node 24.21. 40 participants, 150 zombies chacun au départ, armées placées au hasard sur la carte de 400 x 400 m, 150 civils. Mesure sur 20 s après 3 s de chauffe. Les armées se battent entre elles pendant la mesure, il reste ~3 700 à 3 900 unités à la fin.

Chaque mesure a été lancée deux fois. Les combats changent d'un passage à l'autre, d'où des fourchettes.

Vue PC (80 x 45 m) :
- tick : 29 à 30 ms en moyenne, 34 à 38 ms au 95e centile, 52 à 53 ms au pire, pour un budget de 50 ms ;
- débit par client : 80 à 90 Ko/s en moyenne, 140 à 225 Ko/s au pire.

Vue téléphone (36 x 17 m) :
- tick : 27 à 28 ms en moyenne, 32 à 37 ms au 95e centile, 45 à 48 ms au pire ;
- débit par client : 54 à 56 Ko/s en moyenne, ~100 Ko/s au pire.

## Conclusions

- Le temps de tick tient dans le budget à 20 ticks par seconde, avec peu de marge au pire. Avant le décalage aléatoire du ciblage, toutes les unités cherchaient leur cible au même tick et le pire montait à 100 ms.
- Le débit dépasse la cible de ~64 Ko/s dès qu'un client voit plusieurs armées pleines. La réduction est prévue à l'étape 4.15.
