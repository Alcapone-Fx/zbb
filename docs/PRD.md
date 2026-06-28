# Documento de Requisitos del Producto (PRD)
# Aplicación de Finanzas Personales — Personal Finance App

---

## 0. Metadata

| Campo | Valor |
|---|---|
| Versión | 1.1 |
| Estado | Aprobado — Listo para Diseño |
| Fecha | 2026-06-25 |
| Documento técnico complementario | TRD.md |
| Alcance V1 | Todos los módulos de este documento salvo los marcados como V2 |

---

## 1. Visión del Producto

Un sistema centralizado de finanzas personales que elimina la fricción del registro diario, automatiza la lógica del Presupuesto Base Cero (ZBB), y reemplaza hojas de cálculo complejas mediante módulos de micro-planificación integrados. Todo dentro de una interfaz limpia, moderna, segura y usable por cualquier perfil de usuario.

**Principio de Diseño Global — KISS:** Ninguna acción del usuario debe requerir más de 3 pasos. Si los requiere, la acción debe rediseñarse antes de implementarse. Este principio tiene precedencia sobre cualquier otra decisión de UX.

---

## 2. Plataforma

- **Tipo:** Progressive Web App (PWA), Mobile-First
- **Dispositivos objetivo:** Smartphone (diseño primario) + Desktop (soporte completo)
- **Moneda:** USD, única por usuario
- **Usuarios:** Múltiples usuarios independientes — los datos de cada usuario están completamente aislados de los demás

### 2.1 Modo Offline

**V1 — Lectura sin conexión:**
El app y los últimos datos del usuario se almacenan en el dispositivo. El usuario puede abrir la app sin conexión y consultar su información. Para registrar transacciones o hacer cambios, necesita conexión.

Cuando el usuario está offline, la app muestra un banner discreto y no bloqueante en la parte superior de la pantalla. Nunca un modal. Nunca se bloquea la interfaz.

**V2 — Escritura sin conexión (futura):**
Las transacciones se registran localmente y se sincronizan automáticamente al recuperar la conexión. Requiere definición de estrategia de conflictos. Pospuesto a V2.

---

## 3. Autenticación y Acceso

### 3.1 Flujos de Usuario

**Registro:**
- El usuario ingresa email y contraseña.
- El sistema envía un email de verificación. El acceso al app requiere verificación previa.

**Login:**
- Email y contraseña.
- Opción "Recuérdame": mantiene la sesión activa hasta que el usuario cierre sesión manualmente.
- Sin esta opción, la sesión cierra al salir del navegador.

**Recuperación de contraseña:**
- El usuario solicita un enlace de recuperación desde la pantalla de login.
- El sistema envía el enlace al email registrado.

### 3.2 Comportamiento de Sesión

- Tras 30 minutos de inactividad, la sesión se cierra automáticamente y se solicita login nuevamente.
- El usuario nunca pierde datos por cierre de sesión — todas las acciones se guardan en tiempo real antes de cerrar.

---

## 4. Reglas de Negocio — Core ZBB Logic

### 4.1 Paradigma Zero-Based Budgeting (ZBB)

Todo ingreso a una cuenta On-Budget suma al pozo **"Dinero a Asignar"**. El usuario debe distribuir este dinero en categorías hasta que el pozo llegue a exactamente $0.00.

- Si "Dinero a Asignar" es positivo: el usuario tiene dinero sin destino (aviso informativo).
- Si "Dinero a Asignar" es negativo: el usuario ha asignado más de lo que tiene (alerta roja prominente, no bloquea el uso del app).

### 4.2 Tipos de Cuenta

| Tipo | Presupuesto | Descripción |
|---|---|---|
| Corriente / Planillera | On-Budget | Cuenta bancaria principal de operaciones |
| Ahorro | On-Budget o Off-Budget* | Cuenta de ahorro |
| Tarjeta de Crédito | On-Budget | Lógica especial de seguimiento (ver 4.4) |
| Efectivo | On-Budget | Dinero físico |
| Inversión | Off-Budget | Fondos de inversión, portafolios |
| Deuda / Préstamo | Off-Budget | Pasivos — muestra el monto adeudado como saldo negativo |

*Al crear una cuenta de ahorro, el usuario decide si es On-Budget (dinero disponible para presupuestar) o Off-Budget (solo seguimiento patrimonial).

**Caso de uso — deuda a tasa 0%:** El usuario puede mantener una cuenta de Deuda (lo que debe) y una cuenta de Ahorro Off-Budget con los fondos reservados que capitalizan intereses. El Patrimonio Neto refleja la diferencia real. Los intereses ganados se registran como ingresos en la cuenta de ahorro.

### 4.3 Cuentas Off-Budget / Patrimonio

- Las cuentas Off-Budget contribuyen al cálculo de **Patrimonio Neto** pero su saldo no está disponible para presupuestar.
- Las cuentas de Deuda reducen el Patrimonio Neto.
- Las cuentas Off-Budget no aparecen en la vista de presupuesto ZBB.

### 4.4 Lógica de Tarjetas de Crédito

El objetivo es que el usuario vea en todo momento cuánto tiene **disponible por categoría**, independientemente de si el gasto fue hecho con tarjeta o con débito/efectivo.

**Flujo de un gasto con tarjeta:**
1. Usuario registra: cuenta = Visa, categoría = Alimentación, monto = $80.
2. El sistema descuenta $80 del "Disponible" de la categoría Alimentación.
3. La deuda de la cuenta Visa aumenta en $80.
4. El sistema reserva automáticamente $80 en una categoría de sistema **"Pago · [Nombre Tarjeta]"**.

**Categoría de sistema "Pago · [Nombre]":**
- Se crea automáticamente cuando el usuario crea una tarjeta de crédito.
- El usuario puede verla en modo lectura (sabe cuánto debe pagar este mes).
- No es editable ni puede recibir asignaciones manuales.

**Flujo de pago de tarjeta:**
1. Usuario registra una transferencia: Planillera → Visa por $80.
2. El sistema descuenta los $80 de la categoría "Pago · Visa".
3. La deuda de Visa regresa a $0.

**Cashbacks y reembolsos:** Se registran como ingresos a la cuenta que el usuario elija. Sin lógica especial.

### 4.5 Reglas de Transferencias

| Origen | Destino | Categoría | Comportamiento |
|---|---|---|---|
| On-Budget | On-Budget | **Requerida** | El dinero se mueve entre cuentas presupuestadas; la categoría registra el propósito |
| On-Budget | Off-Budget | **Requerida** | El dinero sale del universo presupuestado; la categoría lo registra como gasto (ej. "Fondo de Emergencia") |
| Off-Budget | On-Budget | No aplica | Genera un ingreso en la cuenta On-Budget; suma a "Dinero a Asignar" |
| Off-Budget | Off-Budget | No aplica | Movimiento patrimonial puro; no afecta el presupuesto |

### 4.6 Ingresos del Mes Siguiente

Un ingreso puede marcarse para que su monto sume al "Dinero a Asignar" del **mes calendario siguiente**, en lugar del mes en que se registra.

### 4.7 Rollover — Cierre de Mes

Al iniciar un nuevo mes:
- Saldos positivos en categorías: se acumulan y pasan al mes siguiente.
- Saldos negativos en categorías (sobregiros): se descuentan del "Dinero a Asignar" global del mes siguiente.
- El proceso es automático. El usuario puede revisar el estado navegando entre meses.

---

## 5. Módulos y Funcionalidades

### 5.0 Gestión de Cuentas

**Listado de Cuentas:**
- Vista dividida en dos grupos: **On-Budget** y **Off-Budget / Patrimonio**.
- Cada cuenta muestra: nombre, tipo y saldo actual.
- Totales visibles: suma On-Budget, suma Off-Budget y **Patrimonio Neto** (activos − pasivos).
- Las cuentas archivadas no aparecen por defecto (accesibles desde "Ver archivadas").

**Creación de Cuenta:**
- Campos requeridos: nombre, tipo de cuenta, On-Budget o Off-Budget, saldo inicial.
- El saldo inicial es obligatorio. El sistema registra automáticamente una transacción de apertura ("Día Cero") con ese monto.
- Para tarjetas de crédito: el saldo inicial es la deuda actual al momento de agregar la cuenta a la app (0 si no hay deuda pendiente).
- Para cuentas de Deuda/Préstamo: el saldo inicial es el monto adeudado (se ingresa como positivo; el sistema lo muestra como negativo).

**Edición:**
- Solo se permite editar el nombre de la cuenta.

**Archivado:**
- No existe borrado físico de cuentas.
- La acción "Archivar Cuenta" oculta la cuenta de todas las vistas operativas.
- Solo se puede archivar una cuenta con saldo en $0.00.

**UI references:**
- docs\ui-reference\cuentas-screen-1.png
- docs\ui-reference\cuentas-screen-scroll-down.png

---

### 5.1 Registro de Transacciones

#### 5.1.1 Formulario de Transacción (Quick Add)

Accesible en todo momento mediante un botón flotante (FAB) visible en la esquina inferior derecha de cualquier pantalla.

**Campos del formulario:**

| Campo | Obligatorio | Descripción |
|---|---|---|
| Fecha | Sí | Valor por defecto: hoy |
| Tipo | Sí | Gasto / Ingreso / Transferencia |
| Cuenta | Sí | Selector de cuentas activas |
| Monto | Sí | Valor numérico con 2 decimales |
| Categoría | Sí* | Selector con búsqueda |
| Payee / Comercio | No | Texto libre con autocompletado |
| Tags | No | Etiquetas opcionales, múltiples por transacción |
| Memo / Nota | No | Texto libre |
| Mes siguiente | No | Checkbox visible únicamente en tipo Ingreso |

*La categoría no aplica en transferencias Off-Budget → Off-Budget.

**Para Transferencias:** Se agregan los campos Cuenta Origen y Cuenta Destino. La categoría es requerida si alguna de las cuentas es On-Budget (ver reglas 4.5).

**Autocompletado de Payees:**
- Al escribir el nombre de un comercio, el sistema sugiere payees usados anteriormente.
- Al seleccionar un payee conocido, el sistema pre-selecciona la categoría más frecuentemente usada con ese payee.

**Taxonomía de Categorización:**
```
Grupo (ej. "Necesidades")
  └── Categoría (ej. "Alimentación")
        └── Tag opcional (ej. "supermercado", "restaurante")
```
Los tags son etiquetas de contexto adicional. No crean jerarquía en el presupuesto.

**UI references:**
- docs\ui-reference\add-transaction.png

#### 5.1.2 Transacciones Recurrentes (Programadas)

Para gastos predecibles: servicios de streaming, servicios públicos, suscripciones.

**Creación:** Desde el formulario estándar, el usuario marca "Hacer recurrente" y define la frecuencia (diaria, semanal, mensual, anual) y la fecha de inicio.

**Comportamiento al llegar la fecha de vencimiento:**
- El app **no registra automáticamente** la transacción.
- Al abrir la app, se muestra un panel de "Transacciones Pendientes de Confirmar" antes de la pantalla principal.
- El usuario puede para cada transacción: **Confirmar** (registra tal cual), **Editar monto y confirmar** (útil para servicios que varían) o **Saltar** (omite este período).
- El panel debe poder completarse en menos de 30 segundos en el caso típico.

**Gestión:** Vista dedicada de todas las transacciones recurrentes activas con opciones de editar, pausar o eliminar.

**UI references:**
- docs\ui-reference\transacciones-pendientes.png

#### 5.1.3 Historial de Transacciones

**Vista por defecto:** mes actual, agrupado por categoría con subtotales.

**Filtros disponibles:**
- Rango de fechas
- Categoría (una o múltiples)
- Tipo (gasto / ingreso / transferencia)
- Tags
- Cuenta

**Edición:** Las transacciones pasadas son editables. El sistema muestra un aviso si la transacción pertenece a un mes ya conciliado.

**Borrado:** Permitido con confirmación de un solo paso. El sistema advierte si el borrado afecta un mes conciliado.

**Exportación:** Botón para descargar en formato `.csv` el historial del filtro activo, o todas las transacciones del usuario.

**UI references:**
- docs\ui-reference\historial-transacciones-screen.png
- docs\ui-reference\historial-transacciones-screen-scroll-down.png

---

### 5.2 Conciliación Bancaria

Interfaz por cuenta para cuadrar el saldo de la app con el saldo real del banco.

**Flujo (máximo 3 pasos):**
1. El usuario ingresa el saldo bancario real a una fecha determinada.
2. El sistema muestra la diferencia entre el saldo de la app y el saldo bancario.
3. Si hay diferencia, el usuario crea una transacción de ajuste con un clic. Esta transacción requiere categoría (ej. "Comisiones y Ajustes").

Las transacciones revisadas en el proceso quedan marcadas como conciliadas y muestran un indicador visual.

---

### 5.3 Presupuesto ZBB

#### 5.3.1 Vista Principal

La **pantalla de inicio** de la app (después del login y de resolver transacciones pendientes si las hay).

**Header:**
- Selector de mes para navegar hacia meses anteriores o futuros.
- KPI prominente: **"Dinero a Asignar: $X.XX"** — verde si ≥ $0, rojo si negativo.

**Tabla de Categorías:**

| Columna | Descripción |
|---|---|
| Categoría | Nombre de la categoría, agrupada bajo su grupo |
| Asignado | Monto asignado este mes — editable con un toque directamente en la tabla |
| Actividad | Suma de transacciones del mes — solo lectura |
| Disponible | Asignado + rollover del mes anterior − Actividad — **el número más importante para el usuario** |

- "Disponible" se muestra en rojo si es negativo (categoría sobregirada).
- Cambiar "Asignado" recalcula "Dinero a Asignar" en tiempo real.

**Plantilla de Presupuesto:**
- Botón **"Aplicar Plantilla"**: rellena los montos "Asignado" del mes actual con los valores de la plantilla guardada.
- Botón **"Guardar como Plantilla"**: guarda el mes actual como plantilla. Requiere confirmación de un paso (sobreescribe la plantilla existente).
- Existe una única plantilla por usuario.

**Meses pasados:** Son navegables y editables. Los cambios en meses pasados recalculan los rollovers en cascada hacia el mes actual.

**UI references:**
- docs\ui-reference\presupuesto-screen.png

#### 5.3.2 Gestión de Categorías y Grupos

- CRUD completo para grupos y categorías.
- El usuario puede reordenar grupos y categorías por drag-and-drop.
- Archivado en lugar de borrado físico para categorías que tienen transacciones históricas.
- Borrado físico solo si la categoría no tiene ninguna transacción asociada.
- Las categorías de sistema (ej. "Pago · Visa") no son editables, archivables ni eliminables por el usuario.

---

### 5.4 Histórico y Tendencias

**Panel de Tendencia por Categoría:**
Al hacer clic en cualquier categoría desde la vista de presupuesto, se abre un panel lateral con:
- Gráfico de barras: últimos 6 meses — columna "Asignado" vs. columna "Actividad" por mes.
- Si hay menos de 6 meses de datos, muestra los meses disponibles.
- KPI: **Promedio de gasto real** en los últimos 3 meses.
- KPI: **Mes de mayor gasto** en el período mostrado.

**UI references:**
- docs\ui-reference\tendencia-categoria.png

---

### 5.5 Dashboard y KPIs

**Acceso:** Sección en el menú de navegación principal.

**Selector de Período:** Mes actual (default) | Mes anterior | Trimestre | Año.

**Tarjetas KPI:**
- Ingreso Neto del período
- Gasto Total (monto absoluto y % del ingreso)
- Ahorro Total (monto absoluto y % del ingreso)
- Patrimonio Neto (siempre en tiempo real, independiente del período seleccionado)

**Tabla de Posición — Ideal vs. Real:**
- Compara el porcentaje real de gasto por grupo de categorías contra el porcentaje ideal definido por el usuario.
- Semáforo visual: Verde (dentro del umbral ideal), Rojo (por encima del ideal).
- Los porcentajes ideales se configuran en **Configuración → Metas de Presupuesto**: una pantalla, un formulario, un guardado.

**UI references:**
- docs\ui-reference\dashboard-screen.png
- docs\ui-reference\dashboard-screen-scroll-down.png
- docs\ui-reference\config-screen.png

---

### 5.6 Módulo de Helpers (Micro-Planificación)

Sección dedicada en el menú principal. Cada helper es una pantalla independiente. Todos terminan con un botón de acción para aplicar el resultado calculado directamente como asignación al presupuesto del mes actual.

**UI references:**
- docs\ui-reference\helpers-screen.png

#### 5.6.1 Calculadora de Súper

Calcula el presupuesto de alimentación basado en una tarifa diaria, ajustada a los días reales del mes.

**Inputs:**
- Tarifa diaria (ej. $15/día)
- Categoría vinculada

**Outputs:**
- Presupuesto semanal: tarifa × 7
- Presupuesto mensual: tarifa × días del mes actual

**Acción:** "Asignar $X a [Categoría]" — aplica el monto mensual al presupuesto del mes actual.

**UI references:**
- docs\ui-reference\calc-super.png

#### 5.6.2 Planificador de Fines de Semana

Distribuye el presupuesto de ocio/deseos entre los fines de semana del mes.

**Inputs:**
- Categoría vinculada
- Gastos fijos de fin de semana ya comprometidos (opcional)

**Outputs:**
- Número de fines de semana en el mes actual
- Monto disponible en la categoría tras descontar gastos fijos
- Presupuesto por fin de semana
- Presupuesto por día de fin de semana

**Acción:** "Asignar $X a [Categoría]" si el monto calculado difiere del asignado actual.

**UI references:**
- docs\ui-reference\weekends.png

#### 5.6.3 Previsiones / Sinking Funds

Para ahorrar de forma progresiva hacia una meta futura vinculada a una categoría real del presupuesto.

**Gestión de Previsiones (CRUD):**
Cada previsión define:
- Nombre (ej. "Mantenimiento Carro")
- Categoría vinculada del presupuesto del usuario
- Monto objetivo (ej. $600)
- Fecha objetivo (ej. diciembre 2026)

**Cálculo automático:**
- Meses restantes hasta la fecha objetivo
- Saldo actual en la categoría vinculada
- **Contribución mensual necesaria** = (Objetivo − Saldo actual) / Meses restantes

**Acción:** "Asignar $X a [Categoría] este mes" — aplica la contribución calculada al presupuesto del mes actual.

**UI references:**
- docs\ui-reference\previsiones.png

#### 5.6.4 Tiers de Fondo de Emergencia

Visualiza el estado del fondo de emergencia en relación al gasto mínimo mensual del usuario.

**Configuración (en Configuración general):**
- Gasto mínimo mensual de supervivencia — definido por el usuario.
- Si no está definido, el helper lo solicita al abrirse.
- El sistema puede sugerir un valor basado en el promedio de los últimos 3 meses de gastos en categorías de Necesidades. El usuario confirma o ajusta.

**Visualización:**
- Balance total de cuentas Off-Budget (excluye cuentas de Deuda).
- Barra de progreso con 4 tiers: 1 mes / 3 meses / 6 meses / 12 meses.
- Código de color: Rojo (< 1 mes), Amarillo (1–3 meses), Verde claro (3–6 meses), Verde (6+ meses).
- KPI principal: **"X.X meses de supervivencia ahorrados"**

**UI references:**
- docs\ui-reference\fondo-emergencia.png

#### 5.6.5 Wishlist

Lista simple de metas de compra o deseos futuros.

**Campos por ítem:** nombre, costo estimado, prioridad (Alta / Media / Baja), notas opcionales.

**V1:** Solo lista informativa, sin vínculo al presupuesto.
**V2:** Vínculo a una cuenta de ahorro o categoría de Sinking Fund.

**UI references:**
- docs\ui-reference\wishlist.png

---

### 5.7 Interfaz y Experiencia de Usuario

**SEGUIR GUIDELINES DE DESIGN.md**

**Temas:**
- Soporte para modo Claro y modo Oscuro.
- Por defecto: detecta la preferencia del sistema operativo del usuario.
- La preferencia se guarda y sincroniza entre dispositivos.

**Navegación Principal:**
- Móvil: barra de navegación inferior — Presupuesto | Cuentas | Helpers | Dashboard | Configuración.
- Desktop: sidebar lateral con las mismas secciones.

**Botón Flotante (FAB):**
- Botón "+" siempre visible en la esquina inferior derecha.
- Móvil: abre el formulario de Quick Add como un panel deslizable desde abajo.
- Desktop: abre el formulario en un panel lateral.

**Panel de Transacciones Pendientes:**
- Si hay transacciones recurrentes vencidas al abrir la app, se muestra este panel antes de la pantalla principal.
- El usuario confirma, edita o salta cada una. Diseñado para completarse en menos de 30 segundos.

---

## 6. Requisitos No Funcionales

| Requisito | Especificación |
|---|---|
| Aislamiento de datos | Los datos de cada usuario están estrictamente aislados. Ningún usuario puede ver ni acceder a datos de otro. |
| Contraseñas | Almacenadas con hash robusto y salt. MD5 y SHA-1 están prohibidos. |
| Comunicación segura | Todo el tráfico viaja cifrado (HTTPS). Las conexiones HTTP se redirigen automáticamente. |
| Instalabilidad | La app puede instalarse en el dispositivo del usuario como cualquier app nativa (Android/iOS/Desktop). |
| Accesibilidad | Cumplimiento de WCAG 2.1 nivel AA: contraste adecuado, navegación por teclado, labels en todos los controles de formulario. |
| Rendimiento | La app debe ser interactiva en menos de 3 segundos en una conexión 4G estándar. |

---

## 7. Fuera de Alcance — V1

Los siguientes ítems están **explícitamente excluidos del MVP** y pospuestos:

| Feature | Versión |
|---|---|
| Escritura sin conexión (offline sync) | V2 |
| Split transactions (un gasto en múltiples categorías) | V2 |
| Importación de extractos bancarios (CSV/OFX) | V2+ |
| Múltiples monedas | V2+ |
| Vínculo Wishlist → categoría o cuenta | V2 |
| Múltiples plantillas de presupuesto con nombre | V2 |
| Adjuntar fotos de recibos | V2+ |
| Notificaciones push | V2+ |
