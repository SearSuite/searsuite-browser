import { WebCanvasRenderContext } from '../../src/sear-render-context/WebCanvasRenderContext';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';

function createCanvasContext() {
  const canvas = document.createElement('canvas');
  Object.defineProperties(canvas, {
    clientHeight: { configurable: true, value: 50 },
    clientWidth: { configurable: true, value: 100 },
  });
  const native = canvas.getContext('2d') as CanvasRenderingContext2D;
  return { canvas, native, render: new WebCanvasRenderContext(canvas, false, new BrowserPlatform()) };
}

describe('WebCanvasRenderContext', () => {
  it('initializes backing-store scale and delegates drawing operations', () => {
    const { canvas, native, render } = createCanvasContext();
    const drawImage = jest.spyOn(native, 'drawImage');
    const setTransform = jest.spyOn(native, 'setTransform');
    const measureText = jest.spyOn(native, 'measureText').mockReturnValue({
      actualBoundingBoxAscent: 6,
      actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: -2,
      actualBoundingBoxRight: 8,
      fontBoundingBoxAscent: 7,
      fontBoundingBoxDescent: 4,
      width: 8,
    } as TextMetrics);
    render.initialize(2);
    render.setViewScale(1.5);

    render.restore();
    render.save();
    render.restore();
    render.beginPath();
    render.closePath();
    render.moveTo(1, 2);
    render.lineTo(3, 4);
    render.rect(1, 2, 3, 4);
    render.clip();
    render.fill();
    render.stroke();
    render.clearRect(1, 2, 3, 4);
    render.strokeRect(1, 2, 3, 4);
    render.setLineDash([1, 2]);
    render.setStrokeStyle('red');
    render.setFillStyle('blue');
    render.setFont('12px sans-serif');
    render.fillText('text', 1, 2);
    render.fillText('text', 1, 2, 10);
    render.setLineWidth(4);
    render.setTransform(1, 0, 0, 1, 2, 3);
    render.translate(1, 2);
    render.resetTransform();
    render.drawImage(canvas, 1, 2);
    render.drawImage(canvas, 1, 2, 3, 4);
    render.drawImage(canvas, 1, 2, 3, 4, 5, 6, 7, 8);

    expect(canvas.getAttribute('data-symbol')).toContain('RenderContext');
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(render.getViewScale()).toBe(1.5);
    expect(render.getRasterScale()).toBe(2);
    expect(render.getLineWidth()).toBe(4);
    expect(render.getMaxLineWidth()).toBe(4);
    expect(render.measureText('x')).toEqual({
      width: 10,
      height: 11,
      fontAscent: 7,
      fontDescent: 4,
    });
    measureText.mockReturnValue({
      actualBoundingBoxAscent: 6,
      actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 0,
      width: 8,
    } as TextMetrics);
    expect(render.measureText('fallback')).toEqual({ width: 8, height: 9 });
    expect(setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 6, 9);
    expect(drawImage).toHaveBeenCalledWith(canvas, 1, 2, 9, 12);
    expect(drawImage).toHaveBeenCalledWith(canvas, 15, 18, 21, 24, 1, 2, 3, 4);
    expect(measureText).toHaveBeenCalledWith('x');
  });

  it('exposes canvas attributes, cloning, image data, and pointer event binding', () => {
    const { canvas, native, render } = createCanvasContext();
    jest.spyOn(native, 'getImageData').mockReturnValue({
      data: new Uint8ClampedArray([1, 2, 3, 4]),
      width: 1,
      height: 1,
    } as ImageData);
    const callback = jest.fn();

    render.setAttribute('role', 'main');
    const disposeClick = render.addEventListener('click', callback);
    render.addClickEventListener(callback);
    render.addMouseDownEventListener(callback);
    render.addMouseMoveEventListener(callback);
    render.addMouseUpEventListener(callback);
    canvas.dispatchEvent(new MouseEvent('click'));
    canvas.dispatchEvent(new MouseEvent('mousedown'));
    canvas.dispatchEvent(new MouseEvent('mousemove'));
    canvas.dispatchEvent(new MouseEvent('mouseup'));

    expect(render.getAttribute('role')).toBe('main');
    expect(render.getRenderTarget()).toBe(canvas);
    expect(render.getRoot()).toBe(canvas);
    expect(render.getImageData(0, 0, 1, 1)).toEqual({
      data: [[1, 2, 3, 4]],
      width: 1,
      height: 1,
    });
    expect(render.cloneNode()).toBeInstanceOf(WebCanvasRenderContext);
    expect(render.createHitNode()).toBeInstanceOf(WebCanvasRenderContext);
    expect(callback).toHaveBeenCalledTimes(5);
    disposeClick();
    disposeClick();
    canvas.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(6);
    expect(() => render.removeClickEventListener(callback)).toThrow(
      'WebCanvasRenderContext.removeClickEventListener is not supported',
    );
    expect(() => render.removeMouseDownEventListener(callback)).toThrow(
      'WebCanvasRenderContext.removeMouseDownEventListener is not supported',
    );
    expect(() => render.removeMouseMoveEventListener(callback)).toThrow(
      'WebCanvasRenderContext.removeMouseMoveEventListener is not supported',
    );
    expect(() => render.removeMouseUpEventListener(callback)).toThrow(
      'WebCanvasRenderContext.removeMouseUpEventListener is not supported',
    );
    expect(() => render.removeResizeListener()).not.toThrow();
  });

  it('uses accelerated visual layers and reserves frequent readback for the hit layer', () => {
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const { render } = createCanvasContext();

    render.cloneNode();
    render.createHitNode();

    expect(getContext).toHaveBeenCalledWith('2d', { willReadFrequently: false });
    expect(getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true });
  });

  it('folds large translated draw coordinates before delegating to native canvas', () => {
    const { native, render } = createCanvasContext();
    const setTransform = jest.spyOn(native, 'setTransform');
    const rect = jest.spyOn(native, 'rect');
    const strokeRect = jest.spyOn(native, 'strokeRect');
    const fillText = jest.spyOn(native, 'fillText');

    render.initialize(1);
    render.setTransform(1, 0, 0, 1, 0, -20_971_520);
    render.beginPath();
    render.rect(405, 20_971_544, 200, 48);
    render.strokeRect(405, 20_971_544, 200, 48);
    render.fillText('1048576', 18, 20_971_560);

    expect(setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);
    expect(rect).toHaveBeenLastCalledWith(405, 24, 200, 48);
    expect(strokeRect).toHaveBeenLastCalledWith(405, 24, 200, 48);
    expect(fillText).toHaveBeenLastCalledWith('1048576', 18, 40);
  });

  it('implements putImageData', () => {
    const { native, render } = createCanvasContext();
    const putImageData = jest.spyOn(native, 'putImageData').mockImplementation();

    render.putImageData(
      {
        data: [[255, 0, 0, 255]],
        width: 1,
        height: 1,
      },
      10,
      20,
    );

    expect(putImageData).toHaveBeenCalled();
    const args = putImageData.mock.calls[0];
    expect(args[0]).toBeInstanceOf(ImageData);
    expect(args[1]).toBe(10);
    expect(args[2]).toBe(20);
  });

  it('observes resize events and fires callback when dimensions change', () => {
    const { canvas, render } = createCanvasContext();
    const mockObserve = jest.fn();
    const mockDisconnect = jest.fn();

    let observerCallback: ResizeObserverCallback | null = null;

    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe = mockObserve;
      unobserve = jest.fn();
      disconnect = mockDisconnect;
    } as any;

    const dummy = jest.fn();
    render.addEventListener('click', dummy);

    const callback = jest.fn();
    render.addResizeListener(callback);
    expect(mockObserve).toHaveBeenCalledWith(canvas);

    // Simulate a resize event with changed dimensions
    if (observerCallback) {
      (observerCallback as ResizeObserverCallback)(
        [
          {
            contentRect: { width: 999, height: 999 },
          } as any,
        ],
        null as any,
      );
      expect(callback).toHaveBeenCalled();

      callback.mockClear();

      // Simulate resize with same dimensions
      canvas.width = 100;
      canvas.height = 50;
      (observerCallback as ResizeObserverCallback)(
        [
          {
            contentRect: { width: 100, height: 50 },
          } as any,
        ],
        null as any,
      );
      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('covers getAttribute, measureText fallback, and context initialization error', () => {
    const { render, native } = createCanvasContext();

    // getAttribute
    expect(render.getAttribute('test')).toBe('');

    // measureText fallback
    jest.spyOn(native, 'measureText').mockReturnValue({
      actualBoundingBoxAscent: 6,
      actualBoundingBoxDescent: 4,
      width: 15,
    } as TextMetrics);
    expect(render.measureText('test')).toEqual({ width: 15, height: 10 });

    // Initialization error
    const badCanvas = document.createElement('canvas');
    const getContext = jest.spyOn(badCanvas, 'getContext').mockReturnValue(null);
    expect(() => new WebCanvasRenderContext(badCanvas)).toThrow('CanvasRenderingContext2D not found');
    getContext.mockRestore();
  });

  it('handles invalid large-translation normalization matrices', () => {
    const contextType = WebCanvasRenderContext as unknown as {
      getLargeTranslationNormalization(
        transform: [number, number, number, number, number, number],
      ): { offsetX: number; offsetY: number; transform: [number, number, number, number, number, number] } | null;
    };

    expect(contextType.getLargeTranslationNormalization([1, 0, 0, 1, 1, 1])).toBeNull();
    expect(contextType.getLargeTranslationNormalization([1, 0, 1, 0, 20_000_000, 0])).toBeNull();
    expect(contextType.getLargeTranslationNormalization([1e-308, 0, 0, 1, Number.MAX_VALUE, 0])).toBeNull();
  });

  it('uses fallback dimensions when clientWidth/clientHeight are zero and tests resize default arg', () => {
    const canvas = document.createElement('canvas');
    // Ensure getContext returns a mock object with canvas reference
    canvas.getContext = jest
      .fn()
      .mockReturnValue({ canvas, setTransform: jest.fn() } as unknown as CanvasRenderingContext2D);
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 0 },
      clientHeight: { configurable: true, value: 0 },
      width: { configurable: true, writable: true, value: 300 },
      height: { configurable: true, writable: true, value: 150 },
    });
    const render = new WebCanvasRenderContext(canvas);

    // Testing default arg for resize (devicePixelRatio is 2 initially due to JSDOM/tests)
    render.resize(100, 50); // should use default scale = this.devicePixelRatio
    expect(render.getRasterScale()).toBe(2);

    canvas.width = 300;
    canvas.height = 150;
    render.initialize(3); // will use canvas.width/scale = 300/3 = 100
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(150);
  });
});
