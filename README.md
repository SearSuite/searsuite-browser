# SearSuite Browser

Browser implementations of the platform-neutral SearSuite contracts. Keep this repository beside `searsuite` when developing locally.

## Use the npm release

All four Browser packages have `0.0.1` available on npm. Application users can follow the [npm Quickstart](https://searsuite.com/docs/quickstart/) without checking out the source workspaces.

The [standalone npm examples](examples/npm/README.md) provide Sheet, Workbook and Node.js Headless entries with a registry lockfile. Copy `examples/npm` to an application directory, run `npm ci`, then `npm run dev`. Open `/` for Workbook or `/sheet.html` for one Sheet. Run `npm run headless` for Node.

The examples' `src/browser-host.ts` defines an application-owned `createBrowserAdapters(canvas)` helper. It reuses published adapters and keeps environment wiring out of the editor entries; it is not a new package export. Each entry shows toolbar ownership and teardown. The [Quickstart](https://searsuite.com/docs/quickstart/#browser-adapters) embeds the same files.

Maintainers can run `pnpm run check:examples:npm` here to install and verify the examples in a fresh temporary consumer, using only npm archives. This check does not build or link sibling source packages.

## Packages

- `sear-browser-adapters` implements browser timing and view geometry, native Fetch and XML/XPath, file download, user interaction, WebSocket transport, Canvas/SVG/WebGL rendering, pointer and keyboard input, text shaping, cursor, events, and scrolling.
- `sear-plugin-web-toolbar` provides Sheet controls, menus, dialogs, the formula bar, clipboard integration, and browser adapter defaults.
- `sear-plugin-web-doc-toolbar` provides Doc toolbar controls.
- `sear-plugin-web-sheet-tabbar` provides Workbook tabs and status controls.

The core repository owns state, commands, rendering contracts, and host-neutral calculations. Browser classes implement those contracts here; application hosts select and inject the adapters during editor creation.

## Contract boundary

| Core package | Browser implementation in `sear-browser-adapters` | Retained in core |
| --- | --- | --- |
| `sear-foundation-platform` | `BrowserPlatform`, browser Fetch, file download, XML parsing and XPath | `Platform`, service, file and XML contracts and unavailable fallbacks |
| `sear-foundation-user-interaction` | `WebUserInteractionService` | Interaction service contract |
| `sear-plugin-collab` | `WebSocketTransport` | Collaboration protocol and transport contract |
| `sear-render-context` | Canvas, SVG and WebGL contexts, hit canvas, off-screen canvas and WebGL helpers | Render context contract and nonvisual contexts |
| `sear-render-cursor` | `WebCursorEngine` | Cursor engine contract |
| `sear-render-event-engine` | `WebEventRegistrar` | Event registration contract |
| `sear-render-input` | `WebKeyboardRouter`, `WebPointerCapture`, `WebTextInput` | Input contracts and nonvisual implementations |
| `sear-render-metrics` | `WebTextShaper` and browser text-shaping helpers | `TextShaper` contract and render-context-backed fallback |
| `sear-render-scroll` | `WebScroller` | `Scroller`, logical scroll, axis lock and rubber-band calculation |

The three `sear-plugin-web-*` packages above live entirely in this repository. `searsuite` owns the Node platform and Fetch adapters plus the headless Sheet/Workbook assembly.

## Development

Use Node.js 22 and pnpm 9.11:

```bash
pnpm --dir ../searsuite install
pnpm install
pnpm build
pnpm test
```

The [standalone npm examples](examples/npm/README.md) show how applications assemble these packages into browser hosts.

## Repository

Repository: [searsuite-browser](https://github.com/SearSuite/searsuite-browser).

## Community and releases

See [Contributing](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md), [Support and maintainers](SUPPORT.md), the [Changelog](CHANGELOG.md), and [Versioning and compatibility](VERSIONING.md).
