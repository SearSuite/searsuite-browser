import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { type RenderContext } from '@searsuite/sear-render-context';

import { WebPointerCapture } from '../../src';

function createCapture(eventTarget: EventTarget, root: HTMLElement): WebPointerCapture {
  return new WebPointerCapture({ getRoot: () => root } as unknown as RenderContext, new BrowserPlatform(), eventTarget);
}

describe('WebPointerCapture', () => {
  it('normalizes captured movement and release to render-root view coordinates', () => {
    const target = document.createElement('div');
    const root = document.createElement('canvas');
    jest.spyOn(root, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20 } as DOMRect);
    const capture = createCapture(target, root);
    const onMove = jest.fn();
    const onRelease = jest.fn();

    capture.start({ onMove, onRelease });
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 42, clientY: 65 }));
    target.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 80 }));
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: 90, clientY: 90 }));
    target.dispatchEvent(new MouseEvent('mouseup'));

    expect(onMove).toHaveBeenCalledWith({ view: { x: 32, y: 45 } });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith({ view: { x: 40, y: 60 } });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('supports explicit session disposal and defensive stop', () => {
    const target = document.createElement('div');
    const capture = createCapture(target, document.createElement('canvas'));
    const onRelease = jest.fn();

    const dispose = capture.start({ onRelease });
    dispose();
    target.dispatchEvent(new MouseEvent('mouseup'));
    expect(onRelease).not.toHaveBeenCalled();

    capture.start({ onRelease });
    capture.stop();
    capture.stop();
    target.dispatchEvent(new MouseEvent('mouseup'));
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('does not let a stale disposer stop a newer session', () => {
    const target = document.createElement('div');
    const capture = createCapture(target, document.createElement('canvas'));
    const firstRelease = jest.fn();
    const secondRelease = jest.fn();

    const disposeFirst = capture.start({ onRelease: firstRelease });
    capture.start({ onRelease: secondRelease });
    disposeFirst();
    target.dispatchEvent(new MouseEvent('mouseup', { clientX: 4, clientY: 5 }));

    expect(firstRelease).not.toHaveBeenCalled();
    expect(secondRelease).toHaveBeenCalledTimes(1);
  });

  it('keeps separate editor instances isolated', () => {
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    const firstRelease = jest.fn();
    const secondRelease = jest.fn();
    createCapture(firstTarget, document.createElement('canvas')).start({ onRelease: firstRelease });
    createCapture(secondTarget, document.createElement('canvas')).start({ onRelease: secondRelease });

    firstTarget.dispatchEvent(new MouseEvent('mouseup'));

    expect(firstRelease).toHaveBeenCalledTimes(1);
    expect(secondRelease).not.toHaveBeenCalled();
  });
});
