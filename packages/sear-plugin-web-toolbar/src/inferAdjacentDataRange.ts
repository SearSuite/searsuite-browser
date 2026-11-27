import { type SheetMatrix } from '@searsuite/sear-domain-sheet';

/** Finds the connected block containing one cell without scanning distant sheet data. */
export function inferAdjacentDataRange(
  data: Pick<SheetMatrix, 'shape' | 'getItem'>,
  anchor: readonly [number, number]
): { start: [number, number]; end: [number, number] } | null {
  const [row, column] = anchor;
  if (row < 0 || column < 0 || row >= data.shape[0] || column >= data.shape[1] || data.getItem(row, column) == null)
    return null;
  const columns = data.shape[1];
  const seen = new Set<number>([row * columns + column]);
  const queue: [number, number][] = [[row, column]];
  let startRow = row;
  let endRow = row;
  let startColumn = column;
  let endColumn = column;
  for (let index = 0; index < queue.length; index++) {
    const [currentRow, currentColumn] = queue[index]!;
    for (const [nextRow, nextColumn] of [
      [currentRow - 1, currentColumn],
      [currentRow + 1, currentColumn],
      [currentRow, currentColumn - 1],
      [currentRow, currentColumn + 1],
    ]) {
      if (
        nextRow < 0 ||
        nextRow >= data.shape[0] ||
        nextColumn < 0 ||
        nextColumn >= columns ||
        data.getItem(nextRow, nextColumn) == null
      )
        continue;
      const key = nextRow * columns + nextColumn;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([nextRow, nextColumn]);
      startRow = Math.min(startRow, nextRow);
      endRow = Math.max(endRow, nextRow);
      startColumn = Math.min(startColumn, nextColumn);
      endColumn = Math.max(endColumn, nextColumn);
    }
  }
  return { start: [startRow, startColumn], end: [endRow, endColumn] };
}
