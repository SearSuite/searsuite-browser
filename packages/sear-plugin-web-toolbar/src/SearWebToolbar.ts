import { focusWebSheetSurface } from './focusWebSheetSurface';
import { FileDownload } from '@searsuite/sear-foundation-platform';
import { WebDropdownController } from './dropdown/WebDropdownController';
import { ReadDropdownCellQuery, DropdownPickerRequest } from '@searsuite/sear-plugin-dropdown';
import { WebCheckboxController } from './checkbox/WebCheckboxController';
import { InsertCheckboxesCommand, ReadCheckboxRangeQuery } from '@searsuite/sear-plugin-checkbox';
import { bindWebClearStyle } from './WebClearStyleBinding';
import { ClearRangeStylesCommand } from '@searsuite/sear-plugin-clear-style';
import { bindWebFormatPainter } from './WebFormatPainterBinding';
import { StartFormatPainterCommand, FormatPainterObservation } from '@searsuite/sear-plugin-format-painter';
import { SearCore, SearCoreSheet } from '@searsuite/sear-assembly-core';
import { ClearRangeContentsCommand, CommandExecutionPhase, DeleteColumnCommand, DeleteRowCommand, InsertColumnCommand, InsertRowCommand, SheetCommandBus, SheetQueryRegistry, type SheetRangeInput } from '@searsuite/sear-assembly-commands';
import { CellFormats, CellType, type CellFormat } from '@searsuite/sear-domain-cell-types';
import { IFormulaResultProvider } from '@searsuite/sear-domain-formula-engine';
import { stringToRichDoc } from '@searsuite/sear-domain-doc';
import {
  SetRangeAlignmentCommand,
  SetRangeVerticalAlignmentCommand,
  SheetHorizontalAlignment,
  SheetVerticalAlignment,
  readSheetCellAlignments,
  readSheetCellVerticalAlignments,
  type AlignmentMatrix,
  type VerticalAlignmentMatrix,
} from '@searsuite/sear-plugin-alignment';
import { readSheetCellFills, SetRangeCellFillCommand, type SheetCellFill } from '@searsuite/sear-plugin-cell-fill';
import {
  ClearDuplicateHighlightsCommand,
  DeleteDuplicateRowsCommand,
  HighlightDuplicateRowsCommand,
  SheetDuplicateKeepMode,
} from '@searsuite/sear-plugin-duplicate';
import {
  AdjustRangeCellFormatDecimalPlacesCommand,
  ReadSheetCellFormatQuery,
  SetRangeCellFormatCommand,
} from '@searsuite/sear-plugin-cell-format';
import { Injectable, Inject } from '@searsuite/sear-foundation-di';
import { Platform } from '@searsuite/sear-foundation-platform';
import { UserInteractionService } from '@searsuite/sear-foundation-user-interaction';
import { Rect as RectRange } from '@searsuite/sear-foundation-rect';
import { SelectRangeCommand, SheetSelectionPlugin } from '@searsuite/sear-plugin-selection';
import { GetSelection, GetSelections } from '@searsuite/sear-plugin-selection';
import { SheetClipboard, SheetClipboardError, SheetClipboardErrorCode } from '@searsuite/sear-plugin-clipboard';
import { CancelCutRangeCommand, CopyRangeCommand, CutRangeCommand, PasteRangeCommand } from '@searsuite/sear-plugin-clipboard';
import {
  RedoSheetCommand,
  SheetHistoryStatusProvider,
  type SheetHistoryStatus,
  UndoSheetCommand,
} from '@searsuite/sear-plugin-history';
import { TOOLBAR_CSS } from './ToolbarCSS';
import { SearToolbar } from '@searsuite/sear-assembly-plugin';
import { createReplicaToolbar, SheetToolbarControlId } from './ReplicaToolbar';
import { ensureSheetToolbarCommands } from './SheetToolbarCommands';
import { CancelCellEditCommand, CommitCellEditCommand, HandleDocumentInputCommand, IsCellEditingQuery, ReadSelectedCellEditTextQuery, SetCellInlineStyleCommand, SetRangeCellTextStyleCommand, StartFormulaBarEditCommand, SetFormulaBarDraftCommand } from '@searsuite/sear-plugin-cell-editor';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { WebFormulaAssistPopover } from './WebFormulaAssistPopover';
import { WebSheetContextMenu, type SheetContextAction } from './WebSheetContextMenu';
import {
  AnalyzeMergeCellsQuery,
  SheetCellMergeConfirmationError,
  ToggleMergeCellsCommand,
} from '@searsuite/sear-plugin-cell-merge';
import {
  SheetEmbeddedEditor,
  SheetEmbeddedEditHistoryObservation,
  SheetEmbeddedInlineStyleObservation,
  type SheetEmbeddedEditHistoryState,
  type SheetEmbeddedInlineStyleState,
} from '@searsuite/sear-sheet-editor-contract';
import { ReadSheetCellDataQuery, readSheetColumnSizes, readSheetDataMatrix, readSheetRowSizes } from '@searsuite/sear-render-engine';
import { KeyboardRouter, TextInput, TextInputKind } from '@searsuite/sear-render-input';
import { CellNumberFormatDialog } from './CellNumberFormatDialog';
import { CellNumberFormatMenu } from './CellNumberFormatMenu';
import { SetRangeCellBorderCommand, SheetBorderPreset, type SheetBorderStroke } from '@searsuite/sear-plugin-cell-border';
import { WebCellBorderMenu } from './WebCellBorderMenu';
import {
  CellHighlightKind,
  ClearCellHighlightRulesCommand,
  ReadCellHighlightRulesQuery,
  AddCellHighlightRuleCommand,
  type CellHighlightCondition,
} from '@searsuite/sear-plugin-cell-highlight';
import { WebCellHighlightDialog, type ConditionalRuleBounds, type ConditionalRuleListRow } from './WebCellHighlightDialog';
import {
  CanEvaluateDataValidationKindQuery,
  DataValidationKind,
  DataValidationWarningObservation,
  ReadDataValidationRulesQuery,
  SetDataValidationRuleCommand,
} from '@searsuite/sear-plugin-data-validation';
import { WebDataValidationDialog, dataValidationKindLabels } from './WebDataValidationDialog';
import { WebDataValidationFeedback } from './WebDataValidationFeedback';
import { inferSheetSortHeader, SheetSortDirection, SortSheetRangeCommand } from '@searsuite/sear-plugin-sort';
import { WebSheetSortDialog } from './WebSheetSortDialog';
import {
  ClearSheetFilterCommand,
  CreateSheetFilterCommand,
  CreateSheetFilterViewCommand,
  ReadSheetFilterQuery,
  ReapplySheetFilterCommand,
  SetSheetColumnFilterCommand,
} from '@searsuite/sear-plugin-filter';
import { WebSheetFilterDialog } from './WebSheetFilterDialog';
import { bindWebSheetFilterHeader } from './WebSheetFilterHeaderBinding';
import { inferAdjacentDataRange } from './inferAdjacentDataRange';
import { readSheetFixedRows, SetSheetRowsFixedCommand } from '@searsuite/sear-plugin-fixed-row';
import { readSheetFreeze, SetSheetFreezeCommand } from '@searsuite/sear-plugin-freeze';
import { WebSheetFreezeMenu } from './WebSheetFreezeMenu';
import { WebSheetFindReplaceDialog } from './WebSheetFindReplaceDialog';
import { WebSheetDeleteCellsDialog, type SheetDeleteCellsMode } from './WebSheetDeleteCellsDialog';
import { WebSheetGoToDialog, type SheetGoToChoice } from './WebSheetGoToDialog';
import { WebSheetHyperlinkDialog, type SheetHyperlinkDraft } from './WebSheetHyperlinkDialog';
import { parseAddress } from './WebFormulaBar';
import { MoveSheetRangeCommand } from '@searsuite/sear-plugin-selection';
import { SheetAdditionalSelectionMode } from '@searsuite/sear-plugin-selection';
import { getSheetRangePositionRect } from '@searsuite/sear-render';
import {
  FindSheetMatchPageQuery,
  ReadSheetFindRevisionQuery,
  ReplaceAllSheetMatchesCommand,
  ReplaceSheetMatchCommand,
} from '@searsuite/sear-plugin-find-replace';

/** Browser DOM toolbar implementation for the sheet editor. */
@Injectable()
export class SearWebToolbar extends SearToolbar {
  /** DI token for resolving the web toolbar adapter. */
  public static readonly symbol = Symbol.for('SearWebToolbar');

  /** Host element supplied by mount(). */
  private container: HTMLElement | null = null;
  /** Root toolbar element inserted into the host. */
  private toolbarRoot: HTMLElement | null = null;
  /** Style element containing toolbar CSS. */
  private styleElement: HTMLStyleElement | null = null;
  /** Whether CSS has already been injected for this toolbar instance. */
  private cssInjected = false;
  /** Active history-status subscription for the mounted toolbar. */
  private disposeHistoryStatus: (() => void) | null = null;
  private disposeEditHistoryStatus: (() => void) | null = null;
  private editHistoryState: SheetEmbeddedEditHistoryState | null = null;
  /** Active embedded-editor inline-style subscription for the mounted toolbar. */
  private disposeInlineStyleObservation: (() => void) | null = null;
  /** Active command lifecycle subscription used to refresh the selected number format. */
  private disposeCellFormatStatus: (() => void) | null = null;
  private disposeDataValidationWarning: (() => void) | null = null;
  private disposeDataValidationStatus: (() => void) | null = null;
  private disposeFindShortcut: (() => void) | null = null;
  private disposeCellFormatShortcut: (() => void) | null = null;
  private disposeFilterShortcut: (() => void) | null = null;
  private disposeDeleteShortcut: (() => void) | null = null;
  private disposeGoToShortcut: (() => void) | null = null;
  private disposeHyperlinkShortcut: (() => void) | null = null;
  private disposeFilterHeaderPointer: (() => void) | null = null;
  private disposeCutEscape: (() => void) | null = null;
  private disposeContextMenu: (() => void) | null = null;
  private contextMenuPriorSelection: { anchor: [number, number]; focus: [number, number] } | null | undefined;
  private disposeGridStyleShortcut: (() => void) | null = null;
  /** Latest inline-style state published by the active embedded edit session. */
  private inlineStyleState: SheetEmbeddedInlineStyleState | null = null;
  /** Command bus used by the web toolbar. */
  private readonly commandBus: SheetCommandBus | null;
  private readonly cellNumberFormatDialog = new CellNumberFormatDialog();
  private readonly cellBorderMenu = new WebCellBorderMenu();
  private cellHighlightDialog: WebCellHighlightDialog | null = null;
  private dataValidationDialog: WebDataValidationDialog | null = null;
  private dataValidationFeedback: WebDataValidationFeedback | null = null;
  private sheetSortDialog: WebSheetSortDialog | null = null;
  private sheetFilterDialog: WebSheetFilterDialog | null = null;
  private findReplaceDialog: WebSheetFindReplaceDialog | null = null;
  private readonly deleteCellsDialog = new WebSheetDeleteCellsDialog();
  private readonly goToDialog = new WebSheetGoToDialog();
  private readonly hyperlinkDialog = new WebSheetHyperlinkDialog();
  private readonly freezeMenu: WebSheetFreezeMenu;
  private readonly contextMenu: WebSheetContextMenu;
  private dropdownController: WebDropdownController | null = null;
  private checkboxController: WebCheckboxController | null = null;
  private disposeClearStyle: (() => void) | null = null;
  private disposeFormatPainter: (() => void) | null = null;
  private mergePending = false;
  private formulaAssist: WebFormulaAssistPopover | null = null;

  /** Constructs the toolbar adapter for one sheet editor. */
  constructor(
    @Inject(SearCore.symbol) private readonly searCore: SearCoreSheet,
    @Inject(Platform.symbol) protected readonly platform: Platform,
    @Inject(SheetEmbeddedEditor.symbol) private readonly embeddedEditor: SheetEmbeddedEditor,
    @Inject(SheetClipboard.symbol)
    private readonly clipboard: SheetClipboard,
    @Inject(UserInteractionService.symbol)
    private readonly userInteraction: UserInteractionService,
    @Inject(SheetCommandBus.symbol) protected readonly commands?: SheetCommandBus,
    @Inject(SheetHistoryStatusProvider.symbol)
    private readonly history?: SheetHistoryStatusProvider,
    @Inject(SheetQueryRegistry.symbol)
    protected readonly queries?: SheetQueryRegistry,
    @Inject(ObservationRegistry.symbol)
    protected readonly observations?: ObservationRegistry,
    @Inject(FileDownload.symbol) protected readonly fileDownload?: FileDownload,
    @Inject(TextInput.symbol) protected readonly sheetTextInput?: TextInput,
    @Inject(IFormulaResultProvider.symbol) private readonly formulaResults?: IFormulaResultProvider,
    @Inject(KeyboardRouter.symbol) private readonly keyboardRouter?: KeyboardRouter,
  ) {
    super();
    this.freezeMenu = new WebSheetFreezeMenu(platform);
    this.contextMenu = new WebSheetContextMenu(platform);
    this.commandBus = this.commands ?? null;
    if (!this.commands) {
      this.platform.warn('SearWebToolbar command-backed actions are unavailable: SheetCommandBus is missing.');
    }
  }

  /** Mounts the toolbar into a host DOM element. */
  public mount(target: unknown): void {
    this.destroy();
    this.container = target as HTMLElement;
    this.injectCSS();
    this.buildToolbar();
    this.disposeCutEscape = this.platform.addEventListener(document, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape' && this.commandBus?.has(CancelCutRangeCommand))
        this.commandBus.run(CancelCutRangeCommand, void 0);
    }, { capture: true });
    this.disposeFindShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!(key.metaKey || key.ctrlKey) || key.altKey || key.key.toLowerCase() !== 'f') return;
      if (
        !this.commandBus?.has(ReplaceSheetMatchCommand.id) ||
        !this.queries?.has(FindSheetMatchPageQuery) ||
        !this.queries.has(ReadSheetFindRevisionQuery)
      )
        return;
      key.preventDefault();
      this.openFindReplaceDialog();
    });
    this.disposeCellFormatShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!(key.metaKey || key.ctrlKey) || key.altKey || key.shiftKey || key.key !== '1' ||
        key.defaultPrevented || this.isCellEditing() || !this.getSelectionRange() ||
        !this.queries?.has(ReadSheetCellFormatQuery)) return;
      key.preventDefault();
      this.openCellFormatDialog();
    }, { capture: true });
    this.disposeDeleteShortcut = this.keyboardRouter?.subscribe({
      onDeleteCells: () => {
        if (!this.isCellEditing() && this.getSelectionRange() && this.commandBus?.has(MoveSheetRangeCommand))
          this.deleteCellsDialog.open((mode) => this.deleteSelectedCells(mode));
      },
    }) ?? null;
    this.disposeGoToShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key !== 'F5' || key.altKey || key.ctrlKey || key.metaKey || key.shiftKey ||
        key.defaultPrevented || this.isCellEditing() || !this.getSelectionRange() ||
        !this.commandBus?.has(SelectRangeCommand)) return;
      key.preventDefault();
      this.goToDialog.open(
        (choice, address) => this.goToSelection(choice, address),
        () => focusWebSheetSurface(this.searCore.renderEngine?.renderContext?.getRoot()),
      );
    }, { capture: true });
    this.disposeHyperlinkShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!(key.metaKey || key.ctrlKey) || key.altKey || key.shiftKey || key.key.toLowerCase() !== 'k' ||
        key.defaultPrevented || this.isCellEditing() || !this.getSelectionRange() ||
        !this.commandBus?.has(StartFormulaBarEditCommand)) return;
      key.preventDefault();
      const [row, column] = this.getSelectionRange()!.anchor;
      const cell = this.queries?.has(ReadSheetCellDataQuery)
        ? this.queries.run(ReadSheetCellDataQuery, void 0).getItem(row, column) : null;
      const label = String(this.formulaResults?.getFormulaResult(row, column) ?? cell?.value ?? '');
      this.hyperlinkDialog.open(
        label,
        (draft) => this.insertHyperlink(draft),
        () => focusWebSheetSurface(this.searCore.renderEngine?.renderContext?.getRoot()),
      );
    }, { capture: true });
    this.disposeFilterShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!(key.metaKey || key.ctrlKey) || !key.shiftKey || key.altKey || key.key.toLowerCase() !== 'l' ||
        key.defaultPrevented || this.isCellEditing() || !this.getSelectionRange()) return;
      if (!this.commandBus?.has(CreateSheetFilterCommand) || !this.commandBus.has(ClearSheetFilterCommand) ||
        !this.queries?.has(ReadSheetFilterQuery)) return;
      key.preventDefault();
      this.toggleSheetFilter();
    }, { capture: true });
    this.bindHistoryStatus();
    this.bindInlineStyleObservation();
    this.bindCellFormatStatus();
    this.disposeGridStyleShortcut = this.platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!(key.ctrlKey || key.metaKey) || key.altKey || this.isCellEditing()) return;
      const styleKey = key.key.toLowerCase() === 'b' ? 'bold'
        : key.key.toLowerCase() === 'i' ? 'italic'
        : key.key.toLowerCase() === 'u' ? 'underline'
        : key.shiftKey && key.key.toLowerCase() === 'x' ? 'strikethrough' : null;
      if (!styleKey || !this.commandBus?.has(SetRangeCellTextStyleCommand)) return;
      key.preventDefault();
      this.toggleEmbeddedInlineStyle(styleKey);
    }, { capture: true });
    const sheetSurface = this.searCore.renderEngine?.renderContext?.getRoot();
    if (sheetSurface instanceof Element) {
      if (this.queries && this.commandBus) {
        this.disposeFilterHeaderPointer = bindWebSheetFilterHeader(
          this.platform, sheetSurface, this.searCore, this.queries,
          (column) => {
            if (this.isCellEditing()) return;
            this.sheetFilterDialog ??= new WebSheetFilterDialog(this.commandBus!, this.queries!, this.platform);
            this.sheetFilterDialog.open(column);
          },
        );
      }
      const disposePointer = this.platform.addEventListener(document, 'pointerdown', (event) => {
        const pointer = event as PointerEvent;
        this.contextMenuPriorSelection = pointer.button === 2 && pointer.target instanceof Node &&
          sheetSurface.contains(pointer.target) ? this.getSelectionRange() : undefined;
      }, { capture: true });
      const disposeMenu = this.platform.addEventListener(sheetSurface, 'contextmenu', (event) =>
        this.openSheetContextMenu(sheetSurface, event as MouseEvent),
      );
      this.disposeContextMenu = () => { disposePointer(); disposeMenu(); this.contextMenuPriorSelection = undefined; };
    }
    if (this.observations?.has(DataValidationWarningObservation)) {
      this.disposeDataValidationWarning = this.observations.subscribe(DataValidationWarningObservation, ({ message }) =>
        this.showToast(message),
      );
    }
    if (this.queries?.has(ReadDataValidationRulesQuery) && this.commandBus) {
      this.dataValidationFeedback = new WebDataValidationFeedback(
        this.searCore,
        this.queries,
        () => this.getSelectionRange(),
        this.platform,
      );
      this.dataValidationFeedback.refresh();
      this.disposeDataValidationStatus = this.commandBus.subscribe((event) => {
        if (event.phase === CommandExecutionPhase.Completed) this.dataValidationFeedback?.refresh();
      });
    }
    if (this.observations && this.commandBus) {
      const renderTarget = this.searCore.renderEngine.renderContext.getRoot();
      if (renderTarget instanceof Element) {
        this.formulaAssist = new WebFormulaAssistPopover(this.observations, this.commandBus, renderTarget, 'zh');
      }
    }
  }

  /** Removes DOM nodes and subscriptions owned by the toolbar. */
  public destroy(): void {
    this.disposeCutEscape?.();
    this.disposeCutEscape = null;
    this.disposeContextMenu?.();
    this.disposeContextMenu = null;
    this.disposeFilterHeaderPointer?.();
    this.disposeFilterHeaderPointer = null;
    this.disposeGridStyleShortcut?.();
    this.disposeGridStyleShortcut = null;
    this.contextMenu.close();
    this.dropdownController?.destroy();
    this.dropdownController = null;
    this.checkboxController?.destroy();
    this.checkboxController = null;
    this.disposeClearStyle?.();
    this.disposeClearStyle = null;
    this.disposeFormatPainter?.();
    this.disposeFormatPainter = null;
    this.formulaAssist?.destroy();
    this.formulaAssist = null;
    this.disposeFindShortcut?.();
    this.disposeFindShortcut = null;
    this.disposeCellFormatShortcut?.();
    this.disposeCellFormatShortcut = null;
    this.disposeFilterShortcut?.();
    this.disposeFilterShortcut = null;
    this.disposeDeleteShortcut?.();
    this.disposeDeleteShortcut = null;
    this.disposeGoToShortcut?.();
    this.disposeGoToShortcut = null;
    this.disposeHyperlinkShortcut?.();
    this.disposeHyperlinkShortcut = null;
    this.disposeHistoryStatus?.();
    this.disposeHistoryStatus = null;
    this.disposeEditHistoryStatus?.();
    this.disposeEditHistoryStatus = null;
    this.editHistoryState = null;
    this.disposeInlineStyleObservation?.();
    this.disposeInlineStyleObservation = null;
    this.disposeCellFormatStatus?.();
    this.disposeCellFormatStatus = null;
    this.disposeDataValidationWarning?.();
    this.disposeDataValidationWarning = null;
    this.disposeDataValidationStatus?.();
    this.disposeDataValidationStatus = null;
    this.inlineStyleState = null;
    this.cellNumberFormatDialog.destroy();
    this.cellBorderMenu.close();
    this.cellHighlightDialog?.destroy();
    this.cellHighlightDialog = null;
    this.dataValidationDialog?.destroy();
    this.dataValidationDialog = null;
    this.dataValidationFeedback?.destroy();
    this.dataValidationFeedback = null;
    this.sheetSortDialog?.destroy();
    this.sheetSortDialog = null;
    this.sheetFilterDialog?.destroy();
    this.sheetFilterDialog = null;
    this.findReplaceDialog?.destroy();
    this.findReplaceDialog = null;
    this.deleteCellsDialog.destroy();
    this.goToDialog.destroy();
    this.hyperlinkDialog.destroy();
    this.freezeMenu.close();
    if (this.toolbarRoot && this.toolbarRoot.parentNode) {
      this.toolbarRoot.dispatchEvent(new Event('sear-toolbar-destroy'));
      this.toolbarRoot.parentNode.removeChild(this.toolbarRoot);
    }
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.toolbarRoot = null;
    this.container = null;
    this.cssInjected = false;
  }

  /** Injects toolbar CSS into document.head once per toolbar instance. */
  private injectCSS(): void {
    if (this.cssInjected) return;
    const style = document.createElement('style');
    style.setAttribute('data-sear-toolbar', '');
    style.textContent = TOOLBAR_CSS;
    document.head.appendChild(style);
    this.styleElement = style;
    this.cssInjected = true;
  }

  /** Builds the toolbar and appends its root to the host container. */
  private buildToolbar(): void {
    if (!this.container) return;

    if (this.commandBus) ensureSheetToolbarCommands(this.commandBus, this.searCore);
    const root = createReplicaToolbar(
      () => void 0,
      this.handleReplicaSelection.bind(this),
      (label) => this.canEvaluateDataValidationLabel(label),
      (anchor) => {
        if (this.queries?.has(IsCellEditingQuery) && this.queries.run(IsCellEditingQuery, void 0) && this.sheetTextInput)
          this.sheetTextInput.refocus();
        else anchor.focus();
      },
    );

    this.container.appendChild(root);
    this.toolbarRoot = root;
    this.wireCommandBackedControls(root);
    root.querySelector<HTMLButtonElement>(`[data-testid="${SheetToolbarControlId.CellFill}"]`)
      ?.addEventListener('click', () => this.refreshFillPalette());
    const dropdownButton = root.querySelector<HTMLButtonElement>('[data-testid="toolbar-dropdown"]');
    if (
      dropdownButton &&
      this.commandBus &&
      this.queries?.has(ReadDropdownCellQuery) &&
      this.observations?.has(DropdownPickerRequest)
    ) {
      this.dropdownController = new WebDropdownController(
        dropdownButton,
        this.searCore.renderEngine.renderContext.getRoot(),
        this.platform,
        this.commandBus,
        this.queries,
        this.observations,
        (ruleId) => {
          if (!this.dataValidationDialog && this.commandBus && this.queries)
            this.dataValidationDialog = new WebDataValidationDialog(
              this.commandBus,
              this.queries,
              () => this.getSelectionRange(),
              this.platform,
              () => this.getSelectionRanges(),
              (kind) => this.canEvaluateDataValidationKind(kind),
            );
          const existing =
            ruleId &&
            this.queries?.run(ReadDataValidationRulesQuery, undefined).find((entry) => entry.rule.id === ruleId);
          this.dataValidationDialog?.openCreate(DataValidationKind.Dropdown, existing || undefined);
        },
        this.sheetTextInput,
      );
    }
    const checkboxButton = root.querySelector<HTMLButtonElement>('[data-testid="toolbar-checkbox"]');
    if (checkboxButton && this.commandBus?.has(InsertCheckboxesCommand) && this.queries?.has(ReadCheckboxRangeQuery)) {
      this.checkboxController = new WebCheckboxController(
        checkboxButton,
        this.searCore.renderEngine.renderContext.getRoot(),
        this.platform,
        this.commandBus,
        this.queries,
        () => this.handleDataValidationSelection('Checkbox'),
      );
    }
    const eraser = root.querySelector<HTMLButtonElement>('[data-testid="toolbar-eraser"]');
    if (eraser && this.commandBus?.has(ClearRangeStylesCommand) && this.queries?.has(GetSelection)) {
      this.disposeClearStyle = bindWebClearStyle(
        eraser,
        this.searCore.renderEngine.renderContext.getRoot(),
        this.platform,
        this.commandBus,
        this.queries,
      );
    }
    const brush = root.querySelector<HTMLButtonElement>('[data-testid="toolbar-brush"]');
    if (
      brush &&
      this.commandBus?.has(StartFormatPainterCommand) &&
      this.queries &&
      this.observations?.has(FormatPainterObservation)
    ) {
      this.disposeFormatPainter = bindWebFormatPainter(
        brush,
        this.searCore.renderEngine.renderContext.getRoot(),
        this.platform,
        this.commandBus,
        this.queries,
        this.observations,
      );
    }
  }

  /** Shows a transient toolbar toast message. */
  private showToast(message: string): void {
    const existing = document.querySelector('.sear-toolbar__toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'sear-toolbar__toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    this.platform.setTimeout(function removeToolbarToast() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2000);
  }

  /** Keeps the complete replica layout while enabling only official commands. */
  private wireCommandBackedControls(root: HTMLElement): void {
    const actions = this.commandBus
      ? new Map<string, () => void>([
          ['toolbar-undo', () => this.runHistoryAction('undo')],
          ['toolbar-redo', () => this.runHistoryAction('redo')],
          ['MergeCellButton', () => void this.toggleMergeCells()],
          ['toolbar-copy', () => void this.copy()],
          ['toolbar-cut', () => void this.cut()],
          ['toolbar-paste', () => void this.paste()],
        ])
      : new Map<string, () => void>();
    if (this.commandBus?.has(SetRangeAlignmentCommand)) {
      actions.set('toolbar-leftAlign', () => this.setAlignment(SheetHorizontalAlignment.Left));
      actions.set('toolbar-centerAlign', () => this.setAlignment(SheetHorizontalAlignment.Center));
      actions.set('toolbar-rightAlign', () => this.setAlignment(SheetHorizontalAlignment.Right));
    }
    if (this.commandBus?.has(SetRangeCellBorderCommand)) {
      actions.set('border-set', () => {
        const anchor = root.querySelector<HTMLElement>('[data-testid="border-set"]');
        if (!anchor) return;
        this.cellBorderMenu.open(anchor, (preset, stroke) => {
          this.getSelectionRanges().forEach((range) =>
            this.commandBus?.run(SetRangeCellBorderCommand, { ...range, preset, stroke }));
        });
      });
    }
    if (this.commandBus?.has(SetRangeVerticalAlignmentCommand)) {
      actions.set('toolbar-alignTop', () => this.setVerticalAlignment(SheetVerticalAlignment.Top));
      actions.set('toolbar-alignCenter', () => this.setVerticalAlignment(SheetVerticalAlignment.Center));
      actions.set('toolbar-alignBottom', () => this.setVerticalAlignment(SheetVerticalAlignment.Bottom));
    }
    if (this.commandBus?.has(SetCellInlineStyleCommand.id) || this.commandBus?.has(SetRangeCellTextStyleCommand)) {
      INLINE_STYLE_CONTROLS.filter((control) => control.kind === 'toggle').forEach(({ testId, styleKey }) => {
        actions.set(testId, () => this.toggleEmbeddedInlineStyle(styleKey));
      });
    }
    if (this.commandBus?.has(SetRangeCellFormatCommand.id)) {
      actions.set('toolbar-currencyFormat', () => this.setCellFormat(CellFormats.currency('CNY', 'zh-CN')));
      actions.set('toolbar-percentFormat', () => this.setCellFormat(CellFormats.percent));
    }
    if (this.commandBus?.has(AdjustRangeCellFormatDecimalPlacesCommand.id)) {
      actions.set('toolbar-decimalPointPlus', () => this.adjustCellFormatDecimalPlaces(1));
      actions.set('toolbar-decimalPointMinus', () => this.adjustCellFormatDecimalPlaces(-1));
    }
    if (this.commandBus?.has(SetSheetFreezeCommand.id) && this.commandBus.has(SetSheetRowsFixedCommand.id)) {
      actions.set('toolbar-freeze', () => {
        const anchor = root.querySelector<HTMLElement>('[data-testid="toolbar-freeze"]');
        const selection = this.getSelectionRange();
        if (!anchor || !this.commandBus) return;
        if (!selection) {
          this.showToast('Select cells first.');
          return;
        }
        this.freezeMenu.open(
          anchor,
          {
            ...selection,
            sheetShape: [
              readSheetRowSizes(this.searCore.getDataEngine())?.shape[1] ?? 0,
              readSheetColumnSizes(this.searCore.getDataEngine())?.shape[1] ?? 0,
            ],
          },
          readSheetFreeze(this.searCore.getDataEngine()),
          readSheetFixedRows(this.searCore.getDataEngine()),
          this.commandBus,
        );
      });
    }
    if (
      this.commandBus?.has(ReplaceSheetMatchCommand.id) &&
      this.commandBus.has(ReplaceAllSheetMatchesCommand.id) &&
      this.queries?.has(FindSheetMatchPageQuery) &&
      this.queries.has(ReadSheetFindRevisionQuery)
    ) {
      actions.set(SheetToolbarControlId.FindReplace, () => {
        this.openFindReplaceDialog();
      });
    }

    root.querySelectorAll<HTMLElement>('[data-testid]').forEach((element) => {
      const id = element.dataset['testid'];
      if (!id || id === 'ToolbarWrapper' || id.startsWith('ToolbarWrapper__')) return;
      // Selection controls retain the popover listener installed by the replica renderer.
      if (
        (id === SheetToolbarControlId.CellFill && this.commandBus?.has(SetRangeCellFillCommand.id)) ||
        (id === 'toolbar-duplicate' &&
          this.commandBus?.has(HighlightDuplicateRowsCommand.id) &&
          this.commandBus?.has(DeleteDuplicateRowsCommand.id) &&
          this.commandBus?.has(ClearDuplicateHighlightsCommand.id)) ||
        (id === 'toolbar-number-format' && this.commandBus?.has(SetRangeCellFormatCommand.id)) ||
        (id === 'toolbar-more' && this.commandBus?.has(ReplaceSheetMatchCommand.id)) ||
        (id === 'toolbar-sort' && this.commandBus?.has(SortSheetRangeCommand.id)) ||
        (id === 'toolbar-filter' &&
          this.commandBus?.has(CreateSheetFilterCommand.id) &&
          this.queries?.has(ReadSheetFilterQuery)) ||
        (id === 'toolbar-conditionalFormatting' &&
          this.commandBus?.has(AddCellHighlightRuleCommand.id) &&
          this.queries?.has(ReadCellHighlightRulesQuery)) ||
        (id === 'toolbar-dv' &&
          this.commandBus?.has(SetDataValidationRuleCommand.id) &&
          this.queries?.has(ReadDataValidationRulesQuery)) ||
        (this.commandBus?.has(SetCellInlineStyleCommand.id) &&
          INLINE_STYLE_CONTROLS.some(
            (control) => (control.kind === 'value' || control.kind === 'palette') && control.testId === id,
          ))
      ) {
        return;
      }
      const replacement = element.cloneNode(true) as HTMLElement;
      if (id === 'border-set') {
        replacement.title = 'Borders';
        replacement.setAttribute('aria-label', 'Borders');
      }
      element.replaceWith(replacement);
      const action = actions.get(id);
      if (!action || !(replacement instanceof HTMLButtonElement)) {
        replacement.classList.add('disabled');
        if (replacement instanceof HTMLButtonElement) replacement.disabled = true;
        return;
      }
      replacement.classList.remove('disabled');
      replacement.disabled = false;
      replacement.addEventListener('click', (event) => {
        event.stopPropagation();
        action();
      });
    });
  }

  private openFindReplaceDialog(): void {
    if (!this.commitEditBeforeToolbarAction()) return;
    if (!this.findReplaceDialog && this.commandBus && this.queries) {
      this.findReplaceDialog = new WebSheetFindReplaceDialog(
        this.commandBus,
        this.queries,
        () => this.getSelectionRange(),
        this.platform,
        () => {
          if (this.sheetTextInput) this.sheetTextInput.refocus();
          else focusWebSheetSurface(this.searCore.renderEngine.renderContext.getRoot());
        },
        this.observations,
        () => this.getSelectionRanges(),
        (match) => {
          const dataEngine = this.searCore.getDataEngine();
          const rowSizes = readSheetRowSizes(dataEngine);
          const columnSizes = readSheetColumnSizes(dataEngine);
          const surface = this.searCore.renderEngine.renderContext.getRoot();
          if (!rowSizes || !columnSizes || !(surface instanceof Element)) return null;
          const config = this.searCore.configEngine.getDefaultConfig();
          const rect = getSheetRangePositionRect([match.row, match.column], [match.row, match.column], {
            rowSizes, columnSizes, offsetX: config.sheetOffsetX ?? 50, offsetY: config.sheetOffsetY ?? 24,
          });
          if (!rect) return null;
          const bounds = surface.getBoundingClientRect();
          const [width, height] = this.searCore.renderEngine.scrollManager.getShape();
          const scroll = this.searCore.renderEngine.scrollManager.getState();
          const freeze = readSheetFreeze(dataEngine);
          const scaleX = width ? bounds.width / width : 1;
          const scaleY = height ? bounds.height / height : 1;
          const left = bounds.left + (rect.x - (match.column < freeze.columns ? 0 : scroll.x)) * scaleX;
          const top = bounds.top + (rect.y - (match.row < freeze.rows ? 0 : scroll.y)) * scaleY;
          return { left, right: left + rect.width * scaleX, top, bottom: top + rect.height * scaleY };
        },
      );
    }
    this.findReplaceDialog?.open();
  }

  protected closeFindReplaceDialog(): void {
    this.findReplaceDialog?.destroy();
  }

  /** Applies a supported toolbar font choice to the active cell edit session. */
  private handleReplicaSelection(controlId: string | undefined, label: string, value?: string | null): void {
    if (!this.commandBus) return;
    if (controlId === 'toolbar-more' && label === 'Find and replace') {
      this.openFindReplaceDialog();
      return;
    }
    if (controlId === 'toolbar-number-format') {
      if (label === 'More number formats…') {
        this.openCellNumberFormatDialog();
        return;
      }
      const format = CellNumberFormatMenu.resolve(label);
      if (format !== void 0) this.setCellFormat(format);
      return;
    }
    if (controlId === SheetToolbarControlId.CellFill) {
      if (!this.commandBus.has(SetRangeCellFillCommand.id)) return;
      const fill = value === null || value === 'transparent' ? null : (value as SheetCellFill);
      this.getSelectionRanges().forEach((range) => this.commandBus!.run(SetRangeCellFillCommand, { ...range, fill }));
      return;
    }
    if (controlId === 'toolbar-duplicate') {
      this.handleDuplicateSelection(label);
      return;
    }
    if (controlId === 'toolbar-sort') {
      this.handleSortSelection(label);
      return;
    }
    if (controlId === 'toolbar-filter') {
      this.handleFilterSelection(label);
      return;
    }
    if (controlId === 'toolbar-conditionalFormatting') {
      this.handleCellHighlightSelection(label);
      return;
    }
    if (controlId === 'toolbar-dv') {
      this.handleDataValidationSelection(label);
      return;
    }
    const attrs = controlId === 'font-color' ? { color: value ?? null } : createFontStyleUpdate(controlId, label);
    if (!attrs) return;
    if (!this.commandBus.has(SetCellInlineStyleCommand.id) && !this.commandBus.has(SetRangeCellTextStyleCommand)) {
      this.showToast('Cell text editing is unavailable');
      return;
    }
    this.setEmbeddedInlineStyle(attrs);
  }

  private handleCellHighlightSelection(label: string): void {
    if (!this.commandBus || !this.queries) return;
    const presets: Readonly<Record<string, CellHighlightCondition>> = {
      'Cell value': { kind: CellHighlightKind.Value },
      'Specific text': { kind: CellHighlightKind.Text },
      Duplicates: { kind: CellHighlightKind.Duplicate },
      'Unique values': { kind: CellHighlightKind.Unique },
      Blanks: { kind: CellHighlightKind.Empty },
      Nonblanks: { kind: CellHighlightKind.NotEmpty },
      Errors: { kind: CellHighlightKind.Error },
      'No errors': { kind: CellHighlightKind.NotError },
      'Top 10 items': { kind: CellHighlightKind.Top, count: 10 },
      'Top 10%': { kind: CellHighlightKind.Top, count: 10, percent: true },
      'Bottom 10 items': { kind: CellHighlightKind.Bottom, count: 10 },
      'Bottom 10%': { kind: CellHighlightKind.Bottom, count: 10, percent: true },
      'Above average': { kind: CellHighlightKind.AboveAverage },
      'Below average': { kind: CellHighlightKind.BelowAverage },
    };
    if (label === 'Clear rules from selected cells') {
      const range = this.getSelectionRange();
      if (range) this.clearConditionalRules(range);
      return;
    }
    if (label === 'Clear rules from entire sheet') {
      this.clearConditionalRules();
      return;
    }
    if (label !== 'View existing rules' && (label === 'New rule' || presets[label]) &&
      this.getSelectionRanges().length === 0) {
      this.showToast('Select cells first.');
      return;
    }
    this.cellHighlightDialog ??= new WebCellHighlightDialog(this.commandBus, this.queries, () =>
      this.getSelectionRange(),
      () => this.getSelectionRanges(),
      (scope, bounds, render) => this.getAdditionalConditionalRules(scope, bounds, render),
    );
    if (label === 'View existing rules') this.cellHighlightDialog.openManage();
    else if (label === 'New rule' || presets[label]) this.cellHighlightDialog.openCreate(presets[label]);
  }

  protected clearConditionalRules(range?: SheetRangeInput): void {
    this.commandBus?.run(ClearCellHighlightRulesCommand, range ? { range } : {});
  }

  protected getAdditionalConditionalRules(
    _scope: 'selection' | 'sheet', _bounds: ConditionalRuleBounds | null, _render: () => void,
  ): ConditionalRuleListRow[] { return []; }

  private handleDataValidationSelection(label: string): void {
    if (!this.commandBus || !this.queries) return;
    this.dataValidationDialog ??= new WebDataValidationDialog(
      this.commandBus,
      this.queries,
      () => this.getSelectionRange(),
      this.platform,
      () => this.getSelectionRanges(),
      (kind) => this.canEvaluateDataValidationKind(kind),
    );
    if (label === 'View all rules') {
      this.dataValidationDialog.openManage();
      return;
    }
    const kind = (Object.entries(dataValidationKindLabels) as [DataValidationKind, string][]).find(
      ([, title]) => title === label,
    )?.[0];
    if (label === 'Custom' || kind) {
      if (this.getSelectionRanges().length === 0) {
        this.showToast('Select cells first.');
        return;
      }
      this.dataValidationDialog.openCreate(kind ?? DataValidationKind.Dropdown);
    }
  }

  private canEvaluateDataValidationKind(kind: DataValidationKind): boolean {
    return !this.queries?.has(CanEvaluateDataValidationKindQuery) ||
      this.queries.run(CanEvaluateDataValidationKindQuery, kind);
  }

  private canEvaluateDataValidationLabel(label: string): boolean {
    const kind = (Object.entries(dataValidationKindLabels) as [DataValidationKind, string][]).find(
      ([, title]) => title === label,
    )?.[0];
    return !kind || this.canEvaluateDataValidationKind(kind);
  }

  private handleSortSelection(label: string): void {
    if (!this.commandBus?.has(SortSheetRangeCommand.id)) return;
    if (this.getSelectionRanges().length > 1) {
      this.showToast('Sorting noncontiguous selections is not supported. Select a contiguous range.');
      return;
    }
    const selection = this.getSelectionRange();
    if (!selection) return;
    if (!this.commitEditBeforeToolbarAction()) return;
    const isTable = label === 'Sort sheet ascending' || label === 'Sort sheet descending';
    const range = isTable
      ? this.getAdjacentDataRange(selection.anchor)
      : {
          start: [
            Math.min(selection.anchor[0], selection.focus[0]),
            Math.min(selection.anchor[1], selection.focus[1]),
          ] as [number, number],
          end: [
            Math.max(selection.anchor[0], selection.focus[0]),
            Math.max(selection.anchor[1], selection.focus[1]),
          ] as [number, number],
        };
    if (!range) return;
    if (label === 'Custom sort') {
      this.sheetSortDialog ??= new WebSheetSortDialog(this.commandBus, () => this.sheetTextInput?.startListener());
      const cells = this.queries?.has(ReadSheetCellDataQuery)
        ? this.queries.run(ReadSheetCellDataQuery, void 0) : null;
      const headerNames = Array.from({ length: range.end[1] - range.start[1] + 1 }, (_, index) => {
        const value = cells?.getItem(range.start[0], range.start[1] + index)?.value;
        return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      });
      this.sheetSortDialog.open(range, selection.anchor[1], headerNames);
      return;
    }
    if (!['Sort sheet ascending', 'Sort sheet descending', 'Sort selection ascending', 'Sort selection descending'].includes(label)) return;
    const direction = label.endsWith('descending') ? SheetSortDirection.Descending : SheetSortDirection.Ascending;
    const column = Math.max(range.start[1], Math.min(selection.anchor[1], range.end[1]));
    try {
      const sheetData = isTable ? readSheetDataMatrix(this.searCore.getDataEngine()) : null;
      this.commandBus.run(SortSheetRangeCommand, {
        range,
        keys: [{ column, direction }],
        firstRowIsHeader: isTable && sheetData ? inferSheetSortHeader(sheetData, range) : false,
      });
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Sort failed');
    }
  }

  private handleFilterSelection(label: string): void {
    if (
      !this.commandBus ||
      !this.queries ||
      !this.commandBus.has(CreateSheetFilterCommand.id) ||
      !this.queries.has(ReadSheetFilterQuery)
    )
      return;
    if (!this.commitEditBeforeToolbarAction()) return;
    if (label === 'Clear filter' || label === 'Cancel filter') {
      this.commandBus.run(ClearSheetFilterCommand, void 0);
      this.sheetFilterDialog?.destroy();
      return;
    }
    if (label === 'Reapply filter') {
      this.commandBus.run(ReapplySheetFilterCommand, void 0);
      return;
    }
    const selection = this.getSelectionRange();
    if (!selection) return;
    if (label === 'Create filter' || label === 'Filter view' || label === 'New filter view') {
      const range = this.getFilterRange(selection);
      if (!range) return;
      const command =
        label === 'Filter view' || label === 'New filter view' ? CreateSheetFilterViewCommand : CreateSheetFilterCommand;
      this.commandBus.run(command, {
        range,
        firstRowIsHeader: range.start[0] < range.end[0],
      });
    }
    if (!this.commandBus.has(SetSheetColumnFilterCommand.id)) return;
    this.sheetFilterDialog ??= new WebSheetFilterDialog(this.commandBus, this.queries, this.platform);
    this.sheetFilterDialog.open(selection.anchor[1]);
  }

  private toggleSheetFilter(): void {
    if (!this.commandBus || !this.queries) return;
    if (this.queries.run(ReadSheetFilterQuery, void 0)) {
      this.commandBus.run(ClearSheetFilterCommand, void 0);
      this.sheetFilterDialog?.destroy();
      return;
    }
    const selection = this.getSelectionRange();
    const range = selection && this.getFilterRange(selection);
    if (range) this.commandBus.run(CreateSheetFilterCommand, {
      range,
      firstRowIsHeader: range.start[0] < range.end[0],
    });
  }

  private getFilterRange(selection: SheetRangeInput): { start: [number, number]; end: [number, number] } | null {
    const selectedRange = {
      start: [Math.min(selection.anchor[0], selection.focus[0]), Math.min(selection.anchor[1], selection.focus[1])] as [number, number],
      end: [Math.max(selection.anchor[0], selection.focus[0]), Math.max(selection.anchor[1], selection.focus[1])] as [number, number],
    };
    return selectedRange.start[0] === selectedRange.end[0] && selectedRange.start[1] === selectedRange.end[1]
      ? this.getAdjacentDataRange(selection.anchor)
      : selectedRange;
  }

  private getAdjacentDataRange(anchor: readonly [number, number]): { start: [number, number]; end: [number, number] } | null {
    const data = readSheetDataMatrix(this.searCore.getDataEngine());
    return data ? inferAdjacentDataRange(data, anchor) : null;
  }

  /** Applies an inline style to the active embedded rich-text cell editor. */
  private setEmbeddedInlineStyle(attrs: Readonly<Record<string, unknown>>): void {
    if (!this.commandBus) return;
    if (!this.isCellEditing() && this.commandBus.has(SetRangeCellTextStyleCommand)) {
      this.commandBus.run(SetRangeCellTextStyleCommand, { attrs });
      return;
    }
    if (!this.commandBus.has(SetCellInlineStyleCommand.id)) {
      this.showToast('Cell text editing is unavailable');
      return;
    }
    this.commandBus.run(SetCellInlineStyleCommand, { attrs });
  }

  private toggleEmbeddedInlineStyle(styleKey: string): void {
    const status = this.inlineStyleState?.[styleKey];
    if (!status?.enabled) return;
    this.setEmbeddedInlineStyle({ [styleKey]: !status.active });
  }

  private bindInlineStyleObservation(): void {
    this.disposeInlineStyleObservation?.();
    this.disposeInlineStyleObservation = null;
    this.inlineStyleState = null;
    if (!this.embeddedEditor.observations.has(SheetEmbeddedInlineStyleObservation)) {
      this.refreshInlineStyleState();
      return;
    }
    this.disposeInlineStyleObservation = this.embeddedEditor.observations.subscribe(
      SheetEmbeddedInlineStyleObservation,
      (state) => {
        this.inlineStyleState = state;
        this.refreshInlineStyleState();
      },
    );
  }

  private isCellEditing(): boolean {
    return this.queries?.has(IsCellEditingQuery) !== true || this.queries.run(IsCellEditingQuery, void 0);
  }

  private refreshInlineStyleState(): void {
    if (this.isCellEditing()) {
      this.applyInlineStyleState(this.inlineStyleState ?? DISABLED_INLINE_STYLE_STATE);
      return;
    }
    const state = this.readGridInlineStyleState();
    this.inlineStyleState = state;
    this.applyInlineStyleState(state);
  }

  private readGridInlineStyleState(): SheetEmbeddedInlineStyleState {
    if (!this.commandBus?.has(SetRangeCellTextStyleCommand) || !this.queries?.has(ReadSheetCellDataQuery)
      || !this.embeddedEditor.formatting) return DISABLED_INLINE_STYLE_STATE;
    const range = this.getSelectionRange();
    if (!range) return DISABLED_INLINE_STYLE_STATE;
    const cell = this.queries.run(ReadSheetCellDataQuery, void 0).getItem(...range.anchor);
    if (!cell || (cell.type !== CellType.String && cell.type !== CellType.RichText)) return DISABLED_INLINE_STYLE_STATE;
    const doc = typeof cell.value === 'string' ? stringToRichDoc(cell.value)
      : Array.isArray(cell.value) ? cell.value : null;
    if (!doc) return DISABLED_INLINE_STYLE_STATE;
    const values = this.embeddedEditor.formatting.capture(doc);
    return Object.fromEntries(INLINE_STYLE_CONTROLS.map(({ styleKey }) => [styleKey, {
      enabled: true,
      active: values[styleKey] === true,
      value: values[styleKey] ?? null,
    }]));
  }

  private applyInlineStyleState(state: SheetEmbeddedInlineStyleState): void {
    INLINE_STYLE_CONTROLS.forEach((control) => {
      const status = state[control.styleKey] ?? DISABLED_INLINE_STYLE_STATUS;
      if (control.kind === 'value') {
        this.updateInlineStyleValue(control, status);
        return;
      }
      if (control.kind === 'palette') {
        this.updateInlineStylePalette(control.testId, status);
        return;
      }
      this.updateInlineStyleButton(control.testId, status);
    });
  }

  private updateInlineStyleValue(
    control: Extract<SheetInlineStyleControl, { readonly kind: 'value' }>,
    status: SheetEmbeddedInlineStyleState[string],
  ): void {
    const select = this.toolbarRoot?.querySelector<HTMLButtonElement>(`[data-testid="${control.testId}"]`);
    if (!select) return;
    const enabled = (this.commandBus?.has(SetCellInlineStyleCommand.id) === true ||
      this.commandBus?.has(SetRangeCellTextStyleCommand) === true) && status.enabled;
    select.disabled = !enabled;
    select.classList.toggle('disabled', !enabled);
    const value = select.querySelector<HTMLElement>('.wd3-select-normal-value, .wd3-select-input-value');
    if (value) value.textContent = status.value === null ? control.emptyValueLabel : String(status.value);
  }

  private updateInlineStyleButton(testId: string, status: SheetEmbeddedInlineStyleState[string]): void {
    const button = this.toolbarRoot?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!button) return;
    const enabled = (this.commandBus?.has(SetCellInlineStyleCommand.id) === true ||
      this.commandBus?.has(SetRangeCellTextStyleCommand) === true) && status.enabled;
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
    button.classList.toggle('wd3-toolbar-item-active', enabled && status.active);
    button.setAttribute('aria-pressed', String(enabled && status.active));
  }

  private updateInlineStylePalette(testId: string, status: SheetEmbeddedInlineStyleState[string]): void {
    const button = this.toolbarRoot?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!button) return;
    const enabled = (this.commandBus?.has(SetCellInlineStyleCommand.id) === true ||
      this.commandBus?.has(SetRangeCellTextStyleCommand) === true) && status.enabled;
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
    button.classList.toggle('wd3-toolbar-item-active', enabled && status.value !== null);
    button.dataset['value'] = typeof status.value === 'string' ? status.value : '';
  }

  private bindHistoryStatus(): void {
    this.disposeHistoryStatus?.();
    this.disposeHistoryStatus = null;
    this.disposeEditHistoryStatus?.();
    this.disposeEditHistoryStatus = null;
    if (this.embeddedEditor.observations.has(SheetEmbeddedEditHistoryObservation)) {
      this.editHistoryState = this.embeddedEditor.observations.getSnapshot(SheetEmbeddedEditHistoryObservation);
      this.disposeEditHistoryStatus = this.embeddedEditor.observations.subscribe(
        SheetEmbeddedEditHistoryObservation,
        (state) => {
          this.editHistoryState = state;
          this.updateHistoryControls(this.history?.getStatus() ?? { canUndo: false, canRedo: false });
        },
      );
    }
    this.updateHistoryControls(this.history?.getStatus() ?? { canUndo: false, canRedo: false });
    if (this.history) this.disposeHistoryStatus = this.history.subscribe(this.updateHistoryControls.bind(this));
  }

  private runHistoryAction(action: 'undo' | 'redo'): void {
    if (this.editHistoryState?.editing) {
      if (this.commandBus?.has(HandleDocumentInputCommand)) {
        this.commandBus.run(HandleDocumentInputCommand, { kind: 'keyDown', key: 'z', metaKey: true, shiftKey: action === 'redo' });
      }
      return;
    }
    this.commandBus?.run(action === 'undo' ? UndoSheetCommand : RedoSheetCommand, void 0);
  }

  private bindCellFormatStatus(): void {
    this.disposeCellFormatStatus?.();
    this.disposeCellFormatStatus = null;
    this.refreshCellFormatStatus();
    this.refreshAlignmentStatus();
    if (!this.commandBus) return;
    this.disposeCellFormatStatus = this.commandBus.subscribe((event) => {
      if (event.phase === CommandExecutionPhase.Completed) {
        this.refreshCellFormatStatus();
        this.refreshAlignmentStatus();
        if (!this.isCellEditing()) this.refreshInlineStyleState();
      }
    });
  }

  private refreshAlignmentStatus(): void {
    const ranges = this.getSelectionRanges();
    const dataEngine = this.searCore.getDataEngine();
    const horizontal = readSheetCellAlignments(dataEngine);
    const vertical = readSheetCellVerticalAlignments(dataEngine);
    const horizontalValue = horizontal && this.commandBus?.has(SetRangeAlignmentCommand)
      ? readUniformAlignment(horizontal, ranges, SheetHorizontalAlignment.Left) : null;
    const verticalValue = vertical && this.commandBus?.has(SetRangeVerticalAlignmentCommand)
      ? readUniformAlignment(vertical, ranges, SheetVerticalAlignment.Center) : null;
    for (const [testId, value] of [
      ['toolbar-leftAlign', SheetHorizontalAlignment.Left],
      ['toolbar-centerAlign', SheetHorizontalAlignment.Center],
      ['toolbar-rightAlign', SheetHorizontalAlignment.Right],
    ] as const) this.updateAlignmentButton(testId, horizontalValue === value);
    for (const [testId, value] of [
      ['toolbar-alignTop', SheetVerticalAlignment.Top],
      ['toolbar-alignCenter', SheetVerticalAlignment.Center],
      ['toolbar-alignBottom', SheetVerticalAlignment.Bottom],
    ] as const) this.updateAlignmentButton(testId, verticalValue === value);
  }

  private updateAlignmentButton(testId: string, selected: boolean): void {
    const button = this.toolbarRoot?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!button) return;
    button.classList.toggle('wd3-toolbar-item-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  private refreshCellFormatStatus(): void {
    const control = this.toolbarRoot?.querySelector<HTMLButtonElement>('[data-testid="toolbar-number-format"]');
    if (!control) return;
    const enabled =
      this.commandBus?.has(SetRangeCellFormatCommand.id) === true &&
      this.queries?.has(ReadSheetCellFormatQuery) === true;
    control.disabled = !enabled;
    control.classList.toggle('disabled', !enabled);
    if (!enabled) return;
    const range = this.getSelectionRange();
    if (!range) return;
    const format = this.queries!.run(ReadSheetCellFormatQuery, void 0).getItem(range.anchor[0], range.anchor[1])
      ?? this.formulaResults?.getFormulaResultFormat?.(range.anchor[0], range.anchor[1]) ?? null;
    const value = control.querySelector<HTMLElement>('.wd3-select-normal-value');
    if (value) value.textContent = CellNumberFormatMenu.describe(format);
  }

  private updateHistoryControls(status: SheetHistoryStatus): void {
    const editing = this.editHistoryState?.editing === true;
    const available = this.commandBus?.has(HandleDocumentInputCommand) === true;
    this.setHistoryControlEnabled('toolbar-undo', editing ? available && this.editHistoryState!.canUndo : status.canUndo);
    this.setHistoryControlEnabled('toolbar-redo', editing ? available && this.editHistoryState!.canRedo : status.canRedo);
  }

  private setHistoryControlEnabled(testId: string, enabled: boolean): void {
    const button = this.toolbarRoot?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!button) return;
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
  }

  private getSelectionRange(): { anchor: [number, number]; focus: [number, number] } | null {
    const range = this.queries
      ? this.queries.run(GetSelection, void 0)
      : (() => {
          const selection = this.searCore
            .getDataEngine()
            .getDataType<[RectRange, RectRange]>(SheetSelectionPlugin.pluginKey);
          if (!selection) return null;
          const anchor = selection[1].getPoint(0);
          const focus = selection[1].getPoint(1);
          return focus[0] < 0 ? null : { start: anchor, end: focus };
        })();
    if (!range) return null;
    return { anchor: [...range.start], focus: [...range.end] };
  }

  private getSelectionRanges(): { anchor: [number, number]; focus: [number, number] }[] {
    if (this.queries?.has(GetSelections))
      return this.queries.run(GetSelections, void 0).map((range) => ({
        anchor: [...range.start], focus: [...range.end],
      }));
    const current = this.getSelectionRange();
    return current ? [current] : [];
  }

  private refreshFillPalette(): void {
    const palette = document.querySelector<HTMLElement>('[data-testid="toolbar-popover-fillColor"]');
    const fills = readSheetCellFills(this.searCore.getDataEngine());
    const ranges = this.getSelectionRanges();
    if (!palette || !fills || ranges.length === 0) return;

    let cells = 0;
    let filled = 0;
    let value: SheetCellFill | null = null;
    let mixed = false;
    for (const range of ranges) {
      const startRow = Math.min(range.anchor[0], range.focus[0]);
      const endRow = Math.max(range.anchor[0], range.focus[0]);
      const startColumn = Math.min(range.anchor[1], range.focus[1]);
      const endColumn = Math.max(range.anchor[1], range.focus[1]);
      cells += (endRow - startRow + 1) * (endColumn - startColumn + 1);
      fills.forEachStored((fill, row, column) => {
        if (row < startRow || row > endRow || column < startColumn || column > endColumn || fill === null) return;
        filled += 1;
        if (value !== null && value.toLowerCase() !== fill.toLowerCase()) mixed = true;
        value = fill;
      });
    }
    mixed ||= filled > 0 && filled < cells;
    const heading = palette.querySelector<HTMLElement>('.sear-toolbar-color-title');
    if (heading) heading.textContent = mixed ? 'Fill color (mixed)' : 'Fill color';
    palette.querySelectorAll<HTMLButtonElement>('.sear-toolbar-color-swatch').forEach((swatch) => {
      const color = swatch.dataset['colorValue'];
      const selected = !mixed && (value === null ? color === 'transparent' : color?.toLowerCase() === value.toLowerCase());
      swatch.classList.toggle('sear-toolbar-color-swatch-selected', selected);
      swatch.setAttribute('aria-pressed', String(selected));
    });
  }

  private getDuplicateHighlightRange(): { anchor: [number, number]; focus: [number, number] } | null {
    return this.getSelectionRange();
  }

  private async copy(): Promise<void> {
    if (!this.commandBus) return;
    const selectedText = this.queries?.has(ReadSelectedCellEditTextQuery)
      ? this.queries.run(ReadSelectedCellEditTextQuery, void 0) : null;
    if (selectedText !== null && selectedText !== undefined) {
      if (!selectedText) return;
      try {
        await this.clipboard.write({ plainText: selectedText });
      } catch (error) {
        this.platform.warn('Toolbar text copy failed.', error);
      }
      return;
    }
    if (this.getSelectionRanges().length > 1) {
      this.showToast('Copying noncontiguous selections is not supported.');
      return;
    }
    try {
      const result = this.commandBus.run(CopyRangeCommand, void 0);
      await this.clipboard.write(result.payload);
    } catch (error) {
      this.platform.warn('Toolbar clipboard copy failed.', error);
    }
  }

  private openSheetContextMenu(surface: Element, event: MouseEvent): void {
    if (!this.commandBus?.has(SelectRangeCommand)) return;
    const rows = readSheetRowSizes(this.searCore.getDataEngine());
    const columns = readSheetColumnSizes(this.searCore.getDataEngine());
    if (!rows || !columns || !rows.shape[1] || !columns.shape[1]) return;
    const rect = surface.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const config = this.searCore.configEngine.getDefaultConfig();
    const headerX = config.sheetOffsetX ?? 50;
    const headerY = config.sheetOffsetY ?? 24;
    if (x < 0 || y < 0 || (x < headerX && y < headerY)) return;
    const scroll = this.searCore.renderEngine.scrollManager.getState();
    const hit = this.searCore.eventEngine?.getNodeAtViewPoint(x, y)?.properties;
    const isColumnHeader = y < headerY;
    const isRowHeader = x < headerX;
    const hitRow = hit?.startRowIndex;
    const row = isColumnHeader ? 0 : Math.max(0, Math.min(rows.shape[1] - 1,
      Number.isSafeInteger(hitRow) ? Number(hitRow) : rows.getRightBoundaryColIndexByDimension(scroll.y + y - headerY)));
    const hitCol = hit?.startColIndex;
    const col = isRowHeader ? 0 : Math.max(0, Math.min(columns.shape[1] - 1,
      Number.isSafeInteger(hitCol) ? Number(hitCol) : columns.getRightBoundaryColIndexByDimension(scroll.x + x - headerX)));
    const existing = this.contextMenuPriorSelection === undefined
      ? this.getSelectionRange() : this.contextMenuPriorSelection;
    this.contextMenuPriorSelection = undefined;
    const withinSelection = existing && row >= existing.anchor[0] && row <= existing.focus[0] &&
      (isColumnHeader
        ? existing.anchor[0] === 0 && existing.focus[0] === rows.shape[1] - 1 &&
          col >= existing.anchor[1] && col <= existing.focus[1]
        : isRowHeader
        ? existing.anchor[1] === 0 && existing.focus[1] === columns.shape[1] - 1
        : col >= existing.anchor[1] && col <= existing.focus[1]);
    const anchor: [number, number] = withinSelection ? existing.anchor : [row, col];
    const focus: [number, number] = withinSelection ? existing.focus : [
      isColumnHeader ? rows.shape[1] - 1 : row,
      isRowHeader ? columns.shape[1] - 1 : col,
    ];
    event.preventDefault();
    if (!withinSelection) this.commandBus.run(SelectRangeCommand, { anchor, focus });
    const actions: SheetContextAction[] = [];
    if (this.commandBus.has(CopyRangeCommand)) actions.push({ label: 'Copy', run: () => { void this.copy(); } });
    if (this.commandBus.has(CutRangeCommand)) actions.push({ label: 'Cut', run: () => { void this.cut(); } });
    if (this.commandBus.has(PasteRangeCommand)) actions.push({ label: 'Paste', run: () => { void this.paste(); } });
    if (this.commandBus.has(ClearRangeContentsCommand)) actions.push({
      label: 'Clear contents',
      run: () => {
        if (this.queries?.has(IsCellEditingQuery) && this.queries.run(IsCellEditingQuery, void 0)) {
          if (!this.commandBus?.has(CancelCellEditCommand)) return;
          this.commandBus.run(CancelCellEditCommand, void 0);
          if (this.queries.run(IsCellEditingQuery, void 0)) return;
        }
        this.commandBus?.run(ClearRangeContentsCommand, { anchor, focus });
      },
    });
    if (isRowHeader) {
      if (this.commandBus.has(InsertRowCommand)) actions.push({
        label: 'Insert rows above', run: () => this.commandBus?.run(InsertRowCommand, { index: anchor[0], count: focus[0] - anchor[0] + 1 }),
      });
      if (this.commandBus.has(DeleteRowCommand)) actions.push({
        label: 'Delete rows', run: () => this.commandBus?.run(DeleteRowCommand, { index: anchor[0], count: focus[0] - anchor[0] + 1 }),
      });
    } else if (isColumnHeader) {
      if (this.commandBus.has(InsertColumnCommand)) actions.push({
        label: 'Insert columns left', run: () => this.commandBus?.run(InsertColumnCommand, { index: anchor[1], count: focus[1] - anchor[1] + 1 }),
      });
      if (this.commandBus.has(DeleteColumnCommand)) actions.push({
        label: 'Delete columns', run: () => this.commandBus?.run(DeleteColumnCommand, { index: anchor[1], count: focus[1] - anchor[1] + 1 }),
      });
    } else if (this.commandBus.has(SetRangeCellFormatCommand)) {
      actions.push({ label: 'Format cells', run: () => this.openCellFormatDialog() });
    }
    this.contextMenu.open(event.clientX, event.clientY, actions);
  }

  private async cut(): Promise<void> {
    if (!this.commandBus) return;
    const selectedText = this.queries?.has(ReadSelectedCellEditTextQuery)
      ? this.queries.run(ReadSelectedCellEditTextQuery, void 0) : null;
    if (selectedText !== null && selectedText !== undefined) {
      if (!selectedText) return;
      try {
        await this.clipboard.write({ plainText: selectedText });
        this.commandBus.run(HandleDocumentInputCommand, { kind: 'delete' });
      } catch (error) {
        this.platform.warn('Toolbar text cut failed.', error);
      }
      return;
    }
    if (this.getSelectionRanges().length > 1) {
      this.showToast('Cutting noncontiguous selections is not supported.');
      return;
    }
    try {
      const result = this.commandBus.run(CutRangeCommand, void 0);
      await this.clipboard.write(result.payload);
    } catch (error) {
      this.platform.warn('Toolbar clipboard cut failed.', error);
    }
  }

  private async paste(): Promise<void> {
    if (!this.commandBus) return;
    const editingAtStart = this.queries?.has(IsCellEditingQuery) &&
      this.queries.run(IsCellEditingQuery, void 0);
    try {
      const payload = await this.clipboard.read();
      if (editingAtStart) {
        if (payload?.plainText) this.commandBus.run(HandleDocumentInputCommand, {
          kind: TextInputKind.Text,
          text: payload.plainText,
        });
        return;
      }
      if (payload) {
        const result = this.commandBus.run(PasteRangeCommand, { payload });
        await result.completion;
        if (result.workbookMove) return;
        this.commandBus.run(SelectRangeCommand, {
          anchor: [result.range.start[0], result.range.start[1]],
          focus: [result.range.end[0], result.range.end[1]],
        });
      }
    } catch (error) {
      if (error instanceof SheetClipboardError && error.code === SheetClipboardErrorCode.TargetOutOfBounds) {
        const { target, columnCount, columnLimit } = error.details;
        const exceedsColumns =
          Array.isArray(target) &&
          typeof target[1] === 'number' &&
          typeof columnCount === 'number' &&
          typeof columnLimit === 'number' &&
          target[1] + columnCount > columnLimit;
        this.showToast(exceedsColumns ? 'Paste range exceeds the sheet column limit.' : 'Paste range exceeds the sheet bounds.');
      } else if (error instanceof SheetClipboardError && error.code === SheetClipboardErrorCode.TargetIntersectsMergedCells) {
        this.showToast('Paste range includes merged cells; hidden content was not written.');
      } else if (error instanceof SheetClipboardError && error.code === SheetClipboardErrorCode.InputRejected) {
        this.showToast(error.message);
      }
      this.platform.warn('Toolbar clipboard paste failed.', error);
    } finally {
      if (editingAtStart && this.queries?.run(IsCellEditingQuery, void 0)) this.sheetTextInput?.refocus();
    }
  }

  private setAlignment(alignment: SheetHorizontalAlignment): void {
    if (!this.commandBus) return;
    const ranges = this.getSelectionRanges();
    if (ranges.length === 1) this.commandBus.run(SetRangeAlignmentCommand, { ...ranges[0], alignment });
    else if (ranges.length > 1) this.commandBus.run(SetRangeAlignmentCommand, { ranges, alignment });
  }

  private setVerticalAlignment(verticalAlignment: SheetVerticalAlignment): void {
    if (!this.commandBus) return;
    this.getSelectionRanges().forEach((range) => this.commandBus!.run(SetRangeVerticalAlignmentCommand, { ...range, verticalAlignment }));
  }

  private setCellFormat(format: CellFormat | null): void {
    if (!this.commandBus?.has(SetRangeCellFormatCommand.id)) return;
    if (!this.commitEditBeforeToolbarAction()) return;
    const ranges = this.getSelectionRanges();
    if (ranges.length === 1) this.commandBus.run(SetRangeCellFormatCommand, { ...ranges[0], format });
    else if (ranges.length > 1) this.commandBus.run(SetRangeCellFormatCommand, { ranges, format });
  }

  private adjustCellFormatDecimalPlaces(delta: number): void {
    if (!this.commandBus?.has(AdjustRangeCellFormatDecimalPlacesCommand.id)) return;
    if (!this.commitEditBeforeToolbarAction()) return;
    this.getSelectionRanges().forEach((range) => this.commandBus!.run(AdjustRangeCellFormatDecimalPlacesCommand, { ...range, delta }));
  }

  private commitEditBeforeToolbarAction(): boolean {
    if (!this.queries?.has(IsCellEditingQuery) || !this.queries.run(IsCellEditingQuery, void 0)) return true;
    if (!this.commandBus?.has(CommitCellEditCommand)) return false;
    this.commandBus.run(CommitCellEditCommand, void 0);
    return !this.queries.run(IsCellEditingQuery, void 0);
  }

  private handleDuplicateSelection(label: string): void {
    if (!this.commandBus) return;
    if (label === 'Highlight duplicates' && this.commandBus.has(HighlightDuplicateRowsCommand.id)) {
      const range = this.getDuplicateHighlightRange();
      if (!range) return;
      this.commandBus.run(HighlightDuplicateRowsCommand, { ...range, highlight: '#ffe8e6' });
      return;
    }
    if (label === 'Clear duplicate highlighting' && this.commandBus.has(ClearDuplicateHighlightsCommand.id)) {
      const range = this.getDuplicateHighlightRange();
      if (!range) return;
      this.commandBus.run(ClearDuplicateHighlightsCommand, range);
      return;
    }
    if (label === 'Remove duplicates' && this.commandBus.has(DeleteDuplicateRowsCommand.id)) {
      const range = this.getSelectionRange();
      if (!range) return;
      this.openDeleteDuplicatesDialog(range);
    }
  }

  private openDeleteDuplicatesDialog(range: { anchor: [number, number]; focus: [number, number] }): void {
    document.querySelector('.sear-toolbar-duplicate-dialog')?.remove();
    const startRow = Math.min(range.anchor[0], range.focus[0]);
    const endRow = Math.max(range.anchor[0], range.focus[0]);
    const startColumn = Math.min(range.anchor[1], range.focus[1]);
    const endColumn = Math.max(range.anchor[1], range.focus[1]);
    const columns = Array.from({ length: endColumn - startColumn + 1 }, (_, index) => startColumn + index);
    const sheetData = readSheetDataMatrix(this.searCore.getDataEngine());
    let hasOutsideData = false;
    sheetData?.forEachStoredInRange(startRow, 0, endRow, sheetData.shape[1] - 1, (cell, _row, column) => {
      if (cell !== null && (column < startColumn || column > endColumn)) hasOutsideData = true;
    });
    const root = document.createElement('div');
    root.className = 'sear-toolbar-duplicate-dialog';

    const panel = document.createElement('div');
    panel.className = 'sear-toolbar-duplicate-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Remove duplicates');
    panel.innerHTML = `
      <button type="button" class="sear-toolbar-duplicate-close" aria-label="Close">×</button>
      <div class="sear-toolbar-duplicate-title">Remove duplicates</div>
      <label class="sear-toolbar-duplicate-row"><input type="checkbox" data-role="header-row">Exclude header row</label>
      <label class="sear-toolbar-duplicate-row">Keep per group
        <select data-role="keep" aria-label="Duplicate to keep"><option value="${SheetDuplicateKeepMode.First}">First</option><option value="${SheetDuplicateKeepMode.Last}">Last</option></select>
      </label>
      <div class="sear-toolbar-duplicate-columns"></div>
      ${hasOutsideData ? '<label class="sear-toolbar-duplicate-row"><input type="checkbox" data-role="delete-whole-rows">Delete entire rows, including data outside the selection</label>' : ''}
      <div class="sear-toolbar-duplicate-actions">
        <button type="button" data-role="cancel">Cancel</button>
        <button type="button" data-role="confirm">OK</button>
      </div>`;
    const list = panel.querySelector<HTMLElement>('.sear-toolbar-duplicate-columns');
    list?.appendChild(createDuplicateColumnCheckbox('Select all', 'all', true));
    columns.forEach((column) =>
      list?.appendChild(createDuplicateColumnCheckbox(`Column ${columnLabel(column)}`, String(column), true)),
    );
    const cells = this.queries?.has(ReadSheetCellDataQuery)
      ? this.queries.run(ReadSheetCellDataQuery, void 0) : null;
    const headerRow = Math.min(range.anchor[0], range.focus[0]);
    const headerNames = columns.map((column) => {
      const value = cells?.getItem(headerRow, column)?.value;
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    });
    const headerRowInput = panel.querySelector<HTMLInputElement>('[data-role="header-row"]');
    const updateColumnLabels = () => {
      columns.forEach((column, index) => {
        const item = list?.querySelector<HTMLInputElement>(`[data-column="${column}"]`)?.parentElement;
        if (!item?.lastChild) return;
        const label = `Column ${columnLabel(column)}`;
        item.lastChild.textContent = headerRowInput?.checked && headerNames[index]
          ? `${label}（${headerNames[index]}）` : label;
      });
    };
    headerRowInput?.addEventListener('change', updateColumnLabels);
    const wholeRowsInput = panel.querySelector<HTMLInputElement>('[data-role="delete-whole-rows"]');
    const confirmButton = panel.querySelector<HTMLButtonElement>('[data-role="confirm"]');
    if (wholeRowsInput && confirmButton) {
      confirmButton.disabled = true;
      wholeRowsInput.addEventListener('change', () => { confirmButton.disabled = !wholeRowsInput.checked; });
    }
    root.appendChild(panel);

    const close = () => root.remove();
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    });
    panel.querySelector<HTMLElement>('.sear-toolbar-duplicate-close')?.addEventListener('click', close);
    panel.querySelector<HTMLElement>('[data-role="cancel"]')?.addEventListener('click', close);
    panel.querySelector<HTMLInputElement>('[data-column="all"]')?.addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      panel.querySelectorAll<HTMLInputElement>('[data-column]:not([data-column="all"])').forEach((input) => {
        input.checked = checked;
      });
    });
    const allColumns = panel.querySelector<HTMLInputElement>('[data-column="all"]');
    const columnInputs = Array.from(panel.querySelectorAll<HTMLInputElement>('[data-column]:not([data-column="all"])'));
    columnInputs.forEach((input) => input.addEventListener('change', () => {
      if (!allColumns) return;
      const selected = columnInputs.filter((column) => column.checked).length;
      allColumns.checked = selected === columnInputs.length;
      allColumns.indeterminate = selected > 0 && selected < columnInputs.length;
    }));
    panel.querySelector<HTMLElement>('[data-role="confirm"]')?.addEventListener('click', () => {
      const selectedColumns = Array.from(
        panel.querySelectorAll<HTMLInputElement>('[data-column]:not([data-column="all"])'),
      )
        .filter((input) => input.checked)
        .map((input) => Number(input.dataset['column']));
      if (selectedColumns.length === 0) {
        this.showToast('Select at least one column.');
        return;
      }
      const keep = panel.querySelector<HTMLSelectElement>('[data-role="keep"]')?.value as SheetDuplicateKeepMode;
      this.commandBus?.run(DeleteDuplicateRowsCommand, {
        ...range,
        columns: selectedColumns,
        headerRow: panel.querySelector<HTMLInputElement>('[data-role="header-row"]')?.checked === true,
        keep,
      });
      close();
    });
    document.body.appendChild(root);
    panel.querySelector<HTMLButtonElement>('[data-role="cancel"]')?.focus();
  }

  private openCellNumberFormatDialog(): void {
    this.openFormatDialog(false);
  }

  private openCellFormatDialog(): void {
    this.openFormatDialog(true);
  }

  private openFormatDialog(full: boolean): void {
    const range = this.getSelectionRange();
    if (!range || !this.queries?.has(ReadSheetCellFormatQuery)) return;
    const [row, column] = range.anchor;
    const currentFormat = this.queries.run(ReadSheetCellFormatQuery, void 0).getItem(row, column);
    const sampleValue = this.formulaResults?.getFormulaResult(row, column) ?? (
      this.queries.has(ReadSheetCellDataQuery)
        ? this.queries.run(ReadSheetCellDataQuery, void 0).getItem(row, column)?.value
        : void 0
    );
    this.refreshCellFormatStatus();
    const textState = full ? this.readGridInlineStyleState() : null;
    const currentTextStyle = textState ? Object.fromEntries(
      Object.entries(textState).map(([key, status]) => [key, status.value]),
    ) : undefined;
    this.cellNumberFormatDialog.open({
      currentFormat,
      sampleValue,
      onApply: (format) => this.setCellFormat(format),
      sections: full ? {
        currentAlignment: readSheetCellAlignments(this.searCore.getDataEngine())?.getItem(row, column),
        currentVerticalAlignment: readSheetCellVerticalAlignments(this.searCore.getDataEngine())?.getItem(row, column),
        currentFill: readSheetCellFills(this.searCore.getDataEngine())?.getItem(row, column),
        currentTextStyle,
        textStyleEnabled: textState?.['bold']?.enabled === true,
        onApplyAlignment: (value) => this.setAlignment(value),
        onApplyVerticalAlignment: (value) => this.setVerticalAlignment(value),
        onApplyTextStyle: (attrs) => this.setEmbeddedInlineStyle(attrs),
        onApplyBorder: (preset: SheetBorderPreset, stroke: SheetBorderStroke) => {
          if (!this.commandBus?.has(SetRangeCellBorderCommand)) return;
          this.getSelectionRanges().forEach((selection) =>
            this.commandBus!.run(SetRangeCellBorderCommand, { ...selection, preset, stroke }));
        },
        onApplyFill: (fill) => {
          if (!this.commandBus?.has(SetRangeCellFillCommand)) return;
          this.getSelectionRanges().forEach((selection) =>
            this.commandBus!.run(SetRangeCellFillCommand, { ...selection, fill: fill as SheetCellFill | null }));
        },
      } : undefined,
    });
  }

  private deleteSelectedCells(mode: SheetDeleteCellsMode): void {
    const selection = this.getSelectionRange();
    const data = readSheetDataMatrix(this.searCore.getDataEngine());
    if (!selection || !data || !this.commandBus) return;
    const start: [number, number] = [
      Math.min(selection.anchor[0], selection.focus[0]),
      Math.min(selection.anchor[1], selection.focus[1]),
    ];
    const end: [number, number] = [
      Math.max(selection.anchor[0], selection.focus[0]),
      Math.max(selection.anchor[1], selection.focus[1]),
    ];
    if (mode === 'row') {
      this.commandBus.run(DeleteRowCommand, { index: start[0], count: end[0] - start[0] + 1 });
      return;
    }
    if (mode === 'column') {
      this.commandBus.run(DeleteColumnCommand, { index: start[1], count: end[1] - start[1] + 1 });
      return;
    }
    const vertical = mode === 'up';
    const axis = vertical ? 0 : 1;
    const next = end[axis] + 1;
    if (next >= data.shape[axis]) {
      this.commandBus.run(ClearRangeContentsCommand, selection);
      if (this.commandBus.has(ClearRangeStylesCommand)) this.commandBus.run(ClearRangeStylesCommand, selection);
      return;
    }
    const sourceStart = [...start] as [number, number];
    const sourceEnd = [...end] as [number, number];
    sourceStart[axis] = next;
    sourceEnd[axis] = data.shape[axis] - 1;
    this.commandBus.run(MoveSheetRangeCommand, {
      source: { start: sourceStart, end: sourceEnd },
      target: start,
      overwrite: true,
    });
    this.commandBus.run(SelectRangeCommand, { anchor: start, focus: start, ensureVisible: true });
  }

  private goToSelection(choice: SheetGoToChoice, address: string): string | null {
    const data = readSheetDataMatrix(this.searCore.getDataEngine());
    const selection = this.getSelectionRange();
    if (!data || !selection || !this.commandBus) return 'Sheet unavailable';
    if (choice === 'address') {
      const range = parseAddress(address, data.shape);
      if (!range || [...range.anchor, ...range.focus].some((value, axis) =>
        value < 0 || value >= data.shape[axis % 2])) return 'Enter a valid cell or range reference.';
      this.commandBus.run(SelectRangeCommand, { ...range, ensureVisible: true });
      return null;
    }
    if (choice === 'region') {
      const range = this.getAdjacentDataRange(selection.anchor);
      this.commandBus.run(SelectRangeCommand, {
        anchor: range?.start ?? selection.anchor,
        focus: range?.end ?? selection.anchor,
        ensureVisible: true,
      });
      return null;
    }

    const points: [number, number][] = [];
    if (choice === 'blanks') {
      const start = [Math.min(selection.anchor[0], selection.focus[0]), Math.min(selection.anchor[1], selection.focus[1])];
      const end = [Math.max(selection.anchor[0], selection.focus[0]), Math.max(selection.anchor[1], selection.focus[1])];
      if (start[0] === end[0] && start[1] === end[1]) {
        let maxRow = start[0]; let maxColumn = start[1];
        data.forEachStored((value, row, column) => {
          if (value != null) { maxRow = Math.max(maxRow, row); maxColumn = Math.max(maxColumn, column); }
        });
        end[0] = maxRow; end[1] = maxColumn;
      }
      if ((end[0] - start[0] + 1) * (end[1] - start[1] + 1) > 10_000)
        return 'The blank-cell search range is too large. Select a smaller range.';
      for (let row = start[0]; row <= end[0]; row++)
        for (let column = start[1]; column <= end[1]; column++)
          if (data.getItem(row, column) == null) points.push([row, column]);
    } else {
      data.forEachStored((value, row, column) => {
        if (value != null && value.type !== CellType.Empty &&
          (choice === 'formulas') === (value.type === CellType.Formula)) points.push([row, column]);
      });
    }
    if (!points.length) return 'No matching cells found.';
    if (points.length > 2_000) return 'Too many matches. Narrow the sheet range.';
    points.forEach(([row, column], index) => this.commandBus!.run(SelectRangeCommand, {
      anchor: [row, column], focus: [row, column],
      additionalSelectionMode: index === 0 ? SheetAdditionalSelectionMode.Clear : SheetAdditionalSelectionMode.AppendCurrent,
      ensureVisible: index === 0,
    }));
    return null;
  }

  private insertHyperlink(draft: SheetHyperlinkDraft): string | null {
    if (!this.commandBus?.has(StartFormulaBarEditCommand) ||
      !this.commandBus.has(SetFormulaBarDraftCommand) || !this.commandBus.has(CommitCellEditCommand))
      return 'A hyperlink cannot be inserted in the current cell.';
    if (draft.kind === 'web') {
      try {
        const url = new URL(draft.target);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Enter a valid web address.';
      } catch { return 'Enter a valid web address.'; }
    } else if (draft.kind === 'workbook') {
      if (!/^#(?:(?:'[^']+'|[^!#]+)!)?[A-Z]+[1-9]\d*$/.test(draft.target))
        return 'Enter a valid sheet and cell.';
    } else if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+(?:\?subject=.*)?$/.test(draft.target)) {
      return 'Enter a valid email address.';
    }
    const escape = (text: string) => text.replaceAll('"', '""');
    const formula = `=HYPERLINK("${escape(draft.target)}","${escape(draft.label || draft.target)}")`;
    this.commandBus.run(StartFormulaBarEditCommand, void 0);
    this.commandBus.run(SetFormulaBarDraftCommand, {
      text: formula, selectionStart: formula.length, selectionEnd: formula.length,
    });
    this.commandBus.run(CommitCellEditCommand, void 0);
    return null;
  }

  private async toggleMergeCells(): Promise<void> {
    const range = this.getSelectionRange();
    if (!range || !this.commandBus || this.mergePending) return;
    const mountedRoot = this.toolbarRoot;
    this.mergePending = true;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const analysis = this.queries?.run(AnalyzeMergeCellsQuery, range);
        if (!analysis || analysis.discardedCells.length === 0) {
          try {
            this.commandBus.run(ToggleMergeCellsCommand, range);
            return;
          } catch (error) {
            if (error instanceof SheetCellMergeConfirmationError) continue;
            throw error;
          }
        }
        const confirmed = await this.userInteraction.confirm({
          title: 'Merge cells',
          message: 'Merging keeps only the top-leftmost nonempty cell value in the range. Other values will be cleared. Merge anyway?',
          confirmLabel: 'Merge',
          cancelLabel: 'Cancel',
        });
        if (!confirmed || this.toolbarRoot !== mountedRoot) return;
        try {
          this.commandBus.run(ToggleMergeCellsCommand, { ...range, confirmation: analysis });
          return;
        } catch (error) {
          if (error instanceof SheetCellMergeConfirmationError && error.details['reason'] === 'changed') continue;
          throw error;
        }
      }
      this.platform.warn('Sheet contents changed while confirming the merge.');
    } catch (error) {
      this.platform.warn('Toolbar cell merge failed.', error);
    } finally {
      this.mergePending = false;
    }
  }
}

function readUniformAlignment(
  matrix: AlignmentMatrix | VerticalAlignmentMatrix,
  ranges: readonly { readonly anchor: readonly [number, number]; readonly focus: readonly [number, number] }[],
  defaultValue: string,
): string | null {
  let cells = 0;
  let overrides = 0;
  let value: string | null = null;
  let mixed = false;
  for (const range of ranges) {
    const startRow = Math.min(range.anchor[0], range.focus[0]);
    const endRow = Math.max(range.anchor[0], range.focus[0]);
    const startColumn = Math.min(range.anchor[1], range.focus[1]);
    const endColumn = Math.max(range.anchor[1], range.focus[1]);
    cells += (endRow - startRow + 1) * (endColumn - startColumn + 1);
    matrix.forEachStored((alignment, row, column) => {
      if (row < startRow || row > endRow || column < startColumn || column > endColumn) return;
      overrides += 1;
      if (value !== null && value !== alignment) mixed = true;
      value = alignment;
    });
  }
  if (cells === 0) return null;
  if (overrides === 0) return defaultValue;
  return mixed || overrides < cells ? null : value;
}

const DISABLED_INLINE_STYLE_STATUS = { enabled: false, active: false, value: null } as const;
type SheetInlineStyleControl =
  | { readonly kind: 'toggle'; readonly testId: string; readonly styleKey: string }
  | { readonly kind: 'value'; readonly testId: string; readonly styleKey: string; readonly emptyValueLabel: string }
  | { readonly kind: 'palette'; readonly testId: string; readonly styleKey: string };

const INLINE_STYLE_CONTROLS = [
  { kind: 'toggle', testId: 'toolbar-bold', styleKey: 'bold' },
  { kind: 'toggle', testId: 'toolbar-italic', styleKey: 'italic' },
  { kind: 'toggle', testId: 'toolbar-underline', styleKey: 'underline' },
  { kind: 'toggle', testId: 'toolbar-crossOut', styleKey: 'strikethrough' },
  { kind: 'value', testId: 'font-family-select', styleKey: 'fontFamily', emptyValueLabel: 'Default' },
  { kind: 'value', testId: 'font-size-select', styleKey: 'fontSize', emptyValueLabel: 'Default' },
  { kind: 'palette', testId: 'font-color', styleKey: 'color' },
] as const satisfies readonly SheetInlineStyleControl[];
const DISABLED_INLINE_STYLE_STATE: SheetEmbeddedInlineStyleState = Object.fromEntries(
  INLINE_STYLE_CONTROLS.map(({ styleKey }) => [styleKey, DISABLED_INLINE_STYLE_STATUS]),
);

function createDuplicateColumnCheckbox(label: string, column: string, checked: boolean): HTMLElement {
  const item = document.createElement('label');
  item.className = 'sear-toolbar-duplicate-column';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset['column'] = column;
  input.checked = checked;
  item.appendChild(input);
  item.append(label);
  return item;
}

function columnLabel(columnIndex: number): string {
  let value = columnIndex + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function createFontStyleUpdate(controlId: string | undefined, label: string): Readonly<Record<string, unknown>> | null {
  if (controlId === 'font-family-select') return { fontFamily: label === 'Default' ? null : label };
  if (controlId !== 'font-size-select') return null;
  const fontSize = Number(label);
  return Number.isFinite(fontSize) && fontSize > 0 ? { fontSize } : null;
}
