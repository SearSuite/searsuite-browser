import { type Pipeline, type SearCoreSheet } from '@searsuite/sear-assembly-core';
import {
  ClearRangeContentsCommand,
  DeleteColumnCommand,
  DeleteRowCommand,
  InsertColumnCommand,
  InsertRowCommand,
  SheetCommandBus,
  TransactionPipelineCommand,
} from '@searsuite/sear-assembly-commands';
import {
  CellMergeMatrix,
  MergeCellsCommand,
  SheetCellMergePlugin,
  ToggleMergeCellsCommand,
  UnmergeCellsCommand,
} from '@searsuite/sear-plugin-cell-merge';
import { SheetDataFieldNamespace, SheetDataMatrixFieldKey, SheetDataPlugin } from '@searsuite/sear-render-engine';
import {
  AlignmentMatrix,
  SetRangeAlignmentCommand,
  SetRangeVerticalAlignmentCommand,
  SheetAlignmentPlugin,
  SheetHorizontalAlignment,
  SheetHorizontalAlignmentFieldKey,
  SheetVerticalAlignmentPlugin,
  SheetVerticalAlignmentFieldKey,
  VerticalAlignmentMatrix,
} from '@searsuite/sear-plugin-alignment';
import {
  CellFillMatrix,
  SheetCellFillFieldKey,
  SheetCellFillPlugin,
  SetRangeCellFillCommand,
} from '@searsuite/sear-plugin-cell-fill';
import {
  HideSheetColumnsCommand,
  HideSheetRowsCommand,
  ResizeSheetColumnsCommand,
  ResizeSheetRowsCommand,
  UnhideSheetColumnsCommand,
  UnhideSheetRowsCommand,
} from '@searsuite/sear-plugin-resize';
import { MatrixOTActionName } from '@searsuite/sear-domain-ot';
import * as toolbarExports from '../src';
import { ensureSheetToolbarCommands, registerSheetToolbarCommands } from '../src/SheetToolbarCommands';

function createRegisteredToolbarCommands(core: SearCoreSheet): SheetCommandBus {
  const commands = new SheetCommandBus();
  commands.bind({
    executePipeline: core.executePipeline.bind(core),
    applyEffect: () => void 0,
  });
  for (const plugin of core.pluginManager?.getAllPlugins?.() ?? []) {
    if (
      plugin instanceof SheetAlignmentPlugin ||
      plugin instanceof SheetVerticalAlignmentPlugin ||
      plugin instanceof SheetCellFillPlugin ||
      plugin instanceof SheetCellMergePlugin
    ) {
      plugin.registerCommands(commands);
    }
  }
  ensureSheetToolbarCommands(commands, core);
  return commands;
}

function createMatrix<T>(shape: [number, number], values = new Map<string, T>()) {
  return {
    shape,
    getItem: (row: number, column: number): T | null => values.get(`${row}:${column}`) ?? null,
  };
}

describe('SheetToolbarCommands', () => {
  it('keeps toolbar exports limited to command registration adapters', () => {
    expect([toolbarExports.ensureSheetToolbarCommands, toolbarExports.registerSheetToolbarCommands]).not.toContain(
      void 0,
    );
    expect([
      (toolbarExports as Record<string, unknown>)['ClearRangeContentsCommand'],
      (toolbarExports as Record<string, unknown>)['SetRangeAlignmentCommand'],
      (toolbarExports as Record<string, unknown>)['ToggleMergeCellsCommand'],
    ]).toEqual([void 0, void 0, void 0]);
  });

  it('uses the assembly command package as the row and column structure command surface', () => {
    expect([DeleteColumnCommand, DeleteRowCommand, InsertColumnCommand, InsertRowCommand].map(({ id }) => id)).toEqual([
      'sheet.deleteColumns',
      'sheet.deleteRows',
      'sheet.insertColumns',
      'sheet.insertRows',
    ]);
    expect([
      (toolbarExports as Record<string, unknown>)['DeleteSheetColumnsCommand'],
      (toolbarExports as Record<string, unknown>)['DeleteSheetRowsCommand'],
      (toolbarExports as Record<string, unknown>)['InsertSheetColumnsCommand'],
      (toolbarExports as Record<string, unknown>)['InsertSheetRowsCommand'],
    ]).toEqual([void 0, void 0, void 0, void 0]);
  });

  it('uses the resize plugin package as the row and column dimension command surface', () => {
    expect(
      [
        HideSheetColumnsCommand,
        HideSheetRowsCommand,
        ResizeSheetColumnsCommand,
        ResizeSheetRowsCommand,
        UnhideSheetColumnsCommand,
        UnhideSheetRowsCommand,
      ].map(({ id }) => id),
    ).toEqual([
      'sheet.hideColumns',
      'sheet.hideRows',
      'sheet.resizeColumns',
      'sheet.resizeRows',
      'sheet.unhideColumns',
      'sheet.unhideRows',
    ]);
    expect([
      (toolbarExports as Record<string, unknown>)['HideSheetColumnsCommand'],
      (toolbarExports as Record<string, unknown>)['HideSheetRowsCommand'],
      (toolbarExports as Record<string, unknown>)['ResizeSheetColumnsCommand'],
      (toolbarExports as Record<string, unknown>)['ResizeSheetRowsCommand'],
      (toolbarExports as Record<string, unknown>)['UnhideSheetColumnsCommand'],
      (toolbarExports as Record<string, unknown>)['UnhideSheetRowsCommand'],
    ]).toEqual([void 0, void 0, void 0, void 0, void 0, void 0]);
  });

  it('uses feature-owned packages as the formal range command surface', () => {
    expect(
      [
        ClearRangeContentsCommand,
        SetRangeAlignmentCommand,
        SetRangeCellFillCommand,
        SetRangeVerticalAlignmentCommand,
        MergeCellsCommand,
        ToggleMergeCellsCommand,
        UnmergeCellsCommand,
      ].map(({ id }) => id),
    ).toEqual([
      'range.clearContents',
      'range.setAlignment',
      'range.setCellFill',
      'range.setVerticalAlignment',
      'range.mergeCells',
      'range.toggleMergeCells',
      'range.unmergeCells',
    ]);
  });

  it('rejects a partially registered range command surface', () => {
    const commands = new SheetCommandBus();
    commands.register(
      ClearRangeContentsCommand,
      (input) => new TransactionPipelineCommand(ClearRangeContentsCommand.id, { operations: [], input } as never),
    );

    expect(() => ensureSheetToolbarCommands(commands, {} as SearCoreSheet)).not.toThrow();
  });

  it('registers standalone toolbar range commands against the supplied core data', () => {
    const executePipeline = jest.fn();
    const sheetData = createMatrix(
      [3, 3],
      new Map([
        ['0:0', { type: 'text', value: 'A1' }],
        ['1:1', { type: 'text', value: 'B2' }],
      ]),
    );
    const cellAlignments = new AlignmentMatrix(void 0, [3, 3]);
    cellAlignments.addItem(0, 0, SheetHorizontalAlignment.Right);
    const cellVerticalAlignments = new VerticalAlignmentMatrix(void 0, [3, 3]);
    const alignmentPlugin = new SheetAlignmentPlugin({ cellAlignments });
    const verticalAlignmentPlugin = new SheetVerticalAlignmentPlugin({ cellVerticalAlignments });
    const cellFills = new CellFillMatrix(void 0, [3, 3]);
    const cellFillPlugin = new SheetCellFillPlugin({ cellFills });
    const cellMerges = new CellMergeMatrix(void 0, [3, 3]);
    cellMerges.setItem(1, 1, { endRow: 2, endColumn: 2 });
    const mergePlugin = new SheetCellMergePlugin(
      { cellMerges },
      {
        target: SheetDataPlugin.pluginKey,
        readCell: (row, column) => sheetData.getItem(row, column),
      },
    );
    const core = {
      getDataEngine: () => ({
        readDataViewField: (viewKey: string, fieldKey: string) => {
          if (viewKey !== SheetDataFieldNamespace) return void 0;
          if (fieldKey === SheetDataMatrixFieldKey) return sheetData;
          if (fieldKey === SheetHorizontalAlignmentFieldKey) return cellAlignments;
          if (fieldKey === SheetVerticalAlignmentFieldKey) return cellVerticalAlignments;
          if (fieldKey === SheetCellFillFieldKey) return cellFills;
          return void 0;
        },
        getDataType: (key: unknown) => {
          if (key === SheetDataPlugin.pluginKey) return { sheetData };
          if (key === SheetAlignmentPlugin.pluginKey) return { cellAlignments };
          if (key === SheetCellMergePlugin.pluginKey) return mergePlugin.getState();
          return void 0;
        },
      }),
      pluginManager: {
        getAllPlugins: () => [alignmentPlugin, verticalAlignmentPlugin, cellFillPlugin, mergePlugin],
      },
      executePipeline,
    } as unknown as SearCoreSheet;
    const commands = createRegisteredToolbarCommands(core);

    commands.run(ClearRangeContentsCommand, { anchor: [0, 0], focus: [1, 1] });
    commands.run(SetRangeAlignmentCommand, {
      anchor: [0, 0],
      focus: [0, 0],
      alignment: SheetHorizontalAlignment.Left,
    });
    commands.run(SetRangeCellFillCommand, {
      anchor: [0, 0],
      focus: [0, 0],
      fill: '#e6f0ff',
    });
    commands.run(ToggleMergeCellsCommand, { anchor: [2, 2], focus: [1, 1] });

    expect(commands.getRegisteredCommandIds()).toEqual([
      'range.clearContents',
      'range.mergeCells',
      'range.setAlignment',
      'range.setCellFill',
      'range.setVerticalAlignment',
      'range.toggleMergeCells',
      'range.unmergeCells',
      'sheet.deleteColumns',
      'sheet.deleteRows',
      'sheet.hideColumns',
      'sheet.hideRows',
      'sheet.insertColumns',
      'sheet.insertRows',
      'sheet.moveColumns',
      'sheet.moveRows',
      'sheet.resizeColumns',
      'sheet.resizeRows',
      'sheet.unhideColumns',
      'sheet.unhideRows',
    ]);
    const clearPipeline = executePipeline.mock.calls[0]?.[0] as Pipeline;
    expect(clearPipeline.steps[0]?.transaction?.pluginKey).toBe(SheetDataPlugin.pluginKey);
    expect(clearPipeline.steps[0]?.transaction?.operations).toEqual([
      { p: [0, 0], [MatrixOTActionName.UpdateCell]: { value: null, prev: { type: 'text', value: 'A1' } } },
      { p: [1, 1], [MatrixOTActionName.UpdateCell]: { value: null, prev: { type: 'text', value: 'B2' } } },
    ]);
    const alignmentPipeline = executePipeline.mock.calls[1]?.[0] as Pipeline;
    expect(alignmentPipeline.steps[0]?.transaction?.pluginKey).toBe(SheetAlignmentPlugin.pluginKey);
    expect(alignmentPipeline.steps[0]?.transaction?.operations).toEqual([
      { p: [0, 0], [MatrixOTActionName.UpdateCell]: { value: null, prev: 'right' } },
    ]);
    const fillPipeline = executePipeline.mock.calls[2]?.[0] as Pipeline;
    expect(fillPipeline.steps[0]?.transaction?.pluginKey).toBe(SheetCellFillPlugin.pluginKey);
    expect(fillPipeline.steps[0]?.transaction?.operations).toEqual([
      { p: [0, 0], [MatrixOTActionName.UpdateCell]: { value: '#e6f0ff', prev: null } },
    ]);
    const mergePipeline = executePipeline.mock.calls[3]?.[0] as Pipeline;
    expect(mergePipeline.steps[0]?.transaction?.pluginKey).toBe(SheetCellMergePlugin.pluginKey);
    expect(mergePipeline.steps[0]?.transaction?.operations).toEqual([
      {
        p: [1, 1],
        uc: { value: null, prev: { endRow: 2, endColumn: 2 } },
      },
    ]);
  });
});
