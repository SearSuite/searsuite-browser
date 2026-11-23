/** @jest-environment node */

import { WebFetchServiceClient } from '../../src';
import { WebServiceError } from '@searsuite/sear-foundation-platform';

describe('WebFetchServiceClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns a detached response and forwards headers', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => '<root/>',
    } as Response);
    await expect(new WebFetchServiceClient().request('https://example.test', { headers: { Accept: 'text/xml' } }))
      .resolves.toEqual({ status: 200, ok: true, text: '<root/>' });
    expect(fetch).toHaveBeenCalledWith('https://example.test', expect.objectContaining({ headers: { Accept: 'text/xml' } }));
  });

  it('wraps host transport failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(new WebFetchServiceClient().request('https://example.test')).rejects.toBeInstanceOf(WebServiceError);
  });
});
