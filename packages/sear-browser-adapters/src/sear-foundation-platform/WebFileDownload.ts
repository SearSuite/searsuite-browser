import { SearError } from '@searsuite/sear-foundation-error';
import { FileDownload, type FileDownloadRequest } from '@searsuite/sear-foundation-platform';
import { Platform } from '@searsuite/sear-foundation-platform';
import { Injectable, Inject } from '@searsuite/sear-foundation-di';
/** Web file-save adapter; native elements and object URLs never enter the neutral contract. */
@Injectable()
export class WebFileDownload extends FileDownload {
  readonly #platform: Platform;

  readonly #pending = new Map<string, number>();
  #destroyed = false;
  /** Receives the owning host's timer adapter explicitly. */
  constructor(@Inject(Platform.symbol) platform: Platform) {
    super();
    this.#platform = platform;
  }
  /** Initiates a native file save and tracks its delayed resource release. */
  public download(request: FileDownloadRequest): void {
    if (this.#destroyed) throw new SearError('File download adapter has been destroyed.');
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      const data = typeof request.data === 'string' ? request.data : new Uint8Array(request.data);
      const objectUrl = URL.createObjectURL(new Blob([data], { type: request.mediaType }));
      url = objectUrl;
      link = document.createElement('a');
      link.href = url;
      link.download = request.name;
      document.body.append(link);
      link.click();
      const timer = this.#platform.setTimeout(() => {
        if (this.#pending.delete(objectUrl)) URL.revokeObjectURL(objectUrl);
      }, 0);
      this.#pending.set(objectUrl, timer);
    } catch (cause) {
      if (url !== undefined) URL.revokeObjectURL(url);
      throw new SearError('File download failed.', { cause });
    } finally {
      link?.remove();
    }
  }
  /** Cancels pending release callbacks and revokes every retained object URL. */
  public destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const [url, timer] of this.#pending) {
      this.#platform.clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    this.#pending.clear();
  }
}
