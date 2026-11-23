import { DESIGNED_TOOLBAR_ICONS } from './DesignedToolbarIcons';

type InsertMenuItem =
  | {
      readonly kind: 'item';
      readonly key: string;
      readonly label: string;
      readonly icon?: string;
      readonly submenu?: boolean;
      readonly shortcut?: readonly string[];
      readonly badge?: string;
    }
  | {
      readonly kind: 'divider';
    };

const rightArrowIcon = `<svg width="8" height="16" fill="none" viewBox="0 0 8 16" class="_rightnarrowthins16"><path fill="currentColor" fill-rule="evenodd" d="M1 3.5a.5.5 0 0 0 .146.354L5.293 8l-4.146 4.146a.5.5 0 1 0 .707.708L6.707 8 1.854 3.146A.5.5 0 0 0 1 3.5Z"></path></svg>`;

/** Shared host icons for insert controls. */
const LEGACY_INSERT_MENU_ICONS = {
  dropdown: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor"/><path d="M4 6h4M4 9h3M10 7l2 2 2-2" stroke="currentColor"/></svg>`,
  pivot: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_pt16"><defs><clipPath id="insert-pt"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#insert-pt)"><path fill="currentColor" d="M6.35 2.5v1q0 .683.483 1.167.484.483 1.167.483h5.5q.683 0 1.167-.483.483-.484.483-1.167v-1q0-.683-.483-1.167Q14.183.85 13.5.85H8q-.683 0-1.167.483-.483.484-.483 1.167Zm1.403 1.247Q7.65 3.645 7.65 3.5v-1q0-.145.103-.247.102-.103.247-.103h5.5q.145 0 .248.103.102.102.102.247v1q0 .145-.102.247-.103.103-.248.103H8q-.145 0-.247-.103ZM.85 2.5v1q0 .683.483 1.167.484.483 1.167.483h1q.683 0 1.167-.483.483-.484.483-1.167v-1q0-.683-.483-1.167Q4.183.85 3.5.85h-1q-.683 0-1.167.483Q.85 1.817.85 2.5Zm1.403 1.247Q2.15 3.645 2.15 3.5v-1q0-.145.103-.247.102-.103.247-.103h1q.145 0 .248.103.102.102.102.247v1q0 .145-.102.247-.103.103-.248.103h-1q-.145 0-.247-.103ZM.85 8v5.5q0 .683.483 1.167.484.483 1.167.483h1q.683 0 1.167-.483.483-.484.483-1.167V8q0-.683-.483-1.167Q4.183 6.35 3.5 6.35h-1q-.683 0-1.167.483Q.85 7.317.85 8Zm1.403 5.747q-.103-.102-.103-.247V8q0-.145.103-.247.102-.103.247-.103h1q.145 0 .248.103.102.102.102.247v5.5q0 .145-.102.247-.103.103-.248.103h-1q-.145 0-.247-.103Z"></path><path fill="#256CFB" d="m14.54 8.96-.39-.39v3.93q0 .683-.483 1.167-.484.483-1.167.483H8.57l.39.39a.65.65 0 1 1-.92.92L6.08 13.5l1.96-1.96a.65.65 0 1 1 .92.92l-.39.39h3.93q.35 0 .35-.35V8.57l-.39.39a.65.65 0 1 1-.92-.92l1.96-1.96 1.96 1.96a.65.65 0 1 1-.92.92Z"></path></g></svg>`,
  image: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_image16"><path fill="currentColor" fill-rule="evenodd" d="M.85 3.5v8.9q0 .684.483 1.167.484.483 1.167.483h11q.683 0 1.167-.484.483-.483.483-1.166V3.5q0-.684-.483-1.167-.484-.483-1.167-.483h-11q-.684 0-1.167.484Q.85 2.817.85 3.5Zm1.402 9.148q-.102-.103-.102-.248V3.5q0-.35.35-.35h11q.145 0 .247.102.103.103.103.248v5.9l-2.019-2.073q-.423-.434-1.029-.438-.606-.004-1.035.425L4.34 12.74l.01.01H2.5q-.145 0-.248-.102Zm3.917.102H13.5q.35 0 .35-.35v-1.136l-2.95-3.03q-.044-.045-.107-.045-.062 0-.107.044L6.17 12.75ZM4.92 7.37a1.65 1.65 0 1 0 0-3.3 1.65 1.65 0 0 0 0 3.3Zm0-2a.35.35 0 1 1 0 .7.35.35 0 0 1 0-.7Z"></path></svg>`,
  floatImage: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_floatimage16"><defs><clipPath id="insert-floatimage"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#insert-floatimage)"><path fill="currentColor" fill-rule="evenodd" d="M.683 2.333V11q0 .683.484 1.167.483.483 1.166.483H11q.683 0 1.167-.483.483-.484.483-1.167V2.333q0-.683-.483-1.166Q11.683.683 11 .683H2.333q-.683 0-1.166.484-.484.483-.484 1.166Zm10.58 5.01.087.088V2.333q0-.145-.102-.247-.103-.103-.248-.103H2.333q-.35 0-.35.35V11q0 .35.35.35h1.731l4.007-4.007q.661-.66 1.596-.66.934 0 1.595.66ZM5 7.317A1.983 1.983 0 1 0 5 3.35a1.983 1.983 0 0 0 0 3.967Zm9.5-3.967a.65.65 0 0 1 .65.65v9.167q0 .821-.58 1.402-.582.581-1.403.581H4a.65.65 0 0 1 0-1.3h9.167q.283 0 .483-.2t.2-.483V4a.65.65 0 0 1 .65-.65ZM5 4.65a.683.683 0 1 1 0 1.367.683.683 0 0 1 0-1.367Zm6 6.7H5.903L8.99 8.262q.28-.28.677-.28.396 0 .676.28l.864.864a.65.65 0 0 0 .143.108V11q0 .35-.35.35Z"></path></g></svg>`,
  chart: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_tubiao16"><defs><clipPath id="insert-chart"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#insert-chart)"><path fill="currentColor" d="M5.666 1.833Q5.183 2.317 5.183 3v4.35H2.499q-.684 0-1.167.484Q.85 8.317.85 9v4.01q0 .684.483 1.167t1.167.483h3.334a.65.65 0 0 0 .124-.012h4.07a.65.65 0 0 0 .14.015H13.5q.683 0 1.166-.483.484-.483.484-1.167V7q0-.683-.484-1.167-.483-.483-1.166-.483h-2.684V3q0-.683-.483-1.167-.484-.483-1.167-.483H6.833q-.684 0-1.167.483Zm3.85 11.515H6.484V3q0-.145.102-.247.103-.103.248-.103h2.334q.145 0 .247.103.103.102.103.247v10.348Zm3.985.015h-2.684V6.65H13.5q.145 0 .247.103.103.102.103.247v6.013q0 .145-.103.248-.102.102-.247.102ZM2.149 13.01V9q0-.145.102-.247.103-.103.248-.103h2.684v4.71H2.499q-.145 0-.248-.102-.102-.103-.102-.248Z"></path></g></svg>`,
  formula: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_sigma16"><defs><clipPath id="insert-sigma"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#insert-sigma)"><path fill="currentColor" d="M13.462 12.063v1.625q0 .605-.428 1.034-.428.428-1.034.428H3.469q-.653 0-.945-.584-.292-.584.1-1.106L6.28 8.585q.439-.585 0-1.17L2.624 2.54q-.392-.522-.1-1.106.292-.584.945-.584H12q.606 0 1.034.428.428.429.428 1.034v1.625a.65.65 0 1 1-1.3 0V2.312q0-.162-.162-.162H3.956L7.32 6.635q.455.607.455 1.365T7.32 9.365L3.956 13.85H12q.162 0 .162-.162v-1.625a.65.65 0 0 1 1.3 0Z"></path></g></svg>`,
  mention: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_mention16"><path fill="currentColor" fill-rule="evenodd" d="M10.503 14.839h.002l-.447-1.222q-.991.364-2.058.364-2.477 0-4.229-1.752Q2.019 10.478 2.019 8q0-2.477 1.752-4.229Q5.523 2.02 8 2.02q2.477 0 4.229 1.752 1.752 1.752 1.752 4.23 0 .304-.03.605v.002a.65.65 0 0 0 .003.164q-.09.552-.482 1.053-.485.62-1.051.62t-1.052-.62q-.509-.65-.509-1.383V5.348a.65.65 0 0 0-1.238-.277q-.879-.815-2.064-.815-1.398 0-2.37 1.133Q4.257 6.478 4.257 8q0 1.522.933 2.611.971 1.134 2.369 1.134 1.397 0 2.369-1.134.114-.133.214-.272.095.148.205.288.39.499.888.787.57.33 1.187.33.616 0 1.186-.33.497-.288.888-.787.366-.467.573-1.032.213-.583.213-1.153a.655.655 0 0 0-.008-.101q.008-.17.008-.34 0-3.017-2.133-5.149Q11.016.719 8 .719q-3.016 0-5.148 2.133Q.719 4.984.719 8q0 3.016 2.133 5.148Q4.984 15.281 8 15.281q1.296 0 2.503-.442ZM6.176 9.765q-.62-.724-.62-1.765t.62-1.765q.582-.68 1.382-.68.8 0 1.382.68.62.724.62 1.765t-.62 1.765q-.582.68-1.382.68-.8 0-1.382-.68Z"></path></svg>`,
  comment: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_comment16"><path fill="currentColor" fill-rule="evenodd" d="M5.15 7.3a.65.65 0 0 1 0-1.3h5.7a.65.65 0 0 1 0 1.3h-5.7Zm0 3a.65.65 0 0 1 0-1.3h3.2a.65.65 0 1 1 0 1.3h-3.2Z"></path><path fill="currentColor" fill-rule="evenodd" d="M15 8.467v-.934A6.533 6.533 0 0 0 8.467 1h-.934A6.533 6.533 0 0 0 1 7.533v7c0 .258.21.467.467.467h7A6.533 6.533 0 0 0 15 8.467Zm-1.3 0v-.934q0-2.167-1.533-3.7Q10.635 2.3 8.467 2.3h-.934q-2.167 0-3.7 1.533Q2.3 5.366 2.3 7.533V13.7h6.167q2.168 0 3.7-1.533 1.533-1.533 1.533-3.7Z"></path></svg>`,
  time: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_time16"><path fill="currentColor" fill-rule="evenodd" d="M8 15.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM8 1.8a6.2 6.2 0 1 1 0 12.4A6.2 6.2 0 0 1 8 1.8ZM7.35 4a.65.65 0 1 1 1.3 0v3.35H12a.65.65 0 1 1 0 1.3H7.35V4Z"></path></svg>`,
  link: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_link16"><path fill="currentColor" fill-rule="evenodd" d="M11.54 8.54a.65.65 0 1 0 .92.92l1.5-1.5Q15.186 6.734 15.186 5T13.96 2.04Q12.734.815 11 .815T8.04 2.04l-1.5 1.5a.65.65 0 0 0 .92.92l1.5-1.5q.845-.845 2.04-.845t2.04.845q.846.845.846 2.04t-.846 2.04l-1.5 1.5ZM10.65 6a.65.65 0 0 1-.19.46l-4 4a.65.65 0 1 1-.92-.92l4-4a.65.65 0 0 1 1.11.46Zm-6 1a.65.65 0 0 1-.19.46l-1.5 1.5q-.846.845-.846 2.04t.846 2.04q.845.846 2.04.846t2.04-.846l1.5-1.5a.65.65 0 1 1 .92.92l-1.5 1.5Q6.734 15.186 5 15.186T2.04 13.96Q.814 12.734.814 11T2.04 8.04l1.5-1.5A.65.65 0 0 1 4.65 7Z"></path></svg>`,
  attachment: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_attachment16"><path fill="currentColor" fill-rule="evenodd" d="M10.361 5.313 5.967 9.708q-.224.223-.224.54 0 .316.224.54.224.224.54.224.317 0 .541-.224l4.894-4.894q.638-.638.638-1.54 0-.903-.638-1.54-.638-.639-1.54-.639t-1.54.638L3.955 7.72q-1.048 1.048-1.048 2.529 0 1.481 1.048 2.529 1.053 1.053 2.542 1.047 1.49-.005 2.535-1.066l3.905-3.966a.65.65 0 1 1 .927.912L9.959 13.67q-1.425 1.447-3.456 1.455-2.03.007-3.466-1.429-1.429-1.428-1.429-3.448T3.037 6.8l4.905-4.906Q8.962.875 10.402.875t2.46 1.019q1.018 1.019 1.018 2.46 0 1.44-1.019 2.46l-4.894 4.894q-.604.604-1.46.604-.854 0-1.459-.604-.605-.605-.605-1.46t.605-1.46l4.394-4.394a.65.65 0 1 1 .92.92Z"></path></svg>`,
  reaction: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_like16"><path fill="currentColor" d="M5.601 13.803h5.782q.565 0 1.004-.354.44-.354.56-.906l1.012-4.655q.086-.397-.17-.714-.254-.317-.661-.317H9.611a.65.65 0 0 1-.65-.65v-2.51q0-.621-.44-1.06-.289-.29-.658-.39L5.601 7.419v6.385Zm-1.075-7.17 2.339-5.347a.65.65 0 0 1 .595-.39q1.16 0 1.981.821.82.82.82 1.98v1.86h2.867q1.029 0 1.674.801t.427 1.806l-1.012 4.655q-.217 1-1.014 1.642-.797.642-1.82.642H2.866q-.89 0-1.52-.63t-.63-1.52v-4.17q0-.89.63-1.52t1.52-.63h1.66Zm-2.261 6.921q.249.25.6.25h1.436V7.932H2.866q-.352 0-.601.249-.25.249-.25.6v4.171q0 .352.25.601Z"></path></svg>`,
  checkbox: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_fieldcheckbox16"><path fill="currentColor" fill-rule="evenodd" d="M14.167 14.167q.483-.483.483-1.167V3q0-.683-.483-1.167Q13.683 1.35 13 1.35H3q-.683 0-1.167.483Q1.35 2.317 1.35 3v10q0 .684.483 1.167.484.483 1.167.483h10q.683 0 1.167-.483ZM13.35 3v10q0 .35-.35.35H3q-.35 0-.35-.35V3q0-.35.35-.35h10q.35 0 .35.35ZM11.409 5.63a.75.75 0 1 0-1.258-.818l-3.04 4.677-1.299-1.67a.75.75 0 1 0-1.184.92l1.946 2.502a.75.75 0 0 0 1.22-.051l3.615-5.56Z"></path></svg>`,
} as const;

export const INSERT_MENU_ICONS = {
  ...LEGACY_INSERT_MENU_ICONS,
  pivot: DESIGNED_TOOLBAR_ICONS.pivotTable,
  image: DESIGNED_TOOLBAR_ICONS.image,
  formula: DESIGNED_TOOLBAR_ICONS.formula,
  comment: DESIGNED_TOOLBAR_ICONS.comment,
  link: DESIGNED_TOOLBAR_ICONS.link,
} as const;

const mainMenuItems: readonly InsertMenuItem[] = [
  { kind: 'item', key: 'pivotTable', label: 'Pivot table', icon: INSERT_MENU_ICONS.pivot },
  { kind: 'divider' },
  { kind: 'item', key: 'insertCellImg', label: 'Image in cell', icon: INSERT_MENU_ICONS.image },
  { kind: 'item', key: 'insertFloatImg', label: 'Floating image', icon: INSERT_MENU_ICONS.floatImage },
  { kind: 'divider' },
  { kind: 'item', key: 'chart', label: 'Chart', icon: INSERT_MENU_ICONS.chart },
  { kind: 'item', key: 'formula', label: 'Formula', icon: INSERT_MENU_ICONS.formula, submenu: true },
  { kind: 'divider' },
  { kind: 'item', key: 'mention', label: 'Mention', icon: INSERT_MENU_ICONS.mention },
  { kind: 'item', key: 'cell-comment', label: 'Comment', icon: INSERT_MENU_ICONS.comment, shortcut: ['⌘', 'Shift', 'M'] },
  { kind: 'item', key: 'insertSchedule', label: 'Reminder', icon: INSERT_MENU_ICONS.time },
  { kind: 'divider' },
  { kind: 'item', key: 'alidoc', label: 'Online document', icon: INSERT_MENU_ICONS.attachment },
  { kind: 'item', key: 'link-cell', label: 'Link', icon: INSERT_MENU_ICONS.link, shortcut: ['⌘', 'K'] },
  { kind: 'item', key: 'attachment', label: 'Attachment', icon: INSERT_MENU_ICONS.attachment },
  { kind: 'item', key: 'reaction', label: 'Reaction', icon: INSERT_MENU_ICONS.reaction },
  { kind: 'divider' },
  { kind: 'item', key: 'checkboxCell', label: 'Checkbox', icon: INSERT_MENU_ICONS.checkbox },
];

const formulaMenuItems: readonly InsertMenuItem[] = [
  { kind: 'item', key: 'mbi-formula-generate-ai', label: 'Write a formula with AI', badge: 'NEW' },
  { kind: 'item', key: 'mbi-formula-ai', label: 'AI formula', submenu: true, badge: 'NEW' },
  { kind: 'divider' },
  { kind: 'item', key: 'sum', label: 'Sum' },
  { kind: 'item', key: 'average', label: 'Average' },
  { kind: 'item', key: 'count', label: 'Count' },
  { kind: 'item', key: 'max', label: 'Max' },
  { kind: 'item', key: 'min', label: 'Min' },
  { kind: 'divider' },
  { kind: 'item', key: 'formula-right-panel', label: 'All functions' },
  { kind: 'item', key: 'calc-option', label: 'Calculation options' },
];

const aiFormulaMenuItems: readonly InsertMenuItem[] = [
  { kind: 'item', key: 'formula-ai', label: 'AI' },
  { kind: 'item', key: 'formula-ai.classify', label: 'AI.CLASSIFY' },
  { kind: 'item', key: 'formula-ai.extract', label: 'AI.EXTRACT' },
  { kind: 'item', key: 'formula-ai.summarize', label: 'AI.SUMMARIZE' },
  { kind: 'item', key: 'formula-ai.translate', label: 'AI.TRANSLATE' },
  { kind: 'item', key: 'formula-ai.sentianaysis', label: 'AI.SENTIANAYSIS' },
];

/** Builds the static insert-menu cascade used by the toolbar replica. */
export function createReplicaInsertMenu(onUnavailableAction: () => void): {
  readonly close: () => void;
  readonly open: (anchor: HTMLElement) => void;
  readonly toggle: (anchor: HTMLElement) => void;
} {
  let layer: HTMLElement | null = null;
  let anchorElement: HTMLElement | null = null;

  function close(): void {
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
    layer = null;
    anchorElement = null;
  }

  function open(anchor: HTMLElement): void {
    if (layer && anchorElement === anchor) return;
    close();
    anchorElement = anchor;

    const anchorRect = anchor.getBoundingClientRect();
    const nextLayer = document.createElement('div');
    nextLayer.className = 'sear-toolbar-insert-popovers';
    document.body.appendChild(nextLayer);
    layer = nextLayer;

    const mainPopover = renderPopover('', mainMenuItems, onUnavailableAction, {
      formula: () => openFormulaMenu(mainPopover),
    });
    mainPopover.style.left = `${Math.round(anchorRect.left)}px`;
    mainPopover.style.top = `${Math.round(anchorRect.bottom + 8)}px`;
    nextLayer.appendChild(mainPopover);
  }

  function toggle(anchor: HTMLElement): void {
    if (layer && anchorElement === anchor) {
      close();
      return;
    }
    open(anchor);
  }

  function openFormulaMenu(mainPopover: HTMLElement): void {
    if (!layer) return;
    removePopover('formula-mbi-formula-ai');
    removePopover('formula');
    const formulaTrigger = mainPopover.querySelector<HTMLElement>('[data-item-key="formula"]');
    const formulaRect = formulaTrigger?.getBoundingClientRect() ?? mainPopover.getBoundingClientRect();
    const formulaPopover = renderPopover('formula', formulaMenuItems, onUnavailableAction, {
      'mbi-formula-ai': () => openAiFormulaMenu(formulaPopover),
    });
    formulaPopover.style.left = `${Math.round(formulaRect.right + 8)}px`;
    formulaPopover.style.top = `${Math.round(formulaRect.top)}px`;
    layer.appendChild(formulaPopover);
  }

  function openAiFormulaMenu(formulaPopover: HTMLElement): void {
    if (!layer) return;
    removePopover('formula-mbi-formula-ai');
    const aiFormulaTrigger = formulaPopover.querySelector<HTMLElement>('[data-item-key="mbi-formula-ai"]');
    const aiFormulaRect = aiFormulaTrigger?.getBoundingClientRect() ?? formulaPopover.getBoundingClientRect();
    const aiFormulaPopover = renderPopover('formula-mbi-formula-ai', aiFormulaMenuItems, onUnavailableAction, {});
    aiFormulaPopover.style.left = `${Math.round(aiFormulaRect.right + 8)}px`;
    aiFormulaPopover.style.top = `${Math.round(aiFormulaRect.top)}px`;
    layer.appendChild(aiFormulaPopover);
  }

  function removePopover(path: string): void {
    layer?.querySelector<HTMLElement>(`.sear-toolbar-insert-popover[data-path="${path}"]`)?.remove();
  }

  return { close, open, toggle };
}

function renderPopover(
  path: string,
  items: readonly InsertMenuItem[],
  onUnavailableAction: () => void,
  submenuHandlers: Readonly<Record<string, (target: HTMLElement) => void>>,
): HTMLElement {
  const anchor = document.createElement('div');
  anchor.className = 'styled__AnchorWrap-wd3__sc-1t8oyrg-1 Lrjrh __wdn_pop_anchor sear-toolbar-insert-popover';
  anchor.dataset['path'] = path;
  anchor.dataset['theme'] = 'classic';
  anchor.dataset['colorScheme'] = 'light';

  const content = document.createElement('div');
  content.setAttribute('radius', 'xl');
  content.className = 'styled__ContentWrap-wd3__sc-1t8oyrg-0 hLwjMt wd3-popover';

  const contentInner = document.createElement('div');
  const list = document.createElement('div');
  list.tabIndex = -1;
  list.dataset['path'] = path;
  list.dataset['testid'] = path ? `ContextMenuWrap__${path.replaceAll('-', '__')}` : 'ContextMenuWrap';
  list.className = 'styled__Wrap-wd3__sc-2oqy5e-0 fyAJWV wd3-menu wd3-list';

  for (const item of items) {
    list.appendChild(
      item.kind === 'divider' ? renderDivider() : renderMenuItem(item, onUnavailableAction, submenuHandlers[item.key]),
    );
  }

  contentInner.appendChild(list);
  content.appendChild(contentInner);
  anchor.appendChild(content);
  return anchor;
}

function renderMenuItem(
  item: Extract<InsertMenuItem, { readonly kind: 'item' }>,
  onUnavailableAction: () => void,
  onSubmenuHover: ((target: HTMLElement) => void) | undefined,
): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('radius', 'l');
  element.dataset['itemKey'] = item.key;
  element.dataset['testid'] = `menu-item-${item.key}`;
  element.className = 'styled__Item-wd3__sc-2oqy5e-2 bhzgmE wd3-listitem';

  const container = document.createElement('div');
  container.className = 'styled__Container-wd3__sc-2oqy5e-3 KJEJZ';

  if (item.icon) {
    const prefix = document.createElement('div');
    prefix.className = 'styled__Prefix-wd3__sc-2oqy5e-4 eKqQBI';
    prefix.innerHTML = namespaceSvgIds(item.icon);
    container.appendChild(prefix);
  }

  const content = document.createElement('div');
  content.className = 'styled__Content-wd3__sc-2oqy5e-6 NSwxD';
  const label = document.createElement('span');
  label.textContent = item.label;
  content.appendChild(label);
  if (item.badge) content.appendChild(renderBadge(item.badge));
  container.appendChild(content);

  if (item.submenu || item.shortcut) {
    const suffix = document.createElement('div');
    suffix.className = 'styled__Suffix-wd3__sc-2oqy5e-5 hBpPBr';
    suffix.appendChild(item.submenu ? renderArrow() : renderShortcut(item.shortcut ?? []));
    container.appendChild(suffix);
  }

  element.appendChild(container);
  if (item.submenu && onSubmenuHover) {
    element.addEventListener('mouseenter', function handleInsertMenuSubmenuMouseEnter() {
      markActivePeer(element);
      onSubmenuHover(element);
    });
  } else {
    element.addEventListener('mouseenter', function handleInsertMenuItemMouseEnter() {
      markActivePeer(element);
    });
  }
  if (!item.submenu) element.addEventListener('click', onUnavailableAction);
  return element;
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

function renderArrow(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'styled__SuffixWrapper-wd3__sc-1p5lith-0 fUGJGD';
  wrapper.innerHTML = rightArrowIcon;
  return wrapper;
}

function renderShortcut(shortcut: readonly string[]): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('radius', 's');
  wrapper.className = 'styled__TagRoot-wd3__sc-1h3bz0l-1 ASrSC wd3-shortcuts';
  for (const key of shortcut) {
    const kbd = document.createElement('kbd');
    kbd.className = 'styled__Shortcut-wd3__sc-1h3bz0l-5 iAhaLo';
    kbd.textContent = key;
    wrapper.appendChild(kbd);
  }
  return wrapper;
}

function renderBadge(text: string): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'styled__New-wd3__sc-1r77y4-0 jblsrf wd3-badge-new';
  const label = document.createElement('span');
  label.textContent = text;
  badge.appendChild(label);
  return badge;
}

function namespaceSvgIds(svg: string): string {
  const namespace = `sear-insert-${Math.random().toString(36).slice(2)}-`;
  return svg.replace(/id="([^"]+)"/g, `id="${namespace}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${namespace}$1)`);
}
