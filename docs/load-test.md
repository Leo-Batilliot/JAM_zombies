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

## Résultats de la phase 4

Machine : AMD Ryzen 5 7535HS, Node 22.23 (le projet demande Node 24, non disponible sur cette machine). Mêmes paramètres que la phase 2. Pour comparer sur la même machine, la version de la phase 3 (avant le delta et les règles de bataille) a été mesurée elle aussi.

Phase 3, sur cette machine :
- vue PC : tick de 15,4 ms en moyenne (27 ms au pire), débit de 104 Ko/s en moyenne et 230 Ko/s au pire ;
- vue téléphone : tick de 14,5 ms en moyenne (26 ms au pire), débit de 53 Ko/s en moyenne et 103 Ko/s au pire.

Phase 4, avec les snapshots en delta et les règles de bataille, deux passages en vue PC et cinq en vue téléphone :
- vue PC : tick de 17,3 à 17,4 ms en moyenne, 22 ms au 95e centile, 25 à 32 ms au pire, débit de 14 à 15 Ko/s en moyenne et 49 à 51 Ko/s au pire ;
- vue téléphone : tick de 16,6 à 19,5 ms en moyenne, 20 à 26 ms au 95e centile, 25 à 35 ms au pire, débit de 7 à 13 Ko/s en moyenne et 29 à 41 Ko/s au pire. Un passage a eu un tick isolé à 164 ms, qui n'est pas revenu sur les quatre autres.

## Conclusions de la phase 4

- Le débit passe sous les ~64 Ko/s visés, au pire comme en moyenne. Le gain vient surtout des entités immobiles (unités au repos, cadavres, points d'intérêt), qui ne sont plus renvoyées. La fréquence d'envoi n'a pas eu besoin d'être réduite.
- Dans ce test, les mages ne bougent pas : seules les unités qui se battent changent de position. Une armée entière en marche coûte 9 octets par unité et par tick au lieu de 12, soit environ 75 % du débit de la phase 3 dans le pire cas. Le test ne mesure pas encore ce cas.
- Les règles de bataille ajoutent environ 2 ms par tick, le budget de 50 ms reste large.
