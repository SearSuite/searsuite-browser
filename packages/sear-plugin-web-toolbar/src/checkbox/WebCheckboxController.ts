import { focusWebSheetSurface } from '../focusWebSheetSurface';
import { WebControlEventScope } from '../WebControlEventScope';
import {
  CommandExecutionPhase,
  type SheetCommandBus,
  type SheetQueryRegistry,
  type SheetRangeInput,
} from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { GetSelection, GetSelections } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery, CommitCellEditCommand } from '@searsuite/sear-plugin-cell-editor';
import {
  InsertCheckboxesCommand,
  SetCheckboxesCommand,
  ToggleCheckboxesCommand,
  RemoveCheckboxesCommand,
  ReadCheckboxRangeQuery,
  CheckboxRemovalMode,
  CheckboxError,
  CheckboxErrorCode,
} from '@searsuite/sear-plugin-checkbox';
/** Disposed host panel and scoped Space binding for one Sheet toolbar. */
export class WebCheckboxController {
  private panel: HTMLElement | null = null;
  private disposed = false;
  private ownsFocus = false;
  private disposePanelCommands: (() => void) | null = null;
  private readonly controls: WebControlEventScope;
  private readonly disposers: (() => void)[] = [];
  /** Binds host actions; every mutation is dispatched through the owning command bus. */ public constructor(
    button: HTMLButtonElement,
    private readonly surface: unknown,
    private readonly platform: Platform,
    private readonly commands: SheetCommandBus,
    private readonly queries: SheetQueryRegistry,
    private readonly openValidation?: () => void,
  ) {
    this.controls = new WebControlEventScope(platform);
    button.disabled = false;
    button.classList.remove('disabled');
    button.title = 'Checkbox (press Space to toggle selected cells)';
    button.setAttribute('aria-label', 'Checkbox');
    this.disposers.push(
      platform.addEventListener(button, 'click', () => this.open()),
      platform.addEventListener(
        document,
        'mousedown',
        (event) => {
          const target = (event as MouseEvent).target;
          this.ownsFocus = target instanceof Node && surface instanceof Node && surface.contains(target);
        },
        { capture: true },
      ),
      platform.addEventListener(
        document,
        'keydown',
        (event) => {
          const key = event as KeyboardEvent;
          if (key.defaultPrevented) return;
          if (key.key === 'Escape' && this.panel) {
            key.preventDefault();
            this.close(true);
            return;
          }
          if (
            !this.ownsFocus ||
            key.repeat ||
            key.key !== ' ' ||
            key.ctrlKey ||
            key.metaKey ||
            key.altKey ||
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
          if (this.queries.has(IsCellEditingQuery) && this.queries.run(IsCellEditingQuery, undefined)) return;
          if (this.selectionCount() > 1) return;
          const range = this.selection();
          if (!range || !this.queries.run(ReadCheckboxRangeQuery, range).count) return;
          key.preventDefault();
          key.stopPropagation();
          this.commands.run(ToggleCheckboxesCommand, range);
        },
        { capture: true },
      ),
    );
  }
  /** Opens checkbox insertion and bulk actions for the current selection. */ public open(): void {
    if (this.disposed) return;
    if (this.queries.has(IsCellEditingQuery) && this.queries.run(IsCellEditingQuery, undefined)) {
      if (!this.commands.has(CommitCellEditCommand)) return;
      this.commands.run(CommitCellEditCommand, undefined);
      if (this.queries.run(IsCellEditingQuery, undefined)) return;
    }
    const range = this.selection();
    if (!range) return;
    this.close();
    const root = document.createElement('section');
    this.panel = root;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Checkbox settings');
    root.style.cssText =
      'position:fixed;right:14px;top:105px;width:310px;max-height:calc(100vh - 155px);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid #dbe2ed;border-radius:10px;background:white;box-shadow:0 8px 30px #12244722;z-index:10060;font:13px sans-serif;color:#263247';
    const title = document.createElement('h2');
    title.textContent = 'Checkbox';
    title.style.fontSize = '16px';
    root.append(title);
    let currentRange = range;
    let selectionCount = this.selectionCount();
    const state = this.queries.run(ReadCheckboxRangeQuery, range),
      summary = document.createElement('p');
    const describe = (count: number, checked: number, mixed: boolean): string =>
      selectionCount > 1
        ? `${selectionCount} nonadjacent ranges are selected. Select one contiguous range before changing checkboxes.`
        : `The selection contains ${count} ${count === 1 ? 'checkbox' : 'checkboxes'}, ${checked} checked${mixed ? ' (mixed state)' : ''}.`;
    summary.textContent = describe(state.count, state.checked, state.mixed);
    root.append(summary);
    const note = document.createElement('p');
    note.textContent = 'Click a checkbox or press Space after selecting it. Boolean values work in formulas, and copying preserves checkboxes.';
    root.append(note);
    const label = document.createElement('label'),
      replace = document.createElement('input');
    replace.type = 'checkbox';
    replace.setAttribute('aria-label', 'Replace existing non-Boolean content');
    label.append(replace, document.createTextNode('Replace existing non-Boolean content'));
    root.append(label);
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    error.style.color = '#b42318';
    this.controls.listen(replace, 'change', () => {
      error.textContent = '';
    });
    const actionButtons: { button: HTMLButtonElement; requiresCheckboxes: boolean }[] = [];
    const setActionAvailability = (count: number): void => {
      actionButtons.forEach(({ button, requiresCheckboxes }) => {
        button.disabled = selectionCount > 1 || (requiresCheckboxes && count === 0);
        button.style.opacity = button.disabled ? '0.5' : '';
        button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
      });
    };
    const action = (name: string, run: () => void, requiresCheckboxes = false, blockOnDisjoint = true) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.style.cssText =
        'padding:7px 10px;margin:6px 4px 0 0;border:1px solid #d5dce7;border-radius:5px;background:#f6f8fc;cursor:pointer';
      if (blockOnDisjoint) actionButtons.push({ button, requiresCheckboxes });
      this.controls.listen(button, 'click', () => {
        try {
          run();
          this.close(true);
        } catch (cause) {
          error.textContent =
            cause instanceof CheckboxError &&
            cause.code === CheckboxErrorCode.Conflict &&
            cause.details['reason'] === 'nonBoolean'
              ? 'Selected cells contain non-Boolean content. Select "Replace existing non-Boolean content" and try again.'
              : cause instanceof Error
              ? cause.message
              : String(cause);
        }
      });
      root.append(button);
    };
    action('Insert checkboxes', () =>
      this.commands.run(InsertCheckboxesCommand, { ...currentRange, replaceExisting: replace.checked }),
    );
    action('Check all', () => this.commands.run(SetCheckboxesCommand, { ...currentRange, checked: true }), true);
    action('Uncheck all', () => this.commands.run(SetCheckboxesCommand, { ...currentRange, checked: false }), true);
    action(
      'Convert to TRUE/FALSE text',
      () => this.commands.run(RemoveCheckboxesCommand, { ...currentRange, mode: CheckboxRemovalMode.Text }),
      true,
    );
    action(
      'Clear checkboxes',
      () => this.commands.run(RemoveCheckboxesCommand, { ...currentRange, mode: CheckboxRemovalMode.Clear }),
      true,
    );
    if (this.openValidation)
      action('Input messages and warnings', () => {
        this.close();
        this.openValidation?.();
      });
    action('Close checkbox settings', () => this.close(true), false, false);
    root.append(error);
    document.body.append(root);
    setActionAvailability(state.count);
    this.disposePanelCommands = this.commands.subscribe((event) => {
      if (event.phase !== CommandExecutionPhase.Completed || this.panel !== root) return;
      const nextRange = this.selection();
      if (!nextRange) {
        this.close();
        return;
      }
      currentRange = nextRange;
      selectionCount = this.selectionCount();
      const nextState = this.queries.run(ReadCheckboxRangeQuery, currentRange);
      summary.textContent = describe(nextState.count, nextState.checked, nextState.mixed);
      setActionAvailability(nextState.count);
    });
    replace.focus({ preventScroll: true });
  }
  private selection(): SheetRangeInput | null {
    const range = this.queries.run(GetSelection, undefined);
    return range ? { anchor: [...range.start], focus: [...range.end] } : null;
  }
  private selectionCount(): number {
    return this.queries.has(GetSelections) ? this.queries.run(GetSelections, undefined).length : 1;
  }
  private close(restoreFocus = false): void {
    const wasOpen = this.panel !== null;
    this.disposePanelCommands?.();
    this.disposePanelCommands = null;
    this.controls.clear();
    this.panel?.remove();
    this.panel = null;
    if (wasOpen && restoreFocus && !this.disposed) this.ownsFocus = focusWebSheetSurface(this.surface);
  }
  /** Releases all host callbacks before the editor-local runtime is destroyed. */ public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposers.reverse().forEach((dispose) => dispose());
    this.close();
  }
}
