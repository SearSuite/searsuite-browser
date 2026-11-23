import type { SheetCommandBus } from '@searsuite/sear-assembly-commands';
import {
  AcceptFormulaSuggestionCommand,
  FormulaInputAssistObservation,
  type FormulaInputAssistState,
} from '@searsuite/sear-plugin-cell-editor';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { SheetI18nStateObservation } from '@searsuite/sear-plugin-i18n';
import { WebFormulaAssistPopover } from '../src/WebFormulaAssistPopover';
import { formulaAssistDiagnostic } from '../src/FormulaAssistLocalization';

describe('WebFormulaAssistPopover', () => {
  it('keeps parser limits in localized diagnostics', () => {
    expect(formulaAssistDiagnostic('Formula exceeds 64 nested functions', 'zh')).toBe('公式不能超过 64 层函数嵌套。');
    expect(formulaAssistDiagnostic('Formula exceeds 1024 operands', 'zh')).toBe('公式不能超过 1024 个操作数。');
    expect(formulaAssistDiagnostic('Formula exceeds 8192 characters', 'zh')).toBe('公式不能超过 8192 字符。');
    expect(formulaAssistDiagnostic('Invalid input. Enter a valid ID number.', 'zh'))
      .toBe('Invalid input. Enter a valid ID number.');
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
  });

  it('shows registered suggestions and active parameters, then releases its subscription', () => {
    let state: FormulaInputAssistState = {
      suggestions: [],
      selectedIndex: 0,
      signature: null,
      diagnostic: null,
      anchor: null,
    };
    const listeners = new Set<(value: FormulaInputAssistState) => void>();
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => state,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    const run = jest.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const popover = new WebFormulaAssistPopover(observations, { run } as unknown as SheetCommandBus, target);
    const root = document.querySelector<HTMLElement>('.sear-formula-assist');
    expect(root?.hidden).toBe(true);

    state = {
      anchor: { x: 30, y: 20 },
      suggestions: [{ name: 'SUM', summary: 'Adds values.' }],
      selectedIndex: 0,
      diagnostic: {
        kind: 'error',
        message: 'Unexpected character',
        start: 4,
        end: 5,
        suggestion: 'Check the operator or value at this position.',
      },
      signature: {
        name: 'IF',
        parameterIndex: 1,
        descriptor: {
          version: 1,
          category: 'Logical',
          summary: 'Tests a condition.',
          example: '=IF(A1,1,0)',
          parameters: [
            { name: 'test', description: 'Condition.' },
            { name: 'true_value', description: 'True result.' },
          ],
        },
      },
    };
    listeners.forEach((listener) => listener(state));
    expect(root?.hidden).toBe(false);
    expect(root?.textContent).toContain('SUM');
    expect(root?.querySelector('[data-current="true"]')?.textContent).toBe('true_value');
    expect(root?.querySelector('.sear-formula-assist__example')?.textContent).toBe('=IF(A1,1,0)');
    expect(root?.querySelector('.sear-formula-assist__diagnostic')?.textContent).toContain('Character 5:');
    expect(root?.querySelector('.sear-formula-assist__diagnostic')?.textContent).toContain('Unexpected character');
    expect(root?.querySelector('.sear-formula-assist__diagnostic-suggestion')?.textContent).toBe(
      'Check the operator or value at this position.',
    );
    root?.querySelector('button')?.click();
    expect(run).toHaveBeenCalledWith(AcceptFormulaSuggestionCommand, { name: 'SUM' });

    popover.destroy();
    expect(listeners.size).toBe(0);
    expect(document.querySelector('.sear-formula-assist')).toBeNull();
  });

  it('BUG-443 identifies the rejected cell in the current interface language', () => {
    let publish: (value: FormulaInputAssistState) => void = () => undefined;
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => ({ suggestions: [], selectedIndex: 0, signature: null, diagnostic: null, anchor: null }),
      subscribe: (listener) => { publish = listener; return () => undefined; },
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    const popover = new WebFormulaAssistPopover(observations, { run: jest.fn() } as unknown as SheetCommandBus, target, 'zh');
    publish({ suggestions: [], selectedIndex: 0, signature: null, anchor: { x: 0, y: 0 },
      diagnostic: { kind: 'error', message: '输入有误，请输入有效身份证号', start: 0, end: 3, cellAddress: 'L20' },
    });
    const message = document.querySelector<HTMLElement>('.sear-formula-assist__diagnostic')?.textContent;
    expect(message).toContain('单元格 L20： 输入有误，请输入有效身份证号');
    expect(message).not.toContain('Character');
    popover.destroy();
    observations.destroy();
  });

  it('BUG-603 links the focused editor input to the selected suggestion and clears it on close', () => {
    let state: FormulaInputAssistState = {
      suggestions: [], selectedIndex: 0, signature: null, diagnostic: null, anchor: null,
    };
    let publish: (next: FormulaInputAssistState) => void = () => undefined;
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => state,
      subscribe: (listener) => { publish = listener; return () => undefined; },
    });
    const input = document.createElement('input');
    input.id = 'searTextInput';
    const target = document.createElement('div');
    document.body.append(input, target);
    input.focus();
    const popover = new WebFormulaAssistPopover(observations, { run: jest.fn() } as unknown as SheetCommandBus, target);
    state = { ...state, anchor: { x: 0, y: 0 }, suggestions: [
      { name: 'SUBSTITUTE', summary: 'Replace matching text.' },
      { name: 'SUBTOTAL', summary: 'Calculate a subtotal.' },
    ] };
    publish(state);
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    const options = list.querySelectorAll<HTMLElement>('[role="option"]');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    publish({ ...state, selectedIndex: 1 });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1]!.id);
    publish({ ...state, anchor: null, suggestions: [] });
    expect(input.hasAttribute('aria-controls')).toBe(false);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    popover.destroy();
  });

  it('BUG-604 offers the complete summary on hover', () => {
    const state: FormulaInputAssistState = {
      anchor: { x: 0, y: 0 }, selectedIndex: 0, signature: null, diagnostic: null,
      suggestions: [{ name: 'SUBTOTAL', summary: 'Calculates a subtotal for a range using a selected aggregation code.' }],
    };
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => state,
      subscribe: () => () => undefined,
    });
    const target = document.createElement('div');
    document.body.append(target);
    const popover = new WebFormulaAssistPopover(observations, { run: jest.fn() } as unknown as SheetCommandBus, target);
    expect(document.querySelector('.sear-formula-assist__summary')?.getAttribute('title'))
      .toBe(state.suggestions[0]!.summary);
    popover.destroy();
  });

  it('BUG-811 presents Chinese formula help and follows the sheet locale', () => {
    const state: FormulaInputAssistState = {
      anchor: { x: 0, y: 0 }, selectedIndex: 0, signature: null, diagnostic: null,
      suggestions: [
        { name: 'SUBSTITUTE', summary: 'Replaces matching text, optionally only one occurrence.' },
        { name: 'SUBTOTAL', summary: 'Calculates a subtotal for a range using a selected aggregation code.' },
        { name: 'SUM', summary: 'Adds numbers and values in ranges.' },
        { name: 'ACCRINT', summary: 'Calculates accrued interest.', category: '财务', example: '=ACCRINT(...)' },
      ],
    };
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => state,
      subscribe: () => () => undefined,
    });
    let locale = 'zh';
    let publishLocale: (value: { locale: string }) => void = () => undefined;
    observations.register(SheetI18nStateObservation, {
      getSnapshot: () => ({ locale }),
      subscribe: (listener) => { publishLocale = listener; return () => undefined; },
    });
    const target = document.createElement('div');
    document.body.append(target);
    const popover = new WebFormulaAssistPopover(observations, { run: jest.fn() } as unknown as SheetCommandBus, target);
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(list.getAttribute('aria-label')).toBe('公式函数');
    expect(list.querySelectorAll('.sear-formula-assist__summary')).toHaveLength(4);
    expect(list.textContent).toContain('替换');
    expect(list.textContent).toContain('分类汇总');
    expect(list.textContent).toContain('求和');
    expect(list.textContent).toContain('财务函数。示例：=ACCRINT(...)');
    expect(list.textContent).not.toContain('Replaces matching text');

    locale = 'en';
    publishLocale({ locale });
    const englishList = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(englishList.getAttribute('aria-label')).toBe('Formula functions');
    expect(englishList.textContent).toContain('Replaces matching text');
    popover.destroy();
  });

  it('BUG-548 localizes parameter help and diagnostics without changing English hosts', () => {
    let publish: (value: FormulaInputAssistState) => void = () => undefined;
    const observations = new ObservationRegistry();
    observations.register(FormulaInputAssistObservation, {
      getSnapshot: () => ({ suggestions: [], selectedIndex: 0, signature: null, diagnostic: null, anchor: null }),
      subscribe: (listener) => { publish = listener; return () => undefined; },
    });
    let publishLocale: (value: { locale: string }) => void = () => undefined;
    observations.register(SheetI18nStateObservation, {
      getSnapshot: () => ({ locale: 'zh' }),
      subscribe: (listener) => { publishLocale = listener; return () => undefined; },
    });
    const target = document.createElement('div');
    document.body.append(target);
    const popover = new WebFormulaAssistPopover(observations, { run: jest.fn() } as unknown as SheetCommandBus, target);
    publish({
      anchor: { x: 0, y: 0 }, suggestions: [], selectedIndex: 0,
      signature: { name: 'SUM', parameterIndex: 0, descriptor: {
        version: 1, category: 'Math', summary: 'Adds values.', example: '=SUM(A1:A5)',
        parameters: [{ name: 'number', description: 'Number or range to add.', repeating: true }],
      } },
      diagnostic: { kind: 'error', message: 'SUM requires at least 1 arguments.', start: 1, end: 4 },
    });
    expect(document.querySelector('.sear-formula-assist__parameter')?.textContent).toBe('数值…');
    expect(document.querySelector('.sear-formula-assist__parameter')?.getAttribute('title')).toBe('要相加的数字或单元格区域。');
    expect(document.querySelector('.sear-formula-assist__diagnostic')?.textContent)
      .toContain('第 2 个字符： SUM 至少需要 1 个参数。');
    publishLocale({ locale: 'en' });
    expect(document.querySelector('.sear-formula-assist__parameter')?.textContent).toBe('number…');
    expect(document.querySelector('.sear-formula-assist__diagnostic')?.textContent)
      .toContain('Character 2: SUM requires at least 1 arguments.');
    popover.destroy();
    observations.destroy();
  });
});
