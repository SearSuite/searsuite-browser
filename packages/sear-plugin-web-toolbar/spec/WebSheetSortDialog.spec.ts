import { type SheetCommandBus } from '@searsuite/sear-assembly-commands';
import { SheetSortDirection, SortSheetRangeCommand } from '@searsuite/sear-plugin-sort';
import { WebKeyboardRouter } from '@searsuite/sear-browser-adapters';
import { WebSheetSortDialog } from '../src/WebSheetSortDialog';

describe('WebSheetSortDialog', () => {
  afterEach(() => document.body.replaceChildren());

  it('BUG-044 restores sheet input focus after cancel without focusing during teardown', () => {
    const restoreFocus = jest.fn();
    const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus, restoreFocus);
    dialog.open({ start: [39, 9], end: [39, 9] }, 9);
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-actions button')!.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    dialog.open({ start: [39, 9], end: [39, 9] }, 9);
    dialog.destroy();
    expect(restoreFocus).toHaveBeenCalledTimes(1);
  });

  it('submits ordered criteria and the header choice', () => {
    const run = jest.fn();
    const dialog = new WebSheetSortDialog({ run } as unknown as SheetCommandBus);
    dialog.open({ start: [0, 1], end: [8, 3] }, 2);
    document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!.click();
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!.click();
    const columns = document.querySelectorAll<HTMLSelectElement>('[data-role="column"]');
    columns[1]!.value = '4';
    document.querySelectorAll<HTMLSelectElement>('[data-role="direction"]')[1]!.value = SheetSortDirection.Descending;
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SortSheetRangeCommand, {
      range: { start: [0, 1], end: [8, 3] },
      firstRowIsHeader: true,
      keys: [
        { column: 2, direction: SheetSortDirection.Ascending },
        { column: 3, direction: SheetSortDirection.Descending },
      ],
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('rejects duplicate columns and keeps the dialog open after command failure', () => {
    const run = jest.fn(() => { throw new Error('Cannot sort merged cells'); });
    const dialog = new WebSheetSortDialog({ run } as unknown as SheetCommandBus);
    dialog.open({ start: [0, 0], end: [2, 1] }, 0);
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!.click();
    document.querySelectorAll<HTMLSelectElement>('[data-role="column"]')[1]!.value = '1';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Sort levels cannot use the same column');
    document.querySelectorAll<HTMLSelectElement>('[data-role="column"]')[1]!.value = '2';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Cannot sort merged cells');
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-close')!.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-574 and BUG-575 name criterion controls by level after adding and removing rows', () => {
    const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus);
    dialog.open({ start: [0, 0], end: [8, 3] }, 0);
    const add = document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!;
    add.click();
    add.click();
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>('.sear-sheet-sort-criterion'));
    const names = (row: HTMLElement) => ({
      column: row.querySelector('[data-role="column"]')?.getAttribute('aria-label'),
      direction: row.querySelector('[data-role="direction"]')?.getAttribute('aria-label'),
      remove: row.querySelector('button')?.getAttribute('aria-label'),
    });
    expect(rows().map(names)).toEqual([
      { column: 'Primary sort column', direction: 'Primary sort direction', remove: 'Remove Primary sort' },
      { column: 'Secondary sort column', direction: 'Secondary sort direction', remove: 'Remove Secondary sort' },
      { column: 'Sort level 3 column', direction: 'Sort level 3 direction', remove: 'Remove Sort level 3' },
    ]);
    rows()[0]!.querySelector('button')!.click();
    expect(rows().map(names)).toEqual([
      { column: 'Primary sort column', direction: 'Primary sort direction', remove: 'Remove Primary sort' },
      { column: 'Secondary sort column', direction: 'Secondary sort direction', remove: 'Remove Secondary sort' },
    ]);
    rows()[0]!.querySelector('button')!.click();
    expect(rows()[0]!.querySelector('button')!.hasAttribute('disabled')).toBe(true);
  });

  it('BUG-483 chooses unused sort columns and disables adding when none remain', () => {
    const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus);
    dialog.open({ start: [19, 10], end: [21, 11] }, 10);
    const add = document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!;
    add.click();
    expect(Array.from(document.querySelectorAll<HTMLSelectElement>('[data-role="column"]'),
      (column) => column.value)).toEqual(['11', '12']);
    expect(add.disabled).toBe(true);
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Secondary sort"]')!.click();
    expect(add.disabled).toBe(false);
    dialog.open({ start: [19, 10], end: [21, 10] }, 10);
    expect(document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!.disabled).toBe(true);
  });

  it('BUG-485 clears a duplicate-column warning when the conflict is fixed', () => {
    const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus);
    dialog.open({ start: [19, 10], end: [21, 11] }, 10);
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!.click();
    const columns = document.querySelectorAll<HTMLSelectElement>('[data-role="column"]');
    columns[1]!.value = '11';
    columns[1]!.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Sort levels cannot use the same column');
    columns[1]!.value = '12';
    columns[1]!.dispatchEvent(new Event('change'));
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('');
    columns[1]!.value = '11';
    columns[1]!.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Secondary sort"]')!.click();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('');
  });

  it('BUG-610 numbers visible sort levels and renumbers after removal', () => {
    const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus);
    dialog.open({ start: [19, 9], end: [21, 11] }, 9);
    const add = document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!;
    add.click();
    add.click();
    const labels = () => Array.from(document.querySelectorAll<HTMLElement>('.sear-sheet-sort-criterion > span'),
      (label) => label.textContent);
    expect(labels()).toEqual(['Primary sort', 'Secondary sort', 'Sort level 3']);
    document.querySelector<HTMLButtonElement>('[aria-label="Remove Primary sort"]')!.click();
    expect(labels()).toEqual(['Primary sort', 'Secondary sort']);
  });

  it('BUG-598 uses header names for sort columns only when the first row is a header', () => {
    const run = jest.fn();
    const dialog = new WebSheetSortDialog({ run } as unknown as SheetCommandBus);
    dialog.open({ start: [12, 1], end: [15, 2] }, 1, ['Name', 'Score']);
    const options = () => Array.from(document.querySelectorAll<HTMLOptionElement>('[data-role="column"] option'),
      (option) => option.textContent);
    expect(options()).toEqual(['B', 'C']);
    document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!.click();
    expect(options()).toEqual(['B · Name', 'C · Score']);
    document.querySelector<HTMLButtonElement>('.sear-sheet-sort-add')!.click();
    expect(options()).toEqual(['B · Name', 'C · Score', 'B · Name', 'C · Score']);
    document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!.click();
    expect(options()).toEqual(['B', 'C', 'B', 'C']);
    document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SortSheetRangeCommand, {
      range: { start: [12, 1], end: [15, 2] }, firstRowIsHeader: true,
      keys: [
        { column: 1, direction: SheetSortDirection.Ascending },
        { column: 2, direction: SheetSortDirection.Ascending },
      ],
    });
  });

  it('BUG-123 remembers a successful header choice for the same sort range', () => {
    const run = jest.fn();
    const dialog = new WebSheetSortDialog({ run } as unknown as SheetCommandBus);
    const range = { start: [19, 2] as const, end: [21, 3] as const };
    dialog.open(range, 2, ['Key', 'Num']);
    document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    dialog.open(range, 2, ['Key', 'Num']);
    expect(document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')?.checked).toBe(true);
    expect(Array.from(document.querySelectorAll<HTMLOptionElement>('[data-role="column"] option'),
      (option) => option.textContent)).toEqual(['C · Key', 'D · Num']);
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenNthCalledWith(2, SortSheetRangeCommand, {
      range, firstRowIsHeader: true,
      keys: [{ column: 2, direction: SheetSortDirection.Ascending }],
    });
    dialog.open({ start: [20, 2], end: [22, 3] }, 2);
    expect(document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')?.checked).toBe(false);
  });

  it('BUG-484 keeps Tab in the sort dialog instead of routing it to the grid', () => {
    const onTab = jest.fn();
    const router = new WebKeyboardRouter(document);
    router.subscribe({ onTab });
    router.startListener();
    try {
      const dialog = new WebSheetSortDialog({ run: jest.fn() } as unknown as SheetCommandBus);
      dialog.open({ start: [19, 10], end: [21, 11] }, 11);
      const header = document.querySelector<HTMLInputElement>('[data-testid="sort-header"]')!;
      header.click();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      header.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
      expect(onTab).not.toHaveBeenCalled();
      document.querySelector<HTMLButtonElement>('.sear-sheet-sort-close')!.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(onTab).toHaveBeenCalledWith(false);
    } finally {
      router.stopListener();
    }
  });
});
