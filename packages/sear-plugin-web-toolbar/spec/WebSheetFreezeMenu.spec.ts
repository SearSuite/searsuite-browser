import { FixedRowMatrix, SetSheetRowsFixedCommand } from '@searsuite/sear-plugin-fixed-row';
import { SetSheetFreezeCommand } from '@searsuite/sear-plugin-freeze';
import { WebSheetFreezeMenu } from '../src/WebSheetFreezeMenu';
import { TOOLBAR_CSS } from '../src/ToolbarCSS';

describe('WebSheetFreezeMenu', () => {
  afterEach(() => { document.body.replaceChildren(); });

  it('shows selection-relative freeze choices and dispatches a complete replacement state', () => {
    const run = jest.fn();
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    menu.open(anchor, { anchor: [2, 1], focus: [2, 1] }, { rows: 0, columns: 0 }, null,
      { has: () => true, run } as never);

    expect(document.querySelector('[data-freeze-action="rows"]')?.textContent).toBe('Freeze through row 3');
    expect(document.querySelector('[data-freeze-action="columns"]')?.textContent).toBe('Freeze through column B');
    expect(document.querySelector('[data-freeze-action="both"]')?.textContent).toBe('Freeze through row 3 and column B');
    expect((document.querySelector('[data-freeze-action="clear"]') as HTMLButtonElement).disabled).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-freeze-action="both"]')?.click();
    expect(run).toHaveBeenCalledWith(SetSheetFreezeCommand, { rows: 3, columns: 2 });
    expect(document.querySelector('.sear-freeze-menu')).toBeNull();
  });

  it('BUG-523 preserves the other freeze axis when setting rows or columns', () => {
    const run = jest.fn();
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const selection = { anchor: [2, 1] as const, focus: [2, 1] as const };
    const commands = { has: () => true, run } as never;

    menu.open(anchor, selection, { rows: 0, columns: 2 }, null, commands);
    document.querySelector<HTMLButtonElement>('[data-freeze-action="rows"]')?.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetFreezeCommand, { rows: 3, columns: 2 });

    menu.open(anchor, selection, { rows: 3, columns: 0 }, null, commands);
    document.querySelector<HTMLButtonElement>('[data-freeze-action="columns"]')?.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetFreezeCommand, { rows: 3, columns: 2 });
    menu.close();
  });

  it('BUG-605 keeps a tall menu inside a short viewport with vertical scrolling', () => {
    const style = document.createElement('style');
    style.textContent = TOOLBAR_CSS;
    document.head.appendChild(style);
    const viewportHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 180 });
    const menuHeight = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(164);
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    try {
      menu.open(anchor, { anchor: [2, 1], focus: [2, 1] }, { rows: 0, columns: 0 }, null,
        { has: () => true, run: jest.fn() } as never);
      const root = document.querySelector<HTMLElement>('.sear-freeze-menu')!;
      expect(root.style.top).toBe('8px');
      expect(getComputedStyle(root).overflowY).toBe('auto');
      expect(getComputedStyle(root).maxHeight).toBe('calc(100vh - 16px)');
      expect(root.querySelectorAll('button')).toHaveLength(6);
    } finally {
      menu.close();
      menuHeight.mockRestore();
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });
      style.remove();
    }
  });

  it('fixes and unfixes the selected row range independently of freeze', () => {
    const run = jest.fn();
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const fixed = new FixedRowMatrix(void 0, [1, 20]);
    fixed.addItem(0, 7, true);
    menu.open(anchor, { anchor: [7, 0], focus: [8, 0] }, { rows: 2, columns: 1 }, fixed,
      { has: () => true, run } as never);
    expect((document.querySelector('[data-freeze-action="clear"]') as HTMLButtonElement).disabled).toBe(false);
    expect((document.querySelector('[data-freeze-action="unfix"]') as HTMLButtonElement).disabled).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-freeze-action="unfix"]')?.click();
    expect(run).toHaveBeenCalledWith(SetSheetRowsFixedCommand, { index: 7, count: 2, fixed: false });
  });

  it('BUG-451 limits whole-row and whole-column menus to their selected axis', () => {
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const commands = { has: () => true, run: jest.fn() } as never;
    menu.open(anchor, { anchor: [99, 0], focus: [99, 6], sheetShape: [200, 7] }, { rows: 0, columns: 0 }, null, commands);
    expect(document.querySelector('[data-freeze-action="rows"]')).not.toBeNull();
    expect(document.querySelector('[data-freeze-action="columns"]')).toBeNull();
    expect(document.querySelector('[data-freeze-action="both"]')).toBeNull();
    menu.open(anchor, { anchor: [0, 2], focus: [199, 2], sheetShape: [200, 7] }, { rows: 0, columns: 0 }, null, commands);
    expect(document.querySelector('[data-freeze-action="rows"]')).toBeNull();
    expect(document.querySelector('[data-freeze-action="columns"]')).not.toBeNull();
    expect(document.querySelector('[data-freeze-action="fix"]')).toBeNull();
    menu.close();
  });

  it('BUG-452 and BUG-482 explain and block freezing every row or column', () => {
    const menu = new WebSheetFreezeMenu({ addEventListener: () => () => void 0 } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const run = jest.fn();
    const commands = { has: () => true, run } as never;
    menu.open(anchor, { anchor: [199, 0], focus: [199, 0], sheetShape: [200, 200] },
      { rows: 0, columns: 0 }, null, commands);
    const rows = document.querySelector<HTMLButtonElement>('[data-freeze-action="rows"]')!;
    expect(rows.textContent).toBe('Cannot freeze all rows');
    expect(rows.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[data-freeze-action="both"]')?.disabled).toBe(true);
    rows.click();
    expect(run).not.toHaveBeenCalled();

    menu.open(anchor, { anchor: [19, 199], focus: [19, 199], sheetShape: [200, 200] },
      { rows: 0, columns: 0 }, null, commands);
    const columns = document.querySelector<HTMLButtonElement>('[data-freeze-action="columns"]')!;
    expect(columns.textContent).toBe('Cannot freeze all columns');
    expect(columns.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[data-freeze-action="both"]')?.disabled).toBe(true);
    columns.click();
    expect(run).not.toHaveBeenCalled();

    menu.open(anchor, { anchor: [0, 4], focus: [199, 6], sheetShape: [200, 200] },
      { rows: 0, columns: 0 }, null, commands);
    expect(document.querySelector<HTMLButtonElement>('[data-freeze-action="rows-limit"]')?.disabled).toBe(true);
    expect(document.querySelector('[data-freeze-action="rows-limit"]')?.textContent).toBe('Cannot freeze all rows');
    menu.open(anchor, { anchor: [19, 0], focus: [19, 199], sheetShape: [200, 200] },
      { rows: 0, columns: 0 }, null, commands);
    expect(document.querySelector<HTMLButtonElement>('[data-freeze-action="columns-limit"]')?.disabled).toBe(true);
    expect(document.querySelector('[data-freeze-action="columns-limit"]')?.textContent).toBe('Cannot freeze all columns');
    menu.close();
  });

  it('closes on outside pointer input or Escape while retaining clicks in the menu', () => {
    const menu = new WebSheetFreezeMenu({
      addEventListener(target: EventTarget, type: string, listener: EventListener) {
        target.addEventListener(type, listener);
        return () => target.removeEventListener(type, listener);
      },
    } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const open = () => menu.open(anchor, { anchor: [0, 0], focus: [0, 0] },
      { rows: 0, columns: 0 }, null, { has: () => true, run: jest.fn() } as never);

    open();
    document.querySelector('.sear-freeze-menu')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.sear-freeze-menu')).not.toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.sear-freeze-menu')).toBeNull();

    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.querySelector('.sear-freeze-menu')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-freeze-menu')).toBeNull();
  });

  it('BUG-467 navigates enabled menu items without moving the sheet selection', () => {
    const menu = new WebSheetFreezeMenu({
      addEventListener(target: EventTarget, type: string, listener: EventListener) {
        target.addEventListener(type, listener);
        return () => target.removeEventListener(type, listener);
      },
    } as never);
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    anchor.focus();
    const run = jest.fn();
    menu.open(anchor, { anchor: [1, 1], focus: [1, 1] }, { rows: 0, columns: 0 }, null,
      { has: () => true, run } as never);
    expect(document.activeElement?.getAttribute('data-freeze-action')).toBe('rows');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement?.getAttribute('data-freeze-action')).toBe('columns');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(document.activeElement?.getAttribute('data-freeze-action')).toBe('rows');
    expect(run).not.toHaveBeenCalled();
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-freeze-menu')).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });
});
