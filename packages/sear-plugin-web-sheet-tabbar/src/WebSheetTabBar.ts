const layersIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><g transform="translate(10 10) scale(1.08) translate(-10 -10)"><path d="M10 2.25 2.75 5.9 10 9.55l7.25-3.65L10 2.25Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="m3 9.4 7 3.5 7-3.5M3 13l7 3.5 7-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

const plusIcon = `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 2.75v14.5M2.75 10h14.5" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/></svg>`;

import { SheetTabBarAdapter } from './SheetTabBarAdapter';
import type { SheetTabBarModel } from './SheetBottomBarModels';

/** Browser DOM adapter for the sheet tabs segment of the bottom bar. */
export class WebSheetTabBar extends SheetTabBarAdapter<HTMLElement> {
  #container: HTMLElement | null = null;
  #root: HTMLElement | null = null;
  #model: SheetTabBarModel | null = null;
  #contextMenu: HTMLElement | null = null;
  #contextMenuDocument: Document | null = null;
  #contextMenuAnchor: HTMLElement | null = null;
  #draggingSheetId: string | null = null;
  readonly #dismissContextMenuOnPointerDown = (event: Event) => {
    if (!this.#contextMenu?.contains(event.target as Node) && !this.#contextMenuAnchor?.contains(event.target as Node))
      this.#closeContextMenu();
  };
  readonly #dismissContextMenuOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.#closeContextMenu();
  };

  public mount(target: HTMLElement, model: SheetTabBarModel): void {
    this.#container = target;
    this.#model = model;
    this.#render();
  }

  public update(model: SheetTabBarModel): void {
    this.#model = model;
    this.#render();
  }

  public destroy(): void {
    this.#closeContextMenu();
    this.#draggingSheetId = null;
    if (this.#root?.parentNode) {
      this.#root.parentNode.removeChild(this.#root);
    }
    this.#root = null;
    this.#container = null;
    this.#model = null;
  }

  #render(): void {
    if (!this.#container || !this.#model) return;
    const model = this.#model;
    this.#closeContextMenu();
    this.#draggingSheetId = null;
    if (this.#root?.parentNode) {
      this.#root.parentNode.removeChild(this.#root);
    }

    const root = document.createElement('div');
    root.className = 'sear-sheet-bottom-bar__tabs-panel';

    const sheets = document.createElement('button');
    sheets.type = 'button';
    sheets.className = 'sear-sheet-bottom-bar__icon-button';
    sheets.title = 'Sheets';
    sheets.setAttribute('aria-haspopup', 'menu');
    sheets.setAttribute('aria-expanded', 'false');
    sheets.innerHTML = layersIcon;
    sheets.addEventListener('click', () => {
      if (this.#contextMenuAnchor === sheets) this.#closeContextMenu();
      else this.#openSheetsMenu(sheets);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'sear-sheet-bottom-bar__add';
    add.title = 'Add Sheet';
    add.innerHTML = plusIcon;
    add.addEventListener('click', model.onAddSheetClick);

    const tabs = document.createElement('div');
    tabs.className = 'sear-sheet-bottom-bar__tabs';

    model.sheets.forEach((sheet) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = sheet.active
        ? 'sear-sheet-bottom-bar__tab sear-sheet-bottom-bar__tab--active'
        : 'sear-sheet-bottom-bar__tab';
      tab.textContent = sheet.name;
      tab.title = sheet.name;
      tab.dataset['sheetId'] = sheet.id;
      if (sheet.active) tab.setAttribute('aria-current', 'page');
      if (sheet.color) tab.style.setProperty('--sear-sheet-tab-color', sheet.color);
      tab.addEventListener('click', () => this.#model?.onActivateSheetClick(sheet.id));
      if (model.onRenameSheet) {
        const beginRename = () => {
          const input = document.createElement('input');
          input.className = 'sear-sheet-bottom-bar__rename';
          input.dataset['sheetId'] = sheet.id;
          input.setAttribute('aria-label', `Rename sheet ${sheet.name}`);
          input.value = sheet.name;
          const cancel = () => {
            if (input.isConnected) { input.replaceWith(tab); tab.focus(); }
          };
          input.addEventListener('input', () => input.setCustomValidity(''));
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.stopPropagation(); cancel(); return; }
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.stopPropagation();
            const error = this.#model?.onRenameSheet?.(sheet.id, input.value);
            if (error) { input.setCustomValidity(error); input.reportValidity(); }
            else cancel();
          });
          input.addEventListener('blur', () => {
            if (input.isConnected) input.replaceWith(tab);
          });
          tab.replaceWith(input);
          input.focus();
          input.select();
        };
        tab.addEventListener('dblclick', beginRename);
        tab.addEventListener('keydown', (event) => {
          if (event.key === 'F2') { event.preventDefault(); beginRename(); }
        });
        tab.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.#openContextMenu(tab, sheet.id, sheet.name, beginRename);
        });
      }
      if (model.onMoveSheet) {
        tab.draggable = true;
        tab.addEventListener('dragstart', (event) => {
          this.#draggingSheetId = sheet.id;
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', sheet.id);
          }
        });
        tab.addEventListener('dragover', (event) => {
          if (!this.#draggingSheetId || this.#draggingSheetId === sheet.id) return;
          event.preventDefault();
          const before = event.clientX < tab.getBoundingClientRect().left + tab.offsetWidth / 2;
          tab.classList.toggle('sear-sheet-bottom-bar__tab--drop-before', before);
          tab.classList.toggle('sear-sheet-bottom-bar__tab--drop-after', !before);
        });
        tab.addEventListener('dragleave', () => {
          tab.classList.remove('sear-sheet-bottom-bar__tab--drop-before', 'sear-sheet-bottom-bar__tab--drop-after');
        });
        tab.addEventListener('drop', (event) => {
          event.preventDefault();
          if (this.#draggingSheetId && this.#draggingSheetId !== sheet.id) {
            const before = event.clientX < tab.getBoundingClientRect().left + tab.offsetWidth / 2;
            this.#model?.onMoveSheet?.(this.#draggingSheetId, sheet.id, before);
          }
          this.#draggingSheetId = null;
          tab.classList.remove('sear-sheet-bottom-bar__tab--drop-before', 'sear-sheet-bottom-bar__tab--drop-after');
        });
        tab.addEventListener('dragend', () => {
          this.#draggingSheetId = null;
          tabs.querySelectorAll('.sear-sheet-bottom-bar__tab--drop-before, .sear-sheet-bottom-bar__tab--drop-after')
            .forEach((node) => node.classList.remove('sear-sheet-bottom-bar__tab--drop-before', 'sear-sheet-bottom-bar__tab--drop-after'));
        });
      }
      tabs.appendChild(tab);
    });

    root.append(sheets, add, tabs);
    this.#container.appendChild(root);
    this.#root = root;
  }

  #openSheetsMenu(anchor: HTMLElement): void {
    this.#closeContextMenu();
    const doc = anchor.ownerDocument;
    const menu = doc.createElement('div');
    menu.className = 'sear-sheet-bottom-bar__context-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Sheets');
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(4, rect.left)}px`;
    menu.style.bottom = `${Math.max(4, doc.defaultView!.innerHeight - rect.top + 4)}px`;
    for (const sheet of this.#model?.sheets ?? []) {
      const item = doc.createElement('button');
      item.type = 'button';
      item.textContent = sheet.name;
      item.setAttribute('role', 'menuitem');
      if (sheet.active) item.setAttribute('aria-current', 'page');
      item.addEventListener('click', () => {
        this.#closeContextMenu();
        this.#model?.onActivateSheetClick(sheet.id);
      });
      menu.appendChild(item);
    }
    doc.body.appendChild(menu);
    this.#contextMenu = menu;
    this.#contextMenuDocument = doc;
    this.#contextMenuAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    doc.addEventListener('pointerdown', this.#dismissContextMenuOnPointerDown);
    doc.addEventListener('keydown', this.#dismissContextMenuOnEscape);
    menu.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }

  #openContextMenu(tab: HTMLElement, sheetId: string, name: string, beginRename: () => void): void {
    this.#closeContextMenu();
    const doc = tab.ownerDocument;
    const menu = doc.createElement('div');
    menu.className = 'sear-sheet-bottom-bar__context-menu';
    menu.setAttribute('role', 'menu');
    const rect = tab.getBoundingClientRect();
    menu.style.left = `${Math.max(4, rect.left)}px`;
    menu.style.bottom = `${Math.max(4, doc.defaultView!.innerHeight - rect.top + 4)}px`;
    const rename = doc.createElement('button');
    rename.type = 'button'; rename.textContent = 'Rename'; rename.setAttribute('role', 'menuitem');
    rename.addEventListener('click', () => { this.#closeContextMenu(); beginRename(); });
    menu.appendChild(rename);
    if (this.#model?.onMoveSheet) {
      const index = this.#model.sheets.findIndex((sheet) => sheet.id === sheetId);
      for (const [label, offset, before] of [['Move left', -1, true], ['Move right', 1, false]] as const) {
        const move = doc.createElement('button');
        move.type = 'button'; move.textContent = label; move.setAttribute('role', 'menuitem');
        const neighbor = this.#model.sheets[index + offset];
        move.disabled = !neighbor;
        move.addEventListener('click', () => {
          this.#closeContextMenu();
          if (neighbor) this.#model?.onMoveSheet?.(sheetId, neighbor.id, before);
        });
        menu.appendChild(move);
      }
    }
    if (this.#model?.onDeleteSheet) {
      const remove = doc.createElement('button');
      remove.type = 'button'; remove.textContent = 'Delete sheet'; remove.setAttribute('role', 'menuitem');
      remove.disabled = this.#model.sheets.length <= 1;
      remove.addEventListener('click', () => {
        const message = doc.createElement('span');
        message.textContent = `Delete sheet "${name}"?`;
        const cancel = doc.createElement('button');
        cancel.type = 'button'; cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => this.#closeContextMenu());
        const confirm = doc.createElement('button');
        confirm.type = 'button'; confirm.textContent = 'Delete';
        confirm.addEventListener('click', () => {
          this.#closeContextMenu();
          this.#model?.onDeleteSheet?.(sheetId);
        });
        menu.replaceChildren(message, cancel, confirm);
        confirm.focus();
      });
      menu.appendChild(remove);
    }
    doc.body.appendChild(menu);
    this.#contextMenu = menu;
    this.#contextMenuDocument = doc;
    doc.addEventListener('pointerdown', this.#dismissContextMenuOnPointerDown);
    doc.addEventListener('keydown', this.#dismissContextMenuOnEscape);
    rename.focus();
  }

  #closeContextMenu(): void {
    this.#contextMenuAnchor?.setAttribute('aria-expanded', 'false');
    this.#contextMenuDocument?.removeEventListener('pointerdown', this.#dismissContextMenuOnPointerDown);
    this.#contextMenuDocument?.removeEventListener('keydown', this.#dismissContextMenuOnEscape);
    this.#contextMenu?.remove();
    this.#contextMenuDocument = null;
    this.#contextMenuAnchor = null;
    this.#contextMenu = null;
  }
}
