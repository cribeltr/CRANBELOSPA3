/****************************************************************************
 *  ===>  VERSIÓN: v11-datos-normalizados  <===  (debe coincidir con "Probar conexión")
 *  Puente Google Sheets — Programación MP 2026
 *  --------------------------------------------------------------------------
 *  ESTRUCTURA DE LA PLANILLA (v11):
 *   · CAPA DE DATOS (fuente de verdad, se actualiza EN CADA guardado, hojas pequeñas):
 *       Equipos · RegistrosMP · Correctivos · Pendientes · Tareas · Bitacora · Archivos
 *       (cada fila lleva ID estable: RegID / CorrID / PendID + fecha de registro)
 *   · CAPA DE REPORTES (se regeneran con "Enviar / actualizar"):
 *       Eventos · Catalogos · Resumen   (formato del hospital, intacto)
 *   · _meta (oculta): versión del esquema y último envío.
 *   · _datos (oculta, transición): snapshot JSON heredado. Se escribe SOLO si no
 *     supera el límite de 50.000 caracteres por celda; la fuente real son las hojas.
 *
 *  Cómo usarlo (configuración única):
 *   1. Crea (o abre) una Google Sheet.
 *   2. Menú: Extensiones -> Apps Script.
 *   3. Borra el contenido y pega ESTE archivo completo. Guarda (icono de disco).
 *   4. Implementar -> Nueva implementación -> tipo "Aplicación web".
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier persona
 *      Implementar y autorizar los permisos.
 *   5. Copia la "URL de la aplicación web" (termina en /exec) y pégala en la
 *      app (sección "Guardar en Google Sheets").
 *
 *  -- OPCIONAL: servir la app DESDE aquí (el link /exec abre el programa) --
 *   a. En el editor de Apps Script: "+" -> HTML -> nómbralo EXACTAMENTE "index".
 *   b. Pega dentro TODO el contenido de "index-appsscript.html".
 *   c. Implementar -> Nueva versión. La URL /exec abre la app ya conectada.
 *
 *  -- Archivos en Drive --
 *   Carpeta raíz "MP 2026 - Archivos" con una subcarpeta por equipo, "Descargas"
 *   para los Excel generados y "Respaldos" con una copia semanal automática de
 *   la planilla (se conservan las últimas 8). El nivel de compartición de los
 *   archivos subidos se controla con COMPARTIR_ARCHIVOS (abajo).
 ****************************************************************************/

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (body && body.action === 'upload') return json(uploadArchivo(body));   // subir archivo a Drive
    return json(writeAll(body));
  }
  catch (err) { return json({ ok: false, error: String(err) }); }
  finally { lock.releaseLock(); }
}

// Llamado desde la app cuando se sirve DESDE Apps Script (google.script.run)
function appPush(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try { return writeAll(typeof body === 'string' ? JSON.parse(body) : body); }
  finally { lock.releaseLock(); }
}
var APP_VERSION = 'v11-datos-normalizados';   // para confirmar qué versión está publicada (Probar conexión)
function appPull() { return readAll(false); }   // sin equipos (evita el límite de tamaño de google.script.run)
// Inventario completo: hoja "Equipos" (v11) o "_equipos" (heredada) o reconstruido desde Eventos.
function allEquipos(ss) {
  var es = ss.getSheetByName('Equipos');
  if (es && es.getLastRow() > 1) return sheetVals(ss, 'Equipos');
  es = ss.getSheetByName('_equipos');
  return (es && es.getLastRow() > 1) ? sheetVals(ss, '_equipos') : equiposFromEventos(ss);
}
// Inventario POR PARTES (paginado) para no superar el límite de google.script.run.
function appPullEquipos(page) {
  var all = allEquipos(SpreadsheetApp.getActiveSpreadsheet());
  var PAGE = 200;
  page = page || 0;
  if (!all.length) return { ok: true, header: [], rows: [], total: 0, page: 0, done: true };
  var body = all.slice(1);
  var start = page * PAGE;
  var slice = body.slice(start, start + PAGE);
  return { ok: true, header: (page === 0 ? all[0] : null), rows: slice, total: body.length, page: page, done: (start + PAGE) >= body.length };
}
// Reconstruye el inventario (filas compactas) a partir de la hoja "Eventos".
function equiposFromEventos(ss) {
  var vals = sheetVals(ss, 'Eventos');
  if (!vals || vals.length < 2) return [];
  var h = vals[0].map(String); var idx = {}; h.forEach(function (k, i) { idx[k] = i; });
  var MAP = { 'ID': 'id', 'Familia': 'familia', 'N° Carpeta': 'carpeta', 'N° Inventario': 'inv', 'Equipo': 'equipo', 'Servicio': 'servicio', 'Unidad': 'unidad', 'Ubicación': 'ubicacion', 'Procedencia': 'procedencia', 'Marca': 'marca', 'Modelo': 'modelo', 'N° Serie': 'serie', 'Año Instalación': 'anio', 'Vida Útil Residual': 'vur', 'Clasificación': 'clasif', 'ENU / Baja': 'enubaja', 'Observación': 'observacion', 'Frecuencia MP': 'frecuencia' };
  var KEYS = ['id', 'familia', 'carpeta', 'inv', 'equipo', 'servicio', 'unidad', 'ubicacion', 'procedencia', 'marca', 'modelo', 'serie', 'anio', 'vur', 'clasif', 'enubaja', 'observacion', 'frecuencia'];
  var get = function (row, hdr) { var i = idx[hdr]; return (i == null || row[i] == null) ? '' : String(row[i]); };
  var mesI = idx['N° Mes'], progI = idx['Programa (P)'], resI = idx['Resultado (R)'];
  var byId = {}, order = [];
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r]; var id = get(row, 'ID'); var eqn = get(row, 'Equipo');
    if (!id && !eqn) continue;
    var key = id || eqn;
    if (!byId[key]) {
      var o = { prog: ['', '', '', '', '', '', '', '', '', '', '', ''], res: ['', '', '', '', '', '', '', '', '', '', '', ''] };
      for (var hdr in MAP) o[MAP[hdr]] = get(row, hdr);
      byId[key] = o; order.push(key);
    }
    var e = byId[key];
    var m = parseInt(mesI != null ? row[mesI] : '', 10);
    if (m >= 1 && m <= 12) {
      var p = progI != null && row[progI] != null ? String(row[progI]) : '';
      var rr = resI != null && row[resI] != null ? String(row[resI]) : '';
      if (p) e.prog[m - 1] = p;
      if (rr) e.res[m - 1] = rr;
    }
  }
  var out = [KEYS.concat(['prog', 'res'])];
  order.forEach(function (k) {
    var o = byId[k]; var arr = KEYS.map(function (kk) { return o[kk] || ''; });
    arr.push(o.prog.join('|')); arr.push(o.res.join('|')); out.push(arr);
  });
  return out;
}
// Subir archivo a Drive desde la app servida en Apps Script (google.script.run)
function appUpload(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try { return uploadArchivo(typeof body === 'string' ? JSON.parse(body) : body); }
  finally { lock.releaseLock(); }
}
// Guarda el Excel generado por la app en Drive y devuelve enlaces de descarga.
// (Dentro del iframe de Apps Script no se puede descargar un Blob directamente.)
function appSaveXlsx(body) {
  var p = (typeof body === 'string') ? JSON.parse(body) : body;
  if (!p || !p.dataBase64) return { ok: false, error: 'Sin datos del Excel.' };
  var root = getOrCreateFolder(DriveApp.getRootFolder(), ARCHIVOS_ROOT);
  var folder = getOrCreateFolder(root, 'Descargas');
  var nombre = sanitizeName(p.nombre || 'Eventos_MP_2026.xlsx');
  var blob = Utilities.newBlob(Utilities.base64Decode(p.dataBase64),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombre);
  var file = folder.createFile(blob);
  compartir_(file);
  return { ok: true, name: nombre, url: file.getUrl(), download: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
}

/* ------------------------- Archivos en Drive -------------------------------
 *  Carpeta raíz + subcarpeta por equipo. Las carpetas YA existentes (nombre
 *  antiguo "{id} - {equipo}…") se siguen usando; las nuevas se crean con el ID
 *  con ceros ("ID 0049 · …") para que Drive las ordene naturalmente.
 * ----------------------------------------------------------------------------- */
var ARCHIVOS_ROOT = 'MP 2026 - Archivos';

// Nivel de compartición de los archivos subidos y Excel generados:
//   'enlace'  = cualquiera con el enlace puede ver (como hasta ahora)
//   'dominio' = solo cuentas del dominio (recomendado en Google Workspace)
//   'privado' = no se comparte (solo el dueño y con quien comparta la carpeta)
var COMPARTIR_ARCHIVOS = 'enlace';
function compartir_(file) {
  try {
    if (COMPARTIR_ARCHIVOS === 'enlace') file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    else if (COMPARTIR_ARCHIVOS === 'dominio') file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    // 'privado': no se toca el permiso
  } catch (e) {}
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function sanitizeName(s) { return String(s == null ? '' : s).replace(/[\\/:*?"<>|]/g, '-').trim() || 'Equipo'; }

// Carpeta del equipo: reutiliza la antigua si existe; si no, crea con ID acolchado.
function carpetaDeEquipo_(root, p) {
  var sufijo = (p.inv ? ' (Inv ' + p.inv + ')' : (p.serie ? ' (Serie ' + p.serie + ')' : ''));
  var antigua = sanitizeName((p.equipoId ? p.equipoId + ' - ' : '') + (p.equipo || 'Equipo') + sufijo);
  var it = root.getFoldersByName(antigua);
  if (it.hasNext()) return it.next();
  var idPad = p.equipoId ? ('ID ' + ('0000' + String(p.equipoId)).slice(-4) + ' · ') : '';
  return getOrCreateFolder(root, sanitizeName(idPad + (p.equipo || 'Equipo') + sufijo));
}

function uploadArchivo(p) {
  if (!p || !p.dataBase64) return { ok: false, error: 'Sin datos de archivo.' };
  var root = getOrCreateFolder(DriveApp.getRootFolder(), ARCHIVOS_ROOT);
  var folder = carpetaDeEquipo_(root, p);

  var nombre = sanitizeName(p.nombre || 'archivo');
  var bytes = Utilities.base64Decode(p.dataBase64);
  var blob = Utilities.newBlob(bytes, p.mime || 'application/octet-stream', nombre);
  var file = folder.createFile(blob);
  compartir_(file);
  var url = file.getUrl();

  // Además del archivo, generar un .txt con la descripción y el MISMO nombre base.
  if (p.descripcion) {
    var txtName = nombre.replace(/\.[^.]+$/, '') + '.txt';
    var txtFile = folder.createFile(Utilities.newBlob(p.descripcion, 'text/plain', txtName));
    compartir_(txtFile);
  }

  // Registrar el enlace en la hoja "Archivos"
  var HEADERS = ['ID', 'N° Inventario', 'N° Serie', 'Equipo', 'Servicio', 'Categoría', 'Descripción', 'Nombre del archivo', 'Enlace', 'Fecha de carga'];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Archivos');
  if (!sh) {
    sh = ss.insertSheet('Archivos');
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#15616d').setFontColor('#ffffff');
  }
  // Si la hoja ya existía sin la columna "Descripción", insertarla tras "Categoría".
  var hdr = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  if (hdr.indexOf('Descripción') === -1) {
    var catIdx = hdr.indexOf('Categoría');
    var at = (catIdx >= 0 ? catIdx + 2 : sh.getLastColumn() + 1);
    sh.insertColumnBefore(at);
    sh.getRange(1, at).setValue('Descripción').setFontWeight('bold').setBackground('#15616d').setFontColor('#ffffff');
    hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  }
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Santiago', 'yyyy-MM-dd HH:mm');
  // Escribir en el ORDEN real del encabezado (el enlace como texto: Google Sheets
  // lo hace clicable y queda legible al volver a leer la hoja, round-trip).
  var valByHeader = {
    'ID': p.equipoId || '', 'N° Inventario': p.inv || '', 'N° Serie': p.serie || '', 'Equipo': p.equipo || '',
    'Servicio': p.servicio || '', 'Categoría': p.categoria || '', 'Descripción': p.descripcion || '',
    'Nombre del archivo': nombre, 'Enlace': url, 'Fecha de carga': fecha
  };
  sh.appendRow(hdr.map(function (h) { return (h in valByHeader) ? valByHeader[h] : ''; }));

  return { ok: true, url: url, name: nombre, folder: folder.getUrl(), categoria: p.categoria || '', descripcion: p.descripcion || '', fecha: fecha };
}

/* ------------------------------ Escritura ---------------------------------
 *  body.sheets  -> hojas de REPORTE (Eventos/Catalogos/Resumen). Solo llegan
 *                  con "Enviar / actualizar" (regeneración a demanda).
 *  body.datos   -> hojas de DATOS (RegistrosMP/Correctivos/Pendientes/Tareas/
 *                  Bitacora). Llegan EN CADA guardado: son pequeñas.
 *  body.equipos -> hoja "Equipos" (inventario; llega al importar o enviar todo).
 *  body.data    -> snapshot JSON heredado (_datos). Se escribe solo si cabe.
 * --------------------------------------------------------------------------- */
function writeAll(body) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var written = [];

    (body.sheets || []).forEach(function (spec) {
      var name = spec.name || 'Hoja';
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);

      // Limpiar contenido, validaciones y formato condicional previos
      sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
      sh.setConditionalFormatRules([]);
      sh.clearContents();

      var rows = spec.rows || [];
      if (rows.length > 0) {
        var maxc = 1;
        rows.forEach(function (r) { if (r.length > maxc) maxc = r.length; });
        rows.forEach(function (r) { while (r.length < maxc) r.push(''); });
        sh.getRange(1, 1, rows.length, maxc).setValues(rows);
        sh.setFrozenRows(1);
        applyValidations(sh, spec.validations);
        applyColors(sh, spec.colors);
      }
      written.push(name);
    });

    // Hojas de DATOS normalizadas (v11): fuente de verdad, pequeñas, como texto.
    if (body.datos) {
      for (var dn in body.datos) {
        var dspec = body.datos[dn] || {};
        writeDataSheet_(ss, dn, dspec.rows || [], dspec.validations, dspec.colors);
        written.push(dn);
      }
    }

    // Snapshot heredado (_datos): SOLO si no supera el límite de 50.000 caracteres
    // por celda (sobre ese tamaño setValue falla; la fuente real son las hojas de datos).
    if (body.data !== undefined && body.data !== null) {
      var js = (typeof body.data === 'string') ? body.data : JSON.stringify(body.data);
      if (js.length < 45000) {
        var ds = ss.getSheetByName('_datos') || ss.insertSheet('_datos');
        ds.getRange(1, 1).setValue(js);
        try { ds.hideSheet(); } catch (e2) {}
      }
    }

    // Inventario de equipos (hoja "Equipos", visible) para auto-cargar al abrir el link
    if (body.equipos && body.equipos.length) {
      var es = ss.getSheetByName('Equipos') || ss.insertSheet('Equipos');
      es.clear();
      var ec = body.equipos[0].length;
      body.equipos.forEach(function (r) { while (r.length < ec) r.push(''); });
      var rng = es.getRange(1, 1, body.equipos.length, ec);
      rng.setNumberFormat('@');                 // texto: conserva ceros a la izquierda
      rng.setValues(body.equipos);
      es.setFrozenRows(1);
      try { es.showSheet(); } catch (e3) {}
    }

    setMeta_(ss, body);
    try { ensureRespaldoTrigger_(); } catch (e4) {}

    return { ok: true, sheets: written };
}

// Hoja de datos: todo como TEXTO (conserva ceros, fechas ISO legibles) + encabezado fijo.
function writeDataSheet_(ss, name, rows, validations, colors) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  sh.setConditionalFormatRules([]);
  sh.clearContents();
  if (!rows || !rows.length) return;
  var maxc = 1;
  rows.forEach(function (r) { if (r.length > maxc) maxc = r.length; });
  rows.forEach(function (r) { while (r.length < maxc) r.push(''); });
  var rng = sh.getRange(1, 1, rows.length, maxc);
  rng.setNumberFormat('@');
  rng.setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, maxc).setFontWeight('bold').setBackground('#15616d').setFontColor('#ffffff');
  if (validations) applyValidations(sh, validations);
  if (colors) applyColors(sh, colors);
}

// _meta: versión del esquema y trazas del último envío (hoja oculta clave/valor).
function setMeta_(ss, body) {
  try {
    var sh = ss.getSheetByName('_meta') || ss.insertSheet('_meta');
    var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Santiago', 'yyyy-MM-dd HH:mm:ss');
    var n = function (k) { var d = body.datos && body.datos[k]; return d && d.rows ? Math.max(0, d.rows.length - 1) : ''; };
    var kv = [
      ['Esquema', '2'],
      ['Versión script', APP_VERSION],
      ['Último envío', ahora],
      ['Tipo de envío', body.sheets && body.sheets.length ? 'completo (reportes+datos)' : 'datos'],
      ['RegistrosMP', n('RegistrosMP')], ['Correctivos', n('Correctivos')],
      ['Pendientes', n('Pendientes')], ['Tareas', n('Tareas')], ['Bitacora', n('Bitacora')]
    ];
    sh.clearContents();
    sh.getRange(1, 1, kv.length, 2).setValues(kv);
    try { sh.hideSheet(); } catch (e) {}
  } catch (e2) {}
}

/* ------------------------- Respaldo automático ------------------------------
 *  Copia semanal de la planilla a "MP 2026 - Archivos/Respaldos" (conserva las
 *  últimas 8). El disparador se crea solo, en el primer envío. También se puede
 *  ejecutar a mano desde el editor: respaldoSemanal().
 * ----------------------------------------------------------------------------- */
function respaldoSemanal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var file = DriveApp.getFileById(ss.getId());
  var root = getOrCreateFolder(DriveApp.getRootFolder(), ARCHIVOS_ROOT);
  var folder = getOrCreateFolder(root, 'Respaldos');
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Santiago', 'yyyy-MM-dd');
  file.makeCopy('Respaldo ' + fecha + ' · ' + ss.getName(), folder);
  var it = folder.getFiles(); var arr = [];
  while (it.hasNext()) arr.push(it.next());
  arr.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = 8; i < arr.length; i++) arr[i].setTrashed(true);
}
function ensureRespaldoTrigger_() {
  var existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'respaldoSemanal'; });
  if (!existe) ScriptApp.newTrigger('respaldoSemanal').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
}

// Columna (1-based) cuyo encabezado (fila 1) coincide con 'header'
function colByHeader(sh, header) {
  var lastC = sh.getLastColumn();
  var hdr = sh.getRange(1, 1, 1, lastC).getValues()[0];
  for (var i = 0; i < hdr.length; i++) { if (String(hdr[i]) === header) return i + 1; }
  return 0;
}

// Desplegables (validación de datos por lista) en las columnas indicadas
function applyValidations(sh, validations) {
  if (!validations) return;
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  validations.forEach(function (v) {
    var c = colByHeader(sh, v.header);
    if (!c) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(v.values, true)
      .setAllowInvalid(true)
      .build();
    sh.getRange(2, c, n, 1).setDataValidation(rule);
  });
}

// Número de columna -> letra (1 -> A, 27 -> AA)
function columnToLetter(col) {
  var s = '';
  while (col > 0) { var m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = Math.floor((col - 1) / 26); }
  return s;
}

// Coloreado por valor (formato condicional). Si la regla es wholeRow, colorea
// TODA la fila usando una fórmula que mira la columna del encabezado indicado.
function applyColors(sh, colors) {
  if (!colors) return;
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var lastCol = sh.getLastColumn();
  var rules = [];
  colors.forEach(function (cf) {
    var c = colByHeader(sh, cf.header);
    if (!c) return;
    if (cf.wholeRow) {
      var rowRange = sh.getRange(2, 1, n, lastCol);    // todas las columnas, filas de datos
      var colL = columnToLetter(c);
      (cf.rules || []).forEach(function (r) {
        var formula = '=$' + colL + '2="' + r.value + '"';
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(formula).setBackground(r.color).setRanges([rowRange]).build());
      });
    } else {
      var rng = sh.getRange(2, c, n, 1);
      (cf.rules || []).forEach(function (r) {
        var b = SpreadsheetApp.newConditionalFormatRule().setBackground(r.color).setRanges([rng]);
        b = (r.mode === 'startsWith') ? b.whenTextStartsWith(r.value) : b.whenTextEqualTo(r.value);
        rules.push(b.build());
      });
    }
  });
  if (rules.length) sh.setConditionalFormatRules(rules);
}

function sheetVals(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  return (lr >= 1 && lc >= 1) ? sh.getRange(1, 1, lr, lc).getValues() : [];
}
function readAll(includeEquipos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Eventos');
  var n = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
  var ds = ss.getSheetByName('_datos');
  var data = ds ? ds.getRange(1, 1).getValue() : '';
  var out = {
    ok: true, ver: APP_VERSION, count: n, data: data,
    tablas: {
      RegistrosMP: sheetVals(ss, 'RegistrosMP'),
      Pendientes: sheetVals(ss, 'Pendientes'),
      Correctivos: sheetVals(ss, 'Correctivos'),
      Tareas: sheetVals(ss, 'Tareas'),
      Bitacora: sheetVals(ss, 'Bitacora'),
      Archivos: sheetVals(ss, 'Archivos')
    }
  };
  // El inventario puede ser grande; solo se incluye cuando se pide explícitamente
  // (por HTTP no hay problema; con google.script.run se pide por separado/paginado).
  if (includeEquipos) out.equipos = allEquipos(ss);
  return out;
}
// doGet: ?api=equipos -> inventario completo (HTTP, sin límite); ?api=1 -> datos; sin parámetros -> la app.
function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'equipos') return json({ ok: true, equipos: allEquipos(SpreadsheetApp.getActiveSpreadsheet()) });
  if (e && e.parameter && e.parameter.api) return json(readAll(true));
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Gestión MP 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
