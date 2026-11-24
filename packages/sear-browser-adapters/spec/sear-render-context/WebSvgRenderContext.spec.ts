import { imageHref, imageWidth, imageHeight, readSvgDimension } from '../../src/sear-render-context/SvgImageSource';
import { normalizePathData, normalizeTranslatedElement } from '../../src/sear-render-context/SvgTranslatedGeometry';
import { getLargeTranslationNormalization } from '../../src/sear-render-context/WebRenderTransform';
import { WebSvgRenderContext } from '../../src/sear-render-context/WebSvgRenderContext';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function createContext(platform: Platform = new BrowserPlatform()): WebSvgRenderContext {
  const root = document.createElementNS(SVG_NAMESPACE, 'svg');
  root.setAttribute('width', '400');
  root.setAttribute('height', '300');
  const context = new WebSvgRenderContext(root, platform);
  context.initialize(1);
  return context;
}

describe('WebSvgRenderContext', () => {
  let observerCallback: ResizeObserverCallback | null = null;

  beforeAll(() => {
    global.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        observerCallback = cb;
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    } as any;
  });

  afterAll(() => {
    delete (global as any).ResizeObserver;
  });

  it('declares retained-frame capabilities without exposing target checks to strategies', () => {
    const context = createContext();

    expect(context.requiresFrameRebuild()).toBe(true);
    expect(context.supportsDirtyRedraw()).toBe(false);
    expect(context.requiresExplicitNodeClear()).toBe(false);
  });

  it('initializes its viewBox from the CSS viewport when dimensions are not attributes', () => {
    const root = document.createElementNS(SVG_NAMESPACE, 'svg');
    Object.defineProperties(root, {
      clientWidth: { value: 400 },
      clientHeight: { value: 300 },
    });
    const context = new WebSvgRenderContext(root);

    context.initialize(4);
    context.setFont('12px sans-serif');
    context.fillText('A1', 12, 36);

    const text = root.querySelector('text');
    expect(root.getAttribute('width')).toBe('400');
    expect(root.getAttribute('height')).toBe('300');
    expect(root.getAttribute('viewBox')).toBe('0 0 400 300');
    expect(text?.style.font).toBe('12px sans-serif');
    expect(text?.style.whiteSpace).toBe('pre');
    expect(text?.style.userSelect).toBe('none');
  });

  it('uses default arguments for initialize and resize when scale is omitted', () => {
    const root = document.createElementNS(SVG_NAMESPACE, 'svg');
    root.setAttribute('width', '320');
    root.setAttribute('height', '180');
    const context = new WebSvgRenderContext(root);

    context.initialize();
    context.resize(160, 90);

    expect(context.getRasterScale()).toBe(1);
    expect(root.getAttribute('width')).toBe('160');
    expect(root.getAttribute('height')).toBe('90');
  });

  it('renders paths, text, and styles as queryable SVG elements', () => {
    const context = createContext();

    context.setFillStyle('#ffffff');
    context.beginPath();
    context.rect(10, 20, 30, 40);
    context.fill();
    context.setStrokeStyle('#1677ff');
    context.setLineWidth(2);
    context.setLineDash([4, 2]);
    context.stroke();
    context.setFont('12px sans-serif');
    context.fillText('A1', 12, 36);

    const root = context.getRenderTarget();
    const paths = root.querySelectorAll('path');
    const text = root.querySelector('text');

    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('d')).toBe('M 10 20 H 40 V 60 H 10 Z');
    expect(paths[0].getAttribute('fill')).toBe('#ffffff');
    expect(paths[1].getAttribute('stroke')).toBe('#1677ff');
    expect(paths[1].getAttribute('stroke-width')).toBe('2');
    expect(paths[1].getAttribute('stroke-dasharray')).toBe('4 2');
    expect(text?.textContent).toBe('A1');
    expect(text?.style.font).toBe('12px sans-serif');
    expect(text?.style.whiteSpace).toBe('pre');
    expect(text?.style.userSelect).toBe('none');
  });

  it('folds large translated text coordinates into the SVG text position', () => {
    const context = createContext();

    context.setTransform(1, 0, 0, 1, 0, -20_971_520);
    context.fillText('1048576', 18, 20_971_560);

    const text = context.getRenderTarget().querySelector('text');
    expect(text?.textContent).toBe('1048576');
    expect(text?.getAttribute('x')).toBe('18');
    expect(text?.getAttribute('y')).toBe('40');
    expect(text?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
  });

  it('uses maxWidth only to compress text wider than the available space', () => {
    const getContext = jest.mocked(HTMLCanvasElement.prototype.getContext);
    const context = createContext();
    const raster = getContext.mock.results.at(-1)!.value as CanvasRenderingContext2D;
    raster.measureText = jest.fn((text: string) => ({ width: text === 'short' ? 20 : 150 } as TextMetrics));

    context.fillText('short', 0, 12, 100);
    context.fillText('long', 0, 24, 100);

    const texts = context.getRenderTarget().querySelectorAll('text');
    const short = texts[0];
    const long = texts[1];
    expect(short.getAttribute('textLength')).toBeNull();
    expect(long.getAttribute('textLength')).toBe('100');
    expect(long.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
  });

  it('folds large translated path and clip coordinates into retained SVG geometry', () => {
    const context = createContext();

    context.setTransform(1, 0, 0, 1, 0, -20_971_520);
    context.beginPath();
    context.rect(50, 20_971_544, 350, 120);
    context.clip();
    context.beginPath();
    context.rect(405, 20_971_544, 200, 48);
    context.stroke();

    const clipPath = context.getRenderTarget().querySelector('clipPath path');
    const selectionPath = context.getRenderTarget().querySelector(':scope > g path');
    expect(clipPath?.getAttribute('d')).toBe('M 50 24 H 400 V 144 H 50 Z');
    expect(clipPath?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
    expect(selectionPath?.getAttribute('d')).toBe('M 405 24 H 605 V 72 H 405 Z');
    expect(selectionPath?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
  });

  it('keeps the previous line width when Canvas would reject an invalid width', () => {
    const context = createContext();

    context.setLineWidth(0);
    context.strokeRect(10, 20, 30, 40);

    const rect = context.getRenderTarget().querySelector('rect[stroke]');
    expect(context.getLineWidth()).toBe(1);
    expect(rect?.getAttribute('stroke-width')).toBe('1');
  });

  it('preserves save/restore transforms and applies clipping to later paint', () => {
    const context = createContext();

    context.save();
    context.translate(20, 30);
    context.beginPath();
    context.rect(0, 0, 50, 50);
    context.clip();
    context.beginPath();
    context.rect(0, 0, 100, 100);
    context.fill();
    context.restore();
    context.strokeRect(1, 2, 3, 4);

    const paths = context.getRenderTarget().querySelectorAll(':scope > g path');
    const clippedGroup = context.getRenderTarget().querySelector('g[clip-path]');
    const rect = context.getRenderTarget().querySelector('rect[stroke]');

    expect(clippedGroup?.getAttribute('clip-path')).toMatch(/^url\(#sear-svg-clip-/);
    const clipId = clippedGroup?.getAttribute('clip-path')?.match(/^url\(#(.+)\)$/)?.[1];
    expect(clipId).toBeDefined();
    expect(context.getRenderTarget().querySelector(`clipPath[id="${clipId}"]`)).not.toBeNull();
    expect(paths[0].getAttribute('transform')).toBe('matrix(1 0 0 1 20 30)');
    expect(rect?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
  });

  it('masks prior SVG paint for clearRect while keeping later paint visible', () => {
    const context = createContext();

    context.strokeRect(10, 10, 40, 40);
    context.clearRect(10, 10, 40, 40);
    context.strokeRect(20, 20, 10, 10);

    const root = context.getRenderTarget();
    const masks = root.querySelectorAll('mask');
    const groups = root.querySelectorAll(':scope > g');

    expect(masks).toHaveLength(1);
    expect(masks[0].querySelector('rect[fill="black"]')).not.toBeNull();
    expect(groups).toHaveLength(1);
    expect(root.querySelectorAll('rect[stroke]')).toHaveLength(2);
  });

  it('supports SVG off-screen copies through the shared drawImage contract', () => {
    const platform = { warn: jest.fn() } as unknown as Platform;
    const source = createContext(platform);
    source.strokeRect(0, 0, 20, 20);
    const target = createContext(platform);

    target.drawImage(source.getRenderTarget() as unknown as CanvasImageSource, 5, 6);

    const image = target.getRenderTarget().querySelector('image');
    expect(image?.getAttribute('x')).toBe('5');
    expect(image?.getAttribute('y')).toBe('6');
    expect(image?.getAttribute('href')).toContain('data:image/svg+xml');

    // Test overloaded drawImage with SVGSVGElement (does not hit rasterContext)
    target.drawImage(source.getRenderTarget() as unknown as CanvasImageSource, 1, 2, 3, 4);
    target.drawImage(source.getRenderTarget() as unknown as CanvasImageSource, 1, 2, 3, 4, 5, 6, 7, 8);

    // Test with HTMLCanvasElement (hits rasterContext and imageHref)
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      target.drawImage(canvas, 1, 2, 3, 4);
      target.drawImage(canvas, 1, 2, 3, 4, 5, 6, 7, 8);
    }

    const video = document.createElement('video');
    Object.defineProperties(video, {
      currentSrc: { value: 'data:video' },
      videoWidth: { value: 10 },
      videoHeight: { value: 10 },
    });
    target.drawImage(video, 0, 0);

    // Test with HTMLImageElement
    const img = document.createElement('img');
    Object.defineProperties(img, {
      currentSrc: { value: 'data:img' },
      naturalWidth: { value: 10 },
      naturalHeight: { value: 10 },
    });
    target.drawImage(img, 0, 0);

    // Test with SVGElement (localName=image)
    const svgImg = document.createElementNS(SVG_NAMESPACE, 'image');
    svgImg.setAttribute('href', 'data:svgimg');
    svgImg.setAttribute('width', '10');
    svgImg.setAttribute('height', '10');
    target.drawImage(svgImg as unknown as CanvasImageSource, 0, 0);
    expect(platform.warn).toHaveBeenCalledWith(
      'WebSvgRenderContext drawImage skipped raster mirror for SVG image source.',
      expect.objectContaining({ localName: 'image' }),
    );

    // Test with unsupported image source to trigger errors
    const fakeImage = {} as any;
    expect(() => target.drawImage(fakeImage, 0, 0)).toThrow(
      'WebSvgRenderContext cannot read this CanvasImageSource width.',
    );
  });

  it('provides scale and dimension methods', () => {
    const context = createContext();
    context.setViewScale(2);
    expect(context.getViewScale()).toBe(2);
    expect(context.getRasterScale()).toBe(1);
    expect(context.getMaxLineWidth()).toBe(1);

    // resize
    context.resize(100, 200, 2);
    expect(context.getRenderTarget().getAttribute('width')).toBe('100');
    expect(context.getRenderTarget().getAttribute('height')).toBe('200');
  });

  it('handles missing raster context, resetHitFrame, and restore with empty stack', () => {
    const root = document.createElementNS(SVG_NAMESPACE, 'svg');
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);
    expect(() => new WebSvgRenderContext(root)).toThrow('CanvasRenderingContext2D not found');
    HTMLCanvasElement.prototype.getContext = originalGetContext;

    const context = createContext();
    context.resetHitFrame(100, 100); // Coverage for L81

    // Coverage for L161
    context.restore(); // should not throw, stateStack is empty
  });

  it('triggers resize observer callbacks', () => {
    const context = createContext();
    const dummy = jest.fn();
    context.addResizeListener(dummy);

    // Call the ResizeObserver callback directly if we mocked it correctly
    if (observerCallback) {
      (observerCallback as unknown as Function)([
        { contentRect: { width: 400, height: 300 } } as ResizeObserverEntry,
      ]);
      expect(dummy).toHaveBeenCalled();
    }
  });

  it('sets data-sear attributes when node semantics are provided', () => {
    const context = createContext();
    context.beginNodeSemantics({ owner: 'TestOwner', role: 'button' });

    context.beginPath();
    context.rect(0, 0, 10, 10);
    context.fill(); // Hits L572 and L573

    const path = context.getRenderTarget().querySelector('path');
    expect(path?.getAttribute('data-sear-owner')).toBe('TestOwner');
    expect(path?.getAttribute('data-sear-role')).toBe('button');

    context.endNodeSemantics();
  });

  it('implements missing node generation methods', () => {
    const context = createContext();
    expect(context.cloneNode()).toBeInstanceOf(WebSvgRenderContext);
    expect(context.createHitNode()).toBeInstanceOf(WebSvgRenderContext);

    // Call beginFrame and semantics explicitly to cover lifecycle bounds
    context.beginNodeSemantics({});
    context.endNodeSemantics();
    context.beginFrame();
  });

  it('implements attribute and event methods', () => {
    const context = createContext();
    context.setAttribute('data-test', 'true');
    expect(context.getAttribute('data-test')).toBe('true');
    expect(context.getAttribute('nonexistent')).toBe('');

    const dummy = jest.fn();
    const dummy2 = jest.fn();
    const disposeClick = context.addEventListener('click', dummy);
    context.addClickEventListener(dummy2);
    context.addMouseDownEventListener(dummy);
    context.addMouseMoveEventListener(dummy);
    context.addMouseUpEventListener(dummy);

    const root = context.getRenderTarget();
    root.dispatchEvent(new MouseEvent('click'));
    expect(dummy).toHaveBeenCalledTimes(1);
    expect(dummy2).toHaveBeenCalledTimes(1);
    disposeClick();
    disposeClick();
    root.dispatchEvent(new MouseEvent('click'));
    expect(dummy).toHaveBeenCalledTimes(1);
    expect(dummy2).toHaveBeenCalledTimes(2);

    expect(() => context.removeClickEventListener(dummy)).not.toThrow();
    expect(() => context.removeMouseDownEventListener(dummy)).not.toThrow();
    expect(() => context.removeMouseMoveEventListener(dummy)).not.toThrow();
    expect(() => context.removeMouseUpEventListener(dummy)).not.toThrow();

    // resize listener removals
    expect(() => context.removeResizeListener()).not.toThrow();

    context.addResizeListener(dummy);
  });

  it('implements transform methods', () => {
    const context = createContext();
    context.setTransform(1, 2, 3, 4, 5, 6);
    context.beginPath();
    context.rect(0, 0, 10, 10);
    context.fill();
    const p = context.getRenderTarget().querySelector('path');
    expect(p?.getAttribute('transform')).toBe('matrix(1 2 3 4 5 6)');

    context.resetTransform();
    context.beginPath();
    context.rect(0, 0, 10, 10);
    context.fill();
  });

  it('keeps invalid large-translation geometry unchanged', () => {
    expect(getLargeTranslationNormalization([1, 0, 0, 1, 1, 1])).toBeNull();
    expect(getLargeTranslationNormalization([1, 0, 1, 0, 20_000_000, 0])).toBeNull();
    expect(getLargeTranslationNormalization([1e-308, 0, 0, 1, Number.MAX_VALUE, 0])).toBeNull();
    expect(normalizePathData('', 1, 1)).toBeNull();
    expect(normalizePathData('M 1', 1, 1)).toBeNull();
    expect(normalizePathData('H', 1, 1)).toBeNull();
    expect(normalizePathData('V', 1, 1)).toBeNull();
    expect(normalizePathData('Q 1 2', 1, 1)).toBeNull();

    const invalidPath = document.createElementNS(SVG_NAMESPACE, 'path');
    invalidPath.setAttribute('d', 'M 1');
    const transform: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, -20_971_520];
    expect(normalizeTranslatedElement(invalidPath, transform)).toBe(transform);
    const pathWithoutData = document.createElementNS(SVG_NAMESPACE, 'path');
    expect(normalizeTranslatedElement(pathWithoutData, transform)).toBe(transform);

    const group = document.createElementNS(SVG_NAMESPACE, 'g');
    expect(normalizeTranslatedElement(group, transform)).toBe(transform);
    expect(normalizePathData({ match: () => [void 0] } as unknown as string, 1, 1)).toBeNull();
  });

  it('implements path commands', () => {
    const context = createContext();
    context.getRoot(); // Line 167 coverage

    context.beginPath();
    context.moveTo(1, 2);
    context.lineTo(3, 4);
    context.closePath(); // Lines 223-224 coverage
    context.stroke();

    // Unimplemented / stub methods
    expect(() => context.putImageData({ data: [], width: 1, height: 1 }, 0, 0)).toThrow();

    // Line 406-413 and 661-668 coverage
    context.putImageData({ data: [[0, 0, 0, 0]] as any, width: 1, height: 1 }, 0, 0);

    // Default cleared data is zeroes
    expect(context.getImageData(0, 0, 1, 1).data).toEqual([[0, 0, 0, 0]]);
    expect(context.measureText('test').width).toBeGreaterThan(0);
    expect(context.measureText('test').height).toBe(0); // fallback

    // Line 351 coverage
    context.fillText('test', 0, 0, 100);
  });

  it('covers measureText font-box branch and SVG image raster-warn optional path without platform', () => {
    const getContext = jest.mocked(HTMLCanvasElement.prototype.getContext);
    const context = createContext();
    const raster = getContext.mock.results.at(-1)!.value as CanvasRenderingContext2D;
    const originalMeasureText = raster.measureText.bind(raster);
    raster.measureText = jest.fn(() => ({
      width: 5,
      actualBoundingBoxLeft: 1,
      actualBoundingBoxRight: 2,
      actualBoundingBoxAscent: 3,
      actualBoundingBoxDescent: 4,
      fontBoundingBoxAscent: 7,
      fontBoundingBoxDescent: 2,
    } as TextMetrics));

    const metrics = context.measureText('abc');
    expect(metrics.height).toBe(9);
    expect(metrics.fontAscent).toBe(7);
    expect(metrics.fontDescent).toBe(2);

    const source = createContext();
    expect(() => context.drawImage(source.getRenderTarget() as unknown as CanvasImageSource, 0, 0)).not.toThrow();

    raster.measureText = originalMeasureText;
  });

  it('covers image serialization and dimension fallback helpers', () => {

    const img = document.createElement('img');
    Object.defineProperties(img, {
      currentSrc: { value: '' },
      src: { value: 'fallback-src' },
      naturalWidth: { value: 0 },
      width: { value: 13 },
      naturalHeight: { value: 0 },
      height: { value: 17 },
    });
    expect(imageHref(img)).toBe('fallback-src');
    expect(imageWidth(img)).toBe(13);
    expect(imageHeight(img)).toBe(17);

    const svgImg = document.createElementNS(SVG_NAMESPACE, 'image');
    expect(imageHref(svgImg as unknown as CanvasImageSource)).toBe('');
    expect(imageWidth(svgImg as unknown as CanvasImageSource)).toBe(0);
    expect(imageHeight(svgImg as unknown as CanvasImageSource)).toBe(0);

    const video = document.createElement('video');
    Object.defineProperties(video, {
      currentSrc: { value: 'video-src' },
      videoWidth: { value: 0 },
      width: { value: 19 },
      videoHeight: { value: 0 },
      height: { value: 23 },
    });
    expect(imageWidth(video)).toBe(19);
    expect(imageHeight(video)).toBe(23);

    const emptySvg = document.createElementNS(SVG_NAMESPACE, 'svg');
    emptySvg.setAttribute('width', 'NaN');
    expect(readSvgDimension(emptySvg, 'width')).toBe(1);
  });

  it('throws from putImageData when internal canvas context creation fails', () => {
    const context = createContext();
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);
    expect(() =>
      context.putImageData(
        {
          data: [[0, 0, 0, 0]] as any,
          width: 1,
          height: 1,
        },
        0,
        0,
      ),
    ).toThrow('CanvasRenderingContext2D not found');
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('disconnects registered resize observers when removing listeners', () => {
    const platform = new BrowserPlatform();
    const disconnect = jest.fn();
    jest.spyOn(platform, 'observeResize').mockReturnValue(disconnect);
    const context = createContext(platform);
    context.addResizeListener(jest.fn());
    context.removeResizeListener();
    context.removeResizeListener();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('falls back to actual bounding boxes when font bounding boxes are unavailable', () => {
    const getContext = jest.mocked(HTMLCanvasElement.prototype.getContext);
    const context = createContext();
    const raster = getContext.mock.results.at(-1)!.value as CanvasRenderingContext2D;
    const originalMeasureText = raster.measureText.bind(raster);
    raster.measureText = jest.fn(() => ({
      width: 10,
      actualBoundingBoxLeft: 1,
      actualBoundingBoxRight: 2,
      actualBoundingBoxAscent: 3,
      actualBoundingBoxDescent: 4,
      fontBoundingBoxAscent: void 0,
      fontBoundingBoxDescent: void 0,
    } as unknown as TextMetrics));

    const metrics = context.measureText('fallback');
    expect(metrics.height).toBe(7);
    expect('fontAscent' in metrics).toBe(false);
    expect('fontDescent' in metrics).toBe(false);

    raster.measureText = originalMeasureText;
  });

  it('throws unsupported source errors in imageHref and imageHeight helpers', () => {
    const unknownSource = {} as CanvasImageSource;

    expect(() => imageHref(unknownSource)).toThrow('WebSvgRenderContext cannot serialize this CanvasImageSource.');
    expect(() => imageHeight(unknownSource)).toThrow(
      'WebSvgRenderContext cannot read this CanvasImageSource height.',
    );
  });

  it('ignores gradients / pattern fill styles', () => {
    const context = createContext();
    const gradient = {} as CanvasGradient;

    context.setFillStyle(gradient);
    context.beginPath();
    context.rect(0, 0, 10, 10);
    expect(() => context.fill()).toThrow('WebSvgRenderContext requires SVG paint URLs for gradients and patterns.');

    context.setStrokeStyle(gradient);
    expect(() => context.stroke()).toThrow('WebSvgRenderContext requires SVG paint URLs for gradients and patterns.');
  });
});
