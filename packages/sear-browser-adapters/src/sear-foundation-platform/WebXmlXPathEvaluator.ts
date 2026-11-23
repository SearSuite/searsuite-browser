import { Injectable } from '@searsuite/sear-foundation-di';
import { WebXmlDocumentParser } from './WebXmlDocumentParser';
import { WebXmlXPathEngine } from './WebXmlXPathEngine';
import { XmlXPathEvaluator } from '@searsuite/sear-foundation-platform';

/** Browser-native XML/XPath evaluator for standalone use. */
@Injectable()
export class WebXmlXPathEvaluator extends XmlXPathEvaluator {
  public static readonly symbol: symbol = Symbol.for('WebXmlXPathEvaluator');

  public constructor() {
    super(new WebXmlDocumentParser(), new WebXmlXPathEngine());
  }
}
