# CRANBELOSPA3 — Gestión MP 2026

Aplicación web (un solo archivo) para convertir la **Programación MP 2026** del
Hospital Hernán Henríquez Aravena en un Excel con **una fila por evento**, y para
gestionar mantenciones preventivas, eventos correctivos, pendientes y archivos.
Todo el procesamiento ocurre en el navegador (ExcelJS); opcionalmente se sincroniza
con Google Sheets mediante Apps Script.

## Archivos

- **`index-appsscript.html`** — la aplicación completa (UI + lógica + módulo de
  parseo `MP` + constructor de Excel `MPOUT`). Funciona alojada aparte o servida
  desde Apps Script.
- **`Code.gs`** — puente de Google Apps Script (v11). La misma copia está incrustada
  en el HTML (botón *Copiar script*).
- **`PROPUESTA.md`** — diagnóstico y diseño de la estructura v11 (implementada).

## Estructura de la planilla (esquema v11)

**Capa de DATOS** (fuente de verdad; se actualiza en cada guardado, hojas pequeñas):
`Equipos` · `RegistrosMP` · `Correctivos` · `Pendientes` · `Tareas` · `Bitacora` · `Archivos`.
Cada fila lleva ID estable (`RegID`/`CorrID`/`PendID`) y fecha de registro.

**Capa de REPORTES** (se regeneran con *Enviar / actualizar*): `Eventos` · `Catalogos`
· `Resumen` — formato del hospital intacto.

`_meta` (oculta): versión del esquema y último envío. `_datos` (oculta, transición):
snapshot JSON heredado; solo se escribe si cabe en una celda (límite 50.000 caracteres)
y deja de ser necesario con el esquema v11.

**Drive:** `MP 2026 - Archivos/` con subcarpeta por equipo (las nuevas con ID acolchado,
p. ej. `ID 0049 · …`), `Descargas/` y `Respaldos/` (copia semanal automática de la
planilla, se conservan 8). Nivel de compartición configurable en `Code.gs`
(`COMPARTIR_ARCHIVOS`: `enlace` · `dominio` · `privado`).

## Interfaz

`🏠 Inicio` (KPIs del mes, alertas clicables, sapo del día, última actividad, estado
de sincronización) · **buscador global** de equipos en el panel lateral · navegación
agrupada (Operación / Gestión / Herramientas) · edición de mantenciones (conserva el
`RegID`) · confirmación al eliminar · barra inferior en móvil.

## Verificación

Suite de simulación en navegador headless (jsdom): 38 aserciones de regresión +
27 de las fases v11 (push liviano/completo, restauración desde hojas de datos con
multi-pendiente por equipo, Inicio, buscador, edición, confirmaciones).
