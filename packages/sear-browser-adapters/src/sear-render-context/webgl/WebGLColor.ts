import { SearError } from '@searsuite/sear-foundation-error';
import type { RenderPaint } from '@searsuite/sear-render-context';

/** Normalized RGBA color consumed by WebGL shader uniforms. */
export type WebGLColor = readonly [number, number, number, number];

const namedColors: Readonly<Record<string, WebGLColor>> = {
  black: [0, 0, 0, 1],
  blue: [0, 0, 1, 1],
  gray: [0.5, 0.5, 0.5, 1],
  green: [0, 0.5019607843, 0, 1],
  red: [1, 0, 0, 1],
  transparent: [0, 0, 0, 0],
  white: [1, 1, 1, 1],
};

/** Parses the CSS color subset used by built-in Sheet and Doc render nodes. */
export function parseWebGLColor(paint: RenderPaint): WebGLColor {
  if (typeof paint !== 'string') {
    throw new SearError('WebWebGLRenderContext requires string colors for native WebGL drawing.');
  }

  const value = paint.trim().toLowerCase();
  const named = namedColors[value];
  if (named) return named;

  if (value.startsWith('#')) return parseHex(value);
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(value);
  if (rgb) {
    return [
      clamp(Number(rgb[1]) / 255),
      clamp(Number(rgb[2]) / 255),
      clamp(Number(rgb[3]) / 255),
      clamp(Number(rgb[4] ?? 1)),
    ];
  }

  throw new SearError(`WebWebGLRenderContext cannot parse color: ${paint}`);
}

function parseHex(value: string): WebGLColor {
  const hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    return [
      parseInt(hex[0]! + hex[0]!, 16) / 255,
      parseInt(hex[1]! + hex[1]!, 16) / 255,
      parseInt(hex[2]! + hex[2]!, 16) / 255,
      hex.length === 4 ? parseInt(hex[3]! + hex[3]!, 16) / 255 : 1,
    ];
  }
  if (hex.length === 6 || hex.length === 8) {
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
      hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    ];
  }
  throw new SearError(`WebWebGLRenderContext cannot parse color: ${value}`);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
