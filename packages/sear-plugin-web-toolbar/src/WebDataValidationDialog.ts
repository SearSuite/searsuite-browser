import { type Platform } from '@searsuite/sear-foundation-platform';
import { type IFormulaParser } from '@searsuite/sear-domain-formula-engine';
import { FormulaParser } from '@searsuite/sear-domain-formula-engine-ts';
import { WebControlEventScope } from './WebControlEventScope';
import { SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';
import {
  ClearDataValidationRulesCommand,
  DataValidationDropdownMode,
  DataValidationInputPolicy,
  DataValidationKind,
  DataValidationOperator,
  DataValidationTextMode,
  hasIntegerSolution,
  parseDataValidationDate,
  ReadDataValidationRulesQuery,
  RemoveDataValidationRuleCommand,
  SetDataValidationRuleCommand,
  type DataValidationCondition,
  type DataValidationRule,
  type PositionedDataValidationRule,
} from '@searsuite/sear-plugin-data-validation';

type Selection = { anchor: [number, number]; focus: [number, number] };

export const dataValidationKindLabels: Readonly<Record<DataValidationKind, string>> = {
  [DataValidationKind.Dropdown]: 'Dropdown',
  [DataValidationKind.Number]: 'Number',
  [DataValidationKind.Date]: 'Date',
  [DataValidationKind.Text]: 'Text content/length',
  [DataValidationKind.Person]: 'People',
  [DataValidationKind.Checkbox]: 'Checkbox',
  [DataValidationKind.Progress]: 'Progress bar',
  [DataValidationKind.Rating]: 'Rating',
  [DataValidationKind.Document]: 'Online document',
  [DataValidationKind.Link]: 'Link',
  [DataValidationKind.Image]: 'Image in cell',
  [DataValidationKind.Attachment]: 'Attachment',
  [DataValidationKind.IdentityCard]: 'ID number',
  [DataValidationKind.Phone]: 'Mobile number',
  [DataValidationKind.Formula]: 'Custom formula',
};
const comparisonLabels: Readonly<Partial<Record<DataValidationOperator, string>>> = {
  [DataValidationOperator.Equal]: 'Equal to',
  [DataValidationOperator.NotEqual]: 'Not equal to',
  [DataValidationOperator.Greater]: 'Greater than',
  [DataValidationOperator.GreaterOrEqual]: 'Greater than or equal to',
  [DataValidationOperator.Less]: 'Less than',
  [DataValidationOperator.LessOrEqual]: 'Less than or equal to',
  [DataValidationOperator.Between]: 'Between',
  [DataValidationOperator.NotBetween]: 'Not between',
};
const textLabels: Readonly<Partial<Record<DataValidationOperator, string>>> = {
  [DataValidationOperator.StartsWith]: 'Starts with',
  [DataValidationOperator.EndsWith]: 'Ends with',
  [DataValidationOperator.Contains]: 'Contains',
  [DataValidationOperator.NotContains]: 'Does not contain',
};

function defaultErrorMessage(kind: DataValidationKind): string {
  if (kind === DataValidationKind.Dropdown) return 'Invalid input. Choose an option from the dropdown.';
  return kind === DataValidationKind.IdentityCard ? 'Invalid input. Enter a valid ID number.' : 'Invalid input.';
}

/** Web host editor for the feature-owned validation rules. */
export class WebDataValidationDialog {
  readonly #commands: SheetCommandBus;
  readonly #queries: SheetQueryRegistry;
  readonly #getSelection: () => Selection | null;
  readonly #platform: Platform;
  readonly #getSelections: () => Selection[];
  readonly #canEvaluateKind: (kind: DataValidationKind) => boolean;
  readonly #formulaParser: Pick<IFormulaParser, 'parse'>;

  readonly #controls: WebControlEventScope;
  #root: HTMLElement | null = null;

  public constructor(
    commands: SheetCommandBus,
    queries: SheetQueryRegistry,
    getSelection: () => Selection | null,
    platform: Platform,
    getSelections: () => Selection[] = () => [this.#getSelection()].filter((range): range is Selection => !!range),
    canEvaluateKind: (kind: DataValidationKind) => boolean = () => true,
    formulaParser: Pick<IFormulaParser, 'parse'> = new FormulaParser(),
  ) {
    this.#commands = commands;
    this.#queries = queries;
    this.#getSelection = getSelection;
    this.#platform = platform;
    this.#getSelections = getSelections;
    this.#canEvaluateKind = canEvaluateKind;
    this.#formulaParser = formulaParser;
    this.#controls = new WebControlEventScope(platform);
  }

  public destroy(): void {
    this.#controls.clear();
    this.#root?.remove();
    this.#root = null;
  }

  public openCreate(
    initialKind: DataValidationKind = DataValidationKind.Dropdown,
    existing?: PositionedDataValidationRule,
    onCancel?: () => void,
  ): void {
    const selections = existing ? [] : this.#getSelections();
    const selection = selections.at(-1) ?? this.#getSelection();
    if (!selection && !existing) return;
    this.destroy();
    const { root, panel } = this.#createShell(existing ? 'Edit data validation' : 'Data validation');
    const tabs = document.createElement('div');
    tabs.className = 'sear-validation-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Data validation settings');
    const settingsTab = button('Settings');
    const messagesTab = button('Input messages and warnings');
    tabs.append(settingsTab, messagesTab);
    const settings = document.createElement('div');
    settings.className = 'sear-validation-fields';
    const messages = document.createElement('div');
    messages.className = 'sear-validation-fields';
    const tabId = this.#platform.createId('data-validation-tab');
    const tabButtons = [settingsTab, messagesTab];
    const panels = [settings, messages];
    tabButtons.forEach((tab, index) => {
      tab.id = `${tabId}-${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `${tabId}-panel-${index}`);
      panels[index]!.id = `${tabId}-panel-${index}`;
      panels[index]!.setAttribute('role', 'tabpanel');
      panels[index]!.setAttribute('aria-labelledby', tab.id);
    });
    const activateTab = (active: number, focus = false): void => {
      tabButtons.forEach((tab, index) => {
        const selected = index === active;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[index]!.hidden = !selected;
      });
      if (focus) tabButtons[active]!.focus();
    };
    activateTab(0);
    tabButtons.forEach((tab, index) => {
      this.#controls.listen(tab, 'click', () => activateTab(index));
      this.#controls.listen(tab, 'keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        event.stopPropagation();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabButtons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
        activateTab(next, true);
      });
    });
    const selectedRange = existing
      ? {
          anchor: [existing.row, existing.column] as [number, number],
          focus: [existing.rule.endRow, existing.rule.endColumn] as [number, number],
        }
      : selection!;
    const range = input('Cell range', existing
      ? formatRange(selectedRange.anchor, selectedRange.focus)
      : selections.map((item) => formatRange(item.anchor, item.focus)).join(', '), this.#controls);
    settings.append(field('Cell range', range));
    const kind = select('Rule type', dataValidationKindLabels, existing?.rule.condition.kind ?? initialKind);
    for (const option of Array.from(kind.options)) {
      if (this.#canEvaluateKind(option.value as DataValidationKind)) continue;
      option.disabled = true;
      option.textContent += ' (validator unavailable)';
    }
    settings.append(field('Rule type', kind));
    const conditionFields = document.createElement('div');
    conditionFields.className = 'sear-validation-fields';
    settings.append(conditionFields);
    const conditionDrafts = new Map<DataValidationKind, {
      host: HTMLElement;
      read: () => DataValidationCondition | null;
    }>();
    let activeKind: DataValidationKind | null = null;
    const showCondition = (): (() => DataValidationCondition | null) => {
      if (activeKind !== null) {
        conditionDrafts.get(activeKind)!.host.append(...Array.from(conditionFields.childNodes));
      }
      const selectedKind = kind.value as DataValidationKind;
      let draft = conditionDrafts.get(selectedKind);
      if (!draft) {
        const host = document.createElement('div');
        const read = this.#renderConditionFields(
          host,
          selectedKind,
          existing?.rule.condition.kind === selectedKind ? existing.rule.condition : undefined,
        );
        draft = { host, read };
        conditionDrafts.set(selectedKind, draft);
      }
      conditionFields.append(...Array.from(draft.host.childNodes));
      activeKind = selectedKind;
      return draft.read;
    };
    let getCondition = showCondition();
    this.#controls.listen(kind, 'change', () => {
      kind.setCustomValidity('');
      const previousDefault = defaultErrorMessage(kind.dataset['previousKind'] as DataValidationKind);
      if (errorMessage.value === previousDefault)
        errorMessage.value = defaultErrorMessage(kind.value as DataValidationKind);
      kind.dataset['previousKind'] = kind.value;
      getCondition = showCondition();
    });
    kind.dataset['previousKind'] = kind.value;

    const policy = select(
      'When input is invalid',
      {
        [DataValidationInputPolicy.Reject]: 'Reject input and warn',
        [DataValidationInputPolicy.Warn]: 'Allow input and warn',
      },
      existing?.rule.inputPolicy ?? DataValidationInputPolicy.Reject,
    );
    const errorMessage = input(
      'Warning message',
      existing?.rule.errorMessage ?? defaultErrorMessage(kind.value as DataValidationKind),
      this.#controls,
    );
    const promptEnabled = checkbox('Show input message when selected', !!existing?.rule.inputMessage);
    const inputMessage = input('Input message', existing?.rule.inputMessage ?? '', this.#controls);
    inputMessage.disabled = !promptEnabled.checked;
    this.#controls.listen(promptEnabled, 'change', () => {
      inputMessage.disabled = !promptEnabled.checked;
      inputMessage.setCustomValidity('');
    });
    messages.append(
      field('When input is invalid', policy),
      field('Warning message', errorMessage),
      promptEnabled.closest('label')!,
      field('Input message', inputMessage),
    );

    const actions = document.createElement('div');
    actions.className = 'sear-cell-highlight-actions';
    const cancel = button('Cancel');
    this.#controls.listen(cancel, 'click', () => onCancel ? onCancel() : this.destroy());
    const save = button('OK');
    save.dataset['role'] = 'confirm';
    this.#controls.listen(save, 'click', () => {
      const parsed = range.value.split(',').map((part) => parseRange(part.trim()));
      if (!parsed.length || parsed.some((part) => !part)) {
        range.setCustomValidity('Enter a valid cell range.');
        range.reportValidity();
        return;
      }
      const shape = this.#sheetShape();
      if (shape && parsed.some((part) => part!.focus[0] >= shape[0]! || part!.focus[1] >= shape[1]!)) {
        range.setCustomValidity('Cell range exceeds the sheet bounds.');
        range.reportValidity();
        return;
      }
      if (!this.#canEvaluateKind(kind.value as DataValidationKind)) {
        activateTab(0);
        kind.setCustomValidity('The host has no validator for this rule type. Choose another type.');
        kind.reportValidity();
        return;
      }
      const condition = getCondition();
      if (!condition) return;
      if (!errorMessage.value.trim()) {
        activateTab(1);
        errorMessage.setCustomValidity('Enter a warning message.');
        errorMessage.reportValidity();
        return;
      }
      if (promptEnabled.checked && !inputMessage.value.trim()) {
        activateTab(1);
        inputMessage.setCustomValidity('Enter an input message.');
        inputMessage.reportValidity();
        return;
      }
      const rule: Omit<DataValidationRule, 'id' | 'endRow' | 'endColumn'> = {
        condition,
        inputPolicy: policy.value as DataValidationInputPolicy,
        ...(errorMessage.value ? { errorMessage: errorMessage.value } : {}),
        ...(promptEnabled.checked && inputMessage.value ? { inputMessage: inputMessage.value } : {}),
      };
      try {
        for (const target of parsed) this.#commands.run(SetDataValidationRuleCommand, {
          ...target!, rule,
          ...(existing ? { id: existing.rule.id } : {}),
        });
        this.destroy();
      } catch (cause) {
        let error = panel.querySelector<HTMLElement>('[role="alert"]');
        if (!error) {
          error = document.createElement('p');
          error.setAttribute('role', 'alert');
          panel.append(error);
        }
        error.textContent = cause instanceof Error ? cause.message : String(cause);
      }
    });
    if (existing && initialKind === DataValidationKind.Dropdown) {
      const removeList = button('Remove list');
      this.#controls.listen(removeList, 'click', () => {
        this.#commands.run(RemoveDataValidationRuleCommand, { id: existing.rule.id });
        this.destroy();
      });
      actions.append(removeList);
    }
    actions.append(cancel, save);
    panel.append(tabs, settings, messages, actions);
    document.body.appendChild(root);
    range.focus();
  }

  public openManage(state: { scope: 'selection' | 'sheet'; scrollTop: number } = { scope: 'selection', scrollTop: 0 }): void {
    this.destroy();
    const { root, panel } = this.#createShell('All data validation rules');
    const scope = select<'selection' | 'sheet'>('Scope', { selection: 'Selection', sheet: 'Current sheet' }, state.scope);
    const list = document.createElement('div');
    list.className = 'sear-cell-highlight-list';
    const render = () => {
      this.#controls.release(list);
      list.replaceChildren();
      const selection = this.#getSelection();
      const bounds = selection && parseRange(formatRange(selection.anchor, selection.focus));
      const rules = this.#queries
        .run(ReadDataValidationRulesQuery, void 0)
        .filter(
          ({ row, column, rule }) =>
            scope.value === 'sheet' ||
            (bounds &&
              row <= bounds.focus[0] &&
              column <= bounds.focus[1] &&
              rule.endRow >= bounds.anchor[0] &&
              rule.endColumn >= bounds.anchor[1]),
        );
      if (!rules.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No rules';
        list.append(empty);
      }
      for (const entry of rules) {
        const row = document.createElement('div');
        row.className = 'sear-cell-highlight-rule';
        const title = document.createElement('span');
        const kindLabel = dataValidationKindLabels[entry.rule.condition.kind];
        const rangeLabel = formatRange(
          [entry.row, entry.column],
          [entry.rule.endRow, entry.rule.endColumn],
        );
        const condition = entry.rule.condition;
        const sourceLabel = condition.kind === DataValidationKind.Dropdown
          ? condition.sourceRange
            ? `Range reference ${formatRange(condition.sourceRange.start, condition.sourceRange.end)}`
            : `Custom options ${condition.options?.slice(0, 2).map((option) => option.label).join(', ') || 'none'}${
              (condition.options?.length ?? 0) > 2 ? ` (${condition.options!.length} total)` : ''}`
          : '';
        title.textContent = `${kindLabel} · ${rangeLabel}${sourceLabel ? `\n${sourceLabel}` : ''}`;
        if (sourceLabel) title.className = 'sear-validation-rule-summary';
        const edit = button('Edit');
        edit.setAttribute('aria-label', `Edit ${kindLabel} rule ${rangeLabel}${sourceLabel ? `, ${sourceLabel}` : ''}`);
        this.#controls.listen(edit, 'click', () => {
          const returnState = { scope: scope.value as 'selection' | 'sheet', scrollTop: list.scrollTop };
          this.openCreate(entry.rule.condition.kind, entry, () => this.openManage(returnState));
        });
        const remove = button('Delete');
        remove.setAttribute('aria-label', `Delete ${kindLabel} rule ${rangeLabel}${sourceLabel ? `, ${sourceLabel}` : ''}`);
        this.#controls.listen(remove, 'click', () => {
          this.#commands.run(RemoveDataValidationRuleCommand, { id: entry.rule.id });
          render();
        });
        row.append(title, edit, remove);
        list.append(row);
      }
    };
    this.#controls.listen(scope, 'change', render);
    const actions = document.createElement('div');
    actions.className = 'sear-cell-highlight-actions';
    const clear = button('Clear current selection');
    this.#controls.listen(clear, 'click', () => {
      const range = this.#getSelection();
      if (range) {
        this.#commands.run(ClearDataValidationRulesCommand, { range });
        render();
      }
    });
    const create = button('New rule');
    this.#controls.listen(create, 'click', () => this.openCreate());
    actions.append(clear, create);
    panel.append(scope, list, actions);
    document.body.appendChild(root);
    render();
    list.scrollTop = state.scrollTop;
  }

  #sheetShape(): readonly number[] | null {
    return this.#queries.has?.(ReadSheetCellDataQuery)
      ? this.#queries.run(ReadSheetCellDataQuery, void 0).shape : null;
  }

  #renderConditionFields(
    host: HTMLElement,
    kind: DataValidationKind,
    previous?: DataValidationCondition,
  ): () => DataValidationCondition | null {
    host.replaceChildren();
    if (kind === DataValidationKind.Dropdown) return this.#renderDropdown(host, previous);
    if (kind === DataValidationKind.Number || kind === DataValidationKind.Date || kind === DataValidationKind.Text) {
      return this.#renderComparison(host, kind, previous);
    }
    if (kind === DataValidationKind.Formula) {
      const formula = input('Custom formula', previous?.formula ?? '=', this.#controls);
      host.append(field('Custom formula', formula));
      return () => {
        const source = formula.value.trim();
        if (source === '=') {
          formula.setCustomValidity('Enter a formula.');
        } else {
          try {
            this.#formulaParser.parse(source);
            formula.setCustomValidity('');
          } catch {
            formula.setCustomValidity('Invalid formula syntax.');
          }
        }
        if (!formula.checkValidity()) {
          formula.focus();
          formula.reportValidity();
          return null;
        }
        return { kind, formula: source };
      };
    }
    return () => ({ kind });
  }

  #renderDropdown(host: HTMLElement, previous?: DataValidationCondition): () => DataValidationCondition | null {
    const mode = select(
      'Selection mode',
      {
        [DataValidationDropdownMode.Single]: 'Single selection',
        [DataValidationDropdownMode.Multiple]: 'Multiple selection',
      },
      previous?.dropdownMode ?? DataValidationDropdownMode.Single,
    );
    const source = select(
      'Option source',
      { custom: 'Custom', range: 'Range reference' },
      previous?.sourceRange ? 'range' : 'custom',
    );
    const options = document.createElement('div');
    options.className = 'sear-validation-options';
    const add = button('Add option');
    const colorEnabled = checkbox('Option colors', !!previous?.options?.some((option) => option.color));
    const arrow = checkbox('Show dropdown arrow', previous?.showDropdownArrow !== false);
    const reference = input(
      'Reference range',
      previous?.sourceRange ? formatRange(previous.sourceRange.start, previous.sourceRange.end) : '',
      this.#controls,
    );
    const updateOptionNames = () => {
      Array.from(options.children).forEach((element, index) => {
        const row = element as HTMLElement;
        const text = row.querySelector<HTMLInputElement>('[data-role="validation-option-text"]')!;
        const swatch = row.querySelector<HTMLInputElement>('input[type="color"]')!;
        const remove = row.querySelector<HTMLButtonElement>('[data-role="validation-option-remove"]')!;
        const position = index + 1;
        const name = text.value.trim();
        const target = `Option ${position}${name ? ` (${name})` : ''}`;
        text.setAttribute('aria-label', `Option ${position}${name ? `: ${name}` : ''}`);
        swatch.setAttribute('aria-label', `${target} color`);
        remove.setAttribute('aria-label', `Remove ${target}`);
        remove.title = `Remove ${target}`;
      });
    };
    const addOption = (label = '', color = '#d6e8ff') => {
      const row = document.createElement('div');
      row.className = 'sear-validation-option';
      const text = input('Option', label, this.#controls);
      text.dataset['role'] = 'validation-option-text';
      this.#controls.listen(text, 'input', () => {
        text.setCustomValidity('');
        updateOptionNames();
      });
      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.value = color;
      const remove = button('×');
      remove.dataset['role'] = 'validation-option-remove';
      this.#controls.listen(remove, 'click', () => {
        if (options.childElementCount === 1) {
          text.value = '';
          text.setCustomValidity('Add an option.');
          updateOptionNames();
          text.reportValidity();
          return;
        }
        this.#controls.release(row);
        row.remove();
        updateOptionNames();
      });
      const up = button('↑');
      up.setAttribute('aria-label', 'Move option up');
      const down = button('↓');
      down.setAttribute('aria-label', 'Move option down');
      this.#controls.listen(up, 'click', () => {
        if (row.previousElementSibling) {
          options.insertBefore(row, row.previousElementSibling);
          updateOptionNames();
        }
      });
      this.#controls.listen(down, 'click', () => {
        if (row.nextElementSibling) {
          options.insertBefore(row.nextElementSibling, row);
          updateOptionNames();
        }
      });
      row.append(text, swatch, up, down, remove);
      options.append(row);
      swatch.hidden = !colorEnabled.checked;
      updateOptionNames();
    };
    (previous?.options?.length ? previous.options : [{ label: '' }, { label: '' }]).forEach((option) =>
      addOption(option.label, option.color),
    );
    this.#controls.listen(add, 'click', () => addOption());
    this.#controls.listen(colorEnabled, 'change', () => {
      options.querySelectorAll<HTMLInputElement>('input[type="color"]').forEach((swatch) => {
        swatch.hidden = !colorEnabled.checked;
      });
    });
    const updateSource = () => {
      options.hidden = add.hidden = colorEnabled.closest('label')!.hidden = source.value === 'range';
      reference.closest('label')!.hidden = source.value !== 'range';
    };
    this.#controls.listen(source, 'change', updateSource);
    host.append(
      field('Selection mode', mode),
      field('Option source', source),
      field('Reference range', reference),
      options,
      add,
      colorEnabled.closest('label')!,
      arrow.closest('label')!,
    );
    updateSource();
    return () => {
      const sourceRange = source.value === 'range' ? parseRange(reference.value) : null;
      if (source.value === 'range' && !sourceRange) {
        reference.setCustomValidity('Enter a valid reference range.');
        reference.reportValidity();
        return null;
      }
      const shape = sourceRange && this.#sheetShape();
      if (sourceRange && shape &&
        (sourceRange.focus[0] >= shape[0]! || sourceRange.focus[1] >= shape[1]!)) {
        reference.setCustomValidity('Reference range exceeds the sheet bounds.');
        reference.reportValidity();
        return null;
      }
      const values = Array.from(options.querySelectorAll<HTMLInputElement>('[data-role="validation-option-text"]')).filter(
        (item) => item.value.trim() !== '',
      );
      if (source.value === 'custom' && !values.length) {
        options.querySelector<HTMLInputElement>('input')?.setCustomValidity('Add an option.');
        options.querySelector<HTMLInputElement>('input')?.reportValidity();
        return null;
      }
      if (source.value === 'custom') {
        const seen = new Set<string>();
        for (const item of values) {
          const label = item.value.trim();
          if (seen.has(label)) {
            item.setCustomValidity('Options must be unique.');
            item.reportValidity();
            return null;
          }
          seen.add(label);
        }
      }
      return {
        kind: DataValidationKind.Dropdown,
        dropdownMode: mode.value as DataValidationDropdownMode,
        showDropdownArrow: arrow.checked,
        ...(sourceRange
          ? { sourceRange: { start: sourceRange.anchor, end: sourceRange.focus } }
          : {
              options: values.map((item) => ({
                label: item.value,
                ...(colorEnabled.checked
                  ? { color: item.parentElement!.querySelector<HTMLInputElement>('input[type="color"]')!.value }
                  : {}),
              })),
            }),
      };
    };
  }

  #renderComparison(
    host: HTMLElement,
    kind: DataValidationKind,
    previous?: DataValidationCondition,
  ): () => DataValidationCondition | null {
    const textMode =
      kind === DataValidationKind.Text
        ? select(
            'Validate',
            { [DataValidationTextMode.Content]: 'Content', [DataValidationTextMode.Length]: 'Length' },
            previous?.textMode ?? DataValidationTextMode.Content,
          )
        : null;
    const integer = kind === DataValidationKind.Number ? checkbox('Whole numbers only', !!previous?.integerOnly) : null;
    const limited = kind !== DataValidationKind.Text ? checkbox('Limit range', !!previous?.operator) : null;
    const operator = select(
      'Condition',
      kind === DataValidationKind.Text && textMode?.value !== DataValidationTextMode.Length
        ? textLabels
        : comparisonLabels,
      previous?.operator ??
        (kind === DataValidationKind.Text ? DataValidationOperator.StartsWith : DataValidationOperator.Equal),
    );
    const first = input('Comparison value', previous?.value ?? '', this.#controls);
    const second = input('Second comparison value', previous?.secondValue ?? '', this.#controls);
    const firstDatePicker = kind === DataValidationKind.Date
      ? datePicker('Choose comparison date', first, this.#controls) : null;
    const secondDatePicker = kind === DataValidationKind.Date
      ? datePicker('Choose second comparison date', second, this.#controls) : null;
    if (kind === DataValidationKind.Date) {
      const hint = document.createElement('p');
      hint.className = 'sear-validation-date-hint';
      hint.textContent = 'Cell date formats: YYYY-MM-DD, YYYY/M/D, or Chinese year-month-day notation';
      host.append(hint);
    }
    const update = () => {
      const content = kind === DataValidationKind.Text && textMode?.value === DataValidationTextMode.Content;
      const labels = content ? textLabels : comparisonLabels;
      const current = operator.value;
      operator.replaceChildren(
        ...Object.entries(labels).map(([value, label]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          return option;
        }),
      );
      operator.value = Object.hasOwn(labels, current)
        ? current
        : content
        ? DataValidationOperator.StartsWith
        : DataValidationOperator.Equal;
      const visible = kind === DataValidationKind.Text || !!limited?.checked;
      operator.closest('label')!.hidden = !visible;
      first.closest('label')!.hidden = !visible;
      if (firstDatePicker) firstDatePicker.closest('label')!.hidden = !visible;
      second.closest('label')!.hidden =
        !visible ||
        (operator.value !== DataValidationOperator.Between && operator.value !== DataValidationOperator.NotBetween);
      if (secondDatePicker) secondDatePicker.closest('label')!.hidden = second.closest('label')!.hidden;
    };
    if (textMode) this.#controls.listen(textMode, 'change', update);
    if (limited) this.#controls.listen(limited, 'change', update);
    this.#controls.listen(operator, 'change', update);
    host.append(
      ...[
        textMode && field('Validate', textMode),
        integer?.closest('label'),
        limited?.closest('label'),
        field('Condition', operator),
        field('Comparison value', first),
        firstDatePicker && field('Choose comparison date', firstDatePicker),
        field('Second comparison value', second),
        secondDatePicker && field('Choose second comparison date', secondDatePicker),
      ].filter((node): node is HTMLLabelElement => !!node),
    );
    update();
    return () => {
      const active = kind === DataValidationKind.Text || !!limited?.checked;
      if (active && !first.value.trim()) {
        first.setCustomValidity('Enter a comparison value.');
        first.reportValidity();
        return null;
      }
      if (active && !second.closest('label')!.hidden && !second.value.trim()) {
        second.setCustomValidity('Enter a second comparison value.');
        second.reportValidity();
        return null;
      }
      if (active && kind === DataValidationKind.Number) {
        const firstNumber = Number(first.value);
        if (!Number.isFinite(firstNumber)) {
          first.setCustomValidity('Enter a valid number.');
          first.reportValidity();
          return null;
        }
        const hasSecond = !second.closest('label')!.hidden;
        const secondNumber = hasSecond ? Number(second.value) : undefined;
        if (hasSecond) {
          if (!Number.isFinite(secondNumber)) {
            second.setCustomValidity('Enter a valid number.');
            second.reportValidity();
            return null;
          }
          if (firstNumber > secondNumber!) {
            second.setCustomValidity('The upper bound cannot be less than the lower bound.');
            second.reportValidity();
            return null;
          }
        }
        if (integer?.checked && !hasIntegerSolution(operator.value as DataValidationOperator, firstNumber, secondNumber)) {
          const invalid = hasSecond ? second : first;
          invalid.setCustomValidity('No whole number satisfies this rule.');
          invalid.reportValidity();
          return null;
        }
      }
      if (active && kind === DataValidationKind.Date) {
        const firstDate = parseDataValidationDate(first.value);
        if (firstDate === null) {
          first.setCustomValidity('Enter a valid date (YYYY-MM-DD or YYYY/M/D).');
          first.reportValidity();
          return null;
        }
        if (!second.closest('label')!.hidden) {
          const secondDate = parseDataValidationDate(second.value);
          if (secondDate === null) {
            second.setCustomValidity('Enter a valid date (YYYY-MM-DD or YYYY/M/D).');
            second.reportValidity();
            return null;
          }
          if (firstDate > secondDate) {
            second.setCustomValidity('The upper bound cannot be less than the lower bound.');
            second.reportValidity();
            return null;
          }
        }
      }
      if (kind === DataValidationKind.Text && textMode?.value === DataValidationTextMode.Length) {
        const validLength = (value: string) => /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
        if (!validLength(first.value)) {
          first.setCustomValidity('Enter a nonnegative integer.');
          first.reportValidity();
          return null;
        }
        if (!second.closest('label')!.hidden && !validLength(second.value)) {
          second.setCustomValidity('Enter a nonnegative integer.');
          second.reportValidity();
          return null;
        }
      }
      return {
        kind,
        ...(integer ? { integerOnly: integer.checked } : {}),
        ...(textMode ? { textMode: textMode.value as DataValidationTextMode } : {}),
        ...(active
          ? {
              operator: operator.value as DataValidationOperator,
              value: first.value.trim(),
              ...(!second.closest('label')!.hidden ? { secondValue: second.value.trim() } : {}),
            }
          : {}),
      };
    };
  }

  #createShell(title: string): { root: HTMLElement; panel: HTMLElement } {
    const root = document.createElement('div');
    root.className = 'sear-cell-highlight-overlay';
    const panel = document.createElement('div');
    panel.className = 'sear-cell-highlight-panel sear-validation-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    const heading = document.createElement('h2');
    heading.textContent = title;
    const close = button('×');
    close.className = 'sear-cell-highlight-close';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close');
    this.#controls.listen(close, 'click', () => this.destroy());
    this.#controls.listen(root, 'click', (event) => {
      if (event.target === root) this.destroy();
    });
    this.#controls.listen(root, 'keydown', (event) => {
      if (event.key === 'Escape') this.destroy();
    });
    panel.append(heading, close);
    root.append(panel);
    this.#root = root;
    return { root, panel };
  }
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  return element;
}
function input(label: string, value: string, events: WebControlEventScope): HTMLInputElement {
  const element = document.createElement('input');
  element.value = value;
  element.setAttribute('aria-label', label);
  events.listen(element, 'input', () => element.setCustomValidity(''));
  return element;
}
function datePicker(label: string, textInput: HTMLInputElement, events: WebControlEventScope): HTMLInputElement {
  const picker = document.createElement('input');
  picker.type = 'date';
  picker.setAttribute('aria-label', label);
  const syncPicker = () => {
    const date = parseDataValidationDate(textInput.value);
    picker.value = date === null ? '' : new Date(date).toISOString().slice(0, 10);
  };
  syncPicker();
  events.listen(textInput, 'input', syncPicker);
  events.listen(picker, 'change', () => {
    textInput.value = picker.value;
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return picker;
}
function checkbox(label: string, checked: boolean): HTMLInputElement {
  const element = document.createElement('input');
  element.type = 'checkbox';
  element.checked = checked;
  const wrapper = document.createElement('label');
  wrapper.append(element, label);
  return element;
}
function select<T extends string>(
  label: string,
  labels: Readonly<Partial<Record<T, string>>>,
  value: T,
): HTMLSelectElement {
  const element = document.createElement('select');
  element.setAttribute('aria-label', label);
  for (const [key, text] of Object.entries(labels)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = text as string;
    element.append(option);
  }
  element.value = value;
  return element;
}
function field(label: string, control: HTMLElement): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'sear-validation-field';
  const title = document.createElement('span');
  title.textContent = label;
  wrapper.append(title, control);
  return wrapper;
}
function columnName(column: number): string {
  let value = column + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}
function formatRange(anchor: readonly [number, number], focus: readonly [number, number]): string {
  return (
    `${columnName(Math.min(anchor[1], focus[1]))}${Math.min(anchor[0], focus[0]) + 1}:` +
    `${columnName(Math.max(anchor[1], focus[1]))}${Math.max(anchor[0], focus[0]) + 1}`
  );
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
