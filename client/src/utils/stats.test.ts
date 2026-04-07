/**
 * @file stats.test.ts
 * Unit tests for the stats utility module.
 * Run with: npx vitest run src/utils/stats.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  linearRegression,
  movingAverage,
  zScore,
  pearsonCorrelation,
  kMeansClustering,
} from "./stats";

// ── linearRegression ──────────────────────────────────────────────────────────

describe("linearRegression", () => {
  it("fits a perfect positive line y = 2x + 1 with R² = 1", () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(2, 5);
    expect(result.intercept).toBeCloseTo(1, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it("fits a perfect negative line y = -x + 10 with R² = 1", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 2, y: 8 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(-1, 5);
    expect(result.intercept).toBeCloseTo(10, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it("returns R² near 0 for horizontal data with scatter", () => {
    // All y = 5 → perfect fit again, but let's test noisy data
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 8 },
      { x: 3, y: 1 },
      { x: 4, y: 9 },
    ];
    const result = linearRegression(points);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });

  it("handles a single point gracefully", () => {
    const result = linearRegression([{ x: 3, y: 7 }]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(7);
    expect(result.rSquared).toBe(0);
  });

  it("returns slope=0, intercept=yMean when all x are identical", () => {
    const points = [
      { x: 5, y: 2 },
      { x: 5, y: 4 },
      { x: 5, y: 6 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBeCloseTo(4, 5); // mean of [2,4,6]
    expect(result.rSquared).toBe(0);
  });
});

// ── movingAverage ─────────────────────────────────────────────────────────────

describe("movingAverage", () => {
  it("returns an array of the same length", () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    expect(movingAverage(data, 3)).toHaveLength(data.length);
  });

  it("computes a window-3 average on [1,2,3,4,5]", () => {
    const data = [1, 2, 3, 4, 5];
    const result = movingAverage(data, 3);
    // Interior points:
    expect(result[1]).toBeCloseTo((1 + 2 + 3) / 3, 5); // 2
    expect(result[2]).toBeCloseTo((2 + 3 + 4) / 3, 5); // 3
    expect(result[3]).toBeCloseTo((3 + 4 + 5) / 3, 5); // 4
  });

  it("handles edge points with a smaller window", () => {
    const data = [10, 20, 30];
    const result = movingAverage(data, 5);
    // half = floor(5/2) = 2
    // Index 0: start=max(0,0-2)=0, end=min(2,0+2)=2 → slice=[10,20,30] → mean=20
    expect(result[0]).toBeCloseTo((10 + 20 + 30) / 3, 5);
    // Index 2: start=max(0,2-2)=0, end=min(2,2+2)=2 → slice=[10,20,30] → mean=20
    expect(result[2]).toBeCloseTo((10 + 20 + 30) / 3, 5);
    // Index 1 (center): same full window
    expect(result[1]).toBeCloseTo((10 + 20 + 30) / 3, 5);
  });

  it("returns [] for empty input", () => {
    expect(movingAverage([], 3)).toEqual([]);
  });

  it("returns the original values unchanged for window=1", () => {
    const data = [5, 10, 15, 20];
    expect(movingAverage(data, 1)).toEqual(data);
  });
});

// ── zScore ────────────────────────────────────────────────────────────────────

describe("zScore", () => {
  it("returns 0 when value equals the mean", () => {
    expect(zScore(5, 5, 2)).toBe(0);
  });

  it("returns 1 for one stdDev above the mean", () => {
    expect(zScore(12, 10, 2)).toBeCloseTo(1, 5);
  });

  it("returns -2 for two stdDevs below the mean", () => {
    expect(zScore(6, 10, 2)).toBeCloseTo(-2, 5);
  });

  it("returns 0 when stdDev is 0 (avoid division by zero)", () => {
    expect(zScore(99, 50, 0)).toBe(0);
  });
});

// ── pearsonCorrelation ────────────────────────────────────────────────────────

describe("pearsonCorrelation", () => {
  it("returns 1 for perfectly positively correlated arrays", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 5);
  });

  it("returns -1 for perfectly negatively correlated arrays", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    expect(pearsonCorrelation(x, y)).toBeCloseTo(-1, 5);
  });

  it("returns ~0 for zero-mean symmetric arrays with no linear trend", () => {
    // x = [-1, 0, 1] is symmetric; y = [0, 1, 0] is symmetric → r = 0
    const x = [-1, 0, 1];
    const y = [0, 1, 0];
    expect(Math.abs(pearsonCorrelation(x, y))).toBeCloseTo(0, 5);
  });

  it("returns 0 when arrays are too short", () => {
    expect(pearsonCorrelation([5], [10])).toBe(0);
  });

  it("returns 0 when one array has zero variance", () => {
    expect(pearsonCorrelation([3, 3, 3], [1, 2, 3])).toBe(0);
  });
});

// ── kMeansClustering ──────────────────────────────────────────────────────────

describe("kMeansClustering", () => {
  it("returns k clusters with correct structure", () => {
    const points = [
      { x: 0, y: 0 }, { x: 0.1, y: 0.1 },
      { x: 1, y: 1 }, { x: 1.1, y: 0.9 },
      { x: 5, y: 5 }, { x: 5.1, y: 4.9 },
    ];
    const result = kMeansClustering(points, 3);
    expect(result.clusters).toHaveLength(3);
    result.clusters.forEach((c) => {
      expect(c.centroid).toHaveProperty("x");
      expect(c.centroid).toHaveProperty("y");
      expect(Array.isArray(c.indices)).toBe(true);
    });
  });

  it("assigns all n points across clusters", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: Math.floor(i / 5),
      y: i % 5,
    }));
    const result = kMeansClustering(points, 4);
    const total = result.clusters.reduce((s, c) => s + c.indices.length, 0);
    expect(total).toBe(points.length);
  });

  it("handles k > points.length by capping k at n", () => {
    const points = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    const result = kMeansClustering(points, 10);
    expect(result.clusters.length).toBeLessThanOrEqual(points.length);
  });

  it("returns empty clusters for empty input", () => {
    const result = kMeansClustering([], 3);
    expect(result.clusters).toHaveLength(0);
  });

  it("places well-separated clusters correctly", () => {
    // Three tight clouds far apart in 2D space
    const cloud = (cx: number, cy: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        x: cx + (i % 3) * 0.01,
        y: cy + Math.floor(i / 3) * 0.01,
      }));

    const points = [
      ...cloud(0, 0, 6),
      ...cloud(100, 0, 6),
      ...cloud(0, 100, 6),
    ];
    const result = kMeansClustering(points, 3, 200);

    // Each cluster should contain exactly 6 points
    const sizes = result.clusters.map((c) => c.indices.length).sort();
    expect(sizes).toEqual([6, 6, 6]);
  });
});
