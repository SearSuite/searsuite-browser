import { type RenderImageSource } from '@searsuite/sear-render-context';
import { SearError } from '@searsuite/sear-foundation-error';

export function imageHref(image: RenderImageSource): string {
  if (image instanceof HTMLImageElement) return image.currentSrc || image.src;
  if (image instanceof HTMLCanvasElement) return image.toDataURL();
  if (image instanceof SVGSVGElement) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(image))}`;
  }
  if (image instanceof SVGElement && image.localName === 'image') return image.getAttribute('href') ?? '';
  if (image instanceof HTMLVideoElement) return image.currentSrc;
  throw new SearError('WebSvgRenderContext cannot serialize this CanvasImageSource.');
}

export function imageWidth(image: RenderImageSource): number {
  if (image instanceof HTMLImageElement) return image.naturalWidth || image.width;
  if (image instanceof HTMLCanvasElement) return image.width;
  if (image instanceof SVGSVGElement) return readSvgDimension(image, 'width');
  if (image instanceof SVGElement && image.localName === 'image') return Number(image.getAttribute('width')) || 0;
  if (image instanceof HTMLVideoElement) return image.videoWidth || image.width;
  throw new SearError('WebSvgRenderContext cannot read this CanvasImageSource width.');
}

export function imageHeight(image: RenderImageSource): number {
  if (image instanceof HTMLImageElement) return image.naturalHeight || image.height;
  if (image instanceof HTMLCanvasElement) return image.height;
  if (image instanceof SVGSVGElement) return readSvgDimension(image, 'height');
  if (image instanceof SVGElement && image.localName === 'image') return Number(image.getAttribute('height')) || 0;
  if (image instanceof HTMLVideoElement) return image.videoHeight || image.height;
  throw new SearError('WebSvgRenderContext cannot read this CanvasImageSource height.');
}

export function readSvgDimension(element: SVGSVGElement, name: 'width' | 'height'): number {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) && value > 0 ? value : 1;
}
