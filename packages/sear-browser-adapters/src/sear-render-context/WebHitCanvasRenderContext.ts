import { Injectable } from '@searsuite/sear-foundation-di';
import { WebCanvasRenderContext } from './WebCanvasRenderContext';

/** Canvas render context specialization for the hit-test layer. */
@Injectable()
export class WebHitCanvasRenderContext extends WebCanvasRenderContext {
  /** DI token for resolving the hit canvas context. */
  public static readonly symbol: symbol = Symbol.for('WebHitCanvasRenderContext');
}
