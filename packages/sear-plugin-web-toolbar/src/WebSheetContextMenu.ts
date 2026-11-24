import { Platform } from '@searsuite/sear-foundation-platform';

export interface SheetContextAction {
  readonly label: string;
  readonly run: () => void;
}

/** Browser menu for commands at a Sheet grid or header pointer location. */
export class WebSheetContextMenu {
  readonly #platform: Platform;

  #root: HTMLElement | null = null;
  #disposeOutside: (() => void) | null = null;
  #disposeKeydown: (() => void) | null = null;
  #previousFocus: HTMLElement | null = null;

  public constructor(platform: Platform) {
    this.#platform = platform;
  }

  public open(x: number, y: number, actions: readonly SheetContextAction[]): void {
    this.close();
    this.#previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menu = document.createElement('div');
    menu.className = 'sear-sheet-context-menu';
    menu.setAttribute('role', 'menu');
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.textContent = action.label;
      button.addEventListener('click', () => { action.run(); this.close(true); });
      menu.appendChild(button);
    }
    document.body.appendChild(menu);
    menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - menu.offsetWidth - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(y, window.innerHeight - menu.offsetHeight - 4))}px`;
    this.#root = menu;
    this.#disposeOutside = this.#platform.addEventListener(document, 'pointerdown', (event) => {
      if (!menu.contains((event as Event).target as Node)) this.close();
    });
    this.#disposeKeydown = this.#platform.addEventListener(document, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (!this.#root) return;
      if (key.key === 'Escape') {
        key.preventDefault();
        key.stopPropagation();
        this.close(true);
      } else if (key.key === 'ArrowDown' || key.key === 'ArrowUp') {
        const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        if (!items.length) return;
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = (index + (key.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        key.preventDefault();
        key.stopPropagation();
        items[next]?.focus();
      }
    });
    const first = menu.querySelector<HTMLButtonElement>('[role="menuitem"]');
    first?.focus({ preventScroll: true });
    // The grid may reclaim focus after the contextmenu event finishes dispatching.
    setTimeout(() => {
      if (this.#root === menu) first?.focus({ preventScroll: true });
    }, 0);
  }

  public close(restoreFocus = false): void {
    this.#disposeOutside?.();
    this.#disposeOutside = null;
    this.#disposeKeydown?.();
    this.#disposeKeydown = null;
    this.#root?.remove();
    this.#root = null;
    if (restoreFocus && this.#previousFocus?.isConnected) this.#previousFocus.focus({ preventScroll: true });
    this.#previousFocus = null;
  }
}
