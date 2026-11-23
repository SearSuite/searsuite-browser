import { Inject, Injectable } from '@searsuite/sear-foundation-di';
import { KeyboardKey } from '@searsuite/sear-foundation-keymap';
import { KeyboardRouter, KeyboardRouterHandlers } from '@searsuite/sear-render-input';

/**
 * Browser implementation of `KeyboardRouter`.
 *
 * Attaches a `keydown` listener to the injected `EventTarget` in the **capture
 * phase** so that keyboard shortcuts are intercepted before any bubbling-phase
 * handler can act on them, and – critically – regardless of which DOM element
 * holds editor focus at the time. Native host form controls retain their own keys. This means shortcuts like Ctrl+A remain functional
 * even after a canvas click has shifted browser focus away from the hidden
 * `<input>` used for IME composition.
 *
 * The `EventTarget` (typically `document`) is injected via DI using
 * `WebKeyboardRouter.eventTargetSymbol`, keeping this class free of hard-coded
 * browser globals and making it straightforward to test with a stub.
 *
 * The listener is active only between `startListener()` / `stopListener()`.
 */
@Injectable()
export class WebKeyboardRouter extends KeyboardRouter {
  /** DI token for the keyboard event source, normally `document`. */
  public static readonly eventTargetSymbol: symbol = Symbol.for('WebKeyboardRouter.EventTarget');

  private readonly boundHandleKeyDown: EventListener;
  private readonly boundHandleUnhandledEscape: EventListener;

  /** Creates a WebKeyboardRouter instance. */
  constructor(
    @Inject(WebKeyboardRouter.eventTargetSymbol)
    private readonly eventTarget: EventTarget,
  ) {
    super();
    this.boundHandleKeyDown = this.handleKeyDown.bind(this) as EventListener;
    this.boundHandleUnhandledEscape = this.handleUnhandledEscape.bind(this) as EventListener;
  }

  // ── Registered handlers ──────────────────────────────────────────────────

  private onDelete?: (direction?: 'backward' | 'forward', byWord?: boolean) => void;
  private onEnter?: (shiftKey: boolean, primaryModifier?: boolean) => void;
  private onEdit?: () => void;
  private onEscape?: () => void;
  private onUnhandledEscape?: () => void;
  private onToggleReference?: () => void;
  private onArrowLeft?: (shiftKey: boolean, metaKey: boolean, altKey?: boolean) => void;
  private onArrowRight?: (shiftKey: boolean, metaKey: boolean, altKey?: boolean) => void;
  private onArrowUp?: (shiftKey: boolean, metaKey: boolean) => void;
  private onArrowDown?: (shiftKey: boolean, metaKey: boolean) => void;
  private onSelectAll?: () => void;
  private onHome?: (primaryModifier: boolean, shiftKey: boolean) => void;
  private onEnd?: (shiftKey: boolean) => void;
  private onLineEnd?: (shiftKey: boolean) => void;
  private onPage?: (direction: -1 | 1, shiftKey: boolean) => void;
  private onHorizontalPage?: (direction: -1 | 1, shiftKey: boolean) => void;
  private onSelectRow?: () => void;
  private onSelectColumn?: () => void;
  private onHideRows?: () => void;
  private onHideColumns?: () => void;
  private onDeleteCells?: () => void;
  private onToggleBold?: () => void;
  private onToggleItalic?: () => void;
  private onToggleUnderline?: () => void;
  private onToggleStrikethrough?: () => void;
  private onCopy?: () => void;
  private onCut?: () => void;
  private onPaste?: (valuesOnly: boolean) => void;
  private onFillDown?: () => void;
  private onFillRight?: () => void;
  private onCopyFormulaAbove?: () => void;
  private onInsertCurrentDate?: () => boolean;
  private onInsertCurrentTime?: () => boolean;
  private onTab?: (shiftKey: boolean) => void;
  private onSoftEnter?: () => void;
  private onZoomIn?: () => void;
  private onZoomOut?: () => void;
  private onZoomReset?: () => void;
  private onUndo?: () => void;
  private onRedo?: () => void;
  private endNavigationArmed = false;

  // ── KeyboardRouter implementation ────────────────────────────────────────

  /** @inheritdoc */
  public override subscribe(handlers: KeyboardRouterHandlers): () => void {
    const target = this as unknown as Record<string, unknown>;
    const previous = Object.entries(handlers)
      .filter(([, handler]) => handler !== void 0)
      .map(([name, handler]) => ({ name, handler, value: target[name] }));
    if (handlers.onDelete !== void 0) this.onDelete = handlers.onDelete;
    if (handlers.onEnter !== void 0) this.onEnter = handlers.onEnter;
    if (handlers.onEdit !== void 0) this.onEdit = handlers.onEdit;
    if (handlers.onEscape !== void 0) this.onEscape = handlers.onEscape;
    if (handlers.onUnhandledEscape !== void 0) this.onUnhandledEscape = handlers.onUnhandledEscape;
    if (handlers.onToggleReference !== void 0) this.onToggleReference = handlers.onToggleReference;
    if (handlers.onArrowLeft !== void 0) this.onArrowLeft = handlers.onArrowLeft;
    if (handlers.onArrowRight !== void 0) this.onArrowRight = handlers.onArrowRight;
    if (handlers.onArrowUp !== void 0) this.onArrowUp = handlers.onArrowUp;
    if (handlers.onArrowDown !== void 0) this.onArrowDown = handlers.onArrowDown;
    if (handlers.onSelectAll !== void 0) this.onSelectAll = handlers.onSelectAll;
    if (handlers.onHome !== void 0) this.onHome = handlers.onHome;
    if (handlers.onEnd !== void 0) this.onEnd = handlers.onEnd;
    if (handlers.onLineEnd !== void 0) this.onLineEnd = handlers.onLineEnd;
    if (handlers.onPage !== void 0) this.onPage = handlers.onPage;
    if (handlers.onHorizontalPage !== void 0) this.onHorizontalPage = handlers.onHorizontalPage;
    if (handlers.onSelectRow !== void 0) this.onSelectRow = handlers.onSelectRow;
    if (handlers.onSelectColumn !== void 0) this.onSelectColumn = handlers.onSelectColumn;
    if (handlers.onHideRows !== void 0) this.onHideRows = handlers.onHideRows;
    if (handlers.onHideColumns !== void 0) this.onHideColumns = handlers.onHideColumns;
    if (handlers.onDeleteCells !== void 0) this.onDeleteCells = handlers.onDeleteCells;
    if (handlers.onToggleBold !== void 0) this.onToggleBold = handlers.onToggleBold;
    if (handlers.onToggleItalic !== void 0) this.onToggleItalic = handlers.onToggleItalic;
    if (handlers.onToggleUnderline !== void 0) this.onToggleUnderline = handlers.onToggleUnderline;
    if (handlers.onToggleStrikethrough !== void 0) this.onToggleStrikethrough = handlers.onToggleStrikethrough;
    if (handlers.onCopy !== void 0) this.onCopy = handlers.onCopy;
    if (handlers.onCut !== void 0) this.onCut = handlers.onCut;
    if (handlers.onPaste !== void 0) this.onPaste = handlers.onPaste;
    if (handlers.onFillDown !== void 0) this.onFillDown = handlers.onFillDown;
    if (handlers.onFillRight !== void 0) this.onFillRight = handlers.onFillRight;
    if (handlers.onCopyFormulaAbove !== void 0) this.onCopyFormulaAbove = handlers.onCopyFormulaAbove;
    if (handlers.onInsertCurrentDate !== void 0) this.onInsertCurrentDate = handlers.onInsertCurrentDate;
    if (handlers.onInsertCurrentTime !== void 0) this.onInsertCurrentTime = handlers.onInsertCurrentTime;
    if (handlers.onTab !== void 0) this.onTab = handlers.onTab;
    if (handlers.onSoftEnter !== void 0) this.onSoftEnter = handlers.onSoftEnter;
    if (handlers.onZoomIn !== void 0) this.onZoomIn = handlers.onZoomIn;
    if (handlers.onZoomOut !== void 0) this.onZoomOut = handlers.onZoomOut;
    if (handlers.onZoomReset !== void 0) this.onZoomReset = handlers.onZoomReset;
    if (handlers.onUndo !== void 0) this.onUndo = handlers.onUndo;
    if (handlers.onRedo !== void 0) this.onRedo = handlers.onRedo;
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      for (const { name, handler, value } of previous) {
        if (target[name] === handler) target[name] = value;
      }
    };
  }

  // ── Lifecycle state ──────────────────────────────────────────────────────

  private isListening: boolean = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** @inheritdoc */
  public override startListener(): void {
    if (this.isListening) return;
    this.isListening = true;
    this.eventTarget.addEventListener('keydown', this.boundHandleKeyDown, true);
    this.eventTarget.addEventListener('keydown', this.boundHandleUnhandledEscape);
  }

  /** @inheritdoc */
  public override stopListener(): void {
    this.isListening = false;
    this.endNavigationArmed = false;
    this.eventTarget.removeEventListener('keydown', this.boundHandleKeyDown, true);
    this.eventTarget.removeEventListener('keydown', this.boundHandleUnhandledEscape);
  }

  // ── Internal key handler ─────────────────────────────────────────────────

  private handleUnhandledEscape(event: KeyboardEvent): void {
    if (event.key !== KeyboardKey.Escape || event.defaultPrevented || event.isComposing || !this.onUnhandledEscape)
      return;
    this.onUnhandledEscape();
    event.preventDefault();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target;
    // Native host controls own editing and navigation; only the editor's input uses grid routing.
    if (
      target instanceof Element &&
      target.id !== 'searTextInput' &&
      target.closest('input,textarea,select,button,[contenteditable="true"]')
    ) {
      this.endNavigationArmed = false;
      return;
    }
    const arrowKey = event.key === KeyboardKey.ArrowLeft || event.key === KeyboardKey.ArrowRight ||
      event.key === KeyboardKey.ArrowUp || event.key === KeyboardKey.ArrowDown;
    if (!arrowKey && event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta' && event.key !== 'Alt') {
      this.endNavigationArmed = false;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === KeyboardKey.Undo) {
        if (event.shiftKey) this.onRedo?.();
        else this.onUndo?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!event.shiftKey && key === KeyboardKey.Redo) {
        this.onRedo?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.shiftKey && key === 'v' && this.onPaste) {
        this.onPaste(true);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      if (event.ctrlKey && !event.metaKey && (event.code === 'Quote' || event.key === "'") && this.onCopyFormulaAbove) {
        this.onCopyFormulaAbove();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === ';' && event.ctrlKey !== event.metaKey) {
        const handled = event.ctrlKey ? this.onInsertCurrentDate?.() : this.onInsertCurrentTime?.();
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      const shortcut = event.key.toLowerCase();
      if (shortcut === KeyboardKey.Bold) {
        this.onToggleBold?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === KeyboardKey.Italic) {
        this.onToggleItalic?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === KeyboardKey.Underline) {
        this.onToggleUnderline?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === 'c' || shortcut === 'x' || shortcut === 'v') {
        if (shortcut === 'c') this.onCopy?.();
        else if (shortcut === 'x') this.onCut?.();
        else this.onPaste?.(false);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === 'd' || shortcut === 'r') {
        if (shortcut === 'd') this.onFillDown?.();
        else this.onFillRight?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Plus || event.key === KeyboardKey.Equal) {
        this.onZoomIn?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Hyphen || event.key === KeyboardKey.Minus) {
        if (this.onDeleteCells) this.onDeleteCells();
        else this.onZoomOut?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Zero) {
        if (this.onHideColumns) this.onHideColumns();
        else this.onZoomReset?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === '9' && this.onHideRows) {
        this.onHideRows();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (event.code === 'Space' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.onSelectRow?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.code === 'Space' && event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey) {
      this.onSelectColumn?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey) {
      if (event.key.toLowerCase() === KeyboardKey.Strikethrough) {
        this.onToggleStrikethrough?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (event.key === KeyboardKey.Home && !event.altKey) {
      this.onHome?.(event.ctrlKey || event.metaKey, event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'End' && (event.ctrlKey || event.metaKey) && !event.altKey) {
      this.onEnd?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'End' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.endNavigationArmed = !this.onLineEnd;
      this.onLineEnd?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((event.key === 'PageUp' || event.key === 'PageDown') && !event.ctrlKey && !event.metaKey) {
      if (event.altKey) this.onHorizontalPage?.(event.key === 'PageDown' ? 1 : -1, event.shiftKey);
      else this.onPage?.(event.key === 'PageDown' ? 1 : -1, event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === KeyboardKey.Tab && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onTab?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === KeyboardKey.Backspace || event.key === KeyboardKey.Delete) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onDelete?.(event.key === KeyboardKey.Delete ? 'forward' : 'backward', event.altKey);
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.Enter) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.altKey) {
        this.onSoftEnter?.();
      } else {
        this.onEnter?.(event.shiftKey, event.ctrlKey || event.metaKey);
      }
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.Escape) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onEscape?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'F2' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onEdit?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ToggleReference && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onToggleReference?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowLeft) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onArrowLeft?.(event.shiftKey, event.ctrlKey || event.metaKey || this.endNavigationArmed, event.altKey);
      this.endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowRight) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onArrowRight?.(event.shiftKey, event.ctrlKey || event.metaKey || this.endNavigationArmed, event.altKey);
      this.endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowUp) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onArrowUp?.(event.shiftKey, event.ctrlKey || event.metaKey || this.endNavigationArmed);
      this.endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowDown) {
      if (event.isComposing || event.keyCode === 229) return;
      this.onArrowDown?.(event.shiftKey, event.ctrlKey || event.metaKey || this.endNavigationArmed);
      this.endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === KeyboardKey.SelectAll) {
      this.onSelectAll?.();
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
