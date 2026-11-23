import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { type SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';
import {
  DataValidationInputPolicy,
  DataValidationKind,
  DataValidationOperator,
  DataValidationTextMode,
  ClearDataValidationRulesCommand,
  ReadDataValidationRulesQuery,
  RemoveDataValidationRuleCommand,
  SetDataValidationRuleCommand,
} from '@searsuite/sear-plugin-data-validation';
import { WebDataValidationDialog } from '../src/WebDataValidationDialog';
import { TOOLBAR_CSS } from '../src/ToolbarCSS';

describe('WebDataValidationDialog', () => {
  afterEach(() => document.body.replaceChildren());

  it('BUG-611 rejects incomplete custom formulas and accepts the corrected expression', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [12, 6], focus: [12, 6] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Formula);
    const formula = document.querySelector<HTMLInputElement>('input[aria-label="Custom formula"]')!;
    formula.value = '=SUM(';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(formula.validationMessage).toBe('Invalid formula syntax.');
    expect(document.activeElement).toBe(formula);
    expect(run).not.toHaveBeenCalled();
    formula.value = '=SUM(1,2)';
    formula.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: { kind: DataValidationKind.Formula, formula: '=SUM(1,2)' } }),
    }));
    dialog.destroy();
  });

  it('BUG-607 hides manual option controls while using a range source', () => {
    const style = document.createElement('style');
    style.textContent = TOOLBAR_CSS;
    document.head.append(style);
    try {
      const run = jest.fn();
      const dialog = new WebDataValidationDialog(
        { run } as unknown as SheetCommandBus,
        {} as SheetQueryRegistry,
        () => ({ anchor: [12, 5], focus: [12, 5] }),
        new BrowserPlatform(),
      );
      dialog.openCreate(DataValidationKind.Dropdown);
      const source = document.querySelector<HTMLSelectElement>('select[aria-label="Option source"]')!;
      const options = document.querySelector<HTMLElement>('.sear-validation-options')!;
      const add = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .find((item) => item.textContent === 'Add option')!;
      expect(getComputedStyle(options).display).toBe('grid');

      source.value = 'range';
      source.dispatchEvent(new Event('change'));
      expect(getComputedStyle(options).display).toBe('none');
      expect(getComputedStyle(add).display).toBe('none');
      document.querySelector<HTMLInputElement>('input[aria-label="Reference range"]')!.value = 'B14:B16';
      document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
      expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
        rule: expect.objectContaining({ condition: expect.objectContaining({
          sourceRange: { start: [13, 1], end: [15, 1] },
        }) }),
      }));
      dialog.destroy();
    } finally {
      style.remove();
    }
  });

  it('BUG-608 keeps an editable option and explains why an empty custom list cannot save', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [12, 5], focus: [12, 5] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Dropdown);
    const options = document.querySelector<HTMLElement>('.sear-validation-options')!;
    const remove = () => options.querySelector<HTMLButtonElement>('[data-role="validation-option-remove"]')!;
    remove().click();
    remove().click();
    const remaining = options.querySelector<HTMLInputElement>('[data-role="validation-option-text"]')!;
    expect(options.querySelectorAll('[data-role="validation-option-text"]')).toHaveLength(1);
    expect(remaining.validationMessage).toBe('Add an option.');
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).not.toHaveBeenCalled();
    remaining.value = 'Ready';
    remaining.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        options: [{ label: 'Ready' }],
      }) }),
    }));
    dialog.destroy();
  });

  it('BUG-587 identifies the current validation tab and supports keyboard switching', () => {
    const dialog = new WebDataValidationDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [14, 3], focus: [14, 3] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number);
    const tabs = document.querySelectorAll<HTMLButtonElement>('.sear-validation-tabs button');
    expect(document.querySelector('.sear-validation-tabs')?.getAttribute('role')).toBe('tablist');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    tabs[0]?.focus();
    tabs[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    expect(document.querySelectorAll('[role="tabpanel"]')[1]?.hasAttribute('hidden')).toBe(false);
    tabs[0]?.click();
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelectorAll('[role="tabpanel"]')[0]?.hasAttribute('hidden')).toBe(false);
    dialog.destroy();
  });

  it('BUG-586 preserves unsaved fields when switching validation types', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [14, 3], focus: [14, 3] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number, {
      row: 14, column: 3,
      rule: {
        id: 'number-d15', endRow: 14, endColumn: 3,
        condition: { kind: DataValidationKind.Number },
        inputPolicy: DataValidationInputPolicy.Reject,
      },
    });
    const kind = document.querySelector<HTMLSelectElement>('select[aria-label="Rule type"]')!;
    const integer = Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Whole numbers only')!.querySelector<HTMLInputElement>('input')!;
    integer.click();
    kind.value = DataValidationKind.Date;
    kind.dispatchEvent(new Event('change'));
    kind.value = DataValidationKind.Number;
    kind.dispatchEvent(new Event('change'));

    expect(document.querySelector<HTMLInputElement>('input[type="checkbox"]:checked')).toBe(integer);
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      id: 'number-d15',
      rule: expect.objectContaining({ condition: expect.objectContaining({
        kind: DataValidationKind.Number, integerOnly: true,
      }) }),
    }));
  });

  it('BUG-588 requires enabled input prompt text before saving', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [14, 3], focus: [14, 3] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number);
    const promptEnabled = Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Show input message when selected')!
      .querySelector<HTMLInputElement>('input')!;
    const prompt = document.querySelector<HTMLInputElement>('input[aria-label="Input message"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    promptEnabled.click();
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(prompt.validationMessage).toBe('Enter an input message.');
    expect(document.querySelectorAll('.sear-validation-tabs button')[1]?.getAttribute('aria-selected')).toBe('true');

    prompt.value = '   ';
    prompt.dispatchEvent(new Event('input'));
    save.click();
    expect(run).not.toHaveBeenCalled();

    prompt.value = 'Enter a number';
    prompt.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ inputMessage: 'Enter a number' }),
    }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-589 rejects a blank warning message before updating a rule', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [14, 3], focus: [14, 3] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number, {
      row: 14,
      column: 3,
      rule: {
        id: 'number-d15',
        endRow: 14,
        endColumn: 3,
        condition: { kind: DataValidationKind.Number },
        inputPolicy: DataValidationInputPolicy.Reject,
        errorMessage: 'Invalid input.',
      },
    });
    const warning = document.querySelector<HTMLInputElement>('input[aria-label="Warning message"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    warning.value = '  ';
    warning.dispatchEvent(new Event('input'));
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(warning.validationMessage).toBe('Enter a warning message.');
    expect(document.querySelectorAll('.sear-validation-tabs button')[1]?.getAttribute('aria-selected')).toBe('true');

    warning.value = 'Enter a number';
    warning.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      id: 'number-d15',
      rule: expect.objectContaining({ errorMessage: 'Enter a number' }),
    }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-600 rejects an integer-only comparison with no integer solution', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [19, 9], focus: [19, 9] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number);
    const checkbox = (name: string) => Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === name)!.querySelector<HTMLInputElement>('input')!;
    checkbox('Whole numbers only').click();
    checkbox('Limit range').click();
    const first = document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    first.value = '1.5';
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('No whole number satisfies this rule.');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    first.value = '2';
    first.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        kind: DataValidationKind.Number, integerOnly: true, operator: DataValidationOperator.Equal, value: '2',
      }) }),
    }));
  });

  it('BUG-461 reports out-of-bounds ranges on the field and saves after correction', () => {
    const run = jest.fn();
    const queries = new SheetQueryRegistry();
    queries.register(ReadSheetCellDataQuery, () => ({ shape: [200, 26], getItem: () => null }));
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      queries,
      () => ({ anchor: [19, 11], focus: [19, 11] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.IdentityCard);
    const range = document.querySelector<HTMLInputElement>('input[aria-label="Cell range"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;

    range.value = 'L201';
    save.click();
    expect(range.validationMessage).toBe('Cell range exceeds the sheet bounds.');
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toBeNull();

    range.value = 'L20, AA1';
    range.dispatchEvent(new Event('input'));
    save.click();
    expect(range.validationMessage).toBe('Cell range exceeds the sheet bounds.');
    expect(run).not.toHaveBeenCalled();

    range.value = 'L200';
    range.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [199, 11], focus: [199, 11],
    }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('BUG-476 reports out-of-bounds dropdown sources on the reference field', () => {
    const run = jest.fn();
    const queries = new SheetQueryRegistry();
    queries.register(ReadSheetCellDataQuery, () => ({ shape: [200, 26], getItem: () => null }));
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      queries,
      () => ({ anchor: [22, 11], focus: [22, 11] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Dropdown);
    const source = document.querySelector<HTMLSelectElement>('select[aria-label="Option source"]')!;
    source.value = 'range';
    source.dispatchEvent(new Event('change'));
    const reference = document.querySelector<HTMLInputElement>('input[aria-label="Reference range"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;

    reference.value = 'L201';
    save.click();
    expect(reference.validationMessage).toBe('Reference range exceeds the sheet bounds.');
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toBeNull();

    reference.value = 'AA1';
    reference.dispatchEvent(new Event('input'));
    save.click();
    expect(reference.validationMessage).toBe('Reference range exceeds the sheet bounds.');
    expect(run).not.toHaveBeenCalled();

    reference.value = 'L200';
    reference.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        sourceRange: { start: [199, 11], end: [199, 11] },
      }) }),
    }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('submits a numeric range with warning and input prompt', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [1, 1], focus: [3, 1] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number);
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Limit range')!
      .querySelector<HTMLInputElement>('input')!
      .click();
    document.querySelector<HTMLSelectElement>('select[aria-label="Condition"]')!.value = DataValidationOperator.Between;
    document.querySelector<HTMLSelectElement>('select[aria-label="Condition"]')!.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!.value = '2';
    document.querySelector<HTMLInputElement>('input[aria-label="Second comparison value"]')!.value = '10';
    Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-validation-tabs button'))[1]!.click();
    document.querySelector<HTMLSelectElement>('select[aria-label="When input is invalid"]')!.value =
      DataValidationInputPolicy.Warn;
    document.querySelector<HTMLInputElement>('input[aria-label="Input message"]')!.value = 'Enter a number';
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Show input message when selected')!
      .querySelector<HTMLInputElement>('input')!
      .click();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(
      SetDataValidationRuleCommand,
      expect.objectContaining({
        anchor: [1, 1],
        focus: [3, 1],
        rule: expect.objectContaining({
          condition: expect.objectContaining({
            kind: DataValidationKind.Number,
            operator: DataValidationOperator.Between,
            value: '2',
            secondValue: '10',
          }),
          inputPolicy: DataValidationInputPolicy.Warn,
        }),
      }),
    );
  });

  it('BUG-446 rejects a nonexistent comparison date and saves after correction', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [181, 18], focus: [181, 18] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Date);
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Limit range')!
      .querySelector<HTMLInputElement>('input')!
      .click();
    const first = document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    first.value = '2026-02-30';
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('Enter a valid date (YYYY-MM-DD or YYYY/M/D).');
    first.value = '2026-03-02';
    first.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [181, 18], focus: [181, 18],
      rule: expect.objectContaining({ condition: expect.objectContaining({
        kind: DataValidationKind.Date, operator: DataValidationOperator.Equal, value: '2026-03-02',
      }) }),
    }));
  });

  it('BUG-455 shows date formats and syncs typed or picked comparison dates', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [23, 11], focus: [23, 11] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Date);
    expect(document.querySelector('.sear-validation-date-hint')?.textContent).toContain('YYYY/M/D');
    const picker = document.querySelector<HTMLInputElement>('input[aria-label="Choose comparison date"]')!;
    expect(picker.type).toBe('date');
    expect(picker.closest('label')?.hidden).toBe(true);
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Limit range')!
      .querySelector<HTMLInputElement>('input')!.click();
    expect(picker.closest('label')?.hidden).toBe(false);
    const first = document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!;
    first.value = '2026/10/21';
    first.dispatchEvent(new Event('input'));
    expect(picker.value).toBe('2026-10-21');
    picker.value = '2026-10-22';
    picker.dispatchEvent(new Event('change'));
    expect(first.value).toBe('2026-10-22');
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        kind: DataValidationKind.Date, value: '2026-10-22',
      }) }),
    }));
  });

  it('BUG-444 and BUG-445 reject invalid numeric bounds and save after correction', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [19, 11], focus: [19, 11] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Number);
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Limit range')!
      .querySelector<HTMLInputElement>('input')!
      .click();
    const operator = document.querySelector<HTMLSelectElement>('select[aria-label="Condition"]')!;
    operator.value = DataValidationOperator.Between;
    operator.dispatchEvent(new Event('change'));
    const first = document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!;
    const second = document.querySelector<HTMLInputElement>('input[aria-label="Second comparison value"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    first.value = '10';
    second.value = '2';
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(second.validationMessage).toBe('The upper bound cannot be less than the lower bound.');
    first.value = 'abc';
    second.value = '10';
    second.dispatchEvent(new Event('input'));
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('Enter a valid number.');
    first.value = '1e309';
    first.dispatchEvent(new Event('input'));
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('Enter a valid number.');
    first.value = '2';
    first.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [19, 11], focus: [19, 11],
      rule: expect.objectContaining({ condition: expect.objectContaining({ value: '2', secondValue: '10' }) }),
    }));
  });

  it('BUG-447 rejects a non-numeric text length and saves after correction', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [181, 16], focus: [181, 16] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Text);
    const mode = document.querySelector<HTMLSelectElement>('select[aria-label="Validate"]')!;
    mode.value = DataValidationTextMode.Length;
    mode.dispatchEvent(new Event('change'));
    const first = document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!;
    const save = document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    first.value = 'abc';
    save.click();
    expect(run).not.toHaveBeenCalled();
    expect(first.validationMessage).toBe('Enter a nonnegative integer.');
    first.value = '3';
    first.dispatchEvent(new Event('input'));
    save.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [181, 16], focus: [181, 16],
      rule: expect.objectContaining({ condition: expect.objectContaining({
        kind: DataValidationKind.Text, textMode: DataValidationTextMode.Length,
        operator: DataValidationOperator.Equal, value: '3',
      }) }),
    }));
  });

  it('BUG-957 lists and applies a numeric rule to every disjoint target', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [20, 3], focus: [20, 3] }),
      new BrowserPlatform(),
      () => [
        { anchor: [20, 1], focus: [20, 1] },
        { anchor: [20, 3], focus: [20, 3] },
      ],
    );
    dialog.openCreate(DataValidationKind.Number);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Cell range"]')!.value).toBe('B21:B21, D21:D21');
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [20, 1], focus: [20, 1],
    }));
    expect(run).toHaveBeenNthCalledWith(2, SetDataValidationRuleCommand, expect.objectContaining({
      anchor: [20, 3], focus: [20, 3],
    }));
  });

  it('submits a referenced dropdown and manages existing rules', () => {
    const run = jest.fn();
    const entry = {
      row: 0,
      column: 0,
      rule: {
        id: 'one',
        endRow: 2,
        endColumn: 0,
        condition: { kind: DataValidationKind.Dropdown, options: [{ label: 'A' }] },
        inputPolicy: DataValidationInputPolicy.Reject,
      },
    };
    const queries = { run: jest.fn((definition) => (definition === ReadDataValidationRulesQuery ? [entry] : [])) };
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      queries as unknown as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [2, 0] }),
      new BrowserPlatform(),
    );
    dialog.openCreate();
    document.querySelector<HTMLSelectElement>('select[aria-label="Option source"]')!.value = 'range';
    document.querySelector<HTMLSelectElement>('select[aria-label="Option source"]')!.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('input[aria-label="Reference range"]')!.value = 'B1:B3';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(
      SetDataValidationRuleCommand,
      expect.objectContaining({
        rule: expect.objectContaining({
          condition: expect.objectContaining({
            sourceRange: { start: [0, 1], end: [2, 1] },
          }),
        }),
      }),
    );
    dialog.openManage();
    const remove = Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-cell-highlight-rule button')).find(
      (button) => button.textContent === 'Delete',
    )!;
    remove.click();
    expect(run).toHaveBeenCalledWith(RemoveDataValidationRuleCommand, { id: 'one' });
  });

  it('submits custom dropdown options and allows option editing', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [0, 0] }),
      new BrowserPlatform(),
    );
    dialog.openCreate();
    const optionInputs = () =>
      Array.from(document.querySelectorAll<HTMLInputElement>('[data-role="validation-option-text"]'));
    optionInputs()[0]!.value = 'Ready';
    optionInputs()[1]!.value = 'Done';
    Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((item) => item.textContent === 'Add option')!
      .click();
    optionInputs()[2]!.value = 'Pending';
    Array.from(document.querySelectorAll('label'))
      .find((label) => label.textContent === 'Option colors')!
      .querySelector<HTMLInputElement>('input')!
      .click();
    document.querySelector<HTMLInputElement>('input[aria-label="Show dropdown arrow"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(
      SetDataValidationRuleCommand,
      expect.objectContaining({
        rule: expect.objectContaining({
          condition: expect.objectContaining({
            options: [
              expect.objectContaining({ label: 'Ready', color: expect.any(String) }),
              expect.objectContaining({ label: 'Done', color: expect.any(String) }),
              expect.objectContaining({ label: 'Pending', color: expect.any(String) }),
            ],
          }),
        }),
      }),
    );
  });

  it('BUG-640 preserves surrounding spaces in custom dropdown labels after editing', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [20, 11], focus: [20, 11] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Dropdown);
    const labels = () => Array.from(document.querySelectorAll<HTMLInputElement>(
      '[data-role="validation-option-text"]',
    ));
    labels()[0]!.value = ' A ';
    labels()[1]!.value = 'B';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        options: [{ label: ' A ' }, { label: 'B' }],
      }) }),
    }));
    const savedOptions = (run.mock.calls[0]![1] as {
      rule: { condition: { options: { label: string }[] } };
    }).rule.condition.options;

    dialog.openCreate(DataValidationKind.Dropdown, {
      row: 20, column: 11,
      rule: {
        id: 'preserved-label', endRow: 20, endColumn: 11,
        condition: { kind: DataValidationKind.Dropdown, options: savedOptions },
        inputPolicy: DataValidationInputPolicy.Reject,
      },
    });
    expect(labels().map((item) => item.value)).toEqual([' A ', 'B']);
    dialog.destroy();
  });

  it('BUG-558 identifies a duplicate dropdown option and saves after correction', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [19, 5], focus: [19, 5] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Dropdown);
    const labels = Array.from(document.querySelectorAll<HTMLInputElement>(
      '[data-role="validation-option-text"]',
    ));
    labels[0]!.value = 'A';
    labels[1]!.value = ' A ';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).not.toHaveBeenCalled();
    expect(labels[1]!.validationMessage).toBe('Options must be unique.');
    labels[1]!.value = 'B';
    labels[1]!.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({
        options: [{ label: 'A' }, { label: 'B' }],
      }) }),
    }));
    dialog.destroy();
  });

  it('BUG-568, BUG-569 and BUG-602 identify dropdown option controls after edits and reordering', () => {
    const dialog = new WebDataValidationDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [0, 0] }),
      new BrowserPlatform(),
    );
    dialog.openCreate();
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>('.sear-validation-option'));
    const label = (row: HTMLElement) => row.querySelector<HTMLInputElement>('input:not([type="color"])')!;
    const color = (row: HTMLElement) => row.querySelector<HTMLInputElement>('input[type="color"]')!;
    const remove = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('button:last-child')!;

    expect(label(rows()[0]!).getAttribute('aria-label')).toBe('Option 1');
    expect(label(rows()[1]!).getAttribute('aria-label')).toBe('Option 2');
    label(rows()[0]!).value = 'A';
    label(rows()[0]!).dispatchEvent(new Event('input'));
    label(rows()[1]!).value = 'B';
    label(rows()[1]!).dispatchEvent(new Event('input'));
    expect(color(rows()[0]!).getAttribute('aria-label')).toBe('Option 1 (A) color');
    expect(color(rows()[1]!).getAttribute('aria-label')).toBe('Option 2 (B) color');
    expect(remove(rows()[0]!).getAttribute('aria-label')).toBe('Remove Option 1 (A)');
    expect(remove(rows()[1]!).getAttribute('aria-label')).toBe('Remove Option 2 (B)');

    rows()[1]!.querySelectorAll<HTMLButtonElement>('button')[0]!.click();
    expect(label(rows()[0]!).getAttribute('aria-label')).toBe('Option 1: B');
    expect(color(rows()[0]!).getAttribute('aria-label')).toBe('Option 1 (B) color');
    remove(rows()[0]!).click();
    expect(label(rows()[0]!).getAttribute('aria-label')).toBe('Option 1: A');
    expect(remove(rows()[0]!).getAttribute('aria-label')).toBe('Remove Option 1 (A)');
  });

  it('switches text comparison modes and validates a custom formula', () => {
    const run = jest.fn();
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [0, 0] }),
      new BrowserPlatform(),
    );
    dialog.openCreate(DataValidationKind.Text);
    const mode = document.querySelector<HTMLSelectElement>('select[aria-label="Validate"]')!;
    mode.value = DataValidationTextMode.Length;
    mode.dispatchEvent(new Event('change'));
    const operator = document.querySelector<HTMLSelectElement>('select[aria-label="Condition"]')!;
    operator.value = DataValidationOperator.GreaterOrEqual;
    operator.dispatchEvent(new Event('change'));
    document.querySelector<HTMLInputElement>('input[aria-label="Comparison value"]')!.value = '3';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(
      SetDataValidationRuleCommand,
      expect.objectContaining({
        rule: expect.objectContaining({
          condition: expect.objectContaining({
            kind: DataValidationKind.Text,
            textMode: DataValidationTextMode.Length,
            operator: DataValidationOperator.GreaterOrEqual,
            value: '3',
          }),
        }),
      }),
    );
    dialog.openCreate(DataValidationKind.Formula);
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledTimes(1);
    document.querySelector<HTMLInputElement>('input[aria-label="Custom formula"]')!.value = '=A1>0';
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(
      SetDataValidationRuleCommand,
      expect.objectContaining({
        rule: expect.objectContaining({ condition: { kind: DataValidationKind.Formula, formula: '=A1>0' } }),
      }),
    );
  });

  it('blocks rules that the current host cannot evaluate', () => {
    const run = jest.fn();
    const unavailable = new Set<DataValidationKind>([
      DataValidationKind.Person, DataValidationKind.Document, DataValidationKind.Image,
      DataValidationKind.Attachment, DataValidationKind.Formula,
    ]);
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      {} as SheetQueryRegistry,
      () => ({ anchor: [20, 2], focus: [20, 2] }),
      new BrowserPlatform(),
      undefined,
      (kind) => !unavailable.has(kind),
    );
    dialog.openCreate(DataValidationKind.Image);
    const kind = document.querySelector<HTMLSelectElement>('select[aria-label="Rule type"]')!;
    for (const unsupported of unavailable) {
      const option = Array.from(kind.options).find((item) => item.value === unsupported)!;
      expect(option.disabled).toBe(true);
      expect(option.textContent).toContain('validator unavailable');
    }
    expect(kind.value).toBe(DataValidationKind.Image);
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(kind.validationMessage).toContain('no validator for this rule type');
    expect(run).not.toHaveBeenCalled();
    kind.value = DataValidationKind.Number;
    kind.dispatchEvent(new Event('change'));
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(run).toHaveBeenCalledWith(SetDataValidationRuleCommand, expect.objectContaining({
      rule: expect.objectContaining({ condition: expect.objectContaining({ kind: DataValidationKind.Number }) }),
    }));
  });

  it('filters managed rules by selection and clears only the selected range', () => {
    const run = jest.fn();
    const entries = [
      {
        row: 0,
        column: 0,
        rule: {
          id: 'inside',
          endRow: 1,
          endColumn: 1,
          condition: { kind: DataValidationKind.Checkbox },
          inputPolicy: DataValidationInputPolicy.Reject,
        },
      },
      {
        row: 4,
        column: 3,
        rule: {
          id: 'outside',
          endRow: 4,
          endColumn: 3,
          condition: { kind: DataValidationKind.Rating },
          inputPolicy: DataValidationInputPolicy.Warn,
        },
      },
    ];
    const queries = { run: jest.fn(() => entries) };
    const dialog = new WebDataValidationDialog(
      { run } as unknown as SheetCommandBus,
      queries as unknown as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [1, 1] }),
      new BrowserPlatform(),
    );
    dialog.openManage();
    expect(document.querySelectorAll('.sear-cell-highlight-rule')).toHaveLength(1);
    const scope = document.querySelector<HTMLSelectElement>('select[aria-label="Scope"]')!;
    scope.value = 'sheet';
    scope.dispatchEvent(new Event('change'));
    expect(document.querySelectorAll('.sear-cell-highlight-rule')).toHaveLength(2);
    Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((item) => item.textContent === 'Clear current selection')!
      .click();
    expect(run).toHaveBeenCalledWith(ClearDataValidationRulesCommand, { range: { anchor: [0, 0], focus: [1, 1] } });
    Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-cell-highlight-rule button'))
      .find((item) => item.textContent === 'Edit')!
      .click();
    expect(document.querySelector('[aria-label="Edit data validation"]')).not.toBeNull();
  });

  it('BUG-612 returns from editing to the same managed scope and scroll position', () => {
    const entries = Array.from({ length: 12 }, (_, row) => ({
      row,
      column: 0,
      rule: {
        id: `rule-${row}`,
        endRow: row,
        endColumn: 0,
        condition: { kind: DataValidationKind.Checkbox },
        inputPolicy: DataValidationInputPolicy.Reject,
      },
    }));
    const dialog = new WebDataValidationDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => entries) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [0, 0], focus: [0, 0] }),
      new BrowserPlatform(),
    );
    dialog.openManage();
    const scope = document.querySelector<HTMLSelectElement>('select[aria-label="Scope"]')!;
    scope.value = 'sheet';
    scope.dispatchEvent(new Event('change'));
    const list = document.querySelector<HTMLElement>('.sear-cell-highlight-list')!;
    list.scrollTop = 88;
    list.querySelector<HTMLButtonElement>('.sear-cell-highlight-rule button')!.click();
    expect(document.querySelector('[aria-label="Edit data validation"]')).not.toBeNull();
    Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((item) => item.textContent === 'Cancel')!.click();
    expect(document.querySelector('[aria-label="All data validation rules"]')).not.toBeNull();
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="Scope"]')!.value).toBe('sheet');
    expect(document.querySelector<HTMLElement>('.sear-cell-highlight-list')!.scrollTop).toBe(88);
    expect(document.querySelectorAll('.sear-cell-highlight-rule')).toHaveLength(12);
    dialog.destroy();
  });

  it('BUG-617 distinguishes dropdown rules sharing a cell range', () => {
    const base = {
      endRow: 12,
      endColumn: 5,
      inputPolicy: DataValidationInputPolicy.Reject,
    };
    const entries = [
      { row: 12, column: 5, rule: { ...base, id: 'reference', condition: {
        kind: DataValidationKind.Dropdown,
        sourceRange: { start: [13, 1] as const, end: [15, 1] as const },
      } } },
      { row: 12, column: 5, rule: { ...base, id: 'manual', condition: {
        kind: DataValidationKind.Dropdown,
        options: [{ label: 'manual-C' }],
      } } },
    ];
    const dialog = new WebDataValidationDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => entries) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [12, 5], focus: [12, 5] }),
      new BrowserPlatform(),
    );
    dialog.openManage();
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.sear-cell-highlight-rule'));
    expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual([
      'Dropdown · F13:F13\nRange reference B14:B16',
      'Dropdown · F13:F13\nCustom options manual-C',
    ]);
    expect(rows[0]!.querySelector('button')?.getAttribute('aria-label'))
      .toContain('Range reference B14:B16');
    expect(rows[1]!.querySelector('button')?.getAttribute('aria-label'))
      .toContain('Custom options manual-C');
    dialog.destroy();
  });

  it('BUG-570 identifies each managed rule in edit and delete buttons', () => {
    const entries = [
      {
        row: 14,
        column: 8,
        rule: {
          id: 'identity',
          endRow: 14,
          endColumn: 8,
          condition: { kind: DataValidationKind.IdentityCard },
          inputPolicy: DataValidationInputPolicy.Reject,
        },
      },
      {
        row: 14,
        column: 9,
        rule: {
          id: 'number',
          endRow: 14,
          endColumn: 9,
          condition: { kind: DataValidationKind.Number },
          inputPolicy: DataValidationInputPolicy.Reject,
        },
      },
    ];
    const dialog = new WebDataValidationDialog(
      { run: jest.fn() } as unknown as SheetCommandBus,
      { run: jest.fn(() => entries) } as unknown as SheetQueryRegistry,
      () => ({ anchor: [14, 9], focus: [14, 9] }),
      new BrowserPlatform(),
    );
    dialog.openManage();
    const scope = document.querySelector<HTMLSelectElement>('select[aria-label="Scope"]')!;
    scope.value = 'sheet';
    scope.dispatchEvent(new Event('change'));
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.sear-cell-highlight-rule'));
    expect(rows[0]!.querySelector('button:first-of-type')?.getAttribute('aria-label')).toBe('Edit ID number rule I15:I15');
    expect(rows[0]!.querySelector('button:last-of-type')?.getAttribute('aria-label')).toBe('Delete ID number rule I15:I15');
    expect(rows[1]!.querySelector('button:first-of-type')?.getAttribute('aria-label')).toBe('Edit Number rule J15:J15');
    expect(rows[1]!.querySelector('button:last-of-type')?.getAttribute('aria-label')).toBe('Delete Number rule J15:J15');
  });
});
