import { WebFileDownload, BrowserPlatform } from '../../src';
import { SearError } from '@searsuite/sear-foundation-error';
it('owns object URLs, delayed releases and teardown without callbacks surviving destruction', () => {
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL,
    create = jest.fn().mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two'),
    revoke = jest.fn();
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}),
    platform = new BrowserPlatform(),
    callbacks: (() => void)[] = [];
  jest.spyOn(platform, 'setTimeout').mockImplementation((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const cancel = jest.spyOn(platform, 'clearTimeout').mockImplementation(() => {});
  const adapter = new WebFileDownload(platform);
  try {
    adapter.download({ name: 'a.svg', mediaType: 'image/svg+xml', data: '<svg/>' });
    expect(document.querySelector('a')).toBeNull();
    expect(click).toHaveBeenCalledTimes(1);
    callbacks[0]();
    expect(revoke).toHaveBeenCalledWith('blob:one');
    adapter.download({ name: 'a.bin', mediaType: 'application/octet-stream', data: new Uint8Array([1, 2]) });
    adapter.destroy();
    adapter.destroy();
    expect(cancel).toHaveBeenCalledWith(2);
    expect(revoke).toHaveBeenCalledTimes(2);
    callbacks[1]();
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(() => adapter.download({ name: 'x', mediaType: 'text/plain', data: '' })).toThrow(SearError);
  } finally {
    adapter.destroy();
    click.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
it('removes native elements and revokes URLs when a save fails', () => {
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:failure';
  const revoke = jest.fn();
  URL.revokeObjectURL = revoke;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
    throw new Error('save failed');
  });
  const adapter = new WebFileDownload(new BrowserPlatform());
  try {
    expect(() => adapter.download({ name: 'x', mediaType: 'text/plain', data: 'x' })).toThrow(SearError);
    expect(revoke).toHaveBeenCalledWith('blob:failure');
    expect(document.querySelector('a')).toBeNull();
  } finally {
    adapter.destroy();
    click.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});

it.each(['url', 'element'])('normalizes native %s creation failures and releases acquired resources', (stage) => {
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  const revoke = jest.fn();
  URL.revokeObjectURL = revoke;
  URL.createObjectURL =
    stage === 'url'
      ? () => {
          throw new Error('URL unavailable');
        }
      : () => 'blob:early';
  const createElement =
    stage === 'element'
      ? jest.spyOn(document, 'createElement').mockImplementation(() => {
          throw new Error('element unavailable');
        })
      : null;
  const adapter = new WebFileDownload(new BrowserPlatform());
  try {
    expect(() => adapter.download({ name: 'a.svg', mediaType: 'image/svg+xml', data: '<svg/>' })).toThrow(SearError);
    if (stage === 'element') expect(revoke).toHaveBeenCalledWith('blob:early');
    else expect(revoke).not.toHaveBeenCalled();
  } finally {
    adapter.destroy();
    createElement?.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
