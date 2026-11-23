import { SearError, type SearErrorDetails } from '@searsuite/sear-foundation-error';

/** Error raised when a Web text-shaping request cannot be represented by Canvas2D. */
export class WebTextShaperError extends SearError {
  public override readonly code = 'WEB_TEXT_SHAPER_ERROR';

  /** Creates a Web text-shaper error with stable diagnostics. */
  public constructor(message: string, details: SearErrorDetails = {}) {
    super(message, details);
  }
}
