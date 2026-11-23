import { Injectable } from '@searsuite/sear-foundation-di';
import { WebServiceClient } from '@searsuite/sear-foundation-platform';
import { fetchServiceRequest } from './FetchServiceRequest';
import { type WebServiceRequestOptions, type WebServiceResponse } from '@searsuite/sear-foundation-platform';

/** Browser fetch adapter. CORS and host security policy remain browser-owned concerns. */
@Injectable()
export class WebFetchServiceClient extends WebServiceClient {
  public static readonly symbol: symbol = Symbol.for('WebFetchServiceClient');

  public request(url: string, options: WebServiceRequestOptions = {}): Promise<WebServiceResponse> {
    return fetchServiceRequest(url, options);
  }
}
