import { Injectable } from '@searsuite/sear-foundation-di';
import { KeyboardKey } from '@searsuite/sear-foundation-keymap';
import { TextInput } from '@searsuite/sear-render-input';
import { type TextInputHandlers } from '@searsuite/sear-render-input';
import { TextInputKind, type TextInputEvent } from '@searsuite/sear-domain-commands';

/**
 * Browser implementation of `TextInput`.
 *
 * Manages a hidden `<input>` element that receives IME composition events and
 * regular printable-character input.  All keyboard-shortcut / action-key
 * handling (arrows, Enter, Escape, Backspace, Ctrl+A) has been moved to
 * `WebKeyboardRouter` so that those shortcuts remain functional even when
 * browser focus shifts away from this element (e.g. after a canvas click).
 *
 * The hidden input must still hold focus during active editing so that the OS
 * IME candidate window is anchored to it.  Call `refocus()` whenever a
 * pointer event inside the editor area moves focus elsewhere.
 */
@Injectable()
export class WebTextInput extends TextInput {
  #hiddenInput: HTMLInputElement | null = null;
  #isListening = false;
  #isComposing = false;
  #composingText = '';
  #composingOffset = 0;
  readonly #boundHandleCompositionStart: EventListener;
  readonly #boundHandleCompositionUpdate: EventListener;
  readonly #boundHandleComposingKeydown: EventListener;
  readonly #boundCompositionEnd: EventListener;
  readonly #boundHandleInput: EventListener;
  readonly #boundHandlePaste: EventListener;
  readonly #boundHandleCut: EventListener;

  // ─── Hooks wired by SheetCellEditorPlugin ─────────────────────────────────
  /** Handles the input lifecycle event. */
  public onTextInput?: (event: TextInputEvent) => void;
  /** Handles the delete lifecycle event. */
  public onDelete?: () => void;
  public onCut?: () => string | null;
  public onPaste?: (text: string) => boolean;

  /** Creates a WebTextInput instance. */
  constructor() {
    super();
    this.#boundHandleCompositionStart = this.#handleCompositionStart.bind(this) as EventListener;
    this.#boundHandleCompositionUpdate = this.#handleCompositionUpdate.bind(this) as EventListener;
    this.#boundHandleComposingKeydown = this.#handleComposingKeydown.bind(this) as EventListener;
    this.#boundCompositionEnd = this.#compositionEnd.bind(this) as EventListener;
    this.#boundHandleInput = this.#handleInput.bind(this) as EventListener;
    this.#boundHandlePaste = this.#handlePaste.bind(this) as EventListener;
    this.#boundHandleCut = this.#handleCut.bind(this) as EventListener;
  }

  #createHiddenInput() {
    this.#hiddenInput = document.createElement('input');
    this.#hiddenInput.type = 'text';
    this.#hiddenInput.id = 'searTextInput';
    this.#hiddenInput.style.position = 'fixed';
    this.#hiddenInput.style.left = '0px';
    this.#hiddenInput.style.top = '0px';
    this.#hiddenInput.style.opacity = '0';
    this.#hiddenInput.style.pointerEvents = 'none';
    this.#hiddenInput.style.height = '30px';
    this.#hiddenInput.style.width = '200px';
    this.#hiddenInput.tabIndex = -1;
    this.#hiddenInput.autocomplete = 'off';
    this.#hiddenInput.autocapitalize = 'off';
    this.#hiddenInput.spellcheck = false;

    document.body.appendChild(this.#hiddenInput);
  }

  /** @inheritdoc */
  public override subscribe(handlers: TextInputHandlers): void {
    if (handlers.onTextInput !== void 0) this.onTextInput = handlers.onTextInput;
    if (handlers.onDelete !== void 0) this.onDelete = handlers.onDelete;
    if (handlers.onCut !== void 0) this.onCut = handlers.onCut;
    if (handlers.onPaste !== void 0) this.onPaste = handlers.onPaste;
  }

  /** @inheritdoc */
  public override startListener(): void {
    if (this.#isListening) {
      this.#focusHiddenInput();
      return;
    }
    this.#createHiddenInput();
    this.#isListening = true;
    this.#hiddenInput?.addEventListener('input', this.#boundHandleInput);
    this.#hiddenInput?.addEventListener('paste', this.#boundHandlePaste);
    this.#hiddenInput?.addEventListener('cut', this.#boundHandleCut);
    this.#hiddenInput?.addEventListener('compositionstart', this.#boundHandleCompositionStart);
    this.#hiddenInput?.addEventListener('compositionupdate', this.#boundHandleCompositionUpdate);
    this.#hiddenInput?.addEventListener('compositionend', this.#boundCompositionEnd);
    this.#hiddenInput?.addEventListener('keydown', this.#boundHandleComposingKeydown);
    this.#focusHiddenInput();
  }

  /** @inheritdoc */
  public override stopListener(): void {
    this.#isListening = false;
    this.#hiddenInput?.removeEventListener('input', this.#boundHandleInput);
    this.#hiddenInput?.removeEventListener('paste', this.#boundHandlePaste);
    this.#hiddenInput?.removeEventListener('cut', this.#boundHandleCut);
    this.#hiddenInput?.removeEventListener('compositionstart', this.#boundHandleCompositionStart);
    this.#hiddenInput?.removeEventListener('compositionupdate', this.#boundHandleCompositionUpdate);
    this.#hiddenInput?.removeEventListener('compositionend', this.#boundCompositionEnd);
    this.#hiddenInput?.removeEventListener('keydown', this.#boundHandleComposingKeydown);
    this.#hiddenInput?.remove();
    this.#hiddenInput = null;
    this.#isComposing = false;
    this.#composingText = '';
    this.#composingOffset = 0;
  }

  /** Restore focus to the hidden input (e.g. after a canvas click moves focus away). */
  public override refocus(): void {
    this.#focusHiddenInput();
  }

  /**
   * Move the hidden input to the cursor's screen position so that the OS
   * IME candidate window is anchored near the cell being edited.
   */
  public override setPosition(x: number, y: number): void {
    if (!this.#hiddenInput) return;
    this.#hiddenInput.style.left = `${x}px`;
    this.#hiddenInput.style.top = `${y}px`;
  }

  #focusHiddenInput(): void {
    if (!this.#hiddenInput) return;
    // Focusing an off-screen editor input can make the browser scroll the
    // document; the sheet scroll manager owns viewport movement instead.
    this.#hiddenInput.focus({ preventScroll: true });
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  #handleCompositionStart(_event: CompositionEvent): void {
    this.#isComposing = true;
    this.#composingText = '';
    this.#composingOffset = 0;
  }

  #handleCompositionUpdate(event: CompositionEvent): void {
    const text = event.data ?? '';
    if (text === this.#composingText) return;
    this.#composingText = text;
    // After new text arrives, the caret is always at the end; selectionStart is
    // unreliable in some IMEs and may return 0.
    this.#composingOffset = text.length;
    this.onTextInput?.({ kind: TextInputKind.CompositionUpdate, text, caretOffset: this.#composingOffset });
  }

  /**
   * Tracks the editor caret manually when Arrow/Home/End are pressed during
   * Pinyin composition, without calling preventDefault(). This lets the IME
   * handle those keys too, keeping the IME internal caret and editor caret in
   * sync. Otherwise delete would remove text from the IME end while the editor
   * removes text from the middle.
   */
  #handleComposingKeydown(event: KeyboardEvent): void {
    if (!this.#isComposing) return;

    const len = this.#composingText.length;
    let newOffset = this.#composingOffset;

    switch (event.key) {
      case KeyboardKey.ArrowLeft:
        newOffset = Math.max(0, this.#composingOffset - 1);
        break;
      case KeyboardKey.ArrowRight:
        newOffset = Math.min(len, this.#composingOffset + 1);
        break;
      case KeyboardKey.Home:
        newOffset = 0;
        break;
      case KeyboardKey.End:
        newOffset = len;
        break;
      default:
        return;
    }

    if (newOffset !== this.#composingOffset) {
      this.#composingOffset = newOffset;
      this.onTextInput?.({ kind: TextInputKind.CompositionUpdate, text: this.#composingText, caretOffset: newOffset });
      // Do not call preventDefault(); let the event reach the IME so it can move its internal caret.
    }
  }

  #compositionEnd(event: CompositionEvent): void {
    this.#isComposing = false;
    this.#composingText = '';
    this.#composingOffset = 0;
    const text = event.data;
    if (this.#hiddenInput) this.#hiddenInput.value = '';
    this.onTextInput?.({ kind: TextInputKind.CompositionUpdate, text: '', caretOffset: 0 });
    if (text) this.onTextInput?.({ kind: TextInputKind.Text, text });
    event.stopPropagation();
  }

  #handleInput(event: Event): void {
    if (this.#isComposing) return;
    const text = this.#hiddenInput?.value ?? '';
    if (this.#hiddenInput) this.#hiddenInput.value = '';
    if (text) this.onTextInput?.({ kind: TextInputKind.Text, text });
    event.stopPropagation();
  }

  #handlePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') || '';
    if (text && !this.onPaste?.(text)) this.onTextInput?.({ kind: TextInputKind.Text, text });
    event.preventDefault();
  }

  #handleCut(event: ClipboardEvent): void {
    const selectedText = this.onCut?.();
    if (selectedText === undefined || selectedText) {
      if (selectedText) event.clipboardData?.setData('text/plain', selectedText);
      this.onDelete?.();
    }
    event.preventDefault();
  }
}
