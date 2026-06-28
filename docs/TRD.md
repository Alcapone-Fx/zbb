# Documento de Requisitos Técnicos (TRD)
# Aplicación de Finanzas Personales — Personal Finance App

---

## 0. Metadata

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Estado | Aprobado |
| Fecha | 2026-06-25 |
| Documento de producto complementario | PRD.md |

---

## 1. Stack Técnico

| Capa | Tecnología | Versión mínima | Justificación |
|---|---|---|---|
| Framework | Next.js (App Router) + TypeScript | 15.2.3 | Versiones anteriores tienen CVE-2025-29927 (middleware authorization bypass crítico). Usar siempre la última versión estable disponible al inicio del proyecto, nunca inferior a 15.2.3. |
| Estilos | Tailwind CSS + shadcn/ui | Tailwind 3+ | Dark mode nativo con selector de clase, componentes accesibles WCAG 2.1 AA por defecto, mobile-first out-of-the-box. |
| Estado global | Zustand | 4+ | Liviano, sin boilerplate. Suficiente para la lógica ZBB del lado cliente. No usar Redux ni Context API para estado global. |
| Backend / BaaS | Supabase | — | PostgreSQL con RLS nativo para multi-tenancy. Auth integrado con bcrypt. Elimina la necesidad de un backend custom en V1. |
| Charts | Recharts | 2+ | React nativo, tree-shakeable, responsive, sin dependencias de terceros. |
| PWA | next-pwa | — | Integración directa con Next.js App Router. Genera service worker y manifest. |
| Deploy — Frontend | Vercel | — | Integración nativa con Next.js. Preview deployments por rama. |
| Deploy — Backend | Supabase Cloud | — | Managed PostgreSQL + Auth + Storage. Free tier suficiente para MVP. |

---

## 2. Seguridad e Implementación de Autenticación

### 2.1 Contraseñas

Gestionadas exclusivamente por Supabase Auth. El algoritmo subyacente es **bcrypt con salt automático**. No implementar hashing custom. MD5 y SHA-1 están **prohibidos**.

### 2.2 Gestión de Sesión — Token Strategy

| Token | TTL | Almacenamiento |
|---|---|---|
| Access token (JWT) | 1 hora | Memoria del cliente (nunca localStorage) |
| Refresh token | 30 días | Cookie `httpOnly; Secure; SameSite=Strict` — inaccesible desde JavaScript |

**Inactividad:** Logout automático tras 30 minutos sin actividad del usuario. Implementar via timer en cliente que invalida la sesión localmente y redirige al login.

**"Recuérdame":** Cuando está activo, el refresh token se renueva en cada uso hasta el límite de 30 días, extendiendo la sesión de forma transparente. Sin este flag, la sesión termina al cerrar el navegador.

### 2.3 Flujo de Email Verification

Supabase Auth maneja el flujo completo: envío del email de verificación al registro, validación del token en el callback, y redirección al app. La implementación del lado de Next.js requiere:
1. Ruta de callback `/auth/confirm` que consuma el token de Supabase.
2. Middleware de Next.js que bloquee acceso a rutas protegidas si el email no está verificado.

### 2.4 Recuperación de Contraseña

Flujo estándar Supabase:
1. `supabase.auth.resetPasswordForEmail(email)` — envía el magic link.
2. Ruta `/auth/reset-password` en Next.js que recibe el token y permite al usuario setear nueva contraseña.
3. `supabase.auth.updateUser({ password })` — actualiza la contraseña.

### 2.5 HTTPS

Forzado por Vercel en producción. En desarrollo local usar `localhost` (tratado como secure context por los browsers modernos). No implementar redirects HTTP→HTTPS manualmente; Vercel los maneja.

---

## 3. Multi-Tenancy — Row Level Security

Todo aislamiento de datos se implementa a nivel de base de datos mediante **PostgreSQL Row Level Security (RLS)**. El filtrado no depende del frontend ni de la capa de aplicación.

### 3.1 Política Base

Todas las tablas de usuario tienen una política RLS activa:

```sql
-- Habilitar RLS en cada tabla
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento estricto por user_id
CREATE POLICY "user_isolation" ON accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Este patrón se aplica a **todas las tablas** que contengan datos de usuario.

### 3.2 Tablas con RLS Obligatorio

`accounts`, `category_groups`, `categories`, `budget_months`, `budget_allocations`, `transactions`, `scheduled_transactions`, `tags`, `sinking_funds`, `wishlist_items`, `reconciliation_records`, `user_settings`.

### 3.3 Service Role

Las operaciones administrativas (migraciones, correcciones de datos de soporte) usan el `service_role` key de Supabase, que bypasea RLS. Esta key **nunca** debe estar expuesta en el cliente. Solo en variables de entorno de servidor o funciones Edge de Supabase.

---

## 4. Modelo de Datos

### 4.1 Convenciones

- Todos los IDs son `UUID` generados por el servidor (`gen_random_uuid()`).
- Todos los timestamps en `TIMESTAMPTZ` (UTC).
- `user_id` en todas las tablas de usuario referencia `auth.users(id)` con `ON DELETE CASCADE`.
- Moneda: todos los montos se almacenan en `NUMERIC(12,2)` en USD.

### 4.2 Entidades

**`accounts`**
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name          TEXT NOT NULL
type          TEXT NOT NULL  -- 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'liability'
is_tracking_only BOOLEAN NOT NULL DEFAULT false  -- true = Off-Budget
is_archived   BOOLEAN NOT NULL DEFAULT false
starting_balance NUMERIC(12,2) NOT NULL DEFAULT 0
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**`category_groups`**
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name            TEXT NOT NULL
ideal_percentage NUMERIC(5,2)  -- porcentaje ideal del ingreso (Dashboard Ideal vs Real)
display_order   INTEGER NOT NULL DEFAULT 0
is_archived     BOOLEAN NOT NULL DEFAULT false
```

**`categories`**
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
group_id      UUID NOT NULL REFERENCES category_groups(id)
name          TEXT NOT NULL
display_order INTEGER NOT NULL DEFAULT 0   -- posición dentro del grupo para drag-and-drop
is_system     BOOLEAN NOT NULL DEFAULT false  -- true = categorías auto-creadas (ej. "Pago · Visa")
is_archived   BOOLEAN NOT NULL DEFAULT false
```

**`budget_months`**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
month       TEXT NOT NULL  -- formato 'YYYY-MM'
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE(user_id, month)
```

**`budget_allocations`**
```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
budget_month_id  UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE
category_id      UUID NOT NULL REFERENCES categories(id)
assigned_amount  NUMERIC(12,2) NOT NULL DEFAULT 0
UNIQUE(budget_month_id, category_id)
```

**`transactions`**
```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
account_id               UUID NOT NULL REFERENCES accounts(id)
category_id              UUID REFERENCES categories(id)  -- nullable para transfers Off→Off
amount                   NUMERIC(12,2) NOT NULL  -- positivo = entrada, negativo = salida
date                     DATE NOT NULL
type                     TEXT NOT NULL  -- 'expense' | 'income' | 'transfer' | 'adjustment' | 'opening_balance'
payee                    TEXT
memo                     TEXT
tags                     TEXT[]  -- array de nombres de tags
is_cleared               BOOLEAN NOT NULL DEFAULT false
is_reconciled            BOOLEAN NOT NULL DEFAULT false
transfer_pair_id         UUID REFERENCES transactions(id)  -- enlaza las dos legs de una transferencia
scheduled_transaction_id UUID REFERENCES scheduled_transactions(id)
next_month               BOOLEAN NOT NULL DEFAULT false  -- ingreso marcado para el mes siguiente
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**`scheduled_transactions`**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
account_id  UUID NOT NULL REFERENCES accounts(id)
category_id UUID REFERENCES categories(id)
amount      NUMERIC(12,2) NOT NULL
payee       TEXT
memo        TEXT
frequency   TEXT NOT NULL  -- 'daily' | 'weekly' | 'monthly' | 'yearly'
start_date  DATE NOT NULL
end_date    DATE  -- nullable = sin fecha de fin
next_due_date DATE NOT NULL
is_active   BOOLEAN NOT NULL DEFAULT true
```

**`tags`**
```sql
id      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name    TEXT NOT NULL
UNIQUE(user_id, name)
```

**`sinking_funds`**
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
category_id   UUID NOT NULL REFERENCES categories(id)
name          TEXT NOT NULL
target_amount NUMERIC(12,2) NOT NULL
target_date   DATE NOT NULL
notes         TEXT
```

**`wishlist_items`**
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name            TEXT NOT NULL
estimated_cost  NUMERIC(12,2)
priority        TEXT  -- 'high' | 'medium' | 'low'
notes           TEXT
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**`reconciliation_records`**
```sql
id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
account_id                UUID NOT NULL REFERENCES accounts(id)
date                      DATE NOT NULL
bank_balance              NUMERIC(12,2) NOT NULL
app_balance               NUMERIC(12,2) NOT NULL
adjustment_amount         NUMERIC(12,2) NOT NULL DEFAULT 0
adjustment_transaction_id UUID REFERENCES transactions(id)
created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**`user_settings`**
```sql
id                          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
emergency_fund_min_expense  NUMERIC(12,2)
theme                       TEXT NOT NULL DEFAULT 'system'  -- 'light' | 'dark' | 'system'
budget_template             JSONB  -- ver estructura abajo
created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Estructura de `budget_template` (JSONB):**
```json
{
  "source_month": "2026-01",
  "saved_at": "2026-01-31T20:00:00Z",
  "allocations": [
    { "category_id": "uuid", "amount": 300.00 },
    { "category_id": "uuid", "amount": 150.00 }
  ]
}
```

### 4.3 Lógica de Cálculo — Columna "Disponible"

El valor "Disponible" de una categoría en un mes dado no se almacena — se calcula en tiempo real:

```
Disponible(mes M, categoría C) =
  allocated(M, C)
  + rollover(M-1, C)
  - activity(M, C)

donde:
  allocated   = budget_allocations.assigned_amount para ese mes/categoría
  rollover    = Disponible(M-1, C)  [recursivo; base = starting_balance del primer mes]
  activity    = SUM(transactions.amount) donde account On-Budget, category = C, month = M

Caso base: si no existe budget_allocation para un mes anterior, rollover = 0
Sobregiro: si Disponible(M, C) < 0, ese valor negativo se propaga como rollover negativo al mes M+1
```

### 4.4 Lógica de Tarjeta de Crédito — Categoría de Sistema

Al crear una cuenta de tipo `credit_card`, se ejecuta automáticamente:

```sql
INSERT INTO categories (user_id, group_id, name, is_system)
VALUES (
  :user_id,
  :system_group_id,  -- grupo de sistema "Sistema", oculto en la UI de gestión
  'Pago · ' || :account_name,
  true
);
```

Cuando se registra una transacción con `account.type = 'credit_card'` y `type = 'expense'`, se crea automáticamente una segunda transacción espejo:

```
transacción espejo:
  account_id  = misma cuenta CC
  category_id = categoría sistema "Pago · [Nombre]"
  amount      = +|expense.amount|  (positivo, suma a la categoría de pago)
  type        = 'adjustment'
```

Al pagar la tarjeta (transfer On-Budget → CC), se consume la categoría de sistema por el monto transferido.

---

## 5. Arquitectura Offline

### 5.1 V1 — Service Worker con Cache-First para shell

Configuración de `next-pwa`:

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',   // intenta red, cae a cache si falla
      options: { cacheName: 'supabase-api', expiration: { maxAgeSeconds: 300 } }
    }
  ]
})
```

El shell de Next.js (JS, CSS, assets estáticos) se cachea con estrategia `CacheFirst`. Los datos de Supabase se cachean con `NetworkFirst` con TTL de 5 minutos para garantizar datos frescos cuando hay conexión.

### 5.2 V2 — Offline de Escritura (futura)

Opciones evaluadas para V2:
- **PowerSync + Supabase**: solución declarativa de sync offline-first diseñada específicamente para Supabase. Recomendada como primera opción para V2.
- **ElectricSQL**: alternativa con sync basado en CRDT.
- **Cola en IndexedDB manual**: implementación custom, mayor control pero mayor complejidad.

La estrategia de resolución de conflictos para V2 queda por definir (last-write-wins es el default más simple para datos financieros de un solo usuario).

---

## 6. Performance

| Métrica | Target | Estrategia |
|---|---|---|
| Time to Interactive | < 3s en 4G | Server Components de Next.js para el render inicial; Suspense + streaming para datos |
| Bundle size | < 200KB JS inicial (sin gzip) | Code splitting por ruta; shadcn/ui tree-shakeable; recharts lazy-loaded |
| API latency | < 300ms p95 para queries de presupuesto | Índices en `(user_id, month)`, `(user_id, account_id)`, `(user_id, date)` |
| Lighthouse PWA score | > 90 | Manifest completo, service worker, HTTPS, responsive design |

### 6.1 Índices Requeridos en PostgreSQL

```sql
-- Queries críticas de la vista de presupuesto
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id, date);
CREATE INDEX idx_budget_allocations_month ON budget_allocations(budget_month_id, category_id);
CREATE INDEX idx_accounts_user ON accounts(user_id) WHERE is_archived = false;
CREATE INDEX idx_scheduled_next_due ON scheduled_transactions(user_id, next_due_date) WHERE is_active = true;
```

---

## 7. Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # expuesta al cliente, protegida por RLS
SUPABASE_SERVICE_ROLE_KEY=...           # NUNCA exponer al cliente — solo server-side

# App
NEXT_PUBLIC_APP_URL=https://app.dominio.com
```

El `SUPABASE_SERVICE_ROLE_KEY` solo se usa en Route Handlers de Next.js del lado servidor o en Supabase Edge Functions. Nunca en componentes cliente.

---

## 8. Consideraciones de Implementación — ZBB

### 8.1 "Dinero a Asignar" — Cálculo

```
Dinero a Asignar (mes M) =
  SUM(income transactions en On-Budget accounts, mes M, next_month = false)
  + SUM(income transactions mes M-1, next_month = true)
  - SUM(budget_allocations.assigned_amount, mes M)
  + rollover_negativo(M-1)  -- si el mes anterior cerró con categorías en negativo
```

### 8.2 Transferencias — Representación en DB

Una transferencia se almacena como dos transacciones enlazadas por `transfer_pair_id`:

```
Leg 1 (salida): amount = -500, account_id = planillera, category_id = "Fondo Emergencia"
Leg 2 (entrada): amount = +500, account_id = fondo_emergencia, category_id = NULL
transfer_pair_id en ambas apunta a la otra leg
```

Para transferencias Off-Budget → Off-Budget, ambas legs tienen `category_id = NULL`.

### 8.3 Rollover en Cascada

Cuando se edita un mes pasado, es necesario recalcular el "Disponible" de todos los meses posteriores en las categorías afectadas. Implementar este recálculo de forma lazy (al navegar a cada mes) en lugar de eager (recalcular todos los meses al guardar) para evitar latencia en la escritura.
