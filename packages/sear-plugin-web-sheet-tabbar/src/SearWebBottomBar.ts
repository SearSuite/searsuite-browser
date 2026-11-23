import { Injectable, Inject } from '@searsuite/sear-foundation-di';
import { Platform } from '@searsuite/sear-foundation-platform';
import {
  AddWorkbookSheetCommand,
  ActivateWorkbookSheetCommand,
  RemoveWorkbookSheetCommand,
  MoveWorkbookSheetCommand,
  RenameWorkbookSheetCommand,
  WorkbookActiveSheetEditorObservation,
  WorkbookDocumentStateObservation,
  type WorkbookEditor,
} from '@searsuite/sear-assembly-workbook';
import { type SheetDocumentState } from '@searsuite/sear-assembly-setup';
import { WorkbookError, WorkbookErrorCode } from '@searsuite/sear-domain-workbook';
import { CommandExecutionPhase } from '@searsuite/sear-foundation-common';
import { GetSelection, SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery } from '@searsuite/sear-plugin-cell-editor';
import { ReadSheetZoomQuery, SetSheetZoomCommand, SheetZoomObservation } from '@searsuite/sear-plugin-zoom';
import { ReadSheetCellDataQuery } from '@searsuite/sear-render-engine';
import { SHEET_BOTTOM_BAR_CSS } from './SheetBottomBarCSS';
import { SheetBottomBarAdapter } from './SheetBottomBarAdapter';
import { SheetStatusBarAdapter } from './SheetStatusBarAdapter';
import type { SheetStatusBarModel, SheetTabBarModel } from './SheetBottomBarModels';
import { SheetTabBarAdapter } from './SheetTabBarAdapter';
import { WebSheetStatusBar } from './WebSheetStatusBar';
import { WebSheetTabBar } from './WebSheetTabBar';

/** Input passed when the bottom bar needs a new sheet payload. */
export interface SearWebBottomBarCreateSheetStateInput {
  /** Stable sheet id generated for the workbook command. */
  readonly sheetId: string;
  /** User-facing sheet name generated for the workbook command. */
  readonly name: string;
  /** Destination index in WorkbookDocumentState.sheets. */
  readonly index: number;
}

/** Workbook binding used by SearWebBottomBar. */
export interface SearWebBottomBarWorkbookBinding {
  /** Workbook editor whose command bus owns sheet-list actions. */
  readonly editor: WorkbookEditor;
  /** Creates the initial SheetDocumentState for a newly added sheet. */
  readonly createSheetState?: (input: SearWebBottomBarCreateSheetStateInput) => SheetDocumentState;
}

/** Mount options for the browser bottom bar. */
export interface SearWebBottomBarMountOptions {
  /** Optional workbook binding. Without it, the bottom bar renders the static replica. */
  readonly workbook?: SearWebBottomBarWorkbookBinding;
  /** Status text shown at the right edge. */
  readonly statusText?: string;
  /** Zoom label shown in the bottom bar. */
  readonly zoomText?: string;
  /** Optional tabs adapter. Hosts may provide a custom implementation. */
  readonly tabBar?: SheetTabBarAdapter<HTMLElement>;
  /** Optional status adapter. Hosts may provide a custom implementation. */
  readonly statusBar?: SheetStatusBarAdapter<HTMLElement>;
}

/** Browser DOM implementation of the bottom sheet tab/status bar. */
@Injectable()
export class SearWebBottomBar extends SheetBottomBarAdapter<HTMLElement, SearWebBottomBarMountOptions> {
  /** DI token for resolving the browser bottom bar adapter. */
  public static readonly symbol = Symbol.for('SearWebBottomBar');

  private container: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private cssInjected = false;
  private options: SearWebBottomBarMountOptions = {};
  private tabBar: SheetTabBarAdapter<HTMLElement> = new WebSheetTabBar();
  private statusBar: SheetStatusBarAdapter<HTMLElement> = new WebSheetStatusBar();
  private unsubscribeWorkbookState: (() => void) | null = null;
  private unsubscribeActiveSheet: (() => void) | null = null;
  private unsubscribeZoom: (() => void) | null = null;
  private unsubscribeSheetCommands: (() => void) | null = null;
  private keyTarget: Window | null = null;
  private readonly boundHandleKeyDown = this.handleKeyDown.bind(this);

  /** Constructs a bottom bar adapter bound to one platform. */
  constructor(@Inject(Platform.symbol) private readonly platform: Platform) {
    super();
  }

  public mount(target: HTMLElement, options: SearWebBottomBarMountOptions = {}): void {
    const focusedSheetId = this.getFocusedSheetId();
    this.unbindKeyboard();
    this.tabBar.destroy();
    this.statusBar.destroy();
    this.container = target as HTMLElement;
    this.options = options;
    this.tabBar = options.tabBar ?? new WebSheetTabBar();
    this.statusBar = options.statusBar ?? new WebSheetStatusBar();
    this.injectCSS();
    this.bindWorkbookObservations();
    if (options.workbook) {
      this.keyTarget = target.ownerDocument.defaultView;
      this.keyTarget?.addEventListener('keydown', this.boundHandleKeyDown, true);
    }
    if (!options.workbook) this.render();
    this.focusSheetTab(focusedSheetId);
  }

  public destroy(): void {
    this.unbindKeyboard();
    this.unbindWorkbookObservations();
    this.tabBar.destroy();
    this.statusBar.destroy();
    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    if (this.styleElement?.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.root = null;
    this.container = null;
    this.styleElement = null;
    this.cssInjected = false;
    this.options = {};
    this.tabBar = new WebSheetTabBar();
    this.statusBar = new WebSheetStatusBar();
  }

  private render(): void {
    if (!this.container) return;
    const focusedSheetId = this.getFocusedSheetId();
    this.tabBar.destroy();
    this.statusBar.destroy();
    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }

    const root = document.createElement('div');
    root.className = 'sear-sheet-bottom-bar';
    this.container.appendChild(root);
    this.root = root;

    this.tabBar.mount(root, this.createTabBarModel());
    this.statusBar.mount(root, this.createStatusBarModel());
    this.focusSheetTab(focusedSheetId);
  }

  private getFocusedSheetId(): string | undefined {
    if (!this.container || !this.root) return undefined;
    const focused = this.container.ownerDocument.activeElement;
    return focused && this.root.contains(focused) ? (focused as HTMLElement).dataset['sheetId'] : undefined;
  }

  private focusSheetTab(sheetId: string | undefined): void {
    if (!sheetId || !this.root) return;
    Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-sheet-id]'))
      .find((tab) => tab.dataset['sheetId'] === sheetId)
      ?.focus();
  }

  /** Observes workbook state directly so every state producer keeps the tabs in sync. */
  private bindWorkbookObservations(): void {
    this.unbindWorkbookObservations();
    const workbook = this.options.workbook?.editor;
    if (!workbook) return;
    this.unsubscribeWorkbookState = workbook.observations.subscribe(WorkbookDocumentStateObservation, () =>
      this.render(),
    );
    this.unsubscribeActiveSheet = workbook.observations.subscribe(WorkbookActiveSheetEditorObservation, () => {
      this.bindZoomObservation();
      this.bindSheetStatusUpdates();
      this.render();
    });
    this.bindZoomObservation();
    this.bindSheetStatusUpdates();
  }

  private bindSheetStatusUpdates(): void {
    this.unsubscribeSheetCommands?.();
    this.unsubscribeSheetCommands = null;
    const editor = this.options.workbook?.editor.sheets.getActiveEditor();
    if (!editor || this.options.statusText !== undefined) return;
    this.unsubscribeSheetCommands = editor.commands.subscribe((event) => {
      if (event.phase !== CommandExecutionPhase.Completed) return;
      const status = this.root?.querySelector('.sear-sheet-bottom-bar__status');
      if (status) status.textContent = this.getSelectionStatusText();
    });
  }

  private bindZoomObservation(): void {
    this.unsubscribeZoom?.();
    this.unsubscribeZoom = null;
    const editor = this.options.workbook?.editor.sheets.getActiveEditor();
    if (!editor?.queries.has(ReadSheetZoomQuery)) return;
    this.unsubscribeZoom = editor.observations.subscribe(SheetZoomObservation, (scale) => {
      const label = this.root?.querySelector('.sear-sheet-bottom-bar__zoom-value');
      if (label) label.textContent = `${Math.round(scale * 100)}%`;
    });
  }

  private unbindWorkbookObservations(): void {
    this.unsubscribeSheetCommands?.();
    this.unsubscribeSheetCommands = null;
    this.unsubscribeZoom?.();
    this.unsubscribeZoom = null;
    this.unsubscribeWorkbookState?.();
    this.unsubscribeWorkbookState = null;
    this.unsubscribeActiveSheet?.();
    this.unsubscribeActiveSheet = null;
  }

  private unbindKeyboard(): void {
    this.keyTarget?.removeEventListener('keydown', this.boundHandleKeyDown, true);
    this.keyTarget = null;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const binding = this.options.workbook;
    const workbook = binding?.editor;
    if (!binding || !workbook || event.defaultPrevented || event.isComposing) return;
    const activeEditor = workbook.sheets.getActiveEditor();
    if (activeEditor?.queries.has(IsCellEditingQuery) && activeEditor.queries.run(IsCellEditingQuery, void 0)) return;
    const target = event.target;
    if (target instanceof Element && target.id !== 'searTextInput' && !target.closest('[role="grid"]')) return;
    if (event.key === 'F11' && event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      this.addWorkbookSheet(binding);
      return;
    }
    if (event.shiftKey || event.metaKey) return;
    const direction =
      event.altKey && !event.ctrlKey
        ? event.key === 'ArrowRight'
          ? 1
          : event.key === 'ArrowLeft'
          ? -1
          : 0
        : event.ctrlKey && !event.altKey
        ? event.key === 'PageDown'
          ? 1
          : event.key === 'PageUp'
          ? -1
          : 0
        : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const sheets = workbook.document.getState().sheets.filter((sheet) => sheet.hidden !== true);
    const index = sheets.findIndex((sheet) => sheet.id === workbook.sheets.getActiveId());
    if (index < 0) return;
    const next = sheets[index + direction];
    if (next) {
      this.activateWorkbookSheet(workbook, next.id);
      this.container?.ownerDocument.querySelector<HTMLElement>('[role="grid"]')?.focus();
    }
  }

  private createTabBarModel(): SheetTabBarModel {
    const binding = this.options.workbook;
    if (!binding) {
      return {
        sheets: [{ id: 'sheet-1', name: 'Sheet1', active: true }],
        onAddSheetClick: () => this.showToast('Not implemented yet'),
        onActivateSheetClick: () => this.showToast('Not implemented yet'),
      };
    }

    const workbook = binding.editor;
    const state = workbook.document.getState();
    return {
      sheets: state.sheets
        .filter((sheet) => sheet.hidden !== true)
        .map((sheet) => ({
          id: sheet.id,
          name: sheet.name,
          active: sheet.id === workbook.sheets.getActiveId(),
          ...(sheet.color ? { color: sheet.color } : {}),
        })),
      onAddSheetClick: () => this.addWorkbookSheet(binding),
      onActivateSheetClick: (sheetId) => this.activateWorkbookSheet(workbook, sheetId),
      onRenameSheet: (sheetId, name) => {
        const trimmed = name.trim();
        if (state.sheets.find((sheet) => sheet.id === sheetId)?.name === trimmed) return null;
        try {
          workbook.commands.run(RenameWorkbookSheetCommand, { sheetId, name });
        } catch (error) {
          if (error instanceof WorkbookError) {
            if (error.code === WorkbookErrorCode.duplicateSheetName) return 'A sheet with this name already exists.';
            if (error.code === WorkbookErrorCode.invalidSheetName) {
              return "Invalid sheet name: avoid : \\ / ? * [ ], use at most 31 characters, and do not start or end with an apostrophe.";
            }
          }
          throw error;
        }
        return null;
      },
      onDeleteSheet: (sheetId) => workbook.commands.run(RemoveWorkbookSheetCommand, { sheetId }),
      onMoveSheet: (sheetId, targetSheetId, before) => {
        const fromIndex = state.sheets.findIndex((sheet) => sheet.id === sheetId);
        const targetIndex = state.sheets.findIndex((sheet) => sheet.id === targetSheetId);
        if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return;
        const toIndex = fromIndex < targetIndex ? targetIndex - (before ? 1 : 0) : targetIndex + (before ? 0 : 1);
        if (toIndex !== fromIndex) workbook.commands.run(MoveWorkbookSheetCommand, { sheetId, toIndex });
      },
    };
  }

  private createStatusBarModel(): SheetStatusBarModel {
    const editor = this.options.workbook?.editor.sheets.getActiveEditor();
    const zoomEnabled = Boolean(editor?.queries.has(ReadSheetZoomQuery) && editor.commands.has(SetSheetZoomCommand));
    const scale = zoomEnabled ? editor!.queries.run(ReadSheetZoomQuery, undefined) : 1;
    return {
      statusText: this.options.statusText ?? this.getSelectionStatusText(),
      zoomText: zoomEnabled ? `${Math.round(scale * 100)}%` : this.options.zoomText ?? '100%',
      zoomEnabled,
      onZoomOutClick: () => this.changeZoom(-0.1),
      onZoomInClick: () => this.changeZoom(0.1),
    };
  }

  private changeZoom(step: number): void {
    const editor = this.options.workbook?.editor.sheets.getActiveEditor();
    if (!editor?.queries.has(ReadSheetZoomQuery) || !editor.commands.has(SetSheetZoomCommand)) return;
    editor.commands.run(SetSheetZoomCommand, editor.queries.run(ReadSheetZoomQuery, undefined) + step);
  }

  private addWorkbookSheet(binding: SearWebBottomBarWorkbookBinding): void {
    if (!binding.createSheetState) {
      this.showToast('Add sheet needs a createSheetState callback');
      return;
    }
    const workbook = binding.editor;
    const state = workbook.document.getState();
    const ordinal = nextSheetOrdinal(state.sheets.map((sheet) => sheet.name));
    const sheet = {
      id: nextSheetId(
        state.sheets.map((candidate) => candidate.id),
        ordinal,
      ),
      name: `Sheet${ordinal}`,
    };
    workbook.commands.run(AddWorkbookSheetCommand, {
      sheet,
      sheetState: binding.createSheetState({
        sheetId: sheet.id,
        name: sheet.name,
        index: state.sheets.length,
      }),
    });
    const sheetEditor = workbook.sheets.getActiveEditor();
    if (sheetEditor.commands.has(SelectRangeCommand)) {
      sheetEditor.commands.run(SelectRangeCommand, { anchor: [0, 0], focus: [0, 0] });
    }
    this.container?.ownerDocument.querySelector<HTMLElement>('[role="grid"]')?.focus();
  }

  private activateWorkbookSheet(workbook: WorkbookEditor, sheetId: string): void {
    if (sheetId === workbook.sheets.getActiveId()) return;
    workbook.commands.run(ActivateWorkbookSheetCommand, { sheetId });
  }

  private injectCSS(): void {
    if (this.cssInjected) return;
    const style = document.createElement('style');
    style.setAttribute('data-sear-sheet-bottom-bar', '');
    style.textContent = SHEET_BOTTOM_BAR_CSS;
    document.head.appendChild(style);
    this.styleElement = style;
    this.cssInjected = true;
  }

  private showToast(message: string): void {
    const existing = document.querySelector('.sear-sheet-bottom-bar__toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'sear-sheet-bottom-bar__toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    this.platform.setTimeout(function removeSheetBottomBarToast() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2000);
  }

  private getSelectionStatusText(): string {
    const editor = this.options.workbook?.editor.sheets.getActiveEditor();
    if (!editor) return this.options.workbook ? '' : 'Sum=5994 Average=2997 Count=2';
    if (!editor.queries.has(GetSelection) || !editor.queries.has(ReadSheetCellDataQuery)) return '';
    const selection = editor.queries.run(GetSelection, undefined);
    const cells = editor.queries.run(ReadSheetCellDataQuery, undefined);
    if (!selection || !cells.forEachStoredInRange) return '';
    const [startRow, startColumn] = selection.start;
    const [endRow, endColumn] = selection.end;
    let sum = 0;
    let numericCount = 0;
    let count = 0;
    cells.forEachStoredInRange(startRow, startColumn, endRow, endColumn, (cell) => {
      if (cell.value === null || cell.value === undefined || cell.value === '') return;
      count++;
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
        sum += cell.value;
        numericCount++;
      }
    });
    if (numericCount === 0) return `Count=${count}`;
    return `Sum=${sum} Average=${sum / numericCount} Count=${count}`;
  }
}

function nextSheetOrdinal(existingNames: readonly string[]): number {
  const used = new Set(
    existingNames
      .map((name) => /^Sheet(\d+)$/.exec(name)?.[1])
      .filter((ordinal): ordinal is string => ordinal !== void 0)
      .map((ordinal) => Number.parseInt(ordinal, 10)),
  );
  let ordinal = 1;
  while (used.has(ordinal)) ordinal += 1;
  return ordinal;
}

function nextSheetId(existingIds: readonly string[], preferredOrdinal: number): string {
  const used = new Set(existingIds);
  let ordinal = preferredOrdinal;
  while (used.has(`sheet-${ordinal}`)) ordinal += 1;
  return `sheet-${ordinal}`;
}
