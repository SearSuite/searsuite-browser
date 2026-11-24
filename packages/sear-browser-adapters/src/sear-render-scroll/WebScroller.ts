import { Inject, Injectable } from '@searsuite/sear-foundation-di';
import { Platform } from '@searsuite/sear-foundation-platform';
import { Scroller } from '@searsuite/sear-render-scroll';
import { ScrollManagerState, ScrollManager } from '@searsuite/sear-render-scroll';
import { RubberBandConfig, RubberBandController, RubberBandOffset, type RubberBandMotion } from '@searsuite/sear-render-scroll';
import { ScrollAxisLock, ScrollAxisLockConfig } from '@searsuite/sear-render-scroll';

/** Adapts a Web scroll surface to logical editor viewport coordinates. */
@Injectable()
export class WebScroller extends Scroller {
  #dom: HTMLElement;
  /** DI token for resolving WebScroller. */
  public static readonly symbol: symbol = Symbol.for('WebScroller');
  readonly #rubberBand: RubberBandMotion;
  readonly #wheelAxisLock = new ScrollAxisLock();
  readonly #touchAxisLock = new ScrollAxisLock();
  readonly #platform: Platform;
  #wheelEndTimer: number | null = null;
  #baseTranslate: string | null = null;
  #baseWillChange: string | null = null;
  #baseClipPath: string | null = null;
  #touchPosition: { x: number; y: number } | null = null;

  /** Creates a WebScroller instance. */
  constructor(@Inject(Scroller.ContainerSymbol) target: unknown, @Inject(Platform.symbol) platform: Platform) {
    super();
    this.#dom = target as HTMLElement;
    this.#platform = platform;
    this.#rubberBand = new RubberBandController(platform, this.#applyRubberBandOffset.bind(this));
  }

  /** The host element that owns the scroll surface. */
  public get root(): HTMLElement {
    return this.#dom;
  }

  /**
   * Enables or tunes the Safari-style overscroll effect.
   * Logical editor coordinates remain clamped; only the visible surface moves.
   */
  public configureRubberBand(config: Partial<RubberBandConfig>): void {
    this.#rubberBand.configure(config);
  }

  /** Enables or tunes Safari-style dominant-axis locking for wheel and touch gestures. */
  public configureAxisLock(config: Partial<ScrollAxisLockConfig>): void {
    this.#clearWheelGestureEnd();
    this.#wheelAxisLock.configure(config);
    this.#touchAxisLock.configure(config);
  }

  /** Returns the publisher. */
  public getPublisher() {
    const scroller = this;
    return function registerDomScrollerPublisher(
      scrollStateInstance: ScrollManager,
      updateState: (newState: ScrollManagerState) => void,
    ) {
      function handleDomScrollerWheel(event: WheelEvent): void {
        event.preventDefault?.();

        const delta = scroller.#wheelAxisLock.consume(-event.deltaX, -event.deltaY);
        if (delta.x !== 0 || delta.y !== 0) {
          scroller.#updateFromInput(scrollStateInstance, updateState, delta.x, delta.y, 'wheel');
          scroller.#rubberBand.release(0);
        }
        scroller.#queueWheelGestureEnd();
      }
      function handleDomScrollerTouchStart(event: TouchEvent): void {
        const touch = event.touches[0];
        if (!touch) return;
        scroller.#clearWheelGestureEnd();
        scroller.#wheelAxisLock.reset();
        scroller.#rubberBand.release(0);
        scroller.#touchAxisLock.reset();
        scroller.#touchPosition = { x: touch.clientX, y: touch.clientY };
      }
      function handleDomScrollerTouchMove(event: TouchEvent): void {
        const touch = event.touches[0];
        if (!touch || !scroller.#touchPosition) return;
        event.preventDefault();
        const delta = scroller.#touchAxisLock.consume(
          touch.clientX - scroller.#touchPosition.x,
          touch.clientY - scroller.#touchPosition.y,
        );
        scroller.#touchPosition = { x: touch.clientX, y: touch.clientY };
        if (delta.x !== 0 || delta.y !== 0) {
          scroller.#updateFromInput(scrollStateInstance, updateState, delta.x, delta.y, 'touch');
        }
      }
      function handleDomScrollerTouchEnd(): void {
        scroller.#touchPosition = null;
        scroller.#touchAxisLock.reset();
        scroller.#rubberBand.release(0, true);
      }
      scroller.#dom.addEventListener('wheel', handleDomScrollerWheel, { passive: false });
      scroller.#dom.addEventListener('touchstart', handleDomScrollerTouchStart, {
        passive: true,
      });
      scroller.#dom.addEventListener('touchmove', handleDomScrollerTouchMove, {
        passive: false,
      });
      scroller.#dom.addEventListener('touchend', handleDomScrollerTouchEnd);
      scroller.#dom.addEventListener('touchcancel', handleDomScrollerTouchEnd);
      return function removeDomScrollerListeners(): void {
        scroller.#dom.removeEventListener('wheel', handleDomScrollerWheel);
        scroller.#dom.removeEventListener('touchstart', handleDomScrollerTouchStart);
        scroller.#dom.removeEventListener('touchmove', handleDomScrollerTouchMove);
        scroller.#dom.removeEventListener('touchend', handleDomScrollerTouchEnd);
        scroller.#dom.removeEventListener('touchcancel', handleDomScrollerTouchEnd);
        scroller.#clearWheelGestureEnd();
        scroller.#wheelAxisLock.reset();
        scroller.#touchAxisLock.reset();
        scroller.#rubberBand.reset();
      };
    };
  }

  #updateFromInput(
    manager: ScrollManager,
    updateState: (newState: ScrollManagerState) => void,
    deltaX: number,
    deltaY: number,
    source: 'wheel' | 'touch',
  ): void {
    const state = manager.getState();
    const [maxX, maxY] = manager.getContentBoundary();
    const [width, height] = manager.getShape();
    const next = this.#rubberBand.consume({
      position: state,
      boundary: { x: maxX, y: maxY },
      viewport: { x: width, y: height },
      displacement: { x: deltaX, y: deltaY },
      source,
      continueReturnOnOutwardInput: source === 'wheel',
    });

    updateState({
      ...state,
      deltaX: state.x - next.x,
      deltaY: state.y - next.y,
    });
  }

  #applyRubberBandOffset(offset: RubberBandOffset): void {
    if (!this.#dom.style) return;
    if (offset.x === 0 && offset.y === 0) {
      if (this.#baseTranslate !== null) this.#dom.style.translate = this.#baseTranslate;
      if (this.#baseWillChange !== null) this.#dom.style.willChange = this.#baseWillChange;
      if (this.#baseClipPath !== null) this.#dom.style.clipPath = this.#baseClipPath;
      this.#baseTranslate = null;
      this.#baseWillChange = null;
      this.#baseClipPath = null;
      return;
    }
    if (this.#baseTranslate === null) {
      this.#baseTranslate = this.#dom.style.translate;
      this.#baseWillChange = this.#dom.style.willChange;
      this.#baseClipPath = this.#dom.style.clipPath;
    }
    this.#dom.style.willChange = 'translate';
    this.#dom.style.translate = `${offset.x}px ${offset.y}px`;
    this.#dom.style.clipPath =
      `inset(${Math.max(0, -offset.y)}px ${Math.max(0, offset.x)}px ` +
      `${Math.max(0, offset.y)}px ${Math.max(0, -offset.x)}px)`;
  }

  #queueWheelGestureEnd(): void {
    if (this.#wheelEndTimer !== null) this.#platform.clearTimeout(this.#wheelEndTimer);
    this.#wheelEndTimer = this.#platform.setTimeout(
      this.#endWheelGesture.bind(this),
      this.#wheelAxisLock.getWheelEndDelay(),
    );
  }

  #endWheelGesture(): void {
    this.#clearWheelGestureEnd();
    this.#wheelAxisLock.reset();
    this.#rubberBand.release(0);
  }

  #clearWheelGestureEnd(): void {
    if (this.#wheelEndTimer !== null) this.#platform.clearTimeout(this.#wheelEndTimer);
    this.#wheelEndTimer = null;
  }
}
