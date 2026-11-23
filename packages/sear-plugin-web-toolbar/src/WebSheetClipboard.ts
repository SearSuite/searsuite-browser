import {
  SHEET_CLIPBOARD_MIME_TYPE,
  SheetClipboard,
  type SheetClipboardPayload,
} from '@searsuite/sear-plugin-clipboard';
import { Injectable } from '@searsuite/sear-foundation-di';

const WEB_SHEET_CLIPBOARD_MIME_TYPE = `web ${SHEET_CLIPBOARD_MIME_TYPE}`;

/** Browser Clipboard API adapter; DOM events never cross this boundary. */
@Injectable()
export class WebSheetClipboard extends SheetClipboard {
  private lastWritten: SheetClipboardPayload | null = null;
  private pendingWrite: Promise<void> = Promise.resolve();

  public async read(): Promise<SheetClipboardPayload | null> {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return null;
    const extendedClipboard = clipboard as Clipboard & { read?: () => Promise<ClipboardItems> };
    if (extendedClipboard.read) {
      try {
        const items = await extendedClipboard.read();
        for (const item of items) {
          const structuredType = item.types.find(
            (type) => type === WEB_SHEET_CLIPBOARD_MIME_TYPE || type === SHEET_CLIPBOARD_MIME_TYPE,
          );
          if (!structuredType) continue;
          let structured: SheetClipboardPayload['structured'];
          try {
            const blob = await item.getType(structuredType);
            structured = JSON.parse(await blob.text()) as SheetClipboardPayload['structured'];
          } catch {
            structured = void 0;
          }
          const plainText = item.types.includes('text/plain') ? await (await item.getType('text/plain')).text() : '';
          return structured ? { plainText, structured } : { plainText };
        }
      } catch {
        // Some browsers expose read() but reject it without permission or
        // custom-format support. Fall through to the broadly supported API.
      }
    }
    const plainText = await clipboard.readText();
    if (!plainText.length) return null;
    return this.lastWritten?.plainText === plainText ? this.lastWritten : { plainText };
  }

  public write(payload: SheetClipboardPayload): Promise<void> {
    const write = this.pendingWrite.then(() => this.writePayload(payload));
    this.pendingWrite = write.catch(() => {});
    return write;
  }

  private async writePayload(payload: SheetClipboardPayload): Promise<void> {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return;
    await clipboard.writeText(payload.plainText);
    this.lastWritten = payload;
    if (!payload.structured) return;
    const extendedClipboard = clipboard as Clipboard & { write?: (items: ClipboardItems) => Promise<void> };
    if (extendedClipboard.write && globalThis.ClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': new Blob([payload.plainText], { type: 'text/plain' }),
        [WEB_SHEET_CLIPBOARD_MIME_TYPE]: new Blob([JSON.stringify(payload.structured)], {
          type: SHEET_CLIPBOARD_MIME_TYPE,
        }),
      });
      try {
        await extendedClipboard.write([item]);
      } catch {
        // The plain-text channel was written before the optional native payload.
      }
    }
  }
}
