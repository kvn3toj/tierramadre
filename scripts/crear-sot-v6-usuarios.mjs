#!/usr/bin/env node
/**
 * Crea el libro «TM-Padrón-Usuarios» (nacido como «SOT-v6-Usuarios» el
 * 2026-09-10 y renombrado el mismo día: los libros SOT-* son el linaje del
 * inventario; los satélites de la app van como TM-*): el padrón de acceso de la app en UNA tabla
 * (`Usuarios`) con catálogos de validación (`Perfiles`, `Estados`), una
 * bitácora (`Accesos`), una hoja de revisiones de acceso (`Revisiones`) y un
 * `Léeme` con el diccionario de columnas y el reparto de quién escribe qué.
 *
 * Semilla: se migran las tres pestañas de SOT v3 (`Asesores`, `Proveedores`
 * con email, `new-users`) SIN inventar valores — un rol que no mapea exacto
 * queda con `perfil` vacío y `estado=inactivo`, y sale en el reporte.
 *
 * Por defecto es DRY-RUN (imprime el reporte y las filas). Con `--apply` crea
 * el libro bajo la cuenta OAuth (dueña del SOT v3), lo comparte con la service
 * account y guarda el ID en docs/specs/2026-09-10-sot-v6-usuarios-id.txt.
 * Se niega a correr dos veces si ese archivo ya existe (usar --force).
 *
 *   node scripts/crear-sot-v6-usuarios.mjs            # dry-run
 *   node scripts/crear-sot-v6-usuarios.mjs --apply
 *   node scripts/crear-sot-v6-usuarios.mjs --apply --continue   # sólo formato+compartir sobre el libro existente
 */
import fs from 'node:fs';
import dotenv from 'dotenv';
import { BRAND, FONT, banding, bodyFormat, condFormula, headerFormat, leemeStyle, limpiar, listValidation, oauth, protect, range, rangeValidation, tabColor, widths } from './_lib/sheets-estilo.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const CONTINUE = process.argv.includes('--continue'); // retoma formato+compartir sobre el libro del ID_FILE
const ID_FILE = 'docs/specs/2026-09-10-sot-v6-usuarios-id.txt';
const TITLE = 'TM-Padrón-Usuarios'; // antes SOT-v6-Usuarios (renombrado 2026-09-10)
const SOURCE_ID = process.env.SPREADSHEET_ID; // SOT v3
const HOY = '2026-09-10';

// ─────────────────────────────────────────────────────────────────
// Esquema
// ─────────────────────────────────────────────────────────────────

// Bloque admin A–J, bloque app K–P. El orden es contrato: la app escribe
// rangos CERRADOS (A{n}:P{n} al crear un cliente, K{n}:P{n} en cada acceso)
// y nunca pisa una celda del bloque admin.
export const USUARIOS_HEADERS = [
  'email', // A  clave natural, minúsculas
  'perfil', // B  dropdown ← Perfiles!A
  'estado', // C  dropdown ← Estados!A
  'nombre', // D
  'codigo', // E  ASE-001… (heredado de Asesores)
  'whatsapp', // F
  'especialidad', // G
  'codigoBoveda', // H  lo lee api/vault-unlock.ts (alias 'boveda')
  'fechaAlta', // I  AAAA-MM-DD
  'notas', // J
  'origen', // K  ← app: hoja | app-google | migracion-*
  'foto', // L  ← app
  'idioma', // M  ← app
  'primerRegistro', // N  ← app (ISO)
  'ultimoAcceso', // O  ← app (ISO)
  'accesos', // P  ← app (contador)
];
const ADMIN_BLOCK_END = 'J';
const APP_BLOCK_START = 'K';
const LAST_COL = 'P';

const PERFILES_HEADERS = [
  'perfil',
  'rango',
  'nombreVisible',
  'descripcion',
  'vePrecios',
  'herramientasAdmin',
  'creaInvitaciones',
  'fijaMultiplicador',
];
// Fuente: src/utils/permisosMultiplicador.ts, src/hooks/useAuth.ts,
// api/_lib/catalogProjection.ts, api/_lib/catalogGrant.ts (2026-09-10).
const PERFILES_ROWS = [
  ['admin', 1, 'Administrador', 'Acceso total: catálogo, herramientas admin, Fotosíntesis, Convex.', 'sí', 'sí', 'sí', 'sí'],
  ['embajador', 2, 'Embajador', 'Vende con tarifa embajador; crea vitrinas e invitaciones.', 'sí', 'no', 'sí', 'sí'],
  ['asesor', 3, 'Asesor', 'Vende y cotiza; sin herramientas admin ni multiplicador propio.', 'sí', 'no', 'sí', 'no'],
  ['invitado_especial', 4, 'Invitado especial', 'Navega y comparte vitrinas como staff; no edita.', 'sí', 'no', 'sí', 'sí'],
  ['proveedor', 5, 'Proveedor', 'Portal de proveedor (cotizaciones); no usa el catálogo de venta.', 'no', 'no', 'no', 'no'],
  ['cliente', 6, 'Cliente', 'Autorregistro con Google: catálogo con precios y consulta por WhatsApp; sin herramientas.', 'sí', 'no', 'sí', 'no'],
];

const ESTADOS_HEADERS = ['estado', 'permiteAcceso', 'descripcion'];
// Lista BLANCA (api/_lib/rosterStatus.ts): sólo `activo` concede acceso.
const ESTADOS_ROWS = [
  ['activo', 'sí', 'Puede iniciar sesión. Es el ÚNICO valor que abre la puerta.'],
  ['inactivo', 'no', 'Dado de baja: no entra y sale del directorio de embajadores.'],
  ['bloqueado', 'no', 'Bloqueado por decisión administrativa (cliente o staff). No entra.'],
];

const ACCESOS_HEADERS = ['fecha', 'email', 'perfil', 'resultado', 'detalle'];
const ACCESOS_RESULTADOS = ['autorizado', 'registrado', 'denegado', 'bloqueado'];

const REVISIONES_HEADERS = ['fecha', 'email', 'revisor', 'decision', 'motivo', 'aplicado'];
const REVISIONES_DECISIONES = ['confirmar', 'degradar', 'retirar'];

// ─────────────────────────────────────────────────────────────────
// Mapeo desde SOT v3 (exacto, sin adivinar)
// ─────────────────────────────────────────────────────────────────

const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const PERFIL_MAP = new Map([
  ['administrador', 'admin'],
  ['admin', 'admin'],
  ['embajador - admin', 'admin'], // hoy: roleLower.includes('admin') gana (validate.ts)
  ['embajador', 'embajador'],
  ['asesor', 'asesor'],
  ['invitado especial', 'invitado_especial'],
  ['invitado_especial', 'invitado_especial'],
  ['proveedor', 'proveedor'],
]);
const ESTADO_MAP = new Map([
  ['activo', 'activo'],
  ['activa', 'activo'],
  ['active', 'activo'],
  ['inactivo', 'inactivo'],
  ['inactiva', 'inactivo'],
  ['inactive', 'inactivo'],
  ['bloqueado', 'bloqueado'],
]);

/** "2026- 3 - 13" → "2026-03-13"; cualquier otra forma se devuelve tal cual. */
function isoDate(raw) {
  const m = String(raw ?? '').match(/^\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})\s*$/);
  if (!m) return String(raw ?? '').trim();
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

const col = (headers, name) => headers.findIndex((h) => fold(h) === fold(name));

function migrar({ asesores, proveedores, newUsers }) {
  const filas = [];
  const reporte = { sinPerfil: [], estadoNoMapeado: [], colisiones: [], proveedoresSinEmail: 0 };
  const porEmail = new Map();

  // 1. Asesores (staff). Encabezados reales: "", Nombre, Datos, WhatsApp,
  //    Especialidad, Email, Estado, Fecha Registro.
  {
    const h = asesores[0];
    const iCod = 0, iNom = col(h, 'Nombre'), iDatos = col(h, 'Datos'), iWa = col(h, 'WhatsApp');
    const iEsp = col(h, 'Especialidad'), iMail = col(h, 'Email'), iEst = col(h, 'Estado'), iFec = col(h, 'Fecha Registro');
    const iBov = h.findIndex((x) => /boveda|vault/i.test(x));
    for (const r of asesores.slice(1)) {
      const email = fold(r[iMail]);
      if (!email) continue;
      const datos = fold(r[iDatos]);
      const perfil = PERFIL_MAP.get(datos) ?? '';
      const estadoRaw = fold(r[iEst]);
      let estado = ESTADO_MAP.get(estadoRaw);
      if (!estado) { reporte.estadoNoMapeado.push({ email, estado: r[iEst] }); estado = String(r[iEst] ?? '').trim(); }
      if (!perfil) { reporte.sinPerfil.push({ email, datos: r[iDatos] }); estado = 'inactivo'; }
      const fila = [
        email, perfil, estado, String(r[iNom] ?? '').trim(), String(r[iCod] ?? '').trim(),
        String(r[iWa] ?? '').trim(), String(r[iEsp] ?? '').trim(), iBov === -1 ? '' : String(r[iBov] ?? '').trim(),
        isoDate(r[iFec]), '', 'migracion-asesores', '', '', '', '', '',
      ];
      filas.push(fila); porEmail.set(email, fila);
    }
  }
  // 2. Proveedores con email → perfil proveedor. La pestaña Proveedores no
  //    tiene columna estado: hoy cuentan como activos por ausencia
  //    (validate.ts). Traducción documentada, no valor medido.
  {
    const h = proveedores[0];
    const iMail = col(h, 'email'), iNom = col(h, 'nombreORazonSocial'), iTel = col(h, 'telefono'), iTipo = col(h, 'tipo');
    for (const r of proveedores.slice(1)) {
      const email = fold(r[iMail]);
      if (!email) { reporte.proveedoresSinEmail++; continue; }
      if (porEmail.has(email)) { reporte.colisiones.push({ email, gana: 'Asesores', pierde: 'Proveedores' }); continue; }
      const fila = [
        email, 'proveedor', 'activo', String(r[iNom] ?? '').trim(), '', String(r[iTel] ?? '').trim(),
        String(r[iTipo] ?? '').trim(), '', '', '', 'migracion-proveedores', '', '', '', '', '',
      ];
      filas.push(fila); porEmail.set(email, fila);
    }
  }
  // 3. new-users → cliente. Columnas 1:1 al bloque app.
  {
    const h = newUsers[0];
    const g = (r, n) => { const i = col(h, n); return i === -1 ? '' : String(r[i] ?? '').trim(); };
    for (const r of newUsers.slice(1)) {
      const email = fold(r[col(h, 'email')]);
      if (!email) continue;
      if (porEmail.has(email)) { reporte.colisiones.push({ email, gana: 'Asesores', pierde: 'new-users' }); continue; }
      const estado = ESTADO_MAP.get(fold(g(r, 'estado'))) ?? g(r, 'estado');
      const fila = [
        email, 'cliente', estado, g(r, 'nombre'), '', '', '', '', g(r, 'primerRegistro').slice(0, 10), '',
        'app-google', g(r, 'foto'), g(r, 'idioma'), g(r, 'primerRegistro'), g(r, 'ultimoAcceso'), g(r, 'accesos'),
      ];
      filas.push(fila); porEmail.set(email, fila);
    }
  }
  return { filas, reporte };
}

// ─────────────────────────────────────────────────────────────────
// Léeme
// ─────────────────────────────────────────────────────────────────

const LEEME_HEADERS = ['seccion', 'clave', 'valor'];
const LEEME_ROWS = [
  ['Propósito', 'qué es', 'Padrón de acceso de la app Tierra Mädre: quién entra, con qué perfil y en qué estado. Una persona = una fila en `Usuarios`.'],
  ['Propósito', 'qué NO es', 'No es el CRM (Clientes vive en SOT v3 / Convex) ni el inventario. Aquí sólo vive el acceso.'],
  ['Propósito', 'familia de libros', 'SOT-* es el linaje del inventario (SOT-v3 legado, SOT-v6-Inventario espejo de Convex). TM-* son los satélites de la app: TM-Padrón-Usuarios (este), TM-App-Data. Nombre = familia + dominio; la versión sólo cuando conviven generaciones.'],
  ['Propósito', 'creado', `${HOY} por scripts/crear-sot-v6-usuarios.mjs, migrando Asesores + Proveedores(con email) + new-users de SOT v3.`],
  ['Reglas', 'una tabla por pestaña', 'Fila 1 = encabezados (contrato con el código: se buscan por NOMBRE, no por posición). Sin celdas combinadas, sin filas de título, sin fórmulas dentro de las tablas.'],
  ['Reglas', 'quién escribe qué', 'Admin: columnas A–J de Usuarios (email, perfil, estado, nombre, codigo, whatsapp, especialidad, codigoBoveda, fechaAlta, notas). App: columnas K–P (origen, foto, idioma, primerRegistro, ultimoAcceso, accesos).'],
  ['Reglas', 'la app nunca', 'Cambia perfil/estado de una fila existente, crea una fila que no sea cliente, ni escribe con rango abierto (append). Escribe A{n}:P{n} al registrar un cliente y K{n}:P{n} en cada acceso.'],
  ['Reglas', 'lista blanca', 'Sólo estado=activo concede acceso. Vacío, "Suspendido", "Activo " con espacio → deniega. Cualquier perfil que no esté en Perfiles → deniega (nunca se adivina un rol).'],
  ['Reglas', 'precedencia', 'Si un email tiene varias filas: manda la de mayor rango (Perfiles!rango) que esté activa; si ninguna está activa → denegado. Una fila staff, aunque inactiva, impide que ese email entre como cliente.'],
  ['Reglas', 'no inventar', 'Una celda vacía se queda vacía. La migración dejó perfil vacío (y estado inactivo) cuando el rol de origen no mapeaba exacto; rellenarlo es tarea humana.'],
  ['Procedimientos', 'alta de staff', 'Escribir email (minúsculas), perfil (dropdown), estado=activo, nombre, y opcionalmente codigo/whatsapp/especialidad/fechaAlta. Nada más.'],
  ['Procedimientos', 'promover un cliente', 'Cambiar perfil de cliente a asesor/embajador en SU fila. No copiar la fila. La app renueva el token en la siguiente revalidación.'],
  ['Procedimientos', 'bloquear', 'estado=bloqueado (o inactivo). No borrar la fila: se pierde la trazabilidad y podría volver a autorregistrarse.'],
  ['Procedimientos', 'revisión de accesos', 'Trimestral: filtrar vista "Staff" y anotar en Revisiones quién confirma/degrada/retira cada acceso y por qué; marcar aplicado cuando el cambio esté en Usuarios.'],
  ['Pestañas', 'Usuarios', 'La tabla. Vistas de filtro: "Solo staff", "Solo clientes", "No activos". Emails duplicados en marrón tierra y negrita; clientes en gris cursiva; no activos con fondo tierra. Colores Quiet Emerald del design system.'],
  ['Pestañas', 'Perfiles / Estados', 'Catálogos que alimentan los dropdowns (validación estricta: un valor fuera de la lista se rechaza). Cambiar aquí = cambiar el contrato con el código.'],
  ['Pestañas', 'Accesos', 'Bitácora que escribirá la app: una fila por inicio de sesión (fecha, email, perfil, resultado, detalle). Sólo lectura para humanos.'],
  ['Pestañas', 'Revisiones', 'Registro humano de las revisiones periódicas de acceso.'],
  ['Cableado', 'estado', `Al ${HOY} la app sigue leyendo SOT v3 (Asesores/Proveedores/new-users). El repunte a este libro va detrás de la env USUARIOS_SPREADSHEET_ID + ROSTER_UNIFICADO (ver docs/specs/2026-09-10-sot-v6-usuarios.md).`],
  ['Cableado', 'ADMIN_EMAILS', 'La env ADMIN_EMAILS de Vercel sigue siendo una lista aparte para algunos endpoints (api/_lib/cors.js, api/invitations.ts). No vive en este libro.'],
];

// ─────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────

async function main() {
  if (!SOURCE_ID) throw new Error('SPREADSHEET_ID (SOT v3) no está en .env.local');
  if (APPLY && !CONTINUE && fs.existsSync(ID_FILE) && !FORCE) {
    console.error(`❌ Ya existe ${ID_FILE} (${fs.readFileSync(ID_FILE, 'utf8').split('\n')[0]}). Volver a correr crearía un libro duplicado. Usa --force si de verdad quieres otro.`);
    process.exit(1);
  }
  const { sheets, drive } = oauth();

  // Lectura de origen (SOT v3)
  const read = async (tab) => (await sheets.spreadsheets.values.get({ spreadsheetId: SOURCE_ID, range: `'${tab}'!A1:Z` })).data.values ?? [];
  const [asesores, proveedores, newUsers] = await Promise.all([read('Asesores'), read('Proveedores'), read('new-users')]);
  console.log(`📖 SOT v3: Asesores ${asesores.length - 1} · Proveedores ${proveedores.length - 1} · new-users ${newUsers.length - 1}`);

  const { filas, reporte } = migrar({ asesores, proveedores, newUsers });
  const porPerfil = {};
  for (const f of filas) { const k = `${f[1] || '(vacío)'} / ${f[2]}`; porPerfil[k] = (porPerfil[k] || 0) + 1; }
  console.log('\n📊 Filas para Usuarios:', filas.length);
  console.table(porPerfil);
  console.log('📋 Reporte:', JSON.stringify(reporte, null, 1));
  if (!APPLY) {
    console.log('\n— DRY-RUN — primeras filas:');
    console.table(filas.slice(0, 8).map((f) => Object.fromEntries(USUARIOS_HEADERS.map((h, i) => [h, f[i]]))));
    console.log('\nNada creado. Corre con --apply para crear el libro.');
    return;
  }

  // Service account que usa la app (misma que edita SOT v3)
  const perms = (await drive.permissions.list({ fileId: SOURCE_ID, fields: 'permissions(emailAddress,role)' })).data.permissions ?? [];
  const sa = perms.find((p) => /gserviceaccount\.com$/.test(p.emailAddress || ''))?.emailAddress;
  if (!sa) throw new Error('No encontré la service account entre los permisos de SOT v3');

  let ssId, url, ids;
  if (CONTINUE) {
    ssId = fs.readFileSync(ID_FILE, 'utf8').split('\n')[0].trim();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: ssId, fields: 'spreadsheetUrl,sheets(properties(title,sheetId))' });
    url = meta.data.spreadsheetUrl;
    ids = Object.fromEntries(meta.data.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    console.log(`\n↩️  Retomando ${url}`);
    const actual = (await drive.files.get({ fileId: ssId, fields: 'name' })).data.name;
    if (actual !== TITLE) {
      await drive.files.update({ fileId: ssId, requestBody: { name: TITLE } });
      console.log(`✏️  Renombrado: «${actual}» → «${TITLE}»`);
    }
    const leeme = [LEEME_HEADERS, ...LEEME_ROWS];
    await sheets.spreadsheets.values.clear({ spreadsheetId: ssId, range: `'Léeme'!A${leeme.length + 1}:C60` });
    await sheets.spreadsheets.values.update({ spreadsheetId: ssId, range: `'Léeme'!A1:C${leeme.length}`, valueInputOption: 'RAW', requestBody: { values: leeme } });
    console.log(`📝 Léeme actualizado (${LEEME_ROWS.length} filas)`);
  } else {
    // 1. Crear libro con pestañas y dimensiones exactas (sin columnas sobrantes:
    //    evita que un append abierto ancle donde quiera).
    const tab = (title, cols, rows = 1000, color, frozenCols = 0) => ({
      properties: { title, tabColor: color, gridProperties: { rowCount: rows, columnCount: cols, frozenRowCount: 1, frozenColumnCount: frozenCols } },
    });
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: TITLE, locale: 'es_CO', timeZone: 'America/Bogota' },
        sheets: [
          tab('Léeme', LEEME_HEADERS.length, 60, { red: 1, green: 1, blue: 1 }),
          tab('Usuarios', USUARIOS_HEADERS.length, 1000, { red: 0.06, green: 0.5, blue: 0.3 }, 3),
          tab('Perfiles', PERFILES_HEADERS.length, 20, { red: 0.6, green: 0.6, blue: 0.6 }),
          tab('Estados', ESTADOS_HEADERS.length, 20, { red: 0.6, green: 0.6, blue: 0.6 }),
          tab('Accesos', ACCESOS_HEADERS.length, 5000, { red: 0.2, green: 0.4, blue: 0.8 }),
          tab('Revisiones', REVISIONES_HEADERS.length, 500, { red: 0.9, green: 0.6, blue: 0.1 }),
        ],
      },
    });
    ssId = created.data.spreadsheetId;
    url = created.data.spreadsheetUrl;
    ids = Object.fromEntries(created.data.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    console.log(`\n✅ Libro creado: ${url}`);
    fs.writeFileSync(ID_FILE, `${ssId}\n${url}\ncreado ${HOY} por scripts/crear-sot-v6-usuarios.mjs\n`);

    // 2. Valores (encabezados + semilla), siempre con rango cerrado.
    const put = (tabName, rows, last) => ({ range: `'${tabName}'!A1:${last}${rows.length}`, values: rows });
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: ssId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          put('Léeme', [LEEME_HEADERS, ...LEEME_ROWS], 'C'),
          put('Usuarios', [USUARIOS_HEADERS, ...filas], LAST_COL),
          put('Perfiles', [PERFILES_HEADERS, ...PERFILES_ROWS], 'H'),
          put('Estados', [ESTADOS_HEADERS, ...ESTADOS_ROWS], 'C'),
          put('Accesos', [ACCESOS_HEADERS], 'E'),
          put('Revisiones', [REVISIONES_HEADERS], 'F'),
        ],
      },
    });
    console.log(`✅ Valores escritos (Usuarios: ${filas.length} filas)`);
  }

  // 3. Formato, validación, protección, nombres, vistas. Idempotente: primero
  //    se borra la decoración previa (no los valores).
  const borrados = await limpiar(sheets, ssId);
  if (borrados) console.log(`🧹 Decoración previa retirada (${borrados} objetos)`);
  const U = ids.Usuarios, P = ids.Perfiles, E = ids.Estados, A = ids.Accesos, R = ids.Revisiones, L = ids['Léeme'];
  const nPerf = PERFILES_ROWS.length + 1, nEst = ESTADOS_ROWS.length + 1;
  const requests = [
    // Cabeceras: esmeralda profunda con texto blanco; catálogos en esmeralda fuerte.
    ...headerFormat(U, USUARIOS_HEADERS.length), ...headerFormat(P, PERFILES_HEADERS.length, BRAND.strong), ...headerFormat(E, ESTADOS_HEADERS.length, BRAND.strong),
    ...headerFormat(A, ACCESOS_HEADERS.length, BRAND.g700), ...headerFormat(R, REVISIONES_HEADERS.length, BRAND.g700), ...leemeStyle(L, 60),
    bodyFormat(U, USUARIOS_HEADERS.length, 1000), bodyFormat(P, PERFILES_HEADERS.length, 20), bodyFormat(E, ESTADOS_HEADERS.length, 20),
    bodyFormat(A, ACCESOS_HEADERS.length, 5000), bodyFormat(R, REVISIONES_HEADERS.length, 500),
    tabColor(U, BRAND.primary), tabColor(P, BRAND.accent), tabColor(E, BRAND.accent), tabColor(A, BRAND.g600), tabColor(R, BRAND.g400),
    ...widths(U, [260, 150, 100, 230, 90, 120, 150, 110, 105, 260, 150, 120, 70, 170, 170, 80]),
    ...widths(P, [140, 60, 150, 460, 90, 130, 130, 130]),
    ...widths(E, [110, 110, 460]),
    ...widths(A, [170, 260, 140, 110, 400]),
    ...widths(R, [110, 260, 200, 110, 400, 90]),
    // Bandas alternas suaves en las tablas grandes.
    banding(U, `A1:${LAST_COL}1000`), banding(A, 'A1:E5000', BRAND.g700), banding(R, 'A1:F500', BRAND.g700),
    // Bloque de la app: texto gris (color como señal, no como dato) y columna
    // `perfil`/`estado` en negrita para que el ojo caiga en lo que decide el acceso.
    { repeatCell: { range: range(U, `${APP_BLOCK_START}2:${LAST_COL}1000`), cell: { userEnteredFormat: { textFormat: { foregroundColor: BRAND.g600, fontFamily: FONT, fontSize: 9 } } }, fields: 'userEnteredFormat.textFormat' } },
    { repeatCell: { range: range(U, 'B2:C1000'), cell: { userEnteredFormat: { textFormat: { bold: true, fontFamily: FONT, fontSize: 10, foregroundColor: BRAND.deepGreen } } }, fields: 'userEnteredFormat.textFormat' } },
    // Perfiles/Estados: columna clave en negrita.
    { repeatCell: { range: range(P, `A2:A${nPerf}`), cell: { userEnteredFormat: { textFormat: { bold: true, fontFamily: FONT, fontSize: 10, foregroundColor: BRAND.deepGreen } } }, fields: 'userEnteredFormat.textFormat' } },
    { repeatCell: { range: range(E, `A2:A${nEst}`), cell: { userEnteredFormat: { textFormat: { bold: true, fontFamily: FONT, fontSize: 10, foregroundColor: BRAND.deepGreen } } }, fields: 'userEnteredFormat.textFormat' } },
    // Validación estricta: email válido; perfil/estado desde los catálogos.
    { setDataValidation: { range: range(U, 'A2:A1000'), rule: { condition: { type: 'TEXT_IS_EMAIL' }, strict: true, inputMessage: 'Email en minúsculas' } } },
    rangeValidation(U, 'B2:B1000', `Perfiles!$A$2:$A$${nPerf}`),
    rangeValidation(U, 'C2:C1000', `Estados!$A$2:$A$${nEst}`),
    { setDataValidation: { range: range(U, 'I2:I1000'), rule: { condition: { type: 'DATE_IS_VALID' }, strict: false, inputMessage: 'AAAA-MM-DD' } } },
    rangeValidation(A, 'C2:C5000', `Perfiles!$A$2:$A$${nPerf}`),
    listValidation(A, 'D2:D5000', ACCESOS_RESULTADOS),
    listValidation(R, 'D2:D500', REVISIONES_DECISIONES),
    { setDataValidation: { range: range(R, 'F2:F500'), rule: { condition: { type: 'BOOLEAN' }, strict: true } } },
    // Formato condicional en Usuarios: duplicado (marrón, negrita), no activo
    // (fondo tierra), cliente (gris cursiva).
    condFormula(U, 'A2:A1000', '=AND($A2<>"";COUNTIF($A$2:$A$1000;$A2)>1)', { backgroundColor: BRAND.brownTint, textFormat: { foregroundColor: BRAND.brown, bold: true } }, 0),
    condFormula(U, `A2:${LAST_COL}1000`, '=AND($A2<>"";$C2<>"activo")', { backgroundColor: BRAND.brownTint, textFormat: { foregroundColor: BRAND.brown } }, 1),
    condFormula(U, `A2:${LAST_COL}1000`, '=$B2="cliente"', { textFormat: { foregroundColor: BRAND.g600, italic: true } }, 2),
    // Protecciones (aviso, no candado: el dueño decide a quién bloquear).
    protect(U, `A1:${LAST_COL}1`, 'Encabezados de Usuarios — el código los busca por nombre'),
    protect(U, `${APP_BLOCK_START}2:${LAST_COL}1000`, 'Bloque de la app (origen…accesos) — lo escribe la app en cada registro/acceso'),
    protect(P, null, 'Perfiles — catálogo de validación; cambiarlo cambia el contrato con el código'),
    protect(E, null, 'Estados — catálogo de validación; sólo "activo" concede acceso'),
    protect(A, null, 'Accesos — bitácora escrita por la app'),
    // Rangos con nombre.
    { addNamedRange: { namedRange: { name: 'PERFILES', range: range(P, `A2:A${nPerf}`) } } },
    { addNamedRange: { namedRange: { name: 'ESTADOS', range: range(E, `A2:A${nEst}`) } } },
    { addNamedRange: { namedRange: { name: 'USUARIOS', range: range(U, `A1:${LAST_COL}1000`) } } },
    // Filtro básico + vistas de filtro.
    { setBasicFilter: { filter: { range: range(U, `A1:${LAST_COL}1000`) } } },
    { addFilterView: { filter: { title: 'Solo staff', range: range(U, `A1:${LAST_COL}1000`), filterSpecs: [{ columnIndex: 1, filterCriteria: { hiddenValues: ['cliente', ''] } }] } } },
    { addFilterView: { filter: { title: 'Solo clientes', range: range(U, `A1:${LAST_COL}1000`), filterSpecs: [{ columnIndex: 1, filterCriteria: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'cliente' }] } } }] } } },
    { addFilterView: { filter: { title: 'No activos', range: range(U, `A1:${LAST_COL}1000`), filterSpecs: [{ columnIndex: 2, filterCriteria: { hiddenValues: ['activo', ''] } }] } } },
  ];
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log(`✅ Formato, validaciones, protecciones, rangos y vistas aplicados (${requests.length} requests)`);

  // 4. Compartir con la service account (la app). Humanos: decisión del dueño.
  await drive.permissions.create({ fileId: ssId, sendNotificationEmail: false, requestBody: { type: 'user', role: 'writer', emailAddress: sa } });
  console.log(`✅ Compartido (writer) con ${sa}`);
  console.log(`\nID: ${ssId}\nURL: ${url}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
