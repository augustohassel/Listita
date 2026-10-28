# 0001: Tokens Semánticos de Color, Diseño Apple HIG y Temas Claro/Oscuro

- **Fecha**: 2026-10-28
- **Estado**: Aceptada

## Contexto y Problema
Originalmente, Listita utilizaba colores utilitarios directos de Tailwind CSS (`slate-*`, `amber-*`, `orange-*`, `rose-*`) dispersos a lo largo del código. Esto generaba un alto costo de mantenimiento e impedía ofrecer modos visuales adaptables. Además, una primera aproximación de paleta ciruela saturada en los fondos restaba legibilidad y aumentaba la fatiga visual.

Se requería:
1. Una estética sobria, refinada y de inspiración Apple HIG (fondos neutrales iOS: `#F2F2F7` en claro, `#000000` True Black en oscuro; acentos elegantes orquídea/ciruela reservados para botones primarios, foco y selección).
2. Temas Claro y Oscuro con control manual explícito e independiente de la configuración del sistema operativo (`prefers-color-scheme`), siguiendo el patrón arquitectónico probado en proyectos como *Split*.
3. Acceso rápido al cambio de tema tanto desde la cabecera (`Header`) como desde `Ajustes`.

## Alternativas Evaluadas

1. **Tema fijo con detección automática dependiente de `prefers-color-scheme`**:
   - *Ventajas*: Se adapta al sistema sin interacción.
   - *Desventajas*: No permite al usuario forzar el modo deseado si su SO o navegador tiene configuraciones globales distintas. Añade estados intermedios ('system') innecesarios.

2. **Tokens semánticos Apple HIG con variables CSS en canales RGB y temas Claro/Oscuro independientes del sistema (estilo Split)**:
   - *Ventajas*: 
     - Modelo mental binario simple (`'dark' | 'light'`) con persistencia en `localStorage('listita_theme')` y default `'dark'`.
     - Control instantáneo en el `Header` (botón Sol/Luna) y selector visual en `Ajustes`.
     - Script anti-flicker síncrono en `index.html` que aplica la clase `.dark` antes de montar la app.
     - Hook centralizado `useTheme` que expone `{ theme, setTheme, toggleTheme }` y sincroniza `<meta name="theme-color">`.
     - Variables semánticas RGB en `src/index.css` y `tailwind.config.js` (`base`, `surface`, `surface-2`, `line`, `ink`, `ink-muted`, `accent`, `accent-2`, `on-accent`) que soportan opacidades dinámicas (`/alpha`).
   - *Desventajas*: Requiere mantener la paleta de tokens para ambos esquemas (`:root` y `.dark`).

## Decisión Adoptada
Se adopta la **Alternativa 2**:
- Definición de tokens en `src/index.css` en canales RGB para `:root` (Modo Claro) y `.dark` (Modo Oscuro).
- Exposición en `tailwind.config.js` bajo `theme.extend.colors` con formato `rgb(var(--c-token) / <alpha-value>)`.
- Hook desacoplado `src/hooks/useTheme.ts` con helpers `readStoredTheme`, `writeStoredTheme` y `applyThemeToDom`.
- Toggle de tema en `Header.tsx` y selector de 2 opciones (`Claro`, `Oscuro`) en `SettingsView.tsx`.
- Prevención de parpadeo (FOUC) vía script síncrono en `index.html`.
- **Regla estricta de componentes**: Los componentes deben consumir exclusivamente tokens semánticos con nombre, con las siguientes **tres únicas excepciones**:
  1. **Acciones destructivas y errores**: `red-*` (ej. `text-red-600 dark:text-red-300`, `bg-red-500/10`).
  2. **Feedback de éxito**: `emerald-*`.
  3. **Podio de rankings**: acabados metálicos (`amber-*` oro, `slate-*` plata, `orange-*` bronce) encapsulados estrictamente dentro de `getPodiumStyle` en `src/features/Rankings.tsx`.

## Consecuencias y Trade-offs
- **Contraste accesible (WCAG $\ge 4.5:1$)**: Mejor legibilidad y jerarquía visual en ambos temas.
- **Sin sorpresas de sistema**: El usuario elige y controla el tema visual de Listita de forma determinística y local, fiel al principio Zero-Backend y Local-First.
- **Subtítulo contextual**: El `Header` solo muestra el subtítulo de un listado cuando la pestaña activa es de detalle (`items` o `rankings`), dejando la cabecera limpia en `lists` y `settings`.
