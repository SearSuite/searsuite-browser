import { WebSheetContextMenu } from '../src/WebSheetContextMenu';

describe('WebSheetContextMenu', () => {
  afterEach(() => document.body.replaceChildren());

  it('BUG-249 exposes range actions and disposes the menu after a command', () => {
    const run = jest.fn();
    const menu = new WebSheetContextMenu({ addEventListener: () => () => void 0 } as never);
    menu.open(20, 30, [
      { label: 'Copy', run },
      { label: 'Delete row', run: jest.fn() },
    ]);
    const items = document.querySelectorAll<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]');
    expect(Array.from(items).map((item) => item.textContent)).toEqual(['Copy', 'Delete row']);
    items[0].click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.sear-sheet-context-menu')).toBeNull();
  });

  it('BUG-935 keeps arrow navigation inside the menu and closes on Escape', () => {
    const platform = { addEventListener: (target: EventTarget, type: string, listener: EventListener) => {
      target.addEventListener(type, listener);
      return () => target.removeEventListener(type, listener);
    } } as never;
    const before = document.createElement('input');
    document.body.append(before);
    before.focus();
    const menu = new WebSheetContextMenu(platform);
    menu.open(20, 30, [{ label: 'Copy', run: jest.fn() }, { label: 'Clear contents', run: jest.fn() }]);
    expect(document.activeElement?.textContent).toBe('Copy');
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('Clear contents');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.querySelector('.sear-sheet-context-menu')).toBeNull();
    expect(document.activeElement).toBe(before);
  });
});
