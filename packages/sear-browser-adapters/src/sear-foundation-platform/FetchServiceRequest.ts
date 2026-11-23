import {
  WebServiceError,
  type WebServiceRequestOptions,
  type WebServiceResponse,
} from '@searsuite/sear-foundation-platform';

/** Browser-native fetch conversion with host-owned cancellation. */
export async function fetchServiceRequest(url: string, options: WebServiceRequestOptions): Promise<WebServiceResponse> {
  const controller = new AbortController();
  const disposeCancellation = options.cancellation?.subscribe(() => controller.abort());
  if (options.cancellation?.cancelled) controller.abort();
  try {
    const response = await fetch(url, {
      ...(options.headers === undefined ? {} : { headers: options.headers }),
      signal: controller.signal,
    });
    return { status: response.status, ok: response.ok, text: await response.text() };
  } catch (error) {
    throw new WebServiceError('Web-service request failed.', {
      url,
      cancelled: controller.signal.aborted,
      cause: error,
    });
  } finally {
    disposeCancellation?.();
  }
}
