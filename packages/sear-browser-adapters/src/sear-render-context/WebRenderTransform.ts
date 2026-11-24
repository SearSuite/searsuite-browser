export type Matrix = readonly [number, number, number, number, number, number];

const LARGE_TRANSLATION_THRESHOLD = 1_000_000;

/** Folds large translations into local drawing coordinates to preserve raster precision. */
export function getLargeTranslationNormalization(
  transform: Matrix,
): { offsetX: number; offsetY: number; transform: Matrix } | null {
  const [a, b, c, d, e, f] = transform;
  if (Math.abs(e) < LARGE_TRANSLATION_THRESHOLD && Math.abs(f) < LARGE_TRANSLATION_THRESHOLD) return null;

  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || determinant === 0) return null;

  const offsetX = (d * e - c * f) / determinant;
  const offsetY = (-b * e + a * f) / determinant;
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;

  return { offsetX, offsetY, transform: [a, b, c, d, 0, 0] };
}
