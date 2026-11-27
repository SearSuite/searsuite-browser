import { IsCellEditingQuery, CommitCellEditCommand } from '@searsuite/sear-plugin-cell-editor';
import { LocalActionCommand } from '@searsuite/sear-assembly-commands';
import { SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { SheetFormatTransferRegistry } from '@searsuite/sear-assembly-plugin';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { ObservationRegistry } from '@searsuite/sear-foundation-subscription';
import { GetSelection } from '@searsuite/sear-plugin-selection';
import {
  FormatPainterMode,
  FormatPainterObservation,
  SheetFormatPainterPlugin,
} from '@searsuite/sear-plugin-format-painter';
import { bindWebFormatPainter } from '../src/WebFormatPainterBinding';

it('binds single use, continuous painting, Escape, drag completion and teardown', async () => {
  const platform = new BrowserPlatform();
  const formats = new SheetFormatTransferRegistry();
  const plan = jest.fn(() => []);
  formats.register({ id: 'third-party', capture: () => ({ plan }) });
  const observations = new ObservationRegistry();
  // Use one plugin instance for commands and observations.
  const plugin = new SheetFormatPainterPlugin({ formats, platform, readShape: () => [20, 20] });
  const bus = new SheetCommandBus(platform);
  bus.bind({
    executePipeline: (pipeline) => {
      pipeline.steps.forEach((step) => step.localAction?.());
      pipeline.emitComplete();
    },
    applyEffect: () => undefined,
  });
  plugin.registerCommands(bus);
  plugin.registerObservations(observations);
  const queries = new SheetQueryRegistry();
  let selection = { start: [0, 0] as [number, number], end: [0, 0] as [number, number] };
  queries.register(GetSelection, () => selection);
  let editing = false;
  const commit = jest.fn(() => {
    editing = false;
  });
  queries.register(IsCellEditingQuery, () => editing);
  bus.register(CommitCellEditCommand, () => new LocalActionCommand(CommitCellEditCommand.id, commit));
  const button = document.createElement('button');
  const surface = document.createElement('div');
  document.body.append(button, surface);
  const dispose = bindWebFormatPainter(button, surface, platform, bus, queries, observations);
  const click = (detail = 1) => button.dispatchEvent(new MouseEvent('click', { detail }));
  click();
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(commit).not.toHaveBeenCalled();
  expect(button.classList.contains('wd3-toolbar-item-active')).toBe(true);
  surface.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
  selection = { start: [2, 2], end: [3, 4] };
  expect(plan).not.toHaveBeenCalled();
  document.dispatchEvent(new MouseEvent('mouseup'));
  await Promise.resolve();
  expect(plan).toHaveBeenLastCalledWith(selection);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  editing = true;
  click(1);
  expect(commit).toHaveBeenCalledTimes(1);
  click(2);
  button.dispatchEvent(new MouseEvent('dblclick'));
  expect(observations.getSnapshot(FormatPainterObservation).mode).toBe(FormatPainterMode.Persistent);
  surface.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
  document.dispatchEvent(new MouseEvent('mouseup'));
  await Promise.resolve();
  expect(observations.getSnapshot(FormatPainterObservation).mode).toBe(FormatPainterMode.Persistent);
  surface.addEventListener('keydown', (event) => event.stopPropagation());
  surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(button.getAttribute('aria-pressed')).toBe('false');
  click();
  surface.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
  document.dispatchEvent(new MouseEvent('mouseup'));
  const calls = plan.mock.calls.length;
  dispose();
  dispose();
  await Promise.resolve();
  expect(plan).toHaveBeenCalledTimes(calls);
  expect(surface.style.cursor).toBe('');
  button.remove();
  surface.remove();
});
