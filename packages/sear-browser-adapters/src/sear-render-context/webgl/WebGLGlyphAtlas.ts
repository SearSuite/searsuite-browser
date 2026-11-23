import { SearError } from '@searsuite/sear-foundation-error';
import { type WebGLColor } from './WebGLColor';

export interface WebGLGlyph {
  readonly advance: number;
  readonly ascent: number;
  readonly descent: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
  readonly width: number;
}

const atlasSize = 2048;
const glyphPadding = 2;

/** Per-font text-run atlas; Canvas2D shapes each run before WebGL paints it. */
export class WebGLGlyphAtlas {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly texture: WebGLTexture;
  private readonly glyphs = new Map<string, WebGLGlyph>();
  private cursorX = glyphPadding;
  private cursorY = glyphPadding;
  private rowHeight = 0;
  private dirty = true;

  public constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly font: string,
    ownerDocument: Document,
    color?: WebGLColor,
  ) {
    this.canvas = ownerDocument.createElement('canvas');
    this.canvas.width = atlasSize;
    this.canvas.height = atlasSize;
    const context = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!context) throw new SearError('WebWebGLRenderContext could not create a glyph rasterizer.');
    this.context = context;
    this.context.font = font;
    this.context.textBaseline = 'alphabetic';
    this.context.fillStyle = color
      ? `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`
      : '#ffffff';
    this.context.globalAlpha = color?.[3] ?? 1;
    const texture = gl.createTexture();
    if (!texture) throw new SearError('WebWebGLRenderContext could not create a glyph texture.');
    this.texture = texture;
    this.configureTexture();
  }

  public measure(text: string): ReturnType<CanvasRenderingContext2D['measureText']> {
    this.context.font = this.font;
    return this.context.measureText(text);
  }

  public glyph(text: string): WebGLGlyph {
    const cached = this.glyphs.get(text);
    if (cached) return cached;

    this.context.font = this.font;
    const metrics = this.context.measureText(text);
    const left = Math.ceil(Math.abs(metrics.actualBoundingBoxLeft ?? 0));
    const right = Math.ceil(Math.abs(metrics.actualBoundingBoxRight ?? metrics.width));
    const ascent = Math.ceil(Math.abs(metrics.actualBoundingBoxAscent ?? this.fontSize()));
    const descent = Math.ceil(Math.abs(metrics.actualBoundingBoxDescent ?? 0));
    const width = Math.max(1, left + right);
    const height = Math.max(1, ascent + descent);
    const allocationWidth = width + glyphPadding * 2;
    const allocationHeight = height + glyphPadding * 2;
    if (this.cursorX + allocationWidth > atlasSize) {
      this.cursorX = glyphPadding;
      this.cursorY += this.rowHeight;
      this.rowHeight = 0;
    }
    if (this.cursorY + allocationHeight > atlasSize) {
      this.context.clearRect(0, 0, atlasSize, atlasSize);
      this.glyphs.clear();
      this.cursorX = glyphPadding;
      this.cursorY = glyphPadding;
      this.rowHeight = 0;
    }
    if (allocationWidth + glyphPadding > atlasSize || allocationHeight + glyphPadding > atlasSize)
      throw new SearError(`WebWebGLRenderContext text run exceeds its atlas for font: ${this.font}`);

    const drawX = this.cursorX + glyphPadding + left;
    const drawBaseline = this.cursorY + glyphPadding + ascent;
    this.context.fillText(text, drawX, drawBaseline);
    const glyph: WebGLGlyph = {
      advance: metrics.width,
      ascent,
      descent,
      height,
      left: -left,
      top: -ascent,
      u0: (this.cursorX + glyphPadding) / atlasSize,
      u1: (this.cursorX + glyphPadding + width) / atlasSize,
      v0: (this.cursorY + glyphPadding) / atlasSize,
      v1: (this.cursorY + glyphPadding + height) / atlasSize,
      width,
    };
    this.glyphs.set(text, glyph);
    this.cursorX += allocationWidth;
    this.rowHeight = Math.max(this.rowHeight, allocationHeight);
    this.dirty = true;
    return glyph;
  }

  public bind(): WebGLTexture {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.dirty) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
      this.dirty = false;
    }
    return this.texture;
  }

  private configureTexture(): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private fontSize(): number {
    return Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 10);
  }
}
