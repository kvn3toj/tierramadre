# SOT-v6-Usuarios · padrón de acceso en un solo libro

**Fecha:** 2026-09-10 · **Libro:** `1N5UEIx1vsjkknysAWAhGe0NBazeeHe53LUZ0PVBYwmo`
(https://docs.google.com/spreadsheets/d/1N5UEIx1vsjkknysAWAhGe0NBazeeHe53LUZ0PVBYwmo/edit)
· **Script:** `scripts/crear-sot-v6-usuarios.mjs` (dry-run por defecto, `--apply`, `--apply --continue`).

## Qué es

Un libro nuevo, separado del SOT v3, dedicado únicamente a **quién entra a la app, con qué
perfil y en qué estado**. Reemplaza las tres pestañas de roster de SOT v3 (`Asesores`,
`Proveedores`-con-email, `new-users`) por **una tabla** (`Usuarios`) con catálogos de
validación, bitácora y hoja de revisiones. Inventario, Ventas, Clientes (CRM), Lotes, etc.
**siguen en SOT v3** — este libro no los toca.

## Estado del cableado (medido 2026-09-10)

**La app todavía NO lee este libro.** `api/validate.ts`, `get-asesores.ts`, `asesorRoster.ts`,
`vault-unlock.ts`, `cotizacion-save.ts` y `send-email.js` siguen leyendo SOT v3 por
`findSheetByPattern(['asesor','embajador'])` y `new-users`. El repunte es el «Stage 1» del
análisis del 2026-09-09: env `USUARIOS_SPREADSHEET_ID` + flag `ROSTER_UNIFICADO`, un loader
`api/_lib/usuariosRoster.ts` con `resolveUsuario` puro, y los seis lectores movidos en la misma
release. Hasta entonces, **cualquier alta hecha aquí no tiene efecto en la app**: hacerla
también en SOT v3.

## Pestañas

| Pestaña | Filas×Cols | Quién escribe | Para qué |
|---|---|---|---|
| `Léeme` | 60×3 | humanos | diccionario, reglas, procedimientos (copia de esta spec en el libro) |
| `Usuarios` | 1000×16 | admin A–J · app K–P | la tabla. Congelada fila 1 y columnas A:C. Filtro básico + vistas «Solo staff», «Solo clientes», «No activos» |
| `Perfiles` | 20×8 | admin (con aviso) | catálogo de `perfil` + capacidades por perfil (rango, vePrecios, herramientasAdmin, creaInvitaciones, fijaMultiplicador) |
| `Estados` | 20×3 | admin (con aviso) | catálogo de `estado`: `activo` (único que abre), `inactivo`, `bloqueado` |
| `Accesos` | 5000×5 | app (pendiente de cablear) | bitácora: fecha, email, perfil, resultado (autorizado/registrado/denegado/bloqueado), detalle |
| `Revisiones` | 500×6 | humanos | revisión periódica de accesos: fecha, email, revisor, decisión (confirmar/degradar/retirar), motivo, aplicado ☑ |

### `Usuarios` — columnas

| Col | Header | Dueño | Notas |
|---|---|---|---|
| A | `email` | admin (staff) / app (cliente) | clave natural, minúsculas. Validación `TEXT_IS_EMAIL` estricta. Duplicados se pintan naranja (`COUNTIF`) |
| B | `perfil` | admin | dropdown estricto ← `Perfiles!A2:A7`: admin · embajador · asesor · invitado_especial · proveedor · cliente |
| C | `estado` | admin | dropdown estricto ← `Estados!A2:A4`. Lista blanca: sólo `activo` concede acceso (`api/_lib/rosterStatus.ts`) |
| D | `nombre` | admin / app si vacío | |
| E | `codigo` | admin | `ASE-001`… heredado de Asesores |
| F | `whatsapp` | admin | |
| G | `especialidad` | admin | |
| H | `codigoBoveda` | admin | lo lee `api/vault-unlock.ts` (alias `boveda`). Hoy vacío para todos: Asesores nunca tuvo la columna |
| I | `fechaAlta` | admin | `AAAA-MM-DD` (validación de fecha, no estricta) |
| J | `notas` | admin | |
| K | `origen` | app | `migracion-asesores` · `migracion-proveedores` · `app-google` · `hoja` |
| L–P | `foto` `idioma` `primerRegistro` `ultimoAcceso` `accesos` | app | fondo gris + protección con aviso «Bloque de la app» |

Reglas de escritura de la app (las mismas que hoy cumple `api/_lib/newUsers.ts` sobre
`new-users`): sólo `values.update` sobre rango **cerrado** — `A{n}:P{n}` al registrar un
cliente, `K{n}:P{n}` en cada acceso —, nunca `values.append` (incidente de la columna AT,
2026-08-03). Nunca cambia B/C de una fila existente, nunca crea una fila con perfil ≠ cliente.

Rangos con nombre: `USUARIOS` (`Usuarios!A1:P1000`), `PERFILES`, `ESTADOS`.
Formato condicional: cliente → gris cursiva; `estado ≠ activo` → fondo rojo; email duplicado → naranja.
Protecciones (aviso, no candado): cabecera de Usuarios, bloque K:P, Perfiles, Estados, Accesos.

## Semilla (migración desde SOT v3, sin inventar valores)

| Origen | Filas | Resultado |
|---|---|---|
| `Asesores` (35) | 35 con email | `Datos` → `perfil` por mapa **exacto** (trim, sin acentos): Administrador→admin (3), Embajador - Admin→admin (4, hoy gana `includes('admin')`), Embajador→embajador (5), Invitado Especial→invitado_especial (22: 18 activos, 4 inactivos), Proveedor→proveedor (1). **0 sin mapear.** `Estado` Activo/Inactivo → activo/inactivo. `Fecha Registro` normalizada a ISO (`2026- 3 - 13` → `2026-03-13`) |
| `Proveedores` (6) | 1 con email | `gerenciatel@gmail.com` ya estaba en Asesores como Proveedor → gana la fila de Asesores (colisión reportada). 5 proveedores sin email no entran (no pueden iniciar sesión hoy tampoco). La pestaña `Proveedores` de SOT v3 **no se retira**: es la tabla de proveedores de Fotosíntesis |
| `new-users` (1) | 1 | perfil `cliente`, `origen=app-google`, bloque app copiado 1:1 |

Total 36 filas = 36 emails de origen (paridad verificada leyendo el libro). Ningún `perfil`
ni `estado` fuera de catálogo. No hay ninguna fila `asesor`: el roster real nunca tuvo ese rol,
el código lo usaba sólo como default.

## Prácticas aplicadas (y de dónde salen)

- Una tabla por pestaña, una fila de cabecera con nombres consistentes en camelCase, sin celdas
  combinadas ni filas de título; cabecera congelada y en negrita; listas de validación en
  pestañas aparte y no en la propia tabla; rangos con nombre; pestaña de documentación;
  color como señal, nunca como dato — Ben Collins, *18 Best Practices for Working with Data in
  Google Sheets* (benlcollins.com/spreadsheets/data-best-practices/); Sheets Bootcamp,
  *Data Validation* y *Protect Sheets and Ranges* (sheetsbootcamp.com).
- Validación **estricta** sobre columnas enteras (`B2:B1000`, no sólo las filas con datos) y
  protección con descripción por rango, combinadas: la protección decide quién edita, la
  validación qué se puede escribir — OWOX, *Google Sheets Data Validation Guide*; Sheets Bootcamp.
- Columnas de revisión de accesos (identificador, rol, estado, último acceso, fecha de alta,
  revisor, decisión confirmar/degradar/retirar, motivo, remediación aplicada) y cadencia
  periódica — AccessOwl, *User Access Reviews Best Practices*; SecurEnds y Pathlock, plantillas
  de *User Access Review*.
- Rangos con nombre y protegidos vía `batchUpdate` — Google, *Named & protected ranges*
  (developers.google.com/workspace/sheets/api/samples/ranges).
- Propias del proyecto: lista blanca de estado, escrituras sólo en rango cerrado, «un default
  que rellena un campo vacío es un dato inventado» (`TierraMadre/CLAUDE.md`).

## Decisiones abiertas (del dueño)

1. **Compartir con humanos.** Hoy sólo el dueño (`kvn3toj@gmail.com`) y la service account
   (`tierra-madre-inventory@…iam.gserviceaccount.com`, writer). SOT v3 tiene además cinco
   cuentas editoras; para un padrón de acceso conviene mínimo privilegio: sólo quienes dan altas.
2. **Repunte de la app** (Stage 1) — ver arriba. Mientras no se haga, SOT v3 sigue siendo la verdad.
3. `ADMIN_EMAILS` (env de Vercel) sigue siendo una lista aparte para `cors.js` e `invitations.ts`.
4. La columna `aplicado` de `Revisiones` son casillas: `values.get` devuelve `FALSE` en las 499
   filas vacías. Inofensivo para humanos; si algún día la lee código, filtrar por `email` no vacío.

## Rollback

Borrar (o archivar) el libro. Nada en la app lo referencia todavía; SOT v3 no fue modificado
(el script sólo lo lee).
