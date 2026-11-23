import { CommitCellEditCommand, IsCellEditingQuery } from '@searsuite/sear-plugin-cell-editor';
import { type SheetCommandBus, type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { type ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { GetSelection } from '@searsuite/sear-plugin-selection';
import {
  ApplyFormatPainterCommand,
  CancelFormatPainterCommand,
  FormatPainterMode,
  FormatPainterObservation,
  StartFormatPainterCommand,
  type FormatPainterState,
} from '@searsuite/sear-plugin-format-painter';

/** Host-only pointer/key binding; plugin commands own all format behavior. */
export function bindWebFormatPainter(
  button: HTMLButtonElement,
  surface: unknown,
  platform: Platform,
  commands: SheetCommandBus,
  queries: SheetQueryRegistry,
  observations: ObservationRegistry,
): () => void {
  let state: FormatPainterState = { mode: null, source: null };
  let pressed = false;
  let disposed = false;
  button.disabled = false;
  button.classList.remove('disabled');
  button.title = 'Format painter (double-click to reuse, Esc to cancel)';
  button.setAttribute('aria-label', 'Format painter');
  const update = (value: FormatPainterState) => {
    state = value;
    button.setAttribute('aria-pressed', String(value.mode !== null));
    button.classList.toggle('wd3-toolbar-item-active', value.mode !== null);
  };
  update(observations.getSnapshot(FormatPainterObservation));
  const activate = (mode: FormatPainterMode) => {
    if (
      queries.has(IsCellEditingQuery) &&
      queries.run(IsCellEditingQuery, void 0) &&
      commands.has(CommitCellEditCommand)
    ) {
      commands.run(CommitCellEditCommand, void 0);
    }
    const source = queries.run(GetSelection, void 0);
    if (source) commands.run(StartFormatPainterCommand, { source, mode });
  };
  const disposers = [
    observations.subscribe(FormatPainterObservation, update),
    platform.addEventListener(button, 'click', (event) => {
      const click = event as MouseEvent;
      click.stopPropagation();
      if (click.detail > 1) return;
      if (state.mode) commands.run(CancelFormatPainterCommand, void 0);
      else activate(FormatPainterMode.Once);
    }),
    platform.addEventListener(button, 'dblclick', (event) => {
      (event as MouseEvent).stopPropagation();
      activate(FormatPainterMode.Persistent);
    }),
    platform.addEventListener(surface, 'mousedown', (event) => {
      pressed = state.mode !== null && (event as MouseEvent).button === 0;
    }),
    platform.addEventListener(
      document,
      'mouseup',
      () => {
        if (!pressed) return;
        pressed = false;
        // Let the editor finish its pointer selection before querying the destination.
        platform.queueMicrotask(() => {
          if (disposed || !state.mode) return;
          const destination = queries.run(GetSelection, void 0);
          if (destination) commands.run(ApplyFormatPainterCommand, { destination });
        });
      },
      { capture: true },
    ),
    platform.addEventListener(
      document,
      'keydown',
      (event) => {
        if ((event as KeyboardEvent).key === 'Escape' && state.mode) {
          pressed = false;
          commands.run(CancelFormatPainterCommand, void 0);
          (event as KeyboardEvent).preventDefault();
          (event as KeyboardEvent).stopPropagation();
        }
      },
      { capture: true },
    ),
  ];
  return () => {
    if (disposed) return;
    disposed = true;
    disposers.reverse().forEach((dispose) => dispose());
  };
}
