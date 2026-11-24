import { CommandExecutionPhase, SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { FormulaRecalculationCompletedEventType } from '@searsuite/sear-domain-formula-engine';
import {
  FindSheetMatchPageQuery, ReadSheetFindRevisionQuery, ReplaceAllSheetMatchesCommand, ReplaceSheetMatchCommand,
  SheetFindContent, SheetFindOrder, MAX_SHEET_FIND_PAGE_SIZE,
  type SheetFindInput, type SheetFindMatch, type SheetFindPage,
} from '@searsuite/sear-plugin-find-replace';
import { SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { Platform } from '@searsuite/sear-foundation-platform';
import { SearError } from '@searsuite/sear-foundation-error';
import { type ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { FormulaCalculationTraceObservation } from '@searsuite/sear-plugin-formula';

type Selection = { readonly anchor: [number, number]; readonly focus: [number, number] } | null;
type Selections = readonly NonNullable<Selection>[];
type ScreenRect = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
const emptyPage = (): SheetFindPage => ({ matches: [], startIndex: 0, total: 0, revision: 0 });

/** Web-only panel around the Sheet find/replace query and commands. */
export class WebSheetFindReplaceDialog {
  readonly #commands: SheetCommandBus;
  readonly #queries: SheetQueryRegistry;
  readonly #selection: () => Selection;
  readonly #platform: Platform;
  readonly #focusGrid: (() => void) | undefined;
  readonly #observations: ObservationRegistry | undefined;
  readonly #selections: (() => Selections) | undefined;
  readonly #matchRect: ((match: SheetFindMatch) => ScreenRect | null) | undefined;

  #root: HTMLElement | null = null;
  #style: HTMLStyleElement | null = null;
  #page: SheetFindPage = emptyPage();
  #current = 0;
  #activeResult: HTMLButtonElement | null = null;
  #replacing = false;
  #hasSearched = false;
  #replacementCursor: SheetFindMatch | null = null;
  #selectedRanges: Selections = [];
  #navigatedRange: Selection = null;
  readonly #listenerDisposers: Array<() => void> = [];

  constructor(
    commands: SheetCommandBus,
    queries: SheetQueryRegistry,
    selection: () => Selection,
    platform: Platform,
    focusGrid?: () => void,
    observations?: ObservationRegistry,
    selections?: () => Selections,
    matchRect?: (match: SheetFindMatch) => ScreenRect | null,
  ) {
    this.#commands = commands;
    this.#queries = queries;
    this.#selection = selection;
    this.#platform = platform;
    this.#focusGrid = focusGrid;
    this.#observations = observations;
    this.#selections = selections;
    this.#matchRect = matchRect;
  }

  open(): void {
    if (this.#root) { this.#findInput().focus(); return; }
    this.#style = document.createElement('style');
    this.#style.textContent = STYLE;
    document.head.appendChild(this.#style);
    const root = document.createElement('section');
    root.className = 'sear-find-replace';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Find and replace');
    root.innerHTML = `
      <header><strong>Find and replace</strong><button type="button" data-action="close" aria-label="Close">×</button></header>
      <label>Find<input data-field="find" type="text" autocomplete="off" /></label>
      <div class="sear-find-replace__count" aria-live="polite"></div>
      <div class="sear-find-replace__row"><label>Search scope<select data-field="scope"><option value="sheet">Current sheet</option><option value="selection">Selection</option></select></label><label>Search in<select data-field="content"><option value="value">Values</option><option value="formula">Formulas</option></select></label></div>
      <button type="button" class="sear-find-replace__advanced-toggle" data-action="advanced">Advanced search</button>
      <div class="sear-find-replace__advanced" hidden><label><input type="checkbox" data-field="columns" />Search by columns</label><label><input type="checkbox" data-field="case" />Match case</label><label><input type="checkbox" data-field="entire" />Match entire cell</label></div>
      <label class="sear-find-replace__replacement" hidden>Replace with<input data-field="replacement" type="text" /></label>
      <div class="sear-find-replace__results" aria-label="Search results"></div>
      <footer><div><button type="button" data-action="previous" aria-label="Previous result">↑</button><button type="button" data-action="next" aria-label="Next result">↓</button></div><div><button type="button" data-action="mode">Replace</button><button type="button" data-action="replace" hidden>Replace current</button><button type="button" data-action="replace-all" hidden>Replace all</button><button type="button" data-action="find">Find</button></div></footer>`;
    document.body.appendChild(root);
    this.#root = root;
    this.#selectedRanges = this.#currentSelections();
    this.#listenerDisposers.push(this.#platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key !== 'Escape' || !this.#root) return;
      key.preventDefault();
      key.stopPropagation();
      this.#close();
    }, { capture: true }));
    this.#listenerDisposers.push(this.#platform.addEventListener(root, 'click', (event) => this.#handleClick(event as MouseEvent)));
    this.#listenerDisposers.push(this.#platform.addEventListener(window, 'resize', () => {
      const match = this.#currentMatch();
      if (match && !match.hidden) this.#positionAwayFrom(match);
    }));
    this.#listenerDisposers.push(this.#platform.addEventListener(root, 'input', (event) => {
      if (((event as Event).target as HTMLElement).matches('[data-field]:not([data-field="replacement"])')) this.#invalidateResults();
    }));
    this.#listenerDisposers.push(this.#platform.addEventListener(root, 'change', (event) => {
      if (((event as Event).target as HTMLElement).matches('select[data-field], input[type="checkbox"][data-field]')) this.#invalidateResults();
    }));
    this.#listenerDisposers.push(this.#platform.addEventListener(root, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key === 'Enter' && key.target === this.#findInput()) {
        key.preventDefault();
        key.stopPropagation();
        this.#refresh();
      }
    }));
    this.#listenerDisposers.push(this.#commands.subscribe((event) => {
      if (event.phase !== CommandExecutionPhase.Completed || !this.#hasSearched) return;
      this.#platform.queueMicrotask(() => {
        if (this.#root && this.#hasSearched &&
          this.#queries.run(ReadSheetFindRevisionQuery, undefined) !== this.#page.revision) {
          if (event.id !== ReplaceSheetMatchCommand.id) this.#replacementCursor = null;
          this.#refresh(this.#replacementCursor ?? undefined);
        }
      });
    }));
    if (this.#observations?.has(FormulaCalculationTraceObservation)) {
      this.#listenerDisposers.push(this.#observations.subscribe(FormulaCalculationTraceObservation, (event) => {
        if (event.type === FormulaRecalculationCompletedEventType && this.#root && this.#hasSearched) {
          this.#refresh(this.#replacementCursor ?? undefined);
          this.#replacementCursor = null;
        }
      }));
    }
    this.#findInput().focus();
  }

  destroy(): void {
    while (this.#listenerDisposers.length) this.#listenerDisposers.pop()?.();
    this.#root?.remove();
    this.#style?.remove();
    this.#root = null;
    this.#style = null;
    this.#page = emptyPage();
    this.#current = 0;
    this.#activeResult = null;
    this.#replacing = false;
    this.#hasSearched = false;
    this.#replacementCursor = null;
    this.#selectedRanges = [];
    this.#navigatedRange = null;
  }

  #close(): void {
    this.destroy();
    this.#focusGrid?.();
  }

  #findInput(): HTMLInputElement { return this.#field<HTMLInputElement>('find'); }
  #field<T extends HTMLElement>(name: string): T {
    return this.#root!.querySelector<T>(`[data-field="${name}"]`)!;
  }
  #action(name: string): HTMLButtonElement {
    return this.#root!.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
  }

  #currentSelections(): Selections {
    if (this.#selections) return this.#selections();
    const selection = this.#selection();
    return selection ? [selection] : [];
  }

  #options(): SheetFindInput {
    const currentSelections = this.#currentSelections();
    if (currentSelections.length !== 1 || !sameSelection(currentSelections[0] ?? null, this.#navigatedRange)) {
      this.#selectedRanges = currentSelections;
    }
    const selectionScope = this.#field<HTMLSelectElement>('scope').value === 'selection';
    if (selectionScope && !this.#selectedRanges.length) throw new SearError('Select cells first.');
    const ranges = this.#selectedRanges.map((selection) => ({
      start: [Math.min(selection.anchor[0], selection.focus[0]), Math.min(selection.anchor[1], selection.focus[1])],
      end: [Math.max(selection.anchor[0], selection.focus[0]), Math.max(selection.anchor[1], selection.focus[1])],
    } as const));
    return {
      text: this.#findInput().value,
      content: this.#field<HTMLSelectElement>('content').value as SheetFindContent,
      order: this.#field<HTMLInputElement>('columns').checked ? SheetFindOrder.Columns : SheetFindOrder.Rows,
      matchCase: this.#field<HTMLInputElement>('case').checked,
      entireCell: this.#field<HTMLInputElement>('entire').checked,
      ...(selectionScope && ranges.length === 1 ? { range: ranges[0] } : {}),
      ...(selectionScope && ranges.length > 1 ? { ranges } : {}),
    };
  }

  #refresh(cursor?: SheetFindMatch): void {
    try {
      const options = { ...this.#options(), limit: MAX_SHEET_FIND_PAGE_SIZE };
      this.#page = this.#queries.run(FindSheetMatchPageQuery, cursor ? { ...options, cursor } : options);
      this.#hasSearched = true;
      this.#current = this.#page.startIndex;
      this.#renderResults();
      this.#navigate();
    } catch (error) {
      this.#setStatus(error instanceof Error ? error.message : 'Search failed');
    }
  }

  #invalidateResults(): void {
    this.#page = emptyPage();
    this.#hasSearched = false;
    this.#replacementCursor = null;
    this.#current = 0;
    this.#activeResult = null;
    this.#renderResults();
    this.#setStatus('');
  }

  #renderResults(): void {
    this.#setStatus(this.#page.matches.length ? `${this.#current + 1} / ${this.#page.total}`
      : this.#page.total ? 'No more matches' : 'No matches found');
    const list = this.#root!.querySelector<HTMLElement>('.sear-find-replace__results')!;
    list.replaceChildren();
    this.#activeResult = null;
    this.#page.matches.forEach((match, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset['result'] = String(index);
      if (this.#page.startIndex + index === this.#current) {
        button.className = 'active';
        button.setAttribute('aria-current', 'true');
        this.#activeResult = button;
      }
      button.textContent = `${columnLabel(match.column)}${match.row + 1}${match.hidden ? ' (filtered row)' : ''}  position ${match.start + 1}-${match.end}  ${matchPreview(match)}`;
      list.appendChild(button);
    });
    list.querySelector<HTMLButtonElement>('.active')?.scrollIntoView?.({ block: 'nearest' });
    this.#action('previous').disabled = this.#page.matches.length === 0;
    this.#action('next').disabled = this.#page.matches.length === 0;
    this.#action('replace').disabled = this.#page.matches.length === 0;
    this.#action('replace-all').disabled = this.#page.total === 0;
  }

  #setStatus(message: string): void {
    this.#root!.querySelector<HTMLElement>('.sear-find-replace__count')!.textContent = message;
  }

  #navigate(): void {
    const match = this.#currentMatch();
    if (!match || match.hidden || !this.#commands.has(SelectRangeCommand.id)) return;
    this.#commands.run(SelectRangeCommand, {
      anchor: [match.row, match.column], focus: [match.row, match.column], ensureVisible: true,
    });
    this.#navigatedRange = { anchor: [match.row, match.column], focus: [match.row, match.column] };
    this.#positionAwayFrom(match);
  }

  #positionAwayFrom(match: SheetFindMatch): void {
    const root = this.#root;
    if (!root) return;
    root.style.left = '';
    root.style.right = '';
    root.style.top = '';
    root.style.bottom = '';
    const cell = this.#matchRect?.(match);
    if (!cell) return;
    const panel = root.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - panel.width - 24);
    const left = Math.min(24, Math.max(8, window.innerWidth - panel.width - 8));
    const bottom = Math.max(8, window.innerHeight - panel.height - 16);
    const positions = [
      { left: right, top: 72 }, { left, top: 72 },
      { left: right, top: bottom }, { left, top: bottom },
    ];
    const clear = positions.find(({ left: x, top: y }) =>
      x + panel.width <= window.innerWidth - 8 && y + panel.height <= window.innerHeight - 8 &&
      (x + panel.width + 8 <= cell.left || x - 8 >= cell.right ||
        y + panel.height + 8 <= cell.top || y - 8 >= cell.bottom));
    if (!clear) return;
    root.style.left = `${clear.left}px`;
    root.style.right = 'auto';
    root.style.top = `${clear.top}px`;
    root.style.bottom = 'auto';
  }

  #currentMatch(): SheetFindMatch | undefined {
    return this.#page.matches[this.#current - this.#page.startIndex];
  }

  #setCurrent(index: number): void {
    this.#replacementCursor = null;
    this.#current = index;
    this.#activeResult?.classList.remove('active');
    this.#activeResult?.removeAttribute('aria-current');
    const local = index - this.#page.startIndex;
    this.#activeResult = this.#root!.querySelector<HTMLButtonElement>(`[data-result="${local}"]`);
    this.#activeResult?.classList.add('active');
    this.#activeResult?.setAttribute('aria-current', 'true');
    this.#activeResult?.scrollIntoView?.({ block: 'nearest' });
    this.#setStatus(`${index + 1} / ${this.#page.total}`);
    this.#navigate();
  }

  #resultsFresh(): boolean {
    try {
      if (this.#queries.run(ReadSheetFindRevisionQuery, undefined) === this.#page.revision) return true;
      this.#refresh();
    } catch (error) {
      this.#setStatus(error instanceof Error ? error.message : 'Search failed');
    }
    return false;
  }

  #step(direction: 1 | -1): void {
    if (!this.#page.total || !this.#resultsFresh()) return;
    const target = (this.#current + direction + this.#page.total) % this.#page.total;
    if (target >= this.#page.startIndex && target < this.#page.startIndex + this.#page.matches.length) {
      this.#setCurrent(target);
      return;
    }
    try {
      const wrapped = direction === 1 ? target === 0 : target === this.#page.total - 1;
      const cursor = wrapped ? undefined : direction === 1 ? this.#page.matches.at(-1) : this.#page.matches[0];
      this.#page = this.#queries.run(FindSheetMatchPageQuery, {
        ...this.#options(), limit: MAX_SHEET_FIND_PAGE_SIZE,
        ...(cursor ? { cursor } : {}), backward: direction === -1,
        expectedRevision: this.#page.revision,
      });
      this.#current = direction === 1 ? this.#page.startIndex : this.#page.startIndex + this.#page.matches.length - 1;
      this.#renderResults();
      this.#navigate();
    } catch (error) {
      this.#setStatus(error instanceof Error ? error.message : 'Search failed');
    }
  }

  #handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const result = target.closest<HTMLElement>('[data-result]');
    if (result) {
      if (this.#resultsFresh()) this.#setCurrent(this.#page.startIndex + Number(result.dataset['result']));
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (!action) return;
    if (action === 'close') { this.#close(); return; }
    if (action === 'advanced') {
      const advanced = this.#root!.querySelector<HTMLElement>('.sear-find-replace__advanced')!;
      advanced.hidden = !advanced.hidden;
      this.#action('advanced').textContent = advanced.hidden ? 'Advanced search' : 'Collapse';
      return;
    }
    if (action === 'mode') {
      this.#replacing = !this.#replacing;
      this.#root!.querySelector<HTMLElement>('.sear-find-replace__replacement')!.hidden = !this.#replacing;
      this.#action('replace').hidden = !this.#replacing;
      this.#action('replace-all').hidden = !this.#replacing;
      this.#action('mode').textContent = this.#replacing ? 'Find only' : 'Replace';
      return;
    }
    if (action === 'find') { this.#replacementCursor = null; this.#refresh(); return; }
    if (action === 'previous' || action === 'next') {
      this.#step(action === 'next' ? 1 : -1);
      return;
    }
    if (action === 'replace' || action === 'replace-all') {
      try {
        const input = { ...this.#options(), replacement: this.#field<HTMLInputElement>('replacement').value };
        if (action === 'replace') {
          if (!this.#resultsFresh()) return;
          const match = this.#currentMatch();
          if (!match) return;
          this.#commands.run(ReplaceSheetMatchCommand, { ...input, match });
          this.#replacementCursor = { ...match, start: match.start + input.replacement.length - 1 };
          this.#refresh(this.#replacementCursor);
        } else {
          this.#replacementCursor = null;
          this.#commands.run(ReplaceAllSheetMatchesCommand, input);
          this.#refresh();
        }
      } catch (error) {
        this.#setStatus(error instanceof Error ? error.message : 'Replace failed');
      }
    }
  }
}

function sameSelection(left: Selection, right: Selection): boolean {
  return left === right || !!left && !!right &&
    left.anchor[0] === right.anchor[0] && left.anchor[1] === right.anchor[1] &&
    left.focus[0] === right.focus[0] && left.focus[1] === right.focus[1];
}

function columnLabel(index: number): string {
  let value = index + 1;
  let label = '';
  while (value > 0) { value -= 1; label = String.fromCharCode(65 + value % 26) + label; value = Math.floor(value / 26); }
  return label;
}

function matchPreview(match: SheetFindMatch): string {
  const start = Math.max(0, match.start - 30);
  const end = Math.min(match.text.length, start + 80);
  return `${start ? '…' : ''}${match.text.slice(start, end).replace(/\s+/g, ' ')}${end < match.text.length ? '…' : ''}`;
}

const STYLE = `
.sear-find-replace{position:fixed;top:72px;right:24px;z-index:10000;width:min(390px,calc(100vw - 32px));max-height:calc(100vh - 88px);overflow:auto;background:#fff;border:1px solid #d8dde3;box-shadow:0 8px 32px #1c263326;border-radius:6px;padding:16px;color:#242a31;font:13px Arial,sans-serif}
.sear-find-replace header,.sear-find-replace footer,.sear-find-replace__row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.sear-find-replace header{margin-bottom:16px}.sear-find-replace strong{font-size:15px}.sear-find-replace label{display:flex;align-items:center;gap:8px;margin:8px 0}.sear-find-replace label>input[type=text]{flex:1;min-width:0}
.sear-find-replace input[type=text],.sear-find-replace select{height:30px;border:1px solid #ccd3da;border-radius:4px;padding:4px 7px;background:white;color:inherit;font:inherit}
.sear-find-replace__row label{flex:1;min-width:0}.sear-find-replace__row select{min-width:0;flex:1}.sear-find-replace__advanced{display:flex;flex-wrap:wrap;gap:0 12px}.sear-find-replace__advanced[hidden],.sear-find-replace__replacement[hidden],.sear-find-replace button[hidden]{display:none}
.sear-find-replace button{cursor:pointer;background:#fff;color:#333;border:1px solid #ccd3da;border-radius:4px;padding:5px 9px;font:inherit}.sear-find-replace button:hover{background:#f3f7fb}.sear-find-replace button:disabled{opacity:.45;cursor:default}.sear-find-replace [data-action=close]{border:0;font-size:20px;line-height:20px;padding:0 4px}
.sear-find-replace__advanced-toggle{border:0!important;padding-left:0!important;color:#386ac1!important}.sear-find-replace__count{color:#66727e;text-align:right;min-height:16px}.sear-find-replace__results{max-height:170px;overflow:auto;margin:8px 0}.sear-find-replace__results button{display:block;width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:0}.sear-find-replace__results button.active{background:#e8f1ff;color:#174ba0}.sear-find-replace footer{border-top:1px solid #edf0f3;padding-top:12px}.sear-find-replace footer>div{display:flex;gap:5px}.sear-find-replace [data-action=find],.sear-find-replace [data-action=replace-all]{background:#286be6;border-color:#286be6;color:white}
`;
