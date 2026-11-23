import { LocalActionCommand, SheetCommandBus, SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { GetSelection, GetSelections } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery, CommitCellEditCommand } from '@searsuite/sear-plugin-cell-editor';
import { ClearRangeStylesCommand } from '@searsuite/sear-plugin-clear-style';
import { bindWebClearStyle } from '../src/WebClearStyleBinding';

it('supports button and scoped Ctrl/Cmd+Backslash, commits active editing and releases remounted listeners', () => {
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const apply = jest.fn();
  const commit = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => undefined,
  });
  commands.register(
    ClearRangeStylesCommand,
    (input) => new LocalActionCommand(ClearRangeStylesCommand.id, () => apply(input)),
  );
  commands.register(CommitCellEditCommand, () => new LocalActionCommand(CommitCellEditCommand.id, commit));
  let editing = false;
  commit.mockImplementation(() => {
    editing = false;
  });
  queries.register(IsCellEditingQuery, () => editing);
  queries.register(GetSelection, () => ({ start: [0, 0] as const, end: [1, 1] as const }));
  const surface = document.createElement('div');
  const button = document.createElement('button');
  document.body.append(surface, button);
  const dispose = bindWebClearStyle(button, surface, new BrowserPlatform(), commands, queries);
  button.click();
  expect(apply).toHaveBeenCalledWith({ anchor: [0, 0], focus: [1, 1] });
  expect(commit).not.toHaveBeenCalled();
  editing = true;
  surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  surface.dispatchEvent(new KeyboardEvent('keydown', { key: '\\', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(apply).toHaveBeenCalledTimes(2);
  expect(commit).toHaveBeenCalledTimes(1);
  const field = document.createElement('input');
  document.body.append(field);
  field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backslash', metaKey: true, bubbles: true }));
  expect(apply).toHaveBeenCalledTimes(2);
  dispose();
  dispose();
  button.click();
  expect(apply).toHaveBeenCalledTimes(2);
  const again = bindWebClearStyle(button, surface, new BrowserPlatform(), commands, queries);
  button.click();
  expect(apply).toHaveBeenCalledTimes(3);
  again();
  surface.remove();
  button.remove();
  field.remove();
});

it('clears every non-contiguous selection with one command', () => {
  const commands = new SheetCommandBus();
  const queries = new SheetQueryRegistry();
  const apply = jest.fn();
  commands.bind({
    executePipeline: (pipeline) => pipeline.steps.forEach((step) => step.localAction?.()),
    applyEffect: () => undefined,
  });
  commands.register(
    ClearRangeStylesCommand,
    (input) => new LocalActionCommand(ClearRangeStylesCommand.id, () => apply(input)),
  );
  queries.register(GetSelection, () => ({ start: [19, 3] as const, end: [19, 3] as const }));
  queries.register(GetSelections, () => [
    { start: [19, 1] as const, end: [19, 1] as const },
    { start: [19, 3] as const, end: [19, 3] as const },
  ]);
  const surface = document.createElement('div');
  const button = document.createElement('button');
  document.body.append(surface, button);
  const dispose = bindWebClearStyle(button, surface, new BrowserPlatform(), commands, queries);
  button.click();
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith({
    ranges: [
      { anchor: [19, 1], focus: [19, 1] },
      { anchor: [19, 3], focus: [19, 3] },
    ],
  });
  dispose();
  surface.remove();
  button.remove();
});
