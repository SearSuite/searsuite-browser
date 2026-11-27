import { KeyboardKey } from '@searsuite/sear-foundation-keymap';

import { WebTextInput } from '../../src';
import { TextInputKind } from '@searsuite/sear-domain-commands';

function getHiddenInput(): HTMLInputElement {
  const input = document.getElementById('searTextInput');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected WebTextInput to create its hidden input.');
  }
  return input;
}

function createClipboardEvent(type: 'paste' | 'cut', text: string): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: () => text },
  });
  return event;
}

describe('WebTextInput', () => {
  it('reuses the input surface and preserves composition when started again', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn(() => textInput.startListener());
    textInput.subscribe({ onTextInput });
    textInput.startListener();
    const input = getHiddenInput();
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: '\u4e2d\u6587' }));
    expect(getHiddenInput()).toBe(input);
    expect(document.querySelectorAll('#searTextInput')).toHaveLength(1);
    input.value = '\u4e2d\u6587';
    input.dispatchEvent(new Event('input'));
    expect(onTextInput).toHaveBeenCalledTimes(1);
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '\u4e2d\u6587' }));
    expect(onTextInput).toHaveBeenCalledTimes(3);
    expect(onTextInput).toHaveBeenLastCalledWith({ kind: TextInputKind.Text, text: '\u4e2d\u6587' });
    textInput.stopListener();
  });
  afterEach(() => {
    document.getElementById('searTextInput')?.remove();
    jest.restoreAllMocks();
  });

  it('forwards typed and pasted text, routes cut to deletion, and tears down its DOM element', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn();
    const onDelete = jest.fn();
    textInput.subscribe({ onTextInput, onDelete });
    textInput.startListener();
    const input = getHiddenInput();

    input.value = 'hello';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const paste = createClipboardEvent('paste', ' pasted ');
    input.dispatchEvent(paste);
    const cut = createClipboardEvent('cut', '');
    input.dispatchEvent(cut);

    expect(onTextInput).toHaveBeenNthCalledWith(1, { kind: TextInputKind.Text, text: 'hello' });
    expect(onTextInput).toHaveBeenNthCalledWith(2, { kind: TextInputKind.Text, text: ' pasted ' });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
    expect(paste.defaultPrevented).toBe(true);
    expect(cut.defaultPrevented).toBe(true);

    textInput.stopListener();
    expect(document.getElementById('searTextInput')).toBeNull();
  });

  it('writes the selected edit text into a native cut event before deleting it', () => {
    const textInput = new WebTextInput();
    const onDelete = jest.fn();
    const setData = jest.fn();
    textInput.subscribe({ onCut: () => 'beta', onDelete });
    textInput.startListener();
    const event = new Event('cut', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { setData } });
    getHiddenInput().dispatchEvent(event);
    expect(setData).toHaveBeenCalledWith('text/plain', 'beta');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);

    textInput.subscribe({ onCut: () => '' });
    getHiddenInput().dispatchEvent(event);
    expect(onDelete).toHaveBeenCalledTimes(1);
    textInput.stopListener();
  });

  it('BUG-108 sends a grid paste to the committed paste handler while preserving edit-mode paste', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn();
    const onPaste = jest.fn(() => true);
    textInput.subscribe({ onTextInput, onPaste });
    textInput.startListener();
    getHiddenInput().dispatchEvent(createClipboardEvent('paste', 'paste-probe'));
    expect(onPaste).toHaveBeenCalledWith('paste-probe');
    expect(onTextInput).not.toHaveBeenCalled();
    onPaste.mockReturnValue(false);
    getHiddenInput().dispatchEvent(createClipboardEvent('paste', 'edit-probe'));
    expect(onTextInput).toHaveBeenCalledWith({ kind: TextInputKind.Text, text: 'edit-probe' });
    textInput.stopListener();
  });

  it('tracks composition text and commits it only when composition ends', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn();
    textInput.subscribe({ onTextInput });
    textInput.startListener();
    const input = getHiddenInput();

    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: '\u4e2d\u6587' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.ArrowLeft }));
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '\u4e2d\u6587' }));

    expect(onTextInput.mock.calls).toEqual([
      [{ kind: TextInputKind.CompositionUpdate, text: '\u4e2d\u6587', caretOffset: 2 }],
      [{ kind: TextInputKind.CompositionUpdate, text: '\u4e2d\u6587', caretOffset: 1 }],
      [{ kind: TextInputKind.CompositionUpdate, text: '', caretOffset: 0 }],
      [{ kind: TextInputKind.Text, text: '\u4e2d\u6587' }],
    ]);
  });

  it('provides refocus and setPosition for the underlying hidden input', () => {
    const textInput = new WebTextInput();
    textInput.startListener();
    const input = getHiddenInput();
    const focusSpy = jest.spyOn(input, 'focus');

    textInput.refocus();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.style.position).toBe('fixed');

    textInput.setPosition(42, 84);
    expect(input.style.left).toBe('42px');
    expect(input.style.top).toBe('84px');

    textInput.stopListener();
    // After stopListener, it does not throw
    textInput.refocus();
    textInput.setPosition(10, 10);
  });

  it('prevents browser scrolling when edit-mode focus starts', () => {
    const focusSpy = jest.spyOn(HTMLInputElement.prototype, 'focus').mockImplementation(() => void 0);
    const textInput = new WebTextInput();

    textInput.startListener();
    const input = getHiddenInput();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.style.position).toBe('fixed');
    expect(input.style.left).toBe('0px');
    expect(input.style.top).toBe('0px');

    textInput.stopListener();
  });

  it('handles navigation keys during composition correctly', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn();
    textInput.subscribe({ onTextInput });
    textInput.startListener();
    const input = getHiddenInput();

    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'hello' })); // len: 5, offset: 5

    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.ArrowRight }));
    // Still 5 (max)
    expect(onTextInput).toHaveBeenCalledTimes(1);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.ArrowLeft }));
    // offset 4
    expect(onTextInput).toHaveBeenLastCalledWith({
      kind: TextInputKind.CompositionUpdate,
      text: 'hello',
      caretOffset: 4,
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.Home }));
    // offset 0
    expect(onTextInput).toHaveBeenLastCalledWith({
      kind: TextInputKind.CompositionUpdate,
      text: 'hello',
      caretOffset: 0,
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.End }));
    // offset 5
    expect(onTextInput).toHaveBeenLastCalledWith({
      kind: TextInputKind.CompositionUpdate,
      text: 'hello',
      caretOffset: 5,
    });

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onTextInput).toHaveBeenCalledTimes(4);
  });

  it('ignores empty event data and detaches listeners when stopped', () => {
    const textInput = new WebTextInput();
    const onTextInput = jest.fn();
    textInput.subscribe({ onTextInput });
    textInput.startListener();
    const input = getHiddenInput();
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: '' }));
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('paste', { cancelable: true }));
    expect(onTextInput).not.toHaveBeenCalled();

    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'end text' }));
    expect(onTextInput).toHaveBeenLastCalledWith({ kind: TextInputKind.Text, text: 'end text' });
    textInput.stopListener();
    onTextInput.mockClear();
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'detached' }));
    expect(onTextInput).not.toHaveBeenCalled();
  });

  it('handles optional chaining branches when no subscribers are attached and text is empty', () => {
    const textInput = new WebTextInput();
    // Do not subscribe any handlers!
    textInput.startListener();
    const input = getHiddenInput();

    // Composition events are safe without a subscriber.
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'some data' }));

    // Trigger handleComposingKeydown when NOT composing (hits !this.isComposing return)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.ArrowLeft }));

    // Exercise composition caret updates without a subscriber.
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'hello' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.Home }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: KeyboardKey.ArrowRight }));

    // Clear composition without committing text.
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '' }));

    // Commit composition without a subscriber.
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'not empty' }));

    // Empty input is not forwarded.
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Text input is safe without a subscriber.
    input.value = 'not empty';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Empty paste is not forwarded.
    const paste1 = createClipboardEvent('paste', '');
    input.dispatchEvent(paste1);

    // Paste is safe without a subscriber.
    const paste2 = createClipboardEvent('paste', 'not empty');
    input.dispatchEvent(paste2);

    // Trigger handleCut with no onDelete attached
    const cut = createClipboardEvent('cut', '');
    input.dispatchEvent(cut);

    // Trigger handleInput when isComposing is true
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.dispatchEvent(new Event('input', { bubbles: true }));

    textInput.stopListener();
  });
});
