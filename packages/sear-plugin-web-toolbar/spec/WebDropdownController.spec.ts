import { SheetCommandBus, SheetQueryRegistry, LocalActionCommand } from '@searsuite/sear-assembly-commands';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { GetActiveCell } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery, CommitCellEditCommand } from '@searsuite/sear-plugin-cell-editor';
import {
  DropdownPickerRequest,
  OpenDropdownPickerCommand,
  ReadDropdownCellQuery,
  PickDropdownOptionCommand,
  ClearDropdownValueCommand,
  type DropdownCellSnapshot,
  type DropdownCellInput,
} from '@searsuite/sear-plugin-dropdown';
import { WebDropdownController } from '../src/dropdown/WebDropdownController';
import { WebTextInput } from '@searsuite/sear-browser-adapters';
function harness(textInput?: WebTextInput) {
  const commands = new SheetCommandBus(),
    queries = new SheetQueryRegistry(),
    platform = new BrowserPlatform(),
    observations = new ObservationRegistry(platform);
  let editing = false,
    blocked = false;
  let state: DropdownCellSnapshot | null = {
    row: 0,
    column: 0,
    ruleId: 'r',
    options: [{ label: 'Alpha', color: '#ffeeaa' }, { label: 'Beta' }],
    selected: [],
    multiple: true,
    showArrow: true,
    inputMessage: 'Choose an option',
  };
  const listeners = new Set<(input: DropdownCellInput) => void>();
  observations.register(DropdownPickerRequest, {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  commands.bind({ executePipeline: (p) => p.steps.forEach((step) => step.localAction?.()), applyEffect: () => {} });
  const picks = jest.fn(),
    configure = jest.fn(),
    clear = jest.fn();
  commands.register(
    PickDropdownOptionCommand,
    (input) =>
      new LocalActionCommand(PickDropdownOptionCommand.id, () => {
        picks(input);
        if (state) state = { ...state, selected: state.selected.includes(input.label) ? [] : [input.label] };
      }),
  );
  commands.register(
    ClearDropdownValueCommand,
    () =>
      new LocalActionCommand(ClearDropdownValueCommand.id, () => {
        clear();
        if (state) state = { ...state, selected: [] };
      }),
  );
  commands.register(
    OpenDropdownPickerCommand,
    (input) =>
      new LocalActionCommand(OpenDropdownPickerCommand.id, () => listeners.forEach((listener) => listener(input))),
  );
  commands.register(
    CommitCellEditCommand,
    () =>
      new LocalActionCommand(CommitCellEditCommand.id, () => {
        if (!blocked) editing = false;
      }),
  );
  queries.register(GetActiveCell, () => [0, 0] as const);
  queries.register(IsCellEditingQuery, () => editing);
  queries.register(ReadDropdownCellQuery, () => state);
  const button = document.createElement('button'),
    surface = document.createElement('div');
  document.body.append(button, surface);
  const controller = new WebDropdownController(button, surface, platform, commands, queries, observations, configure, textInput);
  return {
    controller,
    platform,
    commands,
    queries,
    button,
    surface,
    picks,
    configure,
    clear,
    setState: (value: DropdownCellSnapshot | null) => {
      state = value;
    },
    getState: () => state!,
    edit: (value: boolean, block = false) => {
      editing = value;
      blocked = block;
    },
    cleanup: () => {
      controller.destroy();
      observations.destroy();
      button.remove();
      surface.remove();
    },
  };
}
function key(target: Element, key: string, init: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}
function action(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('section[aria-label="Dropdown options"] button')).find(
    (item) => item.textContent === label || item.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(label);
  button.click();
}
it('opens scoped Alt+Down, filters and toggles current options, configures and releases handlers', () => {
  const h = harness();
  try {
    key(h.surface, 'ArrowDown', { altKey: true });
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    key(h.surface, 'ArrowDown', { altKey: true });
    expect(document.querySelector('[aria-label="Dropdown options"]')).not.toBeNull();
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search dropdown options"]')!;
    const hiddenInput = document.createElement('input');
    hiddenInput.id = 'searTextInput';
    h.surface.append(hiddenInput);
    hiddenInput.focus();
    expect(document.activeElement).toBe(search);
    search.value = 'bet';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
    action('Beta');
    expect(h.picks).toHaveBeenCalledWith({ row: 0, column: 0, ruleId: 'r', label: 'Beta' });
    expect(document.querySelector('[role="option"]')!.getAttribute('aria-selected')).toBe('true');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    key(search, 'ArrowDown');
    expect(document.activeElement?.getAttribute('role')).toBe('option');
    key(document.activeElement!, 'ArrowUp');
    action('Clear selection');
    expect(h.clear).toHaveBeenCalled();
    action('Edit dropdown list');
    expect(h.configure).toHaveBeenCalledWith('r');
    h.button.click();
    expect(h.configure).toHaveBeenCalledTimes(2);
    h.controller.open({ row: 0, column: 0 });
    key(h.surface, 'Escape');
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.controller.destroy();
    h.controller.destroy();
    h.button.click();
    expect(h.configure).toHaveBeenCalledTimes(2);
  } finally {
    h.cleanup();
  }
});
it('keeps keyboard option focus when the deferred opening frame runs', () => {
  const h = harness();
  let frame: FrameRequestCallback | undefined;
  const animationFrame = jest.spyOn(h.platform, 'requestAnimationFrame').mockImplementation((callback) => {
    frame = callback;
    return 1;
  });
  try {
    h.setState({ ...h.getState(), multiple: false });
    h.controller.open({ row: 0, column: 0 });
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search dropdown options"]')!;
    key(search, 'ArrowDown');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Alpha');
    frame!(0);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Alpha');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Beta');
    action('Beta');
    expect(h.picks).toHaveBeenCalledWith({ row: 0, column: 0, ruleId: 'r', label: 'Beta' });
  } finally {
    h.cleanup();
    animationFrame.mockRestore();
  }
});
it('BUG-954 restores the editor text input after confirming a single dropdown choice', () => {
  const textInput = new WebTextInput();
  const onTextInput = jest.fn();
  textInput.subscribe({ onTextInput });
  const h = harness(textInput);
  try {
    h.setState({ ...h.getState(), multiple: false });
    h.controller.open({ row: 0, column: 0 });
    action('Beta');
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    expect(document.activeElement?.id).toBe('searTextInput');
    const input = document.activeElement as HTMLInputElement;
    input.value = 'AFTER';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onTextInput).toHaveBeenCalledWith(expect.objectContaining({ text: 'AFTER' }));
  } finally {
    h.cleanup();
    textInput.stopListener();
  }
});
it('guards edits, external focus, stale rules and errors without leaking pickers', () => {
  const h = harness();
  try {
    h.edit(true, true);
    h.button.click();
    expect(h.configure).not.toHaveBeenCalled();
    h.edit(true);
    h.button.click();
    expect(h.configure).toHaveBeenCalled();
    h.surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    key(h.surface, 'ArrowDown', { altKey: true, repeat: true });
    key(h.surface, 'ArrowDown', { altKey: true, ctrlKey: true });
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    const input = document.createElement('input');
    h.surface.append(input);
    key(input, 'ArrowDown', { altKey: true });
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.controller.open({ row: 0, column: 0 });
    h.picks.mockImplementationOnce(() => {
      throw new Error('conflict');
    });
    action('Alpha');
    expect(document.querySelector('[role="alert"]')!.textContent).toBe('conflict');
    h.setState({ ...h.getState(), ruleId: 'changed' });
    document.querySelector<HTMLInputElement>('[aria-label="Search dropdown options"]')!.dispatchEvent(new Event('input'));
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('has changed');
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.setState(null);
    h.controller.open({ row: 0, column: 0 });
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.setState({
      row: 0,
      column: 0,
      ruleId: 'r',
      options: [{ label: 'Alpha' }],
      selected: [],
      multiple: false,
      showArrow: true,
    });
    h.controller.open({ row: 0, column: 0 });
    action('Alpha');
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.controller.open({ row: 0, column: 0 });
    action('Close dropdown options');
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
  } finally {
    h.cleanup();
  }
});
it('BUG-1142 opens Alt+Down from an editable dropdown cell and commits its current draft', () => {
  const h = harness();
  try {
    h.surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    h.edit(true, true);
    key(h.surface, 'ArrowDown', { altKey: true });
    expect(h.queries.run(IsCellEditingQuery, undefined)).toBe(true);
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    h.edit(true);
    key(h.surface, 'ArrowDown', { altKey: true });
    expect(h.queries.run(IsCellEditingQuery, undefined)).toBe(false);
    expect(document.querySelector('[aria-label="Dropdown options"]')).not.toBeNull();
    action('Beta');
    expect(h.picks).toHaveBeenCalledWith({ row: 0, column: 0, ruleId: 'r', label: 'Beta' });
  } finally {
    h.cleanup();
  }
});

it('starts Up at the last option, keeps keyboard focus after multi-pick, and returns it on Escape', () => {
  const h = harness();
  try {
    h.setState({ ...h.getState(), options: [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }] });
    h.surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    key(h.surface, 'ArrowDown', { altKey: true });
    const search = document.querySelector<HTMLInputElement>('[aria-label="Search dropdown options"]')!;
    key(search, 'ArrowUp');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Gamma');
    (document.activeElement as HTMLButtonElement).click();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Gamma');
    expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Alpha');
    key(document.activeElement!, 'Escape');
    expect(document.activeElement).toBe(h.surface);
    key(h.surface, 'ArrowDown', { altKey: true });
    expect(document.querySelector('[aria-label="Dropdown options"]')).not.toBeNull();
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(document.querySelector('[aria-label="Dropdown options"]')).toBeNull();
    outside.remove();
  } finally {
    h.cleanup();
  }
});
