const gridIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><g transform="translate(10 10) scale(1.2) translate(-10 -10)"><rect x="3.25" y="3.25" width="13.5" height="13.5" rx="1.25" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 7.5h13M3.5 12.5h13M7.5 3.5v13M12.5 3.5v13" stroke="currentColor" stroke-width="1.1"/></g></svg>`;

const plusIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 2.75v14.5M2.75 10h14.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/></svg>`;

const minusIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M2.75 10h14.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/></svg>`;

import { SheetStatusBarAdapter } from './SheetStatusBarAdapter';
import type { SheetStatusBarModel } from './SheetBottomBarModels';

/** Browser DOM adapter for the status and zoom segment of the bottom bar. */
export class WebSheetStatusBar extends SheetStatusBarAdapter<HTMLElement> {
  #container: HTMLElement | null = null;
  #root: HTMLElement | null = null;
  #model: SheetStatusBarModel | null = null;

  public mount(target: HTMLElement, model: SheetStatusBarModel): void {
    this.#container = target;
    this.#model = model;
    this.#render();
  }

  public update(model: SheetStatusBarModel): void {
    this.#model = model;
    this.#render();
  }

  public destroy(): void {
    if (this.#root?.parentNode) {
      this.#root.parentNode.removeChild(this.#root);
    }
    this.#root = null;
    this.#container = null;
    this.#model = null;
  }

  #render(): void {
    if (!this.#container || !this.#model) return;
    if (this.#root?.parentNode) {
      this.#root.parentNode.removeChild(this.#root);
    }

    const root = document.createElement('div');
    root.className = 'sear-sheet-bottom-bar__status-panel';

    const status = document.createElement('span');
    status.className = 'sear-sheet-bottom-bar__status';
    status.textContent = this.#model.statusText;

    const grid = document.createElement('button');
    grid.type = 'button';
    grid.className = 'sear-sheet-bottom-bar__grid';
    grid.title = 'View Options';
    grid.innerHTML = gridIcon;
    grid.disabled = !this.#model.onViewOptionsClick;
    if (this.#model.onViewOptionsClick) grid.addEventListener('click', this.#model.onViewOptionsClick);

    const divider = document.createElement('span');
    divider.className = 'sear-sheet-bottom-bar__divider';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'sear-sheet-bottom-bar__zoom-button';
    minus.title = 'Zoom out';
    minus.disabled = !this.#model.zoomEnabled;
    minus.innerHTML = minusIcon;
    minus.addEventListener('click', this.#model.onZoomOutClick);

    const zoom = document.createElement('span');
    zoom.className = 'sear-sheet-bottom-bar__zoom-value';
    zoom.textContent = this.#model.zoomText;

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'sear-sheet-bottom-bar__zoom-button';
    plus.title = 'Zoom in';
    plus.disabled = !this.#model.zoomEnabled;
    plus.innerHTML = plusIcon;
    plus.addEventListener('click', this.#model.onZoomInClick);

    root.append(status, grid, divider, minus, zoom, plus);
    this.#container.appendChild(root);
    this.#root = root;
  }
}
