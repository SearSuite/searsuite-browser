import { SheetCommandBus } from '@searsuite/sear-assembly-commands';
import {
  SheetSortDirection, SortSheetRangeCommand, type SheetSortKey, type SheetSortRangeInput,
} from '@searsuite/sear-plugin-sort';

/** Browser adapter for header-aware, multi-key range sorting. */
export class WebSheetSortDialog {
  private root: HTMLElement | null = null;
  private readonly headerByRange = new Map<string, boolean>();

  public constructor(private readonly commands: SheetCommandBus, private readonly restoreFocus?: () => void) {}

  public destroy(): void { this.root?.remove(); this.root = null; }

  private close(): void {
    if (!this.root) return;
    this.destroy();
    this.restoreFocus?.();
  }

  public open(range: SheetSortRangeInput['range'], selectedColumn: number, headerNames: readonly string[] = []): void {
    this.destroy();
    const rangeKey = formatRange(range);
    const root = document.createElement('div');
    root.className = 'sear-sheet-sort-overlay';
    root.setAttribute('role', 'presentation');
    const panel = document.createElement('section');
    panel.className = 'sear-sheet-sort-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Custom sort');
    const title = document.createElement('h2');
    title.textContent = `Custom sort ${formatRange(range)}`;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'sear-sheet-sort-close';
    close.textContent = '×'; close.title = 'Close'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => this.close());
    const headerLabel = document.createElement('label');
    headerLabel.className = 'sear-sheet-sort-header';
    const header = document.createElement('input');
    header.type = 'checkbox'; header.dataset['testid'] = 'sort-header';
    header.checked = this.headerByRange.get(rangeKey) ?? false;
    headerLabel.append(header, 'First row contains headers and is excluded from sorting');
    const criteria = document.createElement('div');
    criteria.className = 'sear-sheet-sort-criteria';
    const status = document.createElement('p');
    status.className = 'sear-sheet-sort-status'; status.setAttribute('role', 'alert');
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'sear-sheet-sort-add';
    add.textContent = 'Add sort level';
    const updateCriteria = () => {
      const columns = Array.from(criteria.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-role="column"]'),
        (control) => control.value);
      add.disabled = columns.length >= range.end[1] - range.start[1] + 1;
      if (new Set(columns).size === columns.length) status.textContent = '';
      criteria.querySelectorAll<HTMLSelectElement>('select[data-role="column"]').forEach((select) => {
        Array.from(select.options).forEach((option) => {
          const name = header.checked ? headerNames[Number(option.value) - range.start[1] - 1]?.trim() : '';
          option.textContent = name ? `${columnName(Number(option.value) - 1)} · ${name}`
            : columnName(Number(option.value) - 1);
        });
      });
    };
    header.addEventListener('change', updateCriteria);
    add.addEventListener('click', () => appendCriterion(criteria, range, selectedColumn, updateCriteria));
    appendCriterion(criteria, range, selectedColumn, updateCriteria);
    const actions = document.createElement('div');
    actions.className = 'sear-sheet-sort-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.close());
    const confirm = document.createElement('button');
    confirm.type = 'button'; confirm.textContent = 'OK'; confirm.dataset['role'] = 'confirm';
    confirm.addEventListener('click', () => {
      const keys: SheetSortKey[] = Array.from(criteria.querySelectorAll<HTMLElement>('.sear-sheet-sort-criterion'))
        .map((row) => ({
          column: Number(row.querySelector<HTMLInputElement | HTMLSelectElement>('[data-role="column"]')!.value) - 1,
          direction: row.querySelector<HTMLSelectElement>('[data-role="direction"]')!.value as SheetSortDirection,
        }));
      if (new Set(keys.map((key) => key.column)).size !== keys.length) {
        status.textContent = 'Sort levels cannot use the same column'; return;
      }
      try {
        this.commands.run(SortSheetRangeCommand, { range, keys, firstRowIsHeader: header.checked });
        this.headerByRange.set(rangeKey, header.checked);
        this.close();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Sort failed';
      }
    });
    actions.append(cancel, confirm);
    panel.append(title, close, headerLabel, criteria, add, status, actions);
    root.append(panel);
    root.addEventListener('click', (event) => { if (event.target === root) this.close(); });
    document.body.append(root);
    this.root = root;
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); this.close(); }
    });
    header.focus();
  }
}

function appendCriterion(
  container: HTMLElement, range: SheetSortRangeInput['range'], selectedColumn: number, onChange: () => void,
): void {
  const used = new Set(Array.from(container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-role="column"]'),
    (control) => Number(control.value)));
  const preferred = Math.max(range.start[1], Math.min(selectedColumn, range.end[1])) + 1;
  const available = !used.has(preferred) ? preferred : Array.from(
    { length: range.end[1] - range.start[1] + 1 }, (_, index) => range.start[1] + index + 1,
  ).find((column) => !used.has(column));
  if (available === undefined) return;
  const row = document.createElement('div'); row.className = 'sear-sheet-sort-criterion';
  const label = document.createElement('span');
  label.textContent = container.children.length ? 'Secondary sort' : 'Primary sort';
  const columnCount = range.end[1] - range.start[1] + 1;
  let column: HTMLInputElement | HTMLSelectElement;
  if (columnCount <= 256) {
    const select = document.createElement('select');
    for (let index = range.start[1]; index <= range.end[1]; index++) {
      const option = document.createElement('option');
      option.value = String(index + 1); option.textContent = columnName(index);
      select.append(option);
    }
    select.value = String(available);
    column = select;
  } else {
    const input = document.createElement('input');
    input.type = 'number'; input.min = String(range.start[1] + 1);
    input.max = String(range.end[1] + 1); input.value = String(available);
    column = input;
  }
  column.dataset['role'] = 'column';
  column.addEventListener('change', onChange);
  const direction = document.createElement('select');
  direction.dataset['role'] = 'direction';
  for (const [value, text] of [
    [SheetSortDirection.Ascending, 'Ascending'], [SheetSortDirection.Descending, 'Descending'],
  ]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text;
    direction.append(option);
  }
  const remove = document.createElement('button');
  remove.type = 'button'; remove.textContent = '×';
  remove.addEventListener('click', () => { row.remove(); refreshCriteriaState(container); onChange(); });
  row.append(label, column, direction, remove);
  container.append(row);
  refreshCriteriaState(container);
  onChange();
}

function refreshCriteriaState(container: HTMLElement): void {
  const rows = Array.from(container.querySelectorAll<HTMLElement>('.sear-sheet-sort-criterion'));
  rows.forEach((row, index) => {
    const level = index === 0 ? 'Primary sort' : index === 1 ? 'Secondary sort' : `Sort level ${index + 1}`;
    row.querySelector('span')!.textContent = level;
    row.querySelector<HTMLElement>('[data-role="column"]')!.setAttribute('aria-label', `${level} column`);
    row.querySelector<HTMLSelectElement>('[data-role="direction"]')!.setAttribute('aria-label', `${level} direction`);
    const remove = row.querySelector<HTMLButtonElement>('button')!;
    remove.disabled = rows.length === 1;
    remove.setAttribute('aria-label', `Remove ${level}`);
    remove.title = `Remove ${level}`;
  });
}

function formatRange(range: SheetSortRangeInput['range']): string {
  return `${columnName(range.start[1])}${range.start[0] + 1}:${columnName(range.end[1])}${range.end[0] + 1}`;
}

function columnName(column: number): string {
  let value = column + 1; let result = '';
  while (value > 0) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}
