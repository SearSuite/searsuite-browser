import { SearError } from '@searsuite/sear-foundation-error';
import { SearCoreSheet } from '@searsuite/sear-assembly-core';
import {
  ClearRangeContentsCommand,
  DeleteColumnCommand,
  DeleteRowCommand,
  InsertColumnCommand,
  InsertRowCommand,
  registerSheetRangeCommands,
  registerSheetStructureCommands,
  SheetCommandBus,
  type SheetCommandDefinition,
  type SheetRangeCommandDataSource,
  type SheetStructureCommandDataSource,
} from '@searsuite/sear-assembly-commands';
import {
  HideSheetColumnsCommand,
  HideSheetRowsCommand,
  ResizeSheetColumnsCommand,
  ResizeSheetRowsCommand,
  UnhideSheetColumnsCommand,
  UnhideSheetRowsCommand,
  registerSheetResizeDimensionCommands,
  readSheetColumnHiddenOriginalSizes,
  readSheetColumnSizes,
  readSheetRowHiddenOriginalSizes,
  SheetResizePlugin,
  type SheetResizeDimensionCommandDataSource,
} from '@searsuite/sear-plugin-resize';
import { SheetDataPlugin } from '@searsuite/sear-plugin-sheet-data';
import {
  readDenseColumn,
  readDenseRow,
  readSheetDataMatrix,
  readSheetRawRowSizes,
  type SheetMatrix,
  type CellMatrixElement,
} from '@searsuite/sear-domain-sheet';

const resizeCommands: readonly SheetCommandDefinition<unknown>[] = [
  ResizeSheetRowsCommand,
  ResizeSheetColumnsCommand,
  HideSheetRowsCommand,
  HideSheetColumnsCommand,
  UnhideSheetRowsCommand,
  UnhideSheetColumnsCommand,
];

const structureCommands: readonly SheetCommandDefinition<unknown>[] = [
  InsertRowCommand,
  InsertColumnCommand,
  DeleteRowCommand,
  DeleteColumnCommand,
];

const rangeCommands: readonly SheetCommandDefinition<unknown>[] = [ClearRangeContentsCommand];

/** Registers official sheet commands needed by web toolbar hosts. */
export function registerSheetToolbarCommands(commands: SheetCommandBus, core: SearCoreSheet): void {
  registerSheetRangeCommands(commands, createToolbarRangeCommandDataSource(core));
}

/** Ensures web toolbar hosts receive the official sheet command surface. */
export function ensureSheetToolbarCommands(commands: SheetCommandBus, core: SearCoreSheet): void {
  ensureCommandGroup(
    commands,
    structureCommands,
    function registerMissingSheetStructureCommands() {
      registerSheetStructureCommands(commands, createToolbarStructureCommandDataSource(core));
    },
    'Sheet structure command registry is only partially registered.'
  );
  ensureCommandGroup(
    commands,
    resizeCommands,
    function registerMissingSheetResizeCommands() {
      registerSheetResizeDimensionCommands(commands, createToolbarResizeCommandDataSource(core));
    },
    'Sheet resize command registry is only partially registered.'
  );
  ensureCommandGroup(
    commands,
    rangeCommands,
    function registerMissingSheetRangeCommands() {
      registerSheetToolbarCommands(commands, core);
    },
    'Sheet range command registry is only partially registered.'
  );
}

function ensureCommandGroup(
  commands: SheetCommandBus,
  definitions: readonly SheetCommandDefinition<unknown>[],
  register: () => void,
  partialMessage: string
): void {
  const registeredCount = definitions.filter((definition) => commands.has(definition)).length;
  if (registeredCount === definitions.length) return;
  if (registeredCount !== 0) throw new SearError(partialMessage);
  register();
}

function createToolbarRangeCommandDataSource(core: SearCoreSheet): SheetRangeCommandDataSource<CellMatrixElement> {
  return {
    target: SheetDataPlugin.pluginKey,
    getRowCount(): number {
      return readRequiredSheetDataMatrix(core).shape[0];
    },
    getColumnCount(): number {
      return readRequiredSheetDataMatrix(core).shape[1];
    },
    readCell(row: number, column: number): CellMatrixElement | null {
      return readRequiredSheetDataMatrix(core).getItem(row, column);
    },
  };
}

function createToolbarResizeCommandDataSource(core: SearCoreSheet): SheetResizeDimensionCommandDataSource {
  return {
    target: SheetResizePlugin.pluginKey,
    getRowCount(): number {
      return readRequiredRowSizes(core).shape[1];
    },
    getColumnCount(): number {
      return readRequiredColumnSizes(core).shape[1];
    },
    getDefaultRowSize(): number {
      return readDimensionDefault(readRequiredRowSizes(core), 24);
    },
    getDefaultColumnSize(): number {
      return readDimensionDefault(readRequiredColumnSizes(core), 80);
    },
    readRowSize(index: number): number {
      const rowSizes = readRequiredRowSizes(core);
      return rowSizes.getItem(0, index) ?? readDimensionDefault(rowSizes, 24);
    },
    readColumnSize(index: number): number {
      const columnSizes = readRequiredColumnSizes(core);
      return columnSizes.getItem(0, index) ?? readDimensionDefault(columnSizes, 80);
    },
    readRowHiddenOriginalSize(index: number): number | null {
      return readRequiredRowHiddenOriginalSizes(core).getItem(0, index);
    },
    readColumnHiddenOriginalSize(index: number): number | null {
      return readRequiredColumnHiddenOriginalSizes(core).getItem(0, index);
    },
  };
}

function readDimensionDefault(matrix: { getDefaultValue?: () => number | undefined }, fallback: number): number {
  return matrix.getDefaultValue?.() ?? fallback;
}

function createToolbarStructureCommandDataSource(
  core: SearCoreSheet
): SheetStructureCommandDataSource<CellMatrixElement> {
  return {
    target: SheetDataPlugin.pluginKey,
    getRowCount(): number {
      return readRequiredSheetDataMatrix(core).shape[0];
    },
    getColumnCount(): number {
      return readRequiredSheetDataMatrix(core).shape[1];
    },
    readRow(index: number): Array<CellMatrixElement | null> {
      return readDenseRow(readRequiredSheetDataMatrix(core), index);
    },
    readColumn(index: number): Array<CellMatrixElement | null> {
      return readDenseColumn(readRequiredSheetDataMatrix(core), index);
    },
  };
}

function readRequiredSheetDataMatrix(core: SearCoreSheet): SheetMatrix {
  const sheetData = readSheetDataMatrix(core.getDataEngine());
  if (!sheetData) throw new SearError('Sheet toolbar command cannot read SheetDataPlugin matrix.');
  return sheetData;
}

function readRequiredRowSizes(core: SearCoreSheet): NonNullable<ReturnType<typeof readSheetRawRowSizes>> {
  const rowSizes = readSheetRawRowSizes(core.getDataEngine());
  if (!rowSizes) throw new SearError('Sheet toolbar resize command cannot read row sizes.');
  return rowSizes;
}

function readRequiredColumnSizes(core: SearCoreSheet): NonNullable<ReturnType<typeof readSheetColumnSizes>> {
  const columnSizes = readSheetColumnSizes(core.getDataEngine());
  if (!columnSizes) throw new SearError('Sheet toolbar resize command cannot read column sizes.');
  return columnSizes;
}

function readRequiredRowHiddenOriginalSizes(
  core: SearCoreSheet
): NonNullable<ReturnType<typeof readSheetRowHiddenOriginalSizes>> {
  const rowHiddenOriginalSizes = readSheetRowHiddenOriginalSizes(core.getDataEngine());
  if (!rowHiddenOriginalSizes) throw new SearError('Sheet toolbar resize command cannot read hidden row sizes.');
  return rowHiddenOriginalSizes;
}

function readRequiredColumnHiddenOriginalSizes(
  core: SearCoreSheet
): NonNullable<ReturnType<typeof readSheetColumnHiddenOriginalSizes>> {
  const columnHiddenOriginalSizes = readSheetColumnHiddenOriginalSizes(core.getDataEngine());
  if (!columnHiddenOriginalSizes) throw new SearError('Sheet toolbar resize command cannot read hidden column sizes.');
  return columnHiddenOriginalSizes;
}
