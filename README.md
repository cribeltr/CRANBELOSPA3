# CRANBELOSPA3 — Gestión MP 2026

Aplicación web (un solo archivo) para convertir la **Programación MP 2026** del
Hospital Hernán Henríquez Aravena en un Excel con **una fila por evento**, y para
gestionar mantenciones preventivas, eventos correctivos, pendientes y archivos.
Todo el procesamiento ocurre en el navegador (ExcelJS); opcionalmente se sincroniza
con Google Sheets mediante Apps Script.

## Archivos

- **`index-appsscript.html`** — la aplicación completa (UI + lógica + el módulo de
  parseo `MP` y el constructor de Excel `MPOUT`). Carga ExcelJS por CDN, por lo que
  funciona tanto alojada aparte como servida desde Apps Script.
- **`Code.gs`** — puente de Google Apps Script: crea/actualiza las hojas en la
  planilla, sube archivos a Drive y sirve la app. La misma copia está incrustada en
  el HTML (botón *Copiar script*).

## Correcciones aplicadas

- **`toNum('')` devolvía `0`** (porque en JS `Number('') === 0`). Esto provocaba dos
  síntomas: las columnas numéricas vacías (*Año Instalación*, *Vida Útil Residual*)
  se exportaban como `0` en lugar de quedar en blanco, y las filas sin ID numérico
  (p. ej. rótulos o subtotales) se colaban como equipos fantasma. Ahora se descarta
  vacío/espacios antes de convertir.
- **Zona de carga clicable por completo**: el texto invita a "hacer clic para
  seleccionar", pero solo el botón abría el explorador. Ahora un clic en cualquier
  parte de la zona abre el selector (sin doble apertura al pulsar el botón).
