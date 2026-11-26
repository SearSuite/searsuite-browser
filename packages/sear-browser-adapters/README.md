# @searsuite/sear-browser-adapters

Browser rendering, input, text shaping and host-service implementations for SearSuite. Version `0.0.1` is available on npm.

See the [complete npm Quickstart](https://searsuite.com/docs/quickstart/#browser-adapters) and [standalone examples](https://github.com/SearSuite/searsuite-browser/tree/main/examples/npm). Their application-owned `src/browser-host.ts` combines these exports into a reusable `createBrowserAdapters(canvas)` helper for Sheet/Workbook. That helper is defined in the example, not exported by this package.

The selected Canvas comes from the corresponding HTML page. Each editor mount creates fresh contexts, and its environment callback binds the Canvas and input event sources to the editor-local container. Individual adapter exports remain available for custom hosts. A `WebSocketTransport` registration supplies a client implementation; connecting a collaboration service is a separate host action.

Repository: [searsuite-browser/packages/sear-browser-adapters](https://github.com/SearSuite/searsuite-browser/tree/main/packages/sear-browser-adapters).

See the [repository README](https://github.com/SearSuite/searsuite-browser#readme) for setup and contribution guidance.
