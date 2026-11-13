# ADR 0002: Sincronización multi-dispositivo con Google Drive (Zero-Backend)

- **Estado**: Aceptado
- **Fecha**: 2026-11-12
- **Issue**: [#16](https://github.com/augustohassel/Listita/issues/16)

## Contexto
**Listita** nació con una arquitectura estrictamente local-first sobre `IndexedDB` (`ListitaDB`), donde compartir datos entre dispositivos requería exportar e importar archivos JSON manualmente desde `Ajustes`. Los usuarios necesitan sincronización automática entre dispositivos sin perder el principio **Zero-Backend** ni delegar sus datos a un servidor de terceros.

## Alternativas Evaluadas
1. **Backend propio con base de datos y cuentas de usuario**: descartado porque rompe el principio Zero-Backend, introduce costos operativos, mantenimiento de autenticación y custodia de datos personales.
2. **Sincronización P2P (WebRTC)**: descartado por la complejidad de señalización, necesidad de que ambos dispositivos estén en línea simultáneamente y fragilidad en redes móviles.
3. **Cliente-a-cliente directo contra Google Drive personal del usuario (GIS Token Model + Drive API v3 + LWW)**: elegido.

## Decisión
Adoptar sincronización cliente-a-cliente hacia el Google Drive personal del usuario utilizando:
- **Google Identity Services (GIS)** cargado *on-demand* con el scope mínimo `https://www.googleapis.com/auth/drive.file` (solo accede a la carpeta `Listita/listita-backup.json` creada por la app).
- **Dexie v2** con `syncId` (UUID), `updatedAt` (timestamp en ms) y tabla `tombstones` para propagar eliminaciones en cascada sin resurrección.
- **Motor de merge determinístico Last-Write-Wins (LWW)** (`src/utils/syncEngine.ts`) que reasigna IDs numéricos locales sin colisiones y protege respaldos remotos frente a `DemoData` sin editar (`updatedAt <= 1`).
- **Workbox `NetworkOnly`** en `vite.config.ts` para `accounts.google.com` y `googleapis.com`, evitando caché obsoleta del Service Worker sobre flujos OAuth o APIs de Drive.

## Consecuencias
- **Positivas**: cero infraestructura de servidor para la app, privacidad total (cada usuario almacena su JSON en su propio Drive), operación 100% funcional offline sobre `IndexedDB`.
- **Negativas / Trade-offs**: el token OAuth de GIS en navegador expira periódicamente (~1 hora). Para evitar falsos avisos de sesión expirada al refrescar la pestaña, el token vigente se resguarda temporalmente en `sessionStorage` (acotado a la pestaña activa) y, ante ausencia o vencimiento, se intenta renovación silenciosa (`prompt: ''`) con timeouts defensivos antes de requerir reconexión manual con un clic; además requiere configurar un `VITE_GOOGLE_CLIENT_ID` público en GCP Console.
