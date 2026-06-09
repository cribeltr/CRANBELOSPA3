# Propuesta: estructura de Google Sheets e interfaz — Gestión MP 2026

**Alcance:** rediseño de la estructura de datos (Google Sheet + carpetas Drive) y de la interfaz,
**sin perder ninguna funcionalidad actual**. Incluye diagnóstico con mediciones reales, esquemas
de columnas, árbol de carpetas, wireframes de la interfaz y plan de migración por fases.

---

## 1 · Diagnóstico de la estructura actual

### 1.1 Lo que hoy existe

**Google Sheet (9 hojas, medido sobre la planilla real):**

| Hoja | Tamaño | Rol actual | Problema |
|---|---|---|---|
| `Eventos` | 2.353 × 33 | Entregable (1 fila/evento) | Se **reescribe completa** en cada envío |
| `Catalogos` | 12 × 10 | Listas (ejecutores, códigos) | OK |
| `Resumen` | 28 × 6 | Estadísticas | Se reescribe completa |
| `Correctivos` | 1 × 16 | Copia de los correctivos | Es **copia**, no fuente |
| `Pendientes` | 2 × 18 | Copia de pendientes | Es copia, no fuente |
| `Tareas` | 1 × 9 | Tareas de pendientes | Clave = **ID del equipo** (defecto, ver 1.2c) |
| `Bitacora` | 2 × 8 | Bitácora de pendientes | Misma clave defectuosa |
| `Archivos` | — | Enlaces a Drive | OK (append-only, funciona bien) |
| `_datos` (oculta) | 1 celda | **TODO el estado de la app como JSON en UNA celda** | Ver 1.2a — crítico |
| `_equipos` (oculta) | 966 × 20 | Inventario compacto | OK técnicamente, pero invisible al usuario |

**Carpetas Drive:** `MP 2026 - Archivos/` con una subcarpeta por equipo
(`{id} - {equipo} (Inv {inv})`) y `Descargas/`. Cada archivo se comparte como
**"cualquiera con el enlace puede ver"**.

### 1.2 Hallazgos críticos (con números)

**a) `_datos` tiene un techo duro de ~56 registros — y ya está al 57 %.**
Google Sheets limita cada celda a **50.000 caracteres**. Un registro de mantención serializado
pesa **~888 caracteres** (medido con el código real de la app). Eso da capacidad para
**~56 registros en total** (mantenciones + correctivos + pendientes). Con ~32 registros actuales
ya hay **~28.400 caracteres ocupados (57 %)**. Al superar el límite, `setValue` **lanza error y
el "Enviar" deja de funcionar**. Es cuestión de semanas/meses al ritmo actual. **Este es el punto
más urgente de toda la propuesta.**

**b) Cada guardado reescribe ~97.000 celdas.**
Con "Actualizar Google Sheets al registrar" activo, **cada** mantención guardada dispara la
reescritura completa de todas las hojas (2.353×33 de Eventos + 966×20 de `_equipos` + el resto
≈ **97.334 celdas + el JSON**). Es lento, consume cuotas de Apps Script y multiplica el riesgo
de fallas a medio guardado.

**c) Tareas y Bitácora pierden datos al restaurar.**
Están ligadas al **ID del equipo**, no al pendiente. El código actual solo las restaura
"si hay un único pendiente por equipo". Con 2 pendientes en el mismo equipo, **sus tareas y
bitácora no se recuperan** al traer de Google Sheets.

**d) Multi-usuario: el último que envía pisa a los demás.**
El estado viaja como bloque completo. Si dos personas usan la app en navegadores distintos,
el "Enviar" de una **sobrescribe** los registros de la otra (el candado solo ordena las
escrituras, no las combina).

**e) Archivos compartidos con "cualquiera con el enlace".**
Para documentación de equipos médicos de un hospital es un nivel de exposición innecesario:
basta el acceso del dominio/los usuarios de la planilla.

**f) Carpetas sin orden natural.** `1 - …`, `10 - …`, `100 - …`, `2 - …` (el ID sin ceros
a la izquierda rompe el orden alfabético en Drive).

**g) Trazabilidad limitada.** Ningún registro guarda **cuándo se registró** ni **quién** lo hizo;
no hay respaldo automático de la planilla. En gestión de operaciones hospitalaria, eso es auditoría
básica que hoy falta.

**h) Interfaz.** Lo funcional está, pero: la pestaña **Registrar** concentra búsqueda + ficha +
discrepancias + 2 tablas (página muy larga); **no hay pantalla de inicio** con indicadores (al abrir
se aterriza en "Cargar y generar" aunque los datos ya estén); la **búsqueda** de equipos solo existe
dentro de Registrar; borrar una fila individual no pide confirmación; un registro guardado **no se
puede editar** (solo borrar y re-crear).

---

## 2 · Propuesta: estructura de Google Sheets

### 2.1 Principio: separar DATOS de REPORTES

```
┌─ CAPA DE DATOS (fuente de verdad, 1 fila = 1 hecho, se AGREGA, no se reescribe)
│   Equipos · RegistrosMP · Correctivos · Pendientes · Tareas · Bitacora · Archivos · Catalogos · _meta
│
└─ CAPA DE REPORTES (generados a demanda, formato del hospital INTACTO)
    Eventos · Resumen
```

- La capa de **datos** es la que la app lee/escribe. Guardar una mantención = **agregar 1 fila**
  (no reescribir 97.000 celdas). Sin JSON, sin límite de 50K, legible por humanos y por
  Looker Studio si mañana quieren tableros.
- La capa de **reportes** se regenera con el botón "Enviar/actualizar" (o al descargar el Excel).
  El entregable `Eventos`/`Catalogos`/`Resumen` **no cambia ni una columna**: es el formato que
  el hospital ya conoce.

### 2.2 Esquemas de las hojas de datos

**`Equipos`** (visible; reemplaza `_equipos`) — 1 fila por equipo:

| Col | Campo |
|---|---|
| A | ID |
| B–R | Familia, N° Carpeta, N° Inventario, Equipo, Servicio, Unidad, Ubicación, Procedencia, Marca, Modelo, N° Serie, Año Instalación, Vida Útil Residual, Clasificación, ENU/Baja, Observación, Frecuencia MP |
| S | Prog (compacto `X\|\|\|…`, 12 meses) |
| T | Res (compacto) |
| U | ActualizadoEl |

**`RegistrosMP`** (NUEVA — reemplaza la parte de mantenciones del JSON):

| Col | Campo |
|---|---|
| A | **RegID** (`R-<timestamp>`, estable, lo genera la app) |
| B | EquipoID |
| C–E | N° Inventario, N° Serie, Equipo *(copia de cortesía para lectura humana)* |
| F–G | Mes, N° Mes |
| H | Fecha de ejecución |
| I–J | Programa (P), Resultado (R) |
| K | Causal |
| L | Ejecutor |
| M | Estado final |
| N | Observación |
| O | Adjunto (URL) |
| P | **RegistradoEl** (fecha-hora) |
| Q | **RegistradoPor** (email, si la implementación lo permite) |

**`Correctivos`** (pasa de copia a **fuente**): igual que hoy + `CorrID`, `Adjunto`,
`RegistradoEl`, `RegistradoPor`.

**`Pendientes`** (fuente): igual que hoy + **`PendID`**, `RegistradoEl`, `ResueltoEl`.

**`Tareas`**: `PendID | Tarea | Hecha | RegistradoEl` → **clave por pendiente** (corrige 1.2c).
**`Bitacora`**: `PendID | Fecha | Texto | RegistradoEl`.

**`Archivos`**: igual que hoy (ya funciona bien).
**`Catalogos`**: igual (única fuente de los desplegables).
**`_meta`** (oculta): pares clave/valor — versión del esquema, fecha del último envío/lectura,
contadores. Permite que la app detecte planillas antiguas y **se auto-migre**.

### 2.3 Cambios en el motor (Code.gs)

| Operación | Hoy | Propuesto |
|---|---|---|
| Guardar 1 mantención | Reescribe ~97.000 celdas + JSON | **`appendRow` de 1 fila** en `RegistrosMP` |
| Guardar correctivo/pendiente/tarea | Ídem | 1 fila en su hoja (upsert por ID) |
| "Enviar / actualizar" | Igual que guardar | Solo **regenera reportes** (Eventos/Resumen) |
| "Traer de Google Sheets" | JSON + reconstrucción parcial | Lee las hojas de datos → **restauración total y sin pérdida** (desaparece la nota "las preventivas requieren el snapshot") |
| `_datos` | JSON con techo de ~56 registros | **Se elimina** (tras fase de transición) |

**Trazabilidad:** cada fila lleva ID estable + `RegistradoEl` (+ `RegistradoPor` cuando el
despliegue lo permita). **Respaldo:** función con disparador semanal que copia la planilla a
`03 · Respaldos/` con fecha en el nombre (1 línea de Apps Script, auditoría instantánea).

**Multi-usuario:** al escribir por fila con ID, dos usuarios ya no se pisan el estado completo;
el peor caso pasa de "perder todo lo del otro" a "conflicto en UNA fila" (y el candado existente
ordena los appends).

### 2.4 Carpetas Drive propuestas

```
MP 2026/
├─ 00 · Planilla maestra            (la Google Sheet)
├─ 01 · Archivos de equipos/
│   ├─ ID 0049 · Desfibrilador · Inv 2-112265/
│   ├─ ID 0956 · Máquina Diálisis · Inv 2-128044/
│   └─ …                            (ID con ceros → orden natural en Drive)
├─ 02 · Descargas                   (Excel generados por la app)
└─ 03 · Respaldos                   (copia semanal automática de la planilla)
```

- **Permisos:** reemplazar "cualquiera con el enlace" por **solo dominio / usuarios de la
  planilla** (flag configurable en `Code.gs`, por si necesitan compartir externo puntual).
- La app **migra sola**: si encuentra la carpeta antigua `MP 2026 - Archivos`, la sigue usando
  o la renombra (a elección), sin perder enlaces ya registrados en `Archivos`.

---

## 3 · Propuesta de interfaz

### 3.1 Navegación reorganizada (mismo motor, mejor mapa)

```
┌──────────────┐
│ 🏠 Inicio    │  ← NUEVA: panel de indicadores
│──────────────│
│ OPERACIÓN    │
│ 🩺 Equipos   │  ← absorbe la ficha + registrar (la búsqueda y los 3 botones ya existen)
│ 📌 Pendientes│
│──────────────│
│ GESTIÓN      │
│ 📊 Resumen   │
│ 🧾 Registros │  ← las tablas de mantenciones/correctivos (hoy dentro de "Registrar")
│──────────────│
│ HERRAMIENTAS │
│ 📂 Importar  │  ← antes "Cargar y generar" (+ tarjeta de discrepancias, que pertenece aquí)
│ 🧰 PDF       │
│ ☁️ Sheets    │
│ 📖 Ayuda     │
└──────────────┘
```

### 3.2 Nueva pantalla **Inicio** (todo ya está calculado en el código; solo falta mostrarlo)

```
┌────────────────────────────────────────────────────────────┐
│  Junio 2026                          ☁️ Sincronizado 14:32  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐       │
│  │Programa-│ │Realiza- │ │% Cumpli- │ │Reprograma- │       │
│  │das  19  │ │das   0  │ │miento 0% │ │das      0  │       │
│  └─────────┘ └─────────┘ └──────────┘ └────────────┘       │
│  ⚠ Alertas (clic = filtra Equipos):                        │
│  · 3 pendientes vencidos   · 2 equipos no operativos       │
│  · 1 en servicio técnico                                   │
│  🐸 Sapo del día: Incubadora (ID 411) — vence hoy           │
│  📜 Última actividad: [5 eventos más recientes, global]     │
└────────────────────────────────────────────────────────────┘
```

### 3.3 Buscador global en el encabezado

La búsqueda por serie/inventario/nombre (con las sugerencias que ya existen) pasa al **header**,
visible desde cualquier pestaña → encontrar un equipo siempre cuesta 1 acción, no "ir a
Registrar primero".

### 3.4 Equipos = lista + ficha en el mismo lugar

Ya está el 90 %: la tabla con pestañas de estado/filtros + la ficha con línea de tiempo
unificada y los botones de registro. El cambio es de **ubicación** (la ficha se abre dentro de
Equipos, sin saltar de pestaña) y la vista "Registros" queda para las tablas globales con sus
filtros y el acotado por equipo que ya existe.

### 3.5 Detalles de usabilidad (pequeños, alto impacto)

| Hoy | Propuesto |
|---|---|
| ✕ borra una fila sin preguntar | Confirmación + deshacer simple |
| Un registro no se puede corregir | **Editar** (reabre el modal prellenado, guarda con el mismo RegID → trazable) |
| Varios botones naranjos por vista | 1 sola acción primaria por vista; el resto, secundarias |
| Estados vacíos solo con texto | Estado vacío con botón de acción ("Registrar la primera…") |
| Toast abajo a la derecha para todo | Mensajes con acción (enlace a Calendar) como banner persistente (ya quedó así); confirmaciones simples siguen como toast |
| Móvil: chips horizontales | Barra inferior fija con 4 accesos (Inicio · Equipos · Pendientes · Más) |

---

## 4 · Garantía: nada se pierde

| Funcionalidad actual | Dónde queda |
|---|---|
| Importar Programación MP (xlsm/xlsx) | Herramientas → Importar (igual) |
| Excel entregable (Eventos/Catalogos/Resumen, desplegables, colores) | **Idéntico** (capa de reportes) |
| Registrar mantención (validación de mes, estado final condicional) | Ficha del equipo (igual) |
| Correctivos (5 tipos incl. "Otro") / Pendientes / Tareas / Bitácora | Igual + IDs estables |
| Eisenhower · Ivy Lee · Sapo | Pendientes (igual) + sapo en Inicio |
| Resumen mensual + desglose + export | Igual |
| Export inventario por selección / export por equipo | Igual |
| Adjuntos a Drive + hoja Archivos | Igual (permisos más seguros) |
| Recordatorios Google Calendar | Igual |
| Funcionamiento offline (localStorage) | Igual |
| Utilidades PDF | Igual |
| Modo Apps Script y modo alojado aparte | Igual |

---

## 5 · Plan de implementación por fases

| Fase | Contenido | Riesgo | Urgencia |
|---|---|---|---|
| **F1 — Datos** | `RegistrosMP` + IDs (`RegID/CorrID/PendID`) + `RegistradoEl` + Tareas/Bitácora por `PendID` + escritura **dual** (hojas nuevas y `_datos` a la vez para poder volver atrás) | Medio | **ALTA: el techo de ~56 registros está al 57 %** |
| **F2 — Motor** | Guardado incremental (1 fila por evento), "Enviar" solo regenera reportes, retiro de `_datos`, respaldo semanal, permisos de Drive, carpetas nuevas | Medio | Alta |
| **F3 — Interfaz** | Inicio (panel), buscador global, reagrupar sidebar, Equipos+ficha, editar registro, confirmaciones, móvil | Bajo | Media |

Cada fase se valida con la suite de simulación existente (38+ aserciones en navegador headless)
ampliada con casos nuevos (migración de planilla antigua, dual-write, multi-pendiente por equipo).

**Recomendación:** empezar por **F1** aunque la parte visible sea F3 — el límite del snapshot es
el único punto que puede detener la operación sin aviso.
