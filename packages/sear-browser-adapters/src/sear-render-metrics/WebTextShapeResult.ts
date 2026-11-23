import { createMeasuredTextShapeResult } from '@searsuite/sear-render-metrics';
import { type TextShapeResult } from '@searsuite/sear-render-metrics';
import { type WebTextShaperContext } from './WebTextShaperContext';

/** Converts opaque Canvas2D shaping measurements to the shared result contract. */
export function createWebTextShapeResult(context: WebTextShaperContext, text: string): TextShapeResult {
  const measuredRun = context.measureText(text);
  const fontAscent = finiteMagnitude(measuredRun.fontBoundingBoxAscent);
  const fontDescent = finiteMagnitude(measuredRun.fontBoundingBoxDescent);
  return createMeasuredTextShapeResult(text, {
    width: measuredRun.width,
    height: resolveTextHeight(measuredRun),
    ...(fontAscent !== undefined ? { fontAscent } : {}),
    ...(fontDescent !== undefined ? { fontDescent } : {}),
  }, (end) => context.measureText(text.slice(0, end)).width);
}

function resolveTextHeight(metrics: TextMetrics): number {
  const fontAscent = finiteMagnitude(metrics.fontBoundingBoxAscent);
  const fontDescent = finiteMagnitude(metrics.fontBoundingBoxDescent);
  if (fontAscent !== undefined && fontDescent !== undefined) return fontAscent + fontDescent;

  return (finiteMagnitude(metrics.actualBoundingBoxAscent) ?? 0) +
    (finiteMagnitude(metrics.actualBoundingBoxDescent) ?? 0);
}

function finiteMagnitude(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.abs(value) : undefined;
}
