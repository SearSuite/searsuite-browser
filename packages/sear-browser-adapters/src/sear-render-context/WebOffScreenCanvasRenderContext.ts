import { Injectable } from '@searsuite/sear-foundation-di';
import { WebCanvasRenderContext } from './WebCanvasRenderContext';

/** Canvas render context specialization for scroll optimization buffers. */
@Injectable()
export class WebOffScreenCanvasRenderContext extends WebCanvasRenderContext {
  /** DI token for resolving the off-screen canvas context. */
  public static readonly symbol: symbol = Symbol.for('WebOffScreenCanvasRenderContext');
}
