# Guía para Agentes de IA — Listita

## 1. Propósito y Visión
**Listita** es una aplicación web personal (SPA) para crear y gestionar listados de cualquier categoría (vinos, bares, comidas, etc.) con atributos personalizados, notas libres y múltiples rankings manuales por listado.

## 2. Principios No Negociables
- **Zero-Backend y Local-First**: Toda la información vive exclusivamente en el navegador del usuario sobre IndexedDB (`ListitaDB`). No agregar servidores, cuentas ni telemetría sin un cambio de arquitectura explícitamente acordado.
- **Consistencia Transaccional**: Las mutaciones en cascada (como eliminar un elemento quitándolo de sus rankings, o eliminar un listado junto con sus elementos y rankings) deben ejecutarse siempre dentro de transacciones de Dexie (`db.transaction`).
- **Rankings Manuales**: Los rankings reflejan el orden elegido manualmente por el usuario; no calculan promedios ponderados ni puntajes automáticos.
- **Privacidad**: Prohibido incluir secretos, tokens o datos sensibles en código, commits o issues.

## 3. Stack Tecnológico y Estructura
- **UI**: React 19 + TypeScript + Vite
- **Persistencia**: Dexie 4 + `dexie-react-hooks` (IndexedDB)
- **Testing**: Vitest + React Testing Library + `happy-dom` + `fake-indexeddb`
- **Linter**: Oxlint (`.oxlintrc.json`)
- **Entorno**: DevContainer en `.devcontainer/`

### Estructura de Carpetas
- `.devcontainer/`: Configuración del contenedor de desarrollo (`devcontainer.json`, `Dockerfile`).
- `src/types.ts`: Definiciones de entidades del dominio (`List`, `Item`, `Ranking`).
- `src/db/`: Instancia de `ListitaDB`, validaciones y operaciones transaccionales (`index.ts` y `index.test.ts`).
- `src/features/`: Componentes funcionales por vista/característica (`ListDetail.tsx`, `ItemForm.tsx`, `Rankings.tsx`).
- `src/App.tsx`: Composición principal y gestión de listados.
- `docs/glosario.md`: Glosario vivo del dominio del proyecto.
- `docs/decisiones/`: Registro de decisiones de arquitectura (ADR).

## 4. Comandos Habituales
Ejecutar siempre dentro del entorno del proyecto (`/workspaces/Listita`):

- `npm run dev` — Inicia el servidor de desarrollo Vite en `0.0.0.0:5174` (`strictPort: true`).
- `npm test` — Ejecuta la suite de pruebas con Vitest (`vitest run`).
- `npm run lint` — Ejecuta análisis estático con Oxlint (`oxlint`).
- `npm run build` — Verifica tipos con TypeScript (`tsc -b`) y empaqueta en `dist/` (`vite build`).

> **Validación Local Obligatoria**: Antes de dar por finalizada cualquier tarea, el agente debe verificar que `npm run lint`, `npm test` y `npm run build` finalicen sin errores.

## 5. Control de Versiones y Flujo de Trabajo (Git)
- **Rama base de desarrollo**: `dev`.
- **Ramas de tareas**: Todo cambio o corrección se desarrolla en una rama `issue/<n>` creada **siempre a partir de `dev`**:
  ```sh
  git checkout dev && git pull origin dev && git checkout -b issue/<n>
  ```
- **Integración**: Los Pull Requests de tareas se dirigen hacia `dev`. Al mergearse, la rama `issue/<n>` se elimina.
- **Producción**: La promoción a producción se realiza mediante Pull Request desde `dev` hacia `master`.
- **Commits**: Seguir Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **Sin Git Push Automático**: Está estrictamente prohibido ejecutar `git push` sin confirmación explícita y previa del usuario.

## 6. Glosario y Decisiones de Arquitectura
- Mantener actualizado `docs/glosario.md` en tiempo real cada vez que se defina, aclare o ajuste un concepto del dominio.
- Registrar en `docs/decisiones/` toda decisión arquitectónica difícil de revertir surgida tras evaluar alternativas reales.

## 7. Versión y Release (SemVer)
- El número de versión se gestiona centralizadamente en `package.json` y se inyecta en el cliente mediante Vite (`__APP_VERSION__`).
- La versión está visible en la esquina superior del `Header` y en el pie de `Ajustes`.
- **Flujo de Release (SemVer)**:
  1. En la rama `dev`, antes de crear el Pull Request de promoción a `master`, incrementar la versión con la tarea de VS Code (*Release: Incrementar Versión en package.json*) o ejecutando `npm version <patch|minor|major> --no-git-tag-version`.
  2. Los cambios y versiones se integran en `dev` mediante PRs de ramas `issue/<n>`. Cuando se promociona `dev` a `master`, el workflow de GitHub Actions ([`.github/workflows/deploy.yml`](file:///workspaces/Listita/.github/workflows/deploy.yml)) se ejecuta automáticamente:
     - Compila y prueba la aplicación (`npm ci`, `npm run lint`, `npm test`, `npm run build`).
     - Despliega a GitHub Pages (`actions/deploy-pages@v4`).
     - Lee la versión de `package.json`, crea el tag correspondiente (`vX.Y.Z`, o `vX.Y.Z.N` si ya existiera) y publica el GitHub Release con el detalle del PR mergeado.


