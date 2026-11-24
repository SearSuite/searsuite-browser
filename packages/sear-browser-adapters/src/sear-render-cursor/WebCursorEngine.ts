import { Injectable } from '@searsuite/sear-foundation-di';
import { CursorEngine } from '@searsuite/sear-render-cursor';
import { CursorToken } from '@searsuite/sear-render-cursor';

/**
 * Browser CSS cursor implementation.
 * Maps CursorToken to CSS cursor values (including SVG data URI custom cursors).
 */
@Injectable()
export class WebCursorEngine extends CursorEngine {
  #hostElement: HTMLElement | SVGElement | null = null;
  #lastToken: CursorToken = CursorToken.Default;
  #overrideToken: CursorToken | null = null;

  /** Token → CSS cursor value map; extendable via registerToken(). */
  #tokenMap = new Map<string, string>([
    [CursorToken.Default, 'default'],
    [CursorToken.Cell, CURSOR_CELL],
    [CursorToken.Text, 'text'],
    [CursorToken.RowSelect, CURSOR_ROW_SELECT],
    [CursorToken.ColumnSelect, CURSOR_COL_SELECT],
    [CursorToken.RowResize, CURSOR_RESIZE_ROW],
    [CursorToken.ColumnResize, CURSOR_RESIZE],
    [CursorToken.Move, 'move'],
    [CursorToken.Grab, 'grab'],
    [CursorToken.Grabbing, 'grabbing'],
    [CursorToken.NotAllowed, 'not-allowed'],
    [CursorToken.Pointer, 'pointer'],
    [CursorToken.Copy, 'copy'],
  ]);

  /** Allow third parties to extend or override Token → CSS mapping. */
  registerToken(token: string, cssCursor: string): void {
    this.#tokenMap.set(token, cssCursor);
  }

  /** Attaches this adapter to its host surface. */
  mount(target: unknown): void {
    this.#hostElement = target as HTMLElement | SVGElement;
  }

  /** Applies a transaction to WebCursorEngine state. */
  apply(token: CursorToken): void {
    const effective = this.#overrideToken ?? token;
    if (!this.#hostElement || effective === this.#lastToken) return;
    this.#hostElement.style.cursor = this.#tokenMap.get(effective) ?? 'default';
    this.#lastToken = effective;
  }

  /** Applies a temporary host cursor override. */
  override(token: CursorToken | null): void {
    this.#overrideToken = token;
    const effective = token ?? CursorToken.Default;
    if (this.#hostElement) this.#hostElement.style.cursor = this.#tokenMap.get(effective) ?? 'default';
    this.#lastToken = effective;
  }

  /** Detaches this adapter from its host surface. */
  unmount(): void {
    if (this.#hostElement) this.#hostElement.style.cursor = '';
    this.#hostElement = null;
  }
}

// ── SVG Data URI custom cursors ────────────────────────────────────────────────

/** Crosshair / plus (grid cell), hotspot (15, 15). */
const CURSOR_CELL =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 36 36' fill='none'%3E` +
  `%3Cg filter='url(%23filter0_d)'%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 17v-5h-2v5h-5v2h5v5h2v-5h5v-2h-5z' fill='%23fff' fill-opacity='.88'/%3E` +
  `%3Cpath d='M12 19.5h4.5v5h3v-5h5v-3h-5v-5h-3v5h-5v3h.5z' stroke='%23171A1D'/%3E` +
  `%3C/g%3E%3Cdefs%3E` +
  `%3Cfilter id='filter0_d' x='8' y='9' width='20' height='20' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E` +
  `%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E` +
  `%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'/%3E` +
  `%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E` +
  `%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E` +
  `%3CfeBlend in2='BackgroundImageFix' result='effect1_dropShadow'/%3E` +
  `%3CfeBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape'/%3E` +
  `%3C/filter%3E%3C/defs%3E%3C/svg%3E") 15 15, default`;

/** Right-pointing arrow (row-header row-select), hotspot (21, 14). */
const CURSOR_ROW_SELECT =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 36 36' fill='none'%3E` +
  `%3Cg filter='url(%23filter0_d)'%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M20 19h-8v-3h8v-3l5 4.5-5 4.5v-3z' fill='%23171A1D'/%3E` +
  `%3Cpath d='M19.5 13v2.5h-8v4h8v3.623l.834-.751 5-4.5.413-.372-.413-.372-5-4.5-.834-.75V13z' stroke='%23fff'/%3E` +
  `%3C/g%3E%3Cdefs%3E` +
  `%3Cfilter id='filter0_d' x='8' y='8.755' width='21.495' height='19.491' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E` +
  `%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E` +
  `%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'/%3E` +
  `%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E` +
  `%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E` +
  `%3CfeBlend in2='BackgroundImageFix' result='effect1_dropShadow'/%3E` +
  `%3CfeBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape'/%3E` +
  `%3C/filter%3E%3C/defs%3E%3C/svg%3E") 21 14, default`;

/** Down-pointing arrow (column-header col-select), hotspot (15, 21). */
const CURSOR_COL_SELECT =
  `url("data:image/svg+xml,%3Csvg fill='none' height='30' width='30' viewBox='0 0 36 36' xmlns='http://www.w3.org/2000/svg'%3E` +
  `%3Cg filter='url(%23filter0_d)'%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M17 19v-8h3v8h3l-4.5 5.5L14 19h3z' fill='%23171A1D'/%3E` +
  `%3Cpath d='M23 18.5h-2.5v-8h-4v8h-3.555l.668.817 4.5 5.5.387.473.387-.473 4.5-5.5.668-.817H23z' stroke='%23fff'/%3E` +
  `%3C/g%3E%3Cdefs%3E` +
  `%3Cfilter id='filter0_d' x='8.89' y='8' width='19.221' height='22.079' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E` +
  `%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E` +
  `%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'/%3E` +
  `%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E` +
  `%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E` +
  `%3CfeBlend in2='BackgroundImageFix' result='effect1_dropShadow'/%3E` +
  `%3CfeBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape'/%3E` +
  `%3C/filter%3E%3C/defs%3E%3C/svg%3E") 15 21, default`;

/** Vertical resize (row-height), hotspot (15, 15). Rotated 90° from CURSOR_RESIZE. */
const CURSOR_RESIZE_ROW =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 36 36' fill='none'%3E` +
  `%3Cg transform='rotate(90 18 18)' filter='url(%23filter0_d)'%3E` +
  `%3Cmask id='a' maskUnits='userSpaceOnUse' x='7' y='9' width='22' height='18' fill='%23000'%3E` +
  `%3Cpath fill='%23fff' d='M7 9h22v18H7z'/%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 10h-2v7h-4v2h4v7h2v-7h4v-2h-4v-7zM9 18l4-3v6l-4-3zm18 0l-4 3v-6l4 3z'/%3E` +
  `%3C/mask%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 10h-2v7h-4v2h4v7h2v-7h4v-2h-4v-7zM9 18l4-3v6l-4-3zm18 0l-4 3v-6l4 3z' fill='%23171A1D'/%3E` +
  `%3Cpath d='M19 10h1V9h-1v1zm-2 0V9h-1v1h1zm0 7v1h1v-1h-1zm-4 0v-1h-1v1h1zm0 2h-1v1h1v-1zm4 0h1v-1h-1v1zm0 7h-1v1h1v-1zm2 0v1h1v-1h-1zm0-7v-1h-1v1h1zm4 0v1h1v-1h-1zm0-2h1v-1h-1v1zm-4 0h-1v1h1v-1zM9 18l-.6-.8-1.067.8 1.067.8.6-.8zm4-3h1v-2l-1.6 1.2.6.8zm0 6l-.6.8L14 23v-2h-1zm14-3l.6.8 1.067-.8-1.067-.8-.6.8zm-4 3h-1v2l1.6-1.2-.6-.8zm0-6l.6-.8L22 13v2h1zm-4-6h-2v2h2V9zm-3 1v7h2v-7h-2zm1 6h-4v2h4v-2zm-5 1v2h2v-2h-2zm1 3h4v-2h-4v2zm3-1v7h2v-7h-2zm1 8h2v-2h-2v2zm3-1v-7h-2v7h2zm-1-6h4v-2h-4v2zm5-1v-2h-2v2h2zm-1-3h-4v2h4v-2zm-3 1v-7h-2v7h2zM9.6 18.8l4-3-1.2-1.6-4 3 1.2 1.6zM12 15v6h2v-6h-2zm1.6 5.2l-4-3-1.2 1.6 4 3 1.2-1.6zm12.8-3l-4 3 1.2 1.6 4-3-1.2-1.6zM24 21v-6h-2v6h2zm-1.6-5.2l4 3 1.2-1.6-4-3-1.2 1.6z' fill='%23fff' mask='url(%23a)'/%3E` +
  `%3C/g%3E%3Cdefs%3E` +
  `%3Cfilter id='filter0_d' x='4.333' y='7' width='27.333' height='24' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E` +
  `%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E` +
  `%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'/%3E` +
  `%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E` +
  `%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E` +
  `%3CfeBlend in2='BackgroundImageFix' result='effect1_dropShadow'/%3E` +
  `%3CfeBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape'/%3E` +
  `%3C/filter%3E%3C/defs%3E%3C/svg%3E") 15 15, default`;

/** Horizontal resize (column-width), hotspot (15, 15). */
const CURSOR_RESIZE =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 36 36' fill='none'%3E` +
  `%3Cg filter='url(%23filter0_d)'%3E` +
  `%3Cmask id='a' maskUnits='userSpaceOnUse' x='7' y='9' width='22' height='18' fill='%23000'%3E` +
  `%3Cpath fill='%23fff' d='M7 9h22v18H7z'/%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 10h-2v7h-4v2h4v7h2v-7h4v-2h-4v-7zM9 18l4-3v6l-4-3zm18 0l-4 3v-6l4 3z'/%3E` +
  `%3C/mask%3E` +
  `%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M19 10h-2v7h-4v2h4v7h2v-7h4v-2h-4v-7zM9 18l4-3v6l-4-3zm18 0l-4 3v-6l4 3z' fill='%23171A1D'/%3E` +
  `%3Cpath d='M19 10h1V9h-1v1zm-2 0V9h-1v1h1zm0 7v1h1v-1h-1zm-4 0v-1h-1v1h1zm0 2h-1v1h1v-1zm4 0h1v-1h-1v1zm0 7h-1v1h1v-1zm2 0v1h1v-1h-1zm0-7v-1h-1v1h1zm4 0v1h1v-1h-1zm0-2h1v-1h-1v1zm-4 0h-1v1h1v-1zM9 18l-.6-.8-1.067.8 1.067.8.6-.8zm4-3h1v-2l-1.6 1.2.6.8zm0 6l-.6.8L14 23v-2h-1zm14-3l.6.8 1.067-.8-1.067-.8-.6.8zm-4 3h-1v2l1.6-1.2-.6-.8zm0-6l.6-.8L22 13v2h1zm-4-6h-2v2h2V9zm-3 1v7h2v-7h-2zm1 6h-4v2h4v-2zm-5 1v2h2v-2h-2zm1 3h4v-2h-4v2zm3-1v7h2v-7h-2zm1 8h2v-2h-2v2zm3-1v-7h-2v7h2zm-1-6h4v-2h-4v2zm5-1v-2h-2v2h2zm-1-3h-4v2h4v-2zm-3 1v-7h-2v7h2zM9.6 18.8l4-3-1.2-1.6-4 3 1.2 1.6zM12 15v6h2v-6h-2zm1.6 5.2l-4-3-1.2 1.6 4 3 1.2-1.6zm12.8-3l-4 3 1.2 1.6 4-3-1.2-1.6zM24 21v-6h-2v6h2zm-1.6-5.2l4 3 1.2-1.6-4-3-1.2 1.6z' fill='%23fff' mask='url(%23a)'/%3E` +
  `%3C/g%3E%3Cdefs%3E` +
  `%3Cfilter id='filter0_d' x='4.333' y='7' width='27.333' height='24' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E` +
  `%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E` +
  `%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'/%3E` +
  `%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E` +
  `%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E` +
  `%3CfeBlend in2='BackgroundImageFix' result='effect1_dropShadow'/%3E` +
  `%3CfeBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape'/%3E` +
  `%3C/filter%3E%3C/defs%3E%3C/svg%3E") 15 15, default`;
