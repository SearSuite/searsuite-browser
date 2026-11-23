import { focusWebSheetSurface } from '../focusWebSheetSurface';
import { WebControlEventScope } from '../WebControlEventScope';
import { type SheetCommandBus, type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { type ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { type TextInput } from '@searsuite/sear-render-input';
import { GetActiveCell } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery, CommitCellEditCommand } from '@searsuite/sear-plugin-cell-editor';
import {
  DropdownPickerRequest,
  OpenDropdownPickerCommand,
  ReadDropdownCellQuery,
  PickDropdownOptionCommand,
  ClearDropdownValueCommand,
  type DropdownCellInput,
} from '@searsuite/sear-plugin-dropdown';
/** Host picker, keyboard scope and configuration entry for one mounted Sheet. */
export class WebDropdownController {
  private panel: HTMLElement | null = null;
  private ownsFocus = false;
  private focusFrame: number | null = null;
  private disposed = false;
  private readonly controls: WebControlEventScope;
  private readonly disposers: (() => void)[] = [];
  /** Binds typed interaction requests; persistent rule editing stays in the validation dialog. */
  constructor(
    button: HTMLButtonElement,
    private readonly surface: unknown,
    private readonly platform: Platform,
    private readonly commands: SheetCommandBus,
    private readonly queries: SheetQueryRegistry,
    observations: ObservationRegistry,
    private readonly configure: (ruleId?: string) => void,
    private readonly textInput?: TextInput,
  ) {
    this.controls = new WebControlEventScope(platform);
    button.disabled = false;
    button.classList.remove('disabled');
    button.title = 'Dropdown (Alt + Down to open options)';
    this.disposers.push(
      platform.addEventListener(button, 'click', () => {
        if (this.commit()) this.configure(this.activeRuleId());
      }),
      observations.subscribe(DropdownPickerRequest, (input) => this.open(input)),
      platform.addEventListener(document, 'focusin', (event) => {
        const target = (event as FocusEvent).target;
        if (this.panel && target instanceof Element && target.id === 'searTextInput') {
          this.panel.querySelector<HTMLInputElement>('[aria-label="Search dropdown options"]')?.focus();
        }
      }),
      platform.addEventListener(
        document,
        'mousedown',
        (event) => {
          const target = (event as MouseEvent).target;
          this.ownsFocus = target instanceof Node && surface instanceof Node && surface.contains(target);
          if (this.panel && target instanceof Node && !this.panel.contains(target)) this.close();
        },
        { capture: true },
      ),
      platform.addEventListener(
        window,
        'keydown',
        (event) => {
          const key = event as KeyboardEvent;
          if (key.key === 'Escape' && this.panel) {
            key.preventDefault();
            key.stopPropagation();
            this.close(true);
            return;
          }
          if (this.panel && key.target instanceof Node && this.panel.contains(key.target)) {
            if (key.key === 'ArrowDown' || key.key === 'ArrowUp') {
              const items = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[role="option"]'));
              if (items.length) {
                const index = items.indexOf(document.activeElement as HTMLButtonElement);
                const next =
                  index < 0
                    ? key.key === 'ArrowDown'
                      ? 0
                      : items.length - 1
                    : (index + (key.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                key.preventDefault();
                items[next]?.focus();
              }
            }
            key.stopPropagation();
            return;
          }
          if (
            key.defaultPrevented ||
            key.repeat ||
            !this.ownsFocus ||
            key.key !== 'ArrowDown' ||
            !key.altKey ||
            key.ctrlKey ||
            key.metaKey ||
            key.shiftKey
          )
            return;
          const target = key.target;
          if (
            target instanceof Element &&
            target.closest('input,textarea,select,button,[contenteditable="true"]') &&
            target.id !== 'searTextInput'
          )
            return;
          const cell = this.queries.run(GetActiveCell, undefined);
          if (!cell) return;
          const input = { row: cell[0], column: cell[1] };
          if (!this.queries.run(ReadDropdownCellQuery, input)) return;
          key.preventDefault();
          key.stopPropagation();
          if (!this.commit()) return;
          this.commands.run(OpenDropdownPickerCommand, input);
        },
        { capture: true },
      ),
    );
  }
  private commit(): boolean {
    if (this.queries.has(IsCellEditingQuery) && this.queries.run(IsCellEditingQuery, undefined)) {
      this.commands.run(CommitCellEditCommand, undefined);
      return !this.queries.run(IsCellEditingQuery, undefined);
    }
    return true;
  }
  private activeRuleId(): string | undefined {
    const cell = this.queries.run(GetActiveCell, undefined);
    return cell ? this.queries.run(ReadDropdownCellQuery, { row: cell[0], column: cell[1] })?.ruleId : undefined;
  }
  /** Opens a current, searchable option view; each action rereads the owner state. */
  public open(input: DropdownCellInput): void {
    if (this.disposed) return;
    const state = this.queries.run(ReadDropdownCellQuery, input);
    if (!state) return;
    this.close();
    const panel = document.createElement('section');
    this.panel = panel;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Dropdown options');
    panel.style.cssText =
      'position:fixed;right:14px;top:105px;width:300px;max-height:calc(100vh - 150px);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid #dbe2ed;border-radius:10px;background:white;box-shadow:0 8px 30px #12244722;z-index:10060;font:13px sans-serif;color:#263247';
    const title = document.createElement('h2');
    title.textContent = state.multiple ? 'Dropdown · multiple selection' : 'Dropdown · single selection';
    title.style.fontSize = '16px';
    panel.append(title);
    if (state.inputMessage) {
      const prompt = document.createElement('p');
      prompt.textContent = state.inputMessage;
      panel.append(prompt);
    }
    const search = document.createElement('input');
    search.type = 'search';
    search.setAttribute('aria-label', 'Search dropdown options');
    search.placeholder = 'Search options';
    search.style.cssText = 'box-sizing:border-box;width:100%;padding:8px;margin-bottom:8px';
    panel.append(search);
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Dropdown list options');
    if (state.multiple) list.setAttribute('aria-multiselectable', 'true');
    panel.append(list);
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.style.color = '#b42318';
    panel.append(error);
    const render = () => {
      const current = this.queries.run(ReadDropdownCellQuery, input);
      const active = document.activeElement;
      const focusedLabel =
        active instanceof Element && list.contains(active) ? active.getAttribute('aria-label') : null;
      this.controls.release(list);
      list.replaceChildren();
      if (!current || current.ruleId !== state.ruleId) {
        error.textContent = 'The list has changed. Open it again.';
        return;
      }
      const options = current.options.filter((option) =>
        option.label.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
      );
      for (const option of options) {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(current.selected.includes(option.label)));
        item.textContent = (current.selected.includes(option.label) ? '✓ ' : '') + option.label;
        item.setAttribute('aria-label', option.label);
        item.style.cssText =
          'display:block;text-align:left;width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:5px;margin:4px 0;cursor:pointer;';
        item.style.backgroundColor = option.color ?? '#f8fafc';
        this.controls.listen(item, 'click', () => {
          try {
            this.commands.run(PickDropdownOptionCommand, { ...input, ruleId: state.ruleId, label: option.label });
            if (state.multiple) render();
            else this.close(true);
          } catch (cause) {
            error.textContent = cause instanceof Error ? cause.message : String(cause);
          }
        });
        list.append(item);
      }
      if (focusedLabel !== null) {
        Array.from(list.querySelectorAll<HTMLButtonElement>('[role="option"]'))
          .find((item) => item.getAttribute('aria-label') === focusedLabel)
          ?.focus();
      }
      if (!options.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No matching options';
        list.append(empty);
      }
    };
    this.controls.listen(search, 'input', render);
    const action = (label: string, run: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = 'padding:6px 10px;margin:8px 5px 0 0';
      this.controls.listen(button, 'click', () => {
        try {
          run();
        } catch (cause) {
          error.textContent = cause instanceof Error ? cause.message : String(cause);
        }
      });
      panel.append(button);
    };
    action('Clear selection', () => {
      this.commands.run(ClearDropdownValueCommand, input);
      render();
    });
    action('Edit dropdown list', () => {
      this.close();
      this.configure(state.ruleId);
    });
    action('Close dropdown options', () => this.close(true));
    document.body.append(panel);
    render();
    search.focus();
    this.focusFrame = this.platform.requestAnimationFrame(() => {
      this.focusFrame = null;
      if (this.panel === panel) search.focus();
    });
  }
  private close(restoreFocus = false): void {
    const wasOpen = this.panel !== null;
    if (this.focusFrame !== null) this.platform.cancelAnimationFrame(this.focusFrame);
    this.focusFrame = null;
    this.controls.clear();
    this.panel?.remove();
    this.panel = null;
    if (wasOpen && restoreFocus && !this.disposed) {
      if (this.textInput) {
        this.textInput.startListener();
        this.ownsFocus = true;
      } else this.ownsFocus = focusWebSheetSurface(this.surface);
    }
  }
  /** Removes all scoped listeners and transient controls before editor teardown. */
  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposers.reverse().forEach((dispose) => dispose());
    this.close();
  }
}
