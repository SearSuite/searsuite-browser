import { SearError } from '@searsuite/sear-foundation-error';

export interface WebGLTextureEntry {
  readonly height: number;
  readonly texture: WebGLTexture;
  readonly width: number;
}

/** Lazily uploads host image sources and reuses their WebGL textures. */
export class WebGLTextureCache {
  private readonly entries = new WeakMap<object, WebGLTextureEntry>();

  public constructor(private readonly gl: WebGLRenderingContext) {}

  public get(source: unknown): WebGLTextureEntry {
    if (!source || typeof source !== 'object') throw new SearError('WebWebGLRenderContext requires an image object.');
    const cached = this.entries.get(source);
    if (cached) {
      if (isDynamicSource(source)) this.upload(cached.texture, source);
      return cached;
    }
    const dimensions = readDimensions(source);
    const texture = this.gl.createTexture();
    if (!texture) throw new SearError('WebWebGLRenderContext could not create an image texture.');
    const gl = this.gl;
    this.upload(texture, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const entry = { ...dimensions, texture };
    this.entries.set(source, entry);
    return entry;
  }

  private upload(texture: WebGLTexture, source: object): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
  }
}

function readDimensions(source: object): { width: number; height: number } {
  const value = source as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
  const width = value.videoWidth ?? value.width;
  const height = value.videoHeight ?? value.height;
  if (!width || !height) throw new SearError('WebWebGLRenderContext could not read image dimensions.');
  return { width, height };
}

function isDynamicSource(source: object): boolean {
  return typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement;
}
