import {
  CellFormats,
  formatCellNumber,
  formatCellText,
  type CellFormat,
} from '@searsuite/sear-domain-cell-types';
import { SheetHorizontalAlignment, SheetVerticalAlignment } from '@searsuite/sear-plugin-alignment';
import { SheetBorderLineStyle, SheetBorderPreset, type SheetBorderStroke } from '@searsuite/sear-plugin-cell-border';
import { classifyExcelCode } from './classifyExcelCode';
import { validateExcelCode } from './validateExcelCode';

interface CellNumberFormatPreset {
  readonly label: string;
  readonly code: string;
  readonly format: CellFormat | null;
}

interface CellNumberFormatCategory {
  readonly id: string;
  readonly label: string;
  readonly sample: number | string;
  readonly presets: readonly CellNumberFormatPreset[];
}

const code = (label: string, value: string): CellNumberFormatPreset => ({
  label,
  code: value,
  format: CellFormats.excelCode(value),
});

const CELL_NUMBER_FORMAT_CATEGORIES: readonly CellNumberFormatCategory[] = [
  {
    id: 'general',
    label: 'General',
    sample: 555.25,
    presets: [{ label: 'General', code: 'General', format: null }],
  },
  {
    id: 'number',
    label: 'Number',
    sample: -1234.5,
    presets: [
      code('Integer', '0'),
      code('Two decimals', '0.00'),
      code('Thousands separator', '#,##0.00'),
      code('Red negatives', '#,##0.00;[Red]-#,##0.00'),
      code('Parenthesized negatives', '#,##0.00;(#,##0.00)'),
      code('Red parenthesized negatives', '#,##0.00;[Red](#,##0.00)'),
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    sample: -1234.5,
    presets: [
      { label: 'Chinese yuan', code: 'CNY', format: CellFormats.currency('CNY', 'zh-CN') },
      { label: 'US dollar', code: 'USD', format: CellFormats.currency('USD', 'en-US') },
      { label: 'Euro', code: 'EUR', format: CellFormats.currency('EUR', 'de-DE') },
      { label: 'Japanese yen', code: 'JPY', format: CellFormats.currency('JPY', 'ja-JP') },
      code('Yuan with parenthesized negatives', '¥#,##0.00;(¥#,##0.00)'),
      code('Dollar with red negatives', '$#,##0.00;[Red]-$#,##0.00'),
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    sample: 0,
    presets: [
      code('Yuan accounting', '¥* #,##0.00;(¥* #,##0.00);¥* "-"??'),
      code('Dollar accounting', '$* #,##0.00;($* #,##0.00);$* "-"??'),
      code('Euro accounting', '€* #,##0.00;(€* #,##0.00);€* "-"??'),
      code('Accounting without symbol', '* #,##0.00;(* #,##0.00);* "-"??'),
    ],
  },
  {
    id: 'date',
    label: 'Date',
    sample: 40944,
    presets: [
      code('Short date', 'yyyy-m-d'),
      code('Slash date', 'yyyy/mm/dd'),
      code('Chinese date', 'yyyy"\u5e74"m"\u6708"d"\u65e5"'),
      code('Two-digit year', 'yy-mm-dd'),
      code('Month and day', 'm-d'),
      code('English short date', '[$-409]mmm d, yyyy'),
      code('English long date', '[$-409]dddd, mmmm d, yyyy'),
      code('Date with weekday', '[$-804]yyyy-mm-dd dddd'),
    ],
  },
  {
    id: 'time',
    label: 'Time',
    sample: 1.6875,
    presets: [
      code('24-hour time', 'hh:mm'),
      code('24-hour time with seconds', 'hh:mm:ss'),
      code('12-hour time', 'h:mm AM/PM'),
      code('12-hour time with seconds', 'h:mm:ss AM/PM'),
      code('Hundredths of a second', 'hh:mm:ss.00'),
      code('Date and time', 'yyyy-mm-dd hh:mm'),
      code('Elapsed hours', '[h]:mm:ss'),
      code('Elapsed minutes', '[m]:ss'),
      code('Elapsed seconds', '[s].00'),
    ],
  },
  {
    id: 'fraction',
    label: 'Fraction',
    sample: 5.25,
    presets: [
      code('One-digit denominator', '# ?/?'),
      code('Two-digit denominator', '# ??/??'),
      code('Three-digit denominator', '# ???/???'),
      code('Fixed denominator 2', '# ?/2'),
      code('Fixed denominator 4', '# ?/4'),
      code('Fixed denominator 8', '# ?/8'),
      code('Fixed denominator 16', '# ??/16'),
      code('Fixed denominator 100', '# ??/100'),
    ],
  },
  {
    id: 'percentage',
    label: 'Percent',
    sample: 0.1256,
    presets: [code('Integer percent', '0%'), code('One decimal', '0.0%'), code('Two decimals', '0.00%'), code('Four decimals', '0.0000%')],
  },
  {
    id: 'scientific',
    label: 'Scientific',
    sample: 555,
    presets: [
      code('Integer mantissa', '0E+00'),
      code('One decimal', '0.0E+00'),
      code('Two decimals', '0.00E+00'),
      code('Three decimals', '0.000E+00'),
      code('Three-digit exponent', '0.00E+000'),
    ],
  },
  {
    id: 'special',
    label: 'Special',
    sample: 4255551212,
    presets: [
      code('Five-digit postal code', '00000'),
      code('Nine-digit postal code', '00000-0000'),
      code('Phone number', '(000) 000-0000'),
      code('Social security number', '000-00-0000'),
      code('Chinese mobile number', '000 0000 0000'),
    ],
  },
  {
    id: 'text',
    label: 'Text',
    sample: '00123',
    presets: [{ label: 'Text', code: '@', format: CellFormats.text }],
  },
  {
    id: 'custom',
    label: 'Custom',
    sample: 1234.5,
    presets: [
      code('Positive, negative, zero, and text', '0.00;[Red]-0.00;"-";@'),
      code('Hidden', ';;;'),
      code('Thousands', '0.0,"K"'),
      code('Millions', '0.0,,"M"'),
      code('Weight', '0.00" kg"'),
      code('Yuan prefix', '"CNY "#,##0.00'),
      code('Red negatives', '#,##0.00;[Red]-#,##0.00'),
      code('Conditional colors', '[Red][<0]0.00;[Blue][>=100]0.00;0.00'),
      code('Five-digit identifier', '00000'),
    ],
  },
];

export interface CellFormatDialogSections {
  readonly currentAlignment?: string | null | undefined;
  readonly currentVerticalAlignment?: string | null | undefined;
  readonly currentFill?: string | null | undefined;
  readonly currentTextStyle?: Readonly<Record<string, unknown>> | undefined;
  readonly textStyleEnabled: boolean;
  readonly onApplyAlignment: (value: SheetHorizontalAlignment) => void;
  readonly onApplyVerticalAlignment: (value: SheetVerticalAlignment) => void;
  readonly onApplyTextStyle: (attrs: Readonly<Record<string, unknown>>) => void;
  readonly onApplyBorder: (preset: SheetBorderPreset, stroke: SheetBorderStroke) => void;
  readonly onApplyFill: (value: string | null) => void;
}

/** Web number-format settings dialog with category-specific preset menus and custom Excel code input. */
export class CellNumberFormatDialog {
  private dialog: HTMLDialogElement | null = null;

  public open(options: {
    readonly currentFormat: CellFormat | null;
    readonly sampleValue?: unknown;
    readonly onApply: (format: CellFormat | null) => void;
    readonly sections?: CellFormatDialogSections | undefined;
  }): void {
    this.destroy();
    const dialog = document.createElement('dialog');
    dialog.className = 'sear-number-format-dialog';
    dialog.setAttribute('aria-label', options.sections ? 'Format cells' : 'Number format');
    dialog.classList.toggle('is-full', !!options.sections);
    this.dialog = dialog;

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = options.sections ? 'Format cells' : 'Number format';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sear-number-format-dialog__close';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    header.append(title, close);

    const body = document.createElement('div');
    body.className = 'sear-number-format-dialog__body';
    const categories = document.createElement('nav');
    categories.className = 'sear-number-format-dialog__categories';
    categories.setAttribute('aria-label', 'Number format categories');
    const panel = document.createElement('section');
    panel.className = 'sear-number-format-dialog__panel';
    body.append(categories, panel);

    const footer = document.createElement('footer');
    const cancel = dialogButton('Cancel');
    const confirm = dialogButton('OK', true);
    footer.append(cancel, confirm);
    const tabs = document.createElement('div');
    tabs.className = 'sear-number-format-dialog__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Cell format categories');
    const extra = document.createElement('section');
    extra.className = 'sear-number-format-dialog__extra';
    extra.setAttribute('role', 'tabpanel');
    if (options.sections) dialog.append(header, tabs, body, extra, footer);
    else dialog.append(header, body, footer);

    let activeCategory = categoryForFormat(options.currentFormat);
    let selectedFormat = options.currentFormat;
    let formatChanged = false;
    let numberValid = true;
    let horizontal: SheetHorizontalAlignment | undefined;
    let vertical: SheetVerticalAlignment | undefined;
    const textStyle: Record<string, unknown> = {};
    let borderPreset: SheetBorderPreset | undefined;
    let borderStyle: SheetBorderLineStyle = SheetBorderLineStyle.Thin;
    let borderColor = '#000000';
    let fill: string | null | undefined;
    const categoryButtons = new Map<string, HTMLButtonElement>();
    const categoryDrafts = new Map<string, CellFormat | null>();

    const selectCategory = (category: CellNumberFormatCategory): void => {
      activeCategory = category;
      selectedFormat = categoryDrafts.has(category.id)
        ? categoryDrafts.get(category.id)!
        : initialFormat(category, options.currentFormat);
      categoryButtons.forEach((button, id) => {
        const active = id === category.id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      renderCategoryPanel(panel, category, selectedFormat, options.sampleValue, (format) => {
        selectedFormat = format;
        categoryDrafts.set(category.id, format);
        formatChanged = !sameFormat(format, options.currentFormat);
      }, (valid) => { numberValid = valid; confirm.disabled = !valid; });
    };

    CELL_NUMBER_FORMAT_CATEGORIES.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category.label;
      button.dataset['category'] = category.id;
      button.addEventListener('click', () => { formatChanged = true; selectCategory(category); });
      categories.appendChild(button);
      categoryButtons.set(category.id, button);
    });

    const sections = options.sections;
    if (sections) {
      const tabNames = ['Number', 'Alignment', 'Font', 'Border', 'Fill', 'Protection'] as const;
      const tabButtons = new Map<string, HTMLButtonElement>();
      const renderTab = (name: typeof tabNames[number]): void => {
        tabButtons.forEach((button, label) => button.setAttribute('aria-selected', String(label === name)));
        body.hidden = name !== 'Number';
        extra.hidden = name === 'Number';
        confirm.disabled = !numberValid;
        extra.replaceChildren();
        if (name === 'Alignment') {
          const horizontalInput = formatSelect('Horizontal alignment', [
            ['left', 'Left'], ['center', 'Center'], ['right', 'Right'],
          ], horizontal ?? sections.currentAlignment ?? 'left');
          const verticalInput = formatSelect('Vertical alignment', [
            ['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom'],
          ], vertical ?? sections.currentVerticalAlignment ?? 'center');
          horizontalInput.addEventListener('change', () => { horizontal = horizontalInput.value as SheetHorizontalAlignment; });
          verticalInput.addEventListener('change', () => { vertical = verticalInput.value as SheetVerticalAlignment; });
          extra.append(horizontalInput.parentElement!, verticalInput.parentElement!);
        } else if (name === 'Font') {
          if (!sections.textStyleEnabled) {
            const note = document.createElement('p');
            note.textContent = 'The current cell has no text to format.';
            extra.append(note);
            return;
          }
          const family = formatInput('Font', 'text', String(textStyle['fontFamily'] ?? sections.currentTextStyle?.['fontFamily'] ?? ''));
          family.addEventListener('input', () => { textStyle['fontFamily'] = family.value || null; });
          const size = formatInput('Font size', 'number', String(textStyle['fontSize'] ?? sections.currentTextStyle?.['fontSize'] ?? '12'));
          size.min = '1';
          size.max = '200';
          size.addEventListener('input', () => { if (Number(size.value) > 0) textStyle['fontSize'] = Number(size.value); });
          const bold = formatCheckbox('Bold', (textStyle['bold'] ?? sections.currentTextStyle?.['bold']) === true);
          bold.addEventListener('change', () => { textStyle['bold'] = bold.checked; });
          const italic = formatCheckbox('Italic', (textStyle['italic'] ?? sections.currentTextStyle?.['italic']) === true);
          italic.addEventListener('change', () => { textStyle['italic'] = italic.checked; });
          const color = formatInput('Font color', 'color', String(textStyle['color'] ?? sections.currentTextStyle?.['color'] ?? '#000000'));
          color.addEventListener('input', () => { textStyle['color'] = color.value; });
          extra.append(family.parentElement!, size.parentElement!, bold.parentElement!, italic.parentElement!, color.parentElement!);
        } else if (name === 'Border') {
          const preset = formatSelect('Border style', [
            [SheetBorderPreset.None, 'No borders'], [SheetBorderPreset.Outside, 'Outside borders'],
            [SheetBorderPreset.All, 'All borders'], [SheetBorderPreset.Inside, 'Inside borders'],
            [SheetBorderPreset.Top, 'Top border'], [SheetBorderPreset.Bottom, 'Bottom border'],
            [SheetBorderPreset.Left, 'Left border'], [SheetBorderPreset.Right, 'Right border'],
          ], borderPreset ?? SheetBorderPreset.None);
          preset.addEventListener('change', () => { borderPreset = preset.value as SheetBorderPreset; });
          const style = formatSelect('Line style', [
            [SheetBorderLineStyle.Thin, 'Thin solid'], [SheetBorderLineStyle.Medium, 'Medium solid'],
            [SheetBorderLineStyle.Thick, 'Thick solid'], [SheetBorderLineStyle.Dashed, 'Dashed'],
            [SheetBorderLineStyle.Dotted, 'Dotted'], [SheetBorderLineStyle.Double, 'Double'],
          ], borderStyle);
          style.addEventListener('change', () => { borderStyle = style.value as SheetBorderLineStyle; });
          const color = formatInput('Border color', 'color', borderColor);
          color.addEventListener('input', () => { borderColor = color.value; });
          extra.append(preset.parentElement!, style.parentElement!, color.parentElement!);
        } else if (name === 'Fill') {
          const color = formatInput('Fill color', 'color', fill ?? sections.currentFill ?? '#ffffff');
          const clear = formatCheckbox('No fill', fill === null || (fill === undefined && sections.currentFill === null));
          color.addEventListener('input', () => { fill = color.value; clear.checked = false; });
          clear.addEventListener('change', () => { fill = clear.checked ? null : color.value; });
          extra.append(color.parentElement!, clear.parentElement!);
        } else if (name === 'Protection') {
          const note = document.createElement('p');
          note.textContent = 'Cell locking and hidden formulas are not supported in this sheet.';
          extra.append(note);
        }
      };
      tabNames.forEach((name) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.textContent = name;
        button.addEventListener('click', () => renderTab(name));
        button.addEventListener('keydown', (event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          const next = tabNames[(tabNames.indexOf(name) + direction + tabNames.length) % tabNames.length]!;
          renderTab(next);
          tabButtons.get(next)?.focus();
        });
        tabs.append(button);
        tabButtons.set(name, button);
      });
      renderTab('Number');
    }

    const finish = (apply: boolean): void => {
      if (apply) {
        if (!sections || formatChanged) options.onApply(selectedFormat);
        if (horizontal) sections?.onApplyAlignment(horizontal);
        if (vertical) sections?.onApplyVerticalAlignment(vertical);
        if (Object.keys(textStyle).length) sections?.onApplyTextStyle(textStyle);
        if (borderPreset) sections?.onApplyBorder(borderPreset, { color: borderColor, style: borderStyle });
        if (fill !== undefined) sections?.onApplyFill(fill);
      }
      this.destroy();
    };
    close.addEventListener('click', () => finish(false));
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });

    document.body.appendChild(dialog);
    selectCategory(activeCategory);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  public destroy(): void {
    const dialog = this.dialog;
    this.dialog = null;
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.remove();
  }
}

function renderCategoryPanel(
  panel: HTMLElement,
  category: CellNumberFormatCategory,
  initial: CellFormat | null,
  sourceSample: unknown,
  onChange: (format: CellFormat | null) => void,
  onValidityChange: (valid: boolean) => void,
): void {
  panel.replaceChildren();
  const sampleLabel = document.createElement('label');
  sampleLabel.textContent = 'Sample';
  const preview = document.createElement('output');
  preview.className = 'sear-number-format-dialog__preview';
  const heading = document.createElement('div');
  heading.className = 'sear-number-format-dialog__section-title';
  heading.textContent = 'Format';
  const list = document.createElement('div');
  list.className = 'sear-number-format-dialog__presets';

  let selected = initial;
  let validCode = initial?.kind !== 'excelCode' || validateExcelCode(initial.code);
  const sample = resolveSample(sourceSample, category);
  const updatePreview = (): void => {
    preview.textContent = validCode ? formatSample(sample, selected) : '';
  };

  const customFormat = initial?.kind === 'excelCode' ? initial : null;
  let customInput: HTMLInputElement | null = null;
  let feedback: HTMLElement | null = null;
  const setValidity = (valid: boolean): void => {
    validCode = valid;
    if (customInput) customInput.setAttribute('aria-invalid', String(!valid));
    if (feedback) feedback.textContent = valid ? '' : 'Invalid format code';
    onValidityChange(valid);
  };
  const presets =
    category.id === 'custom' && customFormat && !category.presets.some((preset) => preset.code === customFormat.code)
      ? [code('Current custom format', customFormat.code), ...category.presets]
      : category.presets;
  const selectPreset = (selectedButton: HTMLButtonElement | null): void => {
    list.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const active = button === selectedButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  presets.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sear-number-format-dialog__preset';
    button.dataset['formatCode'] = preset.code;
    const label = document.createElement('span');
    label.textContent = preset.label;
    const codeValue = document.createElement('code');
    codeValue.textContent = preset.code;
    button.append(label, codeValue);
    const isInitial = sameFormat(preset.format, initial) || (index === 0 && !presets.some((item) => sameFormat(item.format, initial)));
    button.classList.toggle('is-active', isInitial);
    button.setAttribute('aria-pressed', String(isInitial));
    if (isInitial) selected = preset.format;
    button.addEventListener('click', () => {
      selected = preset.format;
      if (customInput) customInput.value = preset.code;
      setValidity(true);
      selectPreset(button);
      onChange(selected);
      updatePreview();
    });
    list.appendChild(button);
  });

  panel.append(sampleLabel, preview, heading, list);
  if (category.id === 'custom') {
    const customLabel = document.createElement('label');
    customLabel.textContent = 'Format code';
    const input = document.createElement('input');
    input.id = 'sear-number-format-custom-code';
    customLabel.htmlFor = input.id;
    input.type = 'text';
    input.className = 'sear-number-format-dialog__custom';
    input.value = selected?.kind === 'excelCode' ? selected.code : '0.00';
    customInput = input;
    feedback = document.createElement('small');
    feedback.id = 'sear-number-format-custom-error';
    feedback.className = 'sear-number-format-dialog__error';
    feedback.setAttribute('role', 'alert');
    input.setAttribute('aria-describedby', feedback.id);
    setValidity(validateExcelCode(input.value));
    input.addEventListener('input', () => {
      selected = CellFormats.excelCode(input.value);
      setValidity(validateExcelCode(input.value));
      selectPreset(null);
      onChange(selected);
      updatePreview();
    });
    panel.append(customLabel, input, feedback);
  }
  onChange(selected);
  onValidityChange(validCode);
  updatePreview();
}

function categoryForFormat(format: CellFormat | null): CellNumberFormatCategory {
  let id: string;
  if (format === null || format.kind === 'general') id = 'general';
  else if (format.kind === 'excelCode') id = categoryForCode(format.code);
  else if (format.kind === 'percent') id = 'percentage';
  else if (format.kind === 'dateTime') id = 'time';
  else id = format.kind;
  return CELL_NUMBER_FORMAT_CATEGORIES.find((category) => category.id === id) ?? CELL_NUMBER_FORMAT_CATEGORIES[0]!;
}

function categoryForCode(value: string): string {
  return classifyExcelCode(value);
}

function initialFormat(category: CellNumberFormatCategory, current: CellFormat | null): CellFormat | null {
  return categoryForFormat(current).id === category.id ? current : category.presets[0]!.format;
}

function formatSample(value: unknown, format: CellFormat | null): string {
  if (typeof value === 'number') return formatCellNumber(value, format ?? CellFormats.general);
  return formatCellText(String(value ?? ''), format ?? CellFormats.general);
}

function resolveSample(value: unknown, category: CellNumberFormatCategory): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return category.sample;
  if (category.id === 'text') return value;
  const numeric = Number(value.trim());
  return Number.isFinite(numeric) && value.trim() !== '' ? numeric : category.sample;
}

function sameFormat(left: CellFormat | null, right: CellFormat | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function dialogButton(label: string, primary = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `sear-number-format-dialog__button${primary ? ' is-primary' : ''}`;
  button.textContent = label;
  return button;
}

function formatInput(label: string, type: string, value: string): HTMLInputElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'sear-number-format-dialog__field';
  wrapper.append(label);
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.setAttribute('aria-label', label);
  wrapper.append(input);
  return input;
}

function formatSelect(label: string, choices: readonly (readonly [string, string])[], value: string): HTMLSelectElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'sear-number-format-dialog__field';
  wrapper.append(label);
  const select = document.createElement('select');
  select.setAttribute('aria-label', label);
  choices.forEach(([key, text]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = text;
    select.append(option);
  });
  select.value = value;
  wrapper.append(select);
  return select;
}

function formatCheckbox(label: string, checked: boolean): HTMLInputElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'sear-number-format-dialog__check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  wrapper.append(input, label);
  return input;
}
