import { WebXmlXPathEvaluator } from '../../src';
import { XmlXPathError, XmlXPathErrorCode } from '@searsuite/sear-foundation-platform';

describe('WebXmlXPathEvaluator', () => {
  it('reads element text, attributes, and scalar XPath results', () => {
    const evaluator = new WebXmlXPathEvaluator();
    const xml = '<root><item title="one">First</item><item title="two">Second</item></root>';

    expect(evaluator.evaluate(xml, '//item').values).toEqual(['First', 'Second']);
    expect(evaluator.evaluate(xml, '//item/@title').values).toEqual(['one', 'two']);
    expect(evaluator.evaluate(xml, 'count(//item)').values).toEqual(['2']);
    expect(evaluator.evaluate('<root/>', '//missing').values).toEqual([]);
    expect(evaluator.evaluate('<root/>', 'boolean(//missing)').values).toEqual(['false']);
  });

  it('exposes stable errors for invalid XML and XPath', () => {
    const evaluator = new WebXmlXPathEvaluator();

    expect(() => evaluator.evaluate('<root>', '//root')).toThrow(XmlXPathError);
    expect(() => evaluator.evaluate('<root/>', '//*[')).toThrow(
      expect.objectContaining({ code: XmlXPathErrorCode.InvalidXPath }),
    );
    expect(() => evaluator.evaluate('', '//root')).toThrow(XmlXPathError);
    expect(() => evaluator.evaluate('<!DOCTYPE root><root/>', '//root')).toThrow(XmlXPathError);
  });
});
