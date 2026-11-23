import {
  WebFetchServiceClient,
  WebFileDownload,
  WebUserInteractionService,
  WebXmlDocumentParser,
  WebXmlXPathEngine,
  createWebTextShaperContext,
  WebTextShaper,
} from '@searsuite/sear-browser-adapters';
import { type RenderContext } from '@searsuite/sear-render-context';
import { WebSheetClipboard } from './WebSheetClipboard';

/** Web implementations supplied by a Sheet host at its composition root. */
export const WebSheetAdapterDefaults = {
  fileDownload: WebFileDownload,
  createTextShaper: (context: RenderContext) => new WebTextShaper(createWebTextShaperContext(context)),
  clipboard: WebSheetClipboard,
  userInteraction: WebUserInteractionService,
  xmlDocumentParser: WebXmlDocumentParser,
  xmlXPathEngine: WebXmlXPathEngine,
  webServiceClient: WebFetchServiceClient,
} as const;
