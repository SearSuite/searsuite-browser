import { type NormalizedTextShapeInput } from '@searsuite/sear-render-metrics';
import { WebTextShaperError } from './WebTextShaperError';
import { type RenderContext } from '@searsuite/sear-render-context';

/** Native text settings and operations required by the Web adapter. */
export interface WebTextShaperContext {
  font: string;
  direction: CanvasDirection;
  fontKerning?: CanvasFontKerning;
  save(): void;
  restore(): void;
  measureText(text: string): TextMetrics;
}

/** Adapts the shared render context to the Web shaper contract. */
export function createWebTextShaperContext(renderContext: RenderContext): WebTextShaperContext {
  let font = '10px sans-serif';
  let direction: CanvasDirection = 'ltr';
  let fontKerning: CanvasFontKerning = 'auto';
  return {
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
      renderContext.setFont(value);
    },
    get direction() {
      return direction;
    },
    set direction(value: CanvasDirection) {
      direction = value;
    },
    get fontKerning() {
      return fontKerning;
    },
    set fontKerning(value: CanvasFontKerning) {
      fontKerning = value;
    },
    save: () => renderContext.save(),
    restore: () => renderContext.restore(),
    measureText: (text: string) => {
      const measured = renderContext.measureText(text);
      return {
        width: measured.width,
        fontBoundingBoxAscent: measured.fontAscent,
        fontBoundingBoxDescent: measured.fontDescent,
        actualBoundingBoxAscent: measured.fontAscent,
        actualBoundingBoxDescent: measured.fontDescent,
      } as TextMetrics;
    },
  };
}

/** Applies the subset of shaping options exposed by Canvas2D. */
export function configureWebTextShaperContext(
  context: WebTextShaperContext,
  input: NormalizedTextShapeInput,
): void {
  assertSupportedOptions(context, input);
  context.font = input.font;
  context.direction = input.direction;

  const kerning = input.features['kern'];
  if (kerning !== undefined) context.fontKerning = kerning === false || kerning === 0 ? 'none' : 'normal';
}

function assertSupportedOptions(context: WebTextShaperContext, input: NormalizedTextShapeInput): void {
  if (input.language) throw unsupportedOption('language', input.language);
  if (input.script) throw unsupportedOption('script', input.script);

  const unsupportedFeatures = Object.keys(input.features).filter((feature) => feature !== 'kern');
  if (unsupportedFeatures.length > 0) throw unsupportedOption('features', unsupportedFeatures);

  const kerning = input.features['kern'];
  if (kerning !== undefined && kerning !== true && kerning !== false && kerning !== 0 && kerning !== 1) {
    throw unsupportedOption('features.kern', kerning);
  }
  if (kerning !== undefined && !('fontKerning' in context)) {
    throw unsupportedOption('features.kern', kerning);
  }

  const variations = Object.keys(input.variations);
  if (variations.length > 0) throw unsupportedOption('variations', variations);
}

function unsupportedOption(option: string, value: unknown): WebTextShaperError {
  return new WebTextShaperError(`WebTextShaper cannot apply the explicit ${option} shaping option.`, {
    option,
    value,
  });
}
