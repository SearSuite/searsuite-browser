import { CellNumberFormatDialog } from '../src/CellNumberFormatDialog';
import { CellFormats } from '@searsuite/sear-domain-cell-types';
import { CellNumberFormatMenu } from '../src/CellNumberFormatMenu';
import { validateExcelCode } from '../src/validateExcelCode';

describe('CellNumberFormatDialog accessibility', () => {
  let dialog: CellNumberFormatDialog;

  beforeEach(() => {
    dialog = new CellNumberFormatDialog();
    dialog.open({ currentFormat: null, onApply: () => void 0 });
  });

  afterEach(() => dialog.destroy());

  it('BUG-567 associates the visible format-code label with its input', () => {
    document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();

    const input = document.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom');
    expect(input?.labels?.[0]?.textContent).toBe('Format code');
  });

  it('BUG-599 exposes and updates the active format category', () => {
    const general = document.querySelector<HTMLButtonElement>('[data-category="general"]');
    const time = document.querySelector<HTMLButtonElement>('[data-category="time"]');
    expect(general?.getAttribute('aria-pressed')).toBe('true');
    expect(time?.getAttribute('aria-pressed')).toBe('false');

    time?.click();
    expect(general?.getAttribute('aria-pressed')).toBe('false');
    expect(time?.getAttribute('aria-pressed')).toBe('true');
  });

  it('BUG-582 exposes the selected preset and follows later selection changes', () => {
    document.querySelector<HTMLButtonElement>('[data-category="time"]')?.click();
    const presets = document.querySelectorAll<HTMLButtonElement>('.sear-number-format-dialog__preset');
    expect(presets[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(presets[1]?.getAttribute('aria-pressed')).toBe('false');

    presets[1]?.click();
    expect(presets[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(presets[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('BUG-098 classifies color directives as numeric, including after reopening the dialog', () => {
    const format = CellFormats.excelCode('#,##0.00;[Red]-#,##0.00');
    expect(CellNumberFormatMenu.describe(format)).toBe('Number');
    dialog.open({ currentFormat: format, sampleValue: -12, onApply: () => void 0 });
    expect(document.querySelector<HTMLButtonElement>('[data-category="number"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('-12.00');
  });

  it('BUG-505 keeps quoted color names as literals and classifies the format as custom', () => {
    const format = CellFormats.excelCode('0"[Red]"');
    expect(CellNumberFormatMenu.describe(format)).toBe('Custom');
    dialog.open({ currentFormat: format, sampleValue: 5, onApply: () => void 0 });
    expect(document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('5[Red]');
  });

  it('BUG-042 rejects unknown directives and allows correction before applying', () => {
    expect(validateExcelCode('[Red][<0]0.00;[Blue]0.00')).toBe(true);
    expect(validateExcelCode('[$-409]mmm d, yyyy')).toBe(true);
    expect(validateExcelCode('[Color56]0')).toBe(true);
    expect(validateExcelCode(';;;')).toBe(true);
    expect(validateExcelCode('[Bad]0')).toBe(false);
    expect(validateExcelCode('[')).toBe(false);
    expect(validateExcelCode('[Color57]0')).toBe(false);
    expect(validateExcelCode('0;0;0;0;0')).toBe(false);
    expect(CellNumberFormatMenu.describe(CellFormats.excelCode('[Bad]0'))).toBe('Custom');

    let applied = null as ReturnType<typeof CellFormats.excelCode> | null;
    dialog.open({ currentFormat: null, sampleValue: 42, onApply: (format) => {
      applied = format as ReturnType<typeof CellFormats.excelCode>;
    } });
    document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();
    const input = document.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom')!;
    input.value = '[Bad]0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('.sear-number-format-dialog__error')?.textContent).toBe('Invalid format code');
    expect(document.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.disabled).toBe(true);
    expect(applied).toBeNull();

    input.value = '0.00';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('42.00');
    document.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.click();
    expect(applied).toEqual(CellFormats.excelCode('0.00'));
  });

  it('keeps every built-in format preset valid for submission', () => {
    const categories = Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-number-format-dialog__categories button'));
    for (const category of categories) {
      category.click();
      for (const preset of Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-number-format-dialog__preset'))) {
        preset.click();
        expect(document.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.disabled).toBe(false);
      }
    }
  });

  it('BUG-104 keeps the custom code, preview, and submitted preset in sync', () => {
    let applied = null as ReturnType<typeof CellFormats.excelCode> | null;
    dialog.open({ currentFormat: CellFormats.excelCode('0.00" kg"'), sampleValue: 12, onApply: (format) => {
      applied = format as ReturnType<typeof CellFormats.excelCode>;
    } });
    document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();
    const input = document.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom');
    expect(input?.value).toBe('0.00" kg"');
    document.querySelector<HTMLButtonElement>('[data-format-code=";;;"]')?.click();
    expect(input?.value).toBe(';;;');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('');
    document.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.click();
    expect(applied).toEqual(CellFormats.excelCode(';;;'));
  });

  it('BUG-550 keeps an unconfirmed custom code when switching categories', () => {
    let applied = null as ReturnType<typeof CellFormats.excelCode> | null;
    dialog.open({ currentFormat: null, sampleValue: 12.34, onApply: (format) => {
      applied = format as ReturnType<typeof CellFormats.excelCode>;
    } });
    document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();
    const input = document.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom')!;
    input.value = '0.0000" kg"';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('[data-category="date"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-category="custom"]')?.click();
    expect(document.querySelector<HTMLInputElement>('.sear-number-format-dialog__custom')?.value).toBe('0.0000" kg"');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('12.3400 kg');
    document.querySelector<HTMLButtonElement>('.sear-number-format-dialog__button.is-primary')?.click();
    expect(applied).toEqual(CellFormats.excelCode('0.0000" kg"'));
  });

  it('BUG-581 previews the ordinary date-and-weekday preset in Chinese', () => {
    dialog.open({ currentFormat: null, sampleValue: 3, onApply: () => void 0 });
    document.querySelector<HTMLButtonElement>('[data-category="date"]')?.click();
    const preset = Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-number-format-dialog__preset'))
      .find((button) => button.textContent?.includes('Date with weekday'));
    preset?.click();
    expect(preset?.dataset['formatCode']).toBe('[$-804]yyyy-mm-dd dddd');
    expect(document.querySelector('.sear-number-format-dialog__preview')?.textContent).toBe('1900-01-03 \u661f\u671f\u4e09');
  });
});
