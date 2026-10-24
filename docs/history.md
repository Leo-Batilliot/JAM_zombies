# Historique

Format : voir `ressources/exemples/history.md`. Entrée la plus récente en haut.

---

### Initialisation technique et CI | 1.01-1.02 | T.BE

- `package.json` : workspaces `shared`, `server` et `client`, scripts `dev`, `build`, `lint`, `format`, `typecheck` et `test`, outillage en versions exactes.
- `tsconfig.base.json` : options TypeScript strictes communes, condition `development` pour lire `shared/` depuis ses sources.
- `shared/` : paquet `@horde/shared`, sources en développement et `dist/` une fois compilé.
- `server/` : paquet `@horde/server`, `tsx watch` en développement, build `tsc` vers `dist/`.
- `client/` : paquet `@horde/client`, typecheck seul en attendant Vite (1.11).
- `eslint.config.js` : typescript-eslint en mode strict avec typage.
- `.prettierrc.json`, `.prettierignore` : Prettier par défaut, Markdown exclu.
- `vitest.config.js` : tests dans `*/tests/`.
- `.nvmrc`, `.env.example` : Node 24, variables `PORT` et `DEMO_MODE`.
- `.github/workflows/ci.yml` : lint, typecheck, tests et build sur chaque push.

