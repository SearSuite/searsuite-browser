import type { FormulaInputAssistState } from '@searsuite/sear-plugin-cell-editor';

type FormulaSuggestion = FormulaInputAssistState['suggestions'][number];
type FormulaParameter = NonNullable<FormulaInputAssistState['signature']>['descriptor']['parameters'][number];

const chineseSummaries: Readonly<Record<string, string>> = {
  ABS: '返回数字的绝对值。',
  AVERAGE: '返回数字的算术平均值。',
  COUNT: '统计数值的个数。',
  IF: '根据条件返回不同的结果。',
  IFERROR: '发生错误时返回指定的替代值。',
  SUBSTITUTE: '替换匹配的文本，也可以只替换指定的一次。',
  SUBTOTAL: '根据指定的汇总方式计算区域的分类汇总值。',
  SUM: '对数字和区域中的值求和。',
  SUMIF: '对满足一个条件的值求和。',
  SUMIFS: '对同时满足所有条件的值求和。',
  SUMPRODUCT: '将数组中对应的元素相乘，再把乘积求和。',
  SUMSQ: '返回各数值平方的总和。',
  SUMX2MY2: '返回两组对应数值的平方差之和。',
};

export function formulaAssistSummary(suggestion: FormulaSuggestion, locale: string): string | undefined {
  if (!locale.toLowerCase().startsWith('zh')) return suggestion.summary;
  if (!suggestion.summary) return undefined;
  const translated = chineseSummaries[suggestion.name.toUpperCase()];
  if (translated) return translated;
  const category = suggestion.category?.replace('Google 兼容', '兼容性').replace('Web', '网络');
  if (category && /[\u3400-\u9fff]/.test(category)) {
    return suggestion.example ? `${category}函数。示例：${suggestion.example}` : `${category}函数。`;
  }
  return '暂无中文函数说明。';
}

export function formulaAssistListLabel(locale: string): string {
  return locale.toLowerCase().startsWith('zh') ? '公式函数' : 'Formula functions';
}

export function formulaAssistParameter(
  functionName: string,
  parameter: FormulaParameter,
  index: number,
  locale: string,
): { name: string; description: string } {
  if (!locale.toLowerCase().startsWith('zh')) return parameter;
  if (functionName === 'SUM' && parameter.name === 'number') {
    return { name: '数值', description: '要相加的数字或单元格区域。' };
  }
  const names: Readonly<Record<string, string>> = {
    number: '数值', value: '值', text: '文本', range: '区域', array: '数组',
    test: '条件', true_value: '为真时的值', false_value: '为假时的值',
    lookup_value: '查找值', lookup_array: '查找区域', return_array: '返回区域',
  };
  const name = names[parameter.name] ?? `参数${index + 1}`;
  return { name, description: `第 ${index + 1} 个参数。` };
}

export function formulaAssistDiagnostic(message: string, locale: string): string {
  if (!locale.toLowerCase().startsWith('zh') || /[\u3400-\u9fff]/.test(message)) return message;
  const min = /^([A-Z][A-Z0-9.]*) requires at least (\d+) arguments?\.$/.exec(message);
  if (min) return `${min[1]} 至少需要 ${min[2]} 个参数。`;
  const max = /^([A-Z][A-Z0-9.]*) accepts at most (\d+) arguments?\.$/.exec(message);
  if (max) return `${max[1]} 最多接受 ${max[2]} 个参数。`;
  const unknown = /^([A-Z][A-Z0-9.]*) is not a registered function\.$/.exec(message);
  if (unknown) return `${unknown[1]} 不是已注册的函数。`;
  const limit = /^Formula exceeds (\d+) (characters|operands|nested functions)$/.exec(message);
  if (limit) {
    const unit = limit[2] === 'characters' ? '字符' : limit[2] === 'operands' ? '个操作数' : '层函数嵌套';
    return `公式不能超过 ${limit[1]} ${unit}。`;
  }
  if (message === 'Missing closing parenthesis') return '缺少右括号。';
  if (message === 'Formula is incomplete') return '公式尚未输入完整。';
  const parserMessage = message.replace(/ at position \d+(?::.*)?$/, '');
  const parserMessages: Readonly<Record<string, string>> = {
    'Unexpected character': '此处有意外字符。',
    'Invalid number': '数字格式无效。',
    "Expected ')'": '此处应输入右括号。',
    "Expected ')' after function arguments": '函数参数后应输入右括号。',
    "Expected '!' after quoted sheet name": '工作表名称后应输入感叹号。',
    'Expected a reference': '此处应输入单元格引用。',
    'Expected cell reference': '此处应输入单元格引用。',
    'Unterminated string literal': '文本缺少结束引号。',
    'Unterminated array constant': '数组常量尚未结束。',
    'Empty array constant': '数组常量不能为空。',
    'Missing array constant value': '数组常量缺少值。',
    "Expected ',', ';' or '}' in array constant": '数组常量中应输入分隔符或右花括号。',
    'Unterminated structured reference': '结构化引用尚未结束。',
    'Unterminated quoted sheet name': '工作表名称缺少结束引号。',
  };
  return parserMessages[parserMessage] ?? message;
}

export function formulaAssistSuggestion(message: string, locale: string): string {
  if (!locale.toLowerCase().startsWith('zh') || /[\u3400-\u9fff]/.test(message)) return message;
  const suggestions: Readonly<Record<string, string>> = {
    'Add a closing parenthesis.': '请补上右括号。',
    'Close the array constant with }.': '请用右花括号结束数组常量。',
    'Enter a cell or range reference.': '请输入单元格或区域引用。',
    'Enter a value between the separators.': '请在分隔符之间输入值。',
    'Check the operator or value at this position.': '请检查此处的运算符或值。',
    'Check the spelling or register the function in this workbook.': '请检查拼写，或在工作簿中注册该函数。',
  };
  return suggestions[message] ?? '请检查公式。';
}
