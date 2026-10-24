# Décisions

Modèle de référence pour `docs/decisions.md`. Entrée la plus récente en haut, pas de tableau.

Statuts possibles : `Validée`, `Provisoire`, `À vérifier`, `Reportée`.

---

### Export des résultats en JSON uniquement | L.BA

- **Quoi** : les résultats de l'import ne sont exportés qu'au format JSON.
- **Pourquoi** : c'est le seul format demandé par l'outil qui consomme les données.
- **Impact** : pas d'export CSV ni Excel pour l'instant, le module d'export reste simple.
- **Avis** : Reportée. Un export CSV pourra être ajouté si un besoin réel apparaît.

### Parsing CSV sans dépendance externe | L.BA

- **Quoi** : le parsing des fichiers CSV est écrit à la main, sans bibliothèque.
- **Pourquoi** : les fichiers à traiter ont un format simple et connu, une dépendance n'apporterait pas grand chose.
- **Impact** : moins de dépendances à maintenir, mais les cas complexes (guillemets imbriqués, retours à la ligne dans un champ) ne sont pas gérés.
- **Avis** : Provisoire. Suffisant pour les fichiers actuels, à remplacer par une bibliothèque si des fichiers plus complexes arrivent.
