import { Inject, Injectable } from '@searsuite/sear-foundation-di';
import { Platform, PlatformEventName } from '@searsuite/sear-foundation-platform';
import { RenderContext } from '@searsuite/sear-render-context';

import { PointerCapture, type PointerCaptureHandlers, type PointerCapturePoint } from '@searsuite/sear-render-input';

interface WebPointerEventSource {
  readonly clientX: number;
  readonly clientY: number;
}

interface PointerCaptureSession {
  readonly id: symbol;
  readonly disposers: readonly [() => void, () => void];
}

/** Browser pointer capture adapter that emits render-root view coordinates. */
@Injectable()
export class WebPointerCapture extends PointerCapture {
  readonly #renderContext: RenderContext;
  readonly #platform: Platform;
  readonly #eventTarget: unknown;

  /** DI token for the host-wide event source, normally `document`. */
  public static readonly eventTargetSymbol: symbol = Symbol.for('WebPointerCapture.EventTarget');

  #session: PointerCaptureSession | null = null;

  /** Creates one editor-local browser pointer capture adapter. */
  public constructor(
    @Inject(RenderContext.symbol)
    renderContext: RenderContext,
    @Inject(Platform.symbol)
    platform: Platform,
    @Inject(WebPointerCapture.eventTargetSymbol)
    eventTarget: unknown,
  ) {
    super();
    this.#renderContext = renderContext;
    this.#platform = platform;
    this.#eventTarget = eventTarget;
  }

  /** @inheritdoc */
  public override start(handlers: PointerCaptureHandlers): () => void {
    this.stop();
    const id = Symbol('PointerCaptureSession');
    const disposeMove = this.#platform.addEventListener(this.#eventTarget, PlatformEventName.MouseMove, (event) => {
      if (this.#session?.id !== id) return;
      handlers.onMove?.(this.#readPoint(event));
    });
    const disposeRelease = this.#platform.addEventListener(this.#eventTarget, PlatformEventName.MouseUp, (event) => {
      if (this.#session?.id !== id) return;
      const point = this.#readPoint(event);
      this.#stopSession(id);
      handlers.onRelease(point);
    });
    this.#session = { id, disposers: [disposeMove, disposeRelease] };
    return () => this.#stopSession(id);
  }

  /** @inheritdoc */
  public override stop(): void {
    if (this.#session) this.#stopSession(this.#session.id);
  }

  #stopSession(id: symbol): void {
    const session = this.#session;
    if (!session || session.id !== id) return;
    this.#session = null;
    for (const dispose of session.disposers) dispose();
  }

  #readPoint(event: unknown): PointerCapturePoint {
    const pointer = event as WebPointerEventSource;
    const bounds = this.#platform.readViewOffset(this.#renderContext.getRoot());
    return {
      view: {
        x: pointer.clientX - bounds.x,
        y: pointer.clientY - bounds.y,
      },
    };
  }
}
