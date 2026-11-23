import { type PlatformEventListenerOptions } from '@searsuite/sear-foundation-platform';
import { SearError } from '@searsuite/sear-foundation-error';
import { Injectable } from '@searsuite/sear-foundation-di';
import { Platform, type PlatformFrameRequestCallback, type PlatformViewOffset } from '@searsuite/sear-foundation-platform';
/**
 * Browser platform implementation that delegates to window / performance /
 * queueMicrotask global APIs.
 *
 * Instantiate only in browser environments. Other platforms such as Node, mini
 * apps, and React Native should provide their own Platform implementations.
 */
@Injectable()
export class BrowserPlatform extends Platform {
  /** DI token for resolving BrowserPlatform. */
  public static readonly symbol: symbol = Symbol.for('BrowserPlatform');

  /** Schedules a callback for the next host animation frame. */
  requestAnimationFrame(callback: PlatformFrameRequestCallback): number {
    return window.requestAnimationFrame(callback);
  }

  /** Cancels a previously scheduled host animation frame. */
  cancelAnimationFrame(handle: number): void {
    window.cancelAnimationFrame(handle);
  }

  /** Updates the timeout. */
  setTimeout(callback: () => void, ms: number): number {
    return window.setTimeout(callback, ms);
  }

  /** Cancels a one-shot host timer. */
  clearTimeout(handle: number): void {
    window.clearTimeout(handle);
  }

  /** Updates the interval. */
  setInterval(callback: () => void, ms: number): number {
    return window.setInterval(callback, ms);
  }

  /** Cancels a repeating host timer. */
  clearInterval(handle: number): void {
    window.clearInterval(handle);
  }

  /** Returns the host's monotonic time in milliseconds. */
  now(): number {
    return performance.now();
  }

  /** Returns the host wall-clock time as Unix milliseconds. */
  currentDateTime(): number {
    return Date.now();
  }

  /** Schedules a callback in the host microtask queue. */
  queueMicrotask(callback: () => void): void {
    queueMicrotask(callback);
  }

  /** Reports a non-fatal diagnostic through the host warning channel. */
  warn(message: string, ...details: unknown[]): void {
    console.warn(message, ...details);
  }

  /** Creates a Web-platform client/runtime identifier. */
  createId(prefix = 'web'): string {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (randomUUID) return `${prefix}-${randomUUID.call(globalThis.crypto)}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /** Registers a host event listener and returns an idempotent disposer. */
  addEventListener(
    target: unknown,
    type: string,
    listener: (event: unknown) => void,
    options?: PlatformEventListenerOptions,
  ): () => void {
    if (!isEventTarget(target)) {
      throw new SearError('BrowserPlatform.addEventListener requires an EventTarget target.');
    }
    target.addEventListener(type, listener as EventListener, options);
    return function removeBrowserEventListener(): void {
      target.removeEventListener(type, listener as EventListener, options);
    };
  }

  /** Observes host-view size changes and returns an idempotent disposer. */
  observeResize(target: unknown, callback: (size: { width: number; height: number }) => void): () => void {
    if (!(target instanceof Element)) {
      throw new SearError('BrowserPlatform.observeResize requires a DOM Element target.');
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(function handleObservedElementResize(entries) {
        const size = entries?.[0]?.contentRect;
        if (size) {
          callback({ width: size.width, height: size.height });
        }
      });
      observer.observe(target);
      return function disconnectObservedElementResize(): void {
        observer.disconnect();
      };
    }

    function notifyWindowResize(): void {
      callback({
        width: (target as HTMLElement).clientWidth,
        height: (target as HTMLElement).clientHeight,
      });
    }
    window.addEventListener('resize', notifyWindowResize);
    return function removeWindowResizeListener(): void {
      window.removeEventListener('resize', notifyWindowResize);
    };
  }

  /** Reads an element's document-relative viewport offset. */
  readViewOffset(target: unknown): PlatformViewOffset {
    if (!hasBoundingClientRect(target)) return { x: 0, y: 0 };
    const rect = target.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }
}

function isEventTarget(target: unknown): target is EventTarget {
  return (
    typeof target === 'object' &&
    target !== null &&
    'addEventListener' in target &&
    'removeEventListener' in target &&
    typeof (target as { addEventListener?: unknown }).addEventListener === 'function' &&
    typeof (target as { removeEventListener?: unknown }).removeEventListener === 'function'
  );
}

function hasBoundingClientRect(target: unknown): target is {
  getBoundingClientRect(): { left: number; top: number };
} {
  return (
    typeof target === 'object' &&
    target !== null &&
    'getBoundingClientRect' in target &&
    typeof (target as { getBoundingClientRect?: unknown }).getBoundingClientRect === 'function'
  );
}
