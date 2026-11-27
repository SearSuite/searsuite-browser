import { DocCommandBus } from '@searsuite/sear-assembly-commands';
import { DocInlineStyleObservation, type DocEditor, type DocInlineStyleState } from '@searsuite/sear-assembly-setup';
import {
  InsertDocTableCommand,
  RedoDocCommand,
  SetDocBoldCommand,
  SetDocItalicCommand,
  SetDocUnderlineCommand,
  SetDocStrikethroughCommand,
  ToggleDocBoldCommand,
  ToggleDocItalicCommand,
  ToggleDocUnderlineCommand,
  ToggleDocStrikethroughCommand,
  SetDocFontFamilyCommand,
  SetDocFontSizeCommand,
  UndoDocCommand,
} from '@searsuite/sear-assembly-doc';
import { DESIGNED_TOOLBAR_ICONS, SearToolbar, TOOLBAR_CSS } from '@searsuite/sear-plugin-web-toolbar';

const DOC_TOOLBAR_CSS = `
.sear-doc-toolbar { min-height: 48px; }
.sear-doc-toolbar .we-toolbar-wrapper { height: 48px; overflow: visible; }
.sear-doc-toolbar .style__LineWrap-wd3__sc-qvsygq-2 { display: flex; align-items: center; height: 48px; padding: 6px 8px; overflow-x: auto; overflow-y: hidden; }
.sear-doc-toolbar .style__Group-wd3__sc-qvsygq-3 { display: flex; flex: 0 0 auto; align-items: center; gap: 2px; min-width: max-content; height: 36px; padding: 0 8px; }
.sear-doc-toolbar .style__Group-wd3__sc-qvsygq-3::after { top: 4px; height: 40px; }
.sear-doc-toolbar button.wd3-toolbar-item { border: 0; font: inherit; appearance: none; }
.sear-doc-toolbar .wd3-toolbar-icon-button.large { display: inline-flex; flex: 0 0 56px; width: 56px; min-width: 56px; height: 36px; padding: 2px 4px; flex-direction: column; }
.sear-doc-toolbar .wd3-toolbar-icon-button.small { display: inline-flex; flex: 0 0 24px; width: 24px; min-width: 24px; height: 24px; padding: 0; }
.sear-doc-toolbar .wd3-toolbar-icon-button.wd3-toolbar-item-active { background: var(--wd3-active); color: var(--wd3-blue); }
.sear-doc-toolbar .wd3-toolbar-icon { width: 16px; height: 16px; flex: 0 0 16px; }
.sear-doc-toolbar .wd3-toolbar-icon > svg { display: block; width: 16px !important; height: 16px !important; min-width: 16px; max-width: 16px; flex: 0 0 16px; aspect-ratio: 1 / 1; }
.sear-doc-toolbar .doc-toolbar-label { display: inline-flex; color: var(--wd3-level-2); font-size: 11px; line-height: 14px; margin: 2px 0 0; }
.sear-doc-toolbar .doc-toolbar-select { display: inline-flex; flex: 0 0 72px; width: 72px; min-width: 72px; height: 28px; padding: 0 8px; border: 1px solid var(--wd3-line); border-radius: 4px; background: #fff; }
.sear-doc-toolbar .doc-toolbar-font-family-select { flex-basis: 132px; width: 132px; min-width: 132px; }
.sear-doc-toolbar-more-panel { position: fixed; z-index: 1000; min-width: 220px; padding: 6px; border: 1px solid var(--wd3-line); border-radius: 6px; background: #fff; box-shadow: 0 8px 24px rgba(23, 24, 28, .14); color: var(--wd3-level-1); }
.sear-doc-toolbar-more-item { display: flex; align-items: center; width: 100%; min-height: 32px; gap: 8px; padding: 0 8px; border: 0; border-radius: 4px; background: transparent; color: inherit; text-align: left; }
.sear-doc-toolbar-more-item:not(:disabled):hover { background: var(--wd3-hover); }
.sear-doc-toolbar-more-item:disabled { color: var(--wd3-level-3); opacity: .42; }
.sear-doc-toolbar-more-item svg { width: 16px; height: 16px; flex: 0 0 16px; }
`;

interface DocToolbarButton {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly command?: () => void;
  readonly enabled?: boolean;
}

const DOC_FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
] as const;

const DOC_FONT_SIZES = [
  { value: '', label: 'Default' },
  ...['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72'].map((value) => ({
    value,
    label: value,
  })),
] as const;

type DocInlineStyleControl =
  | {
      readonly kind: 'toggle';
      readonly id: string;
      readonly styleKey: string;
      readonly toggle: { readonly id: string };
      readonly set: { readonly id: string };
    }
  | {
      readonly kind: 'value';
      readonly id: string;
      readonly styleKey: string;
      readonly command: { readonly id: string };
      readonly observedOptionSelector: string;
      readonly observedOptionDataKey: string;
    };

const DOC_INLINE_STYLE_CONTROLS = [
  { kind: 'toggle', id: 'doc-bold', styleKey: 'bold', toggle: ToggleDocBoldCommand, set: SetDocBoldCommand },
  { kind: 'toggle', id: 'doc-italic', styleKey: 'italic', toggle: ToggleDocItalicCommand, set: SetDocItalicCommand },
  {
    kind: 'toggle',
    id: 'doc-underline',
    styleKey: 'underline',
    toggle: ToggleDocUnderlineCommand,
    set: SetDocUnderlineCommand,
  },
  {
    kind: 'toggle',
    id: 'doc-strike',
    styleKey: 'strikethrough',
    toggle: ToggleDocStrikethroughCommand,
    set: SetDocStrikethroughCommand,
  },
  {
    kind: 'toggle',
    id: 'doc-more-italic',
    styleKey: 'italic',
    toggle: ToggleDocItalicCommand,
    set: SetDocItalicCommand,
  },
  {
    kind: 'toggle',
    id: 'doc-more-underline',
    styleKey: 'underline',
    toggle: ToggleDocUnderlineCommand,
    set: SetDocUnderlineCommand,
  },
  {
    kind: 'toggle',
    id: 'doc-more-strike',
    styleKey: 'strikethrough',
    toggle: ToggleDocStrikethroughCommand,
    set: SetDocStrikethroughCommand,
  },
  {
    kind: 'value',
    id: 'doc-font-family',
    styleKey: 'fontFamily',
    command: SetDocFontFamilyCommand,
    observedOptionSelector: 'option[data-sear-observed-font-family]',
    observedOptionDataKey: 'searObservedFontFamily',
  },
  {
    kind: 'value',
    id: 'doc-font-size',
    styleKey: 'fontSize',
    command: SetDocFontSizeCommand,
    observedOptionSelector: 'option[data-sear-observed-font-size]',
    observedOptionDataKey: 'searObservedFontSize',
  },
] as const satisfies readonly DocInlineStyleControl[];

/** Browser toolbar adapter for standalone Doc editors. */
export class SearWebDocToolbar extends SearToolbar {
  readonly #editor: Pick<DocEditor, 'commands' | 'observations'>;

  public static readonly symbol = Symbol.for('SearWebDocToolbar');
  #container: HTMLElement | null = null;
  #root: HTMLElement | null = null;
  #styleElement: HTMLStyleElement | null = null;
  #morePanel: HTMLElement | null = null;
  #disposeObservation: (() => void) | null = null;
  #inlineStyleState: DocInlineStyleState | null = null;

  public constructor(editor: Pick<DocEditor, 'commands' | 'observations'>) {
    super();
    this.#editor = editor;
  }

  public mount(target: unknown): void {
    this.destroy();
    this.#container = target as HTMLElement;
    const style = document.createElement('style');
    style.setAttribute('data-sear-doc-toolbar', '');
    style.textContent = `${TOOLBAR_CSS}\n${DOC_TOOLBAR_CSS}`;
    document.head.appendChild(style);
    this.#styleElement = style;

    const root = document.createElement('div');
    root.className = 'sear-toolbar sear-doc-toolbar';
    root.setAttribute('data-role', 'doc-toolbar');
    root.appendChild(this.#renderToolbar());
    this.#container.appendChild(root);
    this.#root = root;
    this.#bindObservations();
  }

  public destroy(): void {
    this.#disposeObservation?.();
    this.#disposeObservation = null;
    this.#inlineStyleState = null;
    this.#closeMorePanel();
    this.#root?.remove();
    this.#styleElement?.remove();
    this.#root = null;
    this.#container = null;
    this.#styleElement = null;
  }

  #renderToolbar(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'we-toolbar-wrapper';
    const line = document.createElement('div');
    line.className = 'style__LineWrap-wd3__sc-qvsygq-2';
    line.append(
      this.#renderGroup([
        this.#renderButton({ id: 'doc-menu', label: 'Menu', icon: icon('menu') }),
        this.#renderButton({
          id: 'doc-insert',
          label: 'Insert',
          icon: icon('plus'),
          command: () => this.#insertTable(),
          enabled: this.#commands.has(InsertDocTableCommand),
        }),
      ]),
      this.#renderGroup([
        this.#renderIconButton(
          'doc-undo',
          icon('undo'),
          () => this.#commands.run(UndoDocCommand, void 0),
          UndoDocCommand
        ),
        this.#renderIconButton(
          'doc-redo',
          icon('redo'),
          () => this.#commands.run(RedoDocCommand, void 0),
          RedoDocCommand
        ),
      ]),
      this.#renderGroup([
        this.#renderBoldButton(),
        this.#renderItalicButton(),
        this.#renderUnderlineButton(),
        this.#renderStrikethroughButton(),
      ]),
      this.#renderGroup([
        this.#renderFontFamilySelect(),
        this.#renderDisabledSelect('doc-heading', 'Body text', 'Paragraph style'),
        this.#renderFontSizeSelect(),
      ]),
      this.#renderGroup([
        this.#renderDisabledIconButton('doc-font-color', icon('fontColor'), 'Text color'),
        this.#renderDisabledIconButton('doc-highlight', icon('highlight'), 'Highlight'),
        this.#renderDisabledIconButton('doc-line-height', icon('lineHeight'), 'Line spacing'),
        this.#renderDisabledIconButton('doc-align', icon('align'), 'Align'),
        this.#renderDisabledIconButton('doc-indent-decrease', icon('indentDecrease'), 'Decrease indent'),
        this.#renderDisabledIconButton('doc-indent-increase', icon('indentIncrease'), 'Increase indent'),
      ]),
      this.#renderGroup([
        this.#renderDisabledIconButton('doc-list-unordered', icon('listUnordered'), 'Bulleted list'),
        this.#renderDisabledIconButton('doc-list-ordered', icon('listOrdered'), 'Numbered list'),
        this.#renderDisabledIconButton('doc-list-task', icon('listTask'), 'Task list'),
        this.#renderDisabledIconButton('doc-link', icon('link'), 'Link'),
        this.#renderDisabledIconButton('doc-search', icon('search'), 'Find and replace'),
        this.#renderDisabledIconButton('doc-mention', icon('mention'), '@mention'),
        this.#renderDisabledIconButton('doc-comment', icon('comment'), 'Comment'),
      ]),
      this.#renderGroup([
        this.#renderDisabledIconButton('doc-format-painter', icon('painter'), 'Format painter'),
        this.#renderDisabledIconButton('doc-clear-format', icon('eraser'), 'Clear formatting'),
        this.#renderDisabledIconButton('doc-ai', icon('ai'), 'AI writing'),
      ]),
      this.#renderMoreButton()
    );
    wrapper.appendChild(line);
    return wrapper;
  }

  #renderMoreButton(): HTMLElement {
    const button = this.#renderButton({ id: 'doc-more', label: 'More', icon: icon('more') });
    button.classList.remove('disabled');
    if (button instanceof HTMLButtonElement) button.disabled = false;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#toggleMorePanel(button);
    });
    return button;
  }

  #toggleMorePanel(anchor: HTMLElement): void {
    if (this.#morePanel) {
      this.#closeMorePanel();
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'sear-doc-toolbar-more-panel';
    panel.dataset['testid'] = 'doc-more-panel';
    const items: readonly { id: string; label: string; icon: string; enabled?: boolean; action?: () => void }[] = [
      {
        id: 'doc-more-insert-table',
        label: 'Insert table',
        icon: icon('plus'),
        enabled: this.#commands.has(InsertDocTableCommand),
        action: () => this.#insertTable(),
      },
      {
        id: 'doc-more-italic',
        label: 'Italic',
        icon: icon('italic'),
        enabled:
          this.#isStyleCommandAvailable(ToggleDocItalicCommand, SetDocItalicCommand) &&
          this.#inlineStyleState?.['italic']?.enabled === true,
        action: () => this.#toggleItalic(),
      },
      {
        id: 'doc-more-underline',
        label: 'Underline',
        icon: icon('underline'),
        enabled:
          this.#isStyleCommandAvailable(ToggleDocUnderlineCommand, SetDocUnderlineCommand) &&
          this.#inlineStyleState?.['underline']?.enabled === true,
        action: () => this.#toggleUnderline(),
      },
      {
        id: 'doc-more-strike',
        label: 'Strikethrough',
        icon: icon('strike'),
        enabled:
          this.#isStyleCommandAvailable(ToggleDocStrikethroughCommand, SetDocStrikethroughCommand) &&
          this.#inlineStyleState?.['strikethrough']?.enabled === true,
        action: () => this.#toggleStrikethrough(),
      },
      { id: 'doc-more-font-color', label: 'Text color', icon: icon('fontColor') },
      { id: 'doc-more-align', label: 'Paragraph alignment', icon: icon('align') },
      { id: 'doc-more-list', label: 'Bulleted list', icon: icon('list') },
      { id: 'doc-more-indent', label: 'Increase indent', icon: icon('indent') },
    ];
    items.forEach((item) => {
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'sear-doc-toolbar-more-item';
      entry.dataset['testid'] = item.id;
      entry.innerHTML = `${item.icon}<span>${item.label}</span>`;
      if (item.enabled !== true) entry.disabled = true;
      if (item.action)
        entry.addEventListener('click', () => {
          item.action?.();
          this.#closeMorePanel();
        });
      panel.appendChild(entry);
    });
    const rect = anchor.getBoundingClientRect();
    panel.style.left = `${Math.max(8, rect.left)}px`;
    panel.style.top = `${rect.bottom + 6}px`;
    document.body.appendChild(panel);
    this.#morePanel = panel;
    if (this.#inlineStyleState) this.#applyInlineStyleState(this.#inlineStyleState);
    document.addEventListener('pointerdown', this.#handleMoreOutsideClick, true);
  }

  #closeMorePanel = (): void => {
    this.#morePanel?.remove();
    this.#morePanel = null;
    document.removeEventListener('pointerdown', this.#handleMoreOutsideClick, true);
  };

  #handleMoreOutsideClick = (event: Event): void => {
    if (this.#morePanel && !this.#morePanel.contains(event.target as Node)) this.#closeMorePanel();
  };

  #bindObservations(): void {
    this.#disposeObservation = this.#editor.observations.subscribe(DocInlineStyleObservation, (state) => {
      this.#inlineStyleState = state;
      this.#applyInlineStyleState(state);
    });
  }

  #applyInlineStyleState(state: DocInlineStyleState): void {
    DOC_INLINE_STYLE_CONTROLS.forEach((control) => {
      const status = state[control.styleKey] ?? DISABLED_DOC_INLINE_STYLE_STATUS;
      if (control.kind === 'value') {
        this.#updateInlineStyleValue(control, status);
        return;
      }
      this.#updateInlineStyleButton(control.id, status, this.#isStyleCommandAvailable(control.toggle, control.set));
    });
  }

  #updateInlineStyleValue(
    control: Extract<DocInlineStyleControl, { readonly kind: 'value' }>,
    status: DocInlineStyleState[string]
  ): void {
    const select = this.#root?.querySelector<HTMLSelectElement>(`[data-testid="${control.id}"]`);
    if (!select) return;
    const enabled = this.#commands.has(control.command.id) && status.enabled;
    select.disabled = !enabled;
    select.classList.toggle('disabled', !enabled);

    select.querySelector(control.observedOptionSelector)?.remove();
    const value = status.value === null ? '' : String(status.value);
    if (value && !Array.from(select.options).some((option) => option.value === value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.dataset[control.observedOptionDataKey] = '';
      select.appendChild(option);
    }
    select.value = value;
  }

  #updateInlineStyleButton(id: string, status: DocInlineStyleState[string], commandAvailable: boolean): void {
    const button =
      this.#root?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`) ??
      this.#morePanel?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
    if (!button) return;
    const enabled = commandAvailable && status.enabled;
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
    button.classList.toggle('wd3-toolbar-item-active', enabled && status.active);
  }

  #isStyleCommandAvailable(toggleCommand: { readonly id: string }, setCommand: { readonly id: string }): boolean {
    return this.#commands.has(toggleCommand.id) || this.#commands.has(setCommand.id);
  }

  #renderGroup(children: readonly HTMLElement[]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'style__Group-wd3__sc-qvsygq-3';
    children.forEach((child) => group.appendChild(child));
    return group;
  }

  #renderButton(button: DocToolbarButton): HTMLElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'wd3-toolbar-item wd3-toolbar-icon-button large';
    element.dataset['testid'] = button.id;
    element.title = button.label;
    element.innerHTML = `<span class="wd3-toolbar-icon">${button.icon}</span><span class="doc-toolbar-label">${button.label}</span>`;
    if (button.command && button.enabled !== false) element.addEventListener('click', button.command);
    else this.#disable(element);
    return element;
  }

  #renderIconButton(id: string, svg: string, action: () => void, command: { readonly id: string }): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wd3-toolbar-item wd3-toolbar-icon-button small';
    button.dataset['testid'] = id;
    button.title = command.id;
    button.innerHTML = `<span class="wd3-toolbar-icon">${svg}</span>`;
    if (this.#commands.has(command.id)) button.addEventListener('click', action);
    else this.#disable(button);
    return button;
  }

  #renderBoldButton(): HTMLElement {
    if (this.#commands.has(ToggleDocBoldCommand)) {
      return this.#renderIconButton(
        'doc-bold',
        icon('bold'),
        () => this.#commands.run(ToggleDocBoldCommand, void 0),
        ToggleDocBoldCommand
      );
    }
    if (this.#commands.has(SetDocBoldCommand)) {
      return this.#renderIconButton(
        'doc-bold',
        icon('bold'),
        () => this.#commands.run(SetDocBoldCommand, { bold: true }),
        SetDocBoldCommand
      );
    }
    return this.#renderDisabledIconButton('doc-bold', icon('bold'), 'Bold');
  }

  #renderItalicButton(): HTMLElement {
    if (this.#commands.has(ToggleDocItalicCommand)) {
      return this.#renderIconButton('doc-italic', icon('italic'), () => this.#toggleItalic(), ToggleDocItalicCommand);
    }
    if (this.#commands.has(SetDocItalicCommand)) {
      return this.#renderIconButton(
        'doc-italic',
        icon('italic'),
        () => this.#commands.run(SetDocItalicCommand, { italic: true }),
        SetDocItalicCommand
      );
    }
    return this.#renderDisabledIconButton('doc-italic', icon('italic'), 'Italic');
  }

  #renderUnderlineButton(): HTMLElement {
    if (this.#commands.has(ToggleDocUnderlineCommand)) {
      return this.#renderIconButton(
        'doc-underline',
        icon('underline'),
        () => this.#toggleUnderline(),
        ToggleDocUnderlineCommand
      );
    }
    if (this.#commands.has(SetDocUnderlineCommand)) {
      return this.#renderIconButton(
        'doc-underline',
        icon('underline'),
        () => this.#commands.run(SetDocUnderlineCommand, { underline: true }),
        SetDocUnderlineCommand
      );
    }
    return this.#renderDisabledIconButton('doc-underline', icon('underline'), 'Underline');
  }

  #renderStrikethroughButton(): HTMLElement {
    if (this.#commands.has(ToggleDocStrikethroughCommand)) {
      return this.#renderIconButton(
        'doc-strike',
        icon('strike'),
        () => this.#toggleStrikethrough(),
        ToggleDocStrikethroughCommand
      );
    }
    if (this.#commands.has(SetDocStrikethroughCommand)) {
      return this.#renderIconButton(
        'doc-strike',
        icon('strike'),
        () => this.#commands.run(SetDocStrikethroughCommand, { strikethrough: true }),
        SetDocStrikethroughCommand
      );
    }
    return this.#renderDisabledIconButton('doc-strike', icon('strike'), 'Strikethrough');
  }

  #toggleItalic(): void {
    if (this.#commands.has(ToggleDocItalicCommand)) this.#commands.run(ToggleDocItalicCommand, void 0);
    else if (this.#commands.has(SetDocItalicCommand)) this.#commands.run(SetDocItalicCommand, { italic: true });
  }

  #toggleUnderline(): void {
    if (this.#commands.has(ToggleDocUnderlineCommand)) this.#commands.run(ToggleDocUnderlineCommand, void 0);
    else if (this.#commands.has(SetDocUnderlineCommand))
      this.#commands.run(SetDocUnderlineCommand, { underline: true });
  }

  #toggleStrikethrough(): void {
    if (this.#commands.has(ToggleDocStrikethroughCommand)) {
      this.#commands.run(ToggleDocStrikethroughCommand, void 0);
    } else if (this.#commands.has(SetDocStrikethroughCommand)) {
      this.#commands.run(SetDocStrikethroughCommand, { strikethrough: true });
    }
  }

  #renderDisabledButton(id: string, text: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset['testid'] = id;
    button.title = label;
    button.textContent = text;
    button.className = 'wd3-toolbar-item wd3-toolbar-icon-button small';
    this.#disable(button);
    return button;
  }

  #renderDisabledIconButton(id: string, svg: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset['testid'] = id;
    button.title = label;
    button.className = 'wd3-toolbar-item wd3-toolbar-icon-button small disabled';
    button.innerHTML = `<span class="wd3-toolbar-icon">${svg}</span>`;
    button.disabled = true;
    return button;
  }

  #renderDisabledSelect(id: string, value: string, label: string): HTMLElement {
    const select = document.createElement('button');
    select.type = 'button';
    select.dataset['testid'] = id;
    select.title = label;
    select.textContent = `${value} ⌄`;
    select.className = 'wd3-toolbar-item doc-toolbar-select disabled';
    select.disabled = true;
    return select;
  }

  #renderFontFamilySelect(): HTMLElement {
    const select = document.createElement('select');
    select.dataset['testid'] = 'doc-font-family';
    select.title = 'Font';
    select.className = 'wd3-toolbar-item doc-toolbar-select doc-toolbar-font-family-select';
    DOC_FONT_FAMILIES.forEach((font) => {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.label;
      option.style.fontFamily = font.value || 'inherit';
      select.appendChild(option);
    });
    if (!this.#commands.has(SetDocFontFamilyCommand)) {
      this.#disable(select);
      return select;
    }
    select.addEventListener('change', () => {
      this.#commands.run(SetDocFontFamilyCommand, { fontFamily: select.value || null });
    });
    return select;
  }

  #renderFontSizeSelect(): HTMLElement {
    const select = document.createElement('select');
    select.dataset['testid'] = 'doc-font-size';
    select.title = 'Font size';
    select.className = 'wd3-toolbar-item doc-toolbar-select';
    DOC_FONT_SIZES.forEach((size) => {
      const option = document.createElement('option');
      option.value = size.value;
      option.textContent = size.label;
      if (size.value === '12') option.selected = true;
      select.appendChild(option);
    });
    if (!this.#commands.has(SetDocFontSizeCommand)) {
      this.#disable(select);
      return select;
    }
    select.addEventListener('change', () => {
      this.#commands.run(SetDocFontSizeCommand, {
        fontSize: select.value ? Number(select.value) : null,
      });
    });
    return select;
  }

  #disable(element: HTMLElement): void {
    element.classList.add('disabled');
    if (element instanceof HTMLButtonElement || element instanceof HTMLSelectElement) element.disabled = true;
  }

  #insertTable(): void {
    this.#commands.run(InsertDocTableCommand, { rows: 2, columns: 2 });
  }

  get #commands(): DocCommandBus {
    return this.#editor.commands;
  }
}

const DISABLED_DOC_INLINE_STYLE_STATUS = { enabled: false, active: false, value: null } as const;

const DESIGNED_DOC_ICONS: Readonly<Record<string, string>> = {
  undo: DESIGNED_TOOLBAR_ICONS.undo,
  redo: DESIGNED_TOOLBAR_ICONS.redo,
  bold: DESIGNED_TOOLBAR_ICONS.bold,
  italic: DESIGNED_TOOLBAR_ICONS.italic,
  underline: DESIGNED_TOOLBAR_ICONS.underline,
  strike: DESIGNED_TOOLBAR_ICONS.strikethrough,
  fontColor: DESIGNED_TOOLBAR_ICONS.fontColor,
  align: DESIGNED_TOOLBAR_ICONS.alignLeft,
  indent: DESIGNED_TOOLBAR_ICONS.indentIncrease,
  indentDecrease: DESIGNED_TOOLBAR_ICONS.indentDecrease,
  indentIncrease: DESIGNED_TOOLBAR_ICONS.indentIncrease,
  link: DESIGNED_TOOLBAR_ICONS.link,
  search: DESIGNED_TOOLBAR_ICONS.find,
  comment: DESIGNED_TOOLBAR_ICONS.comment,
  painter: DESIGNED_TOOLBAR_ICONS.formatPainter,
  eraser: DESIGNED_TOOLBAR_ICONS.clearFormat,
};

function icon(
  type:
    | 'menu'
    | 'plus'
    | 'undo'
    | 'redo'
    | 'bold'
    | 'italic'
    | 'more'
    | 'underline'
    | 'strike'
    | 'fontColor'
    | 'align'
    | 'list'
    | 'indent'
    | 'highlight'
    | 'lineHeight'
    | 'indentDecrease'
    | 'indentIncrease'
    | 'listUnordered'
    | 'listOrdered'
    | 'listTask'
    | 'link'
    | 'search'
    | 'mention'
    | 'comment'
    | 'painter'
    | 'eraser'
    | 'ai'
): string {
  const designedIcon = DESIGNED_DOC_ICONS[type];
  if (designedIcon) return designedIcon;
  const paths: Record<string, string> = {
    menu: '<path fill="currentColor" d="M3 12.75h10a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1 0-1.5Zm0-5.5h10a.75.75 0 0 1 0 1.5H3a.75.75 0 1 1 0-1.5Zm0-5.5h10a.75.75 0 0 1 0 1.5H3a.75.75 0 1 1 0-1.5Z"/>',
    plus: '<path fill="currentColor" fill-rule="evenodd" d="M15.5 8a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Zm-6.748-.75V5a.75.75 0 1 0-1.5 0v2.25H5a.75.75 0 1 0 0 1.5h2.252V11a.75.75 0 1 0 1.5 0V8.75H11a.75.75 0 0 0 0-1.5H8.752Z" clip-rule="evenodd"/>',
    undo: '<path fill="currentColor" fill-rule="evenodd" d="M5.15 1.5a.65.65 0 0 1-.19.46L3.07 3.85H9q2.133 0 3.642 1.508Q14.15 6.867 14.15 9t-1.508 3.642Q11.133 14.15 9 14.15H4.5a.65.65 0 1 1 0-1.3H9q1.595 0 2.723-1.128Q12.85 10.595 12.85 9t-1.127-2.722Q10.595 5.15 9 5.15H3.07l1.89 1.89a.65.65 0 0 1-.92.92L.58 4.5l3.46-3.46a.65.65 0 0 1 1.11.46Z"/>',
    redo: '<path fill="currentColor" fill-rule="evenodd" d="M10.85 1.5a.65.65 0 0 0 .19.46l1.89 1.89H7q-2.133 0-3.642 1.508Q1.85 6.867 1.85 9t1.508 3.642Q4.867 14.15 7 14.15h4.5a.65.65 0 1 0 0-1.3H7q-1.595 0-2.722-1.128Q3.15 10.595 3.15 9t1.128-2.722Q5.405 5.15 7 5.15h5.93l-1.89 1.89a.65.65 0 0 0 .92.92l3.46-3.46-3.46-3.46a.65.65 0 0 0-1.11.46Z"/>',
    bold: '<path fill="currentColor" d="M3.208 7.889a.8.8 0 0 1-.008-.111V2a.8.8 0 0 1 .8-.8h3.852q1.555 0 2.655 1.103 1.099 1.102 1.099 2.66 0 1.513-1.052 2.541.625.275 1.147.8Q12.8 9.404 12.8 10.962q0 1.56-1.12 2.606-1.08 1.009-2.634 1.009H4a.8.8 0 0 1-.8-.8V8a.8.8 0 0 1 .008-.111Zm4.644-.911q.923 0 1.542-.579.612-.57.612-1.436 0-.897-.632-1.53-.63-.633-1.522-.633H4.8v4.178h3.052Zm1.194 6q.923 0 1.543-.579.611-.57.611-1.436 0-.897-.632-1.53-.63-.633-1.522-.633H4.8v4.178h4.246Z"/>',
    italic:
      '<path fill="currentColor" d="M9.523 1.35H6.667a.65.65 0 1 0 0 1.3h2.14L5.84 13.35H3.5a.65.65 0 0 0 0 1.3h5.833a.65.65 0 1 0 0-1.3H7.188l2.968-10.7H12.5a.65.65 0 0 0 0-1.3H9.81a.65.65 0 0 0-.287 0Z"/>',
    more: '<path fill="currentColor" d="M8 5.563a1.562 1.562 0 1 1 0-3.125 1.562 1.562 0 0 1 0 3.125Zm0 6a1.563 1.563 0 1 1 0-3.126 1.563 1.563 0 0 1 0 3.126Zm0 6a1.562 1.562 0 1 1 0-3.126 1.562 1.562 0 1 1 0 3.125Z"/>',
    underline:
      '<path fill="currentColor" d="M2.5 15.2h11a.3.3 0 0 1 0 .6h-11a.3.3 0 0 1 0-.6ZM3.35 2a.65.65 0 1 1 1.3 0v6.857q0 2.349.863 3.458Q6.318 13.35 8 13.35t2.487-1.035q.863-1.11.863-3.458V2a.65.65 0 1 1 1.3 0v6.857q0 2.795-1.137 4.256Q10.318 14.65 8 14.65q-2.318 0-3.513-1.537Q3.35 11.652 3.35 8.857V2Z"/>',
    strike:
      '<path fill="currentColor" d="M1.5 7.2h13a.3.3 0 0 1 0 .6h-13a.3.3 0 1 1 0-.6Zm8.104 1.037q.593.364 1.033.804.902.904 1.088 2.024.173 1.044-.307 2.014-.458.926-1.36 1.488-.937.583-2.058.583-3.665 0-4.42-3.019a.65.65 0 1 1 1.261-.315Q5.35 13.85 8 13.85q.75 0 1.37-.386.589-.367.883-.961.294-.595.19-1.226-.118-.708-.726-1.317-.331-.332-.793-.615a.65.65 0 1 1 .68-1.108ZM4.16 4.423q.067.966.646 1.853a.65.65 0 1 0 1.089-.71q-.394-.604-.438-1.234-.04-.582.227-1.065.275-.496.822-.786Q7.13 2.15 8 2.15q2.392 0 3.18 2.105a.65.65 0 1 0 1.218-.457Q11.292.85 8 .85q-1.192 0-2.103.482-.888.47-1.35 1.306-.454.819-.387 1.785Z"/>',
    fontColor:
      '<path fill="currentColor" d="M11.904 12.11 10.509 8.9H5.49l-1.395 3.21a.65.65 0 0 1-1.192-.52l1.565-3.6 2.935-6.75a.65.65 0 0 1 1.192 0l2.935 6.75 1.565 3.6a.651.651 0 1 1-1.192.52ZM8 3.13 6.057 7.6h3.886L8 3.13Z"/><path fill="rgb(44, 44, 43)" fill-rule="evenodd" d="M1 14.7a.8.8 0 0 0 .8.8h12.4a.8.8 0 1 0 0-1.6H1.8a.8.8 0 0 0-.8.8Z"/><path fill="#6B7294" fill-opacity="0.32" d="M1.8 15.5h12.4a.8.8 0 1 0 0-1.6H1.8a.8.8 0 0 0 0 1.6Zm-.424-.376Q1.2 14.95 1.2 14.7t.176-.424q.175-.176.424-.176h12.4q.249 0 .424.176.176.175.176.424t-.176.424q-.175.176-.424.176H1.8q-.249 0-.424-.176Z"/>',
    align:
      '<path fill="currentColor" d="M1.5 1.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Zm-.022 11h10.778a.65.65 0 1 1 0 1.3H1.478a.65.65 0 0 1 0-1.3Zm.022-5.5H9a.65.65 0 0 1 0 1.3H1.5a.65.65 0 0 1 0-1.3Z"/>',
    list: '<path fill="currentColor" d="M2 3h1.5v1.5H2V3Zm3 0h9v1.5H5V3ZM2 7.25h1.5v1.5H2v-1.5Zm3 0h9v1.5H5v-1.5ZM2 11.5h1.5V13H2v-1.5Zm3 0h9V13H5v-1.5Z"/>',
    indent:
      '<path fill="currentColor" d="M2 3h12v1.3H2V3Zm4 4.35h8v1.3H6v-1.3Zm-4 4.35h12V13H2v-1.3Z"/><path fill="currentColor" d="m2 7.05 2.1 1.3L2 9.65v-2.6Z"/>',
    highlight:
      '<path fill="currentColor" d="m8.18.59-5.74 5.74q-.48.48-.48 1.16t.48 1.17l4.03 4.03q.48.48 1.17.48t1.16-.48l5.24-5.24q.49-.49.49-1.17t-.49-1.16L10.51.59Q10.03.1 9.35.1t-1.17.49ZM3.86 7.24l1.6-1.6h4.37a.65.65 0 1 0 0-1.3H6.76l2.34-2.34q.25-.25.49 0l4.03 4.03q.25.25 0 .5L10.66 9H5.62L3.86 7.24Z"/><path fill="#FCC102" d="M1.8 14h12.4a.8.8 0 1 1 0 1.6H1.8a.8.8 0 1 1 0-1.6Z"/>',
    lineHeight:
      '<path fill="currentColor" d="M8.5 12.85h6a.65.65 0 1 1 0 1.3h-6a.65.65 0 0 1 0-1.3Zm0-5.5h6a.65.65 0 1 1 0 1.3h-6a.65.65 0 0 1 0-1.3Zm0-5.5h6a.65.65 0 1 1 0 1.3h-6a.65.65 0 1 1 0-1.3Z"/><path fill="#256CFB" d="M5.313 11.04 4.15 12.203V3.797L5.313 4.96a.65.65 0 0 0 .92-.92L3.5 1.308.768 4.04a.65.65 0 0 0 .919.92L2.85 3.797v8.406l-1.163-1.162a.65.65 0 1 0-.92.919L3.5 14.692l2.732-2.732a.65.65 0 1 0-.919-.92Z"/>',
    indentDecrease:
      '<path fill="currentColor" d="M1.5 12.85h13v1.3h-13v-1.3Zm8.5-5.5h4.5v1.3H10v-1.3Zm-8.5-5.5h13v1.3h-13v-1.3Z"/><path fill="currentColor" d="M3.3 8.65H7a.65.65 0 1 0 0-1.3H3.3l1.16-1.16a.65.65 0 1 0-.92-.92L.81 8l2.73 2.73a.65.65 0 1 0 .92-.92L3.3 8.65Z"/>',
    indentIncrease:
      '<path fill="currentColor" d="M1.5 12.85h13v1.3h-13v-1.3Zm8.5-5.5h4.5v1.3H10v-1.3Zm-8.5-5.5h13v1.3h-13v-1.3Z"/><path fill="currentColor" d="M5.2 8.65H1.5a.65.65 0 1 1 0-1.3h3.7L4.04 6.19a.65.65 0 0 1 .92-.92L7.69 8 4.96 10.73a.65.65 0 1 1-.92-.92L5.2 8.65Z"/>',
    listUnordered:
      '<path fill="currentColor" d="M5.5 12.35h9a.65.65 0 1 1 0 1.3h-9a.65.65 0 0 1 0-1.3Zm0-5h9a.65.65 0 1 1 0 1.3h-9a.65.65 0 0 1 0-1.3Zm0-5h9a.65.65 0 1 1 0 1.3h-9a.65.65 0 1 1 0-1.3Z"/><path fill="#256CFB" d="M3 3A1.2 1.2 0 1 1 .6 3 1.2 1.2 0 0 1 3 3Zm0 5A1.2 1.2 0 1 1 .6 8 1.2 1.2 0 0 1 3 8Zm0 5a1.2 1.2 0 1 1-2.4 0A1.2 1.2 0 0 1 3 13Z"/>',
    listOrdered:
      '<path fill="currentColor" d="M6 12.35h8.5a.65.65 0 1 1 0 1.3H6a.65.65 0 0 1 0-1.3Zm0-5h8.5a.65.65 0 1 1 0 1.3H6a.65.65 0 0 1 0-1.3Zm0-5h8.5a.65.65 0 1 1 0 1.3H6a.65.65 0 1 1 0-1.3Z"/><path fill="#256CFB" d="M1.5 14.067a.65.65 0 0 1-.65-.65V13a.65.65 0 0 1 .157-.423l1.843-2.15v-.36H1.5a.65.65 0 1 1 0-1.3h2a.65.65 0 0 1 .65.65v1.25a.65.65 0 0 1-.156.423l-1.438 1.677H3.5a.65.65 0 1 1 0 1.3h-2Zm2-7.412h-2a.65.65 0 0 1 0-1.3h.35V3.553a.65.65 0 0 1-.81-1.006l1-1.005A.65.65 0 0 1 3.15 2v3.355h.35a.65.65 0 0 1 0 1.3Z"/>',
    listTask:
      '<path fill="currentColor" d="M14.65 8v5q0 .68-.48 1.17-.49.48-1.17.48H3q-.68 0-1.17-.48Q1.35 13.68 1.35 13V3q0-.68.48-1.17Q2.32 1.35 3 1.35h6a.65.65 0 1 1 0 1.3H3q-.35 0-.35.35v10q0 .35.35.35h10q.35 0 .35-.35V8a.65.65 0 1 1 1.3 0Zm0-5a.65.65 0 0 1-.17.44l-6.96 7.5-2.98-3.3a.65.65 0 1 1 .92-.92l2.02 2.02 6.04-6.5a.65.65 0 0 1 1.13.76Z"/>',
    link: '<path fill="currentColor" d="M11.54 8.54a.65.65 0 1 0 .92.92l1.5-1.5Q15.19 6.73 15.19 5t-1.23-2.96Q12.73.81 11 .81T8.04 2.04l-1.5 1.5a.65.65 0 1 0 .92.92l1.5-1.5q.85-.85 2.04-.85t2.04.85q.85.85.85 2.04t-.85 2.04l-1.5 1.5ZM10.65 6a.65.65 0 0 1-.19.46l-4 4a.65.65 0 1 1-.92-.92l4-4a.65.65 0 0 1 1.11.46Z"/>',
    search:
      '<path fill="currentColor" d="M1.5 12.85H5v1.3H1.5v-1.3Zm0-5.5h2v1.3h-2v-1.3Zm0-5.5h13v1.3h-13v-1.3Zm10.96 11q-1.06.8-2.46.8-1.73 0-2.95-1.22-1.22-1.22-1.22-2.95t1.22-2.95q1.22-1.22 2.95-1.22t2.95 1.22q1.22 1.22 1.22 2.95 0 1.39-.8 2.46l1.56 1.56a.65.65 0 1 1-.92.92l-1.55-1.56Z"/>',
    mention:
      '<path fill="currentColor" d="M8 2.02q2.48 0 4.23 1.75Q13.98 5.52 13.98 8q0 .3-.03.61a.65.65 0 0 0 0 .17q-.09.55-.48 1.05-.49.62-1.05.62t-1.05-.62q-.51-.65-.51-1.38V5.35a.65.65 0 0 0-1.24-.28q-.88-.82-2.06-.82-1.4 0-2.37 1.13Q4.26 6.48 4.26 8q0 1.52.93 2.61.97 1.13 2.37 1.13 1.4 0 2.37-1.13.11-.13.21-.27.1.15.2.29.39.5.89.79.57.33 1.19.33.62 0 1.19-.33.5-.29.89-.79.37-.47.57-1.03.21-.58.21-1.15 0-3.02-2.13-5.15Q11.02.72 8 .72T2.85 2.85Q.72 4.98.72 8t2.13 5.15Q4.98 15.28 8 15.28q1.3 0 2.5-.44l-.45-1.22q-.99.36-2.06.36-2.48 0-4.23-1.75Q2.02 10.48 2.02 8t1.75-4.23Q5.52 2.02 8 2.02Z"/>',
    comment:
      '<path fill="currentColor" d="M5.15 7.3a.65.65 0 1 1 0-1.3h5.7a.65.65 0 1 1 0 1.3h-5.7Zm0 3a.65.65 0 1 1 0-1.3h3.2a.65.65 0 1 1 0 1.3h-3.2ZM15 8.47v-.94A6.53 6.53 0 0 0 8.47 1h-.94A6.53 6.53 0 0 0 1 7.53v7c0 .26.21.47.47.47h7A6.53 6.53 0 0 0 15 8.47ZM13.7 8.47v-.94q0-2.17-1.53-3.7Q10.64 2.3 8.47 2.3h-.94q-2.17 0-3.7 1.53Q2.3 5.37 2.3 7.53V13.7h6.17q2.17 0 3.7-1.53 1.53-1.53 1.53-3.7Z"/>',
    painter:
      '<path fill="currentColor" d="M.68 2.67V4q0 .82.58 1.4.58.58 1.4.58h8q.82 0 1.4-.58.58-.58.58-1.4v-.02h.68q.28 0 .48.2.2.2.2.48v2q0 .28-.2.48t-.48.2H8q-.82 0-1.4.58-.58.58-.58 1.4v.68H6q-.55 0-.93.39-.39.39-.39.93V14q0 .55.39.93.38.39.93.39h1.33q.55 0 .93-.39.39-.38.39-.93v-2.67q0-.55-.39-.93-.38-.39-.93-.39h-.02v-.68q0-.28.2-.48t.48-.2h5.33q.82 0 1.4-.58.58-.58.58-1.4v-2q0-.82-.58-1.4-.58-.58-1.4-.58h-.68v-.02q0-.82-.58-1.4-.58-.58-1.4-.58h-8q-.82 0-1.4.58-.58.58-.58 1.4Z"/>',
    eraser:
      '<path fill="currentColor" d="M5.12 14.86h9.1a.65.65 0 1 0 0-1.3h-4.15l4.9-4.9q.6-.6.6-1.45t-.6-1.45l-4.2-4.2q-.6-.6-1.45-.6t-1.45.6l-7 7q-.6.6-.6 1.45t.6 1.45l2.8 2.8q.6.6 1.45.6Zm2.49-1.3H5.12q-.31 0-.53-.22l-2.8-2.8q-.53-.53 0-1.06l5.3-5.3q.22-.22.53-.22t.53.22l4.2 4.2q.53.53 0 1.06l-5.2 5.21Z"/>',
    ai: '<path fill="currentColor" fill-rule="evenodd" d="M15.33 8A7.33 7.33 0 1 1 .67 8a7.33 7.33 0 0 1 14.66 0Zm-1.1 0a6.23 6.23 0 0 0-12.17-1.9 2.09 2.09 0 1 1 3.33 2.46c-.55.62-.88 1.23-.9 2.1-.03 1.07.82 2.14 1.63 2.59.81.45 1.79.73 3.23.52 1.2-.17 2.52-.74 3.52-1.88A6.2 6.2 0 0 0 14.23 8Z"/>',
  };
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">${paths[type]}</svg>`;
}
