import { SheetViewCapability } from "@searsuite/sear-assembly-setup";
import { createSheetEditor } from "@searsuite/sear-assembly-setup";
import { createEmptySheetDocumentState } from "@searsuite/sear-assembly-sheet-state";

import { createSheetEmbeddedSearCoreEditor } from "@searsuite/sear-assembly-sheet-doc";
import { createBrowserAdapters } from "./browser-host";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const sheetState = createEmptySheetDocumentState(1000, 26);
sheetState.sheetData.addItem(0, 0, {
  type: "string",
  value: "Hello SearSuite",
});
sheetState.sheetData.addItem(1, 0, { type: "number", value: 21 });
sheetState.sheetData.addItem(2, 0, { type: "formula", formula: "=A2*2" });

const editor = createSheetEditor({
  sheetState,
  viewport: { width: canvas.clientWidth, height: canvas.clientHeight },
  adapters: createBrowserAdapters(canvas),
  embeddedEditor: createSheetEmbeddedSearCoreEditor(),
});

editor.services
  .require(SheetViewCapability.Toolbar)
  .mount(document.querySelector("#toolbar"));
editor.services
  .require(SheetViewCapability.FormulaBar)
  .mount(document.querySelector("#formula-bar"));

function destroy() {
  editor.destroy();
}

if (import.meta.hot) {
  import.meta.hot.dispose(destroy);
}
