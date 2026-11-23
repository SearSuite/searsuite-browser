import { TextShaper } from '@searsuite/sear-render-metrics';
import { type NormalizedTextShapeInput } from '@searsuite/sear-render-metrics';
import { type TextShapeResult } from '@searsuite/sear-render-metrics';
import { createWebTextShapeResult } from './WebTextShapeResult';
import { configureWebTextShaperContext, type WebTextShaperContext } from './WebTextShaperContext';
import { WebTextShaperError } from './WebTextShaperError';

/**
 * Browser-native TextShaper backed by Canvas2D.
 *
 * Canvas2D preserves the browser's native shaping for complete text runs but
 * does not expose glyph ids or glyph ranges. Results therefore contain
 * grapheme clusters and caret measurements while leaving `glyphs` empty.
 * Call `clearCache()` after an asynchronously loaded font becomes available.
 */
export class WebTextShaper extends TextShaper {
  /** Creates a Web text shaper over a host-owned Canvas2D context. */
  public constructor(private readonly context: WebTextShaperContext) {
    super();
    if (
      !context ||
      typeof context.measureText !== 'function' ||
      typeof context.save !== 'function' ||
      typeof context.restore !== 'function'
    ) {
      throw new WebTextShaperError('WebTextShaper requires a CanvasRenderingContext2D.', {
        requirement: 'CanvasRenderingContext2D',
      });
    }
  }

  /** Shapes one text run without retaining mutations on the host context. */
  protected override shapeText(input: NormalizedTextShapeInput): TextShapeResult {
    this.context.save();
    try {
      configureWebTextShaperContext(this.context, input);
      return createWebTextShapeResult(this.context, input.text);
    } finally {
      this.context.restore();
    }
  }
}
