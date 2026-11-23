
type ReplicaPopoverMenuItem =
  | {
      readonly kind: 'item';
      readonly key: string;
      readonly label: string;
      readonly submenu?: readonly ReplicaPopoverMenuItem[];
      readonly selected?: boolean;
      readonly shortcut?: string;
      readonly disabled?: boolean;
    }
  | {
      readonly kind: 'divider';
    };

type ReplicaPopoverDefinition =
  | {
      readonly kind: 'menu';
      readonly width: number;
      readonly items: readonly ReplicaPopoverMenuItem[];
    }
  | {
      readonly kind: 'palette';
      readonly width: number;
      readonly title: string;
      readonly colors: readonly ReplicaToolbarColor[];
    };

type ReplicaToolbarColor = {
  readonly label: string;
  readonly value: string | null;
};

const rightArrowIcon = `<svg width="8" height="16" fill="none" viewBox="0 0 8 16" class="_rightnarrowthins16"><path fill="currentColor" fill-rule="evenodd" d="M1 3.5a.5.5 0 0 0 .146.354L5.293 8l-4.146 4.146a.5.5 0 1 0 .707.708L6.707 8 1.854 3.146A.5.5 0 0 0 1 3.5Z"></path></svg>`;

const checkIcon = `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_check16"><path fill="currentColor" fill-rule="evenodd" d="M13.52 4.46a.65.65 0 0 1 .02.92l-6.25 6.53a.65.65 0 0 1-.94 0L2.46 7.85a.65.65 0 1 1 .94-.9l3.42 3.57 5.78-6.04a.65.65 0 0 1 .92-.02Z"></path></svg>`;

let nextPopoverId = 0;

const defaultColors: readonly ReplicaToolbarColor[] = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark gray', value: '#434343' },
  { label: 'Gray', value: '#666666' },
  { label: 'Red', value: '#fe0300' },
  { label: 'Orange', value: '#ff8f00' },
  { label: 'Yellow', value: '#fcc102' },
  { label: 'Green', value: '#00a870' },
  { label: 'Blue', value: '#256cfb' },
  { label: 'Purple', value: '#7a3ff2' },
  { label: 'Light red', value: '#ffe8e6' },
  { label: 'Light orange', value: '#fff0db' },
  { label: 'Light yellow', value: '#fff7cc' },
  { label: 'Light green', value: '#dff7eb' },
  { label: 'Light blue', value: '#e6f0ff' },
  { label: 'Light purple', value: '#efe6ff' },
  { label: 'White', value: '#ffffff' },
];

const fontColors: readonly ReplicaToolbarColor[] = [{ label: 'Default', value: null }, ...defaultColors];

const transparentFillColors: readonly ReplicaToolbarColor[] = [
  { label: 'No fill', value: 'transparent' },
  ...defaultColors.slice(9),
  ...defaultColors.slice(0, 9),
];

const popoverDefinitions: Readonly<Record<string, ReplicaPopoverDefinition>> = {
  menu: {
    kind: 'menu',
    width: 188,
    items: [
      { kind: 'item', key: 'new', label: 'New spreadsheet' },
      { kind: 'item', key: 'open', label: 'Open' },
      { kind: 'item', key: 'save', label: 'Save', shortcut: '⌘ S' },
      { kind: 'divider' },
      { kind: 'item', key: 'export', label: 'Export', submenu: menuItems('PDF', 'Excel', 'CSV') },
      { kind: 'item', key: 'settings', label: 'Spreadsheet settings' },
    ],
  },
  fontFamily: {
    kind: 'menu',
    width: 156,
    items: [
      { kind: 'item', key: 'default', label: 'Default', selected: true },
      { kind: 'item', key: 'Arial', label: 'Arial' },
      { kind: 'item', key: 'Calibri', label: 'Calibri' },
      { kind: 'item', key: 'Courier New', label: 'Courier New' },
      { kind: 'item', key: 'Georgia', label: 'Georgia' },
      { kind: 'item', key: 'Helvetica', label: 'Helvetica' },
      { kind: 'item', key: 'Times New Roman', label: 'Times New Roman' },
      { kind: 'item', key: 'Verdana', label: 'Verdana' },
    ],
  },
  fontSize: {
    kind: 'menu',
    width: 88,
    items: menuItems('8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36').map((item) =>
      item.kind === 'item' && item.label === '10' ? { ...item, selected: true } : item,
    ),
  },
  fontColor: { kind: 'palette', width: 214, title: 'Text color', colors: fontColors },
  borderSet: {
    kind: 'menu',
    width: 156,
    items: menuItems('All borders', 'Outside borders', 'Inside borders', 'No borders', 'Bottom border', 'Top border', 'Left border', 'Right border'),
  },
  fillColor: { kind: 'palette', width: 214, title: 'Fill color', colors: transparentFillColors },
  textWrap: {
    kind: 'menu',
    width: 132,
    items: [
      { kind: 'item', key: 'overflow', label: 'Overflow', selected: true },
      { kind: 'item', key: 'wrap', label: 'Wrap' },
      { kind: 'item', key: 'clip', label: 'Clip' },
    ],
  },
  mergeCell: {
    kind: 'menu',
    width: 144,
    items: menuItems('Merge cells', 'Merge rows', 'Merge columns', 'Unmerge cells'),
  },
  numberFormat: {
    kind: 'menu',
    width: 172,
    items: [
      { kind: 'item', key: 'auto', label: 'Auto', selected: true },
      {
        kind: 'item',
        key: 'number',
        label: 'Number',
        submenu: menuItems('Integer', 'Two decimals', 'Thousands separator', 'Red negatives', 'Parenthesized negatives', 'Red parenthesized negatives'),
      },
      {
        kind: 'item',
        key: 'currency',
        label: 'Currency',
        submenu: menuItems('Chinese yuan', 'US dollar', 'Euro', 'Japanese yen', 'Yuan with parenthesized negatives', 'Dollar with red negatives'),
      },
      {
        kind: 'item',
        key: 'accounting',
        label: 'Accounting',
        submenu: menuItems('Yuan accounting', 'Dollar accounting', 'Euro accounting', 'Accounting without symbol'),
      },
      {
        kind: 'item',
        key: 'date',
        label: 'Date',
        submenu: menuItems('Short date', 'Slash date', 'Chinese date', 'English short date', 'English long date', 'Date with weekday'),
      },
      {
        kind: 'item',
        key: 'time',
        label: 'Time',
        submenu: menuItems(
          '24-hour time',
          '24-hour time with seconds',
          '12-hour time',
          '12-hour time with seconds',
          'Date and time',
          'Elapsed hours',
          'Elapsed minutes',
          'Elapsed seconds',
        ),
      },
      {
        kind: 'item',
        key: 'fraction',
        label: 'Fraction',
        submenu: menuItems(
          'One-digit denominator',
          'Two-digit denominator',
          'Three-digit denominator',
          'Fixed denominator 2',
          'Fixed denominator 4',
          'Fixed denominator 8',
          'Fixed denominator 16',
          'Fixed denominator 100',
        ),
      },
      {
        kind: 'item',
        key: 'percent',
        label: 'Percent',
        submenu: menuItems('Integer percent', 'Percent, one decimal', 'Percent, two decimals', 'Percent, four decimals'),
      },
      {
        kind: 'item',
        key: 'scientific',
        label: 'Scientific',
        submenu: menuItems('Scientific integer', 'Scientific, one decimal', 'Scientific, two decimals', 'Scientific, three decimals', 'Three-digit exponent'),
      },
      {
        kind: 'item',
        key: 'special',
        label: 'Special',
        submenu: menuItems('Five-digit postal code', 'Nine-digit postal code', 'Phone number', 'Social security number', 'Chinese mobile number'),
      },
      { kind: 'item', key: 'plain', label: 'Text' },
      {
        kind: 'item',
        key: 'custom',
        label: 'Custom',
        submenu: menuItems('Hidden', 'Thousands', 'Millions', 'Weight', 'Conditional colors', 'Five-digit identifier'),
      },
      { kind: 'divider' },
      { kind: 'item', key: 'more', label: 'More number formats…' },
    ],
  },
  conditionalFormatting: {
    kind: 'menu',
    width: 180,
    items: [
      { kind: 'item', key: 'highlight', label: 'Highlight cells', submenu: menuItems('Cell value', 'Specific text', 'Duplicates', 'Unique values', 'Blanks', 'Nonblanks', 'Errors', 'No errors') },
      { kind: 'item', key: 'topBottomAverage', label: 'Top, bottom, and average', submenu: menuItems(
        'Top 10 items', 'Top 10%', 'Bottom 10 items', 'Bottom 10%', 'Above average', 'Below average',
      ) },
      ...menuItems('New rule', 'View existing rules'),
      { kind: 'item', key: 'clear', label: 'Clear rules', submenu: menuItems('Clear rules from selected cells', 'Clear rules from entire sheet') },
    ],
  },
  duplicate: {
    kind: 'menu',
    width: 156,
    items: menuItems('Highlight duplicates', 'Remove duplicates', 'Clear duplicate highlighting'),
  },
  filter: {
    kind: 'menu',
    width: 148,
    items: menuItems('Create filter', 'Edit filter', 'Clear filter', 'New filter view', 'Reapply filter'),
  },
  sort: {
    kind: 'menu',
    width: 148,
    items: menuItems('Sort sheet ascending', 'Sort sheet descending', 'Sort selection ascending', 'Sort selection descending', 'Custom sort'),
  },
  dataValidation: {
    kind: 'menu',
    width: 164,
    items: [
      { kind: 'item', key: 'setValidation', label: 'Set rule', submenu:
        menuItems('Custom', 'Dropdown', 'Number', 'Date', 'Text content/length', 'People', 'Image in cell',
          'Checkbox', 'Progress bar', 'Rating', 'Online document', 'Link', 'Attachment', 'ID number', 'Mobile number', 'Custom formula') },
      { kind: 'item', key: 'viewValidation', label: 'View all rules' },
    ],
  },
  image: {
    kind: 'menu',
    width: 144,
    items: menuItems('Image in cell', 'Floating image', 'Insert from URL'),
  },
  comment: {
    kind: 'menu',
    width: 136,
    items: menuItems('Add comment', 'View comments', 'Comment settings'),
  },
  more: {
    kind: 'menu',
    width: 160,
    items: [
      { kind: 'item', key: 'find', label: 'Find and replace' },
      ...menuItems('Protect range', 'Named range', 'Sheet history', 'Help center').map((item) => ({ ...item, disabled: true })),
    ],
  },
};

/**
 * Builds the static toolbar popover controller for menu-like replica controls.
 *
 * The controller only owns DOM interaction for dropdown previews. Selection
 * callbacks are forwarded to the toolbar host, which owns command dispatch.
 */
export function createReplicaToolbarPopovers(
  isDataValidationKindAvailable?: (label: string) => boolean,
  restoreFocusAfterEscape: (anchor: HTMLElement) => void = (anchor) => anchor.focus(),
): {
  readonly close: () => void;
  readonly open: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean;
} {
  let layer: HTMLElement | null = null;
  let anchorElement: HTMLElement | null = null;
  let activeKey: string | null = null;

  function onDocumentPointerDown(event: PointerEvent): void {
    if (event.target instanceof Node && (layer?.contains(event.target) || anchorElement?.contains(event.target))) return;
    close();
  }

  function onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !layer) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = anchorElement;
    close();
    if (anchor) restoreFocusAfterEscape(anchor);
  }

  function close(): void {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    document.removeEventListener('keydown', onDocumentKeyDown, true);
    if (layer?.parentNode) {
      layer.parentNode.removeChild(layer);
    }
    layer = null;
    anchorElement?.setAttribute('aria-expanded', 'false');
    anchorElement?.removeAttribute('aria-controls');
    anchorElement = null;
    activeKey = null;
  }

  function open(key: string, anchor: HTMLElement, onSelect?: (label: string, value?: string | null) => void): boolean {
    const baseDefinition = popoverDefinitions[key];
    const definition = key === 'dataValidation' && baseDefinition?.kind === 'menu' && isDataValidationKindAvailable
      ? { ...baseDefinition, items: baseDefinition.items.map((item) => item.kind === 'item' && item.submenu
        ? { ...item, submenu: item.submenu.map((choice) => choice.kind === 'item' &&
          !isDataValidationKindAvailable(choice.label)
          ? { ...choice, label: `${choice.label} (validator unavailable)`, disabled: true } : choice) }
        : item) }
      : baseDefinition;
    if (!definition) return false;
    if (layer && anchorElement === anchor && activeKey === key) {
      close();
      return true;
    }
    close();
    anchorElement = anchor;
    activeKey = key;

    const anchorRect = anchor.getBoundingClientRect();
    const nextLayer = document.createElement('div');
    nextLayer.id = `sear-toolbar-popovers-${++nextPopoverId}`;
    nextLayer.className = 'sear-toolbar-popovers';
    nextLayer.addEventListener('keydown', (event) => handleMenuKeyDown(event, anchor, close, restoreFocusAfterEscape));
    document.body.appendChild(nextLayer);
    layer = nextLayer;
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    anchor.setAttribute('aria-haspopup', definition.kind === 'menu' ? 'menu' : 'dialog');
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', nextLayer.id);

    const selectedLabel = key === 'numberFormat'
      ? anchor.querySelector<HTMLElement>('.wd3-select-normal-value')?.textContent?.trim()
      : undefined;
    const popover = renderDefinition(key, definition, 0, onSelect, close, selectedLabel);
    nextLayer.appendChild(popover);
    placePopover(popover, anchorRect.left, anchorRect.bottom + 6);
    if (definition.kind === 'menu') focusFirstMenuItem(popover);
    return true;
  }

  return { close, open };
}

function menuItems(...labels: readonly string[]): readonly ReplicaPopoverMenuItem[] {
  return labels.map((label) => ({ kind: 'item', key: label, label }));
}

function renderDefinition(
  key: string,
  definition: ReplicaPopoverDefinition,
  depth: number,
  onSelect: ((label: string, value?: string | null) => void) | undefined,
  close: () => void,
  selectedLabel?: string,
): HTMLElement {
  const popover = document.createElement('div');
  popover.className = 'styled__AnchorWrap-wd3__sc-1t8oyrg-1 Lrjrh __wdn_pop_anchor sear-toolbar-popover';
  popover.dataset['path'] = key;
  popover.dataset['depth'] = String(depth);
  popover.dataset['theme'] = 'classic';
  popover.dataset['colorScheme'] = 'light';

  const content = document.createElement('div');
  content.setAttribute('radius', 'xl');
  content.className = 'styled__ContentWrap-wd3__sc-1t8oyrg-0 hLwjMt wd3-popover';
  content.style.width = `${definition.width}px`;
  content.appendChild(
    definition.kind === 'menu'
      ? renderMenu(key, definition.items, depth, onSelect, close, selectedLabel)
      : renderPalette(key, definition.title, definition.colors, onSelect, close),
  );
  popover.appendChild(content);
  return popover;
}

function renderMenu(
  key: string,
  items: readonly ReplicaPopoverMenuItem[],
  depth: number,
  onSelect: ((label: string, value?: string | null) => void) | undefined,
  close: () => void,
  selectedLabel?: string,
): HTMLElement {
  const list = document.createElement('div');
  list.tabIndex = -1;
  list.setAttribute('role', 'menu');
  list.dataset['testid'] = `toolbar-popover-${key}`;
  list.className = 'styled__Wrap-wd3__sc-2oqy5e-0 fyAJWV wd3-menu wd3-list sear-toolbar-popover-menu';

  for (const item of items) {
    list.appendChild(item.kind === 'divider' ? renderDivider() : renderItem(key, item, depth, onSelect, close, selectedLabel));
  }
  return list;
}

function renderItem(
  key: string,
  item: Extract<ReplicaPopoverMenuItem, { readonly kind: 'item' }>,
  depth: number,
  onSelect: ((label: string) => void) | undefined,
  close: () => void,
  selectedLabel?: string,
): HTMLElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.tabIndex = -1;
  element.setAttribute('role', 'menuitem');
  if (item.disabled) element.setAttribute('aria-disabled', 'true');
  if (item.submenu) {
    element.setAttribute('aria-haspopup', 'menu');
    element.setAttribute('aria-expanded', 'false');
    element.dataset['submenuPath'] = `${key}-${item.key}`;
  }
  element.setAttribute('radius', 'l');
  element.dataset['testid'] = `toolbar-menu-item-${key}-${item.key}`;
  element.className = 'styled__Item-wd3__sc-2oqy5e-2 bhzgmE wd3-listitem sear-toolbar-popover-item';
  const selected = selectedLabel === undefined ? item.selected : item.label === selectedLabel;
  if (selected) element.classList.add('wd3-listitem-selected');

  const container = document.createElement('div');
  container.className = 'styled__Container-wd3__sc-2oqy5e-3 KJEJZ';

  const prefix = document.createElement('div');
  prefix.className = 'styled__Prefix-wd3__sc-2oqy5e-4 eKqQBI sear-toolbar-popover-prefix';
  prefix.innerHTML = selected ? checkIcon : '';
  container.appendChild(prefix);

  const label = document.createElement('div');
  label.className = 'styled__Content-wd3__sc-2oqy5e-6 NSwxD';
  label.textContent = item.label;
  container.appendChild(label);

  if (item.submenu || item.shortcut) {
    const suffix = document.createElement('div');
    suffix.className = 'styled__Suffix-wd3__sc-2oqy5e-5 hBpPBr';
    suffix.innerHTML = item.submenu ? rightArrowIcon : item.shortcut ?? '';
    container.appendChild(suffix);
  }

  element.appendChild(container);
  preserveEditorSelection(element);
  element.addEventListener('focus', () => markActivePeer(element));
  let submenuOpenedByHover = false;
  element.addEventListener('mouseenter', function handleToolbarPopoverItemMouseEnter() {
    markActivePeer(element);
    removeDeeperPopovers(depth);
    if (item.submenu) {
      openSubmenu(key, item, element, depth, onSelect, close);
      submenuOpenedByHover = true;
    }
  });
  element.addEventListener('click', function handleToolbarPopoverItemClick(event) {
    event.stopPropagation();
    if (item.disabled) return;
    if (item.submenu) {
      const submenuPath = `${key}-${item.key}`;
      const existing = document.querySelector<HTMLElement>(`.sear-toolbar-popover[data-path="${submenuPath}"]`);
      if (existing) {
        if (submenuOpenedByHover) {
          submenuOpenedByHover = false;
          return;
        }
        existing.remove();
        element.setAttribute('aria-expanded', 'false');
        return;
      }
      submenuOpenedByHover = false;
      openSubmenu(key, item, element, depth, onSelect, close);
      return;
    }
    onSelect?.(item.label);
    close();
  });
  return element;
}

function openSubmenu(
  key: string,
  item: Extract<ReplicaPopoverMenuItem, { readonly kind: 'item' }>,
  trigger: HTMLElement,
  depth: number,
  onSelect: ((label: string) => void) | undefined,
  close: () => void,
): void {
  if (!item.submenu) return;
  const rect = trigger.getBoundingClientRect();
  const popover = renderDefinition(
    `${key}-${item.key}`,
    { kind: 'menu', width: 196, items: item.submenu },
    depth + 1,
    onSelect,
    close,
  );
  trigger.setAttribute('aria-expanded', 'true');
  document.querySelector('.sear-toolbar-popovers')?.appendChild(popover);
  const right = rect.right + 8;
  placePopover(popover, right + popover.offsetWidth <= window.innerWidth - 4
    ? right : rect.left - popover.offsetWidth - 8, rect.top);
}

function renderPalette(
  key: string,
  title: string,
  colors: readonly ReplicaToolbarColor[],
  onSelect: ((label: string, value: string | null) => void) | undefined,
  close: () => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.dataset['testid'] = `toolbar-popover-${key}`;
  wrapper.className = 'sear-toolbar-color-menu';

  const heading = document.createElement('div');
  heading.className = 'sear-toolbar-color-title';
  heading.textContent = title;
  wrapper.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'sear-toolbar-color-grid';
  for (const color of colors) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'sear-toolbar-color-swatch';
    swatch.dataset['testid'] = `toolbar-color-${key}-${color.label}`;
    swatch.dataset['colorValue'] = color.value ?? '';
    swatch.title = color.label;
    preserveEditorSelection(swatch);
    if (color.value) swatch.style.background = color.value;
    else swatch.classList.add('sear-toolbar-color-swatch-default');
    swatch.addEventListener('click', function handleToolbarColorSwatchClick(event) {
      event.stopPropagation();
      onSelect?.(color.label, color.value);
      close();
    });
    grid.appendChild(swatch);
  }
  wrapper.appendChild(grid);
  return wrapper;
}

/** Prevents a popover click from moving focus away from an active text selection. */
function preserveEditorSelection(element: HTMLElement): void {
  element.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
}

function placePopover(popover: HTMLElement, left: number, top: number): void {
  const clampedLeft = Math.max(4, Math.min(Math.round(left), window.innerWidth - popover.offsetWidth - 4));
  const clampedTop = Math.max(4, Math.min(Math.round(top), window.innerHeight - popover.offsetHeight - 4));
  popover.style.left = `${clampedLeft}px`;
  popover.style.top = `${clampedTop}px`;
}

function removeDeeperPopovers(depth: number): void {
  document.querySelectorAll<HTMLElement>('.sear-toolbar-popover').forEach((popover) => {
    const popoverDepth = Number(popover.dataset['depth'] ?? '0');
    if (popoverDepth > depth) {
      const trigger = document.querySelector<HTMLElement>(`[data-testid="toolbar-menu-item-${popover.dataset['path']}"]`);
      trigger?.setAttribute('aria-expanded', 'false');
      popover.remove();
    }
  });
}

function focusFirstMenuItem(popover: HTMLElement): void {
  popover.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
}

function handleMenuKeyDown(
  event: KeyboardEvent,
  anchor: HTMLElement,
  close: () => void,
  restoreFocusAfterEscape: (anchor: HTMLElement) => void,
): void {
  const current = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[role="menuitem"]') : null;
  const menu = current?.closest<HTMLElement>('[role="menu"]');
  if (!current || !menu) return;
  const peers = Array.from(menu.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && child.getAttribute('role') === 'menuitem');
  const position = peers.indexOf(current);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    event.stopPropagation();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? peers.length - 1
      : (position + (event.key === 'ArrowDown' ? 1 : -1) + peers.length) % peers.length;
    peers[next]?.focus();
    return;
  }
  if (event.key === 'ArrowRight' || (event.key === 'Enter' || event.key === ' ') && current.hasAttribute('aria-haspopup')) {
    if (!current.hasAttribute('aria-haspopup')) return;
    event.preventDefault();
    event.stopPropagation();
    current.dispatchEvent(new MouseEvent('mouseenter'));
    const submenu = Array.from(document.querySelectorAll<HTMLElement>('.sear-toolbar-popover'))
      .find((popover) => popover.dataset['path'] === current.dataset['submenuPath']);
    if (submenu) focusFirstMenuItem(submenu);
    return;
  }
  if (event.key === 'ArrowLeft') {
    const popover = current.closest<HTMLElement>('.sear-toolbar-popover');
    if (Number(popover?.dataset['depth'] ?? 0) > 0) {
      event.preventDefault();
      event.stopPropagation();
      const trigger = document.querySelector<HTMLElement>(`[data-testid="toolbar-menu-item-${popover?.dataset['path']}"]`);
      popover?.remove();
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.focus();
    }
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    current.click();
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    restoreFocusAfterEscape(anchor);
  } else if (event.key === 'Tab') {
    close();
    anchor.focus();
  }
}

function markActivePeer(element: HTMLElement): void {
  const list = element.closest('.wd3-menu');
  list?.querySelectorAll('.wd3-listitem-active').forEach((node) => {
    node.classList.remove('wd3-listitem-active', 'kIzQrm');
    node.classList.add('bhzgmE');
  });
  element.classList.add('wd3-listitem-active', 'kIzQrm');
  element.classList.remove('bhzgmE');
}

function renderDivider(): HTMLElement {
  const divider = document.createElement('div');
  divider.setAttribute('role', 'separator');
  divider.className = 'styled__Divider-wd3__sc-2oqy5e-1 gRgTMr';
  return divider;
}
