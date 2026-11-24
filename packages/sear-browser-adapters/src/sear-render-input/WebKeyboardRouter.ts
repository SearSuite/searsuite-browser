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
  readonly #eventTarget: EventTarget;

  /** DI token for the keyboard event source, normally `document`. */
  public static readonly eventTargetSymbol: symbol = Symbol.for('WebKeyboardRouter.EventTarget');

  readonly #boundHandleKeyDown: EventListener;
  readonly #boundHandleUnhandledEscape: EventListener;

  /** Creates a WebKeyboardRouter instance. */
  constructor(
    @Inject(WebKeyboardRouter.eventTargetSymbol)
    eventTarget: EventTarget,
  ) {
    super();
    this.#eventTarget = eventTarget;
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this) as EventListener;
    this.#boundHandleUnhandledEscape = this.#handleUnhandledEscape.bind(this) as EventListener;
  }

  // ── Registered handlers ──────────────────────────────────────────────────

  readonly #handlers: KeyboardRouterHandlers = {};
  #endNavigationArmed = false;

  // ── KeyboardRouter implementation ────────────────────────────────────────

  /** @inheritdoc */
  public override subscribe(handlers: KeyboardRouterHandlers): () => void {
    const target = this.#handlers;
    const previous = Object.entries(handlers)
      .filter(([, handler]) => handler !== undefined)
      .map(([name, handler]) => ({ name, handler, value: Reflect.get(target, name) }));
    for (const { name, handler } of previous) Reflect.set(target, name, handler);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      for (const { name, handler, value } of previous) {
        if (Reflect.get(target, name) === handler) Reflect.set(target, name, value);
      }
    };
  }

  // ── Lifecycle state ──────────────────────────────────────────────────────

  #isListening: boolean = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** @inheritdoc */
  public override startListener(): void {
    if (this.#isListening) return;
    this.#isListening = true;
    this.#eventTarget.addEventListener('keydown', this.#boundHandleKeyDown, true);
    this.#eventTarget.addEventListener('keydown', this.#boundHandleUnhandledEscape);
  }

  /** @inheritdoc */
  public override stopListener(): void {
    this.#isListening = false;
    this.#endNavigationArmed = false;
    this.#eventTarget.removeEventListener('keydown', this.#boundHandleKeyDown, true);
    this.#eventTarget.removeEventListener('keydown', this.#boundHandleUnhandledEscape);
  }

  // ── Internal key handler ─────────────────────────────────────────────────

  #handleUnhandledEscape(event: KeyboardEvent): void {
    if (event.key !== KeyboardKey.Escape || event.defaultPrevented || event.isComposing || !this.#handlers.onUnhandledEscape)
      return;
    this.#handlers.onUnhandledEscape();
    event.preventDefault();
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target;
    // Native host controls own editing and navigation; only the editor's input uses grid routing.
    if (
      target instanceof Element &&
      target.id !== 'searTextInput' &&
      target.closest('input,textarea,select,button,[contenteditable="true"]')
    ) {
      this.#endNavigationArmed = false;
      return;
    }
    const arrowKey = event.key === KeyboardKey.ArrowLeft || event.key === KeyboardKey.ArrowRight ||
      event.key === KeyboardKey.ArrowUp || event.key === KeyboardKey.ArrowDown;
    if (!arrowKey && event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta' && event.key !== 'Alt') {
      this.#endNavigationArmed = false;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === KeyboardKey.Undo) {
        if (event.shiftKey) this.#handlers.onRedo?.();
        else this.#handlers.onUndo?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!event.shiftKey && key === KeyboardKey.Redo) {
        this.#handlers.onRedo?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.shiftKey && key === 'v' && this.#handlers.onPaste) {
        this.#handlers.onPaste(true);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      if (event.ctrlKey && !event.metaKey && (event.code === 'Quote' || event.key === "'") && this.#handlers.onCopyFormulaAbove) {
        this.#handlers.onCopyFormulaAbove();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === ';' && event.ctrlKey !== event.metaKey) {
        const handled = event.ctrlKey ? this.#handlers.onInsertCurrentDate?.() : this.#handlers.onInsertCurrentTime?.();
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      const shortcut = event.key.toLowerCase();
      if (shortcut === KeyboardKey.Bold) {
        this.#handlers.onToggleBold?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === KeyboardKey.Italic) {
        this.#handlers.onToggleItalic?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === KeyboardKey.Underline) {
        this.#handlers.onToggleUnderline?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === 'c' || shortcut === 'x' || shortcut === 'v') {
        if (shortcut === 'c') this.#handlers.onCopy?.();
        else if (shortcut === 'x') this.#handlers.onCut?.();
        else this.#handlers.onPaste?.(false);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shortcut === 'd' || shortcut === 'r') {
        if (shortcut === 'd') this.#handlers.onFillDown?.();
        else this.#handlers.onFillRight?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Plus || event.key === KeyboardKey.Equal) {
        this.#handlers.onZoomIn?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Hyphen || event.key === KeyboardKey.Minus) {
        if (this.#handlers.onDeleteCells) this.#handlers.onDeleteCells();
        else this.#handlers.onZoomOut?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === KeyboardKey.Zero) {
        if (this.#handlers.onHideColumns) this.#handlers.onHideColumns();
        else this.#handlers.onZoomReset?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === '9' && this.#handlers.onHideRows) {
        this.#handlers.onHideRows();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (event.code === 'Space' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.#handlers.onSelectRow?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.code === 'Space' && event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey) {
      this.#handlers.onSelectColumn?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey) {
      if (event.key.toLowerCase() === KeyboardKey.Strikethrough) {
        this.#handlers.onToggleStrikethrough?.();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (event.key === KeyboardKey.Home && !event.altKey) {
      this.#handlers.onHome?.(event.ctrlKey || event.metaKey, event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'End' && (event.ctrlKey || event.metaKey) && !event.altKey) {
      this.#handlers.onEnd?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'End' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.#endNavigationArmed = !this.#handlers.onLineEnd;
      this.#handlers.onLineEnd?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if ((event.key === 'PageUp' || event.key === 'PageDown') && !event.ctrlKey && !event.metaKey) {
      if (event.altKey) this.#handlers.onHorizontalPage?.(event.key === 'PageDown' ? 1 : -1, event.shiftKey);
      else this.#handlers.onPage?.(event.key === 'PageDown' ? 1 : -1, event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === KeyboardKey.Tab && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onTab?.(event.shiftKey);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === KeyboardKey.Backspace || event.key === KeyboardKey.Delete) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onDelete?.(event.key === KeyboardKey.Delete ? 'forward' : 'backward', event.altKey);
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.Enter) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.altKey) {
        this.#handlers.onSoftEnter?.();
      } else {
        this.#handlers.onEnter?.(event.shiftKey, event.ctrlKey || event.metaKey);
      }
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.Escape) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onEscape?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'F2' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onEdit?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ToggleReference && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onToggleReference?.();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowLeft) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onArrowLeft?.(event.shiftKey, event.ctrlKey || event.metaKey || this.#endNavigationArmed, event.altKey);
      this.#endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowRight) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onArrowRight?.(event.shiftKey, event.ctrlKey || event.metaKey || this.#endNavigationArmed, event.altKey);
      this.#endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowUp) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onArrowUp?.(event.shiftKey, event.ctrlKey || event.metaKey || this.#endNavigationArmed);
      this.#endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === KeyboardKey.ArrowDown) {
      if (event.isComposing || event.keyCode === 229) return;
      this.#handlers.onArrowDown?.(event.shiftKey, event.ctrlKey || event.metaKey || this.#endNavigationArmed);
      this.#endNavigationArmed = false;
      event.preventDefault();
      event.stopPropagation();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === KeyboardKey.SelectAll) {
      this.#handlers.onSelectAll?.();
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
