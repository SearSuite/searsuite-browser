import { Injectable } from '@searsuite/sear-foundation-di';
import { XmlDocumentParser } from '@searsuite/sear-foundation-platform';
import { XmlXPathError, XmlXPathErrorCode } from '@searsuite/sear-foundation-platform';

/** Browser XML parser backed by the native DOMParser. */
@Injectable()
export class WebXmlDocumentParser extends XmlDocumentParser {
  public static readonly symbol: symbol = Symbol.for('WebXmlDocumentParser');

  public parse(xml: string): Document {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    if (
      document.getElementsByTagNameNS('http://www.mozilla.org/newlayout/xml/parsererror.xml', 'parsererror').length >
        0 ||
      document.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'parsererror').length > 0
    ) {
      throw new XmlXPathError(XmlXPathErrorCode.InvalidXml, 'XML input could not be parsed.');
    }
    return document;
  }
}
