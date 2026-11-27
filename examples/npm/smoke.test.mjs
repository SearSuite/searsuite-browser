import {
  createEmptySheetDocumentState,
  deserializeSheetDocumentState,
  serializeSheetDocumentState,
} from "@searsuite/sear-assembly-sheet-state";
import assert from "node:assert/strict";
import test from "node:test";
import {
  createHeadlessEditor,
  createHeadlessWorkbookEditor,
} from "@searsuite/sear-assembly-headless";
import { ExportSheetStateCommand } from '@searsuite/sear-assembly-sheet-kernel';
import { deserializeWorkbookDocumentState, serializeWorkbookDocumentState } from '@searsuite/sear-assembly-workbook-kernel';
import {
  ActivateWorkbookSheetCommand,
  WorkbookFormulaPlugin,
} from "@searsuite/sear-assembly-workbook-kernel";
import { createWorkbookDocumentState } from "@searsuite/sear-domain-workbook";
import {
  GetFormulaCellStatusCommand,
  waitForFormulaIdle,
} from "@searsuite/sear-plugin-formula";

function createSheetState() {
  const state = createEmptySheetDocumentState(10, 10);
  state.sheetData.addItem(0, 0, { type: "number", value: 21 });
  state.sheetData.addItem(1, 0, { type: "formula", formula: "=A1*2" });
  return state;
}

async function readFormula(editor, row, col) {
  await waitForFormulaIdle(editor.commands);
  return editor.commands.run(GetFormulaCellStatusCommand, { row, col }).status
    .result;
}

test("published Sheet calculates a formula and can be destroyed twice", async () => {
  const editor = createHeadlessEditor({ sheetState: createSheetState() });
  try {
    assert.equal(await readFormula(editor, 1, 0), 42);
  } finally {
    editor.destroy();
    editor.destroy();
  }
});

test("durable Sheet JSON restores values, formula source and calculation", async () => {
  const editor = createHeadlessEditor({ sheetState: createSheetState() });
  let json;
  try {
    await waitForFormulaIdle(editor.commands);
    const snapshot = editor.commands.run(
      ExportSheetStateCommand,
      undefined
    ).sheetState;
    json = JSON.stringify(serializeSheetDocumentState(snapshot));
  } finally {
    editor.destroy();
  }
  const state = deserializeSheetDocumentState(JSON.parse(json));
  assert.equal(state.sheetData.getItem(0, 0).value, 21);
  assert.equal(state.sheetData.getItem(1, 0).formula, "=A1*2");
  const restored = createHeadlessEditor({ sheetState: state });
  try {
    assert.equal(await readFormula(restored, 1, 0), 42);
  } finally {
    restored.destroy();
  }
});

test("published Workbook preserves cross-Sheet formulas across switching and durable JSON", async () => {
  const first = createSheetState();
  const second = createEmptySheetDocumentState(10, 10);
  second.sheetData.addItem(0, 0, { type: "formula", formula: "=Sheet1!A1*3" });
  const workbook = createHeadlessWorkbookEditor({
    plugins: [WorkbookFormulaPlugin],
    documentState: createWorkbookDocumentState({
      id: "npm-workbook",
      sheets: [
        { id: "one", name: "Sheet1" },
        { id: "two", name: "Sheet2" },
      ],
      sheetStates: { one: first, two: second },
    }),
  });
  let json;
  try {
    workbook.commands.run(ActivateWorkbookSheetCommand, { sheetId: "two" });
    assert.equal(
      await readFormula(workbook.sheets.getActiveEditor(), 0, 0),
      63
    );
    workbook.commands.run(ActivateWorkbookSheetCommand, { sheetId: "one" });
    assert.equal(
      await readFormula(workbook.sheets.getActiveEditor(), 1, 0),
      42
    );
    json = JSON.stringify(
      serializeWorkbookDocumentState(workbook.document.getState())
    );
  } finally {
    workbook.destroy();
    workbook.destroy();
  }
  const restored = createHeadlessWorkbookEditor({
    plugins: [WorkbookFormulaPlugin],
    documentState: deserializeWorkbookDocumentState(JSON.parse(json)),
  });
  try {
    restored.commands.run(ActivateWorkbookSheetCommand, { sheetId: "two" });
    assert.equal(
      await readFormula(restored.sheets.getActiveEditor(), 0, 0),
      63
    );
  } finally {
    restored.destroy();
  }
});
