# 0001: Adopción de Tokens Semánticos de Color y Estilo Apple HIG (Claro y Oscuro)

- **Fecha**: 2026-10-28
- **Estado**: Aceptada

## Contexto y Problema
Originalmente, Listita utilizaba colores directos utilitarios de Tailwind CSS (`slate-*`, `amber-*`, `orange-*`, `rose-*`) hardcodeados a lo largo de 11 archivos y más de 380 apariciones. Esto generaba un alto costo de mantenimiento e imposibilidad de adaptar temas dinámicos. Adicionalmente, una primera aproximación de paleta ciruela saturada en los fondos oscureció la interfaz y compitió con la lectura. Se acordó adoptar un diseño sutil alineado con **Apple Human Interface Guidelines (HIG)** con soporte nativo de Modo Claro y Modo Oscuro.

## Alternativas Evaluadas
1. **Fondos saturados con paleta fija monocromática**:
   - *Ventajas*: Muy distintivo.
   - *Desventajas*: Fatiga visual, satura las tarjetas y compite con el contenido del usuario.
2. **Tokens semánticos Apple HIG con variables CSS en canales RGB y selector de tema**:
   - *Ventajas*: Enfoque *content-first*. Fondos neutrales de sistema (iOS Grouped Background: `#F2F2F7` en claro, `#000000` True Black en oscuro), superficies limpias (`#FFFFFF` y `#1C1C1E`), materiales translúcidos ligeros (*blur* sutil) y acentos elegantes de ciruela/orchid reservados para botones primarios, pestañas activas e indicadores de foco. Soporta selector de tema `Sistema` / `Claro` / `Oscuro` persistido localmente.
   - *Desventajas*: Requiere definir variables para ambos esquemas (`:root` y `.dark`).

## Decisión Adoptada
Se adopta la **Alternativa 2**:
- Definición de tokens en `src/index.css` en canales RGB (`base`, `surface`, `surface-2`, `line`, `ink`, `ink-muted`, `accent`, `accent-2`, `on-accent`) para `:root` (Modo Claro) y `.dark` (Modo Oscuro).
- Exposición en `tailwind.config.js` bajo `theme.extend.colors` con formato `rgb(var(--c-token) / <alpha-value>)`.
- Selector de tema segmentado en Ajustes (`SettingsView`) con persistencia en `localStorage` y prevención de parpadeo vía script en `index.html`.
- **Regla estricta de componentes**: Los componentes UI deben consumir exclusivamente tokens semánticos con nombre. Se prohíbe el uso de colores utilitarios directos de Tailwind, con las siguientes **únicas tres excepciones**:
  1. **Feedback de error y acciones destructivas**: uso exclusivo de `red-*` (evitando `rose-*` que colisiona con tonos orquídea).
  2. **Feedback de éxito**: uso de `emerald-*`.
  3. **Podio de rankings**: uso de acabados metálicos (`amber-*` para oro, `slate-*` para plata, `orange-*` para bronce) encapsulado estrictamente dentro de la función auxiliar `getPodiumStyle` en `src/features/Rankings.tsx`.

## Consecuencias y Trade-offs
- **Consistencia y elegancia**: La interfaz prioriza la información del usuario con un diseño sobrio, materiales sutiles y contraste WCAG $\ge 4.5:1$ en ambos modos.
- **Subtítulo contextual**: El `Header` solo muestra el subtítulo de un listado cuando la pestaña activa es de detalle (`items` o `rankings`), dejando la cabecera limpia en `lists` y `settings`.
