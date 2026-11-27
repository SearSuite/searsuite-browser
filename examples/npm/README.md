# SearSuite npm examples

Run a Sheet, a multi-Sheet Workbook and a Node.js Headless editor using registry packages. This directory is a standalone npm application with no workspace dependencies, source aliases or library patches. Node.js 22.12 or later is required.

## Run

Copy this directory anywhere outside the source workspaces, or download it from the public repository:

```sh
npx degit SearSuite/searsuite-browser/examples/npm my-searsuite-app
cd my-searsuite-app
npm install
npm run dev
```

Open the URL printed by Vite with the path for the editor you want:

| Editor | Path / command | Expected result |
| --- | --- | --- |
| Workbook | `/` | Two Sheets, toolbar, formula bar and Sheet tabs. Sheet1 A3 is 42; Sheet2 A2 is 63. |
| Sheet | `/sheet.html` | One Sheet with a toolbar and formula bar. A2 is 21; A3 is 42. |
| Headless | `npm run headless` | Prints `A2 = 42` and a durable Sheet JSON payload, then destroys the editor. |

In the Workbook, change Sheet1 A2 to 42. Sheet1 A3 becomes 84; switch to Sheet2 and A2 becomes 126. Switch back, undo the edit and check that the results return to 42 and 63. The add button creates another Sheet.

```sh
npm run build
npm run preview
npm test
```

The build checks strict TypeScript and builds both browser pages. The Node tests verify formula results, Sheet/Workbook JSON restoration, cross-Sheet references, switching and repeated destruction. Browser input, rendering and toolbar behavior require opening the pages; the Node tests do not validate those interactions.

## Files and adapters

| File | Responsibility |
| --- | --- |
| `src/browser-host.ts` | Shared application helpers for Canvas rendering, browser input and host services. |
| `src/sheet.ts` | One Sheet, rich-text cell editing, toolbar and formula bar. |
| `src/workbook.ts` | Workbook state, cross-Sheet formulas, active-Sheet toolbar remount and tabs. |
| `headless.mjs` | Node-only Sheet calculation and durable JSON serialization. |

`createBrowserAdapters(canvas)` is an **application helper in this example**, not an npm package export. Its `canvas` argument comes from `document.querySelector<HTMLCanvasElement>('#canvas')` in the corresponding entry file. The HTML page creates that Canvas and gives it a visible CSS size. Copy `browser-host.ts` once into your application and reuse the helper for its editor views.

Each render factory creates fresh contexts when the editor mounts. Change adapter properties or extend `registerEnvironment` in this file when your host needs custom input or services. Core contracts remain unchanged.

## Plugins and lifecycle

- `createSheetEditor` installs its default Sheet feature bundle. `createSheetEmbeddedSearCoreEditor()` explicitly adds rich-text cell editing.
- Workbook history is already installed by `createWorkbookEditor`. Do not add `WorkbookHistoryPlugin` a second time.
- Cross-Sheet calculation requires the explicit `plugins: [WorkbookFormulaPlugin]` option.
- Workbook `plugins` extend the Workbook; `sheetPlugins` extend each mounted Sheet. A Workbook mounts a new Sheet editor on a Sheet switch, so the example subscribes to `WorkbookActiveSheetEditorObservation` to remount the toolbar and formula bar.
- The Workbook owns its Sheet editors. Destroy the host subscription and bottom bar, then call `workbook.destroy()`; do not destroy its active Sheet independently.
- Each browser entry defines `destroy()` and registers it with Vite HMR. Call the same cleanup from your framework's unmount hook. HMR is not a substitute for framework lifecycle cleanup.

## Persistence and collaboration

These browser pages keep changes in memory; reloading resets the seed data. `ExportSheetStateCommand` and `ExportWorkbookStateCommand` return runtime snapshots for in-memory use, not a durable file format. For Sheet/Workbook persistence, pass document state through `serializeSheetDocumentState` / `serializeWorkbookDocumentState`, then `JSON.stringify`. Restore using the matching `deserialize*DocumentState` function before creating a new editor. Host code owns file/database storage. Extra state-owning plugins must contribute their document codecs; the default serializer is not a guarantee that arbitrary plugin state will be saved.

Registering `WebSocketTransport` only supplies a client adapter. These examples do not connect to a collaboration service. HTTP-backed formula services also require host-managed data loading; no network-backed formula provider is configured here.

This example pins the coordinated `0.0.2` release set, including the independent Sheet state, Sheet kernel and Workbook kernel packages. Use matching versions when copying the integration into an application.

## Maintaining the examples

From the Browser repository root, run `pnpm run check:examples:npm`. It copies this directory to a fresh temporary location, installs the pinned registry releases and records their lockfile, checks SearSuite package origins, compiles all browser entries and runs the Node checks. It never builds or links sibling packages. Add `--keep` when invoking `node scripts/check-npm-examples.mjs` to retain the independent consumer for browser review.

The Website Quickstart embeds these source files using `data-example` code blocks. Run `pnpm --dir ../searsuite-website generate:quickstart` after editing an example and review the updated Website template. The [online Quickstart](https://searsuite.com/docs/quickstart/) also describes how to create the application manually.
