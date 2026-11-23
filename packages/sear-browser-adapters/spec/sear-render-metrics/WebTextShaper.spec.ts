import { WebTextShaper, WebTextShaperError } from '../../src';

function createContext(widths: Readonly<Record<string, number>> = {}) {
  const savedStates: Array<{ font: string; direction: CanvasDirection; fontKerning: CanvasFontKerning }> = [];
  const context = {
    font: '12px sans-serif',
    direction: 'ltr' as CanvasDirection,
    fontKerning: 'auto' as CanvasFontKerning,
    save: jest.fn(() => {
      savedStates.push({ font: context.font, direction: context.direction, fontKerning: context.fontKerning });
    }),
    restore: jest.fn(() => {
      const state = savedStates.pop();
      if (state) {
        context.font = state.font;
        context.direction = state.direction;
        context.fontKerning = state.fontKerning;
      }
    }),
    measureText: jest.fn((text: string) => ({
      width: widths[text] ?? text.length * 10,
      fontBoundingBoxAscent: 9,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    })),
  } as unknown as CanvasRenderingContext2D;
  return context;
}

describe('WebTextShaper', () => {
  it('uses complete-run and prefix measurements instead of adding character widths', () => {
    const context = createContext({ A: 10, V: 11, AV: 19 });
    const shaper = new WebTextShaper(context);

    const result = shaper.shape({ text: 'AV', font: '16px sans-serif' });

    expect(result.width).toBe(19);
    expect(result.caretStops).toEqual([
      { textOffset: 0, x: 0 },
      { textOffset: 1, x: 10 },
      { textOffset: 2, x: 19 },
    ]);
    expect(result.glyphs).toEqual([]);
    expect(context.measureText).toHaveBeenCalledWith('AV');
    expect(context.measureText).toHaveBeenCalledWith('A');
    expect(context.measureText).not.toHaveBeenCalledWith('V');
  });

  it('keeps grapheme clusters and UTF-16 caret offsets', () => {
    const context = createContext({ 'A👩‍💻': 25, 'A👩‍💻B': 35 });
    const result = new WebTextShaper(context).shape({
      text: 'A👩‍💻B',
      font: '16px sans-serif',
    });

    expect(result.clusters).toEqual([
      { textStart: 0, textEnd: 1, glyphStart: 0, glyphEnd: 0 },
      { textStart: 1, textEnd: 6, glyphStart: 0, glyphEnd: 0 },
      { textStart: 6, textEnd: 7, glyphStart: 0, glyphEnd: 0 },
    ]);
    expect(result.caretStops.map((stop) => stop.textOffset)).toEqual([0, 1, 6, 7]);
  });

  it('restores the host context after shaping and applies direction and kerning', () => {
    const context = createContext({ AB: 20, A: 10 });
    const state = { font: context.font, direction: context.direction, fontKerning: context.fontKerning };

    new WebTextShaper(context).shape({
      text: 'AB',
      font: '18px serif',
      direction: 'rtl',
      features: { kern: false },
    });

    expect(context.font).toBe(state.font);
    expect(context.direction).toBe(state.direction);
    expect(context.fontKerning).toBe(state.fontKerning);
    expect(context.measureText).toHaveBeenCalled();
  });

  it('rejects shaping settings Canvas2D cannot control', () => {
    const context = createContext();
    const shaper = new WebTextShaper(context);

    expect(() => shaper.shape({ text: 'a', font: '16px sans-serif', features: { liga: false } })).toThrow(
      WebTextShaperError,
    );
    expect(() => shaper.shape({ text: 'a', font: '16px sans-serif', variations: { wght: 700 } })).toThrow(
      WebTextShaperError,
    );
    expect(() => shaper.shape({ text: 'a', font: '16px sans-serif', script: 'Latn' })).toThrow(WebTextShaperError);
  });
});
