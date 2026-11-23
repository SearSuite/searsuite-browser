import { CellFormats, type CellFormat } from '@searsuite/sear-domain-cell-types';
import { classifyExcelCode } from './classifyExcelCode';

const FORMATS_BY_LABEL: Readonly<Record<string, CellFormat | null>> = {
  Auto: null,
  Text: CellFormats.text,
  Integer: CellFormats.excelCode('0'),
  'Two decimals': CellFormats.excelCode('0.00'),
  'Thousands separator': CellFormats.excelCode('#,##0.00'),
  'Red negatives': CellFormats.excelCode('#,##0.00;[Red]-#,##0.00'),
  'Parenthesized negatives': CellFormats.excelCode('#,##0.00;(#,##0.00)'),
  'Red parenthesized negatives': CellFormats.excelCode('#,##0.00;[Red](#,##0.00)'),
  'Chinese yuan': CellFormats.currency('CNY', 'zh-CN'),
  'US dollar': CellFormats.currency('USD', 'en-US'),
  Euro: CellFormats.currency('EUR', 'de-DE'),
  'Japanese yen': CellFormats.currency('JPY', 'ja-JP'),
  'Yuan with parenthesized negatives': CellFormats.excelCode('¥#,##0.00;(¥#,##0.00)'),
  'Dollar with red negatives': CellFormats.excelCode('$#,##0.00;[Red]-$#,##0.00'),
  'Yuan accounting': CellFormats.excelCode('¥* #,##0.00;(¥* #,##0.00);¥* "-"??'),
  'Dollar accounting': CellFormats.excelCode('$* #,##0.00;($* #,##0.00);$* "-"??'),
  'Euro accounting': CellFormats.excelCode('€* #,##0.00;(€* #,##0.00);€* "-"??'),
  'Accounting without symbol': CellFormats.excelCode('* #,##0.00;(* #,##0.00);* "-"??'),
  'Short date': CellFormats.excelCode('yyyy-m-d'),
  'Slash date': CellFormats.excelCode('yyyy/mm/dd'),
  'Chinese date': CellFormats.excelCode('yyyy"\u5e74"m"\u6708"d"\u65e5"'),
  'English short date': CellFormats.excelCode('[$-409]mmm d, yyyy'),
  'English long date': CellFormats.excelCode('[$-409]dddd, mmmm d, yyyy'),
  'Date with weekday': CellFormats.excelCode('yyyy-mm-dd dddd'),
  '24-hour time': CellFormats.excelCode('hh:mm'),
  '24-hour time with seconds': CellFormats.excelCode('hh:mm:ss'),
  '12-hour time': CellFormats.excelCode('h:mm AM/PM'),
  '12-hour time with seconds': CellFormats.excelCode('h:mm:ss AM/PM'),
  'Date and time': CellFormats.excelCode('yyyy-mm-dd hh:mm'),
  'Elapsed hours': CellFormats.excelCode('[h]:mm:ss'),
  'Elapsed minutes': CellFormats.excelCode('[m]:ss'),
  'Elapsed seconds': CellFormats.excelCode('[s].00'),
  'One-digit denominator': CellFormats.excelCode('# ?/?'),
  'Two-digit denominator': CellFormats.excelCode('# ??/??'),
  'Three-digit denominator': CellFormats.excelCode('# ???/???'),
  'Fixed denominator 2': CellFormats.excelCode('# ?/2'),
  'Fixed denominator 4': CellFormats.excelCode('# ?/4'),
  'Fixed denominator 8': CellFormats.excelCode('# ?/8'),
  'Fixed denominator 16': CellFormats.excelCode('# ??/16'),
  'Fixed denominator 100': CellFormats.excelCode('# ??/100'),
  'Integer percent': CellFormats.excelCode('0%'),
  'Percent, one decimal': CellFormats.excelCode('0.0%'),
  'Percent, two decimals': CellFormats.excelCode('0.00%'),
  'Percent, four decimals': CellFormats.excelCode('0.0000%'),
  'Scientific integer': CellFormats.excelCode('0E+00'),
  'Scientific, one decimal': CellFormats.excelCode('0.0E+00'),
  'Scientific, two decimals': CellFormats.excelCode('0.00E+00'),
  'Scientific, three decimals': CellFormats.excelCode('0.000E+00'),
  'Three-digit exponent': CellFormats.excelCode('0.00E+000'),
  'Five-digit postal code': CellFormats.excelCode('00000'),
  'Nine-digit postal code': CellFormats.excelCode('00000-0000'),
  'Phone number': CellFormats.excelCode('(000) 000-0000'),
  'Social security number': CellFormats.excelCode('000-00-0000'),
  'Chinese mobile number': CellFormats.excelCode('000 0000 0000'),
  Hidden: CellFormats.excelCode(';;;'),
  Thousands: CellFormats.excelCode('0.0,"K"'),
  Millions: CellFormats.excelCode('0.0,,"M"'),
  Weight: CellFormats.excelCode('0.00" kg"'),
  'Conditional colors': CellFormats.excelCode('[Red][<0]0.00;[Blue][>=100]0.00;0.00'),
  'Five-digit identifier': CellFormats.excelCode('00000'),
};

/** Resolves number-format menu choices and their compact toolbar category labels. */
export class CellNumberFormatMenu {
  public static resolve(label: string): CellFormat | null | undefined {
    return FORMATS_BY_LABEL[label];
  }

  public static describe(format: CellFormat | null): string {
    if (format === null || format.kind === 'general') return 'Auto';
    if (format.kind === 'text') return 'Text';
    if (format.kind === 'number') return 'Number';
    if (format.kind === 'percent') return 'Percent';
    if (format.kind === 'currency') return 'Currency';
    if (format.kind === 'date') return 'Date';
    if (format.kind === 'time') return 'Time';
    if (format.kind === 'dateTime') return 'Date and time';
    return describeExcelCode(format.code);
  }
}

function describeExcelCode(code: string): string {
  return {
    scientific: 'Scientific', percentage: 'Percent', fraction: 'Fraction', time: 'Time',
    date: 'Date', special: 'Special', accounting: 'Accounting', currency: 'Currency',
    number: 'Number', custom: 'Custom',
  }[classifyExcelCode(code)] ?? 'Custom';
}
