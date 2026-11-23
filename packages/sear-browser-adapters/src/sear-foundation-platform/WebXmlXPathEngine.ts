import { Injectable } from '@searsuite/sear-foundation-di';
import { XmlXPathEngine } from '@searsuite/sear-foundation-platform';
import { XmlXPathError, XmlXPathErrorCode } from '@searsuite/sear-foundation-platform';
import { type XmlXPathEvaluation, type XmlXPathOptions } from '@searsuite/sear-foundation-platform';

/** Browser XPath engine backed by the native XPathEvaluator. */
@Injectable()
export class WebXmlXPathEngine extends XmlXPathEngine {
  public static readonly symbol: symbol = Symbol.for('WebXmlXPathEngine');

  public evaluate(document: unknown, xpath: string, options: XmlXPathOptions): XmlXPathEvaluation {
    const resolveNamespace = (prefix: string | null) => (prefix === null ? null : options.namespaces?.[prefix] ?? null);
    let result: XPathResult;
    const engine = new XPathEvaluator();
    try {
      result = engine.evaluate(xpath, document as Document, resolveNamespace, XPathResult.ANY_TYPE, null);
      if (
        result.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE ||
        result.resultType === XPathResult.ORDERED_NODE_ITERATOR_TYPE
      ) {
        result = engine.evaluate(
          xpath,
          document as Document,
          resolveNamespace,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );
      }
    } catch (error) {
      throw new XmlXPathError(XmlXPathErrorCode.InvalidXPath, 'XPath expression could not be evaluated.', {
        xpath,
        cause: error,
      });
    }

    switch (result.resultType) {
      case XPathResult.STRING_TYPE:
        return { values: [result.stringValue] };
      case XPathResult.NUMBER_TYPE:
        return { values: [String(result.numberValue)] };
      case XPathResult.BOOLEAN_TYPE:
        return { values: [String(result.booleanValue)] };
      case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: {
        const values: string[] = [];
        for (let index = 0; index < result.snapshotLength; index++) {
          const node = result.snapshotItem(index);
          if (node) {
            const textNode = node.nodeType === Node.DOCUMENT_NODE ? (node as Document).documentElement : node;
            values.push(node.nodeType === Node.ATTRIBUTE_NODE ? node.nodeValue ?? '' : textNode.textContent ?? '');
          }
        }
        return { values };
      }
      default:
        throw new XmlXPathError(XmlXPathErrorCode.UnsupportedResult, 'XPath returned an unsupported result type.', {
          xpath,
          resultType: result.resultType,
        });
    }
  }
}
