import { getLargeTranslationNormalization, type Matrix } from './WebRenderTransform';

export function normalizePathData(data: string, offsetX: number, offsetY: number): string | null {
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

export function normalizeTranslatedElement(element: SVGElement, transform: Matrix): Matrix {
  const normalization = getLargeTranslationNormalization(transform);
  if (!normalization) return transform;

  const { offsetX, offsetY } = normalization;
  if (element.localName === 'path') {
    const normalizedData = normalizePathData(element.getAttribute('d') ?? '', offsetX, offsetY);
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
