/**
 * Resincroniza las notas de Anima afectadas por la corrupción de nombres de
 * SOT v3 (ver scripts/fix-sot-v3-nombres-corruptos.mjs).
 *
 * Las notas de `Wings/Projects/TierraMadre/inventario/` se generaron desde
 * SOT v3 el 2026-07-22 y heredaron el nombre corrupto tanto en el contenido
 * como en el nombre de archivo. Este script:
 *   1. renombra item-266-1900-01-01-14-24-00.md → item-266-1-6.md
 *   2. corrige H1, fila "Nombre" y fila "ESTADO" de la tabla
 *   3. corrige el frontmatter (estado, tags, updated)
 *   4. reescribe el párrafo que describía el nombre como placeholder
 *   5. añade una nota de corrección con la procedencia del dato
 *   6. actualiza los enlaces en inventario-sot-v3-indice.md
 *
 * Uso:
 *   node scripts/fix-anima-nombres-corruptos.mjs           # dry-run
 *   node scripts/fix-anima-nombres-corruptos.mjs --apply
 */
import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const DIR =
  '/Users/kevinp/Movies/coomunity-universe/Obsidian/Anima/Wings/Projects/TierraMadre/inventario';
const INDEX = join(DIR, 'inventario-sot-v3-indice.md');
const HOY = '2026-07-22';
const ESTADO = 'LOTE X CT';

/** item → código real restaurado en SOT v3 */
const MAP = {
  266: '1.6',
  267: '1.7',
  268: '1.8',
  270: '1.1',
  273: '2.3',
  275: '2.5',
  277: '2.7',
  279: '2.9',
  281: '3.2',
  282: '3.3',
  284: '3.5',
  285: '3.6',
  288: '3.9',
  292: '4.4',
  293: '4.5',
  297: '4.9',
};

const slug = (s) => s.replace(/\./g, '-');

const NOTA_CORRECCION = (viejo, nuevo) => `
## Nota de corrección (${HOY})

El nombre de este ítem estaba corrupto en SOT v3: figuraba como \`${viejo}\`.
No es un registro placeholder ni basura — es una gema real del grupo **${ESTADO}**
(lote comprado y vendido por quilate), y su "nombre" en el inventario legacy es el
**código de posición dentro del lote**: \`${nuevo}\`.

La corrupción se produjo al migrar a SOT v3: los códigos numéricos se coercionaron
a fecha serial de 1900 (\`1.6\` → \`1900-01-01 14:24:00\`, donde 0.6 de día = 14:24)
o se sustituyeron por un placeholder \`Gema N.N\` con un código que **no** correspondía
al real.

Restaurado desde SOT v2 · \`Sintesis_Inventario\` (col B), verificado contra
Inventario #3 · \`INVENTARIO Tierra.Madre\` (col C). El ESTADO legacy \`${ESTADO}\`
también se repuso.

Pendiente: estos ítems **siguen sin costo** en los tres libros — al comprarse por
quilate, el costo vive a nivel de lote, no de ítem.
`;

const files = readdirSync(DIR);
const cambios = [];

for (const [item, codigo] of Object.entries(MAP)) {
  const actual = files.find(
    (f) => f.startsWith(`item-${item}-`) && f.endsWith('.md'),
  );
  if (!actual) {
    cambios.push({ item, error: 'nota no encontrada' });
    continue;
  }
  const rutaVieja = join(DIR, actual);
  let md = readFileSync(rutaVieja, 'utf8');

  // Nombre viejo: lo que hay tras "# " en el H1, antes de " — Ítem"
  const h1 = md.match(/^# (.+?) — Ítem #\d+/m);
  if (!h1) {
    cambios.push({ item, archivo: actual, error: 'H1 no reconocido' });
    continue;
  }
  const viejo = h1[1];

  // 1. H1
  md = md.replace(/^# .+? — Ítem #(\d+)/m, `# ${codigo} — Ítem #$1`);

  // 2. tabla: Nombre + ESTADO
  md = md.replace(/^(\| Nombre\s*\|)[^|]*\|/m, `$1 ${codigo.padEnd(29)}|`);
  md = md.replace(/^(\| ESTADO\s*\|)\s*—\s*\|/m, `$1 ${ESTADO.padEnd(29)}|`);

  // 3. frontmatter
  md = md.replace(/^estado: ""$/m, `estado: "${ESTADO}"`);
  md = md.replace(/^updated: .*$/m, `updated: ${HOY}`);
  md = md.replace(/^(tags: \[.*?)\]$/m, (m, g) =>
    g.includes('lote-x-ct') ? `${g}]` : `${g}, lote-x-ct, nombre-corregido]`,
  );

  // 4. párrafo descriptivo: quitar la lectura de "placeholder / sin nombre"
  md = md
    .replace(
      /Registro tipo placeholder \([^)]*\) sin peso, precio ni estado definidos aún\./g,
      `Ítem del grupo ${ESTADO} (lote por quilate); \`${codigo}\` es su código de posición en el lote, no un nombre bautizado. Sin peso ni precio individuales.`,
    )
    .replace(
      /,? ?(?:sin peso ni precio final asignados y )?con nombre aún sin definir \(aparece como una fecha\)/g,
      `, sin peso ni precio final individuales; \`${codigo}\` es su código de posición dentro del lote ${ESTADO}`,
    )
    .replace(
      /Ítem #(\d+) es un registro de inventario de la SOT v3 sin datos descriptivos completados/g,
      `Ítem #$1 pertenece al grupo ${ESTADO} y su código de lote es \`${codigo}\``,
    );

  // resto de menciones al nombre viejo en el cuerpo
  md = md.split(viejo).join(codigo);

  // 5. nota de corrección (idempotente)
  if (!md.includes('## Nota de corrección')) {
    md = md.trimEnd() + '\n' + NOTA_CORRECCION(viejo, codigo);
  }

  const nuevoNombre = `item-${item}-${slug(codigo)}.md`;
  const rutaNueva = join(DIR, nuevoNombre);
  cambios.push({
    item,
    de: actual,
    a: nuevoNombre,
    viejo,
    codigo,
    md,
    rutaVieja,
    rutaNueva,
  });
}

// --- Índice ---------------------------------------------------------------
let indice = readFileSync(INDEX, 'utf8');
let indiceNuevo = indice;
for (const c of cambios) {
  if (c.error) continue;
  const linkViejo = c.de.replace(/\.md$/, '');
  const linkNuevo = c.a.replace(/\.md$/, '');
  indiceNuevo = indiceNuevo.replace(
    new RegExp(`- \\[\\[${linkViejo}\\]\\] — .+`, 'g'),
    `- [[${linkNuevo}]] — ${c.codigo} · ${ESTADO}`,
  );
}

// --- Reporte --------------------------------------------------------------
console.log(`\n=== Anima · notas de inventario ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}\n`);
for (const c of cambios) {
  if (c.error) {
    console.log(`  ⚠️ item ${c.item}: ${c.error} ${c.archivo ?? ''}`);
    continue;
  }
  if (existsSync(c.rutaNueva) && c.rutaNueva !== c.rutaVieja) {
    console.log(`  ⚠️ item ${c.item}: destino ya existe ${c.a} — omitido`);
    c.error = 'destino existe';
    continue;
  }
  console.log(`  ${c.de}  →  ${c.a}   ("${c.viejo}" → "${c.codigo}")`);
}
const aplicables = cambios.filter((c) => !c.error);
console.log(`\nNotas a actualizar: ${aplicables.length}`);
console.log(
  `Líneas del índice modificadas: ${indiceNuevo === indice ? 0 : 'sí'}`,
);

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply.');
  process.exit(0);
}

for (const c of aplicables) {
  writeFileSync(c.rutaVieja, c.md);
  if (c.rutaNueva !== c.rutaVieja) renameSync(c.rutaVieja, c.rutaNueva);
}
writeFileSync(INDEX, indiceNuevo);
console.log(
  `\n✅ ${aplicables.length} notas actualizadas y renombradas · índice sincronizado`,
);
