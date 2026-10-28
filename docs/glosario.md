# Glosario de Dominio — Listita

Este documento registra las entidades y conceptos funcionales de **Listita** para mantener un lenguaje ubicuo consistente entre colaboradores y agentes de IA.

---

### Listado (`List`)
- **Definición**: Colección temática creada por el usuario (por ejemplo, «Vinos tintos» o «Bares de especialidad») que agrupa elementos bajo una categoría opcional y define hasta 12 atributos personalizados.
- **Alcance / Propósito**: Actúa como contenedor raíz de elementos y rankings; su eliminación borra en cascada todos sus elementos y rankings asociados.
- **Lo que NO es**: No es un ranking en sí mismo ni impone una plantilla rígida global para toda la aplicación.

### Atributo Personalizado (`field` / `attributes`)
- **Definición**: Propiedad definida a nivel de cada listado (de 1 a 60 caracteres, hasta 12 por listado, sin duplicados ignorando mayúsculas/minúsculas) cuyos valores se completan en texto libre dentro de cada elemento.
- **Alcance / Propósito**: Permite adaptar la estructura de datos de cada listado al tipo de objeto catalogado (ej. `Bodega`, `Cepa`, `Año`).
- **Lo que NO es**: No es un campo tipado numéricamente ni participa en cálculos automáticos de puntaje.

### Elemento (`Item`)
- **Definición**: Ítem individual perteneciente a un único listado, compuesto por nombre obligatorio, notas libres (hasta 4000 caracteres) y los valores correspondientes a los atributos personalizados del listado.
- **Alcance / Propósito**: Representa la unidad catalogada y evaluable dentro de los rankings del listado. Al eliminarse, se remueve automáticamente de cualquier ranking que lo incluya.
- **Lo que NO es**: No es compartido entre múltiples listados.

### Ranking (`Ranking`)
- **Definición**: Lista ordenada manualmente de un subconjunto (o la totalidad) de los elementos de un listado, identificada por un nombre (ej. «Favoritos», «Precio/calidad»).
- **Alcance / Propósito**: Permite comparar y priorizar elementos de un mismo listado bajo distintos criterios subjetivos del usuario. Al crearse incluye todos los elementos existentes del listado en ese momento; los elementos creados con posterioridad no se agregan automáticamente a rankings ya existentes.
- **Lo que NO es**: No es un ranking calculado por puntaje, fórmula o promedio ponderado.

### Copia de Seguridad (`BackupData`)
- **Definición**: Archivo JSON estructurado y versionado que contiene la totalidad de las colecciones locales (`lists`, `items` y `rankings`) junto con la fecha de exportación (`exportedAt`).
- **Alcance / Propósito**: Permite resguardar los datos locales fuera del navegador y restaurarlos de manera atómica (`db.transaction`) tras validar esquema e integridad referencial (pertenencia de elementos y rankings a sus listados).
- **Lo que NO es**: No es un servicio de sincronización automática en la nube ni reemplaza validaciones de integridad al importar.

### Dataset de Demostración (`DemoData`)
- **Definición**: Conjunto curado de listados de ejemplo (como vinos tintos y cafés de especialidad) con atributos personalizados, elementos con notas y rankings prearmados.
- **Alcance / Propósito**: Permite explorar las capacidades visuales y funcionales de la aplicación con un toque desde el estado vacío o desde la vista de Ajustes, sin alterar la regla de inicio limpio por defecto.
- **Lo que NO es**: No es contenido fijo obligatorio ni impide que el usuario lo edite o elimine como cualquier otro listado.


