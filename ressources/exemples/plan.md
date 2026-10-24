# Plan

Modèle de référence pour `docs/plan.md`. Les étapes sont numérotées `X.YY` (phase `X`, étape `YY`). Ce numéro sert de version dans `docs/history.md` et dans les messages de commit.

Le plan doit être le plus poussé possible dès le départ, construit par interview, pour limiter les allers-retours.

---

## Phase 1 : Import des données

Objectif : lire un fichier CSV et obtenir des données validées et exploitables.

### 1.01 Initialisation du projet

Création de la structure du projet, configuration du build, du linter et des tests.

### 1.02 Lecture du fichier

Ouverture du fichier CSV et découpage en lignes, avec gestion de l'encodage UTF-8.

### 1.03 Détection du séparateur

Détection automatique du séparateur (virgule, point-virgule, tabulation) à partir des premières lignes.

### 1.04 Validation des colonnes

Vérification que les colonnes attendues sont présentes et que les types de valeurs sont cohérents.

### 1.05 Gestion des erreurs

Remontée d'erreurs claires indiquant la ligne et la colonne en cause.

### 1.06 Tests du parsing

Tests couvrant les fichiers valides, les séparateurs différents et les fichiers invalides.

## Phase 2 : Export des résultats

Objectif : transformer les données importées dans le format attendu par l'outil qui les consomme.

### 2.01 Export JSON

Génération d'un fichier JSON à partir des données validées.

### 2.02 Tests de l'export

Tests vérifiant que le JSON produit correspond au format attendu.
