import { columnIndexToLabel } from '@searsuite/sear-foundation-utils';
import { type SheetFormulaBarState } from '@searsuite/sear-plugin-cell-editor';
import { type SheetCellDataReader } from '@searsuite/sear-render-engine';
import { type IFormulaRichResultProvider } from '@searsuite/sear-domain-formula-engine';

const GRID_PROXY_ATTRIBUTE = 'data-sear-grid-proxy';

/** Screen-reader grid for the current neighborhood of a Web sheet surface. */
export class WebSheetAccessibleGrid {
  readonly #id: string;

  #grid: HTMLDivElement | null = null;
  #surface: Element | null = null;
  #previousProxyId: string | null = null;

  public constructor(id: string) {
    this.#id = id;
  }

  public mount(surface: Element): void {
    this.destroy();
    const grid = surface.ownerDocument.createElement('div');
    grid.id = this.#id;
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Sheet grid');
    grid.setAttribute('aria-multiselectable', 'true');
    grid.tabIndex = 0;
    grid.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
    surface.ownerDocument.body.appendChild(grid);
    this.#previousProxyId = surface.getAttribute(GRID_PROXY_ATTRIBUTE);
    surface.setAttribute(GRID_PROXY_ATTRIBUTE, this.#id);
    this.#surface = surface;
    this.#grid = grid;
  }

  public render(
    state: SheetFormulaBarState,
    cells: SheetCellDataReader | null,
    richResults?: IFormulaRichResultProvider,
  ): void {
    const grid = this.#grid;
    if (!grid) return;
    const [rowCount = 0, columnCount = 0] = cells?.shape ?? [];
    grid.setAttribute('aria-rowcount', String(rowCount));
    grid.setAttribute('aria-colcount', String(columnCount));
    grid.replaceChildren();
    if (!cells || !state.cell || rowCount === 0 || columnCount === 0) {
      grid.removeAttribute('aria-activedescendant');
      return;
    }

    const [activeRow, activeColumn] = state.cell;
    const firstRow = Math.max(0, activeRow - 2);
    const lastRow = Math.min(rowCount - 1, activeRow + 2);
    const firstColumn = Math.max(0, activeColumn - 2);
    const lastColumn = Math.min(columnCount - 1, activeColumn + 2);
    for (let row = firstRow; row <= lastRow; row++) {
      const rowElement = grid.ownerDocument.createElement('div');
      rowElement.setAttribute('role', 'row');
      rowElement.setAttribute('aria-rowindex', String(row + 1));
      for (let column = firstColumn; column <= lastColumn; column++) {
        const cell = grid.ownerDocument.createElement('div');
        const active = row === activeRow && column === activeColumn;
        const stored = cells.getItem(row, column);
        const value = active ? state.text : String(stored?.formula ?? stored?.value ?? '');
        cell.id = `${this.#id}-cell-${row}-${column}`;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', String(column + 1));
        cell.setAttribute('aria-selected', String(isSelected(state, row, column)));
        cell.setAttribute('aria-label', `${columnIndexToLabel(column)}${row + 1}, ${value || 'blank'}`);
        const rich = richResults?.getFormulaRichResult(row, column);
        const href = rich?.kind === 'hyperlink' ? safeHyperlinkHref(rich.target, grid.ownerDocument) : undefined;
        if (rich?.kind === 'hyperlink' && href) {
          const link = grid.ownerDocument.createElement('a');
          link.href = href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = rich.label;
          cell.appendChild(link);
        }
        rowElement.appendChild(cell);
      }
      grid.appendChild(rowElement);
    }
    grid.setAttribute('aria-activedescendant', `${this.#id}-cell-${activeRow}-${activeColumn}`);
  }

  public focus(): void {
    this.#grid?.focus({ preventScroll: true });
  }

  public destroy(): void {
    if (this.#surface) {
      if (this.#previousProxyId === null) this.#surface.removeAttribute(GRID_PROXY_ATTRIBUTE);
      else this.#surface.setAttribute(GRID_PROXY_ATTRIBUTE, this.#previousProxyId);
    }
    this.#grid?.remove();
    this.#grid = null;
    this.#surface = null;
    this.#previousProxyId = null;
  }
}

function safeHyperlinkHref(target: string, document: Document): string | undefined {
  if (target.startsWith('#')) return undefined;
  try {
    const url = new URL(target, document.baseURI);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function isSelected(state: SheetFormulaBarState, row: number, column: number): boolean {
  const range = state.range;
  return !!range && row >= range.start[0] && row <= range.end[0] && column >= range.start[1] && column <= range.end[1];
}
