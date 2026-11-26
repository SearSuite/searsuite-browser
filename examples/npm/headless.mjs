import { createHeadlessEditor } from '@searsuite/sear-assembly-headless';
import {
  createEmptySheetDocumentState,
  ExportSheetStateCommand,
  serializeSheetDocumentState,
} from '@searsuite/sear-assembly-setup';
import { GetFormulaCellStatusCommand, waitForFormulaIdle } from '@searsuite/sear-plugin-formula';

const sheetState = createEmptySheetDocumentState(10, 10);
sheetState.sheetData.addItem(0, 0, { type: 'number', value: 21 });
sheetState.sheetData.addItem(1, 0, { type: 'formula', formula: '=A1*2' });

const editor = createHeadlessEditor({ sheetState });
try {
  await waitForFormulaIdle(editor.commands);
  const { status } = editor.commands.run(GetFormulaCellStatusCommand, { row: 1, col: 0 });
  console.log('A2 =', status.result); // 42

  const snapshot = editor.commands.run(ExportSheetStateCommand, undefined).sheetState;
  const json = JSON.stringify(serializeSheetDocumentState(snapshot));
  console.log('Document JSON:', json);
  // Store json in your file/database. Restore with deserializeSheetDocumentState(JSON.parse(json)).
} finally {
  editor.destroy();
}
