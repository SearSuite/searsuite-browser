import { WebRenderContext } from '../../src/sear-render-context/WebRenderContext';

describe('WebRenderContext', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.restoreAllMocks();
  });

  it('materializes fill and stroke paths as styled DOM rectangles and clears them', () => {
    const root = document.createElement('div');
    const context = new WebRenderContext(root);

    context.setFillStyle('rgb(1, 2, 3)');
    context.beginPath();
    context.rect(1, 2, 30, 40);
    context.fill();
    context.setStrokeStyle('red');
    context.beginPath();
    context.rect(3, 4, 5, 6);
    context.stroke();
    context.strokeRect(7, 8, 9, 10);

    expect(root.children).toHaveLength(3);
    expect((root.children[0] as HTMLElement).style.backgroundColor).toBe('rgb(1, 2, 3)');
    expect((root.children[0] as HTMLElement).style.left).toBe('1px');
    expect((root.children[1] as HTMLElement).style.border).toBe('0.5px solid red');
    context.clearRect(0, 0, 10, 10);
    expect(root.children).toHaveLength(0);
  });

  it('reads hit-test colours and forwards mouse events from its root', () => {
    const root = document.createElement('div');
    root.dataset['tag'] = 'hit';
    const rect = document.createElement('div');
    rect.dataset['type'] = 'rect';
    rect.style.backgroundColor = 'rgb(12, 34, 56)';
    root.appendChild(rect);
    document.body.appendChild(root);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: jest.fn(() => [rect]),
    });
    const context = new WebRenderContext(root);
    const click = jest.fn();
    const mouseDown = jest.fn();
    const mouseMove = jest.fn();
    const mouseUp = jest.fn();

    context.addClickEventListener(click);
    context.addMouseDownEventListener(mouseDown);
    context.addMouseMoveEventListener(mouseMove);
    context.addMouseUpEventListener(mouseUp);
    root.dispatchEvent(new MouseEvent('click'));
    root.dispatchEvent(new MouseEvent('mousedown'));
    root.dispatchEvent(new MouseEvent('mousemove'));
    root.dispatchEvent(new MouseEvent('mouseup'));

    expect(click).toHaveBeenCalledTimes(1);
    expect(mouseDown).toHaveBeenCalledTimes(1);
    expect(mouseMove).toHaveBeenCalledTimes(1);
    expect(mouseUp).toHaveBeenCalledTimes(1);
    expect(context.getImageData(1, 2, 3, 4)).toEqual({
      data: [[12, 34, 56, 255]],
      width: 3,
      height: 4,
    });
  });

  it('handles getImageData branches with null parent, incorrect tag, and invalid color', () => {
    const root = document.createElement('div');
    // We intentionally don't set data-tag='hit' here to cover the false branch

    const rect1 = document.createElement('div');
    rect1.dataset['type'] = 'rect';
    rect1.style.backgroundColor = 'invalid-color'; // Won't match the regex
    root.appendChild(rect1);

    // A rect with no parent
    const rect2 = document.createElement('div');
    rect2.dataset['type'] = 'rect';
    // rect2 is not appended anywhere, so parentElement is null

    // A valid hit element but invalid color
    const hitRoot = document.createElement('div');
    hitRoot.dataset['tag'] = 'hit';
    const rect3 = document.createElement('div');
    rect3.dataset['type'] = 'rect';
    rect3.style.backgroundColor = 'invalid-color'; // To trigger rgbs === null fallback
    hitRoot.appendChild(rect3);

    document.body.appendChild(root);
    document.body.appendChild(hitRoot);

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: jest.fn(() => [rect1, rect2, rect3]),
    });

    const context = new WebRenderContext(root);

    // rect1 is filtered out because parent isn't tagged 'hit'
    // rect2 is filtered out because parent is null
    // rect3 passes filter, but regex fails on 'invalid-color', returning fallback [0, 0, 0, 255]
    expect(context.getImageData(0, 0, 10, 10)).toEqual({
      data: [[0, 0, 0, 255]],
      width: 10,
      height: 10,
    });

    context.save();
    context.restore();
  });

  it('states unsupported canvas-only operations explicitly', () => {
    const context = new WebRenderContext(document.createElement('div'));
    const image = {} as CanvasImageSource;
    const imageData = {
      data: [[0, 0, 0, 255]] as [number, number, number, number][],
      width: 1,
      height: 1,
    };

    expect(() => context.setViewScale(1)).toThrow('WebRenderContext.setViewScale is not supported');
    expect(() => context.getViewScale()).toThrow('WebRenderContext.getViewScale is not supported');
    expect(() => context.getRasterScale()).toThrow('WebRenderContext.getRasterScale is not supported');
    expect(() => context.getMaxLineWidth()).toThrow('WebRenderContext.getMaxLineWidth is not supported');
    expect(() => context.addEventListener('click', jest.fn())).toThrow(
      'WebRenderContext.addEventListener is not supported',
    );
    expect(() => context.setLineWidth(1)).toThrow('WebRenderContext.setLineWidth is not supported');
    expect(() => context.getLineWidth()).toThrow('WebRenderContext.getLineWidth is not supported');
    expect(() => context.moveTo(0, 0)).toThrow('WebRenderContext.moveTo is not supported');
    expect(() => context.lineTo(0, 0)).toThrow('WebRenderContext.lineTo is not supported');
    expect(() => context.measureText('x')).toThrow('WebRenderContext.measureText is not supported');
    expect(() => context.cloneNode()).toThrow('WebRenderContext.cloneNode is not supported');
    expect(() => context.createHitNode()).toThrow('WebRenderContext.createHitNode is not supported');
    expect(() => context.clip()).toThrow('WebRenderContext.clip is not supported');
    expect(() => context.drawImage(image, 0, 0)).toThrow('WebRenderContext.drawImage is not supported');
    expect(() => context.putImageData(imageData, 0, 0)).toThrow('WebRenderContext.putImageData is not supported');
    expect(() => context.setTransform(1, 0, 0, 1, 0, 0)).toThrow('WebRenderContext.setTransform is not supported');
    expect(() => context.translate(0, 0)).toThrow('WebRenderContext.translate is not supported');
    expect(() => context.resetTransform()).toThrow('WebRenderContext.resetTransform is not supported');
    expect(() => context.getRenderTarget()).toThrow('WebRenderContext.getRenderTarget is not supported');
    expect(() => context.setAttribute('x', 'y')).toThrow('WebRenderContext.setAttribute is not supported');
    expect(() => context.getAttribute('x')).toThrow('WebRenderContext.getAttribute is not supported');
    expect(() => context.initialize()).toThrow('WebRenderContext.initialize is not supported');
    expect(() => context.setFont('12px sans-serif')).toThrow('WebRenderContext.setFont is not supported');
    expect(() => context.fillText('x', 0, 0)).toThrow('WebRenderContext.fillText is not supported');
    expect(() => context.addResizeListener()).toThrow('WebRenderContext.addResizeListener is not supported');
    expect(() => context.removeResizeListener()).toThrow('WebRenderContext.removeResizeListener is not supported');
    expect(() => context.resize()).not.toThrow();
    expect(() => context.setLineDash([1, 2])).not.toThrow();
  });

  it('covers missing branches', () => {
    const root = document.createElement('div');
    const platform = { warn: jest.fn() };
    const context = new WebRenderContext(root, platform as never);

    // closePath clears cache
    context.rect(0, 0, 10, 10);
    expect(context.cache.size).toBe(1);
    context.closePath();
    expect(context.cache.size).toBe(0);

    // empty cache warnings for fill and stroke
    context.fill();
    context.stroke();
    expect(platform.warn).toHaveBeenCalledTimes(2);

    // event listener removals
    const dummy = jest.fn();
    const removeEventListenerSpy = jest.spyOn(root, 'removeEventListener');
    context.removeClickEventListener(dummy);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', dummy);

    context.removeMouseDownEventListener(dummy);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', dummy);

    context.removeMouseMoveEventListener(dummy);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', dummy);

    context.removeMouseUpEventListener(dummy);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', dummy);

    // test private clearCache decorator
    const decorator = (context as any).clearCache();
    const originalMethod = jest.fn();
    const descriptor = { value: originalMethod };
    const wrapped = decorator({}, 'testMethod', descriptor);

    context.rect(0, 0, 10, 10);
    expect(context.cache.size).toBe(1);
    wrapped.value();
    expect(context.cache.size).toBe(0);
    expect(originalMethod).toHaveBeenCalled();
  });
});
