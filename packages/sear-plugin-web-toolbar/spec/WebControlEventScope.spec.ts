import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { WebControlEventScope } from '../src/WebControlEventScope';
it('uses the owning platform and disposes rebuilt descendants and retained control callbacks', () => {
  const platform = new BrowserPlatform(),
    spy = jest.spyOn(platform, 'addEventListener'),
    scope = new WebControlEventScope(platform),
    root = document.createElement('div'),
    child = document.createElement('button'),
    outside = document.createElement('button'),
    clicked = jest.fn(),
    other = jest.fn();
  root.append(child);
  document.body.append(root, outside);
  scope.listen(child, 'click', clicked);
  scope.listen(outside, 'click', other);
  child.click();
  expect(clicked).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(child, 'click', expect.any(Function));
  scope.release(root);
  root.remove();
  child.click();
  expect(clicked).toHaveBeenCalledTimes(1);
  outside.click();
  expect(other).toHaveBeenCalledTimes(1);
  scope.clear();
  scope.clear();
  outside.click();
  expect(other).toHaveBeenCalledTimes(1);
  outside.remove();
});
