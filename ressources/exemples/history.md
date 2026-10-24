# Historique

Modèle de référence pour `docs/history.md`. Entrée la plus récente en haut, sans date, pas de tableau.

Ligne de titre : nom de la modification, version (étape(s) de `docs/plan.md`), personne. En dessous, une micro-ligne par fichier (ou par dossier si le contenu est générique).

---

### Parsing CSV complet | 1.02-1.06 | L.BA

- `src/csv/reader.ts` : lecture du fichier et découpage en lignes.
- `src/csv/separator.ts` : détection automatique du séparateur.
- `src/csv/validator.ts` : validation des colonnes et des types.
- `src/csv/errors.ts` : erreurs avec numéro de ligne et de colonne.
- `tests/csv/` : tests du parsing sur fichiers valides et invalides.
- `tests/fixtures/` : fichiers CSV d'exemple pour les tests.

### Initialisation du projet | 1.01 | L.BA

- `package.json` : scripts de build, de test et de lint.
- `tsconfig.json` : configuration TypeScript.
- `.eslintrc.json` : règles du linter.
