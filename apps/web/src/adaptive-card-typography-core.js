export function findLargestFittingSize({ min, max, fits, precision = 0.25 }) {
  const safeMin = Math.max(1, Number(min) || 1);
  const safeMax = Math.max(safeMin, Number(max) || safeMin);
  if (fits(safeMax)) return safeMax;
  if (!fits(safeMin)) return safeMin;

  let low = safeMin;
  let high = safeMax;
  while (high - low > precision) {
    const candidate = (low + high) / 2;
    if (fits(candidate)) low = candidate;
    else high = candidate;
  }
  const stepped = Math.floor(low / precision) * precision;
  const next = Math.min(safeMax, stepped + precision);
  return next > stepped && fits(next) ? next : stepped;
}
