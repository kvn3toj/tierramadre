/**
 * Mide las 3 variantes de cada slot y elige la mejor escala.
 *
 * Regla: la más pequeña. En todo lo observado el modelo se pasa de grande y
 * nunca se queda corto, así que entre tres tiradas del mismo prompt la menor es
 * la más cercana a lo real. Con un piso de seguridad: si el verde casi no
 * aparece la piedra quedó tapada o fuera de cuadro, y esa variante se descarta
 * en vez de ganar por defecto.
 */
import fs from "fs";
import { medirEscala } from "/Users/kevinp/Movies/coomunity-universe/TierraMadre/scripts/visualizer-medir-escala.mjs";

const DIR =
  "/Users/kevinp/Movies/coomunity-universe/TierraMadre/docs/Visualizer/";
const PISO = 0.03; // por debajo de 3% del ancho no es una gema, es un fallo

const slots = new Map();
for (const line of fs
  .readFileSync(process.env.CLAUDE_JOB_DIR + "/tmp/cands.txt", "utf8")
  .trim()
  .split("\n")) {
  const [slot, variante, nodeId, url] = line.split("|");
  if (!slots.has(slot)) slots.set(slot, []);
  slots.get(slot).push({ variante, nodeId, url });
}

const elecciones = [];
for (const [slot, cands] of [...slots].sort()) {
  for (const c of cands) {
    const m = await medirEscala(DIR + c.url.replace(/^\.\//, ""));
    c.w = m.found ? m.widthFrac : 0;
  }
  const validos = cands.filter((c) => c.w >= PISO);
  const descartados = cands.filter((c) => c.w < PISO);
  const orig = cands.find((c) => c.variante === "orig");

  // Si NINGUNA pasa el piso, la medición no sirve para este slot — típicamente
  // una piedra muy pálida que el umbral de verde no llega a ver. Elegir "la más
  // pequeña" ahí premia justo a la más rota. Se deja el original y se marca
  // para revisar a ojo.
  const dudoso = validos.length === 0;
  const ganador = dudoso ? orig : validos.reduce((a, b) => (b.w < a.w ? b : a));

  elecciones.push({ slot, ganador, orig, cands, dudoso });
  const detalle = cands
    .map(
      (c) =>
        `${c.variante}=${(c.w * 100).toFixed(1)}%${c === ganador ? "*" : ""}${c.w < PISO ? "!" : ""}`,
    )
    .join("  ");
  const mejora = orig.w > 0 ? ((1 - ganador.w / orig.w) * 100).toFixed(0) : "0";
  console.log(
    `${slot.padEnd(14)} ${detalle.padEnd(34)} → ${ganador.variante.padEnd(4)}` +
      (ganador === orig
        ? " (se queda el original)"
        : ` (−${mejora}% vs original)`) +
      (descartados.length ? `  [descartadas: ${descartados.length}]` : "") +
      (dudoso ? "  ⚠ MEDICIÓN NO FIABLE — revisar a ojo" : ""),
  );
}

const dudosos = elecciones.filter((e) => e.dudoso);
const cambian = elecciones.filter((e) => e.ganador !== e.orig);
console.log(`\n${cambian.length}/${elecciones.length} slots cambian de imagen.`);

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(
  `ancho medio  original: ${(media(elecciones.map((e) => e.orig.w)) * 100).toFixed(1)}%` +
    `  →  elegido: ${(media(elecciones.map((e) => e.ganador.w)) * 100).toFixed(1)}%`,
);

fs.writeFileSync(
  process.env.CLAUDE_JOB_DIR + "/tmp/ganadores.json",
  JSON.stringify(
    elecciones.map((e) => ({
      slot: e.slot,
      nodo: "R" + e.slot.replace("-", ""),
      url: e.ganador.url,
      variante: e.ganador.variante,
      w: e.ganador.w,
    })),
    null,
    2,
  ),
);
if (dudosos.length)
  console.log(
    `\n⚠ ${dudosos.length} slot(s) con medición no fiable (se dejó el original): ` +
      dudosos.map((d) => d.slot).join(", "),
  );
console.log("→ ganadores.json");
