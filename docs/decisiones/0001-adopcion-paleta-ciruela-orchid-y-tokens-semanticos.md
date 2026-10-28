# 0001: Adopción de Paleta Ciruela/Orchid y Tokens Semánticos de Color

- **Fecha**: 2026-10-28
- **Estado**: Aceptada

## Contexto y Problema
Originalmente, Listita utilizaba colores directos utilitarios de Tailwind CSS (`slate-*`, `amber-*`, `orange-*`, `rose-*`) hardcodeados a lo largo de 11 archivos y más de 380 apariciones. Esto generaba un alto costo de mantenimiento, dispersión estilística e imposibilidad de rediseñar o ajustar la identidad visual de la aplicación de manera centralizada. Adicionalmente, se buscaba brindarle una identidad propia basada en la paleta Ciruela/Orchid (`#400D1B`, `#4C213F`, `#570F33`, `#CDB0CC`, `#E4A7D8`).

## Alternativas Evaluadas
1. **Colores directos de Tailwind con nombres de paleta (`plum-*`, `orchid-*`)**:
   - *Ventajas*: Rápido de mapear.
   - *Desventajas*: No desacopla el rol funcional del color; cambiar la temática a futuro obligaría nuevamente a renombrar clases en todos los componentes.
2. **Tokens semánticos de diseño vía variables CSS en canales RGB con `rgb(var(--…) / <alpha-value>)` en Tailwind**:
   - *Ventajas*: Los componentes consumen exclusivamente nombres basados en su rol de interfaz (`base`, `surface`, `surface-2`, `line`, `ink`, `ink-muted`, `accent`, `accent-2`, `on-accent`). Soporta transparencias nativas de Tailwind (`/15`, `/30`, `/80`) sin romper el build y centraliza cualquier cambio futuro en `src/index.css`.
   - *Desventajas*: Requiere estricta disciplina para definir canales en RGB separado por espacios y no en Hexadecimal.

## Decisión Adoptada
Se adopta la **Alternativa 2**:
- Definición de tokens en `src/index.css` en canales RGB (`--c-base: 64 13 27;`, `--c-surface: 76 33 63;`, etc.).
- Exposición en `tailwind.config.js` bajo `theme.extend.colors` con formato `rgb(var(--c-token) / <alpha-value>)`.
- **Regla estricta de componentes**: Los componentes UI deben consumir exclusivamente tokens semánticos con nombre. Se prohíbe el uso de colores utilitarios directos de Tailwind, con las siguientes **únicas tres excepciones**:
  1. **Feedback de error y acciones destructivas**: uso exclusivo de `red-*` (evitando `rose-*` que colisiona tonalmente con la gama ciruela/orquídea).
  2. **Feedback de éxito**: uso de `emerald-*`.
  3. **Podio de rankings**: uso de acabados metálicos (`amber-*` para oro, `slate-*` para plata, `orange-*` para bronce) encapsulado estrictamente dentro de la función auxiliar `getPodiumStyle` en `src/features/Rankings.tsx`.

## Consecuencias y Trade-offs
- **Consistencia y mantenibilidad**: Toda la UI refleja una identidad visual coherente y accesible (contraste WCAG $\ge 4.5:1$).
- **Regla de variables**: Las variables CSS deben mantenerse siempre en canales RGB; definirlas en Hex generaría clases con opacidad vacías silenciosamente.
