import { KeyboardKey } from '@searsuite/sear-foundation-keymap';

import { WebKeyboardRouter } from '../../src';

function dispatchKey(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('WebKeyboardRouter', () => {
  it('R2-010 treats End as a one-shot data-boundary modifier for the next arrow', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onArrowDown = jest.fn();
    router.subscribe({ onArrowDown });
    router.startListener();
    try {
      expect(dispatchKey(target, { key: 'End' }).defaultPrevented).toBe(true);
      dispatchKey(target, { key: KeyboardKey.ArrowDown });
      dispatchKey(target, { key: KeyboardKey.ArrowDown });
      expect(onArrowDown.mock.calls).toEqual([[false, true], [false, false]]);
      dispatchKey(target, { key: 'End' });
      dispatchKey(target, { key: 'Enter' });
      dispatchKey(target, { key: KeyboardKey.ArrowDown });
      expect(onArrowDown).toHaveBeenLastCalledWith(false, false);
    } finally {
      router.stopListener();
    }
  });

  it('keeps End followed by an arrow as text navigation while editing', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onLineEnd = jest.fn();
    const onArrowLeft = jest.fn();
    router.subscribe({ onLineEnd, onArrowLeft });
    router.startListener();
    try {
      dispatchKey(target, { key: 'End' });
      dispatchKey(target, { key: KeyboardKey.ArrowLeft });
      expect(onLineEnd).toHaveBeenCalledWith(false);
      expect(onArrowLeft).toHaveBeenCalledWith(false, false, false);
    } finally {
      router.stopListener();
    }
  });

  it('BUG-910 routes static date and time shortcuts from the grid', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const router = new WebKeyboardRouter(target);
    const onInsertCurrentDate = jest.fn(() => true);
    const onInsertCurrentTime = jest.fn(() => true);
    router.subscribe({ onInsertCurrentDate, onInsertCurrentTime });
    router.startListener();
    try {
      expect(dispatchKey(target, { key: ';', ctrlKey: true }).defaultPrevented).toBe(true);
      expect(dispatchKey(target, { key: ';', metaKey: true }).defaultPrevented).toBe(true);
      expect(onInsertCurrentDate).toHaveBeenCalledTimes(1);
      expect(onInsertCurrentTime).toHaveBeenCalledTimes(1);
      const input = document.createElement('input');
      target.append(input);
      expect(dispatchKey(input, { key: ';', ctrlKey: true }).defaultPrevented).toBe(false);
      expect(onInsertCurrentDate).toHaveBeenCalledTimes(1);
    } finally {
      router.stopListener();
      target.remove();
    }
  });

  it('BUG-894 routes fill shortcuts only from the grid', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const router = new WebKeyboardRouter(target);
    const onFillDown = jest.fn();
    const onFillRight = jest.fn();
    router.subscribe({ onFillDown, onFillRight });
    router.startListener();
    try {
      expect(dispatchKey(target, { key: 'd', metaKey: true }).defaultPrevented).toBe(true);
      expect(dispatchKey(target, { key: 'd', ctrlKey: true }).defaultPrevented).toBe(true);
      expect(dispatchKey(target, { key: 'r', metaKey: true }).defaultPrevented).toBe(true);
      expect(onFillDown).toHaveBeenCalledTimes(2);
      expect(onFillRight).toHaveBeenCalledTimes(1);
      const input = document.createElement('input');
      target.append(input);
      expect(dispatchKey(input, { key: 'd', metaKey: true }).defaultPrevented).toBe(false);
      expect(onFillDown).toHaveBeenCalledTimes(2);
    } finally {
      router.stopListener();
      target.remove();
    }
  });

  it('BUG-911 routes Control+Quote to copy the formula above', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onCopyFormulaAbove = jest.fn();
    router.subscribe({ onCopyFormulaAbove });
    router.startListener();
    try {
      expect(dispatchKey(target, { key: "'", code: 'Quote', ctrlKey: true }).defaultPrevented).toBe(true);
      expect(dispatchKey(target, { key: "'", ctrlKey: true }).defaultPrevented).toBe(true);
      expect(onCopyFormulaAbove).toHaveBeenCalledTimes(2);
      expect(dispatchKey(target, { key: "'", code: 'Quote', metaKey: true }).defaultPrevented).toBe(false);
      const input = document.createElement('input');
      target.append(input);
      expect(dispatchKey(input, { key: "'", code: 'Quote', ctrlKey: true }).defaultPrevented).toBe(false);
      expect(onCopyFormulaAbove).toHaveBeenCalledTimes(2);
    } finally {
      router.stopListener();
      target.remove();
    }
  });

  it('restores grid undo after an editing handler is released', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const gridUndo = jest.fn();
    const editUndo = jest.fn();
    router.subscribe({ onUndo: gridUndo });
    const disposeEdit = router.subscribe({ onUndo: editUndo });
    router.startListener();
    dispatchKey(target, { key: 'z', metaKey: true });
    expect(editUndo).toHaveBeenCalledTimes(1);
    disposeEdit();
    disposeEdit();
    dispatchKey(target, { key: 'z', metaKey: true });
    expect(gridUndo).toHaveBeenCalledTimes(1);
    router.stopListener();
  });

  it('routes F4 as a reference action only while editing', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onToggleReference = jest.fn();
    router.subscribe({ onToggleReference });
    router.startListener();
    expect(dispatchKey(target, { key: KeyboardKey.ToggleReference }).defaultPrevented).toBe(true);
    expect(onToggleReference).toHaveBeenCalledTimes(1);
    dispatchKey(target, { key: KeyboardKey.ToggleReference, ctrlKey: true });
    expect(onToggleReference).toHaveBeenCalledTimes(1);
    router.stopListener();
    dispatchKey(target, { key: KeyboardKey.ToggleReference });
    expect(onToggleReference).toHaveBeenCalledTimes(1);
  });

  it('routes editor actions only while listening and prevents their browser defaults', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onDelete = jest.fn();
    const onEnter = jest.fn();
    const onArrowLeft = jest.fn();
    router.subscribe({ onDelete, onEnter, onArrowLeft });

    dispatchKey(target, { key: KeyboardKey.Delete });
    expect(onDelete).not.toHaveBeenCalled();

    router.startListener();
    const deleteEvent = dispatchKey(target, { key: KeyboardKey.Delete });
    const enterEvent = dispatchKey(target, { key: KeyboardKey.Enter });
    const arrowEvent = dispatchKey(target, {
      key: KeyboardKey.ArrowLeft,
      shiftKey: true,
      metaKey: true,
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onArrowLeft).toHaveBeenCalledWith(true, true, false);
    expect(deleteEvent.defaultPrevented).toBe(true);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(arrowEvent.defaultPrevented).toBe(true);

    router.stopListener();
    dispatchKey(target, { key: KeyboardKey.Delete });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('routes F2 and preserves the Shift modifier on Enter', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onEdit = jest.fn();
    const onEnter = jest.fn();
    router.subscribe({ onEdit, onEnter });
    router.startListener();
    expect(dispatchKey(target, { key: 'F2' }).defaultPrevented).toBe(true);
    expect(dispatchKey(target, { key: KeyboardKey.Enter, shiftKey: true }).defaultPrevented).toBe(true);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith(true, false);
    router.stopListener();
  });

  it('routes Home and row/column selection shortcuts', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onHome = jest.fn();
    const onEnd = jest.fn();
    const onPage = jest.fn();
    const onSelectRow = jest.fn();
    const onSelectColumn = jest.fn();
    router.subscribe({ onHome, onEnd, onPage, onSelectRow, onSelectColumn });
    router.startListener();
    dispatchKey(target, { key: KeyboardKey.Home });
    dispatchKey(target, { key: KeyboardKey.Home, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Home, shiftKey: true });
    dispatchKey(target, { key: KeyboardKey.Home, ctrlKey: true, shiftKey: true });
    dispatchKey(target, { key: 'End', ctrlKey: true, shiftKey: true });
    dispatchKey(target, { key: 'PageDown', shiftKey: true });
    dispatchKey(target, { key: 'PageUp', shiftKey: true });
    dispatchKey(target, { key: ' ', code: 'Space', shiftKey: true });
    dispatchKey(target, { key: ' ', code: 'Space', ctrlKey: true });
    expect(onHome.mock.calls).toEqual([
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ]);
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(onPage.mock.calls).toEqual([
      [1, true],
      [-1, true],
    ]);
    expect(onSelectRow).toHaveBeenCalledTimes(1);
    expect(onSelectColumn).toHaveBeenCalledTimes(1);
    router.stopListener();
  });

  it('routes zoom, selection, and bold shortcuts', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onZoomIn = jest.fn();
    const onZoomOut = jest.fn();
    const onZoomReset = jest.fn();
    const onSelectAll = jest.fn();
    const onToggleBold = jest.fn();
    const onToggleItalic = jest.fn();
    const onToggleUnderline = jest.fn();
    const onToggleStrikethrough = jest.fn();
    router.subscribe({
      onZoomIn,
      onZoomOut,
      onZoomReset,
      onSelectAll,
      onToggleBold,
      onToggleItalic,
      onToggleUnderline,
      onToggleStrikethrough,
    });
    router.startListener();

    expect(dispatchKey(target, { key: KeyboardKey.Plus, ctrlKey: true }).defaultPrevented).toBe(true);
    dispatchKey(target, { key: KeyboardKey.Minus, metaKey: true });
    dispatchKey(target, { key: KeyboardKey.Zero, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.SelectAll, ctrlKey: true });
    dispatchKey(target, { key: 'A', metaKey: true });
    const bold = dispatchKey(target, { key: 'B', metaKey: true });
    const italic = dispatchKey(target, { key: KeyboardKey.Italic, ctrlKey: true });
    const underline = dispatchKey(target, { key: KeyboardKey.Underline, metaKey: true });
    const strikethrough = dispatchKey(target, { key: KeyboardKey.Strikethrough, ctrlKey: true, shiftKey: true });
    const shiftedZoom = dispatchKey(target, {
      key: KeyboardKey.Plus,
      ctrlKey: true,
      shiftKey: true,
    });

    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onZoomReset).toHaveBeenCalledTimes(1);
    expect(onSelectAll).toHaveBeenCalledTimes(2);
    expect(onToggleBold).toHaveBeenCalledTimes(1);
    expect(onToggleItalic).toHaveBeenCalledTimes(1);
    expect(onToggleUnderline).toHaveBeenCalledTimes(1);
    expect(onToggleStrikethrough).toHaveBeenCalledTimes(1);
    expect(bold.defaultPrevented).toBe(true);
    expect(italic.defaultPrevented).toBe(true);
    expect(underline.defaultPrevented).toBe(true);
    expect(strikethrough.defaultPrevented).toBe(true);
    expect(shiftedZoom.defaultPrevented).toBe(false);
  });

  it('routes primary minus to cell deletion when a sheet handler is installed', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onDeleteCells = jest.fn();
    const onZoomOut = jest.fn();
    router.subscribe({ onZoomOut });
    const disposeDelete = router.subscribe({ onDeleteCells });
    router.startListener();

    expect(dispatchKey(target, { key: KeyboardKey.Minus, metaKey: true }).defaultPrevented).toBe(true);
    expect(onDeleteCells).toHaveBeenCalledTimes(1);
    expect(onZoomOut).not.toHaveBeenCalled();

    disposeDelete?.();
    dispatchKey(target, { key: KeyboardKey.Minus, metaKey: true });
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('routes undo and redo shortcuts through semantic handlers', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    router.subscribe({ onUndo, onRedo });
    router.startListener();

    const undo = dispatchKey(target, { key: 'Z', ctrlKey: true });
    const shiftedRedo = dispatchKey(target, { key: KeyboardKey.Undo, metaKey: true, shiftKey: true });
    const windowsRedo = dispatchKey(target, { key: KeyboardKey.Redo, ctrlKey: true });
    const altModified = dispatchKey(target, { key: KeyboardKey.Undo, ctrlKey: true, altKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(undo.defaultPrevented).toBe(true);
    expect(shiftedRedo.defaultPrevented).toBe(true);
    expect(windowsRedo.defaultPrevented).toBe(true);
    expect(altModified.defaultPrevented).toBe(false);
  });

  it('routes soft enter, escape, and arrow keys properly', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onEscape = jest.fn();
    const onSoftEnter = jest.fn();
    const onArrowRight = jest.fn();
    const onArrowUp = jest.fn();
    const onArrowDown = jest.fn();

    router.subscribe({ onEscape, onSoftEnter, onArrowRight, onArrowUp, onArrowDown });
    router.startListener();

    dispatchKey(target, { key: KeyboardKey.Escape });
    expect(onEscape).toHaveBeenCalledTimes(1);

    dispatchKey(target, { key: KeyboardKey.Enter, altKey: true });
    expect(onSoftEnter).toHaveBeenCalledTimes(1);

    dispatchKey(target, { key: KeyboardKey.ArrowRight, shiftKey: true, metaKey: true });
    expect(onArrowRight).toHaveBeenCalledWith(true, true, false);

    dispatchKey(target, { key: KeyboardKey.ArrowUp, shiftKey: false, metaKey: false });
    expect(onArrowUp).toHaveBeenCalledWith(false, false);

    dispatchKey(target, { key: KeyboardKey.ArrowDown, shiftKey: true, metaKey: false });
    expect(onArrowDown).toHaveBeenCalledWith(true, false);
    // Ignore when composing
    const composingEvent = dispatchKey(target, { key: KeyboardKey.ArrowRight, isComposing: true });
    expect(onArrowRight).toHaveBeenCalledTimes(1); // not incremented
  });

  it('routes clipboard shortcuts and Tab navigation', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);
    const onCopy = jest.fn();
    const onCut = jest.fn();
    const onPaste = jest.fn();
    const onTab = jest.fn();
    router.subscribe({ onCopy, onCut, onPaste, onTab });
    router.startListener();

    const copy = dispatchKey(target, { key: 'c', ctrlKey: true });
    const cut = dispatchKey(target, { key: 'X', metaKey: true });
    const paste = dispatchKey(target, { key: 'v', ctrlKey: true });
    const tab = dispatchKey(target, { key: KeyboardKey.Tab, shiftKey: true });

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCut).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onTab).toHaveBeenCalledWith(true);
    expect(copy.defaultPrevented).toBe(true);
    expect(cut.defaultPrevented).toBe(true);
    expect(paste.defaultPrevented).toBe(true);
    expect(tab.defaultPrevented).toBe(true);
  });

  it('handles duplicate startListener calls, optional subscribers, and composing state returns', () => {
    const target = document.createElement('div');
    const router = new WebKeyboardRouter(target);

    // Call startListener twice to cover `if (this.isListening) return;`
    router.startListener();
    router.startListener();

    // Dispatch events without subscribers to cover `this.onZoomIn?.()` etc.
    dispatchKey(target, { key: KeyboardKey.Plus, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Equal, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Minus, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Hyphen, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Zero, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Backspace });
    dispatchKey(target, { key: KeyboardKey.Enter });
    dispatchKey(target, { key: KeyboardKey.Enter, altKey: true });
    dispatchKey(target, { key: KeyboardKey.Escape });
    dispatchKey(target, { key: KeyboardKey.ArrowLeft });
    dispatchKey(target, { key: KeyboardKey.ArrowRight });
    dispatchKey(target, { key: KeyboardKey.ArrowUp });
    dispatchKey(target, { key: KeyboardKey.ArrowDown });
    dispatchKey(target, { key: KeyboardKey.SelectAll, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Undo, ctrlKey: true });
    dispatchKey(target, { key: KeyboardKey.Redo, ctrlKey: true });
    // Test early returns for composing events
    const composingEvents = [
      KeyboardKey.Backspace,
      KeyboardKey.Enter,
      KeyboardKey.Escape,
      KeyboardKey.ArrowLeft,
      KeyboardKey.ArrowRight,
      KeyboardKey.ArrowUp,
      KeyboardKey.ArrowDown,
    ];
    for (const key of composingEvents) {
      const ev = dispatchKey(target, { key, isComposing: true });
      expect(ev.defaultPrevented).toBe(false); // returned early so preventDefault wasn't called
    }
  });
});

it('leaves native host inputs and prevented keys alone while retaining the editor input route', () => {
  const target = document.createElement('div');
  document.body.append(target);
  const router = new WebKeyboardRouter(target);
  const onDelete = jest.fn(),
    onEscape = jest.fn(),
    onSelectAll = jest.fn();
  const onTab = jest.fn();
  const onEnter = jest.fn();
  router.subscribe({ onDelete, onEscape, onSelectAll, onTab, onEnter });
  router.startListener();
  try {
    for (const tag of ['input', 'textarea', 'select', 'button', 'div']) {
      const control = document.createElement(tag);
      if (tag === 'div') control.setAttribute('contenteditable', 'true');
      target.append(control);
      for (const init of [
        { key: 'Backspace' },
        { key: 'Escape' },
        { key: 'a', ctrlKey: true },
        { key: 'Tab' },
        { key: 'Enter' },
      ]) {
        const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
        control.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
      control.remove();
    }
    expect(onDelete).not.toHaveBeenCalled();
    expect(onTab).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
    expect(onSelectAll).not.toHaveBeenCalled();
    const prevented = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    prevented.preventDefault();
    target.dispatchEvent(prevented);
    expect(onDelete).not.toHaveBeenCalled();
    const editorInput = document.createElement('input');
    editorInput.id = 'searTextInput';
    target.append(editorInput);
    editorInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  } finally {
    router.stopListener();
    target.remove();
  }
});

it('BUG-122 leaves Tab in a modal select while retaining grid Tab after the dialog closes', () => {
  const target = document.createElement('div');
  document.body.append(target);
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const kind = document.createElement('select');
  const condition = document.createElement('select');
  dialog.append(kind, condition);
  target.append(dialog);
  const onTab = jest.fn();
  const router = new WebKeyboardRouter(target);
  router.subscribe({ onTab });
  router.startListener();
  try {
    kind.focus();
    const event = dispatchKey(kind, { key: 'Tab' });
    expect(event.defaultPrevented).toBe(false);
    expect(onTab).not.toHaveBeenCalled();
    dialog.remove();
    dispatchKey(target, { key: 'Tab' });
    expect(onTab).toHaveBeenCalledWith(false);
  } finally {
    router.stopListener();
    target.remove();
  }
});

it('routes an unhandled host Escape only while its subscriber is active', () => {
  const target = document.createElement('div');
  document.body.append(target);
  const button = document.createElement('button');
  target.append(button);
  const router = new WebKeyboardRouter(target);
  const onGridEscape = jest.fn();
  const onUnhandledEscape = jest.fn();
  router.subscribe({ onEscape: onGridEscape });
  const dispose = router.subscribe({ onUnhandledEscape });
  router.startListener();
  try {
    expect(dispatchKey(button, { key: KeyboardKey.Escape }).defaultPrevented).toBe(true);
    expect(onUnhandledEscape).toHaveBeenCalledTimes(1);
    expect(onGridEscape).not.toHaveBeenCalled();

    const handled = new KeyboardEvent('keydown', { key: KeyboardKey.Escape, bubbles: true, cancelable: true });
    button.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
    button.dispatchEvent(handled);
    expect(onUnhandledEscape).toHaveBeenCalledTimes(1);

    dispatchKey(target, { key: KeyboardKey.Escape });
    expect(onGridEscape).toHaveBeenCalledTimes(1);
    expect(onUnhandledEscape).toHaveBeenCalledTimes(1);

    dispose();
    expect(dispatchKey(button, { key: KeyboardKey.Escape }).defaultPrevented).toBe(false);
    expect(onUnhandledEscape).toHaveBeenCalledTimes(1);
  } finally {
    router.stopListener();
    target.remove();
  }
});
