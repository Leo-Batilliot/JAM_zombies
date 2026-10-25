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

## Résultats de la phase 5

Machine : Intel Core i5-12450H, Node 24.21 (celle de la phase 2). Le script accepte maintenant `--bots`, qui garde le minimum du lobby : les joueurs du test remplacent des bots, qui bougent, se battent, pillent, font évoluer leurs troupes et contournent les croix.

Jalon MVP, 4 joueurs et 8 bots, 150 unités par armée au départ, mesure sur 20 s après 3 s de chauffe :
- vue téléphone (36 x 17 m) : tick de 8,0 ms en moyenne, 10,6 ms au 95e centile, 15,6 ms au pire, débit de 1,4 Ko/s en moyenne et 2,0 Ko/s au pire ;
- vue PC (80 x 45 m) : tick de 10,9 ms en moyenne, 15,3 ms au 95e centile, 23,0 ms au pire, débit de 17,3 Ko/s en moyenne et 46,0 Ko/s au pire.

40 participants sans bot, vue PC, mêmes paramètres que les phases précédentes :
- phase 5 : tick de 37,4 ms en moyenne, 48,7 ms au 95e centile, 63,2 ms au pire, débit de 19,3 Ko/s en moyenne et 51,9 Ko/s au pire ;
- version de `main` (phase 4) sur la même machine : tick de 37,2 ms en moyenne, 45,3 ms au 95e centile, 52,6 ms au pire, débit de 17,9 Ko/s en moyenne et 49,8 Ko/s au pire.

Commande du jalon : `npx tsx --conditions=development --env-file-if-exists=../.env scripts/load-test.ts --participants 4 --bots --units 150 --seconds 20 --warmup 3 --view 36x17`, lancée depuis `server/`.

## Conclusions de la phase 5

- Le jalon MVP tient très largement dans le budget de 50 ms et sous les ~64 Ko/s, y compris en vue PC.
- L'équipement, les croix et l'évolution ne changent pas le temps de tick à 40 participants : l'écart avec la phase 4 vient de la machine, plus lente que celle de la phase 4.
- À 40 participants sur cette machine, le pire tick dépasse le budget. C'est déjà le cas en phase 4, à surveiller si le lobby se remplit.
- Les fps sur téléphone ne sont pas mesurés ici : c'est l'étape 5.14.


## Résultats de la phase 6

Machine : AMD Ryzen 5 7535HS, Node 22.23. Camps, brumes, cimetières et projectiles sont actifs avec la config par défaut. Les armées du test sont remplies de zombies : les projectiles viennent seulement des chasseurs des camps. La version de `HEAD` (phase 5) a été mesurée sur la même machine pour comparer.

40 participants sans bot, vue PC :
- phase 6 (trois passages) : tick de 19,1 à 21,8 ms en moyenne, 21 à 35 ms au 95e centile, 26 à 43 ms au pire, débit de 18 à 22 Ko/s en moyenne et 45 à 66 Ko/s au pire ;
- phase 5 : tick de 16,9 à 17,1 ms en moyenne, 20 ms au 95e centile, 22 à 25 ms au pire, débit de 17 à 20 Ko/s en moyenne et 46 à 70 Ko/s au pire.

4 joueurs et 8 bots :
- phase 6, vue téléphone (cinq passages) : tick de 3,6 ms en moyenne, 7 ms au pire, débit de 2 à 14 Ko/s en moyenne et 4 à 20 Ko/s au pire ;
- phase 6, vue PC : tick de 3,7 ms en moyenne, 10 ms au pire, débit de 4,5 Ko/s en moyenne et 7,8 Ko/s au pire ;
- phase 5 : tick de 3,7 à 3,8 ms en moyenne, 11 à 13 ms au pire, débit de 1 à 4 Ko/s en moyenne.

## Conclusions de la phase 6

- Le tick reste sous le budget de 50 ms, y compris au pire à 40 participants. Les nouveaux systèmes coûtent 2 à 5 ms en moyenne.
- Le débit dépend surtout de ce que le joueur croise : un camp en vue, avec ses tirs, fait monter le débit d'un joueur de quelques Ko/s. En moyenne, il reste très en dessous des ~64 Ko/s. Au pire, un passage à 40 participants atteint 66 Ko/s pour un joueur, comme la phase 5 (70 Ko/s) : ce pire cas dépasse légèrement la cible depuis la phase 5.
- Les armées de squelettes (beaucoup de projectiles en vol) ne sont pas mesurées par ce test.

## Résultats de la phase 7

Machine : Intel Xeon 2,8 GHz (2 cœurs virtuels), Node 22.23. Les bombardements ne tombent pas pendant la mesure (première vague après 150 s). La version de `main` (phase 6) a été mesurée sur la même machine pour comparer.

40 participants sans bot, vue PC :
- phase 7 (deux passages) : tick de 39,3 à 43,3 ms en moyenne, 59 à 66 ms au 95e centile, 72 à 86 ms au pire, débit de 18,5 à 18,7 Ko/s en moyenne et 38 à 45 Ko/s au pire ;
- phase 6 (deux passages) : tick de 39,7 à 44,1 ms en moyenne, 63 à 68 ms au 95e centile, 73 à 78 ms au pire, débit de 15,6 à 16,0 Ko/s en moyenne et 51 à 54 Ko/s au pire.

4 joueurs et 8 bots, vue PC :
- phase 7 : tick de 7,6 ms en moyenne, 22 ms au pire, débit de 9,8 Ko/s en moyenne et 19,6 Ko/s au pire ;
- phase 6 : tick de 8,6 ms en moyenne, 23 ms au pire, débit de 9,7 Ko/s en moyenne et 21,6 Ko/s au pire.

## Conclusions de la phase 7

- Le contenu bonus ne change pas le temps de tick : l'écart avec la phase 6 reste dans le bruit d'un passage à l'autre. Cette machine est deux fois plus lente que celles des phases précédentes, d'où un pire cas au-dessus du budget à 40 participants, pour les deux versions.
- Le jalon à 4 joueurs et 8 bots tient très largement dans le budget.
- Deux lobbys pleins tournent dans le même processus : leurs temps de tick s'additionnent. Ce cas n'est pas mesuré par le script.

## Mesure côté client de la phase 8

Mesure indicative, en attendant le test sur un vrai téléphone (5.14 et 8.02). Chrome headless, écran de téléphone simulé (844 x 390, densité 3, plafonnée à 2 par `client.json`), partie avec les 11 bots du lobby et ~65 à 95 unités dans l'armée du joueur, mesure sur 10 s.

- 23 fps sans ralentissement du CPU, 16 fps avec le CPU ralenti 4 fois.
- Le profil CPU montre le thread principal inactif 93 % du temps : le code du jeu et PixiJS prennent moins de 5 %. La limite vient du rendu WebGL logiciel de Chrome headless (pas de GPU), pas du code.

Conclusion : rien à optimiser côté JavaScript à ce stade. Les fps réels sont à mesurer sur téléphone, avec un GPU.
