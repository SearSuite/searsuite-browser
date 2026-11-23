import { type SheetCommandBus } from '@searsuite/sear-assembly-commands';
import { SetSheetRowsFixedCommand, type FixedRowMatrix } from '@searsuite/sear-plugin-fixed-row';
import { SetSheetFreezeCommand, type SheetFreezeState } from '@searsuite/sear-plugin-freeze';
import { Platform } from '@searsuite/sear-foundation-platform';

interface SheetFreezeSelection {
  readonly anchor: readonly [number, number];
  readonly focus: readonly [number, number];
  readonly sheetShape?: readonly [number, number];
}

/** Web-only menu for the two independent freeze and fixed-row capabilities. */
export class WebSheetFreezeMenu {
  private root: HTMLElement | null = null;
  private disposeOutside: (() => void) | null = null;
  private disposeKeydown: (() => void) | null = null;

  public constructor(private readonly platform: Platform) {}

  public open(
    anchor: HTMLElement,
    selection: SheetFreezeSelection,
    freeze: SheetFreezeState,
    fixedRows: FixedRowMatrix | null,
    commands: SheetCommandBus,
  ): void {
    this.close();
    const row = Math.max(selection.anchor[0], selection.focus[0]);
    const column = Math.max(selection.anchor[1], selection.focus[1]);
    const firstRow = Math.min(selection.anchor[0], selection.focus[0]);
    const firstColumn = Math.min(selection.anchor[1], selection.focus[1]);
    const entireRow = selection.sheetShape !== undefined && firstColumn === 0 && column === selection.sheetShape[1] - 1;
    const entireColumn = selection.sheetShape !== undefined && firstRow === 0 && row === selection.sheetShape[0] - 1;
    const allRows = selection.sheetShape !== undefined && selection.sheetShape[0] > 0 && row + 1 >= selection.sheetShape[0];
    const allColumns = selection.sheetShape !== undefined && selection.sheetShape[1] > 0 && column + 1 >= selection.sheetShape[1];
    const count = row - firstRow + 1;
    const hasFixedRow = Array.from({ length: count }, (_, index) => firstRow + index)
      .some((index) => fixedRows?.getItem(0, index) === true);
    const menu = document.createElement('div');
    menu.className = 'sear-freeze-menu';
    menu.setAttribute('role', 'menu');
    const add = (key: string, label: string, enabled: boolean, action: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.dataset['freezeAction'] = key;
      button.textContent = label;
      button.disabled = !enabled;
      button.addEventListener('click', () => { action(); this.close(); });
      menu.appendChild(button);
    };
    const canFreeze = commands.has(SetSheetFreezeCommand.id);
    if (!entireColumn || entireRow)
      add('rows', allRows ? 'Cannot freeze all rows' : row === 0 ? 'Freeze top row' : `Freeze through row ${row + 1}`, canFreeze && !allRows,
        () => commands.run(SetSheetFreezeCommand, { rows: row + 1, columns: freeze.columns }));
    else if (allRows) add('rows-limit', 'Cannot freeze all rows', false, () => void 0);
    if (!entireRow || entireColumn)
      add('columns', allColumns ? 'Cannot freeze all columns' : column === 0 ? 'Freeze first column' : `Freeze through column ${columnName(column)}`, canFreeze && !allColumns,
        () => commands.run(SetSheetFreezeCommand, { rows: freeze.rows, columns: column + 1 }));
    else if (allColumns) add('columns-limit', 'Cannot freeze all columns', false, () => void 0);
    if (!entireRow && !entireColumn)
      add('both', allRows || allColumns ? 'Cannot freeze through the current row and column' : `Freeze through row ${row + 1} and column ${columnName(column)}`, canFreeze && !allRows && !allColumns,
        () => commands.run(SetSheetFreezeCommand, { rows: row + 1, columns: column + 1 }));
    add('clear', 'Unfreeze rows and columns', canFreeze && (freeze.rows > 0 || freeze.columns > 0),
      () => commands.run(SetSheetFreezeCommand, { rows: 0, columns: 0 }));
    const divider = document.createElement('div');
    divider.className = 'sear-freeze-menu__divider';
    divider.setAttribute('role', 'separator');
    menu.appendChild(divider);
    const canFix = commands.has(SetSheetRowsFixedCommand.id);
    if (!entireColumn || entireRow) {
      add('fix', 'Pin selected rows to top', canFix,
        () => commands.run(SetSheetRowsFixedCommand, { index: firstRow, count, fixed: true }));
      add('unfix', 'Unpin rows', canFix && hasFixedRow,
        () => commands.run(SetSheetRowsFixedCommand, { index: firstRow, count, fixed: false }));
    }

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 8))}px`;
    this.root = menu;
    this.disposeOutside = this.platform.addEventListener(document, 'pointerdown', (event) => {
      if (!menu.contains((event as PointerEvent).target as Node) && !anchor.contains((event as PointerEvent).target as Node)) {
        this.close();
      }
    });
    this.disposeKeydown = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Escape') {
        this.close();
        anchor.focus({ preventScroll: true });
        return;
      }
      if ((key !== 'ArrowDown' && key !== 'ArrowUp') || !menu.contains((event as KeyboardEvent).target as Node))
        return;
      const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = (current + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
      (event as KeyboardEvent).preventDefault();
    });
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  public close(): void {
    this.disposeOutside?.();
    this.disposeOutside = null;
    this.disposeKeydown?.();
    this.disposeKeydown = null;
    this.root?.remove();
    this.root = null;
  }
}

function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + value % 26) + name;
    value = Math.floor(value / 26);
  }
  return name;
}
