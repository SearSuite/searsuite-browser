import { BrowserPlatform } from '../../src';

describe('BrowserPlatform', () => {
  const browserGlobals = globalThis as typeof globalThis & {
    ResizeObserver?: typeof ResizeObserver;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    delete browserGlobals.ResizeObserver;
  });

  it('delegates scheduling, time, microtasks, and warnings to browser globals', async () => {
    const platform = new BrowserPlatform();
    const frame = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
    const cancelFrame = jest.spyOn(window, 'cancelAnimationFrame');
    const timeout = jest
      .spyOn(window, 'setTimeout')
      .mockReturnValue(8 as unknown as ReturnType<typeof window.setTimeout>);
    const clearTimeout = jest.spyOn(window, 'clearTimeout');
    const interval = jest
      .spyOn(window, 'setInterval')
      .mockReturnValue(9 as unknown as ReturnType<typeof window.setInterval>);
    const clearInterval = jest.spyOn(window, 'clearInterval');
    const now = jest.spyOn(performance, 'now').mockReturnValue(12.5);
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    const callback = jest.fn();

    expect(platform.requestAnimationFrame(callback)).toBe(7);
    platform.cancelAnimationFrame(7);
    expect(platform.setTimeout(callback, 10)).toBe(8);
    platform.clearTimeout(8);
    expect(platform.setInterval(callback, 10)).toBe(9);
    platform.clearInterval(9);
    expect(platform.now()).toBe(12.5);
    platform.queueMicrotask(callback);
    await Promise.resolve();
    platform.warn('warning', { source: 'test' });

    expect(frame).toHaveBeenCalledWith(callback);
    expect(cancelFrame).toHaveBeenCalledWith(7);
    expect(timeout).toHaveBeenCalledWith(callback, 10);
    expect(clearTimeout).toHaveBeenCalledWith(8);
    expect(interval).toHaveBeenCalledWith(callback, 10);
    expect(clearInterval).toHaveBeenCalledWith(9);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('warning', { source: 'test' });
  });

  it('observes a DOM element through ResizeObserver and disconnects on cleanup', () => {
    const callback = jest.fn();
    const observe = jest.fn();
    const disconnect = jest.fn();
    let notify: ((entries: ResizeObserverEntry[]) => void) | undefined;
    class TestResizeObserver {
      constructor(listener: (entries: ResizeObserverEntry[]) => void) {
        notify = listener;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve(): void {}
    }
    browserGlobals.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
    const target = document.createElement('div');
    const cleanup = new BrowserPlatform().observeResize(target, callback);

    notify?.([{ contentRect: { width: 320, height: 240 } } as ResizeObserverEntry]);
    notify?.([]);
    cleanup();

    expect(observe).toHaveBeenCalledWith(target);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ width: 320, height: 240 });
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('falls back to window resize and rejects non-element targets', () => {
    const platform = new BrowserPlatform();
    const target = document.createElement('div');
    Object.defineProperties(target, {
      clientWidth: { value: 111 },
      clientHeight: { value: 222 },
    });
    const callback = jest.fn();
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');

    expect(() => platform.observeResize({}, callback)).toThrow('requires a DOM Element target');
    const cleanup = platform.observeResize(target, callback);
    const listener = add.mock.calls.find(([name]) => name === 'resize')?.[1];
    if (!(listener instanceof Function)) throw new Error('resize listener missing');
    listener(new Event('resize'));
    cleanup();

    expect(callback).toHaveBeenCalledWith({ width: 111, height: 222 });
    expect(remove).toHaveBeenCalledWith('resize', listener);
  });
});
