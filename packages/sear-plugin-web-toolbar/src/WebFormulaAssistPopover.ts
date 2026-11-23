import type { SheetCommandBus } from '@searsuite/sear-assembly-commands';
import {
  AcceptFormulaSuggestionCommand,
  FormulaInputAssistObservation,
  type FormulaInputAssistState,
} from '@searsuite/sear-plugin-cell-editor';
import type { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { SheetI18nStateObservation } from '@searsuite/sear-plugin-i18n';
import {
  formulaAssistDiagnostic, formulaAssistListLabel, formulaAssistParameter,
  formulaAssistSuggestion, formulaAssistSummary,
} from './FormulaAssistLocalization';

const CSS = `
.sear-formula-assist{position:fixed;z-index:1200;width:min(360px,calc(100vw - 16px));max-height:min(320px,calc(100vh - 16px));overflow:auto;background:#fff;color:#263238;border:1px solid #c7d0d3;border-radius:6px;box-shadow:0 8px 22px #14252b26;font:13px/1.4 system-ui,sans-serif;pointer-events:none}
.sear-formula-assist__list{max-height:220px;overflow:auto;pointer-events:auto}
.sear-formula-assist__item{display:flex;flex-direction:column;align-items:flex-start;width:100%;min-height:36px;padding:6px 10px;border:0;border-radius:0;background:#fff;color:inherit;text-align:left;cursor:pointer}
.sear-formula-assist__item:hover,.sear-formula-assist__item[aria-selected="true"]{background:#eaf3ef}
.sear-formula-assist__name{font-weight:650;color:#175943}
.sear-formula-assist__summary{color:#5c696b;white-space:normal;overflow-wrap:anywhere;width:100%}
.sear-formula-assist__signature{padding:8px 10px;border-top:1px solid #e0e6e7;line-height:1.5;overflow-wrap:anywhere}
.sear-formula-assist__signature strong{color:#175943}
.sear-formula-assist__parameter{color:#667477}
.sear-formula-assist__parameter[data-current="true"]{color:#172e2a;font-weight:700}
.sear-formula-assist__example{display:block;margin-top:4px;color:#5c696b;font:12px/1.4 ui-monospace,SFMono-Regular,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sear-formula-assist__diagnostic{padding:8px 10px;border-top:1px solid #e0e6e7;color:#9b3b25;overflow-wrap:anywhere}
.sear-formula-assist__diagnostic[data-kind="incomplete"]{color:#6a6352}
.sear-formula-assist__diagnostic[data-kind="warning"]{color:#6a6352}
.sear-formula-assist__diagnostic-location{font-weight:700;margin-right:5px}
.sear-formula-assist__diagnostic-suggestion{display:block;margin-top:3px}
`;

let nextFormulaAssistId = 0;
const comboboxAttributes = [
  'role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant',
] as const;

/** Browser view for editor-local formula assistance. */
export class WebFormulaAssistPopover {
  private readonly root = document.createElement('div');
  private readonly style = document.createElement('style');
  private readonly disposeObservation: () => void;
  private readonly disposeLocaleObservation: () => void;
  private readonly listId = `sear-formula-assist-list-${++nextFormulaAssistId}`;
  private locale: string;
  private lastState: FormulaInputAssistState | null = null;
  private comboboxInput: HTMLElement | null = null;
  private priorInputAttributes: Map<string, string | null> | null = null;
  private pointerShield: HTMLElement | null = null;
  private pointerShieldTimer: number | null = null;
  private readonly handleFocusIn = () => this.syncCombobox();

  constructor(
    observations: ObservationRegistry,
    private readonly commands: SheetCommandBus,
    private readonly renderTarget: Element,
    defaultLocale = 'en',
  ) {
    this.locale = defaultLocale;
    this.root.className = 'sear-formula-assist';
    this.root.hidden = true;
    this.style.textContent = CSS;
    this.style.setAttribute('data-sear-formula-assist', '');
    document.head.appendChild(this.style);
    document.body.appendChild(this.root);
    document.addEventListener('focusin', this.handleFocusIn);
    this.disposeLocaleObservation = observations.has(SheetI18nStateObservation)
      ? observations.subscribe(SheetI18nStateObservation, ({ locale }) => {
        if (this.locale === locale) return;
        this.locale = locale;
        if (this.lastState) this.render(this.lastState);
      })
      : () => undefined;
    this.disposeObservation = observations.subscribe(FormulaInputAssistObservation, (state) => this.render(state));
  }

  public destroy(): void {
    this.disposeObservation();
    this.disposeLocaleObservation();
    document.removeEventListener('focusin', this.handleFocusIn);
    this.clearPointerShield();
    this.clearCombobox();
    this.root.remove();
    this.style.remove();
  }

  private render(state: FormulaInputAssistState): void {
    this.lastState = state;
    this.root.replaceChildren();
    if (!state.anchor || (!state.suggestions.length && !state.signature && !state.diagnostic)) {
      this.root.hidden = true;
      this.clearCombobox();
      return;
    }
    if (state.suggestions.length) {
      const list = document.createElement('div');
      list.className = 'sear-formula-assist__list';
      list.id = this.listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', formulaAssistListLabel(this.locale));
      state.suggestions.forEach((suggestion, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sear-formula-assist__item';
        item.id = `${this.listId}-option-${index}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === state.selectedIndex));
        const name = document.createElement('span');
        name.className = 'sear-formula-assist__name';
        name.textContent = suggestion.name;
        item.appendChild(name);
        const localizedSummary = formulaAssistSummary(suggestion, this.locale);
        if (localizedSummary) {
          const summary = document.createElement('span');
          summary.className = 'sear-formula-assist__summary';
          summary.textContent = localizedSummary;
          summary.title = localizedSummary;
          item.appendChild(summary);
        }
        item.addEventListener('pointerdown', (event) => event.preventDefault());
        item.addEventListener('click', () => {
          this.shieldAcceptedSuggestion(item);
          this.commands.run(AcceptFormulaSuggestionCommand, { name: suggestion.name });
        });
        list.appendChild(item);
      });
      this.root.appendChild(list);
    }
    if (state.signature) {
      const signature = document.createElement('div');
      signature.className = 'sear-formula-assist__signature';
      const functionName = document.createElement('strong');
      functionName.textContent = `${state.signature.name}(`;
      signature.appendChild(functionName);
      state.signature.descriptor.parameters.forEach((parameter, index) => {
        if (index > 0) signature.append(', ');
        const part = document.createElement('span');
        part.className = 'sear-formula-assist__parameter';
        part.dataset['current'] = String(
          index === Math.min(state.signature!.parameterIndex, state.signature!.descriptor.parameters.length - 1),
        );
        const localized = formulaAssistParameter(state.signature!.name, parameter, index, this.locale);
        part.textContent = `${localized.name}${parameter.optional ? '?' : ''}${parameter.repeating ? '…' : ''}`;
        part.title = localized.description;
        signature.appendChild(part);
      });
      signature.append(')');
      const example = document.createElement('span');
      example.className = 'sear-formula-assist__example';
      example.textContent = state.signature.descriptor.example;
      example.title = state.signature.descriptor.example;
      signature.appendChild(example);
      this.root.appendChild(signature);
    }
    if (state.diagnostic) {
      const diagnostic = document.createElement('div');
      diagnostic.className = 'sear-formula-assist__diagnostic';
      diagnostic.dataset['kind'] = state.diagnostic.kind;
      diagnostic.dataset['start'] = String(state.diagnostic.start);
      diagnostic.setAttribute('role', 'status');
      const location = document.createElement('span');
      location.className = 'sear-formula-assist__diagnostic-location';
      location.textContent = state.diagnostic.cellAddress
        ? this.locale.toLowerCase().startsWith('zh')
          ? `单元格 ${state.diagnostic.cellAddress}：`
          : `Cell ${state.diagnostic.cellAddress}:`
        : state.diagnostic.start === state.diagnostic.end
        ? this.locale.toLowerCase().startsWith('zh') ? '公式结尾：' : 'End of formula:'
        : this.locale.toLowerCase().startsWith('zh')
          ? `第 ${state.diagnostic.start + 1} 个字符：`
          : `Character ${state.diagnostic.start + 1}:`;
      diagnostic.append(location, ` ${formulaAssistDiagnostic(state.diagnostic.message, this.locale)}`);
      if (state.diagnostic.suggestion) {
        const suggestion = document.createElement('span');
        suggestion.className = 'sear-formula-assist__diagnostic-suggestion';
        suggestion.textContent = formulaAssistSuggestion(state.diagnostic.suggestion, this.locale);
        diagnostic.appendChild(suggestion);
      }
      this.root.appendChild(diagnostic);
    }
    this.root.hidden = false;
    this.syncCombobox();
    const target = this.renderTarget.getBoundingClientRect();
    const rect = this.root.getBoundingClientRect();
    const left = Math.max(8, Math.min(target.left + state.anchor.x, window.innerWidth - rect.width - 8));
    const below = target.top + state.anchor.y + 5;
    const top =
      below + rect.height <= window.innerHeight - 8
        ? below
        : Math.max(8, target.top + state.anchor.y - rect.height - 20);
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    const list = this.root.querySelector<HTMLElement>('.sear-formula-assist__list');
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && selected) {
      const listBounds = list.getBoundingClientRect();
      const selectedBounds = selected.getBoundingClientRect();
      if (selectedBounds.bottom > listBounds.bottom) list.scrollTop += selectedBounds.bottom - listBounds.bottom;
      else if (selectedBounds.top < listBounds.top) list.scrollTop += selectedBounds.top - listBounds.top;
    }
  }

  private shieldAcceptedSuggestion(item: HTMLElement): void {
    this.clearPointerShield();
    const bounds = item.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const shield = document.createElement('div');
    shield.style.position = 'fixed';
    shield.style.left = `${bounds.left}px`;
    shield.style.top = `${bounds.top}px`;
    shield.style.width = `${bounds.width}px`;
    shield.style.height = `${bounds.height}px`;
    shield.style.zIndex = '1201';
    shield.style.pointerEvents = 'auto';
    const consume = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick']) {
      shield.addEventListener(type, consume);
    }
    shield.addEventListener('click', () => {
      window.setTimeout(() => this.clearPointerShield(), 0);
    });
    document.body.appendChild(shield);
    this.pointerShield = shield;
    this.pointerShieldTimer = window.setTimeout(() => this.clearPointerShield(), 600);
  }

  private clearPointerShield(): void {
    if (this.pointerShieldTimer !== null) window.clearTimeout(this.pointerShieldTimer);
    this.pointerShieldTimer = null;
    this.pointerShield?.remove();
    this.pointerShield = null;
  }

  private syncCombobox(): void {
    const active = document.activeElement;
    const input = active instanceof HTMLInputElement && active.id === 'searTextInput' ||
      active instanceof HTMLTextAreaElement && active.classList.contains('sear-formula-bar__input')
      ? active : null;
    const selected = this.root.hidden ? null : this.root.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    if (!input || !selected) {
      this.clearCombobox();
      return;
    }
    if (this.comboboxInput !== input) {
      this.clearCombobox();
      this.comboboxInput = input;
      this.priorInputAttributes = new Map(comboboxAttributes.map((name) => [name, input.getAttribute(name)]));
    }
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', this.listId);
    input.setAttribute('aria-activedescendant', selected.id);
  }

  private clearCombobox(): void {
    if (!this.comboboxInput) return;
    for (const name of comboboxAttributes) {
      const previous = this.priorInputAttributes?.get(name);
      if (previous === null || previous === undefined) this.comboboxInput.removeAttribute(name);
      else this.comboboxInput.setAttribute(name, previous);
    }
    this.comboboxInput = null;
    this.priorInputAttributes = null;
  }
}
