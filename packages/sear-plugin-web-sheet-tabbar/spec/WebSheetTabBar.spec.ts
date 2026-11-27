import { WebSheetTabBar } from '../src/WebSheetTabBar';

it('scrolls overflowing tabs horizontally and leaves other wheel gestures to the host', () => {
  const target = document.createElement('div');
  document.body.append(target);
  const adapter = new WebSheetTabBar();
  adapter.mount(target, {
    sheets: [{ id: 'one', name: 'One', active: true }],
    onAddSheetClick: jest.fn(),
    onActivateSheetClick: jest.fn(),
  });
  const tabs = target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__tabs')!;
  Object.defineProperties(tabs, {
    clientWidth: { value: 100 },
    scrollWidth: { value: 400 },
  });
  const wheel = (deltaX: number, deltaY = 0) => {
    const event = new WheelEvent('wheel', { deltaX, deltaY, cancelable: true });
    tabs.dispatchEvent(event);
    return event;
  };
  try {
    expect(wheel(50).defaultPrevented).toBe(true);
    expect(tabs.scrollLeft).toBe(50);
    expect(wheel(500).defaultPrevented).toBe(true);
    expect(tabs.scrollLeft).toBe(300);
    expect(wheel(50).defaultPrevented).toBe(false);
    expect(wheel(0, 50).defaultPrevented).toBe(false);
    expect(tabs.scrollLeft).toBe(300);
  } finally {
    adapter.destroy();
    target.remove();
  }
});
