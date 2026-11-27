import { SheetMatrix } from '@searsuite/sear-domain-sheet';
import { CellType } from '@searsuite/sear-domain-cell-types';
import { inferAdjacentDataRange } from '../src/inferAdjacentDataRange';

describe('inferAdjacentDataRange', () => {
  it('BUG-033/040 keeps a local table separate from distant data', () => {
    const data = new SheetMatrix(undefined, [30, 100]);
    for (let row = 19; row <= 22; row++)
      for (let column = 3; column <= 4; column++)
        data.addItem(row, column, { type: CellType.String, value: `${row}:${column}` });
    data.addItem(0, 9, { type: CellType.String, value: 'remote' });

    expect(inferAdjacentDataRange(data, [20, 3])).toEqual({ start: [19, 3], end: [22, 4] });
    expect(inferAdjacentDataRange(data, [0, 9])).toEqual({ start: [0, 9], end: [0, 9] });
    expect(inferAdjacentDataRange(data, [10, 10])).toBeNull();
  });
});
