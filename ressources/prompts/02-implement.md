# 02 Implémenter une étape

Usage : pour réaliser une ou plusieurs étapes de `docs/plan.md`. Compléter les entrées puis coller le texte sous la ligne, ou demander de suivre ce fichier.

---

Entrées :
- Étape(s) : <X.YY ou plage X.YY-X.YY>
- Précisions : <contraintes ou détails en plus, ou "aucune">

## 1. Contexte

- Lis `AGENTS.md` et respecte-le pendant toute la session.
- Lis dans `docs/plan.md` les étapes demandées et celles dont elles dépendent.
- Lis `docs/decisions.md` et les dernières entrées de `docs/history.md`.
- Vérifie que les étapes précédentes nécessaires sont faites. Si ce n'est pas le cas, signale-le avant d'aller plus loin.

## 2. Questions et plan

- Si quelque chose est ambigu ou contredit une décision existante, pose la question avant de coder.
- Planifie l'implémentation (fichiers touchés, ordre, tests) puis enchaîne, sauf s'il reste des questions.

## 3. Implémenter

- Reste strictement dans le périmètre des étapes demandées. Toute amélioration hors périmètre se propose, elle ne se fait pas.
- Si une décision non prévue doit être prise en cours de route, pose la question au moment où elle se présente.

## 4. Vérifier

- Build, tests et linter. Ajoute les tests qui couvrent ce qui a été fait.
- Si quelque chose échoue ou n'a pas pu être vérifié, dis-le clairement.

## 5. Documenter

- `docs/history.md` : ajoute une entrée en haut, au format de `ressources/exemples/history.md`.
- `docs/decisions.md` : ajoute une entrée pour chaque décision prise pendant l'étape.
- Si le plan doit évoluer (étape à découper, à ajouter, à déplacer), propose la modification de `docs/plan.md` et applique-la après accord.

## 6. Terminer

- Résume ce qui a été fait et ce qui a été vérifié.
- Donne la liste complète des commandes git (branche, add, commit, push) avec un message de commit au format de `AGENTS.md`.
