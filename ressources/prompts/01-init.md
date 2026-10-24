# 01 Initialisation du projet

Usage : à lancer au démarrage d'un projet, dans un nouveau chat. Compléter les entrées puis coller le texte sous la ligne, ou demander de suivre ce fichier.

---

Entrées :
- Description du projet : <ce qu'on veut construire, en quelques phrases>
- Sources disponibles : <sujet, cahier des charges, maquettes, docs, liens, ou "aucune">

Tu démarres un nouveau projet. Lis d'abord `AGENTS.md` et respecte-le pendant toute la session. Le but de cette étape est de produire `docs/plan.md` et `docs/decisions.md`, pas d'écrire du code.

## 1. Lire les sources

- Lis toutes les sources fournies.
- S'il manque une source utile (sujet complet, spécifications, maquettes, documentation d'une API ou d'une techno imposée), demande-la avant d'aller plus loin.

## 2. Interview

Mène une interview approfondie pour affiner au maximum le fonctionnement du projet avant de proposer quoi que ce soit. Procède par tours de quelques questions courtes, chacune avec ta recommandation quand tu en as une. Continue tant qu'il reste des zones floues.

Points à couvrir au minimum :
- Objectif du projet et problème résolu.
- Utilisateurs visés et cas d'usage principaux.
- Fonctionnalités attendues, avec leur priorité.
- Ce qui est explicitement hors périmètre.
- Contraintes : technologies imposées ou interdites, délais, environnement d'exécution, règles d'un sujet.
- Données : d'où elles viennent, leur format, leur volume, ce qu'on stocke.
- Interfaces : CLI, web, API, autres systèmes à intégrer.
- Critères de réussite : comment on sait que le projet est fini et qu'il fonctionne.
- Tests, build, linter et déploiement attendus.

## 3. Reformuler

Résume ta compréhension complète du projet en quelques paragraphes et fais-la valider. Corrige jusqu'à validation explicite.

## 4. Choix structurants

Pour chaque choix structurant (langage, framework, architecture, stockage, dépendances principales), propose une option recommandée avec ses alternatives et fais trancher. Aucune dépendance n'est ajoutée sans accord.

## 5. Rédiger

- `docs/decisions.md` : une entrée par choix tranché, au format de `ressources/exemples/decisions.md`.
- `docs/plan.md` : au format de `ressources/exemples/plan.md`. Le plan doit être le plus poussé possible pour limiter les allers-retours : phases claires, étapes `X.YY` assez petites pour tenir dans une session, ordre qui respecte les dépendances entre étapes. La première étape de la phase 1 est l'initialisation technique du projet (structure, build, linter, tests).
- Fais relire le plan et ajuste-le jusqu'à validation.

## 6. Terminer

Donne la liste des commandes git à lancer pour pousser ces fichiers.
