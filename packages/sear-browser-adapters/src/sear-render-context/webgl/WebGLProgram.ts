import { SearError } from '@searsuite/sear-foundation-error';

/** Compiles and links one WebGL shader program with stable diagnostics. */
export function createWebGLProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new SearError('WebWebGLRenderContext could not create a shader program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new SearError('WebWebGLRenderContext shader program failed to link.', {
      log: gl.getProgramInfoLog(program) ?? '',
    });
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new SearError('WebWebGLRenderContext could not create a shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new SearError('WebWebGLRenderContext shader failed to compile.', {
      log: gl.getShaderInfoLog(shader) ?? '',
    });
  }
  return shader;
}
