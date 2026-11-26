import type { SheetEditorAdapters } from '@searsuite/sear-assembly-setup';
import {
  BrowserPlatform,
  WebCanvasRenderContext,
  WebCursorEngine,
  WebEventRegistrar,
  WebKeyboardRouter,
  WebPointerCapture,
  WebScroller,
  WebSocketTransport,
  WebTextInput,
} from '@searsuite/sear-browser-adapters';
import {
  SearWebToolbar,
  WebFormulaBar,
  WebSheetAdapterDefaults,
} from '@searsuite/sear-plugin-web-toolbar';
import { Scroller } from '@searsuite/sear-render-scroll';

// This helper belongs to the application. All imported APIs exist in npm 0.0.1.
export function createBrowserAdapters(canvas: HTMLCanvasElement): SheetEditorAdapters {
  return {
    ...WebSheetAdapterDefaults,
    platform: BrowserPlatform,
    createRenderContexts() {
      const context = new WebCanvasRenderContext(canvas, false, new BrowserPlatform());
      return {
        renderContext: context,
        offScreenRenderContext: context.cloneNode(),
        hitRenderContext: context.createHitNode(),
      };
    },
    scroller: WebScroller,
    eventRegistrar: WebEventRegistrar,
    textInput: WebTextInput,
    keyboardRouter: WebKeyboardRouter,
    pointerCapture: WebPointerCapture,
    cursorEngine: WebCursorEngine,
    collabTransport: WebSocketTransport,
    toolbar: SearWebToolbar,
    formulaBar: WebFormulaBar,
    registerEnvironment(container) {
      container.registerInstance(Scroller.ContainerSymbol, canvas);
      container.registerInstance(WebKeyboardRouter.eventTargetSymbol, canvas.ownerDocument);
      container.registerInstance(WebPointerCapture.eventTargetSymbol, canvas.ownerDocument);
    },
  };
}
