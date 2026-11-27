import { type SearCoreSheet } from '@searsuite/sear-assembly-core';
import { type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { ReadSheetFilterQuery } from '@searsuite/sear-plugin-filter';
import { readSheetFreeze } from '@searsuite/sear-plugin-freeze';
import { getSheetRangePositionRect } from '@searsuite/sear-render';
import { readSheetColumnSizes, readSheetRowSizes } from '@searsuite/sear-domain-sheet';

/** Routes clicks on a rendered filter-header arrow to the Web filter editor. */
export function bindWebSheetFilterHeader(
  platform: Platform,
  surface: Element,
  core: SearCoreSheet,
  queries: SheetQueryRegistry,
  openColumn: (column: number) => void
): () => void {
  return platform.addEventListener(
    surface,
    'pointerdown',
    (event) => {
      const pointer = event as PointerEvent;
      if (pointer.button !== 0 || !queries.has(ReadSheetFilterQuery)) return;
      const filter = queries.run(ReadSheetFilterQuery, void 0);
      if (!filter) return;
      const data = core.getDataEngine();
      const rows = readSheetRowSizes(data);
      const columns = readSheetColumnSizes(data);
      if (!rows || !columns) return;
      const bounds = surface.getBoundingClientRect();
      const [viewWidth, viewHeight] = core.renderEngine.scrollManager.getShape();
      if (!bounds.width || !bounds.height || !viewWidth || !viewHeight) return;
      const x = ((pointer.clientX - bounds.left) * viewWidth) / bounds.width;
      const y = ((pointer.clientY - bounds.top) * viewHeight) / bounds.height;
      const config = core.configEngine.getDefaultConfig();
      const offsetX = config.sheetOffsetX ?? 50;
      const offsetY = config.sheetOffsetY ?? 24;
      if (x < offsetX || y < offsetY) return;
      const freeze = readSheetFreeze(data);
      const scroll = core.renderEngine.scrollManager.getState();
      const fixedRight = offsetX + columns.getDimensionLeftBoundaryByIndex(freeze.columns);
      const fixedBottom = offsetY + rows.getDimensionLeftBoundaryByIndex(freeze.rows);
      const column = columns.getLeftBoundaryColIndexByDimension(x + (x >= fixedRight ? scroll.x : 0) - offsetX);
      const row = rows.getLeftBoundaryColIndexByDimension(y + (y >= fixedBottom ? scroll.y : 0) - offsetY);
      if (row !== filter.range.start[0] || column < filter.range.start[1] || column > filter.range.end[1]) return;
      const rect = getSheetRangePositionRect([row, column], [row, column], {
        rowSizes: rows,
        columnSizes: columns,
        offsetX,
        offsetY,
      });
      if (!rect) return;
      const left = rect.x - (column < freeze.columns ? 0 : scroll.x);
      const top = rect.y - (row < freeze.rows ? 0 : scroll.y);
      if (x < left + rect.width * 0.8 || x >= left + rect.width || y < top || y >= top + rect.height) return;
      pointer.preventDefault();
      pointer.stopPropagation();
      openColumn(column);
    },
    { capture: true }
  );
}
