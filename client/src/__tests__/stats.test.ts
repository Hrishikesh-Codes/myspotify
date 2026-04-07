/**
 * Stats utility unit tests (Vitest).
 * These mirror the server-side stats.test.ts but run in the client test env.
 */

import { describe, it, expect } from "vitest";
import {
  linearRegression,
  movingAverage,
  zScore,
  kMeansClustering,
} from "@/utils/stats";

// ── linearRegression ──────────────────────────────────────────────────────────

describe("linearRegression", () => {
  it("returns R²=1 for perfectly linear data (y = 3x + 2)", () => {
    const pts = [
      { x: 0, y: 2 },
      { x: 1, y: 5 },
      { x: 2, y: 8 },
      { x: 3, y: 11 },
    ];
    const { slope, intercept, rSquared } = linearRegression(pts);
    expect(slope).toBeCloseTo(3, 5);
    expect(intercept).toBeCloseTo(2, 5);
    expect(rSquared).toBeCloseTo(1, 5);
  });

  it("returns slope=0 and R²=0 when all x values are identical", () => {
    const pts = [
      { x: 4, y: 1 },
      { x: 4, y: 3 },
      { x: 4, y: 5 },
    ];
    const { slope, rSquared } = linearRegression(pts);
    expect(slope).toBe(0);
    expect(rSquared).toBe(0);
  });

  it("handles a single point without throwing", () => {
    const { slope, intercept, rSquared } = linearRegression([{ x: 7, y: 3 }]);
    expect(slope).toBe(0);
    expect(intercept).toBe(3);
    expect(rSquared).toBe(0);
  });

  it("R² is between 0 and 1 for noisy data", () => {
    const pts = [
      { x: 1, y: 2 },
      { x: 2, y: 7 },
      { x: 3, y: 1 },
      { x: 4, y: 8 },
    ];
    const { rSquared } = linearRegression(pts);
    expect(rSquared).toBeGreaterThanOrEqual(0);
    expect(rSquared).toBeLessThanOrEqual(1);
  });
});

// ── movingAverage ─────────────────────────────────────────────────────────────

describe("movingAverage", () => {
  it("returns original data unchanged when window=1", () => {
    const data = [10, 20, 30, 40, 50];
    expect(movingAverage(data, 1)).toEqual(data);
  });

  it("returns array of same length as input", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(movingAverage(data, 3)).toHaveLength(data.length);
  });

  it("interior values are correctly averaged with window=3", () => {
    const data = [2, 4, 6, 8, 10];
    const result = movingAverage(data, 3);
    // index 1: (2+4+6)/3 = 4
    expect(result[1]).toBeCloseTo(4, 5);
    // index 2: (4+6+8)/3 = 6
    expect(result[2]).toBeCloseTo(6, 5);
    // index 3: (6+8+10)/3 = 8
    expect(result[3]).toBeCloseTo(8, 5);
  });

  it("returns [] for empty input", () => {
    expect(movingAverage([], 5)).toEqual([]);
  });
});

// ── zScore ────────────────────────────────────────────────────────────────────

describe("zScore", () => {
  it("returns 0 when value equals the mean", () => {
    expect(zScore(42, 42, 5)).toBe(0);
  });

  it("returns 2 for two standard deviations above the mean", () => {
    expect(zScore(20, 10, 5)).toBeCloseTo(2, 5);
  });

  it("returns negative z for values below the mean", () => {
    expect(zScore(5, 10, 5)).toBeCloseTo(-1, 5);
  });

  it("returns 0 when stdDev is 0 (division guard)", () => {
    expect(zScore(99, 50, 0)).toBe(0);
  });
});

// ── kMeansClustering ──────────────────────────────────────────────────────────

describe("kMeansClustering", () => {
  it("returns exactly k clusters", () => {
    const pts = Array.from({ length: 20 }, () => ({
      x: Math.random(),
      y: Math.random(),
    }));
    const result = kMeansClustering(pts, 4);
    expect(result.clusters).toHaveLength(4);
  });

  it("k=1 puts all points in one cluster", () => {
    const pts = [
      { x: 1, y: 1 },
      { x: 5, y: 5 },
      { x: 9, y: 2 },
      { x: 3, y: 7 },
    ];
    const result = kMeansClustering(pts, 1);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].indices).toHaveLength(4);
  });

  it("total assigned points equals input length", () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({
      x: i * 0.1,
      y: Math.sin(i),
    }));
    const result = kMeansClustering(pts, 3);
    const total = result.clusters.reduce((s, c) => s + c.indices.length, 0);
    expect(total).toBe(30);
  });

  it("returns no clusters for empty input", () => {
    const result = kMeansClustering([], 3);
    expect(result.clusters).toHaveLength(0);
  });

  it("caps k at number of available points", () => {
    const pts = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    const result = kMeansClustering(pts, 10);
    expect(result.clusters.length).toBeLessThanOrEqual(2);
  });

  it("each cluster index references a valid point", () => {
    const pts = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 2 }));
    const result = kMeansClustering(pts, 3);
    result.clusters.forEach((c) => {
      c.indices.forEach((idx) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(pts.length);
      });
    });
  });
});
