import { type SheetCommandBus, type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { GetSelection, GetSelections } from '@searsuite/sear-plugin-selection';
import { CommitCellEditCommand, IsCellEditingQuery } from '@searsuite/sear-plugin-cell-editor';
import { ClearRangeStylesCommand } from '@searsuite/sear-plugin-clear-style';

/** One-shot host action and scoped Ctrl/Cmd+Backslash binding for the active editor. */
export function bindWebClearStyle(
  button: HTMLButtonElement,
  surface: unknown,
  platform: Platform,
  commands: SheetCommandBus,
  queries: SheetQueryRegistry,
): () => void {
  button.disabled = false;
  button.classList.remove('disabled');
  button.title = 'Clear formatting (Ctrl / Cmd + \\)';
  button.setAttribute('aria-label', 'Clear formatting');
  let ownsFocus = false;
  const toolbar = button.closest('.sear-toolbar') ?? button;
  const clear = () => {
    if (queries.has(IsCellEditingQuery) && queries.run(IsCellEditingQuery, void 0)) {
      if (!commands.has(CommitCellEditCommand)) return;
      commands.run(CommitCellEditCommand, void 0);
      if (queries.run(IsCellEditingQuery, void 0)) return;
    }
    const ranges = queries.has(GetSelections)
      ? queries.run(GetSelections, void 0)
      : [queries.run(GetSelection, void 0)].filter((range) => range !== null);
    if (ranges.length === 1) {
      commands.run(ClearRangeStylesCommand, { anchor: ranges[0].start, focus: ranges[0].end });
    } else if (ranges.length > 1) {
      commands.run(ClearRangeStylesCommand, {
        ranges: ranges.map((range) => ({ anchor: range.start, focus: range.end })),
      });
    }
  };
  const disposers = [
    platform.addEventListener(
      document,
      'mousedown',
      (event) => {
        const target = (event as MouseEvent).target;
        ownsFocus =
          target instanceof Node && (toolbar.contains(target) || (surface instanceof Node && surface.contains(target)));
      },
      { capture: true },
    ),
    platform.addEventListener(button, 'click', (event) => {
      (event as MouseEvent).stopPropagation();
      clear();
    }),
    platform.addEventListener(
      document,
      'keydown',
      (event) => {
        const key = event as KeyboardEvent;
        if (key.defaultPrevented || !ownsFocus) return;
        if (
          !(key.ctrlKey || key.metaKey) ||
          key.shiftKey ||
          key.altKey ||
          (key.code !== 'Backslash' && key.key !== '\\')
        )
          return;
        const target = key.target;
        // Host search/dialog fields retain their own shortcuts.
        if (
          target instanceof Element &&
          target.closest('input,textarea,[contenteditable="true"]') &&
          target.id !== 'searTextInput' &&
          !(surface instanceof Element && surface.contains(target))
        )
          return;
        if (!queries.run(GetSelection, void 0)) return;
        key.preventDefault();
        key.stopPropagation();
        clear();
      },
      { capture: true },
    ),
  ];
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    disposers.reverse().forEach((dispose) => dispose());
  };
}
