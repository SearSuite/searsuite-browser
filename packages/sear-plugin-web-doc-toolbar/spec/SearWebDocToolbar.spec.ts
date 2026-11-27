import { DocInlineStyleObservation, type DocEditor, type DocInlineStyleState } from '@searsuite/sear-assembly-setup';
import {
  InsertDocTableCommand,
  RedoDocCommand,
  SetDocBoldCommand,
  SetDocItalicCommand,
  SetDocUnderlineCommand,
  SetDocStrikethroughCommand,
  SetDocFontFamilyCommand,
  SetDocFontSizeCommand,
  ToggleDocBoldCommand,
  ToggleDocItalicCommand,
  ToggleDocUnderlineCommand,
  ToggleDocStrikethroughCommand,
  UndoDocCommand,
} from '@searsuite/sear-assembly-doc';
import { DocCommandBus } from '@searsuite/sear-assembly-commands';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { SearWebDocToolbar } from '../src';

describe('SearWebDocToolbar', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
  });

  function createCommands(registered: readonly string[]): jest.Mocked<DocCommandBus> {
    return {
      has: jest.fn((definition: { id: string } | string) =>
        registered.includes(typeof definition === 'string' ? definition : definition.id)
      ),
      run: jest.fn(),
    } as unknown as jest.Mocked<DocCommandBus>;
  }

  function createEditor(
    commands: DocCommandBus,
    state: DocInlineStyleState = enabledInlineStyles()
  ): Pick<DocEditor, 'commands' | 'observations'> {
    return createObservableEditor(commands, state).editor;
  }

  function createObservableEditor(
    commands: DocCommandBus,
    initialState: DocInlineStyleState = enabledInlineStyles()
  ): {
    editor: Pick<DocEditor, 'commands' | 'observations'>;
    publish(state: DocInlineStyleState): void;
  } {
    const observations = new ObservationRegistry();
    let state = initialState;
    const listeners = new Set<(nextState: DocInlineStyleState) => void>();
    observations.register(DocInlineStyleObservation, {
      getSnapshot: () => state,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    return {
      editor: { commands, observations },
      publish(nextState) {
        state = nextState;
        listeners.forEach((listener) => listener(nextState));
      },
    };
  }

  function enabledInlineStyles(): DocInlineStyleState {
    const status = { enabled: true, active: false, value: null } as const;
    return { bold: status, italic: status, underline: status, strikethrough: status };
  }

  it('renders the document toolbar and connects registered commands', () => {
    const commands = createCommands([UndoDocCommand.id, RedoDocCommand.id, InsertDocTableCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(commands));

    toolbar.mount(target);

    expect(target.querySelector('[data-role="doc-toolbar"]')).not.toBeNull();
    expect(target.querySelector('[data-testid="doc-italic"]')?.classList.contains('disabled')).toBe(true);
    expect(target.querySelector('[data-testid="doc-underline"]')?.classList.contains('disabled')).toBe(true);
    expect(target.querySelector('[data-testid="doc-strike"]')?.classList.contains('disabled')).toBe(true);
    const fontFamily = target.querySelector<HTMLSelectElement>('[data-testid="doc-font-family"]');
    expect(fontFamily).not.toBeNull();
    expect(fontFamily?.disabled).toBe(true);
    expect(target.querySelector<HTMLSelectElement>('[data-testid="doc-font-size"]')?.disabled).toBe(true);
    target.querySelector<HTMLElement>('[data-testid="doc-more"]')?.click();
    expect(document.querySelector('[data-testid="doc-more-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="doc-more-insert-table"]')?.hasAttribute('disabled')).toBe(false);
    expect(document.querySelector('[data-testid="doc-more-italic"]')?.hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('[data-testid="doc-more-underline"]')?.hasAttribute('disabled')).toBe(true);

    target.querySelector<HTMLElement>('[data-testid="doc-insert"]')?.click();
    expect(commands.run).toHaveBeenNthCalledWith(1, InsertDocTableCommand, { rows: 2, columns: 2 });

    toolbar.destroy();
    expect(target.querySelector('[data-role="doc-toolbar"]')).toBeNull();
    expect(document.querySelector('style[data-sear-doc-toolbar]')).toBeNull();
    expect(document.querySelector('[data-testid="doc-more-panel"]')).toBeNull();
  });

  it('disables command controls when the feature is not registered', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(createCommands([])));

    toolbar.mount(target);

    for (const id of ['doc-menu', 'doc-insert', 'doc-undo', 'doc-redo']) {
      expect(target.querySelector(`[data-testid="${id}"]`)?.classList.contains('disabled')).toBe(true);
    }
  });

  it('wires the font-family select to SetDocFontFamilyCommand', () => {
    const commands = createCommands([SetDocFontFamilyCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const binding = createObservableEditor(commands);
    const toolbar = new SearWebDocToolbar(binding.editor);

    toolbar.mount(target);

    const fontFamily = target.querySelector<HTMLSelectElement>('[data-testid="doc-font-family"]');
    expect(fontFamily?.disabled).toBe(true);
    binding.publish({ ...enabledInlineStyles(), fontFamily: { enabled: true, active: false, value: null } });
    expect(fontFamily?.disabled).toBe(false);
    expect(Array.from(fontFamily!.options).map((option) => option.textContent)).toEqual([
      'Default',
      'Arial',
      'Calibri',
      'Courier New',
      'Georgia',
      'Helvetica',
      'Times New Roman',
      'Verdana',
    ]);

    fontFamily!.value = 'Georgia';
    fontFamily!.dispatchEvent(new Event('change'));
    expect(commands.run).toHaveBeenCalledWith(SetDocFontFamilyCommand, { fontFamily: 'Georgia' });

    fontFamily!.value = '';
    fontFamily!.dispatchEvent(new Event('change'));
    expect(commands.run).toHaveBeenCalledWith(SetDocFontFamilyCommand, { fontFamily: null });

    toolbar.destroy();
  });

  it('updates the font-family select from the inline-style observation', () => {
    const binding = createObservableEditor(createCommands([SetDocFontFamilyCommand.id]));
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(binding.editor);

    toolbar.mount(target);

    const fontFamily = target.querySelector<HTMLSelectElement>('[data-testid="doc-font-family"]');
    expect(fontFamily?.disabled).toBe(true);
    binding.publish({ ...enabledInlineStyles(), fontFamily: { enabled: true, active: false, value: 'Georgia' } });
    expect(fontFamily?.disabled).toBe(false);
    expect(fontFamily?.value).toBe('Georgia');

    binding.publish({
      ...enabledInlineStyles(),
      fontFamily: { enabled: true, active: false, value: 'Noto Sans' },
    });
    expect(fontFamily?.value).toBe('Noto Sans');
    expect(fontFamily?.querySelector('option[data-sear-observed-font-family]')?.textContent).toBe('Noto Sans');

    binding.publish({ ...enabledInlineStyles(), fontFamily: { enabled: true, active: false, value: null } });
    expect(fontFamily?.value).toBe('');
    expect(fontFamily?.querySelector('option[data-sear-observed-font-family]')).toBeNull();

    toolbar.destroy();
  });

  it('wires the font-size select to SetDocFontSizeCommand', () => {
    const commands = createCommands([SetDocFontSizeCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const binding = createObservableEditor(commands);
    const toolbar = new SearWebDocToolbar(binding.editor);

    toolbar.mount(target);

    const fontSize = target.querySelector<HTMLSelectElement>('[data-testid="doc-font-size"]');
    expect(fontSize?.disabled).toBe(true);
    binding.publish({ ...enabledInlineStyles(), fontSize: { enabled: true, active: false, value: null } });
    expect(fontSize?.disabled).toBe(false);
    expect(Array.from(fontSize!.options).map((option) => option.textContent)).toEqual([
      'Default',
      '8',
      '9',
      '10',
      '11',
      '12',
      '14',
      '16',
      '18',
      '20',
      '24',
      '28',
      '36',
      '48',
      '72',
    ]);

    fontSize!.value = '18';
    fontSize!.dispatchEvent(new Event('change'));
    expect(commands.run).toHaveBeenCalledWith(SetDocFontSizeCommand, { fontSize: 18 });

    fontSize!.value = '';
    fontSize!.dispatchEvent(new Event('change'));
    expect(commands.run).toHaveBeenCalledWith(SetDocFontSizeCommand, { fontSize: null });

    toolbar.destroy();
  });

  it('updates the font-size select from the inline-style observation', () => {
    const binding = createObservableEditor(createCommands([SetDocFontSizeCommand.id]));
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(binding.editor);

    toolbar.mount(target);

    const fontSize = target.querySelector<HTMLSelectElement>('[data-testid="doc-font-size"]');
    expect(fontSize?.disabled).toBe(true);
    binding.publish({ ...enabledInlineStyles(), fontSize: { enabled: true, active: false, value: 18 } });
    expect(fontSize?.disabled).toBe(false);
    expect(fontSize?.value).toBe('18');

    binding.publish({ ...enabledInlineStyles(), fontSize: { enabled: true, active: false, value: 13 } });
    expect(fontSize?.value).toBe('13');
    binding.publish({ ...enabledInlineStyles(), fontSize: { enabled: true, active: false, value: null } });
    expect(fontSize?.value).toBe('');

    toolbar.destroy();
  });

  it('wires the bold button to ToggleDocBoldCommand', () => {
    const commands = createCommands([ToggleDocBoldCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(commands));

    toolbar.mount(target);

    const bold = target.querySelector<HTMLButtonElement>('[data-testid="doc-bold"]');
    expect(bold?.disabled).toBe(false);
    bold?.click();
    expect(commands.run).toHaveBeenCalledWith(ToggleDocBoldCommand, void 0);
    toolbar.destroy();
  });

  it('updates inline style buttons from the editor style observation', () => {
    const binding = createObservableEditor(
      createCommands([
        ToggleDocBoldCommand.id,
        ToggleDocItalicCommand.id,
        ToggleDocUnderlineCommand.id,
        ToggleDocStrikethroughCommand.id,
      ]),
      {
        bold: { enabled: false, active: false, value: null },
        italic: { enabled: false, active: false, value: null },
        underline: { enabled: false, active: false, value: null },
        strikethrough: { enabled: false, active: false, value: null },
      }
    );
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(binding.editor);

    toolbar.mount(target);
    const bold = target.querySelector<HTMLButtonElement>('[data-testid="doc-bold"]');
    expect(bold?.disabled).toBe(true);
    target.querySelector<HTMLElement>('[data-testid="doc-more"]')?.click();
    const italic = document.querySelector<HTMLButtonElement>('[data-testid="doc-more-italic"]');
    expect(italic?.disabled).toBe(true);

    binding.publish({
      bold: { enabled: true, active: true, value: true },
      italic: { enabled: true, active: false, value: null },
      underline: { enabled: true, active: false, value: null },
      strikethrough: { enabled: true, active: false, value: null },
    });
    expect(bold?.disabled).toBe(false);
    expect(bold?.classList.contains('wd3-toolbar-item-active')).toBe(true);
    expect(italic?.disabled).toBe(false);
    italic?.click();
    expect(binding.editor.commands.run).toHaveBeenCalledWith(ToggleDocItalicCommand, void 0);

    toolbar.destroy();
    binding.publish({
      bold: { enabled: false, active: false, value: null },
      italic: { enabled: false, active: false, value: null },
      underline: { enabled: false, active: false, value: null },
      strikethrough: { enabled: false, active: false, value: null },
    });
    expect(bold?.disabled).toBe(false);
  });

  it('falls back to SetDocBoldCommand when a toggle command is unavailable', () => {
    const commands = createCommands([SetDocBoldCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(commands));

    toolbar.mount(target);
    target.querySelector<HTMLButtonElement>('[data-testid="doc-bold"]')?.click();
    expect(commands.run).toHaveBeenCalledWith(SetDocBoldCommand, { bold: true });
    toolbar.destroy();
  });

  it.each([
    ['doc-italic', ToggleDocItalicCommand, SetDocItalicCommand, { italic: true }],
    ['doc-underline', ToggleDocUnderlineCommand, SetDocUnderlineCommand, { underline: true }],
    ['doc-strike', ToggleDocStrikethroughCommand, SetDocStrikethroughCommand, { strikethrough: true }],
  ] as const)('wires %s to its toggle command', (id, toggleCommand, _setCommand, _input) => {
    const commands = createCommands([toggleCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(commands));

    toolbar.mount(target);
    const button = target.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
    expect(button?.disabled).toBe(false);
    button?.click();
    expect(commands.run).toHaveBeenCalledWith(toggleCommand, void 0);
    toolbar.destroy();
  });

  it.each([
    ['doc-italic', SetDocItalicCommand, { italic: true }],
    ['doc-underline', SetDocUnderlineCommand, { underline: true }],
    ['doc-strike', SetDocStrikethroughCommand, { strikethrough: true }],
  ] as const)('falls back to the %s set command', (id, setCommand, input) => {
    const commands = createCommands([setCommand.id]);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const toolbar = new SearWebDocToolbar(createEditor(commands));

    toolbar.mount(target);
    target.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)?.click();
    expect(commands.run).toHaveBeenCalledWith(setCommand, input);
    toolbar.destroy();
  });
});
