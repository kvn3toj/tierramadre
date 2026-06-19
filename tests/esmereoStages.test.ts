import { afterEach, describe, expect, it, vi } from "vitest";
import { computeStreak, stageForProgress } from "../src/data/esmereo-mock";
import type { Aporte } from "../src/types/esmereogenesis";

/**
 * Coverage for the two pure engines behind the Bóveda gem:
 *  - stageForProgress: 0..1 progress (+ optional plan state) → growth stage.
 *    Drives every gem visual; the band boundaries are exactly the off-by-one
 *    cases most likely to regress silently.
 *  - computeStreak: the weekly streak + 30-day "Lluvia generosa" grace math.
 */

describe("stageForProgress", () => {
  it("maps each band boundary", () => {
    expect(stageForProgress(0)).toBe("semilla");
    expect(stageForProgress(0.0001)).toBe("brote");
    expect(stageForProgress(0.24)).toBe("brote");
    expect(stageForProgress(0.25)).toBe("creciendo");
    expect(stageForProgress(0.69)).toBe("creciendo");
    expect(stageForProgress(0.7)).toBe("radiante");
    expect(stageForProgress(0.99)).toBe("radiante");
    expect(stageForProgress(1)).toBe("eclosion");
  });

  it("forces eclosion for a completed/claimed plan regardless of progress", () => {
    expect(stageForProgress(0.5, "completed")).toBe("eclosion");
    expect(stageForProgress(0, "claimed")).toBe("eclosion");
  });

  it("does NOT force eclosion for in-progress states", () => {
    expect(stageForProgress(0.5, "empty")).toBe("creciendo");
    expect(stageForProgress(0.5, "growing")).toBe("creciendo");
  });

  it("clamps out-of-range progress", () => {
    expect(stageForProgress(-0.5)).toBe("semilla");
    expect(stageForProgress(1.5)).toBe("eclosion");
  });

  it("treats non-finite progress as dormant, never claim-ready", () => {
    expect(stageForProgress(Number.NaN)).toBe("semilla");
    expect(stageForProgress(Number.POSITIVE_INFINITY)).toBe("semilla");
    expect(stageForProgress(Number.NEGATIVE_INFINITY)).toBe("semilla");
  });
});

describe("computeStreak", () => {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  // Pinned mid-week instant so the "is the streak still active?" check is
  // deterministic and free of week-boundary / DST flakiness.
  const NOW = new Date("2026-06-03T12:00:00Z").getTime(); // Wednesday

  const aporte = (ms: number, i = 0): Aporte => ({
    id: `a${i}`,
    planId: "p",
    amountCOP: 1000,
    createdAt: new Date(ms).toISOString(),
    type: "suggested",
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pinNow = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  };

  it("returns zeros for no aportes and carries prevState.lastGraceAt forward", () => {
    pinNow();
    const { state, graceApplied } = computeStreak([], {
      lastGraceAt: "2026-05-01T00:00:00.000Z",
    });
    expect(state.currentWeeks).toBe(0);
    expect(state.longestWeeks).toBe(0);
    expect(state.lastAporteWeekStart).toBe("");
    expect(state.lastGraceAt).toBe("2026-05-01T00:00:00.000Z");
    expect(graceApplied).toBe(false);
  });

  it("counts consecutive weekly aportes", () => {
    pinNow();
    const aportes = [
      aporte(NOW - 2 * WEEK, 0),
      aporte(NOW - WEEK, 1),
      aporte(NOW, 2),
    ];
    const { state, graceApplied } = computeStreak(aportes);
    expect(state.currentWeeks).toBe(3);
    expect(state.longestWeeks).toBe(3);
    expect(graceApplied).toBe(false);
  });

  it("consumes a grace to bridge a single missed week (Lluvia generosa)", () => {
    pinNow();
    // gap of 1 week, then a gap of 2 weeks as the most-recent transition
    const aportes = [
      aporte(NOW - 3 * WEEK, 0),
      aporte(NOW - 2 * WEEK, 1),
      aporte(NOW, 2),
    ];
    const { state, graceApplied } = computeStreak(aportes);
    expect(graceApplied).toBe(true);
    expect(state.currentWeeks).toBe(3);
    expect(state.lastGraceAt).toBeTruthy();
  });

  it("does NOT grant a second grace within the 30-day cooldown", () => {
    pinNow();
    // Two 2-week gaps back to back. The first is bridged by grace; the second
    // falls inside the 30-day cooldown, so it must reset the streak.
    const aportes = [
      aporte(NOW - 4 * WEEK, 0),
      aporte(NOW - 2 * WEEK, 1),
      aporte(NOW, 2),
    ];
    const { state } = computeStreak(aportes, {
      lastGraceAt: new Date(NOW - 2 * WEEK).toISOString(),
    });
    expect(state.currentWeeks).toBe(1);
  });

  it("resets the current streak on a gap larger than 2 weeks but keeps the longest", () => {
    pinNow();
    const aportes = [
      aporte(NOW - 4 * WEEK, 0),
      aporte(NOW - 3 * WEEK, 1),
      aporte(NOW, 2),
    ];
    const { state } = computeStreak(aportes);
    expect(state.currentWeeks).toBe(1);
    expect(state.longestWeeks).toBe(2);
  });

  it("drops currentWeeks to 0 when the last aporte is stale (>1 week ago) but preserves longest", () => {
    pinNow();
    const aportes = [
      aporte(NOW - 4 * WEEK, 0),
      aporte(NOW - 3 * WEEK, 1),
      aporte(NOW - 2 * WEEK, 2),
    ];
    const { state } = computeStreak(aportes);
    expect(state.currentWeeks).toBe(0);
    expect(state.longestWeeks).toBe(3);
  });
});
