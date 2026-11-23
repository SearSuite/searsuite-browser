import { type SearCoreSheet } from '@searsuite/sear-assembly-core';
import { SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { SheetFreezeFieldKey } from '@searsuite/sear-plugin-freeze';
import { SheetColumnSizesFieldKey, SheetRowSizesFieldKey } from '@searsuite/sear-render-engine';
import {
  DataValidationInputPolicy,
  DataValidationKind,
  ReadDataValidationCellRulesQuery,
  ReadDataValidationIssueQuery,
  type DataValidationIssue,
} from '@searsuite/sear-plugin-data-validation';
import { WebDataValidationFeedback } from '../src/WebDataValidationFeedback';
import { TOOLBAR_CSS } from '../src/ToolbarCSS';

describe('WebDataValidationFeedback', () => {
  afterEach(() => document.body.replaceChildren());

  it('BUG-571 keeps validation feedback below rule dialogs', () => {
    const style = document.createElement('style');
    style.textContent = TOOLBAR_CSS;
    document.head.append(style);
    try {
      const feedback = document.createElement('div');
      feedback.className = 'sear-validation-feedback';
      const dialog = document.createElement('div');
      dialog.className = 'sear-cell-highlight-overlay';
      document.body.append(feedback, dialog);
      expect(Number(getComputedStyle(feedback).zIndex)).toBeLessThan(Number(getComputedStyle(dialog).zIndex));
    } finally {
      style.remove();
    }
  });

  it('BUG-465 shows the saved prompt on selection and gives invalid data priority', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const core = { renderEngine: { renderContext: { getRoot: () => root } } } as unknown as SearCoreSheet;
    const queries = new SheetQueryRegistry();
    let selected: [number, number] = [19, 10];
    let issue: DataValidationIssue | null = null;
    queries.register(ReadDataValidationIssueQuery, () => issue);
    queries.register(ReadDataValidationCellRulesQuery, ([row, column]) => row === 19 && column === 10 ? [{
      row, column,
      rule: {
        id: 'identity', endRow: row, endColumn: column,
        condition: { kind: DataValidationKind.IdentityCard },
        inputPolicy: DataValidationInputPolicy.Reject,
        inputMessage: 'Enter an ID number',
      },
    }] : []);
    const feedback = new WebDataValidationFeedback(
      core, queries, () => ({ anchor: selected, focus: selected }), new BrowserPlatform(),
    );
    jest.spyOn(feedback as unknown as { position: () => { left: number; right: number; top: number } }, 'position')
      .mockReturnValue({ left: 100, right: 120, top: 100 });

    feedback.refresh();
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Input messageEnter an ID number');
    expect(document.querySelector('.sear-validation-feedback--hint')).not.toBeNull();

    selected = [20, 10];
    feedback.refresh();
    expect(document.querySelector('[role="status"]')).toBeNull();

    selected = [19, 10];
    issue = { row: 19, column: 10, ruleId: 'identity', message: 'Invalid input.' };
    feedback.refresh();
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Invalid dataInvalid input.');
    expect(document.querySelector('.sear-validation-feedback--hint')).toBeNull();
    feedback.destroy();
    expect(document.querySelector('[role="status"]')).toBeNull();
  });

  it('BUG-466 keeps feedback beside a frozen cell after scrolling past its original position', () => {
    const root = document.createElement('div');
    root.getBoundingClientRect = () => ({
      left: 0, right: 600, top: 0, bottom: 600, width: 600, height: 600,
    } as DOMRect);
    document.body.append(root);
    const rowSizes = {
      shape: [1, 50],
      getDimensionLeftBoundaryByIndex: (index: number) => index * 24,
      getDimensionRightBoundaryByIndex: (index: number) => (index + 1) * 24,
    };
    const columnSizes = {
      shape: [1, 26],
      getDimensionLeftBoundaryByIndex: (index: number) => index * 100,
      getDimensionRightBoundaryByIndex: (index: number) => (index + 1) * 100,
    };
    let frozen = true;
    const dataEngine = { readDataViewField: (_namespace: string, key: string) => {
      if (key === SheetRowSizesFieldKey) return rowSizes;
      if (key === SheetColumnSizesFieldKey) return columnSizes;
      if (key === SheetFreezeFieldKey) return { getItem: (_row: number, column: number) =>
        frozen ? (column === 0 ? 3 : 2) : 0 };
      return null;
    } };
    const core = {
      getDataEngine: () => dataEngine,
      configEngine: { getDefaultConfig: () => ({ sheetOffsetX: 50, sheetOffsetY: 24 }) },
      renderEngine: {
        renderContext: { getRoot: () => root },
        scrollManager: { getState: () => ({ x: 300, y: 500 }), getShape: () => [600, 600] },
      },
    } as unknown as SearCoreSheet;
    const queries = new SheetQueryRegistry();
    queries.register(ReadDataValidationIssueQuery, () => ({
      row: 1, column: 1, ruleId: 'identity', message: 'Invalid input.',
    }));
    const feedback = new WebDataValidationFeedback(
      core, queries, () => ({ anchor: [1, 1], focus: [1, 1] }), new BrowserPlatform(),
    );

    feedback.refresh();
    const status = document.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent).toContain('Invalid dataInvalid input.');
    expect(status?.style.top).toBe('48px');
    expect(status?.style.left).toBe('140px');

    frozen = false;
    feedback.refresh();
    expect(document.querySelector('[role="status"]')).toBeNull();
    feedback.destroy();
  });
});
