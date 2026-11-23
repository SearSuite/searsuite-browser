import type { SearCoreSheet } from '@searsuite/sear-assembly-core';
import {
  BoldTextStyleKey,
  ItalicTextStyleKey,
  UnderlineTextStyleKey,
  StrikethroughTextStyleKey,
} from '@searsuite/sear-assembly-doc';
import type { Platform } from '@searsuite/sear-foundation-platform';
import {
  LocalActionCommand,
  PipelineExecutionCommand,
  SheetCommandBus,
  SheetQueryRegistry,
  ClearRangeContentsCommand,
  InsertRowCommand,
  DeleteRowCommand,
  InsertColumnCommand,
  DeleteColumnCommand,
} from '@searsuite/sear-assembly-commands';
import {
  AnalyzeMergeCellsQuery,
  CellMergeMatrix,
  SheetCellMergePlugin,
  ToggleMergeCellsCommand,
} from '@searsuite/sear-plugin-cell-merge';
import { UserInteractionService } from '@searsuite/sear-foundation-user-interaction';
import {
  InMemorySheetClipboard,
  PasteRangeCommand,
  SheetClipboardError,
  SheetClipboardErrorCode,
  type SheetClipboard,
} from '@searsuite/sear-plugin-clipboard';
import { Pipeline } from '@searsuite/sear-assembly-core';
import { CommitCellEditCommand, HandleDocumentInputCommand, IsCellEditingQuery, SetCellInlineStyleCommand, SetRangeCellTextStyleCommand, type SheetInlineStyleCommandInput } from '@searsuite/sear-plugin-cell-editor';
import { CellFillMatrix, SetRangeCellFillCommand, SheetCellFillFieldKey, type SheetSetRangeCellFillInput } from '@searsuite/sear-plugin-cell-fill';
import {
  SetRangeCellBorderCommand,
  SheetBorderLineStyle,
  SheetBorderPreset,
  type SheetSetRangeCellBorderInput,
} from '@searsuite/sear-plugin-cell-border';
import {
  ClearDuplicateHighlightsCommand,
  DeleteDuplicateRowsCommand,
  HighlightDuplicateRowsCommand,
  type SheetDuplicateClearInput,
  type SheetDuplicateHighlightInput,
} from '@searsuite/sear-plugin-duplicate';
import { CellFormats, CellType, type CellFormat } from '@searsuite/sear-domain-cell-types';
import {
  AdjustRangeCellFormatDecimalPlacesCommand,
  ReadSheetCellFormatQuery,
  SetRangeCellFormatCommand,
  type SheetAdjustRangeCellFormatDecimalsInput,
  type SheetSetRangeCellFormatInput,
} from '@searsuite/sear-plugin-cell-format';
import {
  RedoSheetCommand,
  type SheetHistoryStatus,
  SheetHistoryStatusProvider,
  UndoSheetCommand,
} from '@searsuite/sear-plugin-history';
import { GetSelection, GetSelections, SelectRangeCommand, SheetSelectionPlugin } from '@searsuite/sear-plugin-selection';
import {
  AlignmentMatrix,
  SheetAlignmentPlugin,
  SheetHorizontalAlignmentFieldKey,
  SheetVerticalAlignmentPlugin,
  SheetVerticalAlignmentFieldKey,
  VerticalAlignmentMatrix,
} from '@searsuite/sear-plugin-alignment';
import { ReadSheetCellDataQuery, SheetDataFieldNamespace, SheetDataMatrixFieldKey, SheetDataPlugin } from '@searsuite/sear-render-engine';
import {
  SheetColumnHiddenOriginalSizesFieldKey,
  SheetColumnSizesFieldKey,
  SheetRowHiddenOriginalSizesFieldKey,
  SheetRowSizesFieldKey,
} from '@searsuite/sear-plugin-resize';
import { Rect as RectRange } from '@searsuite/sear-foundation-rect';
import { SetSheetFreezeCommand } from '@searsuite/sear-plugin-freeze';
import { SetSheetRowsFixedCommand } from '@searsuite/sear-plugin-fixed-row';
import {
  FakeSheetEmbeddedEditor,
  type SheetEmbeddedEditor,
  SheetEmbeddedEditHistoryObservation,
  SheetEmbeddedInlineStyleObservation,
  type SheetEmbeddedInlineStyleState,
} from '@searsuite/sear-sheet-editor-contract';
import { HeadlessToolbar, SearWebToolbar } from '../src';
import { createReplicaToolbar, createReplicaToolbarForTesting, SheetToolbarControlId } from '../src/ReplicaToolbar';

function disabledInlineStyleState(): SheetEmbeddedInlineStyleState {
  return {
    bold: { enabled: false, active: false, value: null },
    italic: { enabled: false, active: false, value: null },
    underline: { enabled: false, active: false, value: null },
    strikethrough: { enabled: false, active: false, value: null },
    fontFamily: { enabled: false, active: false, value: null },
    fontSize: { enabled: false, active: false, value: null },
    color: { enabled: false, active: false, value: null },
  };
}

function enabledInlineStyleState(): SheetEmbeddedInlineStyleState {
  return {
    bold: { enabled: true, active: false, value: null },
    italic: { enabled: true, active: false, value: null },
    underline: { enabled: true, active: false, value: null },
    strikethrough: { enabled: true, active: false, value: null },
    fontFamily: { enabled: true, active: false, value: null },
    fontSize: { enabled: true, active: false, value: null },
    color: { enabled: true, active: false, value: null },
  };
}

function createToolbar(
  core: SearCoreSheet,
  platform: Platform,
  embeddedEditor: SheetEmbeddedEditor,
  commands?: SheetCommandBus,
  history?: SheetHistoryStatusProvider,
  queries?: SheetQueryRegistry,
  userInteraction: UserInteractionService = {
    confirm: async () => true,
    destroy: () => void 0,
  },
): SearWebToolbar {
  return new SearWebToolbar(
    core,
    platform,
    embeddedEditor,
    new InMemorySheetClipboard(),
    userInteraction,
    commands,
    history,
    queries,
  );
}

describe('SearWebToolbar', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
  });

  it('BUG-471 prompts for a cell when freezing without a selection, then opens the menu after selection', () => {
    const core = createCore();
    const commands = createCommands(core);
    commands.register(SetSheetFreezeCommand, () => new LocalActionCommand(SetSheetFreezeCommand.id, () => {}));
    commands.register(SetSheetRowsFixedCommand, () => new LocalActionCommand(SetSheetRowsFixedCommand.id, () => {}));
    const queries = new SheetQueryRegistry();
    let range: { start: readonly [number, number]; end: readonly [number, number] } | null = null;
    queries.register(GetSelection, () => range);
    const toolbar = createToolbar(core, createPlatform(), new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);

    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-freeze"]')?.click();
    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('Select cells first.');
    expect(document.querySelector('.sear-freeze-menu')).toBeNull();

    range = { start: [1, 1], end: [1, 1] };
    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-freeze"]')?.click();
    expect(document.querySelector('[data-freeze-action="rows"]')?.textContent).toContain('row 2');
    toolbar.destroy();
  });

  it('BUG-951 rejects copy and cut of disjoint selections before invoking a clipboard command', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const queries = createQueries(core);
    queries.register(GetSelections, () => [
      { start: [19, 1] as const, end: [19, 1] as const },
      { start: [19, 3] as const, end: [19, 3] as const },
    ]);
    const clipboard: SheetClipboard = {
      read: jest.fn(async () => null),
      write: jest.fn(async () => void 0),
    };
    const toolbar = new SearWebToolbar(
      core, platform, new FakeSheetEmbeddedEditor(), clipboard,
      { confirm: async () => true, destroy: () => void 0 }, commands, void 0, queries,
    );
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);
    const run = jest.spyOn(commands, 'run');

    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-copy"]')?.click();
    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('Copying noncontiguous selections is not supported.');
    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-cut"]')?.click();
    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('Cutting noncontiguous selections is not supported.');
    expect(run).not.toHaveBeenCalled();
    expect(clipboard.write).not.toHaveBeenCalled();
    toolbar.destroy();
  });

  it('BUG-874 reports an out-of-bounds paste and preserves the clipboard payload', async () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const payload = { plainText: 'left\tright' };
    const clipboard: SheetClipboard = {
      read: jest.fn(async () => payload),
      write: jest.fn(async () => void 0),
    };
    commands.register(PasteRangeCommand, () => {
      throw new SheetClipboardError(SheetClipboardErrorCode.TargetOutOfBounds, 'Paste exceeds sheet bounds.', {
        target: [103, 199],
        columnCount: 2,
        columnLimit: 200,
      });
    });
    const toolbar = new SearWebToolbar(
      core,
      platform,
      new FakeSheetEmbeddedEditor(),
      clipboard,
      {
        confirm: async () => true,
        destroy: () => void 0,
      },
      commands,
    );
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);

    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-paste"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('Paste range exceeds the sheet column limit.');
    expect(await clipboard.read()).toEqual(payload);
    expect(clipboard.write).not.toHaveBeenCalled();
    expect(platform.warn).toHaveBeenCalledWith('Toolbar clipboard paste failed.', expect.any(SheetClipboardError));
    toolbar.destroy();
  });

  it('BUG-020 reports a paste rejected by a merged-cell owner', async () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const payload = { plainText: 'X\tY' };
    const clipboard: SheetClipboard = {
      read: jest.fn(async () => payload),
      write: jest.fn(async () => void 0),
    };
    commands.register(PasteRangeCommand, () => {
      throw new SheetClipboardError(
        SheetClipboardErrorCode.TargetIntersectsMergedCells,
        'Paste would write into a hidden merged cell.',
      );
    });
    const toolbar = new SearWebToolbar(
      core, platform, new FakeSheetEmbeddedEditor(), clipboard,
      { confirm: async () => true, destroy: () => void 0 }, commands,
    );
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);

    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-paste"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('Paste range includes merged cells; hidden content was not written.');
    expect(await clipboard.read()).toEqual(payload);
    toolbar.destroy();
  });

  it('BUG-249 binds row-header context menus to a whole-row selection and range action', () => {
    const platform = createPlatform();
    const core = createCore();
    const surface = document.createElement('div');
    document.body.appendChild(surface);
    const rows = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetRowSizesFieldKey) as {
      getRightBoundaryColIndexByDimension?: (position: number) => number;
    };
    const columns = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetColumnSizesFieldKey) as {
      getRightBoundaryColIndexByDimension?: (position: number) => number;
    };
    rows.getRightBoundaryColIndexByDimension = (position: number) => Math.floor(position / 24);
    columns.getRightBoundaryColIndexByDimension = (position: number) => Math.floor(position / 80);
    Object.assign(core, {
      configEngine: { getDefaultConfig: () => ({ sheetOffsetX: 50, sheetOffsetY: 24 }) },
      renderEngine: {
        renderContext: { getRoot: () => surface },
        scrollManager: { getState: () => ({ x: 0, y: 0 }) },
      },
    });
    const commands = createCommands(core);
    const selected: unknown[] = [];
    const cleared: unknown[] = [];
    commands.register(SelectRangeCommand, (input) => {
      selected.push(input);
      return new LocalActionCommand(SelectRangeCommand.id, () => void 0);
    });
    commands.register(ClearRangeContentsCommand, (input) => {
      cleared.push(input);
      return new LocalActionCommand(ClearRangeContentsCommand.id, () => void 0);
    });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);
    const binding = platform.addEventListener.mock.calls.find(([target, type]) => target === surface && type === 'contextmenu');
    expect(binding).toBeDefined();
    const event = new MouseEvent('contextmenu', { clientX: 10, clientY: 50, cancelable: true });
    (binding![2] as (event: Event) => void)(event);
    expect(event.defaultPrevented).toBe(true);
    expect(selected).toEqual([expect.objectContaining({ anchor: [1, 0], focus: [1, 2] })]);
    document.querySelector<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]')?.click();
    expect(cleared).toEqual([{ anchor: [1, 0], focus: [1, 2] }]);
    expect(document.querySelector('.sear-sheet-context-menu')).toBeNull();
    const cellEvent = new MouseEvent('contextmenu', { clientX: 160, clientY: 74, cancelable: true });
    (binding![2] as (event: Event) => void)(cellEvent);
    expect(cellEvent.defaultPrevented).toBe(true);
    expect(selected.at(-1)).toEqual(expect.objectContaining({ anchor: [2, 1], focus: [2, 1] }));
    toolbar.destroy();
  });

  it('BUG-934 opens column-header actions for the selected whole columns', () => {
    const platform = createPlatform();
    const core = createCore();
    const surface = document.createElement('div');
    document.body.append(surface);
    const columns = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetColumnSizesFieldKey) as {
      getRightBoundaryColIndexByDimension: (position: number) => number;
    };
    columns.getRightBoundaryColIndexByDimension = (position) => Math.floor(position / 80);
    Object.assign(core, {
      configEngine: { getDefaultConfig: () => ({ sheetOffsetX: 50, sheetOffsetY: 24 }) },
      renderEngine: { renderContext: { getRoot: () => surface }, scrollManager: { getState: () => ({ x: 0, y: 0 }) } },
    });
    let range = { start: [0, 1] as [number, number], end: [2, 2] as [number, number] };
    const queries = new SheetQueryRegistry();
    queries.register(GetSelection, () => range);
    const commands = createCommands(core);
    const selected = jest.fn();
    const inserted = jest.fn();
    const deleted = jest.fn();
    commands.register(SelectRangeCommand, (input) => { selected(input); return new LocalActionCommand(SelectRangeCommand.id, () => {}); });
    commands.register(InsertRowCommand, () => new LocalActionCommand(InsertRowCommand.id, () => {}));
    commands.register(DeleteRowCommand, () => new LocalActionCommand(DeleteRowCommand.id, () => {}));
    commands.register(InsertColumnCommand, (input) => { inserted(input); return new LocalActionCommand(InsertColumnCommand.id, () => {}); });
    commands.register(DeleteColumnCommand, (input) => { deleted(input); return new LocalActionCommand(DeleteColumnCommand.id, () => {}); });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const host = document.createElement('div');
    document.body.append(host);
    toolbar.mount(host);
    try {
      const binding = platform.addEventListener.mock.calls.find(([target, type]) => target === surface && type === 'contextmenu')!;
      const rightClick = (x: number) => (binding[2] as (event: Event) => void)(
        new MouseEvent('contextmenu', { clientX: x, clientY: 10, cancelable: true }));
      rightClick(160);
      expect(selected).not.toHaveBeenCalled();
      expect(Array.from(document.querySelectorAll('.sear-sheet-context-menu [role="menuitem"]')).map((item) => item.textContent))
        .toEqual(expect.arrayContaining(['Insert columns left', 'Delete columns']));
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]'))
        .find((item) => item.textContent === 'Insert columns left')?.click();
      expect(inserted).toHaveBeenCalledWith({ index: 1, count: 2 });

      range = { start: [0, 0], end: [2, 0] };
      rightClick(160);
      expect(selected).toHaveBeenLastCalledWith({ anchor: [0, 1], focus: [2, 1] });
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]'))
        .find((item) => item.textContent === 'Delete columns')?.click();
      expect(deleted).toHaveBeenCalledWith({ index: 1, count: 1 });
    } finally {
      toolbar.destroy();
    }
  });

  it('BUG-936 preserves a selected row or cell range on an internal right click', () => {
    const platform = createPlatform();
    const core = createCore();
    const surface = document.createElement('div');
    document.body.append(surface);
    const rows = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetRowSizesFieldKey) as {
      getRightBoundaryColIndexByDimension: (position: number) => number;
    };
    const columns = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetColumnSizesFieldKey) as {
      getRightBoundaryColIndexByDimension: (position: number) => number;
    };
    rows.getRightBoundaryColIndexByDimension = (position) => Math.floor(position / 24);
    columns.getRightBoundaryColIndexByDimension = (position) => Math.floor(position / 80);
    Object.assign(core, {
      configEngine: { getDefaultConfig: () => ({ sheetOffsetX: 50, sheetOffsetY: 24 }) },
      renderEngine: { renderContext: { getRoot: () => surface }, scrollManager: { getState: () => ({ x: 0, y: 0 }) } },
    });
    let range = { start: [1, 0] as [number, number], end: [2, 2] as [number, number] };
    const queries = new SheetQueryRegistry();
    queries.register(GetSelection, () => range);
    const commands = createCommands(core);
    const selected = jest.fn();
    const inserted = jest.fn();
    const cleared = jest.fn();
    commands.register(SelectRangeCommand, (input) => { selected(input); return new LocalActionCommand(SelectRangeCommand.id, () => {}); });
    commands.register(InsertRowCommand, (input) => { inserted(input); return new LocalActionCommand(InsertRowCommand.id, () => {}); });
    commands.register(DeleteRowCommand, () => new LocalActionCommand(DeleteRowCommand.id, () => {}));
    commands.register(InsertColumnCommand, () => new LocalActionCommand(InsertColumnCommand.id, () => {}));
    commands.register(DeleteColumnCommand, () => new LocalActionCommand(DeleteColumnCommand.id, () => {}));
    commands.register(ClearRangeContentsCommand, (input) => { cleared(input); return new LocalActionCommand(ClearRangeContentsCommand.id, () => {}); });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const host = document.createElement('div');
    document.body.append(host);
    toolbar.mount(host);
    try {
      const binding = platform.addEventListener.mock.calls.find(([target, type]) => target === surface && type === 'contextmenu')!;
      (binding[2] as (event: Event) => void)(new MouseEvent('contextmenu', { clientX: 10, clientY: 50, cancelable: true }));
      expect(selected).not.toHaveBeenCalled();
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]'))
        .find((item) => item.textContent === 'Insert rows above')?.click();
      expect(inserted).toHaveBeenCalledWith({ index: 1, count: 2 });
      range = { start: [1, 1], end: [2, 1] };
      (binding[2] as (event: Event) => void)(new MouseEvent('contextmenu', { clientX: 160, clientY: 50, cancelable: true }));
      expect(selected).not.toHaveBeenCalled();
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-context-menu [role="menuitem"]'))
        .find((item) => item.textContent === 'Clear contents')?.click();
      expect(cleared).toHaveBeenCalledWith({ anchor: [1, 1], focus: [2, 1] });
    } finally {
      toolbar.destroy();
    }
  });

  it('BUG-964 uses rendered hit coordinates for fixed rows after scrolling', () => {
    const platform = createPlatform();
    const core = createCore();
    const surface = document.createElement('div');
    document.body.append(surface);
    const rows = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetRowSizesFieldKey) as {
      getRightBoundaryColIndexByDimension: (position: number) => number;
    };
    const columns = core.getDataEngine().readDataViewField(SheetDataFieldNamespace, SheetColumnSizesFieldKey) as {
      getRightBoundaryColIndexByDimension: (position: number) => number;
    };
    rows.getRightBoundaryColIndexByDimension = (position) => Math.floor(position / 24);
    columns.getRightBoundaryColIndexByDimension = (position) => Math.floor(position / 80);
    Object.assign(core, {
      configEngine: { getDefaultConfig: () => ({ sheetOffsetX: 50, sheetOffsetY: 24 }) },
      renderEngine: { renderContext: { getRoot: () => surface }, scrollManager: { getState: () => ({ x: 0, y: 100 }) } },
      eventEngine: { getNodeAtViewPoint: () => ({ properties: { startRowIndex: 0, startColIndex: 1 } }) },
    });
    const commands = createCommands(core);
    const selected = jest.fn();
    commands.register(SelectRangeCommand, (input) => { selected(input); return new LocalActionCommand(SelectRangeCommand.id, () => {}); });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined,
      createQueries(core, { start: [2, 2], end: [2, 2] }));
    const host = document.createElement('div');
    document.body.append(host);
    toolbar.mount(host);
    try {
      const binding = platform.addEventListener.mock.calls.find(([target, type]) => target === surface && type === 'contextmenu')!;
      (binding[2] as (event: Event) => void)(new MouseEvent('contextmenu', { clientX: 10, clientY: 50, cancelable: true }));
      expect(selected).toHaveBeenLastCalledWith(expect.objectContaining({ anchor: [0, 0], focus: [0, 2] }));
      (binding[2] as (event: Event) => void)(new MouseEvent('contextmenu', { clientX: 160, clientY: 50, cancelable: true }));
      expect(selected).toHaveBeenLastCalledWith(expect.objectContaining({ anchor: [0, 1], focus: [0, 1] }));
    } finally {
      toolbar.destroy();
    }
  });

  it('BUG-583 enables grid text style controls and routes buttons and shortcuts to the range command', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: unknown[] = [];
    commands.register(SetRangeCellTextStyleCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetRangeCellTextStyleCommand.id, () => void 0);
    });
    const queries = createQueries(core, { start: [0, 0], end: [0, 0] });
    queries.register(IsCellEditingQuery, () => false);
    queries.register(ReadSheetCellDataQuery, () => ({
      shape: [3, 3],
      getItem: () => ({ type: CellType.String, value: 'apple' }),
    }));
    const embeddedEditor = Object.assign(new FakeSheetEmbeddedEditor(), {
      formatting: {
        capture: () => ({ bold: false, fontFamily: 'Georgia' }),
        apply: (document: unknown) => document,
      },
    }) as SheetEmbeddedEditor;
    const toolbar = createToolbar(core, platform, embeddedEditor, commands, undefined, queries);
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);
    const bold = host.querySelector<HTMLButtonElement>('[data-testid="toolbar-bold"]');
    expect(bold?.disabled).toBe(false);
    bold?.click();
    expect(received).toEqual([{ attrs: { bold: true } }]);
    const shortcuts = platform.addEventListener.mock.calls.filter(([target, type, , options]) =>
      target === document && type === 'keydown' && Boolean(options && typeof options === 'object' && options.capture));
    expect(shortcuts.length).toBeGreaterThan(0);
    const key = new KeyboardEvent('keydown', { key: 'b', metaKey: true, cancelable: true });
    shortcuts.forEach((shortcut) => (shortcut[2] as (event: Event) => void)(key));
    expect(key.defaultPrevented).toBe(true);
    expect(received).toEqual([{ attrs: { bold: true } }, { attrs: { bold: true } }]);
    toolbar.destroy();
  });

  function createCore(otherCell: unknown = null): SearCoreSheet {
    const anchorCell = otherCell === null ? null : { type: 'text', value: 'A1' };
    const sheetData = {
      shape: [3, 3],
      getItem: jest.fn((row: number, column: number) => {
        if (row === 0 && column === 0) return anchorCell;
        return row === 0 && column === 1 ? otherCell : null;
      }),
      forEachStored: jest.fn((callback: (cell: unknown, row: number, column: number) => void) => {
        if (anchorCell !== null) callback(anchorCell, 0, 0);
        if (otherCell !== null) callback(otherCell, 0, 1);
      }),
      forEachStoredInRange: jest.fn((
        startRow: number,
        startColumn: number,
        endRow: number,
        endColumn: number,
        callback: (cell: unknown, row: number, column: number) => void,
      ) => {
        if (startRow <= 0 && endRow >= 0 && startColumn <= 0 && endColumn >= 0 && anchorCell !== null) {
          callback(anchorCell, 0, 0);
        }
        if (startRow <= 0 && endRow >= 0 && startColumn <= 1 && endColumn >= 1 && otherCell !== null) {
          callback(otherCell, 0, 1);
        }
      }),
    };
    const cellAlignments = new AlignmentMatrix(void 0, [3, 3]);
    const verticalAlignments = new VerticalAlignmentMatrix(void 0, [3, 3]);
    const cellFills = new CellFillMatrix(void 0, [3, 3]);
    const rowSizes = {
      shape: [1, 3],
      getDefaultValue: jest.fn(() => 24),
      getItem: jest.fn(() => 24),
    };
    const columnSizes = {
      shape: [1, 3],
      getDefaultValue: jest.fn(() => 80),
      getItem: jest.fn(() => 80),
    };
    const hiddenSizes = {
      getItem: jest.fn(() => null),
    };
    const selection: [RectRange, RectRange] = [
      new RectRange([
        [0, 0],
        [0, 0],
      ]),
      new RectRange([
        [0, 0],
        [1, 1],
      ]),
    ];
    const alignmentPlugin = new SheetAlignmentPlugin({
      cellAlignments,
    });
    const verticalAlignmentPlugin = new SheetVerticalAlignmentPlugin({
      cellVerticalAlignments: verticalAlignments,
    });
    const cellMerges = new CellMergeMatrix(void 0, [3, 3]);
    const mergePlugin = new SheetCellMergePlugin(
      { cellMerges },
      {
        target: SheetDataPlugin.pluginKey,
        readCell: (row, column) => sheetData.getItem(row, column),
      },
    );

    return {
      executePipeline: jest.fn(),
      getDataEngine: () => ({
        getDataType: (key: unknown) => (key === SheetSelectionPlugin.pluginKey ? selection : null),
        readDataViewField: (viewKey: string, fieldKey: string) => {
          if (viewKey !== SheetDataFieldNamespace) return null;
          if (fieldKey === SheetDataMatrixFieldKey) return sheetData;
          if (fieldKey === SheetHorizontalAlignmentFieldKey) return cellAlignments;
          if (fieldKey === SheetVerticalAlignmentFieldKey) return verticalAlignments;
          if (fieldKey === SheetCellFillFieldKey) return cellFills;
          if (fieldKey === SheetRowSizesFieldKey) return rowSizes;
          if (fieldKey === SheetColumnSizesFieldKey) return columnSizes;
          if (fieldKey === SheetRowHiddenOriginalSizesFieldKey) return hiddenSizes;
          if (fieldKey === SheetColumnHiddenOriginalSizesFieldKey) return hiddenSizes;
          if (fieldKey === 'sheet.cellMerge') return cellMerges;
          return null;
        },
      }),
      pluginManager: {
        getAllPlugins: () => [alignmentPlugin, verticalAlignmentPlugin, mergePlugin],
      },
    } as unknown as SearCoreSheet;
  }

  function createCommands(core: SearCoreSheet): SheetCommandBus {
    const commands = new SheetCommandBus();
    commands.bind({ executePipeline: core.executePipeline.bind(core), applyEffect: () => void 0 });
    for (const plugin of core.pluginManager?.getAllPlugins?.() ?? []) {
      if (
        plugin instanceof SheetAlignmentPlugin ||
        plugin instanceof SheetVerticalAlignmentPlugin ||
        plugin instanceof SheetCellMergePlugin
      ) {
        plugin.registerCommands(commands);
      }
    }
    return commands;
  }

  function createQueries(
    core: SearCoreSheet,
    range: { start: readonly [number, number]; end: readonly [number, number] } = {
      start: [0, 0] as const,
      end: [1, 1] as const,
    },
  ): SheetQueryRegistry {
    const queries = new SheetQueryRegistry();
    queries.register(GetSelection, () => range);
    const mergePlugin = core.pluginManager.getAllPlugins().find((plugin) => plugin instanceof SheetCellMergePlugin);
    mergePlugin?.registerQueries(queries);
    return queries;
  }

  function createPlatform(): jest.Mocked<Platform> {
    return {
      requestAnimationFrame: jest.fn(),
      cancelAnimationFrame: jest.fn(),
      setTimeout: jest.fn(() => 2),
      clearTimeout: jest.fn(),
      setInterval: jest.fn(() => 1),
      clearInterval: jest.fn(),
      now: jest.fn(() => 0),
      queueMicrotask: jest.fn(),
      warn: jest.fn(),
      addEventListener: jest.fn(() => () => void 0),
      observeResize: jest.fn(() => () => void 0),
    } as unknown as jest.Mocked<Platform>;
  }

  function createEmbeddedEditor(initial: SheetEmbeddedInlineStyleState = disabledInlineStyleState()) {
    const editor = new FakeSheetEmbeddedEditor();
    let state = initial;
    const listeners = new Set<(next: SheetEmbeddedInlineStyleState) => void>();
    editor.observations.register(SheetEmbeddedInlineStyleObservation, {
      getSnapshot: () => state,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    return {
      editor,
      publish(next: SheetEmbeddedInlineStyleState): void {
        state = next;
        listeners.forEach((listener) => listener(next));
      },
      getListenerCount: () => listeners.size,
    };
  }

  function createHistoryProvider() {
    let status: SheetHistoryStatus = { canUndo: false, canRedo: false };
    const listeners = new Set<(next: SheetHistoryStatus) => void>();
    const provider: SheetHistoryStatusProvider = {
      getStatus: () => status,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    return {
      provider,
      setStatus(next: SheetHistoryStatus) {
        status = next;
        listeners.forEach((listener) => listener(status));
      },
      getListenerCount: () => listeners.size,
    };
  }

  it('mounts the replica toolbar UI, runs available commands, and disables unavailable controls', () => {
    const platform = createPlatform();
    const core = createCore();
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), createCommands(core));
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    expect(target.querySelector('[data-testid="ToolbarWrapper"]')).not.toBeNull();
    expect(target.querySelector('.sear-toolbar--command-backed')).toBeNull();
    expect(target.querySelector('[data-testid="toolbar-centerAlign"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="toolbar-bold"]')?.classList.contains('disabled')).toBe(true);
    expect(document.querySelector('style[data-sear-toolbar]')).not.toBeNull();
    target.querySelector<HTMLElement>('[data-testid="toolbar-centerAlign"]')?.click();
    expect(core.executePipeline).toHaveBeenCalledTimes(1);

    target.querySelector<HTMLElement>('[data-testid="toolbar-bold"]')?.click();
    expect(core.executePipeline).toHaveBeenCalledTimes(1);

    toolbar.destroy();

    expect(target.querySelector('.sear-toolbar')).toBeNull();
    expect(document.querySelector('style[data-sear-toolbar]')).toBeNull();
  });

  it('routes the merge toolbar action through the toggle merge command', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);
    target.querySelector<HTMLElement>('[data-testid="MergeCellButton"]')?.click();

    const pipeline = (core.executePipeline as jest.Mock).mock.calls.at(-1)?.[0] as Pipeline;
    expect(pipeline.name).toBe(ToggleMergeCellsCommand.id);
    expect(pipeline.steps[0]?.transaction?.operations).toEqual([
      {
        p: [0, 0],
        uc: { value: { endRow: 1, endColumn: 1 }, prev: null },
      },
    ]);
    toolbar.destroy();
  });

  it('confirms before discarding a non-anchor value and leaves the sheet untouched on cancel', async () => {
    const platform = createPlatform();
    const otherCell = { type: 'text', value: 'B1' };
    const core = createCore(otherCell);
    const commands = createCommands(core);
    const queries = createQueries(core);
    expect(queries.has(AnalyzeMergeCellsQuery)).toBe(true);
    const confirm = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const interaction = { confirm, destroy: jest.fn() } as unknown as UserInteractionService;
    const toolbar = createToolbar(
      core,
      platform,
      new FakeSheetEmbeddedEditor(),
      commands,
      undefined,
      queries,
      interaction,
    );
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);

    target.querySelector<HTMLElement>('[data-testid="MergeCellButton"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(core.executePipeline).not.toHaveBeenCalled();

    target.querySelector<HTMLElement>('[data-testid="MergeCellButton"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(confirm).toHaveBeenCalledTimes(2);
    const pipeline = (core.executePipeline as jest.Mock).mock.calls[0]?.[0] as Pipeline;
    expect(pipeline.steps).toHaveLength(2);
    expect(pipeline.steps[0]?.transaction?.operations).toEqual([{ p: [0, 1], uc: { value: null, prev: otherCell } }]);
    toolbar.destroy();
  });

  it('keeps unavailable replica menus closed and disabled', () => {
    const platform = createPlatform();
    const core = createCore();
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), createCommands(core));
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const insert = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-insert"]');
    expect(insert?.disabled).toBe(true);
    insert?.click();
    expect(document.querySelector('.sear-toolbar-insert-popovers')).toBeNull();

    toolbar.destroy();
  });

  it('runs history commands and follows editor-local undo and redo availability', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    commands.register(
      UndoSheetCommand,
      () => new PipelineExecutionCommand(UndoSheetCommand.id, new Pipeline(UndoSheetCommand.id)),
    );
    commands.register(
      RedoSheetCommand,
      () => new PipelineExecutionCommand(RedoSheetCommand.id, new Pipeline(RedoSheetCommand.id)),
    );
    const history = createHistoryProvider();
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, history.provider);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);
    const undo = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-undo"]');
    const redo = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-redo"]');
    expect(undo?.disabled).toBe(true);
    expect(redo?.disabled).toBe(true);

    history.setStatus({ canUndo: true, canRedo: false });
    expect(undo?.disabled).toBe(false);
    undo?.click();
    expect(core.executePipeline).toHaveBeenLastCalledWith(expect.objectContaining({ name: UndoSheetCommand.id }));

    history.setStatus({ canUndo: false, canRedo: true });
    expect(undo?.disabled).toBe(true);
    expect(redo?.disabled).toBe(false);
    redo?.click();
    expect(core.executePipeline).toHaveBeenLastCalledWith(expect.objectContaining({ name: RedoSheetCommand.id }));

    toolbar.destroy();
    expect(history.getListenerCount()).toBe(0);
  });

  it('routes active edit history through document input and returns to sheet history after editing', () => {
    const core = createCore();
    const commands = createCommands(core);
    const inputs: unknown[] = [];
    commands.register(HandleDocumentInputCommand, (input) => {
      inputs.push(input);
      return new LocalActionCommand(HandleDocumentInputCommand.id, () => {});
    });
    commands.register(UndoSheetCommand, () => new PipelineExecutionCommand(UndoSheetCommand.id, new Pipeline(UndoSheetCommand.id)));
    const editor = new FakeSheetEmbeddedEditor();
    let editStatus = { editing: false, canUndo: false, canRedo: false };
    const listeners = new Set<(status: typeof editStatus) => void>();
    editor.observations.register(SheetEmbeddedEditHistoryObservation, {
      getSnapshot: () => editStatus,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    });
    const publish = (status: typeof editStatus): void => {
      editStatus = status;
      listeners.forEach((listener) => listener(status));
    };
    const history = createHistoryProvider();
    history.setStatus({ canUndo: true, canRedo: false });
    const toolbar = createToolbar(core, createPlatform(), editor, commands, history.provider);
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);
    const undo = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-undo"]')!;
    const redo = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-redo"]')!;

    publish({ editing: true, canUndo: false, canRedo: false });
    expect(undo.disabled).toBe(true);
    publish({ editing: true, canUndo: true, canRedo: false });
    undo.click();
    expect(inputs).toEqual([{ kind: 'keyDown', key: 'z', metaKey: true, shiftKey: false }]);
    publish({ editing: true, canUndo: false, canRedo: true });
    redo.click();
    expect(inputs.at(-1)).toEqual({ kind: 'keyDown', key: 'z', metaKey: true, shiftKey: true });
    publish({ editing: false, canUndo: false, canRedo: false });
    expect(undo.disabled).toBe(false);
    undo.click();
    expect(core.executePipeline).toHaveBeenLastCalledWith(expect.objectContaining({ name: UndoSheetCommand.id }));
    toolbar.destroy();
    expect(listeners.size).toBe(0);
  });

  it('reuses injected CSS, replaces existing toasts, and handles repeated destroy safely', () => {
    const platform = createPlatform();
    const core = createCore();
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), createCommands(core));
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);
    toolbar.mount(target);
    expect(document.querySelectorAll('style[data-sear-toolbar]')).toHaveLength(1);

    const first = document.createElement('div');
    first.className = 'sear-toolbar__toast';
    first.textContent = 'old';
    document.body.appendChild(first);

    target.querySelector<HTMLElement>('[data-testid="toolbar-bold"]')?.click();
    expect(document.querySelector('.sear-toolbar__toast')?.textContent).toBe('old');

    toolbar.destroy();
    toolbar.destroy();
  });

  it('handles buildToolbar without a container and tolerates repeated teardown', () => {
    const platform = createPlatform();
    const core = createCore();
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), createCommands(core));

    (toolbar as unknown as { buildToolbar: () => void }).buildToolbar();

    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);

    toolbar.destroy();
  });

  it('provides a no-op toolbar lifecycle for hosts without a DOM surface', () => {
    const toolbar = new HeadlessToolbar();

    expect(() => toolbar.mount({})).not.toThrow();
    expect(() => toolbar.destroy()).not.toThrow();
  });

  it('allows destroy before mount', () => {
    const platform = createPlatform();
    const toolbar = createToolbar(createCore(), platform, new FakeSheetEmbeddedEditor());

    expect(() => toolbar.destroy()).not.toThrow();
  });

  it('warns about missing command bus and mounts the complete disabled shell', () => {
    const platform = createPlatform();
    const toolbar = createToolbar(createCore(), platform, new FakeSheetEmbeddedEditor());
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    expect(target.querySelector('[data-testid="ToolbarWrapper"]')).not.toBeNull();
    expect(target.querySelector('.sear-toolbar--command-backed')).toBeNull();
    expect(target.querySelector('[data-testid="toolbar-bold"]')?.classList.contains('disabled')).toBe(true);
    expect(platform.warn).toHaveBeenCalledWith(
      'SearWebToolbar command-backed actions are unavailable: SheetCommandBus is missing.',
    );
    toolbar.destroy();
  });

  it('uses an injected command bus while rendering the full replica layout', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = new SheetCommandBus();
    commands.bind({ executePipeline: core.executePipeline.bind(core), applyEffect: () => void 0 });
    for (const plugin of core.pluginManager?.getAllPlugins?.() ?? []) {
      if (plugin instanceof SheetAlignmentPlugin || plugin instanceof SheetVerticalAlignmentPlugin) {
        plugin.registerCommands(commands);
      }
    }
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    expect(target.querySelector('[data-testid="ToolbarWrapper"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="toolbar-centerAlign"]')?.classList.contains('disabled')).toBe(false);
    expect(target.querySelector('[data-testid="toolbar-bold"]')?.classList.contains('disabled')).toBe(true);
    toolbar.destroy();
  });

  it('routes the font pickers to the active cell inline-style command', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: SheetInlineStyleCommandInput[] = [];
    commands.register(SetCellInlineStyleCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetCellInlineStyleCommand.id, () => void 0);
    });
    const inlineStyles = createEmbeddedEditor(enabledInlineStyleState());
    const toolbar = createToolbar(core, platform, inlineStyles.editor, commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);
    const fontFamily = target.querySelector<HTMLElement>('[data-testid="font-family-select"]');
    expect(fontFamily?.classList.contains('disabled')).toBe(false);
    fontFamily?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-fontFamily-Georgia"]')?.click();

    expect(received).toEqual([{ attrs: { fontFamily: 'Georgia' } }]);
    expect(fontFamily?.textContent).toContain('Georgia');

    const fontSize = target.querySelector<HTMLButtonElement>('[data-testid="font-size-select"]');
    expect(fontSize?.classList.contains('disabled')).toBe(false);
    expect(fontSize?.textContent).toContain('Default');
    fontSize?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-fontSize-24"]')?.click();

    expect(received).toEqual([{ attrs: { fontFamily: 'Georgia' } }, { attrs: { fontSize: 24 } }]);
    expect(fontSize?.textContent).toContain('24');

    target.querySelector<HTMLElement>('[data-testid="toolbar-bold"]')?.click();
    expect(received).toEqual([
      { attrs: { fontFamily: 'Georgia' } },
      { attrs: { fontSize: 24 } },
      { attrs: { [BoldTextStyleKey.Bold]: true } },
    ]);

    target.querySelector<HTMLElement>('[data-testid="toolbar-italic"]')?.click();
    target.querySelector<HTMLElement>('[data-testid="toolbar-underline"]')?.click();
    target.querySelector<HTMLElement>('[data-testid="toolbar-crossOut"]')?.click();
    expect(received.slice(-3)).toEqual([
      { attrs: { [ItalicTextStyleKey.Italic]: true } },
      { attrs: { [UnderlineTextStyleKey.Underline]: true } },
      { attrs: { [StrikethroughTextStyleKey.Strikethrough]: true } },
    ]);

    const fontColor = target.querySelector<HTMLButtonElement>('[data-testid="font-color"]');
    expect(fontColor?.disabled).toBe(false);
    fontColor?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-color-fontColor-Blue"]')?.click();
    expect(received.at(-1)).toEqual({ attrs: { color: '#256cfb' } });
    fontColor?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-color-fontColor-Default"]')?.click();
    expect(received.at(-1)).toEqual({ attrs: { color: null } });

    toolbar.destroy();
    expect(inlineStyles.getListenerCount()).toBe(0);
  });

  it('dispatches border presets with local color and line choices and cleans up its popover', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: SheetSetRangeCellBorderInput[] = [];
    commands.register(SetRangeCellBorderCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetRangeCellBorderCommand.id, () => undefined);
    });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);
    const button = target.querySelector<HTMLButtonElement>('[data-testid="border-set"]')!;
    expect(button.disabled).toBe(false);
    button.click();
    const color = document.querySelector<HTMLInputElement>('[aria-label="Border color"]')!;
    color.value = '#ff0000';
    color.dispatchEvent(new Event('input'));
    const style = document.querySelector<HTMLSelectElement>('[aria-label="Border line style"]')!;
    style.value = SheetBorderLineStyle.Double;
    style.dispatchEvent(new Event('change'));
    expect(received).toEqual([]);
    document.querySelector<HTMLButtonElement>(`[data-border-preset="${SheetBorderPreset.Outside}"]`)!.click();
    expect(received).toEqual([
      {
        anchor: [0, 0],
        focus: [1, 1],
        preset: SheetBorderPreset.Outside,
        stroke: { color: '#ff0000', style: SheetBorderLineStyle.Double },
      },
    ]);
    expect(document.querySelector('.sear-cell-border-menu')).toBeNull();
    button.click();
    expect(document.querySelector<HTMLInputElement>('[aria-label="Border color"]')!.value).toBe('#ff0000');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.sear-cell-border-menu')).toBeNull();
    button.click();
    toolbar.destroy();
    expect(document.querySelector('.sear-cell-border-menu')).toBeNull();
  });

  it('keeps cell fill enabled and dispatches palette selections when the fill plugin command is registered', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: SheetSetRangeCellFillInput[] = [];
    commands.register(SetRangeCellFillCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetRangeCellFillCommand.id, () => void 0);
    });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const fillColor = target.querySelector<HTMLButtonElement>(`[data-testid="${SheetToolbarControlId.CellFill}"]`);
    expect(fillColor?.disabled).toBe(false);
    expect(fillColor?.classList.contains('disabled')).toBe(false);

    fillColor?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-color-fillColor-Blue"]')?.click();
    expect(received).toEqual([
      {
        anchor: [0, 0],
        focus: [1, 1],
        fill: '#256cfb',
      },
    ]);

    fillColor?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-color-fillColor-No fill"]')?.click();
    expect(received.at(-1)).toEqual({
      anchor: [0, 0],
      focus: [1, 1],
      fill: null,
    });

    toolbar.destroy();
  });

  it('BUG-618 marks a uniform fill and identifies a mixed selection in the palette', () => {
    const platform = createPlatform();
    const core = createCore();
    const fills = core.getDataEngine().readDataViewField<CellFillMatrix>(SheetDataFieldNamespace, SheetCellFillFieldKey)!;
    for (let row = 0; row < 2; row += 1)
      for (let column = 0; column < 2; column += 1) fills.setItem(row, column, '#ffe8e6');
    const commands = createCommands(core);
    commands.register(SetRangeCellFillCommand, () => new LocalActionCommand(SetRangeCellFillCommand.id, () => void 0));
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands);
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);
    const fillButton = target.querySelector<HTMLButtonElement>(`[data-testid="${SheetToolbarControlId.CellFill}"]`)!;

    fillButton.click();
    const red = document.querySelector<HTMLButtonElement>('[data-testid="toolbar-color-fillColor-Light red"]')!;
    expect(red.getAttribute('aria-pressed')).toBe('true');
    expect(red.classList.contains('sear-toolbar-color-swatch-selected')).toBe(true);
    fillButton.click();

    fills.setItem(1, 1, '#dff7eb');
    fillButton.click();
    expect(document.querySelector('.sear-toolbar-color-title')?.textContent).toContain('mixed');
    expect(document.querySelector('[data-testid="toolbar-color-fillColor-Light red"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelectorAll('.sear-toolbar-color-swatch-selected')).toHaveLength(0);
    toolbar.destroy();
  });

  it('BUG-619 reflects selected horizontal and vertical alignment and clears mixed states', () => {
    const platform = createPlatform();
    const core = createCore();
    const horizontal = core.getDataEngine().readDataViewField<AlignmentMatrix>(SheetDataFieldNamespace, SheetHorizontalAlignmentFieldKey)!;
    const vertical = core.getDataEngine().readDataViewField<VerticalAlignmentMatrix>(SheetDataFieldNamespace, SheetVerticalAlignmentFieldKey)!;
    const commands = createCommands(core);
    const queries = createQueries(core, { start: [0, 0], end: [0, 0] });
    horizontal.addItem(0, 0, 'center');
    vertical.addItem(0, 0, 'top');
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);

    const button = (testId: string) => target.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;
    expect(button('toolbar-centerAlign').getAttribute('aria-pressed')).toBe('true');
    expect(button('toolbar-leftAlign').getAttribute('aria-pressed')).toBe('false');
    expect(button('toolbar-alignTop').getAttribute('aria-pressed')).toBe('true');
    expect(button('toolbar-alignCenter').getAttribute('aria-pressed')).toBe('false');

    horizontal.addItem(0, 0, 'right');
    vertical.addItem(0, 0, 'bottom');
    button('toolbar-rightAlign').click();
    expect(button('toolbar-rightAlign').getAttribute('aria-pressed')).toBe('true');
    expect(button('toolbar-alignBottom').getAttribute('aria-pressed')).toBe('true');

    const mixedQueries = createQueries(core, { start: [0, 0], end: [0, 1] });
    toolbar.destroy();
    const mixedToolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, mixedQueries);
    mixedToolbar.mount(target);
    expect(target.querySelectorAll('[data-testid*="Align"][aria-pressed="true"]')).toHaveLength(0);
    mixedToolbar.destroy();
  });

  it('keeps single-cell duplicate highlighting inside the selection', () => {
    const platform = createPlatform();
    const core = createCore({ type: 'text', value: 'B1' });
    const commands = createCommands(core);
    const queries = createQueries(core, { start: [0, 0] as const, end: [0, 0] as const });
    const highlightInputs: SheetDuplicateHighlightInput[] = [];
    const clearInputs: SheetDuplicateClearInput[] = [];
    commands.register(HighlightDuplicateRowsCommand, (input) => {
      highlightInputs.push(input);
      return new LocalActionCommand(HighlightDuplicateRowsCommand.id, () => void 0);
    });
    commands.register(ClearDuplicateHighlightsCommand, (input) => {
      clearInputs.push(input);
      return new LocalActionCommand(ClearDuplicateHighlightsCommand.id, () => void 0);
    });
    commands.register(
      DeleteDuplicateRowsCommand,
      () => new LocalActionCommand(DeleteDuplicateRowsCommand.id, () => void 0),
    );
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const duplicate = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-duplicate"]');
    expect(duplicate?.disabled).toBe(false);
    duplicate?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-duplicate-Highlight duplicates"]')?.click();
    duplicate?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-duplicate-Clear duplicate highlighting"]')?.click();

    expect(highlightInputs).toEqual([
      {
        anchor: [0, 0],
        focus: [0, 0],
        highlight: '#ffe8e6',
      },
    ]);
    expect(clearInputs).toEqual([{ anchor: [0, 0], focus: [0, 0] }]);

    toolbar.destroy();
  });

  it('BUG-576 names the duplicate retention position selector', () => {
    const platform = createPlatform();
    const core = createCore({ type: 'text', value: 'B1' });
    const commands = createCommands(core);
    const queries = createQueries(core, { start: [0, 0] as const, end: [1, 1] as const });
    commands.register(
      HighlightDuplicateRowsCommand,
      () => new LocalActionCommand(HighlightDuplicateRowsCommand.id, () => void 0),
    );
    commands.register(
      ClearDuplicateHighlightsCommand,
      () => new LocalActionCommand(ClearDuplicateHighlightsCommand.id, () => void 0),
    );
    commands.register(
      DeleteDuplicateRowsCommand,
      () => new LocalActionCommand(DeleteDuplicateRowsCommand.id, () => void 0),
    );
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const target = document.createElement('div');
    document.body.appendChild(target);
    toolbar.mount(target);
    target.querySelector<HTMLButtonElement>('[data-testid="toolbar-duplicate"]')!.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-duplicate-Remove duplicates"]')!.click();

    const keep = document.querySelector<HTMLSelectElement>('.sear-toolbar-duplicate-dialog [data-role="keep"]')!;
    expect(keep.getAttribute('aria-label')).toBe('Duplicate to keep');
    keep.value = keep.options[1]!.value;
    expect(keep.getAttribute('aria-label')).toBe('Duplicate to keep');
    expect(document.activeElement).toBe(document.querySelector('.sear-toolbar-duplicate-dialog [data-role="cancel"]'));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-toolbar-duplicate-dialog')).toBeNull();
    toolbar.destroy();
  });

  it('applies and reflects cell number formats through the format plugin commands and query', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const queries = createQueries(core);
    let format: CellFormat | null = CellFormats.percent;
    const formatInputs: SheetSetRangeCellFormatInput[] = [];
    const decimalInputs: SheetAdjustRangeCellFormatDecimalsInput[] = [];
    queries.register(ReadSheetCellFormatQuery, () => ({
      shape: [3, 3] as [number, number],
      getItem: () => format,
    }));
    commands.register(SetRangeCellFormatCommand, (input) => {
      formatInputs.push(input);
      format = input.format;
      return new LocalActionCommand(SetRangeCellFormatCommand.id, () => void 0);
    });
    commands.register(AdjustRangeCellFormatDecimalPlacesCommand, (input) => {
      decimalInputs.push(input);
      return new LocalActionCommand(AdjustRangeCellFormatDecimalPlacesCommand.id, () => void 0);
    });
    const toolbar = createToolbar(core, platform, new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const formatSelect = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-number-format"]');
    expect(formatSelect?.disabled).toBe(false);
    expect(formatSelect?.textContent).toContain('Percent');
    formatSelect?.click();
    document
      .querySelector<HTMLElement>('[data-testid="toolbar-menu-item-numberFormat-date"]')
      ?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-numberFormat-date-Short date"]')?.click();
    expect(formatInputs.at(-1)).toEqual({
      anchor: [0, 0],
      focus: [1, 1],
      format: CellFormats.excelCode('yyyy-m-d'),
    });
    expect(formatSelect?.textContent).toContain('Date');

    target.querySelector<HTMLButtonElement>('[data-testid="toolbar-currencyFormat"]')?.click();
    expect(formatInputs.at(-1)).toEqual({
      anchor: [0, 0],
      focus: [1, 1],
      format: CellFormats.currency('CNY', 'zh-CN'),
    });
    target.querySelector<HTMLButtonElement>('[data-testid="toolbar-percentFormat"]')?.click();
    expect(formatInputs.at(-1)?.format).toEqual(CellFormats.percent);

    target.querySelector<HTMLButtonElement>('[data-testid="toolbar-decimalPointPlus"]')?.click();
    target.querySelector<HTMLButtonElement>('[data-testid="toolbar-decimalPointMinus"]')?.click();
    expect(decimalInputs).toEqual([
      { anchor: [0, 0], focus: [1, 1], delta: 1 },
      { anchor: [0, 0], focus: [1, 1], delta: -1 },
    ]);

    formatSelect?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-numberFormat-more"]')?.click();
    const dialog = document.querySelector<HTMLDialogElement>('.sear-number-format-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll('.sear-number-format-dialog__categories button')).toHaveLength(12);
    dialog?.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();
    const custom = dialog?.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom');
    if (custom) {
      custom.value = '0.00" kg"';
      custom.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dialog?.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.click();
    expect(formatInputs.at(-1)?.format).toEqual(CellFormats.excelCode('0.00" kg"'));
    expect(document.querySelector('.sear-number-format-dialog')).toBeNull();

    toolbar.destroy();
  });

  it('BUG-978 commits a numeric draft before applying percent format', () => {
    const core = createCore();
    const commands = createCommands(core);
    const queries = createQueries(core, { start: [19, 4], end: [19, 4] });
    const order: string[] = [];
    let editing = true;
    queries.register(IsCellEditingQuery, () => editing);
    commands.register(CommitCellEditCommand, () => {
      order.push('commit');
      editing = false;
      return new LocalActionCommand(CommitCellEditCommand.id, () => void 0);
    });
    commands.register(SetRangeCellFormatCommand, () => {
      order.push('format');
      return new LocalActionCommand(SetRangeCellFormatCommand.id, () => void 0);
    });
    const toolbar = createToolbar(core, createPlatform(), new FakeSheetEmbeddedEditor(), commands, undefined, queries);
    const host = document.createElement('div');
    document.body.appendChild(host);
    toolbar.mount(host);

    host.querySelector<HTMLButtonElement>('[data-testid="toolbar-percentFormat"]')?.click();
    expect(order).toEqual(['commit', 'format']);
    toolbar.destroy();
  });

  it('follows embedded inline-style observations and toggles through the cell command', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: SheetInlineStyleCommandInput[] = [];
    commands.register(SetCellInlineStyleCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetCellInlineStyleCommand.id, () => void 0);
    });
    const inlineStyles = createEmbeddedEditor();
    const toolbar = createToolbar(core, platform, inlineStyles.editor, commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);
    const bold = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-bold"]');
    const italic = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-italic"]');
    const underline = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-underline"]');
    const strikethrough = target.querySelector<HTMLButtonElement>('[data-testid="toolbar-crossOut"]');
    expect([bold, italic, underline, strikethrough].map((button) => button?.getAttribute('aria-label'))).toEqual([
      'Bold', 'Italic', 'Underline', 'Strikethrough',
    ]);
    expect(bold?.disabled).toBe(true);
    expect(inlineStyles.getListenerCount()).toBe(1);

    inlineStyles.publish({
      bold: { enabled: true, active: true, value: true },
      italic: { enabled: true, active: false, value: null },
      underline: { enabled: false, active: false, value: null },
      strikethrough: { enabled: true, active: true, value: true },
      fontSize: { enabled: true, active: false, value: 24 },
      color: { enabled: true, active: false, value: '#256cfb' },
    });
    expect(bold?.disabled).toBe(false);
    expect(bold?.classList.contains('wd3-toolbar-item-active')).toBe(true);
    expect(bold?.getAttribute('aria-pressed')).toBe('true');
    expect(italic?.disabled).toBe(false);
    expect(italic?.classList.contains('wd3-toolbar-item-active')).toBe(false);
    expect(italic?.getAttribute('aria-pressed')).toBe('false');
    expect(underline?.disabled).toBe(true);
    expect(strikethrough?.classList.contains('wd3-toolbar-item-active')).toBe(true);
    expect(strikethrough?.getAttribute('aria-pressed')).toBe('true');
    const fontSize = target.querySelector<HTMLButtonElement>('[data-testid="font-size-select"]');
    expect(fontSize?.disabled).toBe(false);
    expect(fontSize?.textContent).toContain('24');
    const fontColor = target.querySelector<HTMLButtonElement>('[data-testid="font-color"]');
    expect(fontColor?.disabled).toBe(false);

    bold?.click();
    italic?.click();
    underline?.click();
    expect(received).toEqual([
      { attrs: { [BoldTextStyleKey.Bold]: false } },
      { attrs: { [ItalicTextStyleKey.Italic]: true } },
    ]);

    toolbar.mount(target);
    expect(inlineStyles.getListenerCount()).toBe(1);
    toolbar.destroy();
    expect(inlineStyles.getListenerCount()).toBe(0);
  });

  it('follows the embedded document font-size value from the inline-style observation', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    commands.register(
      SetCellInlineStyleCommand,
      () => new LocalActionCommand(SetCellInlineStyleCommand.id, () => void 0),
    );
    const inlineStyles = createEmbeddedEditor();
    const toolbar = createToolbar(core, platform, inlineStyles.editor, commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const fontSize = target.querySelector<HTMLButtonElement>('[data-testid="font-size-select"]');
    expect(fontSize?.classList.contains('disabled')).toBe(true);
    inlineStyles.publish({ ...enabledInlineStyleState(), fontSize: { enabled: true, active: false, value: 24 } });
    expect(fontSize?.classList.contains('disabled')).toBe(false);
    expect(fontSize?.textContent).toContain('24');

    inlineStyles.publish({ ...enabledInlineStyleState(), fontSize: { enabled: true, active: false, value: null } });
    expect(fontSize?.textContent).toContain('Default');

    toolbar.destroy();
  });

  it('follows the embedded document font-family value from the inline-style observation', () => {
    const platform = createPlatform();
    const core = createCore();
    const commands = createCommands(core);
    const received: SheetInlineStyleCommandInput[] = [];
    commands.register(SetCellInlineStyleCommand, (input) => {
      received.push(input);
      return new LocalActionCommand(SetCellInlineStyleCommand.id, () => void 0);
    });
    const inlineStyles = createEmbeddedEditor();
    const toolbar = createToolbar(core, platform, inlineStyles.editor, commands);
    const target = document.createElement('div');
    document.body.appendChild(target);

    toolbar.mount(target);

    const fontFamily = target.querySelector<HTMLButtonElement>('[data-testid="font-family-select"]');
    expect(fontFamily?.classList.contains('disabled')).toBe(true);
    inlineStyles.publish({
      ...enabledInlineStyleState(),
      fontFamily: { enabled: true, active: false, value: 'Georgia' },
    });
    expect(fontFamily?.classList.contains('disabled')).toBe(false);
    expect(fontFamily?.textContent).toContain('Georgia');

    fontFamily?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-fontFamily-default"]')?.click();
    expect(received).toEqual([{ attrs: { fontFamily: null } }]);

    inlineStyles.publish({ ...enabledInlineStyleState(), fontFamily: { enabled: true, active: false, value: null } });
    expect(fontFamily?.textContent).toContain('Default');

    toolbar.destroy();
  });

  it('keeps replica toolbar available as a static visual test fixture', () => {
    const onUnavailableAction = jest.fn();
    const root = createReplicaToolbar(onUnavailableAction);
    document.body.appendChild(root);

    expect(root.querySelector('[data-testid="toolbar-menu"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="font-size-select"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="toolbar-sync-convert-notable"]')?.textContent).toContain('Convert to AI spreadsheet');

    root
      .querySelector<HTMLElement>('[data-testid="toolbar-insert"]')
      ?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(document.querySelectorAll('.sear-toolbar-insert-popover')).toHaveLength(1);
    expect(document.querySelector('[data-testid="menu-item-formula"]')?.textContent).toContain('Formula');

    document
      .querySelector<HTMLElement>('[data-testid="menu-item-formula"]')
      ?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(document.querySelectorAll('.sear-toolbar-insert-popover')).toHaveLength(2);
    expect(document.querySelector('[data-testid="menu-item-mbi-formula-ai"]')?.textContent).toContain('AI formula');

    root.dispatchEvent(new Event('sear-toolbar-destroy'));
    expect(document.querySelector('.sear-toolbar-insert-popover')).toBeNull();
  });

  it('BUG-087 gives every icon-only toolbar button an accessible name', () => {
    const root = createReplicaToolbar(jest.fn());
    const unnamed = Array.from(root.querySelectorAll('button')).filter(
      (button) => !button.getAttribute('aria-label') && !button.textContent?.trim(),
    );
    expect(unnamed.map((button) => button.dataset['testid'])).toEqual([]);
    expect(root.querySelector('[data-testid="toolbar-copy"]')?.getAttribute('aria-label')).toBe('Copy');
    expect(root.querySelector('[data-testid="toolbar-cut"]')?.getAttribute('aria-label')).toBe('Cut');
    expect(root.querySelector('[data-testid="toolbar-paste"]')?.getAttribute('aria-label')).toBe('Paste');
    expect(root.querySelector('[data-testid="toolbar-undo"]')?.getAttribute('aria-label')).toBe('Undo');
  });

  it('opens static replica popovers and closes the previous popover', () => {
    const onUnavailableAction = jest.fn();
    const root = createReplicaToolbar(onUnavailableAction);
    document.body.appendChild(root);

    const fontSize = root.querySelector<HTMLElement>('[data-testid="font-size-select"]');
    expect(root.querySelector('[data-testid="toolbar-text-style"]')).toBeNull();
    expect(fontSize?.textContent).toContain('Default');
    fontSize?.click();
    expect(document.querySelectorAll('.sear-toolbar-popover')).toHaveLength(1);
    expect(document.querySelector('[data-testid="toolbar-popover-fontSize"]')?.textContent).toContain('14');
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-fontSize-14"]')?.click();
    expect(fontSize?.textContent).toContain('14');
    expect(document.querySelector('.sear-toolbar-popover')).toBeNull();

    root.querySelector<HTMLElement>('[data-testid="font-color"]')?.click();
    expect(document.querySelector('[data-testid="toolbar-popover-fontColor"]')).not.toBeNull();
    expect(document.querySelectorAll('.sear-toolbar-color-swatch').length).toBeGreaterThan(10);
    document.querySelector<HTMLElement>('[data-testid="toolbar-color-fontColor-Blue"]')?.click();
    expect(document.querySelector('[data-testid="toolbar-popover-fontColor"]')).toBeNull();

    root.querySelector<HTMLElement>('[data-testid="toolbar-freeze"]')?.click();
    expect(document.querySelector('[data-testid="toolbar-popover-freeze"]')).toBeNull();
    expect(onUnavailableAction).toHaveBeenCalled();
  });

  it('marks unavailable validation kinds in the menu and leaves registered kinds selectable', () => {
    const selected = jest.fn();
    const root = createReplicaToolbar(jest.fn(), selected, (label) => label !== 'People');
    document.body.appendChild(root);
    root.querySelector<HTMLElement>('[data-testid="toolbar-dv"]')?.click();
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-dataValidation-setValidation"]')?.click();
    const unavailable = document.querySelector<HTMLElement>(
      '[data-testid="toolbar-menu-item-dataValidation-setValidation-People"]',
    )!;
    expect(unavailable.getAttribute('aria-disabled')).toBe('true');
    expect(unavailable.textContent).toContain('validator unavailable');
    unavailable.click();
    expect(selected).not.toHaveBeenCalled();
    document.querySelector<HTMLElement>(
      '[data-testid="toolbar-menu-item-dataValidation-setValidation-Number"]',
    )?.click();
    expect(selected).toHaveBeenCalledWith('toolbar-dv', 'Number', undefined);
    root.dispatchEvent(new Event('sear-toolbar-destroy'));
  });

  it('closes toolbar popovers on Escape and outside pointer down', () => {
    const root = createReplicaToolbar(jest.fn());
    const grid = document.createElement('div');
    document.body.append(root, grid);
    const format = root.querySelector<HTMLElement>('[data-testid="toolbar-number-format"]');
    format?.click();
    expect(document.querySelector('.sear-toolbar-popovers')).not.toBeNull();

    grid.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(document.querySelector('.sear-toolbar-popovers')).toBeNull();
    expect(format?.getAttribute('aria-expanded')).toBe('false');

    root.querySelector<HTMLElement>('[data-testid="toolbar-more"]')?.click();
    expect(document.querySelector('.sear-toolbar-popovers')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-toolbar-popovers')).toBeNull();
  });

  it('exposes a populated submenu for every configurable number-format category', () => {
    const root = createReplicaToolbar(jest.fn());
    document.body.appendChild(root);
    root.querySelector<HTMLElement>('[data-testid="toolbar-number-format"]')?.click();

    const categories = [
      'number',
      'currency',
      'accounting',
      'date',
      'time',
      'fraction',
      'percent',
      'scientific',
      'special',
      'custom',
    ];
    categories.forEach((category) => {
      document.querySelector<HTMLElement>(`[data-testid="toolbar-menu-item-numberFormat-${category}"]`)?.click();
      expect(document.querySelectorAll('.sear-toolbar-popover[data-depth="1"] .wd3-listitem').length).toBeGreaterThan(
        0,
      );
    });

    expect(document.querySelector('[data-testid="toolbar-menu-item-numberFormat-plain"]')?.textContent).toContain(
      'Text',
    );
    expect(document.querySelector('[data-testid="toolbar-menu-item-numberFormat-more"]')?.textContent).toContain(
      'More number formats',
    );
  });

  it('preserves the active text selection while opening and choosing a font size', () => {
    const root = createReplicaToolbar(jest.fn());
    document.body.appendChild(root);

    const fontSize = root.querySelector<HTMLElement>('[data-testid="font-size-select"]');
    fontSize?.click();
    const sizeItem = document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-fontSize-24"]');
    expect(sizeItem).not.toBeNull();
    expect(sizeItem?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
  });

  it('supports nested static replica menus only after the submenu row is hovered', () => {
    const root = createReplicaToolbar(jest.fn());
    document.body.appendChild(root);

    root.querySelector<HTMLElement>('[data-testid="toolbar-menu"]')?.click();
    expect(document.querySelectorAll('.sear-toolbar-popover')).toHaveLength(1);
    expect(document.querySelector('[data-testid="toolbar-popover-menu"]')?.textContent).toContain('Export');
    expect(document.querySelector('[data-testid="toolbar-popover-menu-export"]')).toBeNull();

    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-menu-export"]')?.click();
    expect(document.querySelectorAll('.sear-toolbar-popover')).toHaveLength(2);
    document.querySelector<HTMLElement>('[data-testid="toolbar-menu-item-menu-export"]')?.click();
    expect(document.querySelectorAll('.sear-toolbar-popover')).toHaveLength(1);

    document
      .querySelector<HTMLElement>('[data-testid="toolbar-menu-item-menu-export"]')
      ?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(document.querySelectorAll('.sear-toolbar-popover')).toHaveLength(2);
    expect(document.querySelector('[data-testid="toolbar-popover-menu-export"]')?.textContent).toContain('Excel');
  });

  it('covers replica-only toolbar control combinations', () => {
    const onUnavailableAction = jest.fn();
    const root = createReplicaToolbarForTesting(
      [
        {
          kind: 'rows',
          rows: [
            [
              {
                kind: 'button',
                icon: '<svg><defs><clipPath id="branch-id"></clipPath></defs><path clip-path="url(#branch-id)"/></svg>',
                menu: true,
                size: 'small',
              },
              { kind: 'select', id: 'test-select', value: 'Branch', width: 64 },
              { kind: 'input-select', value: '12', width: 48 },
              {
                kind: 'button',
                id: 'missing-popover-button',
                icon: '<svg viewBox="0 0 16 16"><path d="M1 1h14v14H1z"/></svg>',
                menu: true,
                popoverKey: 'missing',
                size: 'small',
              },
              {
                kind: 'select',
                id: 'missing-popover-select',
                popoverKey: 'missing',
                value: 'Missing',
                width: 64,
              },
              { kind: 'input-select', id: 'missing-popover-input', popoverKey: 'missing', value: '13', width: 48 },
              {
                kind: 'split',
                id: 'missing-popover-split',
                popoverKey: 'missing',
                icon: '<svg viewBox="0 0 16 16"><path d="M2 2h12v12H2z"/></svg>',
                width: 34,
              },
            ],
          ],
        },
      ],
      onUnavailableAction,
    );

    const smallMenu = root.querySelector('.wd3-toolbar-icon-menu.small');
    expect(smallMenu?.querySelector('.wd3-tb-menu-arrow')).not.toBeNull();
    expect(root.querySelector('[data-testid="test-select"]')?.textContent).toContain('Branch');
    expect(root.querySelector('.wd3-select-input-value')?.textContent).toBe('12');
    expect(root.innerHTML).not.toContain('url(#branch-id)');

    smallMenu?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root.querySelector<HTMLElement>('[data-testid="test-select"]')?.click();
    root.querySelector<HTMLElement>('.wd3-select-input-value')?.click();
    root.querySelector<HTMLElement>('[data-testid="missing-popover-button"]')?.click();
    root.querySelector<HTMLElement>('[data-testid="missing-popover-select"]')?.click();
    root.querySelector<HTMLElement>('[data-testid="missing-popover-input"]')?.click();
    root.querySelector<HTMLElement>('[data-testid="missing-popover-split"]')?.click();
    expect(onUnavailableAction).toHaveBeenCalledTimes(7);
  });
});
