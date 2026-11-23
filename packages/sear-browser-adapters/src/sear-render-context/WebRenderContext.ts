import { SearError } from '@searsuite/sear-foundation-error';
import { PlatformEventName, type Platform } from '@searsuite/sear-foundation-platform';
import {
  RenderContext,
  type EventWithOffset,
  type RenderImageData,
  type RenderImageSource,
  type RenderPaint,
} from '@searsuite/sear-render-context';

enum ELEMENTS {
  DIV = 'div',
}

enum POSITION {
  ABSOLUTE = 'absolute',
}

enum MEASURE {
  PX = 'px',
}

enum ATTRIBUTE {
  SOLID = 'solid',
}

enum HELPER {
  SPACE = ' ',
}

/** Experimental Web-backed render context used for element-based rendering experiments. */
export class WebRenderContext extends RenderContext {
  /** @inheritdoc */
  setViewScale(_scale: number): void {
    this.unsupported('setViewScale');
  }
  /** @inheritdoc */
  getViewScale(): number {
    this.unsupported('getViewScale');
  }
  /** @inheritdoc */
  getRasterScale(): number {
    this.unsupported('getRasterScale');
  }
  /** @inheritdoc */
  getMaxLineWidth(): number {
    this.unsupported('getMaxLineWidth');
  }
  /** @inheritdoc */
  addEventListener(type: string, callBack: (event: EventWithOffset) => void): () => void {
    this.unsupported('addEventListener');
  }
  /** @inheritdoc */
  setLineWidth(width: number): void {
    this.unsupported('setLineWidth');
  }
  /** @inheritdoc */
  getLineWidth(): number {
    this.unsupported('getLineWidth');
  }
  /** @inheritdoc */
  moveTo(x: number, y: number): void {
    this.unsupported('moveTo');
  }
  /** @inheritdoc */
  lineTo(x: number, y: number): void {
    this.unsupported('lineTo');
  }
  /** @inheritdoc */
  measureText(text: string): { width: number; height: number } {
    this.unsupported('measureText');
  }
  /** @inheritdoc */
  cloneNode(): RenderContext {
    this.unsupported('cloneNode');
  }
  /** @inheritdoc */
  createHitNode(): RenderContext {
    this.unsupported('createHitNode');
  }
  /** @inheritdoc */
  clip(): void {
    this.unsupported('clip');
  }
  /** @inheritdoc */
  drawImage(image: RenderImageSource, x: number, y: number): void;
  /** @inheritdoc */
  drawImage(image: RenderImageSource, x: number, y: number, width: number, height: number): void;
  /** @inheritdoc */
  drawImage(
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
  drawImage(
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
    this.unsupported('drawImage');
  }
  /** @inheritdoc */
  putImageData(
    imageData: RenderImageData,
    x: number,
    y: number,
  ): void {
    this.unsupported('putImageData');
  }
  /** @inheritdoc */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.unsupported('setTransform');
  }
  /** @inheritdoc */
  translate(x: number, y: number): void {
    this.unsupported('translate');
  }
  /** @inheritdoc */
  resetTransform(): void {
    this.unsupported('resetTransform');
  }
  /** @inheritdoc */
  getRenderTarget(): unknown {
    this.unsupported('getRenderTarget');
  }
  /** @inheritdoc */
  setAttribute(name: string, value: string): void {
    this.unsupported('setAttribute');
  }
  /** @inheritdoc */
  getAttribute(name: string): string {
    this.unsupported('getAttribute');
  }
  /** @inheritdoc */
  initialize(): void {
    this.unsupported('initialize');
  }
  /** @inheritdoc */
  resize(): void {
    // DOM render targets are laid out by their host platform; concrete
    // DOM implementations can override this when they own a backing store.
  }
  /** @inheritdoc */
  setFont(font: string): void {
    this.unsupported('setFont');
  }
  /** Virtual path cache collected before a fill or stroke commits DOM elements. */
  cache: Set<HTMLElement>;

  /** @inheritdoc */
  addResizeListener(): void {
    this.unsupported('addResizeListener');
  }
  /** @inheritdoc */
  removeResizeListener(): void {
    this.unsupported('removeResizeListener');
  }
  /** Root DOM element that receives generated render elements. */
  root: HTMLDivElement;
  /** DI token for resolving the Web render context. */
  public static readonly symbol: symbol = Symbol.for('WebRenderContext');
  private lineWidth: number = 0.5;
  private strokeStyle: RenderPaint = '';
  private fillStyle: RenderPaint = '';

  private unsupported(method: string): never {
    throw new SearError(`WebRenderContext.${method} is not supported by the experimental DOM render target.`);
  }

  /** Creates a Web render context attached to the provided container. */
  constructor(container: HTMLDivElement, private readonly platform?: Platform) {
    super();
    this.root = container;
    // cache dom: simulate virtual path
    this.cache = new Set();
  }

  //#region status
  /** @inheritdoc */
  save(): void {}

  /** @inheritdoc */
  restore(): void {}

  /** @inheritdoc */
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.unsupported('fillText');
  }

  /** @inheritdoc */
  getRoot() {
    return this.root;
  }

  // @WebContext.prototype.clearCache()
  /** @inheritdoc */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.cache.clear();
    const childrens = Array.from(this.root.children) as HTMLDivElement[];
    childrens.forEach((children) => {
      children.remove();
      // const rect = {
      //     x: parseInt(children.style.left),
      //     y: parseInt(children.style.top),
      //     width: parseInt(children.style.width),
      //     height: parseInt(children.style.height),
      // };
      // if (rect.x >= x && rect.x <= x + width && rect.y >= y && rect.y <= y + height) {
      //     children.remove();
      // }
    });
  }

  /** @inheritdoc */
  setLineDash(segments: number[]): void {
    // DOM fallback does not support dashed lines
  }
  /** @inheritdoc */
  strokeRect(x: number, y: number, width: number, height: number): void {
    const rect = document.createElement(ELEMENTS.DIV);
    rect.style.position = POSITION.ABSOLUTE;
    rect.style.width = width + MEASURE.PX;
    rect.style.height = height + MEASURE.PX;
    rect.style.left = x + MEASURE.PX;
    rect.style.top = y + MEASURE.PX;
    rect.style.border = this.lineWidth + MEASURE.PX + HELPER.SPACE + ATTRIBUTE.SOLID + HELPER.SPACE + this.strokeStyle;

    this.root.appendChild(rect);
  }

  /** @inheritdoc */
  setStrokeStyle(strokeStyle: string) {
    this.strokeStyle = strokeStyle;
  }

  /** @inheritdoc */
  setFillStyle(fillStyle: RenderPaint): void {
    this.fillStyle = fillStyle;
  }
  /** @inheritdoc */
  getImageData(x: number, y: number, width: number, height: number) {
    const elements = document
      .elementsFromPoint(x, y)
      .filter((element) => element.getAttribute('data-type') == 'rect')
      .filter((element) => element.parentElement?.dataset['tag'] === 'hit');

    const datas: [number, number, number, number][] = [];
    // console.log('----------------------------');
    // if (elements.length === 0)
    // console.log('getImageData');
    for (const element of elements) {
      const regex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
      const rgbs = regex.exec(window.getComputedStyle(element).backgroundColor);
      datas.push([Number(rgbs?.[1] ?? 0), Number(rgbs?.[2] ?? 0), Number(rgbs?.[3] ?? 0), 255]);
    }
    return {
      data: datas,
      width: width,
      height: height,
    };
  }

  // Add decorators
  /**
   * Clear timing
   * 1. Virtual Path Again
   * 2. beginPath
   * 3. clearRect
   */

  // #region Virtual Path
  // @WebContext.prototype.clearCache()
  beginPath(): void {
    this.cache.clear();
  }

  // @WebContext.prototype.clearCache()
  /** @inheritdoc */
  closePath(): void {
    this.cache.clear();
  }

  /** @inheritdoc */
  rect(x: number, y: number, width: number, height: number): void {
    const rect = document.createElement(ELEMENTS.DIV);

    rect.dataset['type'] = 'rect';

    rect.style.position = POSITION.ABSOLUTE;
    rect.style.left = x + MEASURE.PX;
    rect.style.top = y + MEASURE.PX;
    rect.style.width = width + MEASURE.PX;
    rect.style.height = height + MEASURE.PX;

    this.cache.add(rect);
  }

  /** @inheritdoc */
  fill(): void {
    if (!this.cache.size) {
      this.platform?.warn('WebRenderContext.fill skipped: no path found.');
      return;
    }
    this.cache.forEach((rect) => {
      rect.style.backgroundColor = this.fillStyle as string;
      this.getRoot().appendChild(rect);
    });
  }

  /** @inheritdoc */
  stroke(): void {
    if (!this.cache.size) {
      this.platform?.warn('WebRenderContext.stroke skipped: no path found.');
      return;
    }
    const rects = this.cache.forEach((rect) => {
      rect.style.border =
        this.lineWidth + MEASURE.PX + HELPER.SPACE + ATTRIBUTE.SOLID + HELPER.SPACE + this.strokeStyle;
      this.root.appendChild(rect);
    });
  }
  // #endregion

  // #region EventListener
  /** @inheritdoc */
  addClickEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().addEventListener(PlatformEventName.Click, function dispatchDomClickEvent(event) {
      callBack(event);
    });
  }
  /** @inheritdoc */
  removeClickEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().removeEventListener(PlatformEventName.Click, callBack);
  }

  /** @inheritdoc */
  addMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().addEventListener(PlatformEventName.MouseDown, function dispatchDomMouseDownEvent(event) {
      callBack(event);
    });
  }
  /** @inheritdoc */
  removeMouseDownEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().removeEventListener(PlatformEventName.MouseDown, callBack);
  }

  /** @inheritdoc */
  addMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().addEventListener(PlatformEventName.MouseUp, function dispatchDomMouseUpEvent(event) {
      callBack(event);
    });
  }
  /** @inheritdoc */
  removeMouseUpEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().removeEventListener(PlatformEventName.MouseUp, callBack);
  }

  /** @inheritdoc */
  addMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().addEventListener(PlatformEventName.MouseMove, function dispatchDomMouseMoveEvent(event) {
      callBack(event);
    });
  }
  /** @inheritdoc */
  removeMouseMoveEventListener(callBack: (event: EventWithOffset) => void): void {
    this.getRoot().removeEventListener(PlatformEventName.MouseMove, callBack);
  }
  // #endregion

  // #region util method
  private clearCache(): MethodDecorator {
    const context = this;
    return function clearDomRenderContextMethodCache(
      _target: object,
      _propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ) {
      const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
      descriptor.value = function clearCachedDomRenderContextMethod(...args: unknown[]) {
        context.cache.clear();
        return originalMethod.apply(context, args);
      };
      return descriptor;
    };
  }
  // #endregion
}
