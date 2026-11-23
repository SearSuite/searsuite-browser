import { type SheetFormulaBarState } from '@searsuite/sear-plugin-cell-editor';
import { type SheetCellDataReader } from '@searsuite/sear-render-engine';
import { WebSheetAccessibleGrid } from '../src/WebSheetAccessibleGrid';
import { focusWebSheetSurface } from '../src/focusWebSheetSurface';

function state(cell: [number, number], text: string, end = cell): SheetFormulaBarState {
  return {
    cell,
    range: { start: cell, end },
    text,
    editing: false,
    selectionStart: 0,
    selectionEnd: 0,
  };
}

describe('WebSheetAccessibleGrid', () => {
  it('exposes a formula hyperlink as an accessible link', () => {
    const surface = document.createElement('canvas');
    document.body.appendChild(surface);
    const accessible = new WebSheetAccessibleGrid('hyperlink-grid');
    const cells: SheetCellDataReader = { shape: [2, 2], getItem: () => null };
    accessible.mount(surface);
    try {
      accessible.render(state([0, 0], '=HYPERLINK("https://example.com","Open")'), cells, {
        getFormulaRichResult: (row, col) => row === 0 && col === 0
          ? { kind: 'hyperlink', target: 'https://example.com/', label: 'Open' }
          : undefined,
      });
      const link = document.querySelector<HTMLAnchorElement>('#hyperlink-grid-cell-0-0 a');
      expect(link?.textContent).toBe('Open');
      expect(link?.href).toBe('https://example.com/');
      expect(link?.rel).toBe('noopener noreferrer');
      accessible.render(state([0, 0], 'Unsafe'), cells, {
        getFormulaRichResult: () => ({ kind: 'hyperlink', target: 'javascript:alert(1)', label: 'Unsafe' }),
      });
      expect(document.querySelector('#hyperlink-grid a')).toBeNull();
      accessible.render(state([1, 1], 'other'), cells);
      expect(document.querySelector('#hyperlink-grid a')).toBeNull();
    } finally {
      accessible.destroy();
      surface.remove();
    }
  });

  it('BUG-088 exposes the active cell and selection as a navigable grid on a visual surface', () => {
    const surface = document.createElement('canvas');
    document.body.appendChild(surface);
    const cells: SheetCellDataReader = {
      shape: [100, 26],
      getItem: (row, column) => (row === 0 && column === 0 ? { type: 'string', value: 'merged' } : null),
    };
    const accessible = new WebSheetAccessibleGrid('test-sheet-grid');
    try {
      accessible.mount(surface);
      accessible.render(state([0, 0], 'merged'), cells);
      const grid = document.getElementById('test-sheet-grid')!;
      expect(grid.getAttribute('role')).toBe('grid');
      expect(grid.getAttribute('aria-rowcount')).toBe('100');
      expect(grid.getAttribute('aria-colcount')).toBe('26');
      expect(grid.getAttribute('aria-activedescendant')).toBe('test-sheet-grid-cell-0-0');
      expect(grid.querySelector('[role="row"]')?.getAttribute('aria-rowindex')).toBe('1');
      expect(grid.querySelector('#test-sheet-grid-cell-0-0')?.getAttribute('aria-label')).toBe('A1, merged');
      expect(grid.querySelector('#test-sheet-grid-cell-0-0')?.getAttribute('aria-selected')).toBe('true');
      expect(focusWebSheetSurface(surface)).toBe(true);
      expect(document.activeElement).toBe(grid);

      accessible.render(state([1, 1], 'next', [1, 2]), cells);
      expect(document.activeElement).toBe(grid);
      expect(grid.getAttribute('aria-activedescendant')).toBe('test-sheet-grid-cell-1-1');
      expect(grid.querySelector('#test-sheet-grid-cell-1-1')?.getAttribute('aria-label')).toBe('B2, next');
      expect(grid.querySelector('#test-sheet-grid-cell-1-2')?.getAttribute('aria-selected')).toBe('true');
      expect(grid.querySelector('#test-sheet-grid-cell-1-0')?.getAttribute('aria-selected')).toBe('false');
    } finally {
      accessible.destroy();
      surface.remove();
    }
    expect(document.getElementById('test-sheet-grid')).toBeNull();
    expect(surface.hasAttribute('data-sear-grid-proxy')).toBe(false);
  });

  it('BUG-1155 names unselected formula cells by their stored formula', () => {
    const surface = document.createElement('canvas');
    document.body.appendChild(surface);
    const cells: SheetCellDataReader = {
      shape: [3, 3],
      getItem: (row, column) => row === 0 && column === 0
        ? { type: 'formula', formula: '=B1' }
        : row === 1 && column === 0 ? { type: 'formula', formula: '=B1+1' } : null,
    };
    const accessible = new WebSheetAccessibleGrid('formula-grid');
    accessible.mount(surface);
    try {
      accessible.render(state([0, 2], ''), cells);
      expect(document.getElementById('formula-grid-cell-0-0')?.getAttribute('aria-label')).toBe('A1, =B1');
      expect(document.getElementById('formula-grid-cell-1-0')?.getAttribute('aria-label')).toBe('A2, =B1+1');
    } finally {
      accessible.destroy();
      surface.remove();
    }
  });
});
