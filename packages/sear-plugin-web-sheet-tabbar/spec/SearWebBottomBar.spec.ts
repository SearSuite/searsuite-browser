import type { Platform } from '@searsuite/sear-foundation-platform';
import { createWorkbookDocumentState } from '@searsuite/sear-domain-workbook';
import { createWorkbookEditor, type WorkbookSheetEditorFactoryInput } from '@searsuite/sear-assembly-workbook';
import { WorkbookCommandBus } from '@searsuite/sear-assembly-workbook-kernel';
import { SheetQueryRegistry, type SheetCommandBus } from '@searsuite/sear-assembly-commands';
import { type SheetEditor } from '@searsuite/sear-assembly-commands';
import { type SheetEditorAdapters } from '@searsuite/sear-assembly-setup';
import { type SheetDocumentState } from '@searsuite/sear-assembly-sheet-state';
import { SelectRangeCommand } from '@searsuite/sear-plugin-selection';
import { IsCellEditingQuery } from '@searsuite/sear-plugin-cell-editor';
import {
  SearWebBottomBar,
  SheetStatusBarAdapter,
  SheetTabBarAdapter,
  WebSheetStatusBar,
  WebSheetTabBar,
  type SheetStatusBarModel,
  type SheetTabBarModel,
} from '../src';

describe('SearWebBottomBar', () => {
  it('BUG-895 and BUG-1106 switch sheets only outside cell editing', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    const gridInput = document.createElement('input');
    gridInput.id = 'searTextInput';
    const grid = document.createElement('div');
    grid.setAttribute('role', 'grid');
    grid.tabIndex = 0;
    const hostInput = document.createElement('input');
    document.body.append(target, gridInput, grid, hostInput);
    bottomBar.mount(target, { workbook: { editor: workbook } });
    const press = (key: string, modifiers: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
      document.activeElement?.dispatchEvent(event);
      return event;
    };
    try {
      gridInput.focus();
      expect(press('ArrowRight', { altKey: true }).defaultPrevented).toBe(true);
      expect(workbook.sheets.getActiveId()).toBe('sheet-2');
      expect(target.querySelector('.sear-sheet-bottom-bar__tab--active')?.textContent).toBe('Sheet2');
      expect(document.activeElement).toBe(grid);
      let editing = true;
      workbook.sheets.getActiveEditor()?.queries.register(IsCellEditingQuery, () => editing);
      gridInput.focus();
      expect(press('ArrowLeft', { altKey: true }).defaultPrevented).toBe(false);
      expect(workbook.sheets.getActiveId()).toBe('sheet-2');
      editing = false;
      grid.focus();
      expect(press('PageDown', { ctrlKey: true }).defaultPrevented).toBe(true);
      expect(workbook.sheets.getActiveId()).toBe('sheet-2');
      press('PageUp', { ctrlKey: true });
      expect(workbook.sheets.getActiveId()).toBe('sheet-1');
      press('PageDown', { ctrlKey: true });
      expect(workbook.sheets.getActiveId()).toBe('sheet-2');
      const native = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true });
      hostInput.dispatchEvent(native);
      expect(native.defaultPrevented).toBe(false);
      expect(workbook.sheets.getActiveId()).toBe('sheet-2');
      bottomBar.destroy();
      expect(press('ArrowLeft', { altKey: true }).defaultPrevented).toBe(false);
    } finally {
      bottomBar.destroy();
      workbook.destroy();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.replaceChildren();
    document.head.querySelectorAll('style[data-sear-sheet-bottom-bar]').forEach((node) => node.remove());
  });

  function createPlatform(): jest.Mocked<Platform> {
    return {
      requestAnimationFrame: jest.fn(),
      cancelAnimationFrame: jest.fn(),
      setTimeout: jest.fn(() => 2),
      clearTimeout: jest.fn(),
      setInterval: jest.fn(() => 1),
      clearInterval: jest.fn(),
      now: jest.fn(() => 0),
      queueMicrotask: jest.fn(),
      warn: jest.fn(),
      observeResize: jest.fn(() => () => void 0),
    } as unknown as jest.Mocked<Platform>;
  }

  function createWorkbook() {
    return createWorkbookEditor({
      adapters: {
        platform: class WorkbookTestPlatform {
          public warn(): void {}
        },
      } as unknown as SheetEditorAdapters,
      documentState: createWorkbookDocumentState<SheetDocumentState>({
        id: 'book-1',
        sheets: [
          { id: 'sheet-1', name: 'Sheet1' },
          { id: 'sheet-2', name: 'Sheet2', color: '#2f7d32' },
          { id: 'sheet-3', name: 'Hidden', hidden: true },
        ],
        sheetStates: {
          'sheet-1': {} as SheetDocumentState,
          'sheet-2': {} as SheetDocumentState,
          'sheet-3': {} as SheetDocumentState,
        },
      }),
      sheetEditorFactory(_input: WorkbookSheetEditorFactoryInput): SheetEditor {
        return {
          commands: {
            has(definition: unknown) {
              return definition === SelectRangeCommand;
            },
            run: jest.fn(),
            subscribe: jest.fn(() => () => void 0),
          } as unknown as SheetCommandBus,
          queries: new SheetQueryRegistry(),
          observations: {} as SheetEditor['observations'],
          services: {} as SheetEditor['services'],
          destroy(): void {},
        };
      },
    });
  }

  it('mounts the bottom sheet tab/status bar replica', () => {
    const platform = createPlatform();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    document.body.appendChild(target);

    bottomBar.mount(target);

    expect(target.querySelector('.sear-sheet-bottom-bar')).not.toBeNull();
    expect(target.querySelector('.sear-sheet-bottom-bar__tab')?.textContent).toBe('Sheet1');
    expect(target.querySelector('.sear-sheet-bottom-bar__status')?.textContent).toContain('Sum=5994');
    expect(document.querySelector('style[data-sear-sheet-bottom-bar]')).not.toBeNull();
  });

  it('reuses CSS and replaces the existing bar on repeated mount', () => {
    const platform = createPlatform();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    document.body.appendChild(target);

    bottomBar.mount(target);
    bottomBar.mount(target);

    expect(target.querySelectorAll('.sear-sheet-bottom-bar')).toHaveLength(1);
    expect(document.querySelectorAll('style[data-sear-sheet-bottom-bar]')).toHaveLength(1);
  });

  it('reports unavailable actions through a transient toast', () => {
    const platform = createPlatform();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    document.body.appendChild(target);

    bottomBar.mount(target);
    target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();

    expect(document.querySelector('.sear-sheet-bottom-bar__toast')?.textContent).toBe('Not implemented yet');
    expect(platform.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

    const timeoutCallback = platform.setTimeout.mock.calls.at(-1)?.[0] as (() => void) | undefined;
    timeoutCallback?.();
    expect(document.querySelector('.sear-sheet-bottom-bar__toast')).toBeNull();
  });

  it('BUG-620 exposes the active workbook tab and updates it after activation', () => {
    const platform = createPlatform();
    const commandSubscription = jest.spyOn(WorkbookCommandBus.prototype, 'subscribe');
    const workbook = createWorkbook();
    commandSubscription.mockClear();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    document.body.appendChild(target);

    bottomBar.mount(target, { workbook: { editor: workbook } });

    expect(Array.from(target.querySelectorAll('.sear-sheet-bottom-bar__tab')).map((node) => node.textContent)).toEqual([
      'Sheet1',
      'Sheet2',
    ]);
    expect(target.querySelector('[data-sheet-id="sheet-1"]')?.getAttribute('aria-current')).toBe('page');
    expect(target.querySelector('[data-sheet-id="sheet-2"]')?.hasAttribute('aria-current')).toBe(false);
    expect(target.querySelector('[data-sheet-id="sheet-3"]')).toBeNull();
    target.querySelector<HTMLElement>('[data-sheet-id="sheet-2"]')?.click();

    expect(workbook.sheets.getActiveId()).toBe('sheet-2');
    expect(target.querySelector('.sear-sheet-bottom-bar__tab--active')?.textContent).toBe('Sheet2');
    expect(target.querySelector('[data-sheet-id="sheet-1"]')?.hasAttribute('aria-current')).toBe(false);
    expect(target.querySelector('[data-sheet-id="sheet-2"]')?.getAttribute('aria-current')).toBe('page');
    expect(commandSubscription).not.toHaveBeenCalled();
    bottomBar.destroy();
    workbook.destroy();
    commandSubscription.mockRestore();
  });

  it('BUG-621 keeps focus on the new sheet tab after activation rebuilds the bar', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    document.body.appendChild(target);
    bottomBar.mount(target, { workbook: { editor: workbook } });

    const oldTab = target.querySelector<HTMLButtonElement>('[data-sheet-id="sheet-2"]')!;
    oldTab.focus();
    oldTab.click();

    expect(workbook.sheets.getActiveId()).toBe('sheet-2');
    expect(document.activeElement).toBe(target.querySelector('[data-sheet-id="sheet-2"]'));
    expect(document.activeElement).not.toBe(oldTab);
    bottomBar.destroy();
    workbook.destroy();
  });

  it('BUG-621 keeps tab focus when the host remounts the bottom bar', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    document.body.appendChild(target);
    const options = { workbook: { editor: workbook } };
    bottomBar.mount(target, options);
    const oldTab = target.querySelector<HTMLButtonElement>('[data-sheet-id="sheet-1"]')!;
    oldTab.focus();

    bottomBar.mount(target, options);

    expect(document.activeElement).toBe(target.querySelector('[data-sheet-id="sheet-1"]'));
    expect(document.activeElement).not.toBe(oldTab);
    bottomBar.destroy();
    workbook.destroy();
  });

  it('adds workbook sheets with a host-created sheet state', () => {
    const platform = createPlatform();
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    const createdState = {} as SheetDocumentState;
    document.body.appendChild(target);

    bottomBar.mount(target, {
      workbook: {
        editor: workbook,
        createSheetState(input) {
          expect(input).toEqual({ sheetId: 'sheet-4', name: 'Sheet3', index: 3 });
          return createdState;
        },
      },
    });
    target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();

    expect(workbook.document.getState().sheets.map((sheet) => sheet.id)).toEqual([
      'sheet-1',
      'sheet-2',
      'sheet-3',
      'sheet-4',
    ]);
    expect(workbook.document.getState().sheetStates['sheet-4']).toEqual(createdState);
    expect(workbook.sheets.getActiveId()).toBe('sheet-4');
    expect(workbook.sheets.getActiveEditor().commands.run).toHaveBeenCalledWith(SelectRangeCommand, {
      anchor: [0, 0],
      focus: [0, 0],
    });
    expect(target.querySelector('.sear-sheet-bottom-bar__tab--active')?.textContent).toBe('Sheet3');
    bottomBar.destroy();
    workbook.destroy();
  });

  it('BUG-262 renames a new sheet from its tab and keeps invalid names editable', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    document.body.appendChild(target);
    bottomBar.mount(target, { workbook: { editor: workbook, createSheetState: () => ({} as SheetDocumentState) } });
    try {
      target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();
      const newTab = target.querySelector<HTMLElement>('[data-sheet-id="sheet-4"]');
      expect(newTab?.textContent).toBe('Sheet3');
      newTab?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      let input = target.querySelector<HTMLInputElement>('.sear-sheet-bottom-bar__rename');
      expect(input?.value).toBe('Sheet3');

      input!.value = 'Sheet1';
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(input?.validationMessage).toBe('A sheet with this name already exists.');
      expect(workbook.document.getState().sheets.at(-1)?.name).toBe('Sheet3');

      input!.value = '  Sales  ';
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(workbook.document.getState().sheets.at(-1)?.name).toBe('Sales');
      expect(target.querySelector('[data-sheet-id="sheet-4"]')?.textContent).toBe('Sales');
      expect(target.querySelector('.sear-sheet-bottom-bar__rename')).toBeNull();

      target
        .querySelector<HTMLElement>('[data-sheet-id="sheet-4"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
      input = target.querySelector<HTMLInputElement>('.sear-sheet-bottom-bar__rename');
      expect(input?.value).toBe('Sales');
      input!.value = 'Discarded';
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(workbook.document.getState().sheets.at(-1)?.name).toBe('Sales');
    } finally {
      bottomBar.destroy();
      workbook.destroy();
    }
  });

  it('BUG-263 deletes a new sheet through its tab menu only after confirmation', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    document.body.appendChild(target);
    bottomBar.mount(target, { workbook: { editor: workbook, createSheetState: () => ({} as SheetDocumentState) } });
    try {
      target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();
      const openMenu = () =>
        target
          .querySelector<HTMLElement>('[data-sheet-id="sheet-4"]')
          ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      openMenu();
      expect(document.querySelector('[role="menu"]')?.textContent).toContain('Delete sheet');
      document.querySelector<HTMLElement>('[role="menuitem"]:last-child')?.click();
      expect(document.querySelector('[role="menu"]')?.textContent).toContain('Delete sheet "Sheet3"?');
      expect(workbook.document.getState().sheets).toHaveLength(4);
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-bottom-bar__context-menu button'))
        .find((button) => button.textContent === 'Cancel')
        ?.click();
      expect(workbook.document.getState().sheets).toHaveLength(4);

      openMenu();
      document.querySelector<HTMLElement>('[role="menuitem"]:last-child')?.click();
      Array.from(document.querySelectorAll<HTMLButtonElement>('.sear-sheet-bottom-bar__context-menu button'))
        .find((button) => button.textContent === 'Delete')
        ?.click();
      expect(workbook.document.getState().sheets.map((sheet) => sheet.id)).toEqual(['sheet-1', 'sheet-2', 'sheet-3']);
      expect(workbook.sheets.getActiveId()).toBe('sheet-1');
      expect(target.querySelector('[data-sheet-id="sheet-4"]')).toBeNull();
      expect(document.querySelector('[role="menu"]')).toBeNull();
    } finally {
      bottomBar.destroy();
      workbook.destroy();
    }
  });

  it('BUG-264 moves a new sheet by drag and by the tab menu', () => {
    const workbook = createWorkbook();
    const bottomBar = new SearWebBottomBar(createPlatform());
    const target = document.createElement('div');
    document.body.appendChild(target);
    bottomBar.mount(target, { workbook: { editor: workbook, createSheetState: () => ({} as SheetDocumentState) } });
    const visibleNames = () =>
      Array.from(target.querySelectorAll('.sear-sheet-bottom-bar__tab')).map((node) => node.textContent);
    try {
      target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();
      const newTab = target.querySelector<HTMLElement>('[data-sheet-id="sheet-4"]')!;
      const firstTab = target.querySelector<HTMLElement>('[data-sheet-id="sheet-1"]')!;
      newTab.dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
      firstTab.dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: -1 }));
      expect(firstTab.classList.contains('sear-sheet-bottom-bar__tab--drop-before')).toBe(true);
      firstTab.dispatchEvent(new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: -1 }));
      expect(visibleNames()).toEqual(['Sheet3', 'Sheet1', 'Sheet2']);
      expect(workbook.sheets.getActiveId()).toBe('sheet-4');

      target
        .querySelector<HTMLElement>('[data-sheet-id="sheet-4"]')
        ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
        .find((item) => item.textContent === 'Move right')
        ?.click();
      expect(visibleNames()).toEqual(['Sheet1', 'Sheet3', 'Sheet2']);
      expect(workbook.document.getState().sheets.map((sheet) => sheet.id)).toEqual([
        'sheet-1',
        'sheet-4',
        'sheet-2',
        'sheet-3',
      ]);
    } finally {
      bottomBar.destroy();
      workbook.destroy();
    }
  });

  it('replaces existing toasts and tolerates detached toast cleanup', () => {
    const platform = createPlatform();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    const oldToast = document.createElement('div');
    oldToast.className = 'sear-sheet-bottom-bar__toast';
    oldToast.textContent = 'old';
    document.body.append(target, oldToast);

    bottomBar.mount(target);
    target.querySelector<HTMLElement>('.sear-sheet-bottom-bar__add')?.click();

    expect(
      Array.from(document.querySelectorAll('.sear-sheet-bottom-bar__toast')).some((node) => node.textContent === 'old')
    ).toBe(false);
    expect(document.querySelector('.sear-sheet-bottom-bar__toast')?.textContent).toBe('Not implemented yet');

    const timeoutCallback = platform.setTimeout.mock.calls.at(-1)?.[0] as (() => void) | undefined;
    document.querySelector('.sear-sheet-bottom-bar__toast')?.remove();
    timeoutCallback?.();
    expect(document.querySelector('.sear-sheet-bottom-bar__toast')).toBeNull();
  });

  it('destroys safely before and after mount', () => {
    const platform = createPlatform();
    const bottomBar = new SearWebBottomBar(platform);
    const target = document.createElement('div');
    document.body.appendChild(target);

    expect(() => bottomBar.destroy()).not.toThrow();

    bottomBar.mount(target);
    bottomBar.destroy();
    bottomBar.destroy();

    expect(target.querySelector('.sear-sheet-bottom-bar')).toBeNull();
    expect(document.querySelector('style[data-sear-sheet-bottom-bar]')).toBeNull();
  });

  it('allows the tab bar adapter to be mounted and updated independently', () => {
    const onActivate = jest.fn();
    const tabBar = new WebSheetTabBar();
    const target = document.createElement('div');
    document.body.appendChild(target);

    tabBar.mount(target, {
      sheets: [{ id: 'sheet-1', name: 'Sheet1', active: true }],
      onAddSheetClick: jest.fn(),
      onActivateSheetClick: onActivate,
    });
    tabBar.update({
      sheets: [
        { id: 'sheet-1', name: 'Sheet1', active: false },
        { id: 'sheet-2', name: 'Sheet2', active: true },
      ],
      onAddSheetClick: jest.fn(),
      onActivateSheetClick: onActivate,
    });

    expect(Array.from(target.querySelectorAll('.sear-sheet-bottom-bar__tab')).map((node) => node.textContent)).toEqual([
      'Sheet1',
      'Sheet2',
    ]);
    target.querySelector<HTMLElement>('[data-sheet-id="sheet-2"]')?.click();
    expect(onActivate).toHaveBeenCalledWith('sheet-2');
    tabBar.destroy();
    expect(target.querySelector('.sear-sheet-bottom-bar__tabs-panel')).toBeNull();
  });

  it('allows the status bar adapter to be mounted and updated independently', () => {
    const onZoomIn = jest.fn();
    const statusBar = new WebSheetStatusBar();
    const target = document.createElement('div');
    document.body.appendChild(target);

    statusBar.mount(target, {
      statusText: 'Count=1',
      zoomText: '100%',
      zoomEnabled: true,
      onViewOptionsClick: jest.fn(),
      onZoomOutClick: jest.fn(),
      onZoomInClick: onZoomIn,
    });
    statusBar.update({
      statusText: 'Count=2',
      zoomText: '125%',
      zoomEnabled: true,
      onViewOptionsClick: jest.fn(),
      onZoomOutClick: jest.fn(),
      onZoomInClick: onZoomIn,
    });

    expect(target.querySelector('.sear-sheet-bottom-bar__status')?.textContent).toBe('Count=2');
    expect(target.querySelector('.sear-sheet-bottom-bar__zoom-value')?.textContent).toBe('125%');
    target.querySelectorAll<HTMLElement>('.sear-sheet-bottom-bar__zoom-button').item(1)?.click();
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    statusBar.destroy();
    expect(target.querySelector('.sear-sheet-bottom-bar__status-panel')).toBeNull();
  });

  it('keeps the shared adapter contracts independent from DOM targets', () => {
    const tabModel: SheetTabBarModel = {
      sheets: [{ id: 'sheet-1', name: 'Sheet1', active: true }],
      onAddSheetClick: jest.fn(),
      onActivateSheetClick: jest.fn(),
    };
    const statusModel: SheetStatusBarModel = {
      statusText: 'Count=1',
      zoomText: '100%',
      zoomEnabled: true,
      onViewOptionsClick: jest.fn(),
      onZoomOutClick: jest.fn(),
      onZoomInClick: jest.fn(),
    };
    const canvasTarget = { kind: 'canvas' };
    class CanvasTabBarAdapter extends SheetTabBarAdapter<typeof canvasTarget> {
      public mount = jest.fn();
      public update = jest.fn();
      public destroy = jest.fn();
    }
    class CanvasStatusBarAdapter extends SheetStatusBarAdapter<typeof canvasTarget> {
      public mount = jest.fn();
      public update = jest.fn();
      public destroy = jest.fn();
    }
    const tabAdapter = new CanvasTabBarAdapter();
    const statusAdapter = new CanvasStatusBarAdapter();

    tabAdapter.mount(canvasTarget, tabModel);
    statusAdapter.mount(canvasTarget, statusModel);

    expect(tabAdapter.mount).toHaveBeenCalledWith(canvasTarget, tabModel);
    expect(statusAdapter.mount).toHaveBeenCalledWith(canvasTarget, statusModel);
  });
});
