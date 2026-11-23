import { WebSheetClipboard } from '../src/WebSheetClipboard';

describe('WebSheetClipboard', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const originalClipboardItem = (globalThis as { ClipboardItem?: unknown }).ClipboardItem;

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
    if (originalClipboardItem === void 0) Reflect.deleteProperty(globalThis, 'ClipboardItem');
    else (globalThis as { ClipboardItem?: unknown }).ClipboardItem = originalClipboardItem;
  });

  it('BUG-107 writes text before an optional structured format can reject', async () => {
    const calls: string[] = [];
    const write = jest.fn().mockRejectedValue(new DOMException('unsupported', 'NotAllowedError'));
    const writeText = jest.fn().mockImplementation(async () => {
      calls.push('text');
    });
    write.mockImplementation(async () => {
      calls.push('structured');
      throw new DOMException('unsupported', 'NotAllowedError');
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText } });
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = class {
      public constructor(_data: unknown) {}
    };

    await new WebSheetClipboard().write({
      plainText: 'A\tB',
      structured: { kind: 'searsuite.sheet-range', version: 3, source: [0, 0], rows: [], formats: [] },
    });

    expect(calls).toEqual(['text', 'structured']);
    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('A\tB');
  });

  it('retains an internal structured copy when browser read() is unavailable', async () => {
    const read = jest.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const readText = jest.fn().mockResolvedValue('redcopy');
    const writeText = jest.fn().mockResolvedValue(void 0);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read, readText, writeText } });
    const clipboard = new WebSheetClipboard();
    const payload = {
      plainText: 'redcopy',
      structured: { kind: 'searsuite.sheet-range' as const, version: 3 as const, source: [0, 0] as const,
        rows: [], formats: [], ownerFormats: [{ id: 'fill', portable: { values: [[0, '#ffdddd']] } }] },
    };

    await clipboard.write(payload);
    expect(await clipboard.read()).toBe(payload);
    readText.mockResolvedValue('external');
    expect(await clipboard.read()).toEqual({ plainText: 'external' });
  });

  it('falls back to readText when the extended read API is unavailable', async () => {
    const read = jest.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const readText = jest.fn().mockResolvedValue('A\tB');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read, readText } });

    await expect(new WebSheetClipboard().read()).resolves.toEqual({ plainText: 'A\tB' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it('keeps consecutive clipboard writes in request order', async () => {
    let releaseFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const writeText = jest.fn().mockImplementation((text: string) => text === 'first' ? firstWrite : Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const clipboard = new WebSheetClipboard();

    const first = clipboard.write({ plainText: 'first' });
    const second = clipboard.write({ plainText: 'second' });
    await Promise.resolve();
    expect(writeText.mock.calls).toEqual([['first']]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(writeText.mock.calls).toEqual([['first'], ['second']]);
  });
});
