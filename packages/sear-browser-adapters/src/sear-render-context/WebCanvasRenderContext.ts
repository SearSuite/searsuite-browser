import { getLargeTranslationNormalization, type Matrix } from './WebRenderTransform';
import { SearError } from '@searsuite/sear-foundation-error';
import { PlatformEventName, type Platform } from '@searsuite/sear-foundation-platform';
import { Injectable } from '@searsuite/sear-foundation-di';

import {
  RenderContext,
  type EventWithOffset,
  type RenderImageData,
  type RenderImageSource,
  type RenderPaint,
} from '@searsuite/sear-render-context';




/**
 * Browser Canvas2D implementation of the platform-neutral RenderContext.
 *
 * The context keeps device-pixel-ratio and logical view scale separate so
 * render strategies can work in shared world/view coordinates while the canvas
 * writes to the correct raster backing store.
 */
@Injectable()
export class WebCanvasRenderContext extends RenderContext {
  readonly #platform: Platform | undefined;

  /** DI token for resolving the visible canvas render context. */
  public static readonly symbol: symbol = Symbol.for('WebCanvasRenderContext');

  /** Native Canvas2D context that receives drawing commands. */
  #context: CanvasRenderingContext2D;
  /** Raster pixels represented by one host-view unit. */
  #devicePixelRatio: number = 2;
  /** Logical sheet zoom scale applied on top of raster scale. */
  #viewScale: number = 1;
  /** Largest stroke width seen since construction, used for dirty erase padding. */
  #maxLineWidth: number = 1;
  #transform: Matrix = this.#identityTransform();
  readonly #transformStack: Matrix[] = [];
  #disposeResize: (() => void) | null = null;

  /**
   * Constructs a Canvas render context from a host canvas.
   * @param renderTarget - HTMLCanvasElement supplied by the host adapter.
   */
  constructor(renderTarget: unknown, readbackOptimized: boolean = false, platform?: Platform) {
    super();
    this.#platform = platform;
    const canvas = renderTarget as HTMLCanvasElement;
    // Keep visual canvases on the browser's normal accelerated path.  Only the
    // detached hit layer needs frequent synchronous pixel reads.
    const context = canvas.getContext('2d', { willReadFrequently: readbackOptimized });
    if (!context) throw new SearError('CanvasRenderingContext2D not found');
    this.#context = context;
  }

  /**
   * Initializes canvas sizing and marks the canvas with the shared render-context token.
   * @param scale - Device pixel ratio used for backing-store dimensions.
   */
  override initialize(scale: number): void {
    const { canvas } = this.#context;
    canvas.setAttribute('data-symbol', RenderContext.symbol.toString());
    // Off-screen and hit canvases are detached clones, so their
    // clientWidth/clientHeight are zero. Preserve the source canvas's
    // logical viewport from its backing-store dimensions in that case.
    const width = canvas.clientWidth || Math.round(canvas.width / scale);
    const height = canvas.clientHeight || Math.round(canvas.height / scale);
    this.resize(width, height, scale);
    this.setLineWidth(1);
  }

  /**
   * Resizes the canvas backing store for a logical host viewport.
   * @param width - Host-view width.
   * @param height - Host-view height.
   * @param scale - Raster scale to apply to the backing store.
   */
  override resize(width: number, height: number, scale: number = this.#devicePixelRatio): void {
    this.#devicePixelRatio = scale;
    const { canvas } = this.#context;
    canvas.width = Math.max(Math.round(width * scale), 1);
    canvas.height = Math.max(Math.round(height * scale), 1);
    this.#applyNativeTransform(this.#transform);
    this.isDrawn = false;
  }

  /**
   * Updates the logical view scale used by sheet zoom.
   * @param scale - New view scale.
   */
  override setViewScale(scale: number): void {
    this.#viewScale = scale;
    this.isDrawn = false;
  }

  /** Returns the logical view scale. */
  override getViewScale(): number {
    return this.#viewScale;
  }

  /** Returns the host-view to raster scale, excluding logical sheet zoom. */
  override getRasterScale(): number {
    // View scale changes the world-to-view transform, not the view-to-
    // raster ratio. Pointer positions are already in host-view units.
    return this.#devicePixelRatio;
  }

  /** @inheritdoc */
  moveTo(x: number, y: number): void {
    const point = this.#normalizePoint(x, y);
    this.#context.moveTo(point.x, point.y);
  }

  /** @inheritdoc */
  lineTo(x: number, y: number): void {
    const point = this.#normalizePoint(x, y);
    this.#context.lineTo(point.x, point.y);
  }

  /** @inheritdoc */
  clip(): void {
    this.#context.clip();
  }
  /** @inheritdoc */
  drawImage(image: RenderImageSource, x: number, y: number): void;
  /** @inheritdoc */
  drawImage(image: RenderImageSource, x: number, y: number, width: number, height: number): void;
  /** @inheritdoc */
  drawImage(
    image: RenderImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
  ): void;
  /** @inheritdoc */
  drawImage(
    image: RenderImageSource,
    x: number,
    y: number,
    width?: number,
    height?: number,
    sx?: number,
    sy?: number,
    sWidth?: number,
    sHeight?: number,
  ): void {
    const nativeImage = image as CanvasImageSource;
    const coordinateScale = this.#devicePixelRatio * this.#viewScale;
    const point = this.#normalizePoint(x, y);
    if (width === void 0 || height === void 0) {
      // 3 parameters: image, x, y
      this.#context.drawImage(nativeImage, point.x, point.y);
    } else if (sx === void 0 || sy === void 0 || sWidth === void 0 || sHeight === void 0) {
      // 5 parameters: image, x, y, width, height
      this.#context.drawImage(nativeImage, point.x, point.y, width * coordinateScale, height * coordinateScale);
    } else {
      // 9 parameters: image, x, y, width, height, sx, sy, sWidth, sHeight
      // Source coordinates address the backing store directly, while the
      // destination coordinates are transformed by the active context.
      // They therefore need the same CSS-to-backing-store conversion.
      this.#context.drawImage(
        nativeImage,
        sx * coordinateScale,
        sy * coordinateScale,
        sWidth * coordinateScale,
        sHeight * coordinateScale,
        point.x,
        point.y,
        width,
        height,
      );
    }
  }

  /**
   * Writes raw pixel data to the backing context.
   * @param imageData - Compact image data shape used by RenderContext.
   * @param x - Raster x-coordinate.
   * @param y - Raster y-coordinate.
   */
  putImageData(
    imageData: RenderImageData,
    x: number,
    y: number,
  ): void {
    const imageDataObj = new ImageData(new Uint8ClampedArray(imageData.data[0]), imageData.width, imageData.height);
    this.#context.putImageData(imageDataObj, x, y);
  }

  /**
   * Applies a transform in shared view coordinates.
   *
   * Translation and scale are multiplied by raster and view scale so callers do
   * not need to reason about canvas backing-store pixels.
   */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.#transform = [a, b, c, d, e, f];
    this.#applyNativeTransform(this.#transform);
  }
  /** @inheritdoc */
  translate(x: number, y: number): void {
    this.#transform = this.#multiply(this.#transform, [1, 0, 0, 1, x, y]);
    this.#applyNativeTransform(this.#transform);
  }
  /** @inheritdoc */
  resetTransform(): void {
    this.#transform = this.#identityTransform();
    this.#context.resetTransform();
  }
  /** @inheritdoc */
  getRenderTarget(): HTMLCanvasElement {
    return this.#context.canvas;
  }
  /** @inheritdoc */
  setAttribute(name: string, value: string): void {
    this.#context.canvas.setAttribute(name, value);
  }
  /** @inheritdoc */
  getAttribute(name: string): string {
    return this.#context.canvas.getAttribute(name) || '';
  }

  /** @inheritdoc */
  public getRoot() {
    return this.#context.canvas;
  }

  //#region status
  /** @inheritdoc */
  save(): void {
    this.#transformStack.push(this.#transform);
    this.#context.save();
  }
  /** @inheritdoc */
  restore(): void {
    const previous = this.#transformStack.pop();
    if (previous) this.#transform = previous;
    this.#context.restore();
  }

  /** @inheritdoc */
  setFont(font: string): void {
    this.#context.font = font;
  }
  /** @inheritdoc */
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    const point = this.#normalizePoint(x, y);
    if (maxWidth) this.#context.fillText(text, point.x, point.y, maxWidth);
    else this.#context.fillText(text, point.x, point.y);
  }
  /** @inheritdoc */
  measureText(text: string): {
    width: number;
    height: number;
    fontAscent?: number;
    fontDescent?: number;
  } {
    const metrics = this.#context.measureText(text);
    const width = Math.max(
      Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight),
      metrics.width,
    );
    // fontBoundingBox gives the full em-square height (same as browser <input> cursor height)
    const fontAscent: number | undefined =
      metrics.fontBoundingBoxAscent != null ? Math.abs(metrics.fontBoundingBoxAscent) : void 0;
    const fontDescent: number | undefined =
      metrics.fontBoundingBoxDescent != null ? Math.abs(metrics.fontBoundingBoxDescent) : void 0;
    // Use font bounding box for height so it stays constant across all characters
    // in the same font (actualBoundingBox varies per glyph — e.g. 'y' has a larger
    // descent than 'a' — which would cause the centering formula to shift text
    // downward whenever a descender character is added).
    const height =
      fontAscent !== void 0 && fontDescent !== void 0
        ? fontAscent + fontDescent
        : Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent);
    return {
      width: width || metrics.width,
      height,
      ...(fontAscent !== void 0 && { fontAscent }),
      ...(fontDescent !== void 0 && { fontDescent }),
    };
  }

  /** @inheritdoc */
  beginPath(): void {
    this.#context.beginPath();
  }

  /** @inheritdoc */
  closePath(): void {
    this.#context.closePath();
  }

  /** @inheritdoc */
  fill(): void {
    this.#context.fill();
  }

  /** @inheritdoc */
  setLineWidth(width: number): void {
    this.#context.lineWidth = width;
    this.#maxLineWidth = Math.max(this.#maxLineWidth, width);
  }
  /** @inheritdoc */
  getLineWidth(): number {
    return this.#context.lineWidth;
  }
  /** @inheritdoc */
  getMaxLineWidth(): number {
    return this.#maxLineWidth;
  }
  /** @inheritdoc */
  setLineDash(segments: number[]): void {
    this.#context.setLineDash(segments);
  }

  /** @inheritdoc */
  stroke(): void {
    this.#context.stroke();
  }

  /** @inheritdoc */
  rect(x: number, y: number, width: number, height: number): void {
    const point = this.#normalizePoint(x, y);
    this.#context.rect(point.x, point.y, width, height);
  }

  /** @inheritdoc */
  clearRect(x: number, y: number, width: number, height: number): void {
    // this.context.clearRect(x, y, width * this.devicePixelRatio, height * this.devicePixelRatio);
    const point = this.#normalizePoint(x, y);
    this.#context.clearRect(point.x, point.y, width, height);
  }

  /** @inheritdoc */
  strokeRect(x: number, y: number, width: number, height: number): void {
    const point = this.#normalizePoint(x, y);
    this.#context.strokeRect(point.x, point.y, width, height);
  }

  /** @inheritdoc */
  setStrokeStyle(strokeStyle: RenderPaint): void {
    this.#context.strokeStyle = strokeStyle as CanvasRenderingContext2D['strokeStyle'];
  }

  /** @inheritdoc */
  setFillStyle(fillStyle: RenderPaint): void {
    this.#context.fillStyle = fillStyle as CanvasRenderingContext2D['fillStyle'];
  }

  /** @inheritdoc */
  getImageData(x: number, y: number, width: number, height: number) {
    // const imageData = this.context.getImageData(x * CanvasContext.ratio, y * CanvasContext.ratio, width, height);
    const imageData = this.#context.getImageData(x, y, width, height);
    return {
      data: [Array.from(imageData.data) as [number, number, number, number]],
      width: imageData.width,
      height: imageData.height,
    };
  }

  /** Creates a detached render context used by hit rendering. */
  createHitNode() {
    return this.#cloneCanvas(true);
  }

  /** Clones the backing canvas dimensions into a detached WebCanvasRenderContext. */
  cloneNode() {
    return this.#cloneCanvas(false);
  }

  /** Clones the backing canvas with pixel-readback settings for its intended layer. */
  #cloneCanvas(readbackOptimized: boolean): WebCanvasRenderContext {
    const canvas = this.#context.canvas.cloneNode() as HTMLCanvasElement;
    canvas.width = this.#context.canvas.width;
    canvas.height = this.#context.canvas.height;
    return new WebCanvasRenderContext(canvas, readbackOptimized, this.#platform);
  }

  #identityTransform(): Matrix {
    return [1, 0, 0, 1, 0, 0];
  }

  #multiply(left: Matrix, right: Matrix): Matrix {
    const [a, b, c, d, e, f] = left;
    const [na, nb, nc, nd, ne, nf] = right;
    return [
      a * na + c * nb,
      b * na + d * nb,
      a * nc + c * nd,
      b * nc + d * nd,
      a * ne + c * nf + e,
      b * ne + d * nf + f,
    ];
  }

  #getTransformNormalization(): { offsetX: number; offsetY: number; transform: Matrix } | null {
    return getLargeTranslationNormalization(this.#transform);
  }

  #normalizePoint(x: number, y: number): { x: number; y: number } {
    const normalization = this.#getTransformNormalization();
    if (!normalization) return { x, y };
    return { x: x + normalization.offsetX, y: y + normalization.offsetY };
  }

  #applyNativeTransform(transform: Matrix): void {
    const [a, b, c, d, e, f] = getLargeTranslationNormalization(transform)?.transform ?? transform;
    this.#context.setTransform(
      a * this.#devicePixelRatio * this.#viewScale,
      b,
      c,
      d * this.#devicePixelRatio * this.#viewScale,
      e * this.#devicePixelRatio * this.#viewScale,
      f * this.#devicePixelRatio * this.#viewScale,
    );
  }

  //#region EventListener
  /** Registers a host pointer event listener on the canvas root. */
  addEventListener(type: string, callBack: (event: EventWithOffset) => void): () => void {
    return this.#bindMouseEvent(type, callBack);
  }
  /** @inheritdoc */
  addClickEventListener(callBack: (event: EventWithOffset) => void): void {
    this.#bindMouseEvent(PlatformEventName.Click, callBack);
  }
  /** @inheritdoc */
  removeClickEventListener(callBack: (event: EventWithOffset) => void): void {
    throw new SearError(
      'WebCanvasRenderContext.removeClickEventListener is not supported; use Platform-owned event wiring for disposable listeners.',
    );
  }

  /** @inheritdoc */
  addMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    this.#bindMouseEvent(PlatformEventName.MouseDown, callBack);
  }
  /** @inheritdoc */
  removeMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    throw new SearError(
      'WebCanvasRenderContext.removeMouseDownEventListener is not supported; use Platform-owned event wiring for disposable listeners.',
    );
  }

  /** @inheritdoc */
  addMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    this.#bindMouseEvent(PlatformEventName.MouseMove, callBack);
  }
  /** @inheritdoc */
  removeMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    throw new SearError(
      'WebCanvasRenderContext.removeMouseMoveEventListener is not supported; use Platform-owned event wiring for disposable listeners.',
    );
  }

  /** @inheritdoc */
  addMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    this.#bindMouseEvent(PlatformEventName.MouseUp, callBack);
  }
  /** @inheritdoc */
  removeMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    throw new SearError(
      'WebCanvasRenderContext.removeMouseUpEventListener is not supported; use Platform-owned event wiring for disposable listeners.',
    );
  }

  /** @inheritdoc */
  addResizeListener(callBack: () => void): void {
    this.#disposeResize?.();
    const root = this.getRoot() as HTMLCanvasElement;
    this.#disposeResize =
      this.#platform?.observeResize(root, (size) => {
        if (size.width !== root.width || size.height !== root.height) callBack();
      }) ?? null;
  }

  /** Bridges a native mouse event to the shared EventWithOffset listener shape. */
  #bindMouseEvent(type: string, callBack: (event: EventWithOffset) => void): () => void {
    if (this.#platform) {
      return this.#platform.addEventListener(this.getRoot(), type, (event) => callBack(event as EventWithOffset));
    }
    return function removeCanvasMouseEvent(): void {};
  }
  /** @inheritdoc */
  removeResizeListener(): void {
    this.#disposeResize?.();
    this.#disposeResize = null;
  }
  //#endregion
}
