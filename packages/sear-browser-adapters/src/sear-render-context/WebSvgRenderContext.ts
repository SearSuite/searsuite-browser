import { SearError } from '@searsuite/sear-foundation-error';
import { Injectable } from '@searsuite/sear-foundation-di';
import { PlatformEventName, type Platform } from '@searsuite/sear-foundation-platform';
import { StandardColor } from '@searsuite/sear-foundation-utils';

import {
  RenderContext,
  type EventWithOffset,
  type RenderImageData,
  type RenderImageSource,
  type RenderNodeSemantics,
  type RenderPaint,
} from '@searsuite/sear-render-context';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
// Browser rasterizers lose stroke/text precision when large world coordinates
// are paired with equally large inverse scroll transforms. Above this render-
// only threshold, fold translation into retained SVG geometry before appending.
const LARGE_TRANSLATION_THRESHOLD = 1_000_000;

type Matrix = readonly [number, number, number, number, number, number];

interface SvgContextState {
  readonly transform: Matrix;
  readonly clips: SVGPathElement[];
  readonly lineDash: number[];
  readonly lineWidth: number;
  readonly strokeStyle: RenderPaint;
  readonly fillStyle: RenderPaint;
  readonly font: string;
}

/**
 * Production SVG implementation of the platform-neutral RenderContext.
 *
 * SVG is retained-mode while Canvas is immediate-mode. The context therefore
 * preserves paint order in SVG groups and applies later clearRect operations as
 * masks to earlier groups. A detached Canvas mirror supplies the raster-only
 * APIs (text metrics and hit-image reads) required by the shared engine.
 */
@Injectable()
export class WebSvgRenderContext extends RenderContext {
  /** DI token for resolving the SVG render context. */
  public static readonly symbol: symbol = Symbol.for('WebSvgRenderContext');

  private readonly root: SVGSVGElement;
  private readonly definitions: SVGDefsElement;
  private readonly rasterCanvas: HTMLCanvasElement;
  private readonly rasterContext: CanvasRenderingContext2D;
  private readonly stateStack: SvgContextState[] = [];
  private readonly resizeListeners = new Map<() => void, (() => void) | { disconnect(): void }>();
  private readonly eventDisposers = new Map<(event: EventWithOffset) => void, () => void>();
  private currentPath: SVGPathElement;
  private state: SvgContextState = WebSvgRenderContext.defaultState();
  private paintRoot!: SVGGElement;
  private currentPaintGroup!: SVGGElement;
  private rasterScale = 1;
  private viewScale = 1;
  private maxLineWidth = 1;
  private nodeSemantics: RenderNodeSemantics | null = null;
  private width = 1;
  private height = 1;
  private nextDefinitionId = 0;

  /**
   * Creates an SVG render context with a detached raster mirror for Canvas-only APIs.
   * @param root - SVG element that receives retained draw output.
   * @param platform - Optional platform diagnostics adapter.
   */
  public constructor(root: unknown, private readonly platform?: Platform) {
    super();
    this.root = root as SVGSVGElement;
    this.definitions = this.createElement('defs');
    this.root.replaceChildren(this.definitions);
    this.currentPath = this.createElement('path');
    this.rasterCanvas = this.root.ownerDocument.createElement('canvas');
    const rasterContext = this.rasterCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    if (!rasterContext) throw new SearError('CanvasRenderingContext2D not found');
    this.rasterContext = rasterContext;
    this.createPaintRoot();
  }

  /** @inheritdoc */
  public override getRenderTarget(): SVGSVGElement {
    return this.root;
  }

  /** @inheritdoc */
  public override requiresFrameRebuild(): boolean {
    return true;
  }

  /** @inheritdoc */
  public override supportsDirtyRedraw(): boolean {
    return false;
  }

  /** @inheritdoc */
  public override requiresExplicitNodeClear(): boolean {
    return false;
  }

  /** @inheritdoc */
  public override resetHitFrame(_width: number, _height: number): void {
    this.beginFrame();
  }

  /** @inheritdoc */
  public override beginNodeSemantics(semantics: RenderNodeSemantics): void {
    this.nodeSemantics = semantics;
  }

  /** @inheritdoc */
  public override endNodeSemantics(): void {
    this.nodeSemantics = null;
  }

  /** Replaces retained SVG output before a full shared-engine render pass. */
  public override beginFrame(): void {
    this.currentPath = this.createElement('path');
    this.state = { ...this.state, clips: [] };
    this.definitions.replaceChildren();
    this.root.replaceChildren(this.definitions);
    this.createPaintRoot();
    this.rasterContext.save();
    this.rasterContext.resetTransform();
    this.rasterContext.clearRect(0, 0, this.rasterCanvas.width, this.rasterCanvas.height);
    this.rasterContext.restore();
  }

  /** @inheritdoc */
  public override setAttribute(name: string, value: string): void {
    this.root.setAttribute(name, value);
  }

  /** @inheritdoc */
  public override getAttribute(name: string): string {
    return this.root.getAttribute(name) ?? '';
  }

  /** @inheritdoc */
  public override initialize(scale: number = 1): void {
    this.root.setAttribute('data-symbol', RenderContext.symbol.toString());
    // An SVG styled with CSS commonly has no width/height attributes. Reading
    // only attributes would initialize a 1×1 viewBox, which the browser then
    // stretches to the host view and makes every sheet primitive (including
    // text) appear oversized. Match WebCanvasRenderContext by taking the host's
    // logical viewport first and using attributes only for detached clones.
    const width = this.root.clientWidth || this.readDimension('width');
    const height = this.root.clientHeight || this.readDimension('height');
    this.resize(width, height, scale);
    this.setLineWidth(1);
  }

  /** @inheritdoc */
  public override resize(width: number, height: number, scale: number = this.rasterScale): void {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.rasterScale = scale;
    this.root.setAttribute('width', String(this.width));
    this.root.setAttribute('height', String(this.height));
    this.updateViewBox();
    this.rasterCanvas.width = Math.max(Math.round(this.width * scale), 1);
    this.rasterCanvas.height = Math.max(Math.round(this.height * scale), 1);
    this.rasterContext.resetTransform();
    this.resetSvgState();
    this.isDrawn = false;
  }

  /** @inheritdoc */
  public override setViewScale(scale: number): void {
    this.viewScale = scale;
    this.updateViewBox();
    this.isDrawn = false;
  }

  /** @inheritdoc */
  public override getViewScale(): number {
    return this.viewScale;
  }

  /** @inheritdoc */
  public override getRasterScale(): number {
    return this.rasterScale;
  }

  /** @inheritdoc */
  public override save(): void {
    this.stateStack.push(this.cloneState(this.state));
    this.rasterContext.save();
  }

  /** @inheritdoc */
  public override restore(): void {
    const previous = this.stateStack.pop();
    if (!previous) return;
    this.state = previous;
    this.rasterContext.restore();
  }

  /** @inheritdoc */
  public override getRoot(): SVGSVGElement {
    return this.root;
  }

  /** @inheritdoc */
  public override addEventListener(type: string, callBack: (event: EventWithOffset) => void): () => void {
    if (this.platform) {
      const dispose = this.platform.addEventListener(this.root, type, (event) => callBack(event as EventWithOffset));
      this.eventDisposers.set(callBack, dispose);
      return () => {
        dispose();
        this.eventDisposers.delete(callBack);
      };
    }
    return (): void => {};
  }

  /** @inheritdoc */
  public override addClickEventListener(callBack: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.Click, callBack);
  }

  /** @inheritdoc */
  public override removeClickEventListener(callBack: (event: EventWithOffset) => void): void {
    this.eventDisposers.get(callBack)?.();
  }

  /** @inheritdoc */
  public override addMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseDown, callBack);
  }

  /** @inheritdoc */
  public override removeMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    this.eventDisposers.get(callBack)?.();
  }

  /** @inheritdoc */
  public override addMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseMove, callBack);
  }

  /** @inheritdoc */
  public override removeMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    this.eventDisposers.get(callBack)?.();
  }

  /** @inheritdoc */
  public override addMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseUp, callBack);
  }

  /** @inheritdoc */
  public override removeMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    this.eventDisposers.get(callBack)?.();
  }

  /** @inheritdoc */
  public override addResizeListener(callBack: () => void): void {
    this.removeResizeListener();
    const dispose = this.platform?.observeResize(this.root, () => callBack()) ?? (() => {});
    this.resizeListeners.set(callBack, dispose);
  }

  /** @inheritdoc */
  public override removeResizeListener(): void {
    this.resizeListeners.forEach((dispose) => {
      if (typeof dispose === 'function') dispose();
      else dispose.disconnect();
    });
    this.resizeListeners.clear();
  }

  /** @inheritdoc */
  public override beginPath(): void {
    this.currentPath = this.createElement('path');
    this.rasterContext.beginPath();
  }

  /** @inheritdoc */
  public override closePath(): void {
    this.appendPathCommand('Z');
    this.rasterContext.closePath();
  }

  /** @inheritdoc */
  public override fill(): void {
    const path = this.clonePath();
    path.setAttribute('fill', this.toSvgPaint(this.state.fillStyle));
    path.setAttribute('stroke', 'none');
    this.appendPaintElement(path);
    this.rasterContext.fill();
  }

  /** @inheritdoc */
  public override stroke(): void {
    const path = this.clonePath();
    path.setAttribute('fill', 'none');
    this.applyStroke(path);
    this.appendPaintElement(path);
    this.rasterContext.stroke();
  }

  /** @inheritdoc */
  public override rect(x: number, y: number, width: number, height: number): void {
    this.appendPathCommand(`M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`);
    this.rasterContext.rect(x, y, width, height);
  }

  /** @inheritdoc */
  public override clearRect(x: number, y: number, width: number, height: number): void {
    const clearShape = this.createElement('rect');
    clearShape.setAttribute('x', String(x));
    clearShape.setAttribute('y', String(y));
    clearShape.setAttribute('width', String(width));
    clearShape.setAttribute('height', String(height));
    clearShape.setAttribute('fill', 'black');
    clearShape.setAttribute(
      'transform',
      this.matrixValue(this.normalizeTranslatedElement(clearShape, this.state.transform)),
    );
    const mask = this.createClearMask(clearShape);
    const previousPaint = this.createElement('g');
    previousPaint.setAttribute('mask', `url(#${mask.id})`);
    previousPaint.append(this.paintRoot);
    const nextPaintRoot = this.createElement('g');
    nextPaintRoot.append(previousPaint);
    const nextPaintGroup = this.createElement('g');
    nextPaintRoot.append(nextPaintGroup);
    this.root.append(nextPaintRoot);
    this.paintRoot = nextPaintRoot;
    this.currentPaintGroup = nextPaintGroup;
    this.rasterContext.clearRect(x, y, width, height);
  }

  /** @inheritdoc */
  public override strokeRect(x: number, y: number, width: number, height: number): void {
    const rect = this.createElement('rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', 'none');
    this.applyStroke(rect);
    this.appendPaintElement(rect);
    this.rasterContext.strokeRect(x, y, width, height);
  }

  /** @inheritdoc */
  public override setLineWidth(width: number): void {
    // Canvas ignores invalid line widths and retains the previous value. SVG
    // accepts zero and renders no stroke, so normalize here to preserve the
    // shared RenderContext contract.
    if (!Number.isFinite(width) || width <= 0) return;
    this.state = { ...this.state, lineWidth: width };
    this.maxLineWidth = Math.max(this.maxLineWidth, width);
    this.rasterContext.lineWidth = width;
  }

  /** @inheritdoc */
  public override getLineWidth(): number {
    return this.state.lineWidth;
  }

  /** @inheritdoc */
  public override getMaxLineWidth(): number {
    return this.maxLineWidth;
  }

  /** @inheritdoc */
  public override setLineDash(segments: number[]): void {
    this.state = { ...this.state, lineDash: [...segments] };
    this.rasterContext.setLineDash(segments);
  }

  /** @inheritdoc */
  public override setStrokeStyle(strokeStyle: RenderPaint): void {
    this.state = { ...this.state, strokeStyle };
    this.rasterContext.strokeStyle = strokeStyle as CanvasRenderingContext2D['strokeStyle'];
  }

  /** @inheritdoc */
  public override setFillStyle(fillStyle: RenderPaint): void {
    this.state = { ...this.state, fillStyle };
    this.rasterContext.fillStyle = fillStyle as CanvasRenderingContext2D['fillStyle'];
  }

  /** @inheritdoc */
  public override clip(): void {
    const clipPath = this.clonePath();
    clipPath.setAttribute(
      'transform',
      this.matrixValue(this.normalizeTranslatedElement(clipPath, this.state.transform)),
    );
    this.state = { ...this.state, clips: [...this.state.clips, clipPath] };
    this.rasterContext.clip();
  }

  /** @inheritdoc */
  public override moveTo(x: number, y: number): void {
    this.appendPathCommand(`M ${x} ${y}`);
    this.rasterContext.moveTo(x, y);
  }

  /** @inheritdoc */
  public override lineTo(x: number, y: number): void {
    this.appendPathCommand(`L ${x} ${y}`);
    this.rasterContext.lineTo(x, y);
  }

  /** @inheritdoc */
  public override setFont(font: string): void {
    this.state = { ...this.state, font };
    this.rasterContext.font = font;
  }

  /** @inheritdoc */
  public override fillText(text: string, x: number, y: number, maxWidth?: number): void {
    const element = this.createElement('text');
    element.textContent = text;
    element.setAttribute('x', String(x));
    element.setAttribute('y', String(y));
    element.setAttribute('fill', this.toSvgPaint(this.state.fillStyle));
    // `font` is a Canvas font shorthand, not a dependable SVG presentation
    // attribute. Browsers may ignore it and inherit the page's default 16px
    // font instead of Canvas's 10px default. Apply it as an inline CSS
    // declaration so SVG uses the exact same font syntax and visual size.
    element.style.setProperty('font', this.state.font);
    element.style.setProperty('white-space', 'pre');
    // Text selection is owned by the document editor's pointer-selection
    // plugin; native SVG selection would bypass its document selection state.
    element.style.setProperty('user-select', 'none');
    if (maxWidth !== void 0 && this.rasterContext.measureText(text).width > maxWidth) {
      element.setAttribute('textLength', String(maxWidth));
      element.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    this.appendPaintElement(element);
    if (maxWidth === void 0) this.rasterContext.fillText(text, x, y);
    else this.rasterContext.fillText(text, x, y, maxWidth);
  }

  /** @inheritdoc */
  public override measureText(text: string): {
    width: number;
    height: number;
    fontAscent?: number;
    fontDescent?: number;
  } {
    const metrics = this.rasterContext.measureText(text);
    const fontAscent = metrics.fontBoundingBoxAscent;
    const fontDescent = metrics.fontBoundingBoxDescent;
    return {
      width: Math.max(
        Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight),
        metrics.width,
      ),
      height:
        fontAscent !== void 0 && fontDescent !== void 0
          ? Math.abs(fontAscent) + Math.abs(fontDescent)
          : Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent),
      ...(fontAscent !== void 0 && { fontAscent: Math.abs(fontAscent) }),
      ...(fontDescent !== void 0 && { fontDescent: Math.abs(fontDescent) }),
    };
  }

  /** @inheritdoc */
  public override getImageData(
    x: number,
    y: number,
    width: number,
    height: number,
  ): {
    data: [number, number, number, number][];
    width: number;
    height: number;
  } {
    const imageData = this.rasterContext.getImageData(x, y, width, height);
    return {
      data: [Array.from(imageData.data) as [number, number, number, number]],
      width: imageData.width,
      height: imageData.height,
    };
  }

  /** @inheritdoc */
  public override putImageData(
    imageData: RenderImageData,
    x: number,
    y: number,
  ): void {
    const data = new Uint8ClampedArray(imageData.data[0]);
    const rasterImage = new ImageData(data, imageData.width, imageData.height);
    this.rasterContext.putImageData(rasterImage, x, y);
    const image = this.createElement('image');
    image.setAttribute('x', String(x));
    image.setAttribute('y', String(y));
    image.setAttribute('width', String(imageData.width));
    image.setAttribute('height', String(imageData.height));
    image.setAttribute('href', this.createImageDataUrl(rasterImage));
    this.appendPaintElement(image);
  }

  /** @inheritdoc */
  public drawImage(image: RenderImageSource, x: number, y: number): void;
  /** @inheritdoc */
  public drawImage(image: RenderImageSource, x: number, y: number, width: number, height: number): void;
  /** @inheritdoc */
  public drawImage(
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
  public drawImage(
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
    const destinationWidth = width ?? this.imageWidth(image);
    const destinationHeight = height ?? this.imageHeight(image);
    const sourceX = sx ?? 0;
    const sourceY = sy ?? 0;
    const sourceWidth = sWidth ?? this.imageWidth(image);
    const sourceHeight = sHeight ?? this.imageHeight(image);
    const imageElement = this.createElement('image');
    imageElement.setAttribute('href', this.imageHref(image));
    imageElement.setAttribute('preserveAspectRatio', 'none');
    imageElement.setAttribute('x', String(x - (sourceX * destinationWidth) / sourceWidth));
    imageElement.setAttribute('y', String(y - (sourceY * destinationHeight) / sourceHeight));
    imageElement.setAttribute('width', String((this.imageWidth(image) * destinationWidth) / sourceWidth));
    imageElement.setAttribute('height', String((this.imageHeight(image) * destinationHeight) / sourceHeight));
    if (sx !== void 0 && sy !== void 0 && sWidth !== void 0 && sHeight !== void 0) {
      this.applyClipRect(imageElement, x, y, destinationWidth, destinationHeight);
    }
    this.appendPaintElement(imageElement);
    // SVG-to-SVG copies are used by the screen cache. Browsers cannot draw an
    // SVGSVGElement directly into a CanvasRenderingContext2D synchronously, so
    // the SVG target remains authoritative for that copy. Hit contexts never
    // use the screen cache path and continue to use the raster mirror.
    if (image instanceof SVGElement) {
      this.platform?.warn('WebSvgRenderContext drawImage skipped raster mirror for SVG image source.', {
        localName: image.localName,
      });
      return;
    }
      const nativeImage = image as CanvasImageSource;
      if (width === void 0 || height === void 0) this.rasterContext.drawImage(nativeImage, x, y);
      else if (sx === void 0 || sy === void 0 || sWidth === void 0 || sHeight === void 0)
        this.rasterContext.drawImage(nativeImage, x, y, width, height);
      else this.rasterContext.drawImage(nativeImage, sx, sy, sWidth, sHeight, x, y, width, height);
  }

  /** @inheritdoc */
  public override translate(x: number, y: number): void {
    this.state = {
      ...this.state,
      transform: WebSvgRenderContext.multiply(this.state.transform, [1, 0, 0, 1, x, y]),
    };
    this.rasterContext.translate(x, y);
  }

  /** @inheritdoc */
  public override resetTransform(): void {
    this.state = { ...this.state, transform: [1, 0, 0, 1, 0, 0] };
    this.rasterContext.resetTransform();
  }

  /** @inheritdoc */
  public override setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.state = { ...this.state, transform: [a, b, c, d, e, f] };
    this.rasterContext.setTransform(
      a * this.rasterScale * this.viewScale,
      b,
      c,
      d * this.rasterScale * this.viewScale,
      e * this.rasterScale * this.viewScale,
      f * this.rasterScale * this.viewScale,
    );
  }

  /** @inheritdoc */
  public override cloneNode(): WebSvgRenderContext {
    const clone = this.root.ownerDocument.createElementNS(SVG_NAMESPACE, 'svg');
    clone.setAttribute('width', String(this.width));
    clone.setAttribute('height', String(this.height));
    const context = new WebSvgRenderContext(clone, this.platform);
    context.initialize(this.rasterScale);
    context.setViewScale(this.viewScale);
    return context;
  }

  /** @inheritdoc */
  public override createHitNode(): WebSvgRenderContext {
    return this.cloneNode();
  }

  private static defaultState(): SvgContextState {
    return {
      transform: [1, 0, 0, 1, 0, 0],
      clips: [],
      lineDash: [],
      lineWidth: 1,
      strokeStyle: StandardColor.Black,
      fillStyle: StandardColor.Black,
      font: '10px sans-serif',
    };
  }

  private static multiply(left: Matrix, right: Matrix): Matrix {
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

  private static getLargeTranslationNormalization(
    transform: Matrix,
  ): { offsetX: number; offsetY: number; transform: Matrix } | null {
    const [a, b, c, d, e, f] = transform;
    if (Math.abs(e) < LARGE_TRANSLATION_THRESHOLD && Math.abs(f) < LARGE_TRANSLATION_THRESHOLD) return null;

    const determinant = a * d - b * c;
    if (!Number.isFinite(determinant) || determinant === 0) return null;

    const offsetX = (d * e - c * f) / determinant;
    const offsetY = (-b * e + a * f) / determinant;
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;

    return {
      offsetX,
      offsetY,
      transform: [a, b, c, d, 0, 0],
    };
  }

  private static normalizePathData(data: string, offsetX: number, offsetY: number): string | null {
    const tokens = data.match(/[MLHVZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi);
    if (!tokens) return null;

    const parts: string[] = [];
    let index = 0;
    while (index < tokens.length) {
      const command = tokens[index]?.toUpperCase();
      index += 1;
      if (command === 'M' || command === 'L') {
        const x = Number(tokens[index]);
        const y = Number(tokens[index + 1]);
        index += 2;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        parts.push(command, String(x + offsetX), String(y + offsetY));
      } else if (command === 'H') {
        const x = Number(tokens[index]);
        index += 1;
        if (!Number.isFinite(x)) return null;
        parts.push(command, String(x + offsetX));
      } else if (command === 'V') {
        const y = Number(tokens[index]);
        index += 1;
        if (!Number.isFinite(y)) return null;
        parts.push(command, String(y + offsetY));
      } else if (command === 'Z') {
        parts.push(command);
      } else {
        return null;
      }
    }

    return parts.join(' ');
  }

  private cloneState(state: SvgContextState): SvgContextState {
    return { ...state, clips: [...state.clips], lineDash: [...state.lineDash] };
  }

  private resetSvgState(): void {
    this.stateStack.length = 0;
    this.state = WebSvgRenderContext.defaultState();
    this.maxLineWidth = 1;
    this.currentPath = this.createElement('path');
    this.definitions.replaceChildren();
    this.root.replaceChildren(this.definitions);
    this.createPaintRoot();
  }

  private createPaintRoot(): void {
    this.paintRoot = this.createElement('g');
    this.currentPaintGroup = this.createElement('g');
    this.paintRoot.append(this.currentPaintGroup);
    this.root.append(this.paintRoot);
  }

  private createClearMask(clearShape: SVGElement): SVGMaskElement {
    const id = `sear-svg-mask-${this.nextDefinitionId}`;
    this.nextDefinitionId += 1;
    const mask = this.createElement('mask');
    mask.setAttribute('id', id);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    const background = this.createElement('rect');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', String(this.width));
    background.setAttribute('height', String(this.height));
    background.setAttribute('fill', 'white');
    mask.append(background);
    this.appendWithClips(mask, clearShape);
    this.definitions.append(mask);
    return mask;
  }

  private appendPaintElement(element: SVGElement, transform: Matrix = this.state.transform): void {
    if (this.nodeSemantics?.owner) element.setAttribute('data-sear-owner', this.nodeSemantics.owner);
    if (this.nodeSemantics?.role) element.setAttribute('data-sear-role', this.nodeSemantics.role);
    element.setAttribute('transform', this.matrixValue(this.normalizeTranslatedElement(element, transform)));
    this.appendWithClips(this.currentPaintGroup, element);
  }

  private normalizeTranslatedElement(element: SVGElement, transform: Matrix): Matrix {
    const normalization = WebSvgRenderContext.getLargeTranslationNormalization(transform);
    if (!normalization) return transform;

    const { offsetX, offsetY } = normalization;
    if (element.localName === 'path') {
      const normalizedData = WebSvgRenderContext.normalizePathData(element.getAttribute('d') ?? '', offsetX, offsetY);
      if (!normalizedData) return transform;
      element.setAttribute('d', normalizedData);
      return normalization.transform;
    }

    const rawX = element.getAttribute('x');
    const rawY = element.getAttribute('y');
    const x = rawX === null ? NaN : Number(rawX);
    const y = rawY === null ? NaN : Number(rawY);
    if (Number.isFinite(x)) element.setAttribute('x', String(x + offsetX));
    if (Number.isFinite(y)) element.setAttribute('y', String(y + offsetY));
    if (Number.isFinite(x) || Number.isFinite(y)) return normalization.transform;

    return transform;
  }

  private applyStroke(element: SVGElement): void {
    element.setAttribute('stroke', this.toSvgPaint(this.state.strokeStyle));
    element.setAttribute('stroke-width', String(this.state.lineWidth));
    if (this.state.lineDash.length) element.setAttribute('stroke-dasharray', this.state.lineDash.join(' '));
  }

  private appendWithClips(parent: SVGElement, element: SVGElement): void {
    let currentParent = parent;
    this.state.clips.forEach((clip) => {
      const id = `sear-svg-clip-${this.nextDefinitionId}`;
      this.nextDefinitionId += 1;
      const clipPath = this.createElement('clipPath');
      clipPath.setAttribute('id', id);
      clipPath.append(clip.cloneNode(true));
      this.definitions.append(clipPath);
      const group = this.createElement('g');
      group.setAttribute('clip-path', `url(#${id})`);
      currentParent.append(group);
      currentParent = group;
    });
    currentParent.append(element);
  }

  private applyClipRect(element: SVGElement, x: number, y: number, width: number, height: number): void {
    const id = `sear-svg-image-clip-${this.nextDefinitionId}`;
    this.nextDefinitionId += 1;
    const clipPath = this.createElement('clipPath');
    clipPath.setAttribute('id', id);
    const rect = this.createElement('rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    clipPath.append(rect);
    this.definitions.append(clipPath);
    element.setAttribute('clip-path', `url(#${id})`);
  }

  private clonePath(): SVGPathElement {
    return this.currentPath.cloneNode(true) as SVGPathElement;
  }

  private appendPathCommand(command: string): void {
    const existing = this.currentPath.getAttribute('d') ?? '';
    this.currentPath.setAttribute('d', `${existing} ${command}`.trim());
  }

  private matrixValue([a, b, c, d, e, f]: Matrix): string {
    return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
  }

  private toSvgPaint(value: RenderPaint): string {
    if (typeof value === 'string') return value;
    throw new SearError('WebSvgRenderContext requires SVG paint URLs for gradients and patterns.');
  }

  private imageHref(image: RenderImageSource): string {
    if (image instanceof HTMLImageElement) return image.currentSrc || image.src;
    if (image instanceof HTMLCanvasElement) return image.toDataURL();
    if (image instanceof SVGSVGElement) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(image))}`;
    }
    if (image instanceof SVGElement && image.localName === 'image') return image.getAttribute('href') ?? '';
    if (image instanceof HTMLVideoElement) return image.currentSrc;
    throw new SearError('WebSvgRenderContext cannot serialize this CanvasImageSource.');
  }

  private imageWidth(image: RenderImageSource): number {
    if (image instanceof HTMLImageElement) return image.naturalWidth || image.width;
    if (image instanceof HTMLCanvasElement) return image.width;
    if (image instanceof SVGSVGElement) return this.readSvgDimension(image, 'width');
    if (image instanceof SVGElement && image.localName === 'image') return Number(image.getAttribute('width')) || 0;
    if (image instanceof HTMLVideoElement) return image.videoWidth || image.width;
    throw new SearError('WebSvgRenderContext cannot read this CanvasImageSource width.');
  }

  private imageHeight(image: RenderImageSource): number {
    if (image instanceof HTMLImageElement) return image.naturalHeight || image.height;
    if (image instanceof HTMLCanvasElement) return image.height;
    if (image instanceof SVGSVGElement) return this.readSvgDimension(image, 'height');
    if (image instanceof SVGElement && image.localName === 'image') return Number(image.getAttribute('height')) || 0;
    if (image instanceof HTMLVideoElement) return image.videoHeight || image.height;
    throw new SearError('WebSvgRenderContext cannot read this CanvasImageSource height.');
  }

  private createImageDataUrl(imageData: ImageData): string {
    const canvas = this.root.ownerDocument.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const context = canvas.getContext('2d');
    if (!context) throw new SearError('CanvasRenderingContext2D not found');
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  private readDimension(name: 'width' | 'height'): number {
    return this.readSvgDimension(this.root, name);
  }

  private readSvgDimension(element: SVGSVGElement, name: 'width' | 'height'): number {
    const value = Number(element.getAttribute(name));
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private updateViewBox(): void {
    this.root.setAttribute('viewBox', `0 0 ${this.width / this.viewScale} ${this.height / this.viewScale}`);
  }

  private createElement<TagName extends keyof SVGElementTagNameMap>(tagName: TagName): SVGElementTagNameMap[TagName] {
    return this.root.ownerDocument.createElementNS(SVG_NAMESPACE, tagName);
  }
}
