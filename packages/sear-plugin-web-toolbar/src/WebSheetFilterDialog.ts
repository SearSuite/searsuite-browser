import { SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { SearError } from '@searsuite/sear-foundation-error';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { SheetSortDirection, SortSheetRangeCommand } from '@searsuite/sear-plugin-sort';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';
import {
  ClearSheetFilterCommand, ReadSheetFilterQuery, ReadSheetFilterValuesQuery,
  SetSheetColumnFilterCommand, SetSheetColumnFiltersCommand, SetSheetFilterHeaderCommand,
  SheetFilterCategory, SheetFilterColorProperty, SheetFilterKind, SheetFilterOperator,
  parseSheetFilterNumber,
  type SheetFilterDefinition, type SheetFilterPredicate,
} from '@searsuite/sear-plugin-filter';

type FilterMode = 'values' | 'condition' | 'color';
interface ValueSelection { defaultSelected: boolean; exceptions: Set<string> }

const conditionOptions: Record<string, readonly [SheetFilterOperator, string][]> = {
  [SheetFilterCategory.Number]: [
    [SheetFilterOperator.Equal, 'Equals'], [SheetFilterOperator.NotEqual, 'Does not equal'],
    [SheetFilterOperator.Greater, 'Greater than'], [SheetFilterOperator.GreaterEqual, 'Greater than or equal to'],
    [SheetFilterOperator.Less, 'Less than'], [SheetFilterOperator.LessEqual, 'Less than or equal to'],
    [SheetFilterOperator.Between, 'Between'], [SheetFilterOperator.NotBetween, 'Not between'],
  ],
  [SheetFilterCategory.Text]: [
    [SheetFilterOperator.Equal, 'Equals'], [SheetFilterOperator.NotEqual, 'Does not equal'],
    [SheetFilterOperator.StartsWith, 'Starts with'], [SheetFilterOperator.NotStartsWith, 'Does not start with'],
    [SheetFilterOperator.EndsWith, 'Ends with'], [SheetFilterOperator.NotEndsWith, 'Does not end with'],
    [SheetFilterOperator.Contains, 'Contains'], [SheetFilterOperator.NotContains, 'Does not contain'],
  ],
  [SheetFilterCategory.Date]: [
    [SheetFilterOperator.Equal, 'Is'], [SheetFilterOperator.Less, 'Before'],
    [SheetFilterOperator.Greater, 'After'], [SheetFilterOperator.Between, 'Between'],
  ],
};

/** Web-only editor for the filter plugin's public command and query surface. */
export class WebSheetFilterDialog {
  private root: HTMLElement | null = null;

  public constructor(
    private readonly commands: SheetCommandBus,
    private readonly queries: SheetQueryRegistry,
    private readonly platform: Pick<Platform, 'toLowerCase'>,
  ) {}

  public destroy(): void { this.root?.remove(); this.root = null; }

  public open(selectedColumn: number): void {
    this.destroy();
    const filter = this.queries.run(ReadSheetFilterQuery, void 0);
    if (!filter) return;
    const closePanel = () => {
      const current = this.queries.run(ReadSheetFilterQuery, void 0);
      if (filter.privateView && filter.rules.length === 0 && current?.privateView && current.rules.length === 0)
        this.commands.run(ClearSheetFilterCommand, void 0);
      this.destroy();
    };
    const root = document.createElement('div');
    root.className = 'sear-sheet-filter-overlay';
    const panel = document.createElement('section');
    panel.className = 'sear-sheet-filter-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Filter');
    const title = document.createElement('h2');
    title.textContent = filter.privateView ? 'Filter view' : 'Filter';
    const close = commandButton('×', 'Close', closePanel);
    close.className = 'sear-sheet-filter-close';
    const columnLabel = document.createElement('label');
    columnLabel.textContent = 'Column';
    const column = document.createElement('select');
    column.setAttribute('aria-label', 'Filter column');
    const cells = this.queries.has(ReadSheetCellDataQuery)
      ? this.queries.run(ReadSheetCellDataQuery, void 0) : null;
    for (let index = filter.range.start[1]; index <= filter.range.end[1]; index += 1) {
      const option = document.createElement('option');
      const value = filter.firstRowIsHeader ? cells?.getItem(filter.range.start[0], index)?.value : null;
      const header = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
      option.value = String(index); option.textContent = header ? `${columnName(index)} · ${header}` : columnName(index);
      column.append(option);
    }
    const updateColumnLabels = (firstRowIsHeader: boolean) => {
      for (let index = filter.range.start[1]; index <= filter.range.end[1]; index += 1) {
        const value = firstRowIsHeader ? cells?.getItem(filter.range.start[0], index)?.value : null;
        const headerName = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
        column.options[index - filter.range.start[1]]!.textContent = headerName
          ? `${columnName(index)} · ${headerName}` : columnName(index);
      }
    };
    column.value = String(Math.max(filter.range.start[1], Math.min(selectedColumn, filter.range.end[1])));
    columnLabel.append(column);
    const headerLabel = document.createElement('label');
    headerLabel.className = 'sear-sheet-filter-header';
    const header = document.createElement('input');
    header.type = 'checkbox'; header.checked = filter.firstRowIsHeader;
    header.setAttribute('aria-label', 'First row contains headers');
    headerLabel.append(header, 'First row contains headers');
    const tabs = document.createElement('div');
    tabs.className = 'sear-sheet-filter-tabs';
    tabs.setAttribute('role', 'tablist');
    const sorting = document.createElement('div');
    sorting.className = 'sear-sheet-filter-sorting';
    for (const [direction, label] of [
      [SheetSortDirection.Ascending, 'Sort ascending'], [SheetSortDirection.Descending, 'Sort descending'],
    ] as const) {
      const button = commandButton(label, label, () => {
        try {
          this.commands.run(SortSheetRangeCommand, {
            range: filter.range, keys: [{ column: Number(column.value), direction }],
            firstRowIsHeader: header.checked,
          });
          this.destroy();
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Sort failed';
        }
      });
      button.disabled = !this.commands.has(SortSheetRangeCommand);
      sorting.append(button);
    }
    const body = document.createElement('div');
    body.className = 'sear-sheet-filter-body';
    const status = document.createElement('p');
    status.className = 'sear-sheet-filter-status';
    status.setAttribute('role', 'alert');
    const autoLabel = document.createElement('label');
    autoLabel.className = 'sear-sheet-filter-auto';
    const autoApply = document.createElement('input');
    autoApply.type = 'checkbox'; autoApply.checked = true;
    autoLabel.append(autoApply, 'Apply automatically');
    const actions = document.createElement('div');
    actions.className = 'sear-sheet-filter-actions';
    const clear = commandButton('Clear column', 'Clear filter for this column', () => {
      this.commands.run(SetSheetColumnFilterCommand, { column: Number(column.value), predicate: null });
      this.destroy();
    });
    const cancel = commandButton('Close', 'Automatically applied changes take effect immediately; closing will not undo them', closePanel);
    const apply = commandButton('Apply', 'Apply filter', () => applyCurrent(true));
    actions.append(clear, cancel, apply);
    panel.append(title, close, columnLabel, headerLabel, sorting, tabs, body, autoLabel, status, actions);
    root.append(panel);
    root.addEventListener('click', (event) => { if (event.target === root) closePanel(); });
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePanel(); });
    document.body.append(root);
    this.root = root;

    let currentMode: FilterMode = filter.rules.find((rule) => rule.column === Number(column.value))?.predicate.kind ?? 'values';
    let currentColumn = Number(column.value);
    const valueSelections = new Map<number, ValueSelection>();
    const conditionDrafts = new Map<number, SheetFilterPredicate>();
    const pendingPredicates = new Map<number, SheetFilterPredicate | null>();
    const dirtyColumns = new Set<number>();
    const saveConditionDraft = () => {
      if (currentMode !== 'condition') return;
      const category = body.querySelector<HTMLSelectElement>('[data-role=category]');
      const operator = body.querySelector<HTMLSelectElement>('[data-role=operator]');
      const value = body.querySelector<HTMLInputElement>('[data-role=value]');
      const second = body.querySelector<HTMLInputElement>('[data-role=secondValue]');
      if (!category || !operator || !value || !second) return;
      conditionDrafts.set(currentColumn, {
        kind: SheetFilterKind.Condition,
        category: category.value as SheetFilterCategory,
        operator: operator.value as SheetFilterOperator,
        value: value.value,
        ...(second.value ? { secondValue: second.value } : {}),
      });
    };
    const applyCurrent = (closeOnSuccess: boolean) => {
      try {
        const updates = new Map(pendingPredicates);
        const includeCurrent = autoApply.checked || dirtyColumns.has(currentColumn) || updates.size === 0;
        if (includeCurrent) updates.set(currentColumn, readPredicate(body, currentMode, valueSelections.get(currentColumn)));
        const entries = [...updates].map(([entryColumn, predicate]) => ({ column: entryColumn, predicate }));
        if (entries.length === 1) this.commands.run(SetSheetColumnFilterCommand, entries[0]!);
        else this.commands.run(SetSheetColumnFiltersCommand, { updates: entries });
        pendingPredicates.clear();
        dirtyColumns.clear();
        if (includeCurrent) clear.disabled = updates.get(currentColumn) === null;
        status.textContent = closeOnSuccess ? '' : 'Applied automatically; closing will not undo this change';
        if (closeOnSuccess) this.destroy();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Filter failed';
        const existingRule = this.queries.run(ReadSheetFilterQuery, void 0)?.rules
          .some((entry) => entry.column === Number(column.value));
        status.textContent = closeOnSuccess ? message
          : `${message}; ${existingRule ? 'the previous filter is still active' : 'the current condition has not taken effect'}`;
      }
    };
    const applyAutomatically = () => {
      if (autoApply.checked) applyCurrent(false);
      else dirtyColumns.add(currentColumn);
    };
    autoApply.addEventListener('change', () => {
      cancel.textContent = autoApply.checked ? 'Close' : 'Cancel';
      cancel.title = autoApply.checked ? 'Automatically applied changes take effect immediately; closing will not undo them' : 'Discard unapplied changes';
      if (autoApply.checked) applyCurrent(false);
    });

    const refresh = () => {
      const definition = this.queries.run(ReadSheetFilterQuery, void 0) ?? filter;
      const selected = Number(column.value);
      const rule = pendingPredicates.has(selected) ? pendingPredicates.get(selected) ?? undefined
        : definition.rules.find((entry) => entry.column === selected)?.predicate;
      tabs.replaceChildren();
      for (const [mode, label] of [
        ['values', 'Values'], ['condition', 'Condition'], ['color', 'Color'],
      ] as const) {
        const tab = commandButton(label, label, () => {
          const changed = currentMode !== mode;
          saveConditionDraft();
          currentMode = mode;
          if (changed && !autoApply.checked) dirtyColumns.add(currentColumn);
          refresh();
          if (changed && mode === 'values') applyAutomatically();
        });
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(currentMode === mode));
        tabs.append(tab);
      }
      body.replaceChildren();
      if (currentMode === 'values') {
        const index = Number(column.value);
        let selection = valueSelections.get(index);
        if (!selection) {
          selection = rule?.kind === SheetFilterKind.Values
            ? { defaultSelected: !!rule.excluded, exceptions: new Set(rule.values) }
            : { defaultSelected: true, exceptions: new Set() };
          valueSelections.set(index, selection);
        }
        this.renderValues(body, index, selection, applyAutomatically);
      }
      else if (currentMode === 'condition')
        renderCondition(body, conditionDrafts.get(Number(column.value)) ?? rule, applyAutomatically,
          () => { if (!autoApply.checked) dirtyColumns.add(currentColumn); });
      else renderColor(body, rule, applyAutomatically);
      clear.disabled = !rule;
      status.textContent = '';
    };
    column.addEventListener('change', () => {
      saveConditionDraft();
      if (!autoApply.checked && dirtyColumns.has(currentColumn)) {
        try {
          pendingPredicates.set(currentColumn, readPredicate(body, currentMode, valueSelections.get(currentColumn)));
        } catch (error) {
          column.value = String(currentColumn);
          status.textContent = error instanceof Error ? error.message : 'Filter failed';
          return;
        }
      }
      currentColumn = Number(column.value);
      currentMode = (pendingPredicates.has(currentColumn) ? pendingPredicates.get(currentColumn)
        : filter.rules.find((rule) => rule.column === currentColumn)?.predicate)?.kind ?? 'values';
      refresh();
    });
    header.addEventListener('change', () => {
      try {
        this.commands.run(SetSheetFilterHeaderCommand, { firstRowIsHeader: header.checked });
        updateColumnLabels(header.checked);
        refresh();
      } catch (error) {
        header.checked = !header.checked;
        status.textContent = error instanceof Error ? error.message : 'Could not update header row';
      }
    });
    refresh();
    column.focus();
  }

  private renderValues(
    body: HTMLElement, column: number, selection: ValueSelection, onChange: () => void,
  ): void {
    const matchKey = (value: string) => this.platform.toLowerCase(value);
    const hasValue = (value: string) => [...selection.exceptions].some((entry) => matchKey(entry) === matchKey(value));
    const deleteValue = (value: string) => {
      const key = matchKey(value);
      for (const entry of selection.exceptions) if (matchKey(entry) === key) selection.exceptions.delete(entry);
    };
    const addValue = (value: string) => {
      deleteValue(value);
      selection.exceptions.add(value);
    };
    const search = document.createElement('input');
    search.type = 'search'; search.placeholder = 'Search values'; search.setAttribute('aria-label', 'Search filter values');
    const readPage = () => this.queries.run(ReadSheetFilterValuesQuery, {
      column, search: search.value,
      includeBlank: !!search.value && ['(Blank cell)', '(Blank)'].some((label) => label.toLowerCase().includes(search.value.toLowerCase())),
    });
    const selectAll = commandButton('Select all', 'Select all', () => {
      if (search.value) {
        const page = readPage();
        for (const item of page.items) {
          if (selection.defaultSelected) deleteValue(item.value);
          else addValue(item.value);
        }
      } else {
        selection.defaultSelected = true;
        selection.exceptions.clear();
      }
      renderList();
      onChange();
    });
    const invert = commandButton('Invert selection', 'Invert selection', () => {
      if (search.value) {
        const page = readPage();
        for (const item of page.items) {
          if (hasValue(item.value)) deleteValue(item.value);
          else addValue(item.value);
        }
      } else {
        selection.defaultSelected = !selection.defaultSelected;
      }
      renderList();
      onChange();
    });
    const list = document.createElement('div');
    list.className = 'sear-sheet-filter-values';
    const limitMessage = document.createElement('p');
    limitMessage.className = 'sear-sheet-filter-limit';
    const renderList = () => {
      const page = readPage();
      selectAll.textContent = search.value ? 'Select all search results' : 'Select all';
      selectAll.disabled = !!search.value && page.items.length === 0;
      invert.textContent = search.value ? 'Invert search results' : 'Invert selection';
      invert.disabled = !!search.value && page.items.length === 0;
      list.replaceChildren();
      for (const item of page.items) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.value = item.value;
        checkbox.checked = selection.defaultSelected !== hasValue(item.value);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked === selection.defaultSelected) deleteValue(item.value);
          else addValue(item.value);
          onChange();
        });
        const name = document.createElement('span');
        name.textContent = item.value === '' ? '(Blank cell)'
          : item.isBoolean ? item.value.toUpperCase() : item.label ?? item.value;
        const count = document.createElement('small'); count.textContent = String(item.count);
        checkbox.setAttribute('aria-label', `${name.textContent}, ${item.count} ${item.count === 1 ? 'item' : 'items'}`);
        const only = commandButton('Only', `Filter only ${name.textContent}`, () => {
          selection.defaultSelected = false;
          selection.exceptions.clear();
          addValue(item.value);
          renderList();
          onChange();
        });
        only.setAttribute('aria-label', `Filter only ${name.textContent}`);
        label.append(checkbox, name, count, only);
        list.append(label);
      }
      limitMessage.textContent = page.items.length === 0 && search.value ? 'No matching values'
        : page.truncated ? 'Showing the first 200 values. Search to find others.' : '';
    };
    search.addEventListener('input', renderList);
    const controls = document.createElement('div'); controls.className = 'sear-sheet-filter-value-controls';
    controls.append(selectAll, invert);
    body.append(search, controls, list, limitMessage);
    renderList();
  }
}

function renderCondition(
  body: HTMLElement, rule: SheetFilterPredicate | undefined, onChange: () => void, onInput: () => void,
): void {
  const category = document.createElement('select'); category.dataset['role'] = 'category';
  category.setAttribute('aria-label', 'Condition type');
  for (const [value, label] of [
    [SheetFilterCategory.Number, 'Number'], [SheetFilterCategory.Text, 'Text'],
    [SheetFilterCategory.Date, 'Date'],
  ]) addOption(category, value, label);
  category.value = rule?.kind === SheetFilterKind.Condition ? rule.category : SheetFilterCategory.Number;
  const operator = document.createElement('select'); operator.dataset['role'] = 'operator';
  operator.setAttribute('aria-label', 'Filter condition');
  const value = document.createElement('input'); value.dataset['role'] = 'value';
  value.setAttribute('aria-label', 'Condition value');
  const second = document.createElement('input'); second.dataset['role'] = 'secondValue';
  second.setAttribute('aria-label', 'Second condition value');
  const refresh = (preferred?: SheetFilterOperator) => {
    operator.replaceChildren();
    for (const [code, label] of conditionOptions[category.value] ?? []) addOption(operator, code, label);
    const selected = preferred ?? (rule?.kind === SheetFilterKind.Condition && rule.category === category.value
      ? rule.operator : undefined);
    if (selected && Array.from(operator.options).some((option) => option.value === selected)) operator.value = selected;
    value.type = second.type = category.value === SheetFilterCategory.Date ? 'date' : 'text';
    second.hidden = operator.value !== SheetFilterOperator.Between && operator.value !== SheetFilterOperator.NotBetween;
  };
  category.addEventListener('change', () => { refresh(); onChange(); });
  operator.addEventListener('change', () => { refresh(operator.value as SheetFilterOperator); onChange(); });
  for (const input of [value, second]) {
    input.addEventListener('input', onInput);
    input.addEventListener('change', () => { if (input.type === 'date') onChange(); });
    input.addEventListener('blur', () => { if (input.type !== 'date') onChange(); });
  }
  refresh();
  if (rule?.kind === SheetFilterKind.Condition) {
    value.value = rule.value;
    second.value = rule.secondValue ?? '';
  }
  body.append(category, operator, value, second);
}

function renderColor(body: HTMLElement, rule: SheetFilterPredicate | undefined, onChange: () => void): void {
  const property = document.createElement('select'); property.dataset['role'] = 'property';
  property.setAttribute('aria-label', 'Color property');
  addOption(property, SheetFilterColorProperty.Fill, 'Cell color');
  addOption(property, SheetFilterColorProperty.Text, 'Text color');
  const emptyLabel = document.createElement('label');
  const empty = document.createElement('input'); empty.type = 'checkbox'; empty.dataset['role'] = 'noColor';
  const emptyText = document.createTextNode('');
  emptyLabel.append(empty, emptyText);
  const updateEmptyLabel = () => {
    emptyText.textContent = property.value === SheetFilterColorProperty.Text ? 'No explicit text color' : 'No fill';
  };
  const color = document.createElement('input'); color.type = 'color'; color.dataset['role'] = 'color';
  color.setAttribute('aria-label', 'Filter color');
  if (rule?.kind === SheetFilterKind.Color) {
    property.value = rule.property;
    empty.checked = rule.color === null;
    if (rule.color?.startsWith('#')) color.value = rule.color;
  }
  color.disabled = empty.checked;
  empty.addEventListener('change', () => { color.disabled = empty.checked; onChange(); });
  property.addEventListener('change', () => { updateEmptyLabel(); onChange(); });
  color.addEventListener('change', onChange);
  updateEmptyLabel();
  body.append(property, emptyLabel, color);
}

function readPredicate(body: HTMLElement, mode: FilterMode, selection?: ValueSelection): SheetFilterPredicate | null {
  if (mode === 'values') {
    if (!selection) throw new SearError('Filter values have not loaded');
    if (selection.defaultSelected && selection.exceptions.size === 0) return null;
    return {
      kind: SheetFilterKind.Values, values: [...selection.exceptions],
      ...(selection.defaultSelected ? { excluded: true } : {}),
    };
  }
  if (mode === 'color') return {
    kind: SheetFilterKind.Color,
    property: body.querySelector<HTMLSelectElement>('[data-role=property]')!.value as SheetFilterColorProperty,
    color: body.querySelector<HTMLInputElement>('[data-role=noColor]')!.checked ? null
      : body.querySelector<HTMLInputElement>('[data-role=color]')!.value,
  };
  const value = body.querySelector<HTMLInputElement>('[data-role=value]')!.value;
  if (value === '') throw new SearError('Enter a condition value');
  const operator = body.querySelector<HTMLSelectElement>('[data-role=operator]')!.value as SheetFilterOperator;
  const secondValue = body.querySelector<HTMLInputElement>('[data-role=secondValue]')!.value;
  if ((operator === SheetFilterOperator.Between || operator === SheetFilterOperator.NotBetween) && !secondValue)
    throw new SearError('Enter a second condition value');
  const category = body.querySelector<HTMLSelectElement>('[data-role=category]')!.value as SheetFilterCategory;
  if (category === SheetFilterCategory.Number) {
    const lower = parseSheetFilterNumber(value);
    const interval = operator === SheetFilterOperator.Between || operator === SheetFilterOperator.NotBetween;
    const upper = interval ? parseSheetFilterNumber(secondValue) : null;
    if (lower === null || (interval && upper === null)) throw new SearError('Enter a valid number');
    if (upper !== null && lower > upper) throw new SearError('The lower bound cannot exceed the upper bound');
  }
  return {
    kind: SheetFilterKind.Condition,
    category,
    operator, value,
    ...(secondValue ? { secondValue } : {}),
  };
}

function addOption(select: HTMLSelectElement, value: string, label: string): void {
  const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option);
}

function commandButton(text: string, title: string, command: () => void): HTMLButtonElement {
  const button = document.createElement('button'); button.type = 'button';
  button.textContent = text; button.title = title;
  button.addEventListener('click', command);
  return button;
}

function columnName(column: number): string {
  let value = column + 1; let result = '';
  while (value > 0) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}
