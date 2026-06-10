# Brief operacional — Eventos correctivos de equipos médicos
**Programa MP 2026 · Hospital Hernán Henríquez Aravena**
Versión 1 (borrador para validación) · Documento no técnico, de uso interno del equipo.

---

## 1. Para qué sirve este documento

Define, en lenguaje simple, **qué se registra, cuándo y con qué datos** cada vez que un
equipo médico falla y entra al circuito correctivo: desde la solicitud de trabajo hasta
que el equipo vuelve operativo. La regla general es una sola:

> **Todo evento queda registrado el mismo día, con su fecha, su responsable y el estado
> en que queda el equipo.** Si no está registrado, para la gestión no ocurrió.

---

## 2. El flujo en una mirada

```
            FALLA DETECTADA
                  │
        ① SOLICITUD DE TRABAJO
                  │
   ┌──────────────┼───────────────────┐
   │              │                   │
② REPARACIÓN   ③ SOLICITUD        ④ ENVÍO A
   DIRECTA        DE REPUESTOS       SERVICIO TÉCNICO
 (ingenieros      (compra)           (externo)
  del hospital)      │                   │
   │              repuesto llega     ⑤ RECEPCIÓN
   │              y se repara           del equipo
   └──────────────┴───────────────────┬─┘
                                      │
                          EQUIPO OPERATIVO (cierre)
                          o NO OPERATIVO (se reabre el ciclo)
```

---

## 3. Qué se registra en cada paso

### ① Solicitud de trabajo
Se genera cuando se detecta la falla y se decide intervenir el equipo.

| Dato | Detalle |
|---|---|
| **Fecha** | Día en que se genera la solicitud |
| **Folio de la solicitud** | Número correlativo de la solicitud de trabajo |
| **Ejecutor** | Quién genera/atiende la solicitud |
| **Descripción** | La falla reportada, en una o dos frases |
| **Estado del equipo** | Operativo · No operativo · En servicio técnico |

Con la solicitud creada, el equipo toma **uno de tres caminos** (ver ②, ③ o ④).

### ② Reparación directa (ingenieros del hospital)
Si los ingenieros del hospital pueden reparar el equipo de inmediato, se ejecuta el
trabajo y se cierra el evento registrando la **fecha**, el **ejecutor**, el **trabajo
realizado** (descripción) y el **estado final** del equipo (normalmente *Operativo*).

### ③ Solicitud de repuestos (compra)
Si la reparación necesita repuestos o accesorios, se gestiona la compra. Siempre en
este orden:

1. **Pedir cotización por correo** al o los proveedores.
2. **Anotar el número de la cotización** recibida (queda asociado al evento del equipo).
3. Definir la **vía de compra**:
   - **Trato directo** → exige **informe técnico**, que lleva su **número correlativo**.
   - **Compra ágil** → no requiere informe técnico; se gestiona directamente.
4. **Gestionar la compra** por la vía definida y dejar constancia del avance.

Mientras se espera el repuesto, el equipo queda con **pendiente** asociado (con fecha
de compromiso), para que la espera no se pierda de vista. Al llegar el repuesto, se
repara y se cierra como en ②.

### ④ Envío a servicio técnico (externo)
Cuando el equipo debe salir del hospital a reparación externa.

| Dato | Detalle |
|---|---|
| **Fecha** | Día del despacho |
| **Folio de la solicitud** | El de la solicitud de trabajo que originó el envío |
| **N° de envío** | Correlativo del despacho |
| **Empresa** | Servicio técnico de destino |
| **Ejecutor** | Quién gestiona el envío |
| **Estado del equipo** | Queda **“En servicio técnico”** |

### ⑤ Recepción desde servicio técnico
Cuando el equipo vuelve al hospital.

| Dato | Detalle |
|---|---|
| **Fecha** | Día de la recepción |
| **Folio de la guía de despacho** | Documento con que llega el equipo |
| **Empresa** | Servicio técnico de origen |
| **Diagnóstico / trabajo realizado** | Qué se hizo, según informe del servicio |
| **Ejecutor** | Quién recibe y verifica el equipo |
| **Estado del equipo** | **Reparado → Operativo** · **Sigue con falla → No operativo** |

Si el equipo **sigue con falla**, se reabre el ciclo (nueva solicitud de trabajo o
nuevo envío) y se deja constancia en el registro.

### Reporte de servicio (cuando aplica)
Si el servicio técnico interviene **en el hospital** (sin envío), se registra como
*Reporte de servicio*: **fecha, empresa, descripción del trabajo y estado del equipo**.

---

## 4. Tabla resumen (para tener a mano)

| Evento | Cuándo | Datos obligatorios | Estado del equipo queda… |
|---|---|---|---|
| Solicitud de trabajo | Al detectar la falla | Fecha · Folio · Ejecutor · Estado | Según evaluación |
| Reparación directa | Ingenieros reparan en el hospital | Fecha · Ejecutor · Descripción · Estado | Operativo |
| Solicitud de repuestos | La reparación requiere compra | Cotización por correo · **N° de cotización** · Vía (trato directo con **informe técnico correlativo**, o compra ágil) | No operativo + pendiente |
| Envío a servicio técnico | El equipo sale a reparación externa | Fecha · Folio solicitud · **N° de envío** · Empresa · Ejecutor | En servicio técnico |
| Recepción | El equipo vuelve | Fecha · Guía de despacho · Empresa · Diagnóstico · Ejecutor · **Reparado / sigue con falla** | Operativo o No operativo |
| Reporte de servicio | Intervención externa en el hospital | Fecha · Empresa · Descripción · Estado | Según resultado |

---

## 5. Reglas de oro

1. **Registrar el mismo día.** La fecha del evento es la del hecho, no la del registro.
2. **Nada sin responsable.** Todo evento lleva ejecutor (o quien recibe).
3. **El estado del equipo siempre al día.** Es lo que ve todo el equipo en el panel:
   Operativo · No operativo · En servicio técnico.
4. **Documentos junto al equipo.** Cotización, informe técnico, guía de despacho e
   informes de servicio se adjuntan al registro del equipo (quedan en su carpeta).
5. **Lo que queda esperando, queda como pendiente** con fecha de compromiso
   (repuestos por llegar, equipo en servicio técnico, firmas, reportes).
6. **Folios y correlativos siempre anotados**: solicitud de trabajo, N° de envío,
   N° de cotización, informe técnico, guía de despacho. Son la trazabilidad de la compra
   y del equipo.

---

## 6. Dónde se registra (sistema Gestión MP 2026)

Todo lo anterior se registra en la ficha del equipo (buscar por **serie o inventario**),
botón **🛠️ Registrar evento correctivo**, eligiendo el tipo: *Solicitud de trabajo*,
*Envío a servicio técnico*, *Recepción*, *Reporte de servicio* u *Otro* (p. ej. la
gestión de la cotización). Los documentos se adjuntan en el mismo formulario; las
esperas se anotan con **📌 Registrar pendiente**, que permite fecha de compromiso,
tareas y recordatorio en el calendario.

---

## 7. Puntos a confirmar (para cerrar la versión 1)

1. En la **compra de repuestos**, el dictado menciona “por dos días” — ¿se refiere a un
   plazo de respuesta de la cotización (48 horas)? ¿O a otra vía de compra?
2. ¿Existen montos de corte entre **compra ágil** y **trato directo** que convenga dejar
   escritos aquí (p. ej. en UTM)?
3. En la **recepción**, ¿se exige siempre guía de despacho, o hay casos sin guía
   (retiro en mano)?
