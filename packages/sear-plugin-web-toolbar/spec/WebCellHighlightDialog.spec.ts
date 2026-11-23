import { type SheetCommandBus, type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { AddCellHighlightRuleCommand, CellHighlightKind, CellHighlightStyle, RemoveCellHighlightRuleCommand } from '@searsuite/sear-plugin-cell-highlight';
import { WebCellHighlightDialog } from '../src/WebCellHighlightDialog';

describe('WebCellHighlightDialog', () => {
  afterEach(() => document.body.replaceChildren());

  it('submits a configured top-percent rule for the current selection', () => {
    const run = jest.fn();
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [1, 2], focus: [8, 2] }),
    );
    dialog.openCreate({ kind: CellHighlightKind.Top, count: 10, percent: true });
    const count = document.querySelector<HTMLInputElement>('[data-testid="highlight-count"]')!;
    const percent = document.querySelector<HTMLInputElement>('[data-testid="highlight-percent"]')!;
    expect(count.value).toBe('10');
    expect(percent.checked).toBe(true);
    count.value = '25';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(AddCellHighlightRuleCommand, {
      anchor: [1, 2], focus: [8, 2],
      condition: { kind: CellHighlightKind.Top, count: 25, percent: true }, style: 'redFill',
    });
  });

  it('BUG-475 reports an invalid second comparison on the second field', () => {
    const run = jest.fn();
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [1, 1], focus: [1, 1] }),
    );
    dialog.openCreate();
    const first = document.querySelector<HTMLInputElement>('[data-testid="highlight-value"]')!;
    const second = document.querySelector<HTMLInputElement>('[data-testid="highlight-second-value"]')!;
    const reportFirst = jest.spyOn(first, 'reportValidity');
    const reportSecond = jest.spyOn(second, 'reportValidity');
    first.value = '1';
    second.value = 'abc';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('');
    expect(reportFirst).not.toHaveBeenCalled();
    expect(second.validationMessage).toBe('Enter a valid number.');
    expect(reportSecond).toHaveBeenCalledTimes(1);

    second.value = '3';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(AddCellHighlightRuleCommand, expect.objectContaining({
      condition: { kind: CellHighlightKind.Value, operator: 'between', value: '1', secondValue: '3' },
    }));
  });

  it('BUG-596 clears a numeric validation warning as soon as the value is corrected', () => {
    const run = jest.fn();
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [19, 5], focus: [19, 5] }),
    );
    dialog.openCreate();
    const first = document.querySelector<HTMLInputElement>('[data-testid="highlight-value"]')!;
    const second = document.querySelector<HTMLInputElement>('[data-testid="highlight-second-value"]')!;
    first.value = 'abc';
    second.value = '10';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(first.validationMessage).toBe('Enter a valid number.');
    expect(run).not.toHaveBeenCalled();

    first.value = '1';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(first.validationMessage).toBe('');
    expect(first.validity.valid).toBe(true);
    expect(run).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(AddCellHighlightRuleCommand, expect.objectContaining({
      condition: { kind: CellHighlightKind.Value, operator: 'between', value: '1', secondValue: '10' },
    }));
  });

  it('BUG-967 creates the same highlight rule for each disjoint selection', () => {
    const run = jest.fn();
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [22, 6], focus: [22, 6] }),
      () => [
        { anchor: [22, 4], focus: [22, 4] },
        { anchor: [22, 6], focus: [22, 6] },
      ],
    );
    dialog.openCreate();
    document.querySelector<HTMLInputElement>('[data-testid="highlight-value"]')!.value = '5';
    document.querySelector<HTMLInputElement>('[data-testid="highlight-second-value"]')!.value = '15';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, AddCellHighlightRuleCommand, expect.objectContaining({
      anchor: [22, 4], focus: [22, 4],
    }));
    expect(run).toHaveBeenNthCalledWith(2, AddCellHighlightRuleCommand, expect.objectContaining({
      anchor: [22, 6], focus: [22, 6],
    }));
  });

  it('submits inclusive average rules and rejects invalid percentages', () => {
    const run = jest.fn();
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [2, 0] }),
    );
    dialog.openCreate({ kind: CellHighlightKind.Bottom, count: 10, percent: true });
    document.querySelector<HTMLInputElement>('[data-testid="highlight-count"]')!.value = '101';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).not.toHaveBeenCalled();

    dialog.openCreate({ kind: CellHighlightKind.BelowAverage });
    document.querySelector<HTMLInputElement>('[data-testid="highlight-include-equal"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(AddCellHighlightRuleCommand, expect.objectContaining({
      condition: { kind: CellHighlightKind.BelowAverage, includeEqual: true },
    }));
  });

  it('BUG-572 and BUG-573 identify the range filter and each rule removal target', () => {
    const entries = [
      {
        row: 22, column: 0,
        rule: {
          id: 'value', priority: 0, endRow: 22, endColumn: 2,
          condition: { kind: CellHighlightKind.Value }, style: CellHighlightStyle.RedFill,
        },
      },
      {
        row: 13, column: 1,
        rule: {
          id: 'text', priority: 1, endRow: 14, endColumn: 1,
          condition: { kind: CellHighlightKind.Text }, style: CellHighlightStyle.YellowFill,
        },
      },
    ];
    const dialog = new WebCellHighlightDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => entries) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [0, 0] }),
    );
    dialog.openManage();
    const scope = document.querySelector<HTMLSelectElement>('[data-testid="highlight-scope"]')!;
    expect(scope.getAttribute('aria-label')).toBe('View scope');
    scope.value = 'sheet';
    scope.dispatchEvent(new Event('change'));
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.sear-cell-highlight-rule'));
    expect(rows[0]!.querySelector('button[aria-label^="Remove"]')?.getAttribute('aria-label'))
      .toBe('Remove Cell value rule A23:C23');
    expect(rows[1]!.querySelector('button[aria-label^="Remove"]')?.getAttribute('aria-label'))
      .toBe('Remove Specific text rule B14:B15');
  });

  it('BUG-119 distinguishes same-range rules by their comparisons', () => {
    let entries = [
      { row: 185, column: 2, rule: { id: 'greater', priority: 0, endRow: 186, endColumn: 2,
        condition: { kind: CellHighlightKind.Value, operator: 'greater', value: '1' }, style: CellHighlightStyle.RedFill } },
      { row: 185, column: 2, rule: { id: 'less', priority: 1, endRow: 186, endColumn: 2,
        condition: { kind: CellHighlightKind.Value, operator: 'less', value: '2' }, style: CellHighlightStyle.RedFill } },
    ];
    const run = jest.fn((command: unknown, input: { id: string }) => {
      if (command === RemoveCellHighlightRuleCommand) entries = entries.filter(({ rule }) => rule.id !== input.id);
    });
    const dialog = new WebCellHighlightDialog(
      { run } as unknown as SheetCommandBus,
      { run: jest.fn(() => entries) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [185, 2], focus: [186, 2] }),
    );
    dialog.openManage();
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.sear-cell-highlight-rule'));
    expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual([
      'Cell value · Greater than 1 · C186:C187', 'Cell value · Less than 2 · C186:C187',
    ]);
    expect(rows[1]!.querySelector('button[aria-label^="Remove"]')?.getAttribute('aria-label'))
      .toBe('Remove Cell value rule (Less than 2) C186:C187');
    rows[1]!.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')!.click();
    expect(run).toHaveBeenCalledWith(RemoveCellHighlightRuleCommand, { id: 'less' });
    expect(document.querySelectorAll('.sear-cell-highlight-rule')).toHaveLength(1);
  });

  it('BUG-615 returns from a canceled new rule to the prior management view', () => {
    const dialog = new WebCellHighlightDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => [{ row: 185, column: 2, rule: { id: 'one', priority: 0,
        endRow: 186, endColumn: 2, condition: { kind: CellHighlightKind.Value,
          operator: 'greater', value: '1' }, style: CellHighlightStyle.RedFill } }]) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [185, 2], focus: [186, 2] }),
    );
    dialog.openManage();
    const scope = document.querySelector<HTMLSelectElement>('[data-testid="highlight-scope"]')!;
    scope.value = 'sheet';
    scope.dispatchEvent(new Event('change'));
    document.querySelector<HTMLElement>('.sear-cell-highlight-list')!.scrollTop = 37;
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'New rule')!.click();
    expect(document.querySelector('[aria-label="New rule"]')).not.toBeNull();
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Cancel')!.click();

    expect(document.querySelector('[aria-label="New rule"]')).toBeNull();
    expect(document.querySelector('[aria-label="View existing rules"]')).not.toBeNull();
    expect(document.querySelector<HTMLSelectElement>('[data-testid="highlight-scope"]')?.value).toBe('sheet');
    expect(document.querySelector<HTMLElement>('.sear-cell-highlight-list')?.scrollTop).toBe(37);
    expect(document.querySelector('.sear-cell-highlight-rule')?.textContent).toContain('Greater than 1');
  });

  it('includes host-provided rule rows in the management list', () => {
    const additional = jest.fn(() => {
      const node = document.createElement('div');
      node.className = 'sear-cell-highlight-rule';
      node.textContent = 'Color scale · Value 1 → Value 2';
      return [{ priority: 0, node }];
    });
    const dialog = new WebCellHighlightDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => []) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [21, 1], focus: [21, 1] }),
      undefined,
      additional,
    );
    dialog.openManage();
    expect(document.querySelector('.sear-cell-highlight-rule')?.textContent).toContain('Value 1');
    expect(document.querySelector('.sear-cell-highlight-list')?.textContent).not.toContain('No rules');
    expect(additional).toHaveBeenCalledWith('selection', { top: 21, left: 1, bottom: 21, right: 1 },
      expect.any(Function));
  });
});
