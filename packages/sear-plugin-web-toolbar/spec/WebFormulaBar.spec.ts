import type { SearCoreSheet } from '@searsuite/sear-assembly-core';
import { LocalActionCommand, SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import {
  FormulaInputAssistObservation,
  HandleFormulaBarKeyCommand,
  SetFormulaBarDraftCommand,
  SheetFormulaBarObservation,
  type SheetFormulaBarState,
} from '@searsuite/sear-plugin-cell-editor';
import { SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { ReadSheetCellDataQuery } from '@searsuite/sear-domain-sheet';
import { WebTextInput } from '@searsuite/sear-browser-adapters';
import { WebFormulaBar } from '../src/WebFormulaBar';

it('BUG-1165 moves the focused formula-bar caret with Home and End while suggestions are open', () => {
  const platform = new BrowserPlatform();
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const observations = new ObservationRegistry(platform);
  const surface = document.createElement('canvas');
  const target = document.createElement('div');
  document.body.append(surface, target);
  const core = { renderEngine: { renderContext: { getRoot: () => surface } } } as SearCoreSheet;
  const textInput = new WebTextInput();
  const onSuggestionKey = jest.fn();
  const onDraft = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => {},
  });
  commands.register(
    HandleFormulaBarKeyCommand,
    (input) => new LocalActionCommand(HandleFormulaBarKeyCommand.id, () => onSuggestionKey(input))
  );
  commands.register(
    SetFormulaBarDraftCommand,
    (input) => new LocalActionCommand(SetFormulaBarDraftCommand.id, () => onDraft(input))
  );
  queries.register(ReadSheetCellDataQuery, () => ({ shape: [100, 26], getItem: () => null }));
  observations.register(SheetFormulaBarObservation, {
    getSnapshot: (): SheetFormulaBarState => ({
      cell: [0, 0],
      range: { start: [0, 0], end: [0, 0] },
      text: '=SU',
      editing: true,
      selectionStart: 3,
      selectionEnd: 3,
    }),
    subscribe: () => () => {},
  });
  observations.register(FormulaInputAssistObservation, {
    getSnapshot: () => ({
      suggestions: [{} as never],
      selectedIndex: 0,
      signature: null,
      diagnostic: null,
      anchor: null,
    }),
    subscribe: () => () => {},
  });
  const bar = new WebFormulaBar(platform, commands, queries, observations, core, textInput);
  try {
    bar.mount(target);
    const input = target.querySelector<HTMLTextAreaElement>('[aria-label="Formula bar"]')!;
    input.focus();
    input.value = '=SU';
    input.setSelectionRange(3, 3);
    for (const [key, expectedPosition] of [
      ['Home', 0],
      ['End', 3],
    ] as const) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(input.selectionStart).toBe(expectedPosition);
    }
    expect(onDraft).toHaveBeenCalledWith({ text: '=SU', selectionStart: 0, selectionEnd: 0 });
    expect(onSuggestionKey).not.toHaveBeenCalled();
    const pageDown = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true });
    input.dispatchEvent(pageDown);
    expect(pageDown.defaultPrevented).toBe(true);
    expect(onSuggestionKey).toHaveBeenCalledWith({ action: 'suggestionPageDown' });
  } finally {
    bar.destroy();
    textInput.stopListener();
    observations.destroy();
    surface.remove();
    target.remove();
  }
});

it('BUG-947 restores the editor input after a name-box jump so typing reaches the cell editor', () => {
  const platform = new BrowserPlatform();
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const observations = new ObservationRegistry(platform);
  const surface = document.createElement('canvas');
  const target = document.createElement('div');
  document.body.append(surface, target);
  const core = { renderEngine: { renderContext: { getRoot: () => surface } } } as SearCoreSheet;
  const textInput = new WebTextInput();
  const onTextInput = jest.fn();
  textInput.subscribe({ onTextInput });
  const select = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => {},
  });
  commands.register(
    SelectRangeCommand,
    (selection) => new LocalActionCommand(SelectRangeCommand.id, () => select(selection))
  );
  queries.register(ReadSheetCellDataQuery, () => ({ shape: [100, 26], getItem: () => null }));
  const state: SheetFormulaBarState = {
    cell: [0, 0],
    range: { start: [0, 0], end: [0, 0] },
    text: '',
    editing: false,
    selectionStart: 0,
    selectionEnd: 0,
  };
  observations.register(SheetFormulaBarObservation, { getSnapshot: () => state, subscribe: () => () => {} });
  const bar = new WebFormulaBar(platform, commands, queries, observations, core, textInput);
  try {
    bar.mount(target);
    const name = target.querySelector<HTMLInputElement>('[aria-label="Name box"]')!;
    name.focus();
    name.value = 'J40';
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(select).toHaveBeenCalledWith({ anchor: [39, 9], focus: [39, 9], ensureVisible: true });
    expect(document.activeElement?.id).toBe('searTextInput');
    const input = document.activeElement as HTMLInputElement;
    input.value = 'typed-after-name';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onTextInput).toHaveBeenCalledWith(expect.objectContaining({ text: 'typed-after-name' }));
    const grid = document.getElementById(surface.getAttribute('data-sear-grid-proxy')!);
    grid?.focus();
    surface.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(document.activeElement?.id).toBe('searTextInput');
  } finally {
    bar.destroy();
    textInput.stopListener();
    observations.destroy();
    surface.remove();
    target.remove();
  }
});

it('BUG-927 selects an absolute A1 address from the name box', () => {
  const platform = new BrowserPlatform();
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const observations = new ObservationRegistry(platform);
  const surface = document.createElement('canvas');
  const target = document.createElement('div');
  document.body.append(surface, target);
  const core = { renderEngine: { renderContext: { getRoot: () => surface } } } as SearCoreSheet;
  const textInput = new WebTextInput();
  const select = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => {},
  });
  commands.register(
    SelectRangeCommand,
    (selection) => new LocalActionCommand(SelectRangeCommand.id, () => select(selection))
  );
  queries.register(ReadSheetCellDataQuery, () => ({ shape: [200, 26], getItem: () => null }));
  const state: SheetFormulaBarState = {
    cell: [139, 7],
    range: { start: [139, 7], end: [139, 7] },
    text: '',
    editing: false,
    selectionStart: 0,
    selectionEnd: 0,
  };
  observations.register(SheetFormulaBarObservation, { getSnapshot: () => state, subscribe: () => () => {} });
  const bar = new WebFormulaBar(platform, commands, queries, observations, core, textInput);
  try {
    bar.mount(target);
    const name = target.querySelector<HTMLInputElement>('[aria-label="Name box"]')!;
    name.focus();
    name.value = '$H$142';
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(select).toHaveBeenCalledWith({ anchor: [141, 7], focus: [141, 7], ensureVisible: true });
    expect(document.activeElement?.id).toBe('searTextInput');
  } finally {
    bar.destroy();
    textInput.stopListener();
    observations.destroy();
    surface.remove();
    target.remove();
  }
});

it('BUG-925 selects complete rows and columns from the name box', () => {
  const platform = new BrowserPlatform();
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const observations = new ObservationRegistry(platform);
  const surface = document.createElement('canvas');
  const target = document.createElement('div');
  document.body.append(surface, target);
  const core = { renderEngine: { renderContext: { getRoot: () => surface } } } as SearCoreSheet;
  const textInput = new WebTextInput();
  const select = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => {},
  });
  commands.register(
    SelectRangeCommand,
    (selection) => new LocalActionCommand(SelectRangeCommand.id, () => select(selection))
  );
  queries.register(ReadSheetCellDataQuery, () => ({ shape: [200, 26], getItem: () => null }));
  const state: SheetFormulaBarState = {
    cell: [19, 2],
    range: { start: [19, 2], end: [19, 2] },
    text: '',
    editing: false,
    selectionStart: 0,
    selectionEnd: 0,
  };
  observations.register(SheetFormulaBarObservation, { getSnapshot: () => state, subscribe: () => () => {} });
  const bar = new WebFormulaBar(platform, commands, queries, observations, core, textInput);
  try {
    bar.mount(target);
    const name = target.querySelector<HTMLInputElement>('[aria-label="Name box"]')!;
    name.focus();
    name.value = 'B:B';
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(select).toHaveBeenLastCalledWith({ anchor: [0, 1], focus: [199, 1], ensureVisible: true });
    name.focus();
    name.value = '21:21';
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(select).toHaveBeenLastCalledWith({ anchor: [20, 0], focus: [20, 25], ensureVisible: true });
  } finally {
    bar.destroy();
    textInput.stopListener();
    observations.destroy();
    surface.remove();
    target.remove();
  }
});
