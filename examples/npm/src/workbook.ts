import {
  createEmptySheetDocumentState,
  createSheetEditor,
  SheetRuntimeCapability,
} from '@searsuite/sear-assembly-setup';
import {
  createWorkbookEditor,
  WorkbookActiveSheetEditorObservation,
  WorkbookFormulaPlugin,
} from '@searsuite/sear-assembly-workbook';
import { createWorkbookDocumentState } from '@searsuite/sear-domain-workbook';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { createSheetEmbeddedSearCoreEditor } from '@searsuite/sear-plugin-sheet-doc-adapter';
import { SearWebBottomBar } from '@searsuite/sear-plugin-web-sheet-tabbar';
import { createBrowserAdapters } from './browser-host';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const toolbarElement = document.querySelector<HTMLElement>('#toolbar')!;
const formulaBarElement = document.querySelector<HTMLElement>('#formula-bar')!;
const bottomBarElement = document.querySelector<HTMLElement>('#bottom-bar')!;

const first = createEmptySheetDocumentState(1000, 26);
first.sheetData.addItem(0, 0, { type: 'string', value: 'Hello SearSuite' });
first.sheetData.addItem(1, 0, { type: 'number', value: 21 });
first.sheetData.addItem(2, 0, { type: 'formula', formula: '=A2*2' });

const second = createEmptySheetDocumentState(1000, 26);
second.sheetData.addItem(0, 0, { type: 'string', value: 'Second Sheet' });
second.sheetData.addItem(1, 0, { type: 'formula', formula: '=Sheet1!A2*3' });

const workbook = createWorkbookEditor({
  plugins: [WorkbookFormulaPlugin],
  documentState: createWorkbookDocumentState({
    id: 'my-workbook',
    sheets: [
      { id: 'sheet-1', name: 'Sheet1' },
      { id: 'sheet-2', name: 'Sheet2' },
    ],
    sheetStates: { 'sheet-1': first, 'sheet-2': second },
  }),
  viewport: { width: canvas.clientWidth, height: canvas.clientHeight },
  adapters: createBrowserAdapters(canvas),
  sheetEditorFactory: ({ configuration }) => createSheetEditor({
    ...configuration,
    embeddedEditor: createSheetEmbeddedSearCoreEditor(),
  }),
});

function mountSheetChrome() {
  const editor = workbook.sheets.getActiveEditor();
  editor.services.require(SheetRuntimeCapability.Toolbar).mount(toolbarElement);
  editor.services.require(SheetRuntimeCapability.FormulaBar).mount(formulaBarElement);
}

mountSheetChrome();
const unsubscribe = workbook.observations.subscribe(
  WorkbookActiveSheetEditorObservation,
  mountSheetChrome,
);

const bottomBar = new SearWebBottomBar(new BrowserPlatform());
bottomBar.mount(bottomBarElement, {
  workbook: {
    editor: workbook,
    createSheetState: () => createEmptySheetDocumentState(1000, 26),
  },
});

function destroy() {
  unsubscribe();
  bottomBar.destroy();
  workbook.destroy();
}

if (import.meta.hot) {
  import.meta.hot.dispose(destroy);
}
