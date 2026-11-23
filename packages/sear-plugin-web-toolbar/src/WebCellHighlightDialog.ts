import { SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';
import {
  AddCellHighlightRuleCommand, CellHighlightKind, CellHighlightStyle,
  CellHighlightTextOperator, CellHighlightValueOperator, ClearCellHighlightRulesCommand,
  ReadCellHighlightRulesQuery, RemoveCellHighlightRuleCommand, UpdateCellHighlightRuleCommand,
  type CellHighlightCondition, type PositionedCellHighlightRule,
} from '@searsuite/sear-plugin-cell-highlight';
type Selection = { anchor: [number, number]; focus: [number, number] };
export type ConditionalRuleBounds = { top: number; left: number; bottom: number; right: number };
export type ConditionalRuleListRow = { priority: number; node: HTMLElement };
export type ConditionalRuleListExtension = (
  scope: 'selection' | 'sheet', bounds: ConditionalRuleBounds | null, render: () => void,
) => ConditionalRuleListRow[];

const kindLabels: Readonly<Record<CellHighlightKind, string>> = {
  [CellHighlightKind.Value]: 'Cell value', [CellHighlightKind.Text]: 'Specific text',
  [CellHighlightKind.Duplicate]: 'Duplicates', [CellHighlightKind.Unique]: 'Unique values',
  [CellHighlightKind.Empty]: 'Blanks', [CellHighlightKind.NotEmpty]: 'Nonblanks',
  [CellHighlightKind.Error]: 'Errors', [CellHighlightKind.NotError]: 'No errors',
  [CellHighlightKind.Top]: 'Top', [CellHighlightKind.Bottom]: 'Bottom',
  [CellHighlightKind.AboveAverage]: 'Above average', [CellHighlightKind.BelowAverage]: 'Below average',
};
const valueLabels: Readonly<Record<CellHighlightValueOperator, string>> = {
  [CellHighlightValueOperator.Between]: 'Between', [CellHighlightValueOperator.NotBetween]: 'Not between',
  [CellHighlightValueOperator.Equal]: 'Equal to', [CellHighlightValueOperator.NotEqual]: 'Not equal to',
  [CellHighlightValueOperator.Greater]: 'Greater than', [CellHighlightValueOperator.GreaterOrEqual]: 'Greater than or equal to',
  [CellHighlightValueOperator.Less]: 'Less than', [CellHighlightValueOperator.LessOrEqual]: 'Less than or equal to',
};
const textLabels: Readonly<Record<CellHighlightTextOperator, string>> = {
  [CellHighlightTextOperator.StartsWith]: 'Starts with', [CellHighlightTextOperator.EndsWith]: 'Ends with',
  [CellHighlightTextOperator.Contains]: 'Contains', [CellHighlightTextOperator.NotContains]: 'Does not contain',
};
const styleLabels: Readonly<Record<CellHighlightStyle, string>> = {
  [CellHighlightStyle.RedFill]: 'Light red fill', [CellHighlightStyle.YellowFill]: 'Light yellow fill',
  [CellHighlightStyle.GreenFill]: 'Light green fill', [CellHighlightStyle.RedBorder]: 'Red border',
  [CellHighlightStyle.RedText]: 'Red text',
};

/** Host-only editor for plugin-owned conditional highlight rules. */
export class WebCellHighlightDialog {
  private root: HTMLElement | null = null;

  constructor(
    private readonly commands: SheetCommandBus,
    private readonly queries: SheetQueryRegistry,
    private readonly getSelection: () => Selection | null,
    private readonly getSelections: () => Selection[] = () => [this.getSelection()].filter((range): range is Selection => !!range),
    private readonly getAdditionalRules: ConditionalRuleListExtension = () => [],
  ) {}

  public destroy(): void { this.root?.remove(); this.root = null; }

  public openCreate(
    initialCondition: CellHighlightCondition = { kind: CellHighlightKind.Value },
    onCancel?: () => void,
    editing?: PositionedCellHighlightRule,
  ): void {
    const selections = editing ? [{
      anchor: [editing.row, editing.column] as [number, number],
      focus: [editing.rule.endRow, editing.rule.endColumn] as [number, number],
    }] : this.getSelections();
    if (!selections.length) return;
    this.destroy();
    const { root, panel } = this.createShell(editing ? 'Edit rule' : 'New rule', onCancel);
    const kind = this.createSelect(kindLabels, initialCondition.kind, 'highlight-kind');
    kind.setAttribute('aria-label', 'Rule type');
    const range = editing ? document.createElement('input') : null;
    const rangeLabel = range ? document.createElement('label') : null;
    if (range && rangeLabel && editing) {
      range.type = 'text'; range.value = formatRange(editing);
      range.setAttribute('aria-label', 'Apply to range');
      range.addEventListener('input', () => range.setCustomValidity(''));
      rangeLabel.className = 'sear-cell-highlight-range';
      rangeLabel.append('Apply to range', range);
    }
    const details = document.createElement('div');
    details.className = 'sear-cell-highlight-details';
    const style = this.createStylePicker(editing?.rule.style);
    panel.append(kind, ...(rangeLabel ? [rangeLabel] : []), details, style.element);
    const renderDetails = () => {
      details.replaceChildren();
      const selected = kind.value as CellHighlightKind;
      if (selected === CellHighlightKind.Top || selected === CellHighlightKind.Bottom) {
        const count = document.createElement('input');
        count.type = 'number'; count.min = '1'; count.step = '1';
        count.value = selected === initialCondition.kind ? String(initialCondition.count ?? 10) : '10';
        count.dataset['testid'] = 'highlight-count'; count.setAttribute('aria-label', 'Item count');
        const percentLabel = document.createElement('label');
        const percent = document.createElement('input'); percent.type = 'checkbox';
        percent.checked = selected === initialCondition.kind && !!initialCondition.percent;
        percent.dataset['testid'] = 'highlight-percent';
        percent.addEventListener('change', () => { count.max = percent.checked ? '100' : ''; });
        count.max = percent.checked ? '100' : '';
        percentLabel.append(percent, ' Percent');
        details.append(count, percentLabel);
        return;
      }
      if (selected === CellHighlightKind.AboveAverage || selected === CellHighlightKind.BelowAverage) {
        const equalLabel = document.createElement('label');
        const equal = document.createElement('input'); equal.type = 'checkbox';
        equal.checked = selected === initialCondition.kind && !!initialCondition.includeEqual;
        equal.dataset['testid'] = 'highlight-include-equal';
        equalLabel.append(equal, ' Include values equal to average');
        details.append(equalLabel);
        return;
      }
      if (selected !== CellHighlightKind.Value && selected !== CellHighlightKind.Text) return;
      const operator = selected === CellHighlightKind.Value
        ? this.createSelect(valueLabels, selected === initialCondition.kind
          ? initialCondition.operator as CellHighlightValueOperator ?? CellHighlightValueOperator.Between
          : CellHighlightValueOperator.Between, 'highlight-operator')
        : this.createSelect(textLabels, selected === initialCondition.kind
          ? initialCondition.operator as CellHighlightTextOperator ?? CellHighlightTextOperator.Contains
          : CellHighlightTextOperator.Contains, 'highlight-operator');
      operator.setAttribute('aria-label', 'Condition');
      const first = document.createElement('input');
      first.placeholder = selected === CellHighlightKind.Value ? 'Number' : 'Text';
      first.setAttribute('aria-label', selected === CellHighlightKind.Value ? 'Comparison value' : 'Text to match');
      first.dataset['testid'] = 'highlight-value';
      first.value = selected === initialCondition.kind ? initialCondition.value ?? '' : '';
      const second = document.createElement('input');
      second.placeholder = 'Second value';
      second.setAttribute('aria-label', 'Second comparison value');
      second.dataset['testid'] = 'highlight-second-value';
      second.value = selected === initialCondition.kind ? initialCondition.secondValue ?? '' : '';
      for (const input of [first, second]) input.addEventListener('input', () => {
        if (input.value.trim() !== '' && Number.isFinite(Number(input.value))) input.setCustomValidity('');
      });
      const updateSecond = () => { second.hidden = selected !== CellHighlightKind.Value ||
        (operator.value !== CellHighlightValueOperator.Between && operator.value !== CellHighlightValueOperator.NotBetween); };
      operator.addEventListener('change', updateSecond);
      updateSecond();
      details.append(operator, first, second);
    };
    kind.addEventListener('change', renderDetails);
    renderDetails();
    this.addActions(panel, () => {
      const selected = kind.value as CellHighlightKind;
      const operator = details.querySelector<HTMLSelectElement>('select');
      const first = details.querySelector<HTMLInputElement>('[data-testid="highlight-value"]');
      const second = details.querySelector<HTMLInputElement>('[data-testid="highlight-second-value"]');
      const count = details.querySelector<HTMLInputElement>('[data-testid="highlight-count"]');
      const percent = details.querySelector<HTMLInputElement>('[data-testid="highlight-percent"]');
      const includeEqual = details.querySelector<HTMLInputElement>('[data-testid="highlight-include-equal"]');
      const condition: CellHighlightCondition = {
        kind: selected,
        ...(operator ? { operator: operator.value as CellHighlightValueOperator | CellHighlightTextOperator } : {}),
        ...(first ? { value: first.value } : {}),
        ...(second && !second.hidden ? { secondValue: second.value } : {}),
        ...(count ? { count: Number(count.value), percent: !!percent?.checked } : {}),
        ...(includeEqual ? { includeEqual: includeEqual.checked } : {}),
      };
      if (count && (!/^\d+$/.test(count.value) || !Number.isSafeInteger(condition.count) ||
        (condition.count ?? 0) < 1 || (percent?.checked && (condition.count ?? 0) > 100))) {
        count.setCustomValidity('Enter a valid item count or a percentage from 1 to 100.'); count.reportValidity(); return;
      }
      if (selected === CellHighlightKind.Value) {
        if (first && (first.value.trim() === '' || !Number.isFinite(Number(first.value)))) {
          first.setCustomValidity('Enter a valid number.'); first.reportValidity(); return;
        }
        if (second && !second.hidden &&
          (second.value.trim() === '' || !Number.isFinite(Number(second.value)))) {
          second.setCustomValidity('Enter a valid number.'); second.reportValidity(); return;
        }
      }
      if (selected === CellHighlightKind.Text && !first?.value) {
        first?.setCustomValidity('Enter text.'); first?.reportValidity(); return;
      }
      if (editing) {
        const parsed = range ? parseRange(range.value) : null;
        if (!parsed) {
          range?.setCustomValidity('Enter a valid range.'); range?.reportValidity(); return;
        }
        const shape = this.queries.run(ReadSheetCellDataQuery, void 0).shape;
        if (parsed.focus[0] >= shape[0] || parsed.focus[1] >= shape[1]) {
          range?.setCustomValidity('Range exceeds the sheet bounds.'); range?.reportValidity(); return;
        }
        this.commands.run(UpdateCellHighlightRuleCommand, {
          id: editing.rule.id, ...parsed, condition, style: style.getValue(),
        });
        this.destroy();
        onCancel?.();
        return;
      }
      for (const selection of selections)
        this.commands.run(AddCellHighlightRuleCommand, { ...selection, condition, style: style.getValue() });
      this.destroy();
    }, onCancel);
    document.body.appendChild(root);
    firstFocusable(panel)?.focus();
  }

  public openManage(initialScope: 'selection' | 'sheet' = 'selection', initialScrollTop = 0): void {
    this.destroy();
    const { root, panel } = this.createShell('View existing rules');
    const scope = this.createSelect<'selection' | 'sheet'>({ selection: 'Selection', sheet: 'Current sheet' }, initialScope, 'highlight-scope');
    scope.setAttribute('aria-label', 'View scope');
    const list = document.createElement('div');
    list.className = 'sear-cell-highlight-list';
    const render = () => {
      list.replaceChildren();
      const selection = this.getSelection();
      const bounds = selection ? {
        top: Math.min(selection.anchor[0], selection.focus[0]),
        left: Math.min(selection.anchor[1], selection.focus[1]),
        bottom: Math.max(selection.anchor[0], selection.focus[0]),
        right: Math.max(selection.anchor[1], selection.focus[1]),
      } : null;
      const rules = this.queries.run(ReadCellHighlightRulesQuery, void 0).filter(({ row, column, rule }) =>
        scope.value === 'sheet' || (bounds && row <= bounds.bottom && column <= bounds.right &&
          rule.endRow >= bounds.top && rule.endColumn >= bounds.left));
      const additionalRows = this.getAdditionalRules(scope.value as 'selection' | 'sheet', bounds, render);
      if (!rules.length && !additionalRows.length) {
        const empty = document.createElement('p'); empty.textContent = 'No rules'; list.appendChild(empty); return;
      }
      const rows = [...rules.map((entry) => ({ priority: entry.rule.priority, node: this.createRuleRow(entry, render, () => {
        const savedScope = scope.value as 'selection' | 'sheet';
        const savedScrollTop = list.scrollTop;
        this.openCreate(entry.rule.condition, () => this.openManage(savedScope, savedScrollTop), entry);
      }) })),
        ...additionalRows]
        .sort((left, right) => left.priority - right.priority);
      rows.forEach(({ node }) => list.appendChild(node));
    };
    scope.addEventListener('change', render);
    panel.append(scope, list);
    const actions = document.createElement('div');
    actions.className = 'sear-cell-highlight-actions';
    const create = document.createElement('button'); create.type = 'button'; create.textContent = 'New rule';
    create.addEventListener('click', () => {
      const savedScope = scope.value as 'selection' | 'sheet';
      const savedScrollTop = list.scrollTop;
      this.openCreate({ kind: CellHighlightKind.Value }, () => this.openManage(savedScope, savedScrollTop));
    });
    actions.appendChild(create); panel.appendChild(actions);
    document.body.appendChild(root);
    render();
    list.scrollTop = initialScrollTop;
  }

  private createRuleRow(entry: PositionedCellHighlightRule, render: () => void, editRule: () => void): HTMLElement {
    const row = document.createElement('div'); row.className = 'sear-cell-highlight-rule';
    const label = document.createElement('span');
    const condition = entry.rule.condition;
    const amount = condition.kind === CellHighlightKind.Top || condition.kind === CellHighlightKind.Bottom
      ? ` ${condition.count}${condition.percent ? '%' : ' items'}` : '';
    const equality = condition.includeEqual ? ' (including equal)' : '';
    const operator = condition.kind === CellHighlightKind.Value
      ? valueLabels[condition.operator as CellHighlightValueOperator]
      : condition.kind === CellHighlightKind.Text
        ? textLabels[condition.operator as CellHighlightTextOperator] : undefined;
    const comparison = operator && condition.value !== undefined
      ? `${operator} ${condition.value}${condition.secondValue !== undefined ? ` to ${condition.secondValue}` : ''}` : '';
    label.textContent = `${kindLabels[condition.kind]}${amount}${equality}${comparison ? ` · ${comparison}` : ''} · ${formatRange(entry)}`;
    const swatch = document.createElement('span');
    swatch.className = `sear-cell-highlight-swatch ${entry.rule.style}`;
    swatch.title = styleLabels[entry.rule.style];
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '✎';
    const editLabel = `Edit ${kindLabels[condition.kind]} rule${comparison ? ` (${comparison})` : ''} ${formatRange(entry)}`;
    edit.title = editLabel; edit.setAttribute('aria-label', editLabel);
    edit.addEventListener('click', editRule);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
    const removeLabel = `Remove ${kindLabels[condition.kind]} rule${comparison ? ` (${comparison})` : ''} ${formatRange(entry)}`;
    remove.title = removeLabel; remove.setAttribute('aria-label', removeLabel);
    remove.addEventListener('click', () => { this.commands.run(RemoveCellHighlightRuleCommand, { id: entry.rule.id }); render(); });
    row.append(label, swatch, edit, remove);
    return row;
  }

  private createShell(title: string, onDismiss: () => void = () => this.destroy()): { root: HTMLElement; panel: HTMLElement } {
    const root = document.createElement('div'); root.className = 'sear-cell-highlight-overlay';
    const panel = document.createElement('div'); panel.className = 'sear-cell-highlight-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', title);
    const heading = document.createElement('h2'); heading.textContent = title;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'sear-cell-highlight-close';
    close.textContent = '×'; close.title = 'Close'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', onDismiss);
    root.addEventListener('click', (event) => { if (event.target === root) onDismiss(); });
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') onDismiss(); });
    panel.append(heading, close); root.appendChild(panel); this.root = root;
    return { root, panel };
  }

  private createSelect<T extends string>(labels: Readonly<Record<T, string>>, selected: T, testId: string): HTMLSelectElement {
    const select = document.createElement('select'); select.dataset['testid'] = testId;
    for (const [value, label] of Object.entries(labels)) {
      const option = document.createElement('option'); option.value = value; option.textContent = label as string;
      select.appendChild(option);
    }
    select.value = selected;
    return select;
  }

  private createStylePicker(selected: CellHighlightStyle = CellHighlightStyle.RedFill): {
    element: HTMLElement; getValue: () => CellHighlightStyle;
  } {
    const fieldset = document.createElement('fieldset'); fieldset.className = 'sear-cell-highlight-styles';
    const legend = document.createElement('legend'); legend.textContent = 'Fill style'; fieldset.appendChild(legend);
    for (const [style, label] of Object.entries(styleLabels)) {
      const option = document.createElement('label'); option.title = label as string;
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'highlight-style'; input.value = style;
      input.checked = style === selected;
      const swatch = document.createElement('span'); swatch.className = `sear-cell-highlight-swatch ${style}`;
      const text = document.createElement('span'); text.textContent = label as string;
      option.append(input, swatch, text); fieldset.appendChild(option);
    }
    return {
      element: fieldset,
      getValue: () => fieldset.querySelector<HTMLInputElement>('input:checked')!.value as CellHighlightStyle,
    };
  }

  private addActions(panel: HTMLElement, confirm: () => void, onCancel: () => void = () => this.destroy()): void {
    const actions = document.createElement('div'); actions.className = 'sear-cell-highlight-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', onCancel);
    const submit = document.createElement('button'); submit.type = 'button'; submit.textContent = 'OK';
    submit.dataset['role'] = 'confirm'; submit.addEventListener('click', confirm);
    actions.append(cancel, submit); panel.appendChild(actions);
  }
}

function formatRange({ row, column, rule }: PositionedCellHighlightRule): string {
  return `${columnName(column)}${row + 1}:${columnName(rule.endColumn)}${rule.endRow + 1}`;
}

function parseRange(value: string): Selection | null {
  const match = /^([A-Z]+)([1-9]\d*)(?::([A-Z]+)([1-9]\d*))?$/i.exec(value.trim());
  if (!match) return null;
  const column = (letters: string) =>
    [...letters.toUpperCase()].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  const first: [number, number] = [Number(match[2]) - 1, column(match[1]!)];
  const last: [number, number] = [Number(match[4] ?? match[2]) - 1, column(match[3] ?? match[1]!)];
  return {
    anchor: [Math.min(first[0], last[0]), Math.min(first[1], last[1])],
    focus: [Math.max(first[0], last[0]), Math.max(first[1], last[1])],
  };
}

function columnName(column: number): string {
  let value = column + 1;
  let result = '';
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}

function firstFocusable(element: HTMLElement): HTMLElement | null { return element.querySelector('select, input, button'); }
