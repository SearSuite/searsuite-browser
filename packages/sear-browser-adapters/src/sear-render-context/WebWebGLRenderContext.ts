import { Injectable } from '@searsuite/sear-foundation-di';
import { SearError } from '@searsuite/sear-foundation-error';
import { PlatformEventName, type Platform } from '@searsuite/sear-foundation-platform';

import {
  RenderContext,
  type EventWithOffset,
  type RenderImageData,
  type RenderImageSource,
  type RenderPaint,
} from '@searsuite/sear-render-context';
import { WebCanvasRenderContext } from './WebCanvasRenderContext';
import { parseWebGLColor, type WebGLColor } from './webgl/WebGLColor';
import { WebGLGlyphAtlas } from './webgl/WebGLGlyphAtlas';
import { WebGLNativeRenderer, type WebGLRasterClip } from './webgl/WebGLNativeRenderer';
import { WebGLTextureCache } from './webgl/WebGLTextureCache';

type Matrix = readonly [number, number, number, number, number, number];
type Point = readonly [number, number];
interface WebGLPath {
  readonly polygons: Point[][];
  readonly rectangles: Point[][];
}
interface WebGLRenderState {
  readonly clip: WebGLRasterClip | null;
  readonly fill: WebGLColor;
  readonly font: string;
  readonly lineDash: readonly number[];
  readonly lineWidth: number;
  readonly stroke: WebGLColor;
  readonly transform: Matrix;
}

/**
 * Native WebGL implementation of the platform-neutral RenderContext.
 *
 * Geometry, images, and shaped text quads are submitted directly to GPU buffers.
 * Canvas2D is used only to measure text and rasterize complete runs into texture
 * atlases; it never receives scene or complete-frame drawing.
 *
 * @example
 * const context = new WebWebGLRenderContext(canvas, platform);
 * context.initialize(window.devicePixelRatio);
 */
@Injectable()
export class WebWebGLRenderContext extends RenderContext {
  public static readonly symbol: symbol = Symbol.for('WebWebGLRenderContext');
  private readonly target: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private readonly renderer: WebGLNativeRenderer;
  private readonly textures: WebGLTextureCache;
  private readonly measureContext: CanvasRenderingContext2D;
  private readonly glyphAtlases = new Map<string, WebGLGlyphAtlas>();
  private readonly stateStack: WebGLRenderState[] = [];
  private state: WebGLRenderState = defaultState();
  private path: WebGLPath = emptyPath();
  private currentPolygon: Point[] | null = null;
  private devicePixelRatio = 1;
  private viewScale = 1;
  private maxLineWidth = 1;
  private disposeResize: (() => void) | null = null;

  public constructor(renderTarget: unknown, private readonly platform?: Platform) {
    super();
    this.target = renderTarget as HTMLCanvasElement;
    const ownerDocument = this.target.ownerDocument;
    if (!ownerDocument) throw new SearError('WebWebGLRenderContext requires a canvas owned by a document.');
    const gl = this.target.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
      stencil: true,
    });
    if (!gl) throw new SearError('WebGLRenderingContext not found');
    this.gl = gl;
    this.renderer = new WebGLNativeRenderer(gl);
    this.textures = new WebGLTextureCache(gl);
    const measureContext = ownerDocument.createElement('canvas').getContext('2d', { willReadFrequently: false });
    if (!measureContext) throw new SearError('WebWebGLRenderContext could not create a text measurer.');
    this.measureContext = measureContext;
  }

  override requiresFrameRebuild(): boolean {
    return true;
  }

  override supportsDirtyRedraw(): boolean {
    return false;
  }

  override requiresExplicitNodeClear(): boolean {
    return false;
  }

  override beginFrame(): void {
    this.renderer.clear({ x: 0, y: 0, width: this.target.width, height: this.target.height });
    this.isDrawn = false;
  }

  override initialize(scale: number = 1): void {
    this.target.setAttribute('data-symbol', RenderContext.symbol.toString());
    this.target.setAttribute('data-renderer', 'webgl-native');
    const width = this.target.clientWidth || Math.round(this.target.width / scale) || 1;
    const height = this.target.clientHeight || Math.round(this.target.height / scale) || 1;
    this.resize(width, height, scale);
    this.setLineWidth(1);
  }

  override resize(width: number, height: number, scale: number = this.devicePixelRatio): void {
    this.devicePixelRatio = scale;
    this.target.width = Math.max(Math.round(width * scale), 1);
    this.target.height = Math.max(Math.round(height * scale), 1);
    this.renderer.resize(this.target.width, this.target.height);
    this.renderer.clear({ x: 0, y: 0, width: this.target.width, height: this.target.height });
    this.isDrawn = false;
  }

  override setViewScale(scale: number): void {
    this.viewScale = scale;
    this.isDrawn = false;
  }
  override getViewScale(): number {
    return this.viewScale;
  }
  override getRasterScale(): number {
    return this.devicePixelRatio;
  }
  override getRenderTarget(): HTMLCanvasElement {
    return this.target;
  }
  override setAttribute(name: string, value: string): void {
    this.target.setAttribute(name, value);
  }
  override getAttribute(name: string): string {
    return this.target.getAttribute(name) || '';
  }
  override getRoot(): HTMLCanvasElement {
    return this.target;
  }
  override save(): void {
    this.stateStack.push(cloneState(this.state));
  }
  override restore(): void {
    this.state = this.stateStack.pop() ?? this.state;
  }
  override beginPath(): void {
    this.path = emptyPath();
    this.currentPolygon = null;
  }
  override closePath(): void {
    const polygon = this.currentPolygon;
    if (polygon && polygon.length > 1) polygon.push(polygon[0]!);
  }

  override fill(): void {
    const vertices: number[] = [];
    for (const rectangle of this.path.rectangles) appendFan(vertices, rectangle);
    for (const polygon of this.path.polygons) appendFan(vertices, polygon);
    this.renderer.solid(vertices, this.state.fill, this.state.clip);
    this.didDraw(vertices.length > 0);
  }

  override stroke(): void {
    const vertices: number[] = [];
    for (const rectangle of this.path.rectangles)
      appendStroke(vertices, [...rectangle, rectangle[0]!], this.rasterLineWidth(), this.rasterDash());
    for (const polygon of this.path.polygons)
      appendStroke(vertices, polygon, this.rasterLineWidth(), this.rasterDash());
    this.renderer.solid(vertices, this.state.stroke, this.state.clip);
    this.didDraw(vertices.length > 0);
  }

  override rect(x: number, y: number, width: number, height: number): void {
    this.path.rectangles.push([
      this.transformPoint(x, y),
      this.transformPoint(x + width, y),
      this.transformPoint(x + width, y + height),
      this.transformPoint(x, y + height),
    ]);
  }

  override clearRect(x: number, y: number, width: number, height: number): void {
    const rectangle = [
      this.transformPoint(x, y),
      this.transformPoint(x + width, y),
      this.transformPoint(x + width, y + height),
      this.transformPoint(x, y + height),
    ];
    const clip = intersectClips(this.state.clip, bounds(rectangle));
    if (clip) this.renderer.clear(clip);
  }

  override strokeRect(x: number, y: number, width: number, height: number): void {
    const points = [
      this.transformPoint(x, y),
      this.transformPoint(x + width, y),
      this.transformPoint(x + width, y + height),
      this.transformPoint(x, y + height),
    ];
    const vertices: number[] = [];
    appendStroke(vertices, [...points, points[0]!], this.rasterLineWidth(), this.rasterDash());
    this.renderer.solid(vertices, this.state.stroke, this.state.clip);
    this.didDraw(vertices.length > 0);
  }

  override setLineWidth(width: number): void {
    // Match CanvasRenderingContext2D: zero, negative, NaN, and infinite values
    // are ignored so callers keep the current positive line width.
    if (!Number.isFinite(width) || width <= 0) return;
    this.state = { ...this.state, lineWidth: width };
    this.maxLineWidth = Math.max(this.maxLineWidth, width);
  }
  override getLineWidth(): number {
    return this.state.lineWidth;
  }
  override getMaxLineWidth(): number {
    return this.maxLineWidth;
  }
  override setLineDash(segments: number[]): void {
    this.state = { ...this.state, lineDash: segments.filter((value) => value > 0) };
  }
  override setStrokeStyle(strokeStyle: RenderPaint): void {
    this.state = { ...this.state, stroke: parseWebGLColor(strokeStyle) };
  }
  override setFillStyle(fillStyle: RenderPaint): void {
    this.state = { ...this.state, fill: parseWebGLColor(fillStyle) };
  }
  override clip(): void {
    const points = [...this.path.rectangles.flat(), ...this.path.polygons.flat()];
    if (points.length > 0) this.state = { ...this.state, clip: intersectClips(this.state.clip, bounds(points)) };
  }
  override moveTo(x: number, y: number): void {
    const polygon = [this.transformPoint(x, y)];
    this.path.polygons.push(polygon);
    this.currentPolygon = polygon;
  }
  override lineTo(x: number, y: number): void {
    if (!this.currentPolygon) this.moveTo(x, y);
    else this.currentPolygon.push(this.transformPoint(x, y));
  }
  override setFont(font: string): void {
    this.state = { ...this.state, font };
    this.measureContext.font = font;
  }

  override fillText(text: string, x: number, y: number, maxWidth?: number): void {
    if (!text) return;
    const measuredWidth = this.measureText(text).width;
    const rasterScale = Math.min(this.rasterCoordinateScale(), 2032 / Math.max(1, measuredWidth));
    const scaledFont = scaleFont(this.state.font, rasterScale);
    const preserveColor = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u20E3/u.test(text);
    const color = preserveColor ? this.state.fill : undefined;
    const atlasKey = `${scaledFont}\0${color?.join(',') ?? ''}`;
    let atlas = this.glyphAtlases.get(atlasKey);
    if (!atlas) {
      atlas = new WebGLGlyphAtlas(this.gl, scaledFont, this.target.ownerDocument, color);
      this.glyphAtlases.set(atlasKey, atlas);
    }
    const widthScale = maxWidth && measuredWidth > maxWidth ? maxWidth / measuredWidth : 1;
    const vertices: number[] = [];
    const glyph = atlas.glyph(text);
    const left = x + (glyph.left / rasterScale) * widthScale;
    const top = y + glyph.top / rasterScale;
    const right = left + (glyph.width / rasterScale) * widthScale;
    const bottom = top + glyph.height / rasterScale;
    appendTexturedQuad(vertices, [
      this.transformPoint(left, top),
      this.transformPoint(right, top),
      this.transformPoint(right, bottom),
      this.transformPoint(left, bottom),
    ], glyph.u0, glyph.v0, glyph.u1, glyph.v1);
    this.renderer.textured(vertices, atlas.bind(), preserveColor ? [1, 1, 1, 1] : this.state.fill, this.state.clip);
    this.didDraw(vertices.length > 0);
  }

  override measureText(text: string): {
    width: number;
    height: number;
    fontAscent?: number;
    fontDescent?: number;
    fontLineGap?: number;
  } {
    this.measureContext.font = this.state.font;
    const metrics = this.measureContext.measureText(text);
    const fontAscent =
      finite(metrics.fontBoundingBoxAscent) ?? finite(metrics.actualBoundingBoxAscent) ?? fontSize(this.state.font);
    const fontDescent = finite(metrics.fontBoundingBoxDescent) ?? finite(metrics.actualBoundingBoxDescent) ?? 0;
    return { width: metrics.width, height: fontAscent + fontDescent, fontAscent, fontDescent };
  }

  override getImageData(x: number, y: number, width: number, height: number): RenderImageData {
    const rasterWidth = Math.max(1, Math.round(width));
    const rasterHeight = Math.max(1, Math.round(height));
    const pixels = new Uint8Array(rasterWidth * rasterHeight * 4);
    this.gl.readPixels(
      Math.round(x),
      this.target.height - Math.round(y + height),
      rasterWidth,
      rasterHeight,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels,
    );
    const data: [number, number, number, number][] = [];
    for (let row = rasterHeight - 1; row >= 0; row--)
      for (let column = 0; column < rasterWidth; column++) {
        const offset = (row * rasterWidth + column) * 4;
        data.push([pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!]);
      }
    return { data, width: rasterWidth, height: rasterHeight };
  }

  override putImageData(imageData: RenderImageData, x: number, y: number): void {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new SearError('WebWebGLRenderContext could not create an image-data texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      flattenPixels(imageData.data),
    );
    const vertices: number[] = [];
    appendTexturedQuad(
      vertices,
      [
        [x, y],
        [x + imageData.width, y],
        [x + imageData.width, y + imageData.height],
        [x, y + imageData.height],
      ],
      0,
      0,
      1,
      1,
    );
    this.renderer.textured(vertices, texture, [1, 1, 1, 1], null);
    gl.deleteTexture(texture);
    this.didDraw(true);
  }

  override drawImage(image: RenderImageSource, x: number, y: number): void;
  override drawImage(image: RenderImageSource, x: number, y: number, width: number, height: number): void;
  override drawImage(
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
  override drawImage(
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
    const entry = this.textures.get(image);
    const destinationWidth = width ?? entry.width / this.rasterCoordinateScale();
    const destinationHeight = height ?? entry.height / this.rasterCoordinateScale();
    const sourceScale = this.rasterCoordinateScale();
    const sourceX = sx === undefined ? 0 : sx * sourceScale;
    const sourceY = sy === undefined ? 0 : sy * sourceScale;
    const sourceWidth = sWidth === undefined ? entry.width : sWidth * sourceScale;
    const sourceHeight = sHeight === undefined ? entry.height : sHeight * sourceScale;
    const vertices: number[] = [];
    appendTexturedQuad(
      vertices,
      [
        this.transformPoint(x, y),
        this.transformPoint(x + destinationWidth, y),
        this.transformPoint(x + destinationWidth, y + destinationHeight),
        this.transformPoint(x, y + destinationHeight),
      ],
      sourceX / entry.width,
      sourceY / entry.height,
      (sourceX + sourceWidth) / entry.width,
      (sourceY + sourceHeight) / entry.height,
    );
    this.renderer.textured(vertices, entry.texture, [1, 1, 1, 1], this.state.clip);
    this.didDraw(true);
  }

  override translate(x: number, y: number): void {
    this.state = { ...this.state, transform: multiply(this.state.transform, [1, 0, 0, 1, x, y]) };
  }
  override resetTransform(): void {
    this.state = { ...this.state, transform: identityTransform() };
  }
  override setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.state = { ...this.state, transform: [a, b, c, d, e, f] };
  }
  override cloneNode(): WebWebGLRenderContext {
    const clone = this.target.cloneNode() as HTMLCanvasElement;
    clone.width = this.target.width;
    clone.height = this.target.height;
    return new WebWebGLRenderContext(clone, this.platform);
  }
  override createHitNode(): WebCanvasRenderContext {
    const canvas = this.target.ownerDocument.createElement('canvas');
    canvas.width = this.target.width;
    canvas.height = this.target.height;
    return new WebCanvasRenderContext(canvas, true, this.platform);
  }
  override addEventListener(type: string, callback: (event: EventWithOffset) => void): () => void {
    return (
      this.platform?.addEventListener(this.target, type, (event) => callback(event as EventWithOffset)) ?? (() => {})
    );
  }
  override addClickEventListener(callback: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.Click, callback);
  }
  override removeClickEventListener(): void {
    throw this.unsupportedRemoval('removeClickEventListener');
  }
  override addMouseDownEventListener(callback: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseDown, callback);
  }
  override removeMouseDownEventListener(): void {
    throw this.unsupportedRemoval('removeMouseDownEventListener');
  }
  override addMouseMoveEventListener(callback: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseMove, callback);
  }
  override removeMouseMoveEventListener(): void {
    throw this.unsupportedRemoval('removeMouseMoveEventListener');
  }
  override addMouseUpEventListener(callback: (event: EventWithOffset) => void): void {
    this.addEventListener(PlatformEventName.MouseUp, callback);
  }
  override removeMouseUpEventListener(): void {
    throw this.unsupportedRemoval('removeMouseUpEventListener');
  }
  override addResizeListener(callback: () => void): void {
    this.disposeResize?.();
    this.disposeResize = this.platform?.observeResize(this.target, callback) ?? null;
  }
  override removeResizeListener(): void {
    this.disposeResize?.();
    this.disposeResize = null;
  }

  private transformPoint(x: number, y: number): Point {
    const [a, b, c, d, e, f] = this.state.transform;
    const scale = this.rasterCoordinateScale();
    return [(a * x + c * y + e) * scale, (b * x + d * y + f) * scale];
  }
  private rasterCoordinateScale(): number {
    return this.devicePixelRatio * this.viewScale;
  }
  private rasterLineWidth(): number {
    return Math.max(0, this.state.lineWidth * this.rasterCoordinateScale());
  }
  private rasterDash(): readonly number[] {
    return this.state.lineDash.map((value) => value * this.rasterCoordinateScale());
  }
  private didDraw(drawn: boolean): void {
    if (drawn) this.isDrawn = true;
  }
  private unsupportedRemoval(method: string): SearError {
    return new SearError(
      `WebWebGLRenderContext.${method} is not supported; use Platform-owned event wiring for disposable listeners.`,
    );
  }
}

function defaultState(): WebGLRenderState {
  return {
    clip: null,
    fill: [0, 0, 0, 1],
    font: '10px sans-serif',
    lineDash: [],
    lineWidth: 1,
    stroke: [0, 0, 0, 1],
    transform: identityTransform(),
  };
}
function cloneState(state: WebGLRenderState): WebGLRenderState {
  return {
    ...state,
    clip: state.clip ? { ...state.clip } : null,
    lineDash: [...state.lineDash],
    transform: [...state.transform] as unknown as Matrix,
  };
}
function emptyPath(): WebGLPath {
  return { polygons: [], rectangles: [] };
}
function identityTransform(): Matrix {
  return [1, 0, 0, 1, 0, 0];
}
function multiply(left: Matrix, right: Matrix): Matrix {
  const [a, b, c, d, e, f] = left;
  const [na, nb, nc, nd, ne, nf] = right;
  return [a * na + c * nb, b * na + d * nb, a * nc + c * nd, b * nc + d * nd, a * ne + c * nf + e, b * ne + d * nf + f];
}
function appendFan(vertices: number[], points: readonly Point[]): void {
  if (points.length < 3) return;
  for (let index = 1; index < points.length - 1; index++)
    appendTriangle(vertices, points[0]!, points[index]!, points[index + 1]!);
}
function appendTriangle(vertices: number[], first: Point, second: Point, third: Point): void {
  vertices.push(...first, ...second, ...third);
}

function appendStroke(vertices: number[], points: readonly Point[], width: number, dash: readonly number[]): void {
  if (width <= 0) return;
  let dashIndex = 0;
  let dashRemaining = dash[0] ?? Infinity;
  let drawing = true;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    let consumed = 0;
    while (consumed < length) {
      const segment = Math.min(length - consumed, dashRemaining);
      if (drawing)
        appendLineQuad(
          vertices,
          [start[0] + (dx * consumed) / length, start[1] + (dy * consumed) / length],
          [start[0] + (dx * (consumed + segment)) / length, start[1] + (dy * (consumed + segment)) / length],
          width,
        );
      consumed += segment;
      dashRemaining -= segment;
      if (dashRemaining <= 0 && dash.length > 0) {
        dashIndex = (dashIndex + 1) % dash.length;
        dashRemaining = dash[dashIndex] ?? Infinity;
        drawing = !drawing;
      }
    }
  }
}

function appendLineQuad(vertices: number[], start: Point, end: Point, width: number): void {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const nx = ((-(end[1] - start[1]) / length) * width) / 2;
  const ny = (((end[0] - start[0]) / length) * width) / 2;
  const a: Point = [start[0] + nx, start[1] + ny];
  const b: Point = [end[0] + nx, end[1] + ny];
  const c: Point = [end[0] - nx, end[1] - ny];
  const d: Point = [start[0] - nx, start[1] - ny];
  appendTriangle(vertices, a, b, c);
  appendTriangle(vertices, a, c, d);
}

function appendTexturedQuad(
  vertices: number[],
  points: readonly Point[],
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): void {
  const [a, b, c, d] = points;
  if (!a || !b || !c || !d) return;
  vertices.push(
    a[0],
    a[1],
    u0,
    v0,
    b[0],
    b[1],
    u1,
    v0,
    c[0],
    c[1],
    u1,
    v1,
    a[0],
    a[1],
    u0,
    v0,
    c[0],
    c[1],
    u1,
    v1,
    d[0],
    d[1],
    u0,
    v1,
  );
}

function bounds(points: readonly Point[]): WebGLRasterClip {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
function intersectClips(first: WebGLRasterClip | null, second: WebGLRasterClip): WebGLRasterClip | null {
  if (!first) return second;
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  return right <= x || bottom <= y ? null : { x, y, width: right - x, height: bottom - y };
}
function scaleFont(font: string, scale: number): string {
  return font.replace(/([\d.]+)px/, (_, size: string) => `${Number(size) * scale}px`);
}
function fontSize(font: string): number {
  return Number(/([\d.]+)px/.exec(font)?.[1] ?? 10);
}
function finite(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}
function flattenPixels(data: readonly [number, number, number, number][]): Uint8Array {
  return new Uint8Array(data.flat());
}
