import { validateExcelCode } from './validateExcelCode';

/** Classifies visible Excel format tokens without treating directives or literals as date letters. */
export function classifyExcelCode(value: string): string {
  if (!validateExcelCode(value)) return 'custom';
  const code = value
    .replace(/"(?:[^"]|"")*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[(?![hms]\])[^\]]*\]/gi, '');
  if (/[Ee][+-]0/.test(code)) return 'scientific';
  if (code.includes('%')) return 'percentage';
  if (/[?0]+\/[?0\d]+/.test(code)) return 'fraction';
  if (/\[[hms]\]/i.test(code) || /h+:|:s+/i.test(code)) return 'time';
  if (/[ymd]{1,4}/i.test(code)) return 'date';
  if (/000[- )(]/.test(code)) return 'special';
  if (/[*_]/.test(code) && /[$¥€£]/.test(code)) return 'accounting';
  if (/[$¥€£]/.test(code)) return 'currency';
  if (!/"/.test(value) && /[#0?]/.test(code) && /^[#0?,.\-+(); ]+$/.test(code)) return 'number';
  return 'custom';
}
