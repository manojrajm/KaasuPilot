export interface Point {
  x: number;
  y: number;
}

/**
 * Catmull-Rom cubic spline algorithm for smooth, organic curves without
 * synthetic overshoot or artificial oscillation.
 *
 * @param points Array of cartesian (x, y) coordinates
 * @param tension Curvature tension (default 0.22 for human-designer fluidity)
 */
export function pointsToCatmullRomSpline(points: Point[], tension = 0.22): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom control points calculation
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Generates closed SVG path for soft under-curve gradient luminosity fills.
 */
export function pointsToAreaSplinePath(
  points: Point[],
  baselineY: number,
  tension = 0.22
): string {
  if (points.length < 2) return '';

  const spline = pointsToCatmullRomSpline(points, tension);
  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;

  return `${spline} L ${lastX.toFixed(1)},${baselineY.toFixed(1)} L ${firstX.toFixed(1)},${baselineY.toFixed(1)} Z`;
}

export interface SplineBounds {
  min: number;
  max: number;
}

/**
 * Maps raw financial figures to pixel-space points within viewport bounds.
 */
export function computeTrajectoryPoints(
  values: number[],
  chartWidth: number,
  chartHeight: number,
  bounds?: SplineBounds,
  inset = { top: 24, bottom: 24, horizontal: 20 }
): Point[] {
  if (values.length === 0) return [];

  const rawMin = bounds?.min ?? Math.min(...values, 0);
  const rawMax = bounds?.max ?? Math.max(...values, 100);
  const range = rawMax - rawMin || 1;

  const drawableWidth = chartWidth - inset.horizontal * 2;
  const drawableHeight = chartHeight - inset.top - inset.bottom;
  const stepX = values.length > 1 ? drawableWidth / (values.length - 1) : 0;

  return values.map((val, idx) => {
    const x = inset.horizontal + idx * stepX;
    // Invert Y so highest figures are positioned near top of canvas
    const normalizedY = (val - rawMin) / range;
    const y = inset.top + drawableHeight * (1 - normalizedY);
    return { x, y };
  });
}
