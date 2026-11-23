/** Browser implementations of SearSuite platform, rendering, input, text, and transport contracts.
 * @packageDocumentation
 */

export { BrowserPlatform } from './sear-foundation-platform/BrowserPlatform';
export { WebXmlDocumentParser } from './sear-foundation-platform/WebXmlDocumentParser';
export { WebXmlXPathEngine } from './sear-foundation-platform/WebXmlXPathEngine';
export { WebXmlXPathEvaluator } from './sear-foundation-platform/WebXmlXPathEvaluator';
export { WebFetchServiceClient } from './sear-foundation-platform/WebFetchServiceClient';
export { WebFileDownload } from './sear-foundation-platform/WebFileDownload';
export { WebUserInteractionService } from './sear-foundation-user-interaction/WebUserInteractionService';

export { WebRenderContext } from './sear-render-context/WebRenderContext';
export { WebSvgRenderContext } from './sear-render-context/WebSvgRenderContext';
export { WebCanvasRenderContext } from './sear-render-context/WebCanvasRenderContext';
export { WebWebGLRenderContext } from './sear-render-context/WebWebGLRenderContext';
export { WebOffScreenCanvasRenderContext } from './sear-render-context/WebOffScreenCanvasRenderContext';
export { WebHitCanvasRenderContext } from './sear-render-context/WebHitCanvasRenderContext';
export { WebCursorEngine } from './sear-render-cursor/WebCursorEngine';
export { WebEventRegistrar } from './sear-render-event-engine/WebEventRegistrar';
export { WebKeyboardRouter } from './sear-render-input/WebKeyboardRouter';
export { WebPointerCapture } from './sear-render-input/WebPointerCapture';
export { WebTextInput } from './sear-render-input/WebTextInput';
export { WebTextShaper } from './sear-render-metrics/WebTextShaper';
export { createWebTextShaperContext, type WebTextShaperContext } from './sear-render-metrics/WebTextShaperContext';
export { WebTextShaperError } from './sear-render-metrics/WebTextShaperError';
export { WebScroller } from './sear-render-scroll/WebScroller';
export { WebSocketTransport } from './sear-plugin-collab/WebSocketTransport';
