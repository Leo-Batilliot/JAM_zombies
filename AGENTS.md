# Règles de travail

Ce fichier décrit comment on travaille sur ce projet. Il s'applique à toute personne ou tout outil qui intervient sur le dépôt.

## 1. Comportement avec l'utilisateur

### Communication

- Réponds en français, de façon directe et concise. Pas de formules de politesse inutiles.
- N'utilise jamais de tirets cadratins (U+2014) ni demi-cadratins (U+2013), ni emojis ou smileys. Cela vaut pour les réponses dans le chat comme pour tout texte rédigé (documentation, commentaires, messages).

### Interview et questions

- Passe toujours par des interviews pour affiner le contexte du projet.
- Si une demande est ambiguë ou qu'un choix a des conséquences importantes, pose une question courte avant de te lancer.

### Planification

- Pour une tâche de plus de quelques étapes, planifie d'abord comment elle pourrait fonctionner avant de passer à l'acte.
- Pas besoin de s'arrêter entre la planification et l'exécution, sauf s'il reste des questions : dans ce cas, on s'arrête et on les pose.

### Transparence sur le résultat

- Si quelque chose échoue ou n'a pas pu être vérifié, dis-le clairement au lieu de présenter le travail comme fini.
- Quand tu corriges un bug, explique en une phrase la cause réelle et ce qui a été fait pour y remédier.

### Actions à risque

- Demande avant toute commande destructive (`rm -rf`, suppression de base de données, `docker system prune`, etc.).

## 2. Organisation

### Git

- Aucune action git qui n'est pas en lecture seule (`add`, `commit`, `push`, `merge`, `switch`, `branch`, etc.). À la place, donne la liste complète des commandes à lancer pour pousser le code une fois le travail fini.
- Toujours travailler sur une branche, sauf pour une modification de moins de 20 lignes dans une doc ou équivalent.
- Messages de commit courts, en anglais, au format `[P.NO][version] type: description` :
  - `P.NO` : première lettre du prénom, point, deux premières lettres du nom, en majuscules.
  - `version` : numéro d'étape de `docs/plan.md` concerné, seul (`[1.02]`) ou en plage (`[1.02-1.06]`).
  - `type` : format Conventional Commits (`feat`, `fix`, `docs`, etc.).
  - Exemple : `[L.BA][1.02-1.06] feat: complete csv parsing system`
- Aucune ligne d'attribution (`Co-Authored-By`), aucun pied de page du type "Generated with...", aucun identifiant de session, aucune mention d'un outil ou d'un modèle dans les messages de commit ni dans les descriptions de PR.

### Numérotation

- Les étapes de `docs/plan.md` sont numérotées `X.YY` (phase `X`, étape `YY`).
- La phase `0` est réservée à l'initialisation du dépôt (ex. `0.01`).
- Ce numéro sert de version partout : dans `docs/history.md` et dans les messages de commit.

## 3. Code

### Conventions

- Respecte le style, la structure et les conventions déjà présents dans le projet avant d'en introduire de nouveaux. Si tu vois des incohérences, signale-les.
- Nomme les variables et fonctions en anglais, avec des mots clairs et concis : pas de phrases longues, pas d'acronymes incompréhensibles.

### Périmètre

- Fais le changement le plus simple qui répond à la demande.
- Pas de refactor, d'abstraction ou de fonctionnalité non demandés. Si quelque chose te semble intéressant à faire, propose-le en interview, sans jamais prendre le lead.
- N'ajoute pas de dépendance sans demander.

### Propreté

- Pas de code mort, pas de `console.log` / `print` de debug.
- Commente peu : un commentaire n'a sa place que lorsqu'il apporte une information réellement utile que le code ne dit pas déjà (cas rare).

### Configuration

- Aucune valeur en dur dans le code (URL, ports, chemins, limites, délais, paramètres métier, etc.) : tout passe par des variables d'environnement ou des fichiers de configuration, pour que le projet reste facilement configurable.

### Vérification

- Avant de dire qu'une tâche est terminée : compile / build, lance les tests et le linter si possible.

### Sécurité

- Jamais de secrets (clés API, mots de passe, tokens) en dur dans le code : utilise des variables d'environnement et un `.env` présent dans `.gitignore`.

## 4. Documentation

- Toute la documentation s'écrit dans `docs/`.
- Privilégie toujours une documentation courte et claire : aller à l'essentiel, pas de remplissage.
- Trois fichiers servent de référence : `decisions.md`, `plan.md` et `history.md`.
- Leur format de référence est dans `ressources/exemples/`. Ces modèles restent en place même quand le contenu de `docs/` est remis à zéro.
- Pas de tableau dans ces fichiers.
- Le champ "personne" contient toujours les initiales d'une personne, au même format que les commits (ex. `L.BA`).

### docs/decisions.md

- C'est le fichier qui guide en permanence sur l'avancement et les décisions prises dans le projet.
- Le but n'est pas de répertorier chaque détail technique : une personne qui referait le projet en suivant ces décisions doit arriver à un résultat similaire.
- Entrée la plus récente en haut.
- Chaque décision contient :
  - une ligne de titre : nom de la décision et personne qui l'a prise ;
  - en dessous, une courte description : en quoi consiste la décision, pourquoi, et quel est son impact ;
  - l'avis de la personne : un statut fixe suivi d'une phrase libre.
- Statuts possibles :
  - `Validée` : décision stable.
  - `Provisoire` : possible actuellement, mais à changer plus tard.
  - `À vérifier` : à confirmer (test, mesure, retour).
  - `Reportée` : on le fera plus tard.

### docs/plan.md

- Contient tout le futur prévu du projet.
- Divise le projet en phases et étapes claires, en fonction des besoins du projet, numérotées `X.YY`.
- Doit être le plus poussé possible dès le départ, construit par interview, afin de limiter les allers-retours.

### docs/history.md

- Contient l'historique des modifications apportées au code.
- Entrée la plus récente en haut, sans date.
- Chaque entrée contient :
  - une ligne de titre : nom de la modification, version (étape(s) de `plan.md`), personne ;
  - en dessous, une micro-ligne par fichier modifié décrivant ce qui est nouveau (ou par dossier si le contenu est générique, par exemple des assets).
