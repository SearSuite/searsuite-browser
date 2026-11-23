import { type Platform } from '@searsuite/sear-foundation-platform';
import { WebScroller } from '../../src';
import { ScrollManager } from '@searsuite/sear-render-scroll';

function createPlatform(): Platform & {
  nowValue: number;
  readonly frameCallbacks: Map<number, FrameRequestCallback>;
  readonly timeoutCallbacks: Map<number, () => void>;
  readonly timeoutDelays: Map<number, number>;
  runNextTimer(): void;
} {
  let nextHandle = 1;
  return {
    nowValue: 0,
    frameCallbacks: new Map(),
    timeoutCallbacks: new Map(),
    timeoutDelays: new Map(),
    requestAnimationFrame(callback: FrameRequestCallback): number {
      const handle = nextHandle++;
      this.frameCallbacks.set(handle, callback);
      return handle;
    },
    cancelAnimationFrame(handle: number): void {
      this.frameCallbacks.delete(handle);
    },
    setTimeout(callback: () => void, ms: number): number {
      const handle = nextHandle++;
      this.timeoutCallbacks.set(handle, callback);
      this.timeoutDelays.set(handle, ms);
      return handle;
    },
    clearTimeout(handle: number): void {
      this.timeoutCallbacks.delete(handle);
      this.timeoutDelays.delete(handle);
    },
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
    now(): number {
      return this.nowValue;
    },
    currentDateTime(): number {
      return 0;
    },
    queueMicrotask(callback: () => void): void {
      callback();
    },
    warn: jest.fn(),
    createId(prefix = 'test'): string {
      return `${prefix}-${nextHandle++}`;
    },
    toLowerCase(value: string): string {
      return value.toLowerCase();
    },
    addEventListener: jest.fn(() => jest.fn()),
    observeResize: jest.fn(() => jest.fn()),
    readViewOffset: jest.fn(() => ({ x: 0, y: 0 })),
    runNextTimer(): void {
      const entry = this.timeoutCallbacks.entries().next().value as [number, () => void] | undefined;
      if (!entry) throw new Error('Expected a queued timer.');
      this.timeoutCallbacks.delete(entry[0]);
      this.timeoutDelays.delete(entry[0]);
      entry[1]();
    },
  };
}

function createWebScroller(target: HTMLElement, platform: Platform = createPlatform()): WebScroller {
  return new WebScroller(target, platform);
}

function touchEvent(type: string, touches: ReadonlyArray<{ clientX: number; clientY: number }>): TouchEvent {
  const event = new Event(type, { cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: touches });
  return event;
}

describe('WebScroller', () => {
  it('accepts a DOM target and exposes a publisher', () => {
    const element = document.createElement('div');
    const scroller = createWebScroller(element);

    expect(scroller.root).toBe(element);
    expect(scroller.getPublisher()).toBeInstanceOf(Function);
  });

  it('locks a continuous trackpad gesture to its first dominant axis', () => {
    const element = document.createElement('canvas');
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaX: 10, deltaY: 20, cancelable: true }));
    element.dispatchEvent(new WheelEvent('wheel', { deltaX: 50, deltaY: 1, cancelable: true }));

    expect(manager.getState()).toMatchObject({ x: 0, y: 21 });
    dispose();
  });

  it('starts wheel rubber-band return on the input frame', () => {
    const element = document.createElement('canvas');
    const platform = createPlatform();
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element, platform).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -10_000, cancelable: true }));
    expect(platform.frameCallbacks.size).toBe(1);
    expect(platform.timeoutCallbacks.size).toBe(1);

    platform.runNextTimer();
    expect(platform.timeoutCallbacks.size).toBe(0);
    expect(platform.frameCallbacks.size).toBe(1);

    dispose();
  });

  it('keeps accumulating while wheel input continues and returns on each input frame', () => {
    const element = document.createElement('canvas');
    const platform = createPlatform();
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element, platform).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, cancelable: true }));
    const firstOffset = element.style.translate;
    platform.nowValue = 40;
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, cancelable: true }));
    const secondOffset = element.style.translate;
    expect(parseFloat(secondOffset.split(' ')[1])).toBeGreaterThan(parseFloat(firstOffset.split(' ')[1]));

    platform.nowValue = 80;
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, cancelable: true }));
    const thirdOffset = element.style.translate;
    expect(parseFloat(thirdOffset.split(' ')[1])).toBeGreaterThan(parseFloat(secondOffset.split(' ')[1]));

    platform.nowValue = 120;
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, cancelable: true }));
    expect(parseFloat(element.style.translate.split(' ')[1])).toBeGreaterThan(parseFloat(thirdOffset.split(' ')[1]));
    expect([...platform.timeoutDelays.values()]).toEqual([48]);
    expect(platform.frameCallbacks.size).toBe(1);

    platform.runNextTimer();
    expect(platform.frameCallbacks.size).toBe(1);
    dispose();
  });

  it('produces boundary feedback when the logical position is already at an edge', () => {
    const element = document.createElement('canvas');
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    manager.scrollTo(0, 0);
    const dispose = manager.addPublisher(createWebScroller(element).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, cancelable: true }));

    expect(manager.getState()).toMatchObject({ x: 0, y: 0 });
    expect(element.style.translate).toMatch(/^0px \d+(?:\.\d+)?px$/);
    dispose();
  });

  it('scrolls inward immediately after an extreme wheel pull', () => {
    const element = document.createElement('canvas');
    const manager = new ScrollManager(600, 600);
    manager.setContentBoundary(1_000, 1_000);
    const dispose = manager.addPublisher(createWebScroller(element).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100_000, cancelable: true }));
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));

    expect(manager.getState().y).toBe(100);
    expect(parseFloat(element.style.translate.split(' ')[1])).toBeGreaterThan(0);
    dispose();
  });

  it('continues the return while adding same-direction wheel input', () => {
    const element = document.createElement('canvas');
    const platform = createPlatform();
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element, platform).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -10_000, cancelable: true }));
    expect(platform.frameCallbacks.size).toBe(1);

    const frameEntry = platform.frameCallbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
    const frame = frameEntry?.[1];
    if (!frame) throw new Error('Expected a queued animation frame.');
    platform.frameCallbacks.delete(frameEntry[0]);
    frame(16);
    expect(platform.frameCallbacks.size).toBe(1);
    const returningOffset = parseFloat(element.style.translate.split(' ')[1]);
    const returningFrame = platform.frameCallbacks.keys().next().value;
    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));

    expect(platform.frameCallbacks.size).toBe(1);
    expect(platform.frameCallbacks.keys().next().value).toBe(returningFrame);
    const addedOffset = parseFloat(element.style.translate.split(' ')[1]);
    expect(addedOffset).toBeGreaterThan(returningOffset);
    expect(platform.timeoutCallbacks.size).toBe(1);

    const nextFrameEntry = platform.frameCallbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!nextFrameEntry) throw new Error('Expected the return frame to continue.');
    platform.frameCallbacks.delete(nextFrameEntry[0]);
    nextFrameEntry[1](32);
    expect(parseFloat(element.style.translate.split(' ')[1])).toBeLessThan(addedOffset);
    dispose();
  });

  it('moves only the visual surface at a boundary and restores host styles on cleanup', () => {
    const element = document.createElement('canvas');
    element.style.transform = 'scale(1)';
    element.style.translate = '2px 3px';
    element.style.willChange = 'opacity';
    element.style.clipPath = 'circle(40%)';
    const manager = new ScrollManager(100, 80);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaX: -30, deltaY: -40, cancelable: true }));

    expect(manager.getState()).toMatchObject({ x: 0, y: 0 });
    expect(element.style.translate).toMatch(/^\d+(?:\.\d+)?px \d+(?:\.\d+)?px$/);
    expect(element.style.transform).toBe('scale(1)');
    expect(element.style.willChange).toBe('translate');
    expect(element.style.clipPath).toMatch(/^inset\(0px 0px \d+(?:\.\d+)?px 0px\)$/);

    dispose();
    expect(element.style.translate).toBe('2px 3px');
    expect(element.style.transform).toBe('scale(1)');
    expect(element.style.willChange).toBe('opacity');
    expect(element.style.clipPath).toBe('circle(40%)');
  });

  it('clips a large bottom-boundary pull before it can cover controls above the viewport', () => {
    const element = document.createElement('canvas');
    const manager = new ScrollManager(100, 80);
    manager.setContentBoundary(100, 100);
    manager.scrollTo(0, 100);
    const dispose = manager.addPublisher(createWebScroller(element).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: 100_000, cancelable: true }));

    expect(manager.getState().y).toBe(100);
    expect(element.style.clipPath).toMatch(/^inset\([1-9]\d*(?:\.\d+)?px 0px 0px 0px\)$/);
    dispose();
    expect(element.style.clipPath).toBe('');
  });

  it('locks touch dragging to one axis and returns after touch end', () => {
    const element = document.createElement('div');
    const platform = createPlatform();
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    manager.scrollTo(20, 30);
    const dispose = manager.addPublisher(createWebScroller(element, platform).getPublisher());

    element.dispatchEvent(touchEvent('touchstart', [{ clientX: 20, clientY: 30 }]));
    element.dispatchEvent(touchEvent('touchmove', [{ clientX: 14, clientY: 18 }]));

    expect(manager.getState()).toMatchObject({ x: 20, y: 42 });
    element.dispatchEvent(touchEvent('touchend', []));
    expect(platform.frameCallbacks.size).toBe(0);

    element.dispatchEvent(touchEvent('touchstart', [{ clientX: 14, clientY: 18 }]));
    element.dispatchEvent(touchEvent('touchmove', [{ clientX: 100, clientY: 100 }]));
    element.dispatchEvent(touchEvent('touchend', []));
    expect(element.style.translate).not.toBe('');
    expect(platform.frameCallbacks.size).toBe(1);

    dispose();
    expect(platform.frameCallbacks.size).toBe(0);
    expect(element.style.translate).toBe('');
  });

  it('starts returning a pending wheel pull when touch takes over', () => {
    const element = document.createElement('canvas');
    const platform = createPlatform();
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(createWebScroller(element, platform).getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -1_000, cancelable: true }));
    expect(platform.timeoutCallbacks.size).toBe(1);
    expect(platform.frameCallbacks.size).toBe(1);
    element.dispatchEvent(touchEvent('touchstart', [{ clientX: 0, clientY: 0 }]));
    expect(platform.timeoutCallbacks.size).toBe(0);
    expect(platform.frameCallbacks.size).toBe(1);

    element.dispatchEvent(touchEvent('touchmove', [{ clientX: 0, clientY: 20 }]));
    expect(platform.frameCallbacks.size).toBe(0);
    element.dispatchEvent(touchEvent('touchend', []));
    expect(platform.frameCallbacks.size).toBe(1);
    dispose();
  });

  it('bypasses visual resistance when disabled', () => {
    const element = document.createElement('div');
    const scroller = createWebScroller(element);
    scroller.configureRubberBand({ enabled: false });
    const manager = new ScrollManager(100, 100);
    manager.setContentBoundary(100, 100);
    const dispose = manager.addPublisher(scroller.getPublisher());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -50, cancelable: true }));

    expect(manager.getState().y).toBe(0);
    expect(element.style.translate).toBe('');
    dispose();
  });

  it('registers and removes every host listener', () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      style: {},
      addEventListener(type: string, listener: EventListener): void {
        listeners.set(type, listener);
      },
      removeEventListener(type: string, listener: EventListener): void {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    } as unknown as HTMLElement;
    const manager = {
      getState: () => ({ x: 0, y: 0, deltaX: 0, deltaY: 0 }),
      getShape: () => [100, 100],
      getContentBoundary: () => [100, 100],
    } as unknown as ScrollManager;
    const dispose = createWebScroller(target).getPublisher()(manager, jest.fn());

    expect([...listeners.keys()].sort()).toEqual(['touchcancel', 'touchend', 'touchmove', 'touchstart', 'wheel']);
    dispose();
    expect(listeners.size).toBe(0);
  });
});
