# Listita

Listados de vinos, bares, comidas o lo que quieras, con atributos propios, notas y rankings personales.

## Empezar dentro del devcontainer

No necesitás instalar Node en tu computadora. El entorno de trabajo está definido en
`.devcontainer/devcontainer.json` y usa la imagen oficial de desarrollo de Node 22 sobre Debian.

1. Instalá **Docker** (Docker Desktop en Windows/macOS) y dejalo en ejecución.
2. Instalá **Visual Studio Code** con la extensión **Dev Containers** (`ms-vscode-remote.remote-containers`).
3. Cloná este repositorio y abrí su carpeta en VS Code.
4. Ejecutá **Dev Containers: Reopen in Container** desde la paleta de comandos.
   Esperá a que termine `npm ci`, que se ejecuta automáticamente al crear el contenedor.
5. En una terminal **dentro del contenedor**, ejecutá:

   ```sh
   npm run dev
   ```

6. Abrí el puerto reenviado **5173** en el navegador (normalmente `http://localhost:5173`).

En Linux, Docker Engine con permisos para tu usuario también es suficiente. Si cambiás
la configuración del entorno, ejecutá **Dev Containers: Rebuild Container**.

## Qué permite esta primera versión

- Crear listados con categoría y hasta 12 atributos personalizados separados por comas.
  Por ejemplo: `Bodega, Cepa, Año` para vinos o `Barrio, Especialidad` para bares.
- Agregar, editar y eliminar elementos con valores para esos atributos y notas libres.
- Crear varios rankings por listado, por ejemplo «Favoritos» y «Precio/calidad».
  Cada ranking comienza con todos los elementos del listado, en orden de creación.
- Subir y bajar elementos para ordenar un ranking, quitarlos o incorporarlos con el selector.
  Los elementos nuevos no se agregan automáticamente a rankings existentes.
- Guardar cada cambio automáticamente. Al eliminar un elemento se lo quita de sus
  rankings; al eliminar un listado también se eliminan sus elementos y rankings.

Los rankings son **manuales**: esta base no calcula puntuaciones ni promedios ponderados.

## Arquitectura

Basada en [RatingsApp](https://github.com/augustohassel/RatingsApp):

- **React + TypeScript + Vite**: SPA con componentes por funcionalidad, sin backend.
- **Dexie + IndexedDB**: base local versionada `ListitaDB`, con tablas `lists`, `items`
  y `rankings`; consultas reactivas con `dexie-react-hooks`.
- **Transacciones** para validar relaciones y mantener consistentes los borrados.
- **Vitest + Testing Library + happy-dom + fake-indexeddb** para probar persistencia
  e interacción con la interfaz.

Se conserva la base técnica, no el dominio de evaluaciones de RatingsApp. No se incluyen
IA, autenticación, sincronización, PWA ni servicios externos en esta versión.

```text
.devcontainer/       Entorno de trabajo reproducible
src/db/              Esquema, operaciones y pruebas de persistencia
src/features/        Elementos, detalle de listados y rankings
src/test/            Preparación de pruebas
src/types.ts         Modelo de datos
src/App.tsx          Listados y composición de la aplicación
```

## Comandos

Ejecutalos dentro del devcontainer:

| Comando | Uso |
| --- | --- |
| `npm ci` | Instalar las versiones del lockfile |
| `npm run dev` | Servidor de desarrollo accesible desde el puerto 5173 |
| `npm test` | Pruebas de persistencia e interfaz |
| `npm run lint` | Análisis estático con Oxlint |
| `npm run build` | Comprobar TypeScript y generar `dist/` |
| `npm run preview -- --host 0.0.0.0` | Previsualizar `dist/` en el puerto 4173 (reenviarlo en VS Code) |

## Alcance del almacenamiento

Los datos quedan **solo en el navegador y origen usados** (protocolo, host y puerto).
Recargar o reiniciar el contenedor no los borra, pero limpiar los datos del sitio,
usar navegación privada u otro navegador/puerto puede borrarlos o mostrar una base diferente.
No hay copia de seguridad, cuenta ni sincronización entre dispositivos todavía:
no uses esta primera versión como único respaldo de información importante.