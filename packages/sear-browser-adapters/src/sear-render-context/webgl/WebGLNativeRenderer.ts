import { SearError } from '@searsuite/sear-foundation-error';
import type { WebGLColor } from './WebGLColor';
import { createWebGLProgram } from './WebGLProgram';

export interface WebGLRasterClip {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/** Low-level solid and textured triangle renderer shared by WebGL draw operations. */
export class WebGLNativeRenderer {
  readonly #gl: WebGLRenderingContext;

  readonly #solidProgram: WebGLProgram;
  readonly #textureProgram: WebGLProgram;
  readonly #solidBuffer: WebGLBuffer;
  readonly #textureBuffer: WebGLBuffer;

  public constructor(gl: WebGLRenderingContext) {
    this.#gl = gl;
    this.#solidProgram = createWebGLProgram(gl, vertexShader(false), solidFragmentShader);
    this.#textureProgram = createWebGLProgram(gl, vertexShader(true), textureFragmentShader);
    const solidBuffer = gl.createBuffer();
    const textureBuffer = gl.createBuffer();
    if (!solidBuffer || !textureBuffer) throw new SearError('WebWebGLRenderContext could not create vertex buffers.');
    this.#solidBuffer = solidBuffer;
    this.#textureBuffer = textureBuffer;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
  }

  public resize(width: number, height: number): void {
    this.#gl.viewport(0, 0, width, height);
  }

  public clear(clip: WebGLRasterClip): void {
    const gl = this.#gl;
    this.#applyClip(clip);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
  }

  public solid(vertices: readonly number[], color: WebGLColor, clip: WebGLRasterClip | null): void {
    if (vertices.length === 0) return;
    const gl = this.#gl;
    gl.useProgram(this.#solidProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#solidBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    const position = gl.getAttribLocation(this.#solidProgram, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.#setResolution(this.#solidProgram);
    gl.uniform4f(gl.getUniformLocation(this.#solidProgram, 'u_color'), color[0], color[1], color[2], color[3]);
    this.#withClip(clip, () => gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2));
  }

  public textured(
    vertices: readonly number[],
    texture: WebGLTexture,
    color: WebGLColor,
    clip: WebGLRasterClip | null,
  ): void {
    if (vertices.length === 0) return;
    const gl = this.#gl;
    gl.useProgram(this.#textureProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    const position = gl.getAttribLocation(this.#textureProgram, 'a_position');
    const texCoord = gl.getAttribLocation(this.#textureProgram, 'a_texCoord');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);
    this.#setResolution(this.#textureProgram);
    gl.uniform4f(gl.getUniformLocation(this.#textureProgram, 'u_color'), color[0], color[1], color[2], color[3]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(this.#textureProgram, 'u_texture'), 0);
    this.#withClip(clip, () => gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4));
  }

  #setResolution(program: WebGLProgram): void {
    this.#gl.uniform2f(this.#gl.getUniformLocation(program, 'u_resolution'), this.#gl.canvas.width, this.#gl.canvas.height);
  }

  #withClip(clip: WebGLRasterClip | null, draw: () => void): void {
    if (clip) this.#applyClip(clip);
    draw();
    if (clip) this.#gl.disable(this.#gl.SCISSOR_TEST);
  }

  #applyClip(clip: WebGLRasterClip): void {
    const gl = this.#gl;
    const x = Math.max(0, Math.floor(clip.x));
    const y = Math.max(0, Math.floor(gl.canvas.height - clip.y - clip.height));
    const width = Math.max(0, Math.ceil(Math.min(clip.width, gl.canvas.width - x)));
    const height = Math.max(0, Math.ceil(Math.min(clip.height, gl.canvas.height - y)));
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, width, height);
  }
}

const solidFragmentShader = `
precision mediump float;
uniform vec4 u_color;
void main() { gl_FragColor = vec4(u_color.rgb * u_color.a, u_color.a); }
`;

const textureFragmentShader = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec4 u_color;
varying vec2 v_texCoord;
void main() { gl_FragColor = texture2D(u_texture, v_texCoord) * u_color; }
`;

function vertexShader(textured: boolean): string {
  return `
attribute vec2 a_position;
${textured ? 'attribute vec2 a_texCoord; varying vec2 v_texCoord;' : ''}
uniform vec2 u_resolution;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
  ${textured ? 'v_texCoord = a_texCoord;' : ''}
}
`;
}
