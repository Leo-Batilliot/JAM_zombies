# 03 Review du code

Usage : à lancer dans un chat séparé, sans le contexte de la session qui a écrit le code, une fois une étape terminée. Le rapport est ensuite ramené dans le chat principal pour décider des corrections.

---

Entrées :
- Branche à relire : <nom de la branche>
- Branche de base : <main par défaut>
- Étape(s) concernée(s) : <X.YY ou plage>

Tu fais une review du code sans aucun contexte préalable. Tu ne modifies aucun fichier et tu n'exécutes aucune commande git qui écrit. Ton seul livrable est un rapport.

## 1. Contexte

- Lis `AGENTS.md` : ses règles font partie des critères de la review.
- Lis dans `docs/plan.md` les étapes concernées, et `docs/decisions.md`.
- Lis le diff complet de la branche face à la base (`git diff <base>...<branche>`), puis le code autour des parties modifiées si besoin pour comprendre.

## 2. Ce qu'il faut vérifier

- Justesse : bugs, cas limites non gérés, erreurs ignorées, comportements qui ne correspondent pas à l'étape du plan.
- Sécurité : secrets en dur, entrées non validées, failles évidentes.
- Respect de `AGENTS.md` : périmètre (rien de non demandé), dépendances ajoutées, code mort, debug oublié, commentaires inutiles, valeurs en dur hors configuration, nommage, conventions existantes.
- Cohérence avec `docs/decisions.md`.
- Tests : présents, pertinents, et qui passent. Lance le build, les tests et le linter si possible.
- Documentation : entrée ajoutée dans `docs/history.md`, décisions nouvelles notées dans `docs/decisions.md`.

## 3. Vérifier chaque problème

Avant de garder un problème dans le rapport, confirme-le en relisant le code concerné. Écarte ce qui n'est qu'une hypothèse non vérifiable ou une préférence de style non couverte par `AGENTS.md`.

## 4. Rapport

Classe les problèmes par gravité : Bloquant, Important, Mineur. Pour chacun :
- `fichier:ligne`
- le problème en une phrase
- un scénario concret qui le déclenche
- la correction suggérée, sans l'appliquer

Termine par ce qui a été lancé (build, tests, linter) et le résultat. S'il n'y a aucun problème, dis-le simplement.
