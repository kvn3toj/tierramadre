import type { EsmereoStage } from "../../types/esmereogenesis";

/**
 * Stage metadata for the Bóveda growth stages — badge label + a one-line "estado"
 * note (used on the desktop Hub rail). Copy is ES for now; promoted to the i18n
 * bundle in Phase 9. Stage derivation itself lives in `stageForProgress`
 * (data/esmereo-mock.ts) so it stays pure/testable.
 */
export const STAGE_META: Record<EsmereoStage, { label: string; note: string }> =
  {
    semilla: {
      label: "Semilla",
      note: "Tu esmeralda aún duerme. Riégala para despertarla.",
    },
    brote: {
      label: "Brote",
      note: "Ha despertado — los primeros brotes asoman.",
    },
    creciendo: {
      label: "Creciendo",
      note: "Crece con fuerza. Su luz se vuelve cálida.",
    },
    radiante: {
      label: "Radiante",
      note: "Casi viva. Sus facetas irradian luz.",
    },
    eclosion: {
      label: "✦ Eclosión",
      note: "Ha cobrado vida. Es tuya.",
    },
  };
