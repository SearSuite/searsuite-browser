import {
  CommandExecutionPhase, type SheetCommandBus, type SheetCommandEvent, type SheetQueryRegistry,
} from '@searsuite/sear-assembly-commands';
import {
  FindSheetMatchPageQuery, ReadSheetFindRevisionQuery,
  ReplaceAllSheetMatchesCommand, ReplaceSheetMatchCommand,
  SheetFindContent, SheetFindOrder, type SheetFindMatch, type SheetFindPageInput,
} from '@searsuite/sear-plugin-find-replace';
import { SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { BrowserPlatform } from '@searsuite/sear-browser-adapters';
import { WebSheetFindReplaceDialog } from '../src/WebSheetFindReplaceDialog';

const matches: SheetFindMatch[] = [
  { row: 0, column: 0, start: 0, end: 3, text: 'foo foo' },
  { row: 0, column: 0, start: 4, end: 7, text: 'foo foo' },
  { row: 2, column: 1, start: 0, end: 3, text: 'foo' },
];

function createDialog(results: readonly SheetFindMatch[] = matches, selection: () => {
  readonly anchor: [number, number]; readonly focus: [number, number];
} | null = () => ({ anchor: [0, 0], focus: [3, 2] }), focusGrid = jest.fn()) {
  const run = jest.fn();
  const has = jest.fn(() => true);
  let commandListener: ((event: SheetCommandEvent) => void) | null = null;
  const subscribe = jest.fn((listener: (event: SheetCommandEvent) => void) => {
    commandListener = listener;
    return () => { commandListener = null; };
  });
  const query = jest.fn((definition: { id: string }, input?: SheetFindPageInput) => {
    if (definition === ReadSheetFindRevisionQuery) return 0 as number;
    const limit = input!.limit;
    const cursorIndex = input?.cursor
      ? results.findIndex((match) => match.row === input.cursor!.row &&
        match.column === input.cursor!.column && match.start === input.cursor!.start)
      : -1;
    const startIndex = input?.backward
      ? Math.max(0, (cursorIndex < 0 ? results.length : cursorIndex) - limit)
      : cursorIndex + 1;
    const endIndex = input?.backward ? (cursorIndex < 0 ? results.length : cursorIndex) : startIndex + limit;
    return { matches: results.slice(startIndex, endIndex), startIndex, total: results.length, revision: 0 };
  });
  const commands = { run, has, subscribe } as unknown as SheetCommandBus;
  const queries = { run: query } as unknown as SheetQueryRegistry;
  const platform = new BrowserPlatform();
  const addEventListener = jest.spyOn(platform, 'addEventListener');
  const dialog = new WebSheetFindReplaceDialog(commands, queries, selection, platform, focusGrid);
  dialog.open();
  const root = document.querySelector<HTMLElement>('.sear-find-replace')!;
  const field = (name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${name}"]`)!;
  const action = (name: string) => root.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
  return {
    dialog, root, field, action, run, query, addEventListener, focusGrid, subscribe,
    notifyCommand: (event: SheetCommandEvent) => commandListener?.(event),
  };
}

afterEach(() => {
  document.querySelector('.sear-find-replace')?.remove();
  document.querySelectorAll('style').forEach((style) => {
    if (style.textContent?.includes('.sear-find-replace{')) style.remove();
  });
});

describe('WebSheetFindReplaceDialog', () => {
  it('searches, navigates, replaces one match, and replaces all through typed commands', () => {
    const { dialog, root, field, action, run, query } = createDialog();
    dialog.open();
    field('find').value = 'foo';
    action('find').click();
    expect(query).toHaveBeenCalledWith(FindSheetMatchPageQuery, expect.objectContaining({ text: 'foo', limit: 200 }));
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('1 / 3');
    expect(run).toHaveBeenCalledWith(SelectRangeCommand, expect.objectContaining({ anchor: [0, 0] }));
    const currentResult = () => Array.from(root.querySelectorAll<HTMLButtonElement>('[data-result][aria-current="true"]'))
      .map((button) => Number(button.dataset['result']));
    expect(currentResult()).toEqual([0]);

    action('next').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('2 / 3');
    expect(currentResult()).toEqual([1]);
    action('previous').click();
    expect(currentResult()).toEqual([0]);
    root.querySelectorAll<HTMLButtonElement>('[data-result]')[2].click();
    expect(currentResult()).toEqual([2]);
    expect(run).toHaveBeenCalledWith(SelectRangeCommand, expect.objectContaining({ anchor: [2, 1] }));

    action('mode').click();
    field('replacement').value = 'bar';
    action('replace').click();
    expect(run).toHaveBeenCalledWith(ReplaceSheetMatchCommand, expect.objectContaining({
      text: 'foo', replacement: 'bar', match: matches[2],
    }));
    action('replace-all').click();
    expect(run).toHaveBeenCalledWith(ReplaceAllSheetMatchesCommand, expect.objectContaining({
      text: 'foo', replacement: 'bar',
    }));
    action('close').click();
    expect(document.querySelector('.sear-find-replace')).toBeNull();
    dialog.destroy();
  });

  it('BUG-644 distinguishes separate matches within the same cell', () => {
    const { dialog, root, field, action } = createDialog();
    field('find').value = 'foo';
    action('find').click();
    expect(Array.from(root.querySelectorAll<HTMLButtonElement>('[data-result]')).slice(0, 2)
      .map((button) => button.textContent)).toEqual([
      'A1  position 1-3  foo foo',
      'A1  position 5-7  foo foo',
    ]);
    action('next').click();
    expect(root.querySelector('[data-result="1"]')?.getAttribute('aria-current')).toBe('true');
    dialog.destroy();
  });

  it('BUG-646 closes with Escape and restores grid input focus', () => {
    const { dialog, root, field, focusGrid } = createDialog();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    field('find').dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.querySelector('.sear-find-replace')).toBeNull();
    expect(focusGrid).toHaveBeenCalledTimes(1);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(focusGrid).toHaveBeenCalledTimes(1);
    dialog.destroy();
  });

  it('BUG-786 closes with Escape after focus moves outside the panel', () => {
    const { dialog, focusGrid } = createDialog();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    outside.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.querySelector('.sear-find-replace')).toBeNull();
    expect(focusGrid).toHaveBeenCalledTimes(1);
    outside.remove();
    dialog.destroy();
  });

  it('passes advanced search controls and the original selected range to the query', () => {
    const { dialog, root, field, action, query } = createDialog();
    action('advanced').click();
    expect(root.querySelector('.sear-find-replace__advanced')?.hasAttribute('hidden')).toBe(false);
    field('find').value = 'SUM';
    field('scope').value = 'selection';
    field('content').value = SheetFindContent.Formula;
    (field('columns') as HTMLInputElement).checked = true;
    (field('case') as HTMLInputElement).checked = true;
    (field('entire') as HTMLInputElement).checked = true;
    action('find').click();
    expect(query).toHaveBeenCalledWith(FindSheetMatchPageQuery, {
      text: 'SUM', content: SheetFindContent.Formula, order: SheetFindOrder.Columns,
      matchCase: true, entireCell: true, range: { start: [0, 0], end: [3, 2] }, limit: 200,
    });
    action('advanced').click();
    expect(root.querySelector('.sear-find-replace__advanced')?.hasAttribute('hidden')).toBe(true);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-find-replace')).toBeNull();
    dialog.destroy();
  });

  it('BUG-641 rejects current-selection search when no cell is selected', () => {
    const { dialog, root, field, action, run, query } = createDialog(matches, () => null);
    field('find').value = 'foo';
    field('scope').value = 'selection';
    action('find').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('Select cells first.');
    expect(query).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalledWith(SelectRangeCommand, expect.anything());
    expect(root.querySelectorAll('[data-result]')).toHaveLength(0);
    dialog.destroy();
  });

  it('BUG-643 searches the latest user selection while retaining the range after result navigation', () => {
    let selected = { anchor: [0, 1] as [number, number], focus: [0, 1] as [number, number] };
    const { dialog, field, action, query, run } = createDialog(matches, () => selected);
    selected = { anchor: [2, 1], focus: [2, 1] };
    field('find').value = 'foo';
    field('scope').value = 'selection';
    run.mockImplementation((definition, input) => {
      if (definition === SelectRangeCommand) selected = { anchor: input.anchor, focus: input.focus };
    });
    action('find').click();
    expect(query).toHaveBeenCalledWith(FindSheetMatchPageQuery, expect.objectContaining({
      range: { start: [2, 1], end: [2, 1] },
    }));
    action('find').click();
    expect(query).toHaveBeenLastCalledWith(FindSheetMatchPageQuery, expect.objectContaining({
      range: { start: [2, 1], end: [2, 1] },
    }));
    dialog.destroy();
  });

  it('shows an empty state and keeps replacement disabled without matches', () => {
    const { dialog, root, field, action, run } = createDialog([]);
    field('find').value = 'missing';
    field('find').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('No matches found');
    expect(action('previous').disabled).toBe(true);
    action('mode').click();
    expect(action('replace').disabled).toBe(true);
    expect(action('replace-all').disabled).toBe(true);
    action('mode').click();
    expect(action('mode').textContent).toBe('Replace');
    expect(run).not.toHaveBeenCalled();
    dialog.destroy();
  });

  it('reports query failures in the panel', () => {
    const { dialog, root, field, action, query } = createDialog();
    query.mockImplementation(() => { throw new Error('Invalid range'); });
    field('find').value = 'foo';
    action('find').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('Invalid range');
    query.mockImplementation(() => { throw 'unavailable'; });
    action('find').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('Search failed');
    root.click();
    dialog.destroy();
  });

  it('reports replacement failures without closing the panel', () => {
    const { dialog, root, field, action, run } = createDialog();
    field('find').value = 'foo';
    action('find').click();
    action('mode').click();
    run.mockImplementation((definition) => {
      if (definition === ReplaceSheetMatchCommand) throw new Error('Cell is protected');
    });
    action('replace').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('Cell is protected');
    dialog.destroy();
  });

  it('invalidates results when search conditions change', () => {
    const { dialog, root, field, action, run } = createDialog();
    field('find').value = 'foo';
    action('find').click();
    field('find').value = 'bar';
    field('find').dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('');
    expect(action('next').disabled).toBe(true);
    action('mode').click();
    field('find').value = 'foo';
    action('find').click();
    field('replacement').value = 'bar';
    field('replacement').dispatchEvent(new Event('input', { bubbles: true }));
    expect(action('replace').disabled).toBe(false);
    field('case').dispatchEvent(new Event('change', { bubbles: true }));
    expect(action('replace').disabled).toBe(true);
    action('replace').click();
    expect(run).not.toHaveBeenCalledWith(ReplaceSheetMatchCommand, expect.anything());
    dialog.destroy();
  });

  it('registers panel listeners through Platform and releases them on destroy', () => {
    const { dialog, root, action, query, addEventListener } = createDialog();
    expect(addEventListener.mock.calls.map(([, type]) => type)).toEqual(['keydown', 'click', 'resize', 'input', 'change', 'keydown']);
    const removeEventListener = jest.spyOn(root, 'removeEventListener');
    const removeDocumentEventListener = jest.spyOn(document, 'removeEventListener');
    dialog.destroy();
    expect(removeEventListener).toHaveBeenCalledTimes(4);
    expect(removeDocumentEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: true });
    action('find').click();
    expect(query).not.toHaveBeenCalled();
    removeDocumentEventListener.mockRestore();
    dialog.destroy();
  });

  it('loads bounded result windows in both directions and keeps the active result visible', () => {
    const many = Array.from({ length: 450 }, (_, row) => ({ row, column: 0, start: 0, end: 1, text: 'x' }));
    const { dialog, root, field, action, query } = createDialog(many);
    field('find').value = 'x';
    action('find').click();
    expect(root.querySelectorAll('[data-result]')).toHaveLength(200);
    const firstButton = root.querySelector('[data-result="0"]');
    action('next').click();
    expect(root.querySelector('[data-result="0"]')).toBe(firstButton);
    root.querySelector<HTMLElement>('[data-result="199"]')!.click();
    action('next').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('201 / 450');
    expect(root.querySelectorAll('[data-result]')).toHaveLength(200);
    expect(root.querySelector('[data-result="0"]')?.textContent).toContain('A201');
    expect(root.querySelector('[data-result="0"]')?.classList.contains('active')).toBe(true);
    action('previous').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('200 / 450');
    expect(root.querySelector('[data-result="199"]')?.classList.contains('active')).toBe(true);
    action('find').click();
    action('previous').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('450 / 450');
    expect(root.querySelectorAll('[data-result]')).toHaveLength(200);
    expect(query).toHaveBeenCalledWith(FindSheetMatchPageQuery, expect.objectContaining({ backward: true }));
    dialog.destroy();
  });

  it('refreshes a cached window after Sheet data changes', () => {
    const { dialog, root, field, action, query } = createDialog();
    field('find').value = 'foo';
    action('find').click();
    query.mockImplementation((definition) => definition === ReadSheetFindRevisionQuery ? 1 :
      { matches, startIndex: 0, total: matches.length, revision: 1 });
    action('next').click();
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('1 / 3');
    expect(query).toHaveBeenCalledWith(FindSheetMatchPageQuery, expect.objectContaining({ text: 'foo' }));
    dialog.destroy();
  });

  it('clears stale results after another command changes the searched cell', async () => {
    const { dialog, root, field, action, query, notifyCommand, subscribe } = createDialog();
    field('find').value = 'foo';
    action('find').click();
    expect(root.querySelectorAll('[data-result]')).toHaveLength(3);
    query.mockImplementation((definition) => definition === ReadSheetFindRevisionQuery ? 1 :
      { matches: [], startIndex: 0, total: 0, revision: 1 });
    notifyCommand({ phase: CommandExecutionPhase.Completed, id: 'sheet.cell.commit' });
    await Promise.resolve();
    expect(root.querySelectorAll('[data-result]')).toHaveLength(0);
    expect(root.querySelector('.sear-find-replace__count')?.textContent).toBe('No matches found');
    expect(action('replace').disabled).toBe(true);
    dialog.destroy();
    expect(subscribe.mock.results[0].value).toBeInstanceOf(Function);
  });

  it('shows a bounded preview for a long matching cell', () => {
    const longText = 'x'.repeat(10_000);
    const { dialog, root, field, action } = createDialog([
      { row: 0, column: 0, start: 5_000, end: 5_001, text: longText },
    ]);
    field('find').value = 'x';
    action('find').click();
    expect(root.querySelector('[data-result]')?.textContent?.length).toBeLessThan(120);
    dialog.destroy();
  });
});
