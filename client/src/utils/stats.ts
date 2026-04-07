/**
 * @file stats.ts
 * Statistical utility functions for the MySpotify analytics pages.
 * Implemented from scratch — no external statistics libraries.
 */

// ── Shared types ───────────────────────────────────────────────────────────────

/** A 2-dimensional point used by regression and clustering functions. */
export interface Point2D {
  x: number;
  y: number;
}

/** Result returned by {@link linearRegression}. */
export interface LinearRegressionResult {
  /** Rise-over-run slope of the best-fit line. */
  slope: number;
  /** y-intercept (value of ŷ when x = 0). */
  intercept: number;
  /**
   * Coefficient of determination R² ∈ [0, 1].
   * 1 = perfect fit, 0 = no explanatory power beyond the mean.
   */
  rSquared: number;
}

/** A single cluster produced by {@link kMeansClustering}. */
export interface KMeansCluster {
  /** Arithmetic mean of all assigned points. */
  centroid: Point2D;
  /** Indices into the original `points` array that belong to this cluster. */
  indices: number[];
}

/** Result returned by {@link kMeansClustering}. */
export interface KMeansResult {
  clusters: KMeansCluster[];
  /** Number of iterations Lloyd's algorithm ran before converging. */
  iterations: number;
}

// ── linearRegression ──────────────────────────────────────────────────────────

/**
 * Ordinary least-squares (OLS) linear regression.
 *
 * Finds the line **y = slope·x + intercept** that minimises the sum of
 * squared residuals across `points`, then computes R² to indicate fit quality.
 *
 * **Math:**
 * ```
 * slope     = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²
 * intercept = ȳ − slope·x̄
 * R²        = 1 − SS_res / SS_tot
 * ```
 *
 * @param points Array of {x, y} pairs — needs at least 2 points.
 * @returns Slope, intercept and R² of the best-fit line.
 */
export function linearRegression(points: Point2D[]): LinearRegressionResult {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };
  }

  const xMean = points.reduce((s, p) => s + p.x, 0) / n;
  const yMean = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXY = 0; // Σ(xᵢ − x̄)(yᵢ − ȳ)
  let ssXX = 0; // Σ(xᵢ − x̄)²
  let ssTot = 0; // Σ(yᵢ − ȳ)²

  for (const { x, y } of points) {
    ssXY += (x - xMean) * (y - yMean);
    ssXX += (x - xMean) ** 2;
    ssTot += (y - yMean) ** 2;
  }

  if (ssXX === 0) return { slope: 0, intercept: yMean, rSquared: 0 };

  const slope = ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  // SS_res = Σ(yᵢ − ŷᵢ)²
  const ssRes = points.reduce((s, { x, y }) => {
    return s + (y - (slope * x + intercept)) ** 2;
  }, 0);

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

// ── movingAverage ─────────────────────────────────────────────────────────────

/**
 * Simple moving average — smooths a time series by replacing each value
 * with the arithmetic mean of a symmetric sliding window.
 *
 * Edge points use a narrower window (all available neighbours) so the output
 * array is always the same length as the input.
 *
 * @param data       Numeric time series to smooth.
 * @param windowSize Total width of the sliding window (e.g. 5 = ±2 neighbours).
 * @returns Smoothed array of the same length as `data`.
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  if (data.length === 0) return [];
  const half = Math.floor(windowSize / 2);

  return data.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length - 1, i + half);
    const slice = data.slice(start, end + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

// ── zScore ────────────────────────────────────────────────────────────────────

/**
 * Standard score (z-score).
 *
 * Measures how many standard deviations `value` sits above or below `mean`.
 * A |z| > 2 is conventionally treated as an anomaly (~95th percentile).
 *
 * **Math:** z = (value − mean) / stdDev
 *
 * @param value  The observation to evaluate.
 * @param mean   Population / sample mean.
 * @param stdDev Standard deviation. Returns 0 when stdDev = 0.
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// ── pearsonCorrelation ────────────────────────────────────────────────────────

/**
 * Pearson product-moment correlation coefficient.
 *
 * Measures the linear association between two equal-length numeric arrays.
 * Result is in [−1, 1]:
 *  - **+1** perfect positive correlation
 *  - **0**  no linear relationship
 *  - **−1** perfect negative correlation
 *
 * **Math:**
 * ```
 * r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √[Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)²]
 * ```
 *
 * @param x Array of x observations.
 * @param y Array of y observations (must be the same length as `x`).
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let dX = 0;
  let dY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - xMean;
    const dy = y[i] - yMean;
    numerator += dx * dy;
    dX += dx * dx;
    dY += dy * dy;
  }

  const denominator = Math.sqrt(dX * dY);
  return denominator === 0 ? 0 : numerator / denominator;
}

// ── kMeansClustering ──────────────────────────────────────────────────────────

/**
 * K-means clustering — Lloyd's algorithm.
 *
 * Partitions `points` into exactly `k` clusters by iterating:
 *  1. **Assign** each point to its nearest centroid (Euclidean distance).
 *  2. **Update** each centroid to the mean of its assigned points.
 *
 * Initialisation: k centroids are drawn uniformly at random from the input
 * (simple random init, not k-means++).  The algorithm terminates when
 * assignments stop changing or `maxIterations` is reached.
 *
 * @param points        2-D points to cluster. k must be ≤ points.length.
 * @param k             Desired number of clusters.
 * @param maxIterations Safety limit to prevent infinite loops (default 100).
 */
export function kMeansClustering(
  points: Point2D[],
  k: number,
  maxIterations = 100
): KMeansResult {
  const n = points.length;
  k = Math.min(k, n);
  if (n === 0 || k === 0) {
    return { clusters: [], iterations: 0 };
  }

  // ── Random initialisation (sample k distinct indices) ──────────────────
  const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  let centroids: Point2D[] = shuffled.slice(0, k).map((i) => ({ ...points[i] }));

  let assignments = new Array<number>(n).fill(0);
  let iterations = 0;

  // ── Lloyd's iterations ─────────────────────────────────────────────────
  for (; iterations < maxIterations; iterations++) {
    const prev = [...assignments];

    // Step 1 — assign to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let nearest = 0;
      for (let c = 0; c < k; c++) {
        const dist =
          (points[i].x - centroids[c].x) ** 2 +
          (points[i].y - centroids[c].y) ** 2;
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      assignments[i] = nearest;
    }

    // Converged when no point changed cluster
    if (assignments.every((a, i) => a === prev[i])) break;

    // Step 2 — update centroids
    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      sums[c].x += points[i].x;
      sums[c].y += points[i].y;
      sums[c].count++;
    }
    centroids = sums.map((s, c) =>
      s.count === 0 ? centroids[c] : { x: s.x / s.count, y: s.y / s.count }
    );
  }

  // ── Build result ───────────────────────────────────────────────────────
  const clusterMap: number[][] = Array.from({ length: k }, () => []);
  assignments.forEach((c, i) => clusterMap[c].push(i));

  return {
    clusters: centroids.map((centroid, c) => ({
      centroid,
      indices: clusterMap[c],
    })),
    iterations,
  };
}
