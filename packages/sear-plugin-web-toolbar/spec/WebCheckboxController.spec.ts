import {
  CommandExecutionPhase,
  type SheetCommandBus,
  type SheetQueryRegistry,
} from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import {
  CheckboxError,
  CheckboxErrorCode,
  InsertCheckboxesCommand,
  ReadCheckboxRangeQuery,
} from '@searsuite/sear-plugin-checkbox';
import { GetSelection, GetSelections } from '@searsuite/sear-plugin-selection';
import { WebCheckboxController } from '../src/checkbox/WebCheckboxController';

describe('WebCheckboxController', () => {
  const controllers: WebCheckboxController[] = [];

  afterEach(() => {
    controllers.forEach((controller) => controller.destroy());
    controllers.length = 0;
    document.body.replaceChildren();
  });

  function open(
    options: {
      count?: number;
      conflict?: boolean;
      selection?: () => { start: [number, number]; end: [number, number] };
      selections?: () => { start: [number, number]; end: [number, number] }[];
      status?: () => { count: number; checked: number; unchecked: number; mixed: boolean };
      onRun?: (definition: unknown, input: unknown) => void;
      onSubscribe?: (listener: (event: { phase: CommandExecutionPhase }) => void) => void;
    } = {},
  ) {
    const button = document.createElement('button');
    const surface = document.createElement('div');
    document.body.append(button, surface);
    const platform = {
      addEventListener(target: EventTarget, type: string, listener: EventListener, capture?: boolean) {
        target.addEventListener(type, listener, capture);
        return () => target.removeEventListener(type, listener, capture);
      },
    } as unknown as Platform;
    const commands = {
      run(definition: unknown, input: { replaceExisting?: boolean }) {
        if (options.conflict && definition === InsertCheckboxesCommand && !input.replaceExisting) {
          throw new CheckboxError(
            CheckboxErrorCode.Conflict,
            'Selected cells contain non-boolean data. Enable replacement explicitly.',
            { reason: 'nonBoolean' },
          );
        }
        options.onRun?.(definition, input);
      },
      subscribe(listener: (event: { phase: CommandExecutionPhase }) => void) {
        options.onSubscribe?.(listener);
        return () => void 0;
      },
    } as unknown as SheetCommandBus;
    const queries = {
      has: (definition: unknown) =>
        definition === ReadCheckboxRangeQuery || (definition === GetSelections && !!options.selections),
      run: (definition: unknown) =>
        definition === GetSelection
          ? options.selection?.() ?? { start: [0, 0], end: [0, 0] }
          : definition === GetSelections
          ? options.selections?.() ?? []
          : options.status?.() ?? {
              count: options.count ?? 0,
              checked: 0,
              unchecked: options.count ?? 0,
              mixed: false,
            },
    } as unknown as SheetQueryRegistry;
    const controller = new WebCheckboxController(button, surface, platform, commands, queries);
    controllers.push(controller);
    button.focus();
    controller.open();
    const panel = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Checkbox settings"]');
    if (!panel) throw new Error('Checkbox panel did not open.');
    return panel;
  }

  it('BUG-871 disables bulk actions when the selection contains no checkboxes', () => {
    const panel = open();
    const labels = ['Check all', 'Uncheck all', 'Convert to TRUE/FALSE text', 'Clear checkboxes'];
    labels.forEach((label) => {
      const button = Array.from(panel.querySelectorAll('button')).find((item) => item.textContent === label);
      expect(button?.disabled).toBe(true);
    });
  });

  it('BUG-862 explains an insertion conflict', () => {
    const panel = open({ conflict: true });
    Array.from(panel.querySelectorAll('button'))
      .find((item) => item.textContent === 'Insert checkboxes')
      ?.click();
    expect(panel.querySelector('[role="alert"]')?.textContent).toContain('Replace existing non-Boolean content');
    expect(panel.querySelector('[role="alert"]')?.textContent).toContain('Selected cells');
  });

  it('BUG-872 clears an obsolete insertion error when replacement is enabled', () => {
    const panel = open({ conflict: true });
    Array.from(panel.querySelectorAll('button'))
      .find((item) => item.textContent === 'Insert checkboxes')
      ?.click();
    expect(panel.querySelector('[role="alert"]')?.textContent).toBeTruthy();

    const replace = panel.querySelector<HTMLInputElement>('input[type="checkbox"]');
    replace?.click();
    expect(panel.querySelector('[role="alert"]')?.textContent).toBe('');
  });

  it('BUG-877 moves focus into the panel on open', () => {
    const panel = open();
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('BUG-864 updates the panel and bulk command target after selection changes', () => {
    let selectedColumn = 0;
    let publishCompleted: () => void = () => void 0;
    const actions: { definition: unknown; input: unknown }[] = [];
    const panel = open({
      selection: () => ({ start: [0, selectedColumn], end: [0, selectedColumn] }),
      status: () => ({ count: 1, checked: selectedColumn, unchecked: 1 - selectedColumn, mixed: false }),
      onRun: (definition, input) => actions.push({ definition, input }),
      onSubscribe: (listener) => {
        publishCompleted = () => listener({ phase: CommandExecutionPhase.Completed });
      },
    });
    expect(panel.textContent).toContain('1 checkbox, 0 checked');

    selectedColumn = 1;
    publishCompleted();
    expect(panel.textContent).toContain('1 checkbox, 1 checked');
    Array.from(panel.querySelectorAll('button'))
      .find((item) => item.textContent === 'Uncheck all')
      ?.click();
    expect(actions.at(-1)?.input).toEqual({ anchor: [0, 1], focus: [0, 1], checked: false });
  });

  it('BUG-868 refreshes the current selection count after a checkbox changes', () => {
    let checked = 0;
    let publishCompleted: () => void = () => void 0;
    const panel = open({
      status: () => ({ count: 1, checked, unchecked: 1 - checked, mixed: false }),
      onSubscribe: (listener) => {
        publishCompleted = () => listener({ phase: CommandExecutionPhase.Completed });
      },
    });
    expect(panel.textContent).toContain('1 checkbox, 0 checked');

    checked = 1;
    publishCompleted();
    expect(panel.textContent).toContain('1 checkbox, 1 checked');
  });

  it('BUG-972 blocks partial checkbox actions on disjoint selections', () => {
    let disjoint = true;
    let publishCompleted: () => void = () => void 0;
    const actions: unknown[] = [];
    const panel = open({
      count: 1,
      selections: () =>
        disjoint
          ? [
              { start: [23, 1], end: [23, 1] },
              { start: [23, 3], end: [23, 3] },
            ]
          : [{ start: [23, 3], end: [23, 3] }],
      onRun: (definition) => actions.push(definition),
      onSubscribe: (listener) => {
        publishCompleted = () => listener({ phase: CommandExecutionPhase.Completed });
      },
    });
    expect(panel.textContent).toContain('2 nonadjacent ranges');
    for (const name of ['Insert checkboxes', 'Check all', 'Uncheck all', 'Convert to TRUE/FALSE text', 'Clear checkboxes']) {
      const button = Array.from(panel.querySelectorAll('button')).find((item) => item.textContent === name);
      expect(button?.disabled).toBe(true);
      button?.click();
    }
    expect(actions).toHaveLength(0);

    disjoint = false;
    publishCompleted();
    expect(panel.textContent).toContain('1 checkbox');
    expect(
      Array.from(panel.querySelectorAll('button')).find((item) => item.textContent === 'Uncheck all')?.disabled,
    ).toBe(false);
  });
});
