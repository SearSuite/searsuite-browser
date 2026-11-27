import { SearFormulaBar } from '@searsuite/sear-assembly-plugin';
import { SearCoreSheet } from '@searsuite/sear-assembly-core';
import { SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { Inject, Injectable } from '@searsuite/sear-foundation-di';
import { Platform } from '@searsuite/sear-foundation-platform';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { columnIndexToLabel, columnLabelToIndex } from '@searsuite/sear-foundation-utils';
import {
  CancelCellEditCommand,
  CommitCellEditCommand,
  CycleFormulaReferenceCommand,
  FormulaInputAssistObservation,
  HandleFormulaBarKeyCommand,
  SetFormulaBarDraftCommand,
  SheetFormulaBarObservation,
  StartFormulaBarEditCommand,
  type SheetFormulaBarState,
} from '@searsuite/sear-plugin-cell-editor';
import { EnsureSelectionVisibleCommand, SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { ReadSheetCellDataQuery } from '@searsuite/sear-domain-sheet';
import { TextInput } from '@searsuite/sear-render-input';
import { WebControlEventScope } from './WebControlEventScope';
import { WebSheetAccessibleGrid } from './WebSheetAccessibleGrid';
import { IFormulaRichResultProvider } from '@searsuite/sear-domain-formula-engine';
import { focusWebSheetSurface } from './focusWebSheetSurface';

const CSS = `
.sear-formula-bar{display:flex;align-items:stretch;gap:0;min-height:37px;width:100%;border-top:1px solid #dce2e4;border-bottom:1px solid #cbd4d6;background:#fff;color:#263238;font:13px/1.4 system-ui,sans-serif}
.sear-formula-bar *{box-sizing:border-box}
.sear-formula-bar__name{flex:0 0 92px;min-width:0;padding:0 9px;border:0;border-right:1px solid #dce2e4;outline:none;color:#263238;background:#fff;font:inherit}
.sear-formula-bar__name:focus{box-shadow:inset 0 0 0 2px #277c67}
.sear-formula-bar__controls{display:flex;align-items:center;flex:0 0 auto;min-height:36px;padding:0 5px;gap:2px;border-right:1px solid #e4e9ea}
.sear-formula-bar__button{display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;padding:0;border:0;border-radius:4px;background:transparent;color:#657276;font:16px/1 system-ui,sans-serif;cursor:pointer}
.sear-formula-bar__button:hover{background:#edf3f1;color:#245f50}
.sear-formula-bar__button:focus-visible{outline:2px solid #277c67;outline-offset:1px}
.sear-formula-bar__button[data-role="confirm"]{color:#25745f}
.sear-formula-bar__button[data-role="function"]{font-style:italic;font-family:Georgia,serif;font-weight:700}
.sear-formula-bar__editor{display:flex;align-items:stretch;flex:1 1 auto;min-width:0}
.sear-formula-bar__input{display:block;flex:1 1 auto;width:100%;height:35px;min-height:35px;min-width:0;resize:none;padding:8px 10px 6px;border:0;outline:none;background:transparent;color:#202d30;font:13px/20px system-ui,sans-serif;overflow:auto;white-space:pre-wrap}
.sear-formula-bar__input:focus{box-shadow:inset 0 -2px #277c67}
.sear-formula-bar[data-expanded="true"] .sear-formula-bar__input{height:105px;min-height:105px}
.sear-formula-bar__expand{align-self:flex-start;margin:5px 5px 0 0;font-size:14px}
.sear-formula-bar[data-editing="false"] [data-role="cancel"],.sear-formula-bar[data-editing="false"] [data-role="confirm"]{display:none}
@media(max-width:520px){.sear-formula-bar__name{flex-basis:72px}.sear-formula-bar__controls{padding:0 2px}.sear-formula-bar__input{padding-left:7px}}
`;

function cellLabel(row: number, column: number): string {
  return `${columnIndexToLabel(column)}${row + 1}`;
}

function rangeLabel(state: SheetFormulaBarState): string {
  if (!state.cell) return '';
  const range = state.range;
  if (!range || range.start.every((value, index) => value === range.end[index]))
    return cellLabel(state.cell[0], state.cell[1]);
  return `${cellLabel(range.start[0], range.start[1])}:${cellLabel(range.end[0], range.end[1])}`;
}

export function parseAddress(
  text: string,
  shape: readonly number[]
): { anchor: [number, number]; focus: [number, number] } | null {
  const address = text.trim();
  const columns = /^([A-Z]+):([A-Z]+)$/i.exec(address);
  if (columns) {
    return { anchor: [0, columnLabelToIndex(columns[1])], focus: [shape[0] - 1, columnLabelToIndex(columns[2])] };
  }
  const rows = /^([1-9]\d*):([1-9]\d*)$/.exec(address);
  if (rows) {
    return { anchor: [Number(rows[1]) - 1, 0], focus: [Number(rows[2]) - 1, shape[1] - 1] };
  }
  const match = /^\$?([A-Z]+)\$?([1-9]\d*)(?::\$?([A-Z]+)\$?([1-9]\d*))?$/i.exec(address);
  if (!match) return null;
  const anchor: [number, number] = [Number(match[2]) - 1, columnLabelToIndex(match[1])];
  const focus: [number, number] = [Number(match[4] ?? match[2]) - 1, columnLabelToIndex(match[3] ?? match[1])];
  if (![...anchor, ...focus].every(Number.isSafeInteger)) return null;
  return { anchor, focus };
}

/** Web formula input surface backed by the Sheet editor's own edit session. */
@Injectable()
export class WebFormulaBar extends SearFormulaBar {
  readonly #platform: Platform;
  readonly #commands: SheetCommandBus;
  readonly #queries: SheetQueryRegistry;
  readonly #observations: ObservationRegistry;
  readonly #core: SearCoreSheet;
  readonly #sheetTextInput: TextInput;
  readonly #richResults: IFormulaRichResultProvider | undefined;

  public static readonly symbol = Symbol.for('WebFormulaBar');

  readonly #events: WebControlEventScope;
  #root: HTMLElement | null = null;
  #style: HTMLStyleElement | null = null;
  #nameInput: HTMLInputElement | null = null;
  #textInput: HTMLTextAreaElement | null = null;
  #disposeObservation: (() => void) | null = null;
  #disposeSurfaceResize: (() => void) | null = null;
  #ensureVisibleFrame: number | null = null;
  #state: SheetFormulaBarState | null = null;
  #composing = false;
  #expanded = false;
  #writing = false;
  #barOwnsFocus = false;
  #accessibleGrid: WebSheetAccessibleGrid | null = null;

  public constructor(
    @Inject(Platform.symbol) platform: Platform,
    @Inject(SheetCommandBus.symbol) commands: SheetCommandBus,
    @Inject(SheetQueryRegistry.symbol) queries: SheetQueryRegistry,
    @Inject(ObservationRegistry.symbol) observations: ObservationRegistry,
    @Inject(SearCoreSheet.symbol) core: SearCoreSheet,
    @Inject(TextInput.symbol) sheetTextInput: TextInput,
    @Inject(IFormulaRichResultProvider.symbol) richResults?: IFormulaRichResultProvider
  ) {
    super();
    this.#platform = platform;
    this.#commands = commands;
    this.#queries = queries;
    this.#observations = observations;
    this.#core = core;
    this.#sheetTextInput = sheetTextInput;
    this.#richResults = richResults;
    this.#events = new WebControlEventScope(platform);
  }

  public mount(target: unknown): void {
    this.destroy();
    if (!(target instanceof HTMLElement)) return;
    const style = document.createElement('style');
    style.setAttribute('data-sear-formula-bar', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.#style = style;

    const root = document.createElement('div');
    root.className = 'sear-formula-bar';
    root.dataset['expanded'] = 'false';
    root.dataset['editing'] = 'false';
    const name = document.createElement('input');
    name.className = 'sear-formula-bar__name';
    name.type = 'text';
    name.setAttribute('aria-label', 'Name box');
    name.title = 'Name box';
    root.appendChild(name);
    const controls = document.createElement('div');
    controls.className = 'sear-formula-bar__controls';
    const cancel = this.#button('×', 'Cancel edit', 'cancel');
    const confirm = this.#button('✓', 'Confirm input', 'confirm');
    const functionButton = this.#button('fx', 'Insert formula', 'function');
    controls.append(cancel, confirm, functionButton);
    root.appendChild(controls);
    const editor = document.createElement('div');
    editor.className = 'sear-formula-bar__editor';
    const input = document.createElement('textarea');
    input.className = 'sear-formula-bar__input';
    input.setAttribute('aria-label', 'Formula bar');
    input.setAttribute('rows', '1');
    input.spellcheck = false;
    const expand = this.#button('⌄', 'Expand formula bar', 'expand');
    expand.classList.add('sear-formula-bar__expand');
    editor.append(input, expand);
    root.appendChild(editor);
    target.replaceChildren(root);
    this.#root = root;
    this.#nameInput = name;
    this.#textInput = input;

    this.#events.listen(name, 'keydown', (event) => this.#onNameKeyDown(event));
    this.#events.listen(name, 'blur', () => this.#restoreName());
    this.#events.listen(input, 'focus', () => this.#startEdit());
    this.#events.listen(input, 'input', () => this.#writeDraft());
    this.#events.listen(input, 'select', () => this.#writeSelection());
    this.#events.listen(input, 'compositionstart', () => {
      this.#composing = true;
    });
    this.#events.listen(input, 'compositionend', () => {
      this.#composing = false;
      this.#writeDraft();
    });
    this.#events.listen(input, 'keydown', (event) => this.#onInputKeyDown(event));
    this.#events.listen(cancel, 'click', () => this.#finish(false));
    this.#events.listen(confirm, 'click', () => this.#finish(true));
    this.#events.listen(functionButton, 'click', () => this.#insertFormulaPrefix());
    this.#events.listen(expand, 'click', () => {
      this.#expanded = !this.#expanded;
      if (!this.#expanded && this.#ensureVisibleFrame !== null) {
        this.#platform.cancelAnimationFrame(this.#ensureVisibleFrame);
        this.#ensureVisibleFrame = null;
      }
      root.dataset['expanded'] = String(this.#expanded);
      expand.textContent = this.#expanded ? '⌃' : '⌄';
      expand.title = this.#expanded ? 'Collapse formula bar' : 'Expand formula bar';
      expand.setAttribute('aria-label', expand.title);
      input.focus({ preventScroll: true });
    });
    const surface = this.#core.renderEngine.renderContext.getRoot();
    if (surface instanceof Element) {
      this.#disposeSurfaceResize = this.#platform.observeResize(surface, () => this.#scheduleActiveCellVisibility());
      this.#accessibleGrid = new WebSheetAccessibleGrid(this.#platform.createId('sear-grid'));
      this.#accessibleGrid.mount(surface);
      this.#events.listen(surface, 'mouseup', () => {
        if (this.#barOwnsFocus && this.#state?.editing) input.focus({ preventScroll: true });
        else if (!this.#state?.editing) this.#sheetTextInput.refocus();
      });
    }
    this.#disposeObservation = this.#observations.subscribe(SheetFormulaBarObservation, (state) => this.#render(state));
  }

  public destroy(): void {
    if (this.#ensureVisibleFrame !== null) this.#platform.cancelAnimationFrame(this.#ensureVisibleFrame);
    this.#ensureVisibleFrame = null;
    this.#disposeSurfaceResize?.();
    this.#disposeSurfaceResize = null;
    this.#disposeObservation?.();
    this.#disposeObservation = null;
    this.#events.clear();
    this.#accessibleGrid?.destroy();
    this.#accessibleGrid = null;
    this.#root?.remove();
    this.#style?.remove();
    this.#root = null;
    this.#style = null;
    this.#nameInput = null;
    this.#textInput = null;
    this.#state = null;
    this.#composing = false;
    this.#expanded = false;
    this.#barOwnsFocus = false;
  }

  #scheduleActiveCellVisibility(): void {
    if (!this.#expanded || this.#ensureVisibleFrame !== null || !this.#commands.has(EnsureSelectionVisibleCommand))
      return;
    this.#ensureVisibleFrame = this.#platform.requestAnimationFrame(() => {
      this.#ensureVisibleFrame = null;
      const cell = this.#state?.cell;
      if (!this.#expanded || !cell) return;
      const point: [number, number] = [cell[0], cell[1]];
      this.#commands.run(EnsureSelectionVisibleCommand, { anchor: point, focus: point });
    });
  }

  #button(label: string, title: string, role: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sear-formula-bar__button';
    button.dataset['role'] = role;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.textContent = label;
    return button;
  }

  #render(state: SheetFormulaBarState): void {
    this.#state = state;
    this.#accessibleGrid?.render(
      state,
      this.#queries.has(ReadSheetCellDataQuery) ? this.#queries.run(ReadSheetCellDataQuery, void 0) : null,
      this.#richResults
    );
    if (!this.#root || !this.#nameInput || !this.#textInput) return;
    this.#root.dataset['editing'] = String(state.editing);
    if (!state.editing) this.#barOwnsFocus = false;
    if (document.activeElement !== this.#nameInput) this.#nameInput.value = rangeLabel(state);
    if (this.#composing) return;
    if (this.#textInput.value !== state.text) this.#textInput.value = state.text;
    if (state.editing && document.activeElement === this.#textInput && !this.#writing) {
      this.#textInput.setSelectionRange(state.selectionStart, state.selectionEnd);
    }
  }

  #startEdit(): void {
    this.#barOwnsFocus = true;
    if (!this.#state?.cell || this.#state.editing) return;
    const input = this.#textInput;
    const start = input?.selectionStart ?? 0;
    const end = input?.selectionEnd ?? start;
    this.#commands.run(StartFormulaBarEditCommand, void 0);
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(start, end);
    this.#writeSelection();
  }

  #writeDraft(): void {
    const input = this.#textInput;
    if (!input || this.#composing || !this.#state?.cell) return;
    this.#writing = true;
    try {
      this.#commands.run(SetFormulaBarDraftCommand, {
        text: input.value,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
      });
    } finally {
      this.#writing = false;
    }
  }

  #writeSelection(): void {
    const input = this.#textInput;
    if (!input || this.#composing || !this.#state?.editing || this.#writing) return;
    if (
      input.value === this.#state.text &&
      input.selectionStart === this.#state.selectionStart &&
      input.selectionEnd === this.#state.selectionEnd
    )
      return;
    this.#writeDraft();
  }

  #onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#commands.run(HandleFormulaBarKeyCommand, { action: 'escape' });
      this.#focusAfterKey();
    } else if (this.#composing || event.isComposing) {
      return;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.#commands.run(
        HandleFormulaBarKeyCommand,
        event.altKey
          ? { action: 'softEnter' }
          : { action: 'enter', shiftKey: event.shiftKey, primaryModifier: event.ctrlKey || event.metaKey }
      );
      this.#focusAfterKey();
    } else if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.#commands.run(HandleFormulaBarKeyCommand, { action: 'tab', shiftKey: event.shiftKey });
      this.#focusAfterKey();
    } else if (
      (event.key === 'Home' || event.key === 'End') &&
      !event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const input = this.#textInput;
      if (!input) return;
      const position = event.key === 'Home' ? 0 : input.value.length;
      input.setSelectionRange(position, position);
      this.#writeSelection();
    } else if (
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      !event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (!this.#observations.getSnapshot(FormulaInputAssistObservation).suggestions.length) return;
      event.preventDefault();
      this.#commands.run(HandleFormulaBarKeyCommand, {
        action: event.key === 'ArrowUp' ? 'suggestionUp' : 'suggestionDown',
      });
    } else if (
      (event.key === 'PageUp' || event.key === 'PageDown') &&
      !event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (!this.#observations.getSnapshot(FormulaInputAssistObservation).suggestions.length) return;
      event.preventDefault();
      this.#commands.run(HandleFormulaBarKeyCommand, {
        action: event.key === 'PageUp' ? 'suggestionPageUp' : 'suggestionPageDown',
      });
    } else if (event.key === 'F4' && this.#state?.editing) {
      event.preventDefault();
      this.#commands.run(CycleFormulaReferenceCommand, void 0);
      this.#textInput?.focus({ preventScroll: true });
    }
  }

  #focusAfterKey(): void {
    if (this.#observations.getSnapshot(SheetFormulaBarObservation).editing) {
      this.#textInput?.focus({ preventScroll: true });
      return;
    }
    this.#barOwnsFocus = false;
    focusWebSheetSurface(this.#core.renderEngine.renderContext.getRoot());
  }

  #finish(commit: boolean): void {
    if (!this.#state?.editing) return;
    this.#commands.run(commit ? CommitCellEditCommand : CancelCellEditCommand, void 0);
    if (this.#observations.getSnapshot(SheetFormulaBarObservation).editing) {
      this.#textInput?.focus({ preventScroll: true });
      return;
    }
    this.#barOwnsFocus = false;
    focusWebSheetSurface(this.#core.renderEngine.renderContext.getRoot());
  }

  #insertFormulaPrefix(): void {
    const input = this.#textInput;
    if (!input || !this.#state?.cell) return;
    input.focus({ preventScroll: true });
    if (!input.value.startsWith('=')) {
      input.value = `=${input.value}`;
      input.setSelectionRange(input.value.length, input.value.length);
      this.#writeDraft();
    }
  }

  #onNameKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.#restoreName();
      this.#nameInput?.blur();
      return;
    }
    if (event.key !== 'Enter' || !this.#nameInput) return;
    event.preventDefault();
    const cells = this.#queries.has(ReadSheetCellDataQuery) ? this.#queries.run(ReadSheetCellDataQuery, void 0) : null;
    const selection = cells ? parseAddress(this.#nameInput.value, cells.shape) : null;
    const inBounds =
      selection &&
      cells &&
      [...selection.anchor, ...selection.focus].every(
        (coordinate, index) => coordinate >= 0 && coordinate < cells.shape[index % 2]
      );
    if (!inBounds) {
      this.#restoreName();
      return;
    }
    if (this.#state?.editing) this.#commands.run(CommitCellEditCommand, void 0);
    if (this.#observations.getSnapshot(SheetFormulaBarObservation).editing) return;
    this.#commands.run(SelectRangeCommand, { ...selection, ensureVisible: true });
    this.#sheetTextInput.startListener();
  }

  #restoreName(): void {
    if (this.#nameInput && this.#state) this.#nameInput.value = rangeLabel(this.#state);
  }
}
