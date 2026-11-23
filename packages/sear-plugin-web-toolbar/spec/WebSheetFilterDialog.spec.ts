import { type SheetCommandBus, type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import {
  ReadSheetFilterQuery, ReadSheetFilterValuesQuery, SetSheetColumnFilterCommand,
  SetSheetColumnFiltersCommand,
  SheetFilterCategory, SheetFilterColorProperty, SheetFilterKind, SheetFilterOperator,
  type SheetFilterDefinition, type SheetFilterValueCount,
} from '@searsuite/sear-plugin-filter';
import { WebSheetFilterDialog } from '../src/WebSheetFilterDialog';
import { SheetSortDirection, SortSheetRangeCommand } from '@searsuite/sear-plugin-sort';
import { WebKeyboardRouter } from '@searsuite/sear-browser-adapters';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';

const definition: SheetFilterDefinition = {
  range: { start: [0, 0], end: [3, 1] }, rules: [], firstRowIsHeader: true, privateView: false,
};

describe('WebSheetFilterDialog', () => {
  afterEach(() => document.body.replaceChildren());

  function open(activeDefinition = definition, truncated = false, items = [
    { value: 'Ada', count: 2 }, { value: '', count: 1 },
  ] as SheetFilterValueCount[], headers?: readonly string[]) {
    const run = jest.fn();
    const queries = {
      has: (query: unknown) => query === ReadSheetCellDataQuery && headers !== undefined,
      run: jest.fn((query: unknown, input?: { search?: string; includeBlank?: boolean }) => query === ReadSheetFilterQuery
        ? activeDefinition : query === ReadSheetCellDataQuery
        ? { getItem: (_row: number, column: number) => ({ type: 'string', value: headers?.[column] }) }
        : query === ReadSheetFilterValuesQuery
        ? { items: items.filter((item) => !input?.search ||
            (item.value === '' && input.includeBlank) || item.value.toLowerCase().includes(input.search.toLowerCase())),
          truncated } : null),
    } as unknown as SheetQueryRegistry;
    const dialog = new WebSheetFilterDialog(
      { run, has: () => true } as unknown as SheetCommandBus, queries,
      { toLowerCase: (value) => value.toLowerCase() },
    );
    dialog.open(0);
    return { run, dialog, queries };
  }

  it('applies selected values including blank values', () => {
    const { run } = open();
    const boxes = document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input');
    boxes[0]!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'], excluded: true },
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'], excluded: true },
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('INT15-021 keeps a selected value checked when its first visible spelling changes', () => {
    open({ ...definition, rules: [{ column: 0, predicate: { kind: SheetFilterKind.Values, values: ['a'] } }] },
      false, [{ value: 'A', count: 2 }]);
    const checkbox = document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!;
    expect(checkbox.checked).toBe(true);
  });

  it('BUG-486 enables clearing the column after automatic value filtering', () => {
    const { run } = open();
    const clear = document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:first-child')!;
    expect(clear.disabled).toBe(true);
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-values button')!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'] },
    });
    expect(clear.disabled).toBe(false);
    clear.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, { column: 0, predicate: null });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-555 applies pending value choices when automatic filtering is re-enabled', () => {
    const { run } = open(definition, false, [
      { value: 'apple', count: 2 }, { value: 'banana', count: 1 },
    ]);
    const auto = document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!;
    auto.click();
    const banana = document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input')[1]!;
    banana.click();
    expect(run).not.toHaveBeenCalled();
    auto.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['banana'], excluded: true },
    });
    expect(document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:first-child')!.disabled).toBe(false);
  });

  it('BUG-038 makes automatic application and close semantics explicit', () => {
    const { run } = open();
    const dismiss = document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:nth-child(2)')!;
    expect(dismiss.textContent).toBe('Close');
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!.click();
    expect(document.querySelector('[role="alert"]')?.textContent)
      .toBe('Applied automatically; closing will not undo this change');
    expect(run).toHaveBeenCalledTimes(1);
    dismiss.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
    open();
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!.click();
    expect(document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:nth-child(2)')?.textContent)
      .toBe('Cancel');
  });

  it('BUG-557 reapplies the visible value choices when returning from color filtering', () => {
    const active: SheetFilterDefinition = { ...definition, rules: [{
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['banana'], excluded: true },
    }] };
    const { run } = open(active, false, [
      { value: 'apple', count: 2 }, { value: 'banana', count: 1 },
    ]);
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click();
    document.querySelector<HTMLInputElement>('[data-role=noColor]')!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Color, property: SheetFilterColorProperty.Fill, color: null },
    });
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0]!.click();
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => box.checked)).toEqual([true, false]);
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['banana'], excluded: true },
    });
  });

  it('BUG-561 automatically applies a text condition after its value loses focus', () => {
    const active: SheetFilterDefinition = { ...definition, rules: [{
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Text,
        operator: SheetFilterOperator.StartsWith, value: 'app',
      },
    }] };
    const { run } = open(active);
    const value = document.querySelector<HTMLInputElement>('[data-role=value]')!;
    value.value = 'ban';
    value.dispatchEvent(new Event('input'));
    expect(run).not.toHaveBeenCalled();
    value.dispatchEvent(new Event('blur'));
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Text,
        operator: SheetFilterOperator.StartsWith, value: 'ban',
      },
    });
    expect(document.querySelector('[role="alert"]')?.textContent)
      .toBe('Applied automatically; closing will not undo this change');
  });

  it('BUG-591 preserves an unapplied condition draft when switching columns', () => {
    const twoColumns: SheetFilterDefinition = { ...definition, range: {
      start: [0, 0], end: [3, 1],
    } };
    const { run } = open(twoColumns);
    const auto = document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!;
    auto.click();
    const column = document.querySelector<HTMLSelectElement>('[aria-label="Filter column"]')!;
    column.value = '1'; column.dispatchEvent(new Event('change'));
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    const value = document.querySelector<HTMLInputElement>('[data-role=value]')!;
    value.value = '2';
    value.dispatchEvent(new Event('input'));
    column.value = '0'; column.dispatchEvent(new Event('change'));
    column.value = '1'; column.dispatchEvent(new Event('change'));
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    expect(document.querySelector<HTMLInputElement>('[data-role=value]')?.value).toBe('2');
    expect(run).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 1, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Number,
        operator: SheetFilterOperator.Equal, value: '2',
      },
    });
  });

  it('BUG-054 applies unapplied value choices from both columns together', () => {
    const { run } = open(definition, false, [
      { value: 'Ada', count: 1 }, { value: 'Bob', count: 1 },
    ]);
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!.click();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-values button')!.click();
    const column = document.querySelector<HTMLSelectElement>('[aria-label="Filter column"]')!;
    column.value = '1'; column.dispatchEvent(new Event('change'));
    document.querySelectorAll<HTMLButtonElement>('.sear-sheet-filter-values button')[1]!.click();
    expect(run).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(SetSheetColumnFiltersCommand, { updates: [
      { column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'] } },
      { column: 1, predicate: { kind: SheetFilterKind.Values, values: ['Bob'] } },
    ] });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-624 explains when an incomplete condition leaves the previous filter active', () => {
    const active: SheetFilterDefinition = { ...definition, rules: [{
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Text,
        operator: SheetFilterOperator.Contains, value: 'Alice',
      },
    }] };
    const { run } = open(active);
    const category = document.querySelector<HTMLSelectElement>('[data-role=category]')!;
    category.value = SheetFilterCategory.Date;
    category.dispatchEvent(new Event('change'));
    expect(document.querySelector<HTMLInputElement>('[data-role=value]')!.value).toBe('');
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Enter a condition value; the previous filter is still active');
    expect(run).not.toHaveBeenCalled();
    document.querySelector<HTMLInputElement>('[data-role=value]')!.value = '2026-11-06';
    document.querySelector<HTMLInputElement>('[data-role=value]')!.dispatchEvent(new Event('change'));
    expect(document.querySelector('[role="alert"]')?.textContent)
      .toBe('Applied automatically; closing will not undo this change');
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Date,
        operator: SheetFilterOperator.Equal, value: '2026-11-06',
      },
    });
  });

  it('keeps selections across searches and supports filtering only one value', () => {
    const { run, queries } = open();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = 'Ada';
    search.dispatchEvent(new Event('input'));
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!.click();
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!.checked).toBe(false);
    expect((queries.run as jest.Mock).mock.calls.some(([query, input]) =>
      query === ReadSheetFilterValuesQuery && input.search === 'Ada')).toBe(true);
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-values button')!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'] },
    });
  });

  it('BUG-035 inverts only matching values when a value search is active', () => {
    open();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = 'Ada';
    search.dispatchEvent(new Event('input'));
    const invert = document.querySelector<HTMLButtonElement>('.sear-sheet-filter-value-controls button:last-child')!;
    expect(invert.textContent).toBe('Invert search results');
    invert.click();
    search.value = '';
    search.dispatchEvent(new Event('input'));
    const boxes = document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input');
    expect(Array.from(boxes, (box) => box.checked)).toEqual([false, true]);
    expect(invert.textContent).toBe('Invert selection');
  });

  it('BUG-609 leaves numeric and blank values selected when inverting a Unicode search result', () => {
    open(definition, false, [
      { value: '1', count: 1 }, { value: '\u4f60\u597d\uff0c\u4e16\u754c', count: 1 }, { value: '', count: 1 },
    ]);
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = '\u4f60\u597d';
    search.dispatchEvent(new Event('input'));
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => [box.value, box.checked])).toEqual([['\u4f60\u597d\uff0c\u4e16\u754c', true]]);
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-value-controls button:last-child')!.click();
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => [box.value, box.checked])).toEqual([
      ['1', true], ['\u4f60\u597d\uff0c\u4e16\u754c', false], ['', true],
    ]);
  });

  it('BUG-562 keeps search-field Tab inside the filter dialog', () => {
    const onTab = jest.fn();
    const router = new WebKeyboardRouter(document);
    router.subscribe({ onTab });
    router.startListener();
    try {
      open();
      const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
      search.focus();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      search.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
      expect(onTab).not.toHaveBeenCalled();
      document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:nth-child(2)')!.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(onTab).toHaveBeenCalledWith(false);
    } finally {
      router.stopListener();
    }
  });

  it('BUG-578 labels filter columns with their header values when a header row is enabled', () => {
    const filter = { ...definition, range: { start: [12, 1] as [number, number], end: [15, 2] as [number, number] } };
    open(filter, false, [{ value: 'Alice', count: 1 }], ['', 'Name', 'Num']);
    expect(Array.from(document.querySelectorAll<HTMLOptionElement>('[aria-label="Filter column"] option'),
      (option) => option.textContent)).toEqual(['B · Name', 'C · Num']);
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-close')!.click();
    open({ ...filter, firstRowIsHeader: false }, false, [{ value: 'Alice', count: 1 }], ['', 'Name', 'Num']);
    expect(Array.from(document.querySelectorAll<HTMLOptionElement>('[aria-label="Filter column"] option'),
      (option) => option.textContent)).toEqual(['B', 'C']);
  });

  it('BUG-491 selects only matching values while a search is active', () => {
    open();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = 'Ada';
    search.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-values button')!.click();
    const selectAll = document.querySelector<HTMLButtonElement>('.sear-sheet-filter-value-controls button:first-child')!;
    expect(selectAll.textContent).toBe('Select all search results');
    selectAll.click();
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => box.checked)).toEqual([true, false]);
  });

  it('BUG-565 disables selection commands when a search has no results', () => {
    open();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-value-controls button:last-child')!.click();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = 'zzzz';
    search.dispatchEvent(new Event('input'));
    const buttons = document.querySelectorAll<HTMLButtonElement>('.sear-sheet-filter-value-controls button');
    expect(Array.from(buttons, (button) => button.disabled)).toEqual([true, true]);
    buttons[0]!.click();
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => box.checked)).toEqual([false, false]);
  });

  it('BUG-625 explains an empty value search and clears the message with the search', () => {
    open();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = 'zzzz';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelector('.sear-sheet-filter-limit')?.textContent).toBe('No matching values');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelector('.sear-sheet-filter-limit')?.textContent).toBe('');
  });

  it('names each only-this-value button and applies its own value', () => {
    const { run } = open();
    const buttons = document.querySelectorAll<HTMLButtonElement>('.sear-sheet-filter-values button');
    expect(Array.from(buttons, (button) => button.getAttribute('aria-label')))
      .toEqual(['Filter only Ada', 'Filter only (Blank cell)']);
    buttons[1]!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: [''] },
    });
  });

  it('BUG-490 distinguishes a blank cell from literal blank-looking text', () => {
    open(definition, false, [{ value: '', count: 1 }, { value: '(Blank)', count: 1 }]);
    expect(Array.from(document.querySelectorAll('.sear-sheet-filter-values label span'),
      (name) => name.textContent)).toEqual(['(Blank cell)', '(Blank)']);
    expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-filter-values button'),
      (button) => button.getAttribute('aria-label'))).toEqual(['Filter only (Blank cell)', 'Filter only (Blank)']);
  });

  it('BUG-489 finds a real blank cell by its visible label alongside literal text', () => {
    const { queries } = open(definition, false, [{ value: '', count: 1 }, { value: '(Blank)', count: 1 }]);
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search filter values"]')!;
    search.value = '(Blank)';
    search.dispatchEvent(new Event('input'));
    expect(Array.from(document.querySelectorAll('.sear-sheet-filter-values label span'),
      (name) => name.textContent)).toEqual(['(Blank cell)', '(Blank)']);
    expect((queries.run as jest.Mock)).toHaveBeenCalledWith(ReadSheetFilterValuesQuery,
      { column: 0, search: '(Blank)', includeBlank: true });
  });

  it('BUG-592 keeps each checkbox name separate from its only-this-value button', () => {
    open();
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => box.getAttribute('aria-label'))).toEqual(['Ada, 2 items', '(Blank cell), 1 item']);
  });

  it('BUG-863 shows boolean values as TRUE/FALSE while filtering by their original keys', () => {
    const { run } = open(definition, false, [
      { value: 'true', count: 1, isBoolean: true },
      { value: 'false', count: 1, isBoolean: true },
      { value: 'true text', count: 1 },
    ]);
    expect(Array.from(document.querySelectorAll('.sear-sheet-filter-values label span'),
      (name) => name.textContent)).toEqual(['TRUE', 'FALSE', 'true text']);
    expect(Array.from(document.querySelectorAll<HTMLInputElement>('.sear-sheet-filter-values input'),
      (box) => box.getAttribute('aria-label'))).toEqual(['TRUE, 1 item', 'FALSE, 1 item', 'true text, 1 item']);
    document.querySelector<HTMLButtonElement>('[aria-label="Filter only TRUE"]')!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['true'] },
    });
  });

  it('applies a typed numeric condition', () => {
    const { run } = open();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    const operator = document.querySelector<HTMLSelectElement>('[data-role=operator]')!;
    operator.value = SheetFilterOperator.Greater;
    operator.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('[data-role=value]')!.value = '25';
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0,
      predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Number,
        operator: SheetFilterOperator.Greater, value: '25',
      },
    });
  });

  it('BUG-041 keeps the dialog open for nonnumeric filter conditions', () => {
    const { run } = open();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    const operator = document.querySelector<HTMLSelectElement>('[data-role=operator]')!;
    operator.value = SheetFilterOperator.Greater;
    operator.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('[data-role=value]')!.value = 'abc';
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Enter a valid number');
    expect(run).not.toHaveBeenCalledWith(SetSheetColumnFilterCommand, expect.anything());
  });

  it('BUG-487 rejects an inverted numeric interval and accepts corrected bounds', () => {
    const { run } = open();
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!.click();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    const operator = document.querySelector<HTMLSelectElement>('[data-role=operator]')!;
    operator.value = SheetFilterOperator.Between;
    operator.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('[data-role=value]')!.value = '10';
    const upper = document.querySelector<HTMLInputElement>('[data-role=secondValue]')!;
    upper.value = '2';
    const apply = document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!;
    apply.click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('The lower bound cannot exceed the upper bound');
    expect(run).not.toHaveBeenCalledWith(SetSheetColumnFilterCommand, expect.anything());
    upper.value = '20';
    apply.click();
    expect(run).toHaveBeenCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Number,
        operator: SheetFilterOperator.Between, value: '10', secondValue: '20',
      },
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('sorts within the filter range while keeping its header', () => {
    const { run } = open();
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-sorting button:last-child')!.click();
    expect(run).toHaveBeenCalledWith(SortSheetRangeCommand, {
      range: definition.range, keys: [{ column: 0, direction: SheetSortDirection.Descending }],
      firstRowIsHeader: true,
    });
  });

  it('inverts all values, including those outside a truncated page', () => {
    const { run } = open(definition, true);
    expect(document.querySelector('.sear-sheet-filter-limit')?.textContent).toContain('first 200 values');
    const controls = document.querySelectorAll<HTMLButtonElement>('.sear-sheet-filter-value-controls button');
    controls[1]!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: [] },
    });
    controls[0]!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, { column: 0, predicate: null });
  });

  it('retains an exclusion rule while searching and switching columns', () => {
    const active: SheetFilterDefinition = { ...definition, rules: [{
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'], excluded: true },
    }] };
    const { run } = open(active);
    expect(document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!.checked).toBe(false);
    const column = document.querySelector<HTMLSelectElement>('[aria-label="Filter column"]')!;
    column.value = '1'; column.dispatchEvent(new Event('change'));
    expect(document.querySelector<HTMLInputElement>('.sear-sheet-filter-values input')!.checked).toBe(true);
    column.value = '0'; column.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Values, values: ['Ada'], excluded: true },
    });
  });

  it('offers color filtering and no-fill selection', () => {
    const { run } = open();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click();
    const noColor = document.querySelector<HTMLInputElement>('[data-role=noColor]')!;
    noColor.click();
    expect(document.querySelector<HTMLInputElement>('[data-role=color]')!.disabled).toBe(true);
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Color, property: 'fill', color: null },
    });
    noColor.click();
    const picker = document.querySelector<HTMLInputElement>('[data-role=color]')!;
    picker.value = '#aabbcc'; picker.dispatchEvent(new Event('change'));
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Color, property: 'fill', color: '#aabbcc' },
    });
  });

  it('BUG-079 names the empty-color option for the selected color property', () => {
    open();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click();
    const property = document.querySelector<HTMLSelectElement>('[data-role=property]')!;
    const noColor = document.querySelector<HTMLInputElement>('[data-role=noColor]')!;
    expect(noColor.parentElement?.textContent).toBe('No fill');
    property.value = SheetFilterColorProperty.Text;
    property.dispatchEvent(new Event('change'));
    expect(noColor.parentElement?.textContent).toBe('No explicit text color');
    property.value = SheetFilterColorProperty.Fill;
    property.dispatchEvent(new Event('change'));
    expect(noColor.parentElement?.textContent).toBe('No fill');
  });

  it('BUG-590 exposes an accurate checkbox name for empty text color', () => {
    const { run } = open();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click();
    const property = document.querySelector<HTMLSelectElement>('[data-role=property]')!;
    property.value = SheetFilterColorProperty.Text;
    property.dispatchEvent(new Event('change'));
    expect(document.querySelector<HTMLInputElement>('[data-role=noColor]')?.parentElement?.textContent)
      .toBe('No explicit text color');
    document.querySelector<HTMLInputElement>('[data-role=noColor]')!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: { kind: SheetFilterKind.Color, property: SheetFilterColorProperty.Text, color: null },
    });
  });

  it('requires both bounds for a date interval and lets auto-apply be disabled', () => {
    const { run } = open();
    document.querySelector<HTMLInputElement>('.sear-sheet-filter-auto input')!.click();
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click();
    const category = document.querySelector<HTMLSelectElement>('[data-role=category]')!;
    category.value = SheetFilterCategory.Date; category.dispatchEvent(new Event('change'));
    const operator = document.querySelector<HTMLSelectElement>('[data-role=operator]')!;
    operator.value = SheetFilterOperator.Between; operator.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('[data-role=value]')!.value = '2026-01-01';
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector('.sear-sheet-filter-status')?.textContent).toContain('second condition value');
    document.querySelector<HTMLInputElement>('[data-role=secondValue]')!.value = '2026-01-31';
    document.querySelector<HTMLButtonElement>('.sear-sheet-filter-actions button:last-child')!.click();
    expect(run).toHaveBeenLastCalledWith(SetSheetColumnFilterCommand, {
      column: 0, predicate: {
        kind: SheetFilterKind.Condition, category: SheetFilterCategory.Date,
        operator: SheetFilterOperator.Between, value: '2026-01-01', secondValue: '2026-01-31',
      },
    });
  });
});
