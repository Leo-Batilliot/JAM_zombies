# Base de projet

Structure de départ et règles de travail communes à mes projets.

## Contenu

- `AGENTS.md` : règles de travail (communication, organisation, code, documentation).
- `docs/` : documentation du projet.
  - `decisions.md` : décisions prises et leur statut.
  - `plan.md` : étapes prévues, numérotées `X.YY`.
  - `history.md` : historique des modifications du code.
- `ressources/exemples/` : modèles de référence pour les fichiers de `docs/`.
- `prompts/` : prompts pour chaque étape du cycle de travail.
  - `01-init.md` : interview, puis rédaction du plan et des premières décisions.
  - `02-implement.md` : réalisation d'une ou plusieurs étapes du plan.
  - `03-review.md` : review du code dans un chat séparé, sans contexte, rapport seul.
  - `04-phase-review.md` : bilan de fin de phase et ajustement du plan.
  - `resume.md` : remise en contexte au début d'un nouveau chat.

## Démarrer un projet

1. Copier ce dépôt comme base du nouveau projet.
2. Lancer `prompts/01-init.md` pour construire `docs/plan.md` et `docs/decisions.md` par interview.
3. Pour chaque étape : `prompts/02-implement.md`, puis `prompts/03-review.md` dans un chat séparé.
4. À la fin de chaque phase : `prompts/04-phase-review.md`.
