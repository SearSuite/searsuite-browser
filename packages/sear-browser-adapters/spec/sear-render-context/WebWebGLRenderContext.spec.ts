import { BrowserPlatform } from '@searsuite/sear-browser-adapters';

import { WebCanvasRenderContext } from '../../src/sear-render-context/WebCanvasRenderContext';
import { WebWebGLRenderContext } from '../../src/sear-render-context/WebWebGLRenderContext';

function createWebGLMock(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const shader = {} as WebGLShader;
  const program = {} as WebGLProgram;
  const texture = {} as WebGLTexture;
  const buffer = {} as WebGLBuffer;
  return {
    ARRAY_BUFFER: 0x8892,
    BLEND: 0x0be2,
    CLAMP_TO_EDGE: 0x812f,
    COLOR_BUFFER_BIT: 0x4000,
    COMPILE_STATUS: 0x8b81,
    DEPTH_TEST: 0x0b71,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    RGBA: 0x1908,
    SCISSOR_TEST: 0x0c11,
    STATIC_DRAW: 0x88e4,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TRIANGLES: 0x0004,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
    UNSIGNED_BYTE: 0x1401,
    VERTEX_SHADER: 0x8b31,
    activeTexture: jest.fn(),
    attachShader: jest.fn(),
    bindBuffer: jest.fn(),
    bindTexture: jest.fn(),
    blendFunc: jest.fn(),
    bufferData: jest.fn(),
    canvas,
    clear: jest.fn(),
    clearColor: jest.fn(),
    compileShader: jest.fn(),
    createBuffer: jest.fn(() => buffer),
    createProgram: jest.fn(() => program),
    createShader: jest.fn(() => shader),
    createTexture: jest.fn(() => texture),
    deleteShader: jest.fn(),
    deleteTexture: jest.fn(),
    disable: jest.fn(),
    drawArrays: jest.fn(),
    enable: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    getAttribLocation: jest.fn((_program, name) => (name === 'a_position' ? 0 : 1)),
    getProgramInfoLog: jest.fn(() => ''),
    getProgramParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    getShaderParameter: jest.fn(() => true),
    getUniformLocation: jest.fn(() => ({} as WebGLUniformLocation)),
    linkProgram: jest.fn(),
    pixelStorei: jest.fn(),
    readPixels: jest.fn(),
    scissor: jest.fn(),
    shaderSource: jest.fn(),
    texImage2D: jest.fn(),
    texParameteri: jest.fn(),
    useProgram: jest.fn(),
    uniform1i: jest.fn(),
    uniform2f: jest.fn(),
    uniform4f: jest.fn(),
    vertexAttribPointer: jest.fn(),
    viewport: jest.fn(),
  } as unknown as WebGLRenderingContext;
}

function createContext(): {
  canvas: HTMLCanvasElement;
  canvas2d: CanvasRenderingContext2D;
  gl: WebGLRenderingContext;
  render: WebWebGLRenderContext;
} {
  const canvas2d = document.createElement('canvas').getContext('2d')!;
  const canvas = document.createElement('canvas');
  const gl = createWebGLMock(canvas);
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function getContext(this: HTMLCanvasElement, type, options) {
      if (type === 'webgl') return gl;
      return canvas2d;
    });
  Object.defineProperties(canvas, {
    clientHeight: { configurable: true, value: 50 },
    clientWidth: { configurable: true, value: 100 },
  });
  return { canvas, canvas2d, gl, render: new WebWebGLRenderContext(canvas, new BrowserPlatform()) };
}

afterEach(() => jest.restoreAllMocks());

describe('WebWebGLRenderContext', () => {
  it('draws geometry and glyphs through native WebGL buffers', () => {
    const { canvas, canvas2d, gl, render } = createContext();
    const canvasRect = jest.spyOn(canvas2d, 'rect');
    render.initialize(2);
    render.setFillStyle('#fff');
    render.rect(0, 0, 10, 10);
    render.fill();
    render.fillText('WebGL', 2, 8);

    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(canvas.dataset['renderer']).toBe('webgl-native');
    expect(render.requiresFrameRebuild()).toBe(true);
    expect(render.supportsDirtyRedraw()).toBe(false);
    expect(render.requiresExplicitNodeClear()).toBe(false);
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
    expect(gl.bufferData).toHaveBeenCalled();
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 6);
    expect((gl.texImage2D as jest.Mock).mock.calls.some((call) => call.includes(canvas))).toBe(false);
    expect(canvasRect).not.toHaveBeenCalled();
  });

  it('shapes complex text as one run and preserves color glyphs', () => {
    const { canvas2d, gl, render } = createContext();
    const rasterize = jest.spyOn(canvas2d, 'fillText');
    rasterize.mockClear();
    render.initialize(1);
    render.setFont('12px sans-serif');
    render.setFillStyle('#222222');
    render.fillText('مرحبا بالعالم', 5, 15);
    render.fillText('שלום עולם', 5, 35);
    render.fillText('क्ष', 5, 55);
    render.fillText('👩‍💻', 5, 75);

    expect(rasterize.mock.calls.map(([text]) => text)).toEqual([
      'مرحبا بالعالم', 'שלום עולם', 'क्ष', '👩‍💻',
    ]);
    expect((gl.uniform4f as jest.Mock).mock.calls.map((call) => call.slice(1)))
      .toContainEqual([1, 1, 1, 1]);
  });

  it('supports transformed paths, clipping, dashes, pixels, and dynamic image textures', () => {
    const { gl, render } = createContext();
    render.initialize(2);
    render.save();
    render.translate(4, 5);
    render.beginPath();
    render.rect(0, 0, 20, 10);
    render.clip();
    render.setStrokeStyle('rgba(10, 20, 30, 0.5)');
    render.setLineWidth(2);
    render.setLineDash([3, 2]);
    render.beginPath();
    render.moveTo(0, 0);
    render.lineTo(20, 10);
    render.stroke();
    render.restore();
    render.putImageData({ data: [[1, 2, 3, 4]], width: 1, height: 1 }, 0, 0);
    const source = document.createElement('canvas');
    source.width = 10;
    source.height = 10;
    render.drawImage(source, 0, 0, 10, 10);
    render.drawImage(source, 0, 0, 10, 10);

    expect(gl.scissor).toHaveBeenCalled();
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
    expect((gl.texImage2D as jest.Mock).mock.calls.filter((call) => call.includes(source))).toHaveLength(2);
  });

  it('keeps the current line width when an invalid width is assigned', () => {
    const { gl, render } = createContext();
    render.initialize(1);

    render.setLineWidth(0);
    render.beginPath();
    render.rect(0.5, 0.5, 19, 9);
    render.stroke();

    expect(render.getLineWidth()).toBe(1);
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 24);

    render.setLineWidth(Number.NaN);
    render.setLineWidth(Number.POSITIVE_INFINITY);
    render.setLineWidth(-1);
    expect(render.getLineWidth()).toBe(1);
  });

  it('clears with scissor and preserves auxiliary layer contracts', () => {
    const { canvas, gl, render } = createContext();
    render.initialize(1);
    render.clearRect(0, 0, 10, 10);

    expect(render.getRenderTarget()).toBe(canvas);
    expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
    expect(gl.scissor).toHaveBeenCalled();
    expect(render.cloneNode()).toBeInstanceOf(WebWebGLRenderContext);
    expect(render.createHitNode()).toBeInstanceOf(WebCanvasRenderContext);
  });

  it('covers immediate-mode state, overloads, readback, and event contracts', () => {
    const { canvas, canvas2d, gl, render } = createContext();
    render.initialize(2);
    render.beginFrame();
    render.setViewScale(1.5);
    expect(render.getViewScale()).toBe(1.5);
    expect(render.getRasterScale()).toBe(2);

    render.restore();
    render.beginPath();
    render.clip();
    render.lineTo(0, 0);
    render.lineTo(0, 0);
    render.lineTo(10, 0);
    render.closePath();
    render.stroke();
    render.setTransform(1, 0, 0, 1, 2, 3);
    render.resetTransform();

    render.fillText('', 0, 0);
    jest.spyOn(canvas2d, 'measureText').mockReturnValue({ width: 20 } as TextMetrics);
    render.setFont('12px sans-serif');
    render.fillText('wide', 0, 12, 5);
    expect(render.measureText('fallback')).toMatchObject({ width: 20, fontAscent: 12, fontDescent: 0 });

    expect(render.getImageData(0, 0, 0, 0)).toEqual({ data: [[0, 0, 0, 0]], width: 1, height: 1 });
    const source = document.createElement('canvas');
    source.width = 8;
    source.height = 6;
    render.drawImage(source, 1, 2);
    render.drawImage(source, 1, 2, 4, 3, 1, 1, 2, 2);

    const callback = jest.fn();
    const dispose = render.addEventListener('click', callback);
    canvas.dispatchEvent(new MouseEvent('click'));
    dispose();
    canvas.dispatchEvent(new MouseEvent('click'));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(() => render.removeClickEventListener()).toThrow('use Platform-owned event wiring');
    expect(() => render.removeMouseDownEventListener()).toThrow('use Platform-owned event wiring');
    expect(() => render.removeMouseMoveEventListener()).toThrow('use Platform-owned event wiring');
    expect(() => render.removeMouseUpEventListener()).toThrow('use Platform-owned event wiring');
    expect(gl.readPixels).toHaveBeenCalled();
  });

  it('fails clearly when the host cannot create WebGL', () => {
    const canvas2d = document.createElement('canvas').getContext('2d');
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function getContext(this: HTMLCanvasElement, type, options) {
        if (type === 'webgl') return null;
        return canvas2d;
      });
    expect(() => new WebWebGLRenderContext(document.createElement('canvas'))).toThrow(
      'WebGLRenderingContext not found',
    );
  });
});
