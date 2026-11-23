import { createReplicaInsertMenu, INSERT_MENU_ICONS } from './ReplicaInsertMenu';
import { createReplicaToolbarPopovers } from './ReplicaToolbarPopovers';
import { DESIGNED_TOOLBAR_ICONS } from './DesignedToolbarIcons';

type ReplicaToolbarControl =
  | {
      readonly kind: 'button';
      readonly id?: string;
      readonly label?: string;
      readonly icon: string;
      readonly size: 'small' | 'large';
      readonly disabled?: boolean;
      readonly menu?: boolean;
      readonly popoverKey?: string;
      readonly width?: number;
      readonly nowrap?: boolean;
    }
  | {
      readonly kind: 'select';
      readonly id?: string;
      readonly popoverKey?: string;
      readonly value: string;
      readonly width: number;
    }
  | {
      readonly kind: 'input-select';
      readonly id?: string;
      readonly popoverKey?: string;
      readonly value: string;
      readonly width: number;
    }
  | {
      readonly kind: 'split';
      readonly id?: string;
      readonly popoverKey?: string;
      readonly icon: string;
      readonly width: number;
    };

type ReplicaToolbarGroup =
  | {
      readonly kind: 'single';
      readonly controls: readonly ReplicaToolbarControl[];
    }
  | {
      readonly kind: 'rows';
      readonly rows: readonly (readonly ReplicaToolbarControl[])[];
    };

type ReplicaToolbarSelectionHandler = (controlId: string | undefined, label: string, value?: string | null) => void;

/** Stable identifiers for command-backed Sheet toolbar controls. */
export const SheetToolbarControlId = {
  CellFill: 'fill-color',
  FindReplace: 'toolbar-find-replace',
} as const;

const ICON_CONTROL_NAMES: Readonly<Record<string, string>> = {
  'toolbar-undo': 'Undo',
  'toolbar-redo': 'Redo',
  'toolbar-brush': 'Format painter',
  'toolbar-eraser': 'Clear formatting',
  'toolbar-paste': 'Paste',
  'toolbar-cut': 'Cut',
  'toolbar-copy': 'Copy',
  'font-color': 'Font color',
  'toolbar-bold': 'Bold',
  'toolbar-italic': 'Italic',
  'toolbar-underline': 'Underline',
  'toolbar-crossOut': 'Strikethrough',
  'border-set': 'Borders',
  'fill-color': 'Fill color',
  'toolbar-alignTop': 'Align top',
  'toolbar-alignCenter': 'Align middle',
  'toolbar-alignBottom': 'Align bottom',
  'toolbar-increase-indent': 'Increase indent',
  'toolbar-leftAlign': 'Align left',
  'toolbar-centerAlign': 'Align center',
  'toolbar-rightAlign': 'Align right',
  'toolbar-decrease-indent': 'Decrease indent',
  'toolbar-wrap': 'Wrap text',
  MergeCellButton: 'Merge cells',
  'toolbar-currencyFormat': 'Currency format',
  'toolbar-percentFormat': 'Percent format',
  'toolbar-decimalPointPlus': 'Increase decimal places',
  'toolbar-decimalPointMinus': 'Decrease decimal places',
};

const arrowIcon = `<svg class="wd3-tb-menu-arrow" fill="none" width="7" height="16" viewBox="0 0 7 16"><path d="M.4 6.2h5.8L3.3 9.6.4 6.2Z" fill="currentColor"/></svg>`;

const LEGACY_ICONS = {
  search: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="m12.5 12.5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  menu: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_menu20" size="20" data-spm-anchor-id="a2q1e.22919292.0.i0.1bdetfjatfja0A"><defs><clipPath id="4cde69_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#4cde69_0)"><path fill="currentColor" d="M3 15.25h14a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1 0-1.5Zm0-6a.75.75 0 1 0 0 1.5h14a.75.75 0 0 0 0-1.5H3Zm0-6h14a.75.75 0 0 1 0 1.5H3a.75.75 0 1 1 0-1.5Z"></path></g></svg>`,
  insert: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_addcirclefill20" size="20"><path fill="currentColor" fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12v3.25h2.75a.75.75 0 0 1 0 1.5h-2.75v2.75a.75.75 0 0 1-1.5 0v-2.75H6a.75.75 0 0 1 0-1.5h3.25V6a.75.75 0 1 1 1.5 0Z"></path></svg>`,
  undo: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_undo16" size="16"><path fill="currentColor" fill-rule="evenodd" d="M5.15 1.5a.65.65 0 0 1-.19.46L3.07 3.85H9q2.133 0 3.642 1.508Q14.15 6.867 14.15 9t-1.508 3.642Q11.133 14.15 9 14.15H4.5a.65.65 0 1 1 0-1.3H9q1.595 0 2.723-1.128Q12.85 10.595 12.85 9t-1.127-2.722Q10.595 5.15 9 5.15H3.07l1.89 1.89a.65.65 0 0 1-.92.92L.58 4.5l3.46-3.46a.65.65 0 0 1 1.11.46Z"></path></svg>`,
  redo: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_redo16" size="16"><path fill="currentColor" fill-rule="evenodd" d="M10.85 1.5a.65.65 0 0 0 .19.46l1.89 1.89H7q-2.133 0-3.642 1.508Q1.85 6.867 1.85 9t1.508 3.642Q4.867 14.15 7 14.15h4.5a.65.65 0 1 0 0-1.3H7q-1.595 0-2.722-1.128Q3.15 10.595 3.15 9t1.128-2.722Q5.405 5.15 7 5.15h5.93l-1.89 1.89a.65.65 0 0 0 .92.92l3.46-3.46-3.46-3.46a.65.65 0 0 0-1.11.46Z"></path></svg>`,
  clipboard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="2" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M6 2V1.5A1.5 1.5 0 0 1 7.5 0h1A1.5 1.5 0 0 1 10 1.5V2" stroke="currentColor" stroke-width="1.3"/></svg>`,
  cut: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 10.5 11 2M9.5 10.5 5 2" stroke="currentColor" stroke-width="1.3"/></svg>`,
  copy: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V2.5A1.5 1.5 0 0 1 4.5 1H9" stroke="currentColor" stroke-width="1.3"/></svg>`,
  brush: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_brush16" size="16"><defs><clipPath id="a31069_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#a31069_0)"><path fill="currentColor" d="M.683 2.667V4q0 .822.581 1.402.581.581 1.403.581h8q.821 0 1.402-.58.581-.581.581-1.403v-.017h.683q.283 0 .484.2.2.2.2.484v2q0 .283-.2.483t-.484.2H8q-.822 0-1.402.581-.581.58-.581 1.402v.684H6q-.545 0-.931.385-.386.386-.386.931V14q0 .545.386.931t.931.386h1.333q.546 0 .931-.386.386-.386.386-.931v-2.667q0-.545-.386-.93-.385-.386-.93-.386h-.017v-.684q0-.283.2-.483T8 8.65h5.333q.822 0 1.403-.58.58-.582.58-1.403v-2q0-.822-.58-1.403-.581-.58-1.403-.58h-.683v-.017q0-.822-.58-1.403-.582-.58-1.403-.58h-8q-.822 0-1.403.58-.58.581-.58 1.403Zm10.667.656V4q0 .283-.2.483t-.483.2h-8q-.283 0-.483-.2T1.984 4V2.667q0-.283.2-.483t.483-.2h8q.283 0 .483.2t.2.483v.656Zm-4.694 7.994h.677q.017 0 .017.016V14q0 .017-.017.017H6q-.017 0-.017-.017v-2.667q0-.016.017-.016h.656Z"></path></g></svg>`,
  eraser: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_erase16" size="16"><defs><clipPath id="eaa1b7_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#eaa1b7_0)"><path fill="currentColor" d="M5.117 14.86h9.1a.65.65 0 1 0 0-1.3h-4.149l4.898-4.9q.6-.601.6-1.45t-.6-1.45l-4.2-4.2q-.6-.6-1.45-.6-.849 0-1.45.6l-7 7q-.6.601-.6 1.45 0 .85.6 1.45l2.796 2.799q.603.603 1.455.601Zm2.492-1.3H5.115q-.313.001-.533-.22l-2.796-2.8q-.53-.53 0-1.06l.792-.792a.65.65 0 0 0 .07.08L7.61 13.56Zm1.236-.614L3.552 7.833a.65.65 0 0 0-.065-.055l5.3-5.298q.219-.22.53-.22.31 0 .53.22l4.2 4.2q.53.53 0 1.06l-5.202 5.206Z"></path></g></svg>`,
  fontColor: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_fontcolor16" size="16"><defs><clipPath id="d2f372_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#d2f372_0)"><path fill="currentColor" d="M11.904 12.11 10.509 8.9H5.49l-1.395 3.21a.65.65 0 0 1-1.192-.52l1.565-3.6 2.935-6.75a.65.65 0 0 1 1.192 0l2.935 6.75 1.565 3.6a.651.651 0 1 1-1.192.52ZM8 3.13 6.057 7.6h3.886L8 3.13Z"></path><path fill="#FE0300" fill-rule="evenodd" d="M1 14.7a.8.8 0 0 0 .8.8h12.4a.8.8 0 1 0 0-1.6H1.8a.8.8 0 0 0-.8.8Z"></path><path fill="#6B7294" fill-opacity="0.32" d="M1.8 15.5h12.4a.8.8 0 1 0 0-1.6H1.8a.8.8 0 0 0 0 1.6Zm-.424-.376Q1.2 14.95 1.2 14.7t.176-.424q.175-.176.424-.176h12.4q.249 0 .424.176.176.175.176.424t-.176.424q-.175.176-.424.176H1.8q-.249 0-.424-.176Z"></path></g></svg>`,
  bold: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_bold16" size="16"><defs><clipPath id="175a21_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#175a21_0)"><path fill="currentColor" d="M3.208 7.889a.8.8 0 0 1-.008-.111V2a.8.8 0 0 1 .8-.8h3.852q1.555 0 2.655 1.103 1.099 1.102 1.099 2.66 0 1.513-1.052 2.541.625.275 1.147.8Q12.8 9.404 12.8 10.962q0 1.56-1.12 2.606-1.08 1.009-2.634 1.009H4a.8.8 0 0 1-.8-.8V8a.8.8 0 0 1 .008-.111Zm4.644-.911q.923 0 1.542-.579.612-.57.612-1.436 0-.897-.632-1.53-.63-.633-1.522-.633H4.8v4.178h3.052Zm1.194 6q.923 0 1.543-.579.611-.57.611-1.436 0-.897-.632-1.53-.63-.633-1.522-.633H4.8v4.178h4.246Z"></path></g></svg>`,
  italic: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_textitalic16" size="16"><defs><clipPath id="63a453_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#63a453_0)"><path fill="currentColor" d="M9.523 1.35H6.667a.65.65 0 1 0 0 1.3h2.14L5.84 13.35H3.5a.65.65 0 0 0 0 1.3h5.833a.65.65 0 1 0 0-1.3H7.188l2.968-10.7H12.5a.65.65 0 0 0 0-1.3H9.81a.65.65 0 0 0-.287 0Z"></path></g></svg>`,
  underline: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_underline16" size="16"><defs><clipPath id="cb8b68_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#cb8b68_0)"><path fill="currentColor" d="M2.5 15.2h11a.3.3 0 0 1 0 .6h-11a.3.3 0 0 1 0-.6ZM3.35 2a.65.65 0 1 1 1.3 0v6.857q0 2.349.863 3.458Q6.318 13.35 8 13.35t2.487-1.035q.863-1.11.863-3.458V2a.65.65 0 1 1 1.3 0v6.857q0 2.795-1.137 4.256Q10.318 14.65 8 14.65q-2.318 0-3.513-1.537Q3.35 11.652 3.35 8.857V2Z"></path></g></svg>`,
  strike: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_deleteline16" size="16"><defs><clipPath id="ced12e_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#ced12e_0)"><path fill="currentColor" d="M1.5 7.2h13a.3.3 0 0 1 0 .6h-13a.3.3 0 1 1 0-.6Zm8.104 1.037q.593.364 1.033.804.902.904 1.088 2.024.173 1.044-.307 2.014-.458.926-1.36 1.488-.937.583-2.058.583-3.665 0-4.42-3.019a.65.65 0 1 1 1.261-.315Q5.35 13.85 8 13.85q.75 0 1.37-.386.589-.367.883-.961.294-.595.19-1.226-.118-.708-.726-1.317-.331-.332-.793-.615a.65.65 0 1 1 .68-1.108ZM4.16 4.423q.067.966.646 1.853a.65.65 0 1 0 1.089-.71q-.394-.604-.438-1.234-.04-.582.227-1.065.275-.496.822-.786Q7.13 2.15 8 2.15q2.392 0 3.18 2.105a.65.65 0 1 0 1.218-.457Q11.292.85 8 .85q-1.192 0-2.103.482-.888.47-1.35 1.306-.454.819-.387 1.785Z"></path></g></svg>`,
  border: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_cellborder16" size="16"><path fill="currentColor" d="M1.5 12.777v-9.4a1.8 1.8 0 0 1 1.8-1.8h9.4a1.8 1.8 0 0 1 1.8 1.8v9.4a1.8 1.8 0 0 1-1.8 1.8H3.3a1.8 1.8 0 0 1-1.8-1.8ZM2.8 7.35h4.55V2.877H3.3q-.5 0-.5.5V7.35Zm5.85-4.473V7.35h4.55V3.377q0-.207-.146-.353-.147-.147-.354-.147H8.65Zm-1.3 10.4V8.65H2.8v4.127q0 .5.5.5h4.05ZM13.2 8.65H8.65v4.627h4.05q.5 0 .5-.5V8.65Z"></path></svg>`,
  fillColor: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_cellcolor16" size="16"><defs><clipPath id="f5faf0_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#f5faf0_0)"><path fill="currentColor" d="M8.181.588 4.926 3.844H1.695a.65.65 0 0 0 0 1.3h1.93l-.683.684q-.483.483-.483 1.166 0 .684.483 1.167l4.03 4.03q.483.483 1.166.483.684 0 1.167-.484l5.24-5.24q.482-.482.482-1.166 0-.683-.483-1.167L10.514.588Q10.033.105 9.349.105q-.683 0-1.167.483Zm1.652 4.556a.65.65 0 0 0 0-1.3H6.764l2.337-2.337q.102-.102.247-.102.145 0 .248.102l4.029 4.03q.247.247 0 .495L10.657 9H5.619L3.861 7.242q-.102-.103-.102-.248 0-.145.102-.247l1.603-1.603h4.369Zm4.762 5.838a1.13 1.13 0 0 1-2.259 0q0-.624 1.13-1.883 1.129 1.259 1.129 1.883Z"></path><path fill="#FCC102" d="M1 14.8a.8.8 0 0 0 .8.8h12.4a.8.8 0 1 0 0-1.6H1.8a.8.8 0 0 0-.8.8Z"></path><path fill="#6B7294" fill-opacity="0.32" d="M1.8 15.6a.8.8 0 0 1 0-1.6h12.4a.8.8 0 1 1 0 1.6H1.8Zm-.424-.376q.175.176.424.176h12.4q.249 0 .424-.176.176-.175.176-.424t-.176-.424q-.175-.176-.424-.176H1.8q-.249 0-.424.176-.176.175-.176.424t.176.424Z"></path></g></svg>`,
  alignTop: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_aligntop16" size="16"><path fill="currentColor" d="M1.5 1.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 0 1 0-1.3Z"></path><path fill="#256CFB" d="m8.65 7.57 1.163 1.162a.65.65 0 1 0 .92-.919L8 5.081 5.268 7.813a.65.65 0 1 0 .919.92L7.35 7.568V14.5a.65.65 0 1 0 1.3 0V7.57Z"></path></svg>`,
  alignMiddle: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_alignmid16" size="16"><path fill="currentColor" d="M1.5 7.35h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 0 1 0-1.3Z"></path><path fill="#256CFB" d="M8.65 15v-3.43l1.163 1.162a.65.65 0 1 0 .92-.919L8 9.081l-2.732 2.732a.65.65 0 0 0 .919.92l1.163-1.164V15a.65.65 0 1 0 1.3 0Zm0-14v3.43l1.163-1.162a.65.65 0 1 1 .92.919L8 6.919 5.268 4.187a.65.65 0 0 1 .919-.92L7.35 4.432V1a.65.65 0 1 1 1.3 0Z"></path></svg>`,
  alignBottom: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_alignbottom16" size="16"><path fill="currentColor" d="M1.5 12.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 0 1 0-1.3Z"></path><path fill="#256CFB" d="M8.65 8.93V2a.65.65 0 1 0-1.3 0v6.93L6.187 7.769a.65.65 0 1 0-.92.919L8 11.419l2.732-2.732a.65.65 0 1 0-.919-.92L8.65 8.932Z"></path></svg>`,
  indentPlus: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_increaseindent16" size="16"><defs><clipPath id="82d367_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#82d367_0)"><path fill="currentColor" d="M1.5 12.85h13a.65.65 0 1 1 0 1.3h-13a.65.65 0 0 1 0-1.3Zm8.5-5.5h4.5a.65.65 0 0 1 0 1.3H10a.65.65 0 0 1 0-1.3Zm-8.5-5.5h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Z"></path><path fill="#256CFB" d="M5.203 8.65H1.501a.65.65 0 1 1-.001-1.3h3.703L4.04 6.187a.65.65 0 0 1 .92-.92L7.692 8 4.96 10.732a.65.65 0 1 1-.92-.919L5.203 8.65Z"></path></g></svg>`,
  alignLeft: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_leftalign16" size="16"><defs><clipPath id="6c597c_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#6c597c_0)"><path fill="currentColor" d="M1.5 1.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Zm-.022 11h10.778a.65.65 0 1 1 0 1.3H1.478a.65.65 0 0 1 0-1.3Zm.022-5.5H9a.65.65 0 0 1 0 1.3H1.5a.65.65 0 0 1 0-1.3Z"></path></g></svg>`,
  alignCenter: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_midalign16" size="16"><defs><clipPath id="417159_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#417159_0)"><path fill="currentColor" d="M1.5 1.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Zm0 11h13a.65.65 0 1 1 0 1.3h-13a.65.65 0 0 1 0-1.3Zm3-5.5H12a.65.65 0 0 1 0 1.3H4.5a.65.65 0 0 1 0-1.3Z"></path></g></svg>`,
  alignRight: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_rightalign16" size="16"><defs><clipPath id="167514_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#167514_0)"><path fill="currentColor" d="M1.5 1.85h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Zm0 11h13a.65.65 0 1 1 0 1.3h-13a.65.65 0 0 1 0-1.3Zm5-5.5h8a.65.65 0 0 1 0 1.3h-8a.65.65 0 0 1 0-1.3Z"></path></g></svg>`,
  indentMinus: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_reduceindent16" size="16"><defs><clipPath id="f8d9b5_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#f8d9b5_0)"><path fill="currentColor" d="M1.5 12.85h13a.65.65 0 1 1 0 1.3h-13a.65.65 0 0 1 0-1.3Zm8.5-5.5h4.5a.65.65 0 0 1 0 1.3H10a.65.65 0 0 1 0-1.3Zm-8.5-5.5h13a.65.65 0 0 1 0 1.3h-13a.65.65 0 1 1 0-1.3Z"></path><path fill="#256CFB" d="M3.297 8.65h3.702A.65.65 0 1 0 7 7.35H3.297L4.46 6.187a.65.65 0 0 0-.92-.92L.808 8l2.732 2.732a.65.65 0 1 0 .92-.919L3.297 8.65Z"></path></g></svg>`,
  wrap: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_overflow16"><defs><clipPath id="058a5a_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#058a5a_0)"><path fill="currentColor" d="M1.35 2a.65.65 0 1 1 1.3 0v12a.65.65 0 0 1-1.3 0V2Zm6 0a.65.65 0 0 1 1.3 0v3a.65.65 0 0 1-1.3 0V2Zm0 9a.65.65 0 0 1 1.3 0v3a.65.65 0 0 1-1.3 0v-3Z"></path><path fill="#256CFB" d="M3.85 8a.65.65 0 0 1 .65-.65h8.099l-.595-.703a.65.65 0 0 1 .992-.84l1.86 2.198-1.865 2.148a.65.65 0 1 1-.982-.852l.566-.651H4.5A.65.65 0 0 1 3.85 8Z"></path></g></svg>`,
  merge: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_mergecellm16"><path fill="#256CFB" fill-rule="evenodd" d="M5 7.35a.65.65 0 1 0 0 1.3h6a.65.65 0 0 0 0-1.3H5Z"></path><path fill="currentColor" fill-rule="evenodd" d="M6.15 12.5V12a.65.65 0 0 0-1.3 0v.5q0 .145-.102.247-.103.103-.248.103h-2q-.145 0-.247-.103-.103-.102-.103-.247v-9q0-.145.103-.247.102-.103.247-.103h2q.145 0 .248.103.102.102.102.247V4a.65.65 0 0 0 1.3 0v-.5q0-.683-.483-1.167Q5.183 1.85 4.5 1.85h-2q-.683 0-1.167.483Q.85 2.817.85 3.5v9q0 .683.483 1.167.484.483 1.167.483h2q.683 0 1.167-.483.483-.484.483-1.167Zm3.7 0V12a.65.65 0 1 1 1.3 0v.5q0 .145.103.247.102.103.247.103h2q.145 0 .248-.103.102-.102.102-.247v-9q0-.145-.102-.247-.103-.103-.248-.103h-2q-.145 0-.247.103-.103.102-.103.247V4a.65.65 0 1 1-1.3 0v-.5q0-.683.483-1.167.484-.483 1.167-.483h2q.683 0 1.167.483.483.484.483 1.167v9q0 .683-.483 1.167-.484.483-1.167.483h-2q-.683 0-1.167-.483-.483-.484-.483-1.167Z"></path></svg>`,
  currency: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_fieldmoney16" size="16"><path fill="currentColor" fill-rule="evenodd" d="m7.193 7.66-4.6-5.51a.65.65 0 0 1 .998-.833L8 6.598l4.409-5.281a.65.65 0 1 1 .997.833l-4.6 5.51h4.102a.65.65 0 0 1 0 1.3H8.65v2.14h4.259a.65.65 0 0 1 0 1.3H8.65v1.866a.65.65 0 0 1-1.3 0V12.4H3.092a.65.65 0 0 1 0-1.3H7.35V8.96H3.092a.65.65 0 1 1 0-1.3h4.101Z"></path></svg>`,
  percent: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_percent16" size="16"><defs><clipPath id="e9f516_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#e9f516_0)"><path fill="currentColor" d="M4 6.65a2.65 2.65 0 1 0 0-5.3 2.65 2.65 0 0 0 0 5.3Zm-1.46 5.971L12.935 2.227a.65.65 0 0 1 .919.919L3.46 13.54a.65.65 0 1 1-.92-.919ZM4 2.65a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7Zm8 12a2.65 2.65 0 1 0 0-5.3 2.65 2.65 0 0 0 0 5.3Zm0-4a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7Z"></path></g></svg>`,
  decimalPlus: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_decimalpointplus16" size="16"><defs><clipPath id="6547b6_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#6547b6_0)"><path fill="#256CFB" d="M.85 13a.65.65 0 0 1 .65-.65h8.099l-.595-.703a.65.65 0 0 1 .992-.84l1.86 2.198-1.865 2.148a.65.65 0 1 1-.982-.852l.566-.651H1.5A.65.65 0 0 1 .85 13Z"></path><path fill="currentColor" d="M3.85 7.25v-3.5q0-.994.703-1.697.703-.703 1.697-.703.994 0 1.697.703.703.703.703 1.697v3.5q0 .994-.703 1.697-.703.703-1.697.703-.994 0-1.697-.703-.703-.703-.703-1.697Zm6 0v-3.5q0-.994.703-1.697.703-.703 1.697-.703.994 0 1.697.703.703.703.703 1.697v3.5q0 .994-.703 1.697-.703.703-1.697.703-.994 0-1.697-.703-.703-.703-.703-1.697Zm-4.7 0q0 .456.322.778t.778.322q.456 0 .778-.322t.322-.778v-3.5q0-.456-.322-.778T6.25 2.65q-.456 0-.778.322t-.322.778v3.5Zm6 0q0 .456.322.778t.778.322q.456 0 .778-.322t.322-.778v-3.5q0-.456-.322-.778t-.778-.322q-.456 0-.778.322t-.322.778v3.5ZM2 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path></g></svg>`,
  decimalMinus: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_decimalpointminus16" size="16"><defs><clipPath id="202e19_0"><rect width="16" height="16" rx="0"></rect></clipPath></defs><g clip-path="url(#202e19_0)"><path fill="#256CFB" d="M15.15 13a.65.65 0 0 0-.65-.65H6.401l.595-.703a.65.65 0 0 0-.992-.84l-1.86 2.198 1.865 2.148a.65.65 0 1 0 .982-.852l-.566-.651H14.5a.65.65 0 0 0 .65-.65Z"></path><path fill="currentColor" d="M3.85 7.25v-3.5q0-.994.703-1.697.703-.703 1.697-.703.994 0 1.697.703.703.703.703 1.697v3.5q0 .994-.703 1.697-.703.703-1.697.703-.994 0-1.697-.703-.703-.703-.703-1.697Zm1.3 0q0 .456.322.778t.778.322q.456 0 .778-.322t.322-.778v-3.5q0-.456-.322-.778T6.25 2.65q-.456 0-.778.322t-.322.778v3.5ZM2 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path></g></svg>`,
  validation: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_validation20" size="20"><defs><clipPath id="dcad27_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#dcad27_0)"><path fill="currentColor" d="M1.225 7.292V3.583q0-.718.508-1.225.507-.508 1.225-.508h14.084q.718 0 1.225.508.508.507.508 1.225v12.834q0 .718-.508 1.225-.507.508-1.225.508H2.958q-.718 0-1.225-.508-.508-.507-.508-1.225V7.292ZM6.642 9.35v-6.2H2.958q-.433 0-.433.433V9.35h4.117Zm1.3-6.2v5.075l3.523-5.075H7.942Zm5.416 6.2h4.117V3.583q0-.433-.433-.433h-3.684v6.2Zm-1.3 0V4.576L8.743 9.35h3.315Zm-5.416 1.3H2.525v5.767q0 .18.127.306.127.127.306.127h3.684v-6.2Zm1.3 0v4.87l3.585-4.87H7.942Zm5.416 0v6.2h3.684q.433 0 .433-.433V10.65h-4.117Zm-1.3 1.471-3.48 4.729h3.48v-4.729Z"></path></g></svg>`,
  duplicate: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_repeat20" size="20"><defs><clipPath id="110db4_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#110db4_0)"><path fill="currentColor" fill-rule="evenodd" d="M4.35 14.4H3.125q-.787 0-1.343-.557-.557-.556-.557-1.343V3.75q0-.787.557-1.344.556-.556 1.343-.556H13.75q.787 0 1.344.556.556.557.556 1.344V5.6h1.225q.787 0 1.344.556.556.557.556 1.344v8.75q0 .787-.556 1.343-.557.557-1.344.557H6.25q-.787 0-1.343-.557-.557-.556-.557-1.343V14.4Zm.65-.65v-.65H3.125q-.249 0-.424-.176-.176-.175-.176-.424V3.75q0-.249.176-.424.175-.176.424-.176H13.75q.6 0 .6.6v2.5h.025v.65h2.5q.249 0 .424.176.176.175.176.424v8.75q0 .249-.176.424-.175.176-.424.176H6.25q-.6 0-.6-.6v-2.5H5Z"></path><path fill="#256CFB" d="M15.65 11.25q0 1.305-.923 2.227-.922.923-2.227.923H4.35V8.75q0-1.305.923-2.227Q6.195 5.6 7.5 5.6h8.15v5.65Zm-1.3 0V6.9H7.5q-.766 0-1.308.542T5.65 8.75v4.35h6.85q.766 0 1.308-.542t.542-1.308Zm-5 .625V9.4h-.6V8.1h1.9v3.775h-1.3Z"></path></g></svg>`,
  filter: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_filters20" size="20"><defs><clipPath id="757b08_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#757b08_0)"><path fill="currentColor" d="M15.982 2.85H4.018q-1.27 0-1.756 1.173-.485 1.173.412 2.07L6.85 10.27v4.385q0 1.286 1.194 1.764l2.5 1q.936.374 1.771-.191.835-.565.835-1.573v-5.385l4.176-4.175q.897-.898.412-2.071-.486-1.173-1.756-1.173Zm0 1.3q.401 0 .555.37.153.37-.13.654L12.04 9.54a.65.65 0 0 0-.19.46v5.654q0 .318-.264.497-.263.178-.559.06l-2.5-1q-.377-.151-.377-.557V10a.65.65 0 0 0-.19-.46L3.594 5.174q-.284-.283-.13-.654.153-.37.554-.37h11.964Z"></path></g></svg>`,
  sort: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_sort20" size="20"><defs><clipPath id="6c499f_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#6c499f_0)"><path fill="currentColor" fill-rule="evenodd" d="m8.915 6.71-2.64-2.64v11.554a.65.65 0 1 1-1.3.001V4.069l-2.64 2.64a.65.65 0 1 1-.92-.919l4.21-4.21 4.21 4.21a.65.65 0 1 1-.92.92Zm8.75 6.58-2.64 2.64V4.376a.65.65 0 0 0-1.3 0v11.556l-2.64-2.64a.65.65 0 1 0-.92.919l4.21 4.21 4.21-4.21a.65.65 0 0 0-.92-.92Z"></path></g></svg>`,
  dataValidation: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_datavalidation20" size="20"><defs><clipPath id="3e7ea6_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#3e7ea6_0)"><path fill="currentColor" d="M3.75 8.775H10a.65.65 0 1 0 0-1.3H3.75q-.249 0-.424-.176-.176-.175-.176-.424V3.75q0-.249.176-.424.175-.176.424-.176H10a.65.65 0 0 0 0-1.3H3.75q-.787 0-1.343.556-.557.557-.557 1.344v3.125q0 .787.557 1.343.556.557 1.343.557Zm0 9.375H10a.65.65 0 0 0 0-1.3H3.75q-.249 0-.424-.176-.176-.175-.176-.424v-3.125q0-.249.176-.424.175-.176.424-.176H10a.65.65 0 0 0 0-1.3H3.75q-.787 0-1.343.556-.557.557-.557 1.344v3.125q0 .787.557 1.343.556.557 1.343.557Z"></path><path fill="#256CFB" d="M13.897 12.353a.65.65 0 1 0-.919.92L14.706 15l-1.728 1.728a.65.65 0 1 0 .92.919l1.727-1.728 1.728 1.728a.65.65 0 1 0 .919-.92L16.544 15l1.728-1.728a.65.65 0 1 0-.92-.92l-1.727 1.729-1.728-1.728Zm4.769-9.492a.65.65 0 1 0-1.082-.722l-3.25 4.875-1.633-2.1a.65.65 0 1 0-1.027.798l2.188 2.812a.65.65 0 0 0 1.054-.038l3.75-5.625Z"></path></g></svg>`,
  freeze: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_frozecolumn20" size="20"><path fill="currentColor" fill-rule="evenodd" d="M1.225 16.603V3.372q0-.787.556-1.344.557-.556 1.344-.556h13.75q.787 0 1.344.556.556.557.556 1.344v13.231q0 .787-.556 1.344-.557.556-1.344.556H3.125q-.787 0-1.344-.556-.556-.557-.556-1.344Zm15.65.6h-8.1V2.772h8.1q.6 0 .6.6v13.231q0 .6-.6.6ZM3.125 2.772h4.35v1.201l-4.95 2.475V3.372q0-.6.6-.6Zm-.6 5.13 4.95-2.475v2.921l-4.95 2.475V7.902Zm0 4.375 4.95-2.475v2.921l-4.95 2.475v-2.921Zm.001 4.374 4.949-2.474v3.026h-4.35q-.576 0-.599-.552Z"></path></svg>`,
  pivot: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_pt20" size="20"><defs><clipPath id="7bcc8a_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g fill-rule="evenodd" clip-path="url(#7bcc8a_0)"><path fill="currentColor" d="M8.1 3.125v1.25q0 .787.557 1.344.556.556 1.343.556h6.875q.787 0 1.344-.556.556-.557.556-1.344v-1.25q0-.787-.556-1.343-.557-.557-1.344-.557H10q-.787 0-1.343.557-.557.556-.557 1.343Zm1.476 1.674Q9.4 4.624 9.4 4.375v-1.25q0-.249.176-.424.175-.176.424-.176h6.875q.249 0 .424.176.176.175.176.424v1.25q0 .249-.176.424-.175.176-.424.176H10q-.249 0-.424-.176ZM1.225 3.125v1.25q0 .787.557 1.344.556.556 1.343.556h1.25q.787 0 1.344-.556.556-.557.556-1.344v-1.25q0-.787-.556-1.343-.557-.557-1.344-.557h-1.25q-.787 0-1.343.557-.557.556-.557 1.343Zm1.476 1.674q-.176-.175-.176-.424v-1.25q0-.249.176-.424.175-.176.424-.176h1.25q.249 0 .424.176.176.175.176.424v1.25q0 .249-.176.424-.175.176-.424.176h-1.25q-.249 0-.424-.176ZM1.225 10v6.875q0 .787.557 1.344.556.556 1.343.556h1.25q.787 0 1.344-.556.556-.557.556-1.344V10q0-.787-.556-1.343Q5.162 8.1 4.375 8.1h-1.25q-.787 0-1.343.557-.557.556-.557 1.343Zm1.476 7.3q-.176-.176-.176-.425V10q0-.249.176-.424.175-.176.424-.176h1.25q.249 0 .424.176.176.175.176.424v6.875q0 .249-.176.424-.175.176-.424.176h-1.25q-.249 0-.424-.176Z"></path><path fill="#256CFB" d="m18.29 11.085-.765-.766v5.306q0 .787-.557 1.344-.556.556-1.343.556h-5.306l.765.765a.65.65 0 1 1-.919.92l-2.334-2.335 2.334-2.335a.65.65 0 0 1 .92.92l-.766.765h5.306q.248 0 .424-.176.176-.175.176-.424v-5.306l-.765.766a.65.65 0 1 1-.92-.92l2.335-2.334 2.334 2.334a.65.65 0 1 1-.919.92Z"></path></g></svg>`,
  notable: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_notable20" size="20"><path fill="currentColor" fill-rule="evenodd" d="m10.675 1.952.001 2.207 1.594-.923q1.829-1.06 3.658-.001l1.573.91q1.322.765 1.322 2.293v6.92q0 .832-.717 1.252-.717.42-1.442.013l-1.96-1.1.023 1.79q.027 2.138-1.825 3.207l-1.555.898q-1.32.763-2.644.003l-.048-.027-6.006-3.447q-.708-.407-.727-1.224-.02-.817.67-1.256l1.868-1.192-1.458-.84Q1.177 10.38 1.177 8.272V6.522q0-1.613 1.397-2.417L8.502.695q.725-.417 1.45.002.723.418.723 1.255Zm-4.75 4.96 3.451-2v-2.96q0-.086-.075-.13-.075-.043-.15 0l-5.025 2.89q.005 1.172 1.09 1.795l.708.406Zm4.1 2.377L7.221 7.663l3.13-1.813 2.57-1.49q1.177-.682 2.355 0l1.573.91q.398.23.56.596-1.067-.163-2.116.41l-1.625.886-.016.01-3.629 2.117Zm-.65 1.127v3.194l-3.337-1.925-2.386-1.377Q2.477 9.63 2.477 8.273V6.522q0-.645.418-1.048.283 1.362 1.674 2.16l1.033.593 3.773 2.189Zm6.541-2.999q.796-.434 1.607-.19v6.132q0 .086-.074.13-.074.043-.15 0l-2.614-1.467-.05-3.906 1.281-.699Zm-5.24 2.997 2.669-1.558.045 3.558.037 2.915q.017 1.377-1.175 2.065l-1.555.898q-.303.175-.605.193.583-.939.583-2.124v-5.947Zm-1.3 5.947q0 .934-.532 1.643l-5.548-3.185q-.073-.042-.075-.126-.002-.085.07-.13l2.439-1.555 3.645 2.103v1.25Z"></path></svg>`,
  image: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_image20" size="20"><path fill="currentColor" d="M1 15.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v11Zm1.3 0v-11q0-.7.7-.7h14q.29 0 .495.205.205.205.205.495v7.406l-3.06-2.754q-.49-.44-1.147-.423-.658.017-1.123.482l-6.99 6.99H3q-.29 0-.495-.205Q2.3 15.79 2.3 15.5Zm4.1-5.95a2.15 2.15 0 1 0 0-4.3 2.15 2.15 0 0 0 0 4.3Zm0-3a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7ZM17 16.2H7.219l6.07-6.07q.235-.234.481-.012l3.93 3.537V15.5q0 .7-.7.7Z"></path></svg>`,
  chart: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_tubiao20" size="20"><defs><clipPath id="dd91d4_0"><rect width="20" height="20" rx="0"></rect></clipPath></defs><g clip-path="url(#dd91d4_0)"><path fill="currentColor" d="M7.198 2.407q-.557.556-.557 1.343v5.6H3.124q-.787 0-1.344.557-.556.556-.556 1.343v5.013q0 .787.556 1.343.557.557 1.344.557H7.29a.65.65 0 0 0 .139-.015h5.124a.65.65 0 0 0 .155.019h4.167q.787 0 1.344-.557.556-.556.556-1.343V8.75q0-.787-.556-1.343-.557-.557-1.344-.557h-3.517v-3.1q0-.787-.557-1.343-.556-.557-1.343-.557H8.54q-.787 0-1.343.557Zm4.86 14.441H7.942V3.75q0-.248.176-.424t.424-.176h2.918q.248 0 .424.176t.176.424v13.098Zm4.818.019h-3.517V8.15h3.517q.249 0 .424.176.176.176.176.424v7.517q0 .248-.176.424-.175.176-.424.176Zm-14.352-.604V11.25q0-.248.175-.424.176-.176.425-.176H6.64v6.213H3.124q-.249 0-.425-.176-.175-.175-.175-.424Z"></path></g></svg>`,
  more: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_more20" size="20"><path fill="currentColor" d="M10 5.563a1.562 1.562 0 1 1 0-3.125 1.562 1.562 0 0 1 0 3.125Zm0 6a1.563 1.563 0 1 1 0-3.126 1.563 1.563 0 0 1 0 3.126Zm0 6a1.562 1.562 0 1 1 0-3.126 1.562 1.562 0 0 1 0 3.125Z"></path></svg>`,
  comment: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20" class="_comment20" size="20"><path fill="currentColor" d="M18.65 10q0-3.583-2.534-6.116Q13.583 1.35 10 1.35q-3.583 0-6.116 2.534Q1.35 6.417 1.35 10v7.467q0 1.183 1.183 1.183H10q3.583 0 6.116-2.534Q18.65 13.583 18.65 10Zm-1.3 0q0 3.044-2.153 5.197T10 17.35H2.65V10q0-3.044 2.153-5.197T10 2.65q3.044 0 5.197 2.153T17.35 10Zm-3.6-2a.75.75 0 0 0-.75-.75H7a.75.75 0 1 0 0 1.5h6a.75.75 0 0 0 .75-.75ZM11 11.25H7a.75.75 0 1 0 0 1.5h4a.75.75 0 1 0 0-1.5Z"></path></svg>`,
  collapse: `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="_upl16"><path fill="currentColor" fill-rule="evenodd" d="M13.5 11.15a.65.65 0 0 1-.46-.19L8 5.92l-5.04 5.04a.65.65 0 0 1-.92-.92l5.5-5.5a.65.65 0 0 1 .92 0l5.5 5.5a.65.65 0 0 1-.46 1.11Z"></path></svg>`,
} as const;

const ICONS = {
  ...LEGACY_ICONS,
  search: DESIGNED_TOOLBAR_ICONS.find,
  undo: DESIGNED_TOOLBAR_ICONS.undo,
  redo: DESIGNED_TOOLBAR_ICONS.redo,
  clipboard: DESIGNED_TOOLBAR_ICONS.paste,
  cut: DESIGNED_TOOLBAR_ICONS.cut,
  copy: DESIGNED_TOOLBAR_ICONS.copy,
  brush: DESIGNED_TOOLBAR_ICONS.formatPainter,
  eraser: DESIGNED_TOOLBAR_ICONS.clearFormat,
  fontColor: DESIGNED_TOOLBAR_ICONS.fontColor,
  bold: DESIGNED_TOOLBAR_ICONS.bold,
  italic: DESIGNED_TOOLBAR_ICONS.italic,
  underline: DESIGNED_TOOLBAR_ICONS.underline,
  strike: DESIGNED_TOOLBAR_ICONS.strikethrough,
  border: DESIGNED_TOOLBAR_ICONS.allBorders,
  fillColor: DESIGNED_TOOLBAR_ICONS.fillColor,
  alignTop: DESIGNED_TOOLBAR_ICONS.alignTop,
  alignMiddle: DESIGNED_TOOLBAR_ICONS.alignMiddle,
  alignBottom: DESIGNED_TOOLBAR_ICONS.alignBottom,
  indentPlus: DESIGNED_TOOLBAR_ICONS.indentIncrease,
  alignLeft: DESIGNED_TOOLBAR_ICONS.alignLeft,
  alignCenter: DESIGNED_TOOLBAR_ICONS.alignCenter,
  alignRight: DESIGNED_TOOLBAR_ICONS.alignRight,
  indentMinus: DESIGNED_TOOLBAR_ICONS.indentDecrease,
  wrap: DESIGNED_TOOLBAR_ICONS.wrapText,
  merge: DESIGNED_TOOLBAR_ICONS.mergeCells,
  currency: DESIGNED_TOOLBAR_ICONS.currency,
  percent: DESIGNED_TOOLBAR_ICONS.percent,
  decimalPlus: DESIGNED_TOOLBAR_ICONS.decimalPlus,
  decimalMinus: DESIGNED_TOOLBAR_ICONS.decimalMinus,
  validation: DESIGNED_TOOLBAR_ICONS.conditionalFormatting,
  filter: DESIGNED_TOOLBAR_ICONS.filter,
  dataValidation: DESIGNED_TOOLBAR_ICONS.dataValidation,
  freeze: DESIGNED_TOOLBAR_ICONS.freeze,
  image: DESIGNED_TOOLBAR_ICONS.image,
  comment: DESIGNED_TOOLBAR_ICONS.comment,
} as const;

const groups: readonly ReplicaToolbarGroup[] = [
  {
    kind: 'single',
    controls: [
      {
        kind: 'button',
        id: 'toolbar-menu',
        label: 'Menu',
        icon: ICONS.menu,
        size: 'large',
        popoverKey: 'menu',
        width: 32,
      },
      { kind: 'button', id: 'toolbar-insert', label: 'Insert', icon: ICONS.insert, size: 'large', width: 32 },
      { kind: 'button', id: SheetToolbarControlId.FindReplace, label: 'Find and replace', icon: ICONS.search, size: 'large', width: 64 },
    ],
  },
  {
    kind: 'rows',
    rows: [
      [
        { kind: 'button', id: 'toolbar-undo', icon: ICONS.undo, size: 'small', disabled: true, width: 24 },
        { kind: 'button', id: 'toolbar-redo', icon: ICONS.redo, size: 'small', disabled: true, width: 24 },
      ],
      [
        { kind: 'button', id: 'toolbar-brush', icon: ICONS.brush, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-eraser', icon: ICONS.eraser, size: 'small', width: 24 },
      ],
    ],
  },
  {
    kind: 'single',
    controls: [
      { kind: 'button', id: 'toolbar-paste', icon: ICONS.clipboard, size: 'small', width: 24 },
      { kind: 'button', id: 'toolbar-cut', icon: ICONS.cut, size: 'small', width: 24 },
      { kind: 'button', id: 'toolbar-copy', icon: ICONS.copy, size: 'small', width: 24 },
    ],
  },
  {
    kind: 'rows',
    rows: [
      [
        { kind: 'select', id: 'font-family-select', popoverKey: 'fontFamily', value: 'Arial', width: 118 },
        { kind: 'input-select', id: 'font-size-select', popoverKey: 'fontSize', value: 'Default', width: 56 },
        { kind: 'split', id: 'font-color', popoverKey: 'fontColor', icon: ICONS.fontColor, width: 34 },
      ],
      [
        { kind: 'button', id: 'toolbar-bold', icon: ICONS.bold, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-italic', icon: ICONS.italic, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-underline', icon: ICONS.underline, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-crossOut', icon: ICONS.strike, size: 'small', width: 24 },
        { kind: 'split', id: 'border-set', popoverKey: 'borderSet', icon: ICONS.border, width: 34 },
        {
          kind: 'split',
          id: SheetToolbarControlId.CellFill,
          popoverKey: 'fillColor',
          icon: ICONS.fillColor,
          width: 34,
        },
      ],
    ],
  },
  {
    kind: 'rows',
    rows: [
      [
        { kind: 'button', id: 'toolbar-alignTop', icon: ICONS.alignTop, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-alignCenter', icon: ICONS.alignMiddle, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-alignBottom', icon: ICONS.alignBottom, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-increase-indent', icon: ICONS.indentPlus, size: 'small', width: 24 },
      ],
      [
        { kind: 'button', id: 'toolbar-leftAlign', icon: ICONS.alignLeft, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-centerAlign', icon: ICONS.alignCenter, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-rightAlign', icon: ICONS.alignRight, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-decrease-indent', icon: ICONS.indentMinus, size: 'small', width: 24 },
        {
          kind: 'button',
          id: 'toolbar-wrap',
          popoverKey: 'textWrap',
          icon: ICONS.wrap,
          size: 'small',
          menu: true,
          width: 34,
        },
        { kind: 'split', id: 'MergeCellButton', popoverKey: 'mergeCell', icon: ICONS.merge, width: 34 },
      ],
    ],
  },
  {
    kind: 'rows',
    rows: [
      [{ kind: 'select', id: 'toolbar-number-format', popoverKey: 'numberFormat', value: 'Auto', width: 74 }],
      [
        { kind: 'button', id: 'toolbar-currencyFormat', icon: ICONS.currency, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-percentFormat', icon: ICONS.percent, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-decimalPointPlus', icon: ICONS.decimalPlus, size: 'small', width: 24 },
        { kind: 'button', id: 'toolbar-decimalPointMinus', icon: ICONS.decimalMinus, size: 'small', width: 24 },
      ],
    ],
  },
  {
    kind: 'single',
    controls: [
      {
        kind: 'button',
        id: 'toolbar-conditionalFormatting',
        label: 'Conditional formatting',
        icon: ICONS.validation,
        size: 'large',
        menu: true,
        popoverKey: 'conditionalFormatting',
        width: 52,
        nowrap: true,
      },
      {
        kind: 'button',
        id: 'toolbar-duplicate',
        label: 'Duplicates',
        icon: ICONS.duplicate,
        size: 'large',
        menu: true,
        popoverKey: 'duplicate',
        width: 40,
      },
      {
        kind: 'button',
        id: 'toolbar-filter',
        label: 'Filter',
        icon: ICONS.filter,
        size: 'large',
        menu: true,
        popoverKey: 'filter',
        width: 32,
      },
      {
        kind: 'button',
        id: 'toolbar-sort',
        label: 'Sort',
        icon: ICONS.sort,
        size: 'large',
        menu: true,
        popoverKey: 'sort',
        width: 32,
      },
      {
        kind: 'button',
        id: 'toolbar-dv',
        label: 'Data validation',
        icon: ICONS.dataValidation,
        size: 'large',
        menu: true,
        popoverKey: 'dataValidation',
        width: 52,
        nowrap: true,
      },
      {
        kind: 'button',
        id: 'toolbar-freeze',
        label: 'Freeze',
        icon: ICONS.freeze,
        size: 'large',
        menu: true,
        popoverKey: 'freeze',
        width: 32,
      },
    ],
  },
  {
    kind: 'single',
    controls: [
      {
        kind: 'button',
        id: 'toolbar-sync-convert-notable',
        label: 'Convert to AI spreadsheet',
        icon: ICONS.notable,
        size: 'large',
        width: 54,
      },
      {
        kind: 'button',
        id: 'toolbar-image',
        label: 'Image',
        icon: ICONS.image,
        size: 'large',
        menu: true,
        popoverKey: 'image',
        width: 32,
      },
      { kind: 'button', id: 'toolbar-dropdown', label: 'Dropdown', icon: INSERT_MENU_ICONS.dropdown, size: 'large', width: 56 },
      { kind: 'button', id: 'toolbar-checkbox', label: 'Checkbox', icon: INSERT_MENU_ICONS.checkbox, size: 'large', width: 40 },
    ],
  },
  {
    kind: 'single',
    controls: [
      {
        kind: 'button',
        id: 'toolbar-cell-comment',
        label: 'Comment',
        icon: ICONS.comment,
        size: 'large',
        menu: true,
        popoverKey: 'comment',
      },
    ],
  },
];

/** Builds the static DingTalk-style double-line toolbar replica without wiring commands. */
export function createReplicaToolbar(
  onUnavailableAction: () => void,
  onSelect?: ReplicaToolbarSelectionHandler,
  isDataValidationKindAvailable?: (label: string) => boolean,
  restoreFocusAfterEscape?: (anchor: HTMLElement) => void,
): HTMLElement {
  return createReplicaToolbarFromGroups(
    groups,
    onUnavailableAction,
    onSelect,
    isDataValidationKindAvailable,
    restoreFocusAfterEscape,
  );
}

/**
 * Builds a static toolbar replica from caller-supplied groups for focused renderer tests.
 *
 * This helper exercises replica-only DOM branches without changing the production toolbar
 * configuration. Production hosts should mount `SearWebToolbar`, which uses command-backed groups.
 */
export function createReplicaToolbarForTesting(
  testGroups: readonly ReplicaToolbarGroup[],
  onUnavailableAction: () => void,
): HTMLElement {
  return createReplicaToolbarFromGroups(testGroups, onUnavailableAction);
}

function createReplicaToolbarFromGroups(
  toolbarGroups: readonly ReplicaToolbarGroup[],
  onUnavailableAction: () => void,
  onSelect?: ReplicaToolbarSelectionHandler,
  isDataValidationKindAvailable?: (label: string) => boolean,
  restoreFocusAfterEscape?: (anchor: HTMLElement) => void,
): HTMLElement {
  const insertMenu = createReplicaInsertMenu(onUnavailableAction);
  const toolbarPopovers = createReplicaToolbarPopovers(isDataValidationKindAvailable, restoreFocusAfterEscape);
  const closeAllPopovers = (): void => {
    insertMenu.close();
    toolbarPopovers.close();
  };
  const root = document.createElement('div');
  root.setAttribute('mode', 'doubleLine');
  root.className = 'sear-toolbar sc-enDNfw iuWtFN';
  root.addEventListener('sear-toolbar-destroy', closeAllPopovers);

  const wrapper = document.createElement('div');
  wrapper.dataset['testid'] = 'ToolbarWrapper';
  wrapper.className =
    'style__Wrap-wd3__sc-qvsygq-1 iA-dSco we-toolbar-wrapper wd3-toolbar-layout wd3-toolbar-layout-double-line';

  const line = document.createElement('div');
  line.className = 'style__LineWrap-wd3__sc-qvsygq-2 hWgqZq';
  wrapper.appendChild(line);

  for (const group of toolbarGroups) {
    line.appendChild(
      renderGroup(
        group,
        onUnavailableAction,
        onSelect,
        closeAllPopovers,
        (anchor) => {
          toolbarPopovers.close();
          insertMenu.open(anchor);
        },
        (anchor) => {
          toolbarPopovers.close();
          insertMenu.toggle(anchor);
        },
        toolbarPopovers.open,
      ),
    );
  }

  line.appendChild(renderMoreButton(onUnavailableAction, onSelect, closeAllPopovers, toolbarPopovers.open));

  const grow = document.createElement('div');
  grow.className = 'style__Grow-wd3__sc-qvsygq-0 laiCgq';
  line.appendChild(grow);
  line.appendChild(renderModeSwitch(onUnavailableAction, closeAllPopovers));

  root.appendChild(wrapper);
  return root;
}

function renderGroup(
  group: ReplicaToolbarGroup,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openInsertMenu: (anchor: HTMLElement) => void,
  toggleInsertMenu: (anchor: HTMLElement) => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const element = document.createElement('div');
  element.className =
    group.kind === 'rows'
      ? 'style__Group-wd3__sc-qvsygq-3 style__GroupRows-wd3__sc-qvsygq-4 bJmQZk KAXUy'
      : 'style__Group-wd3__sc-qvsygq-3 bJmQZk';

  if (group.kind === 'single') {
    for (const control of group.controls) {
      element.appendChild(
        renderItem(
          control,
          onUnavailableAction,
          onSelect,
          closePopovers,
          openInsertMenu,
          toggleInsertMenu,
          openToolbarPopover,
        ),
      );
    }
    return element;
  }

  for (const row of group.rows) {
    const rowElement = document.createElement('div');
    rowElement.className = 'style__Row-wd3__sc-qvsygq-5 giovSP';
    for (const control of row)
      rowElement.appendChild(
        renderItem(
          control,
          onUnavailableAction,
          onSelect,
          closePopovers,
          openInsertMenu,
          toggleInsertMenu,
          openToolbarPopover,
        ),
      );
    element.appendChild(rowElement);
  }
  return element;
}

function renderItem(
  control: ReplicaToolbarControl,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openInsertMenu: (anchor: HTMLElement) => void,
  toggleInsertMenu: (anchor: HTMLElement) => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'style__ItemWrap-wd3__sc-qvsygq-6 hntmym';
  if (control.width !== void 0) item.dataset['width'] = String(control.width);
  if (control.width !== void 0) item.style.width = `${control.width}px`;

  const measure = document.createElement('div');
  measure.className = 'render-items__MeasureWrap-wd3__sc-1etwew8-0 cQgyJI';
  const slot = document.createElement('div');
  slot.className = 'slot__TBItemSlotWrap-wd3__sc-1p9e5wr-0 dpUiWu wd3-toolbar-item';
  slot.appendChild(
    renderControl(
      control,
      onUnavailableAction,
      onSelect,
      closePopovers,
      openInsertMenu,
      toggleInsertMenu,
      openToolbarPopover,
    ),
  );
  measure.appendChild(slot);
  item.appendChild(measure);
  return item;
}

function renderControl(
  control: ReplicaToolbarControl,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openInsertMenu: (anchor: HTMLElement) => void,
  toggleInsertMenu: (anchor: HTMLElement) => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  if (control.kind === 'select')
    return renderSelect(control, onUnavailableAction, onSelect, closePopovers, openToolbarPopover);
  if (control.kind === 'input-select')
    return renderInputSelect(control, onUnavailableAction, onSelect, closePopovers, openToolbarPopover);
  if (control.kind === 'split')
    return renderSplitButton(control, onUnavailableAction, onSelect, closePopovers, openToolbarPopover);
  return renderButton(
    control,
    onUnavailableAction,
    onSelect,
    closePopovers,
    openInsertMenu,
    toggleInsertMenu,
    openToolbarPopover,
  );
}

function namespaceSvgIds(svg: string): string {
  const namespace = `sear-tb-${Math.random().toString(36).slice(2)}-`;
  return svg.replace(/id="([^"]+)"/g, `id="${namespace}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${namespace}$1)`);
}

function renderButton(
  control: Extract<ReplicaToolbarControl, { readonly kind: 'button' }>,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openInsertMenu: (anchor: HTMLElement) => void,
  toggleInsertMenu: (anchor: HTMLElement) => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `baseButton__BaseButtonWrapper-wd3__sc-1awiu57-0 styled__Wrapper-wd3__sc-18mbnsa-0 cFRFPm hgrhnX wd3-toolbar-item wd3-toolbar-icon-${
    control.menu ? 'menu' : 'button'
  } ${control.size}`;
  if (control.id) button.dataset['testid'] = control.id;
  nameIconButton(button, control.id);
  if (control.disabled) {
    button.classList.add('disabled');
    button.disabled = true;
  }

  const content = document.createElement('div');
  content.className = control.menu
    ? 'styled__IconWithArrowWrap-wd3__sc-1vmuis-1 eJdDZX'
    : 'styled__Content-wd3__sc-18mbnsa-2 lkAHcO';
  const icon = document.createElement('div');
  icon.className = 'wd3-toolbar-icon';
  icon.innerHTML = namespaceSvgIds(control.icon);
  content.appendChild(icon);
  if (control.menu && control.size === 'small') content.insertAdjacentHTML('beforeend', arrowIcon);
  button.appendChild(content);

  if (control.label) button.appendChild(renderTitle(control.label, control.nowrap));
  if (control.id === 'toolbar-insert') {
    button.addEventListener('mouseenter', function handleInsertButtonMouseEnter() {
      openInsertMenu(button);
    });
    button.addEventListener('click', function handleInsertButtonClick(event) {
      event.stopPropagation();
      toggleInsertMenu(button);
    });
  } else if (control.popoverKey) {
    const popoverKey = control.popoverKey;
    button.addEventListener('click', function handleToolbarPopoverButtonClick(event) {
      event.stopPropagation();
      if (!openToolbarPopover(popoverKey, button, (label, value) => onSelect?.(control.id, label, value))) {
        closePopovers();
        onUnavailableAction();
      }
    });
  } else {
    button.addEventListener('click', function handleUnavailableToolbarButtonClick() {
      closePopovers();
      onUnavailableAction();
    });
  }
  return button;
}

function renderSelect(
  control: Extract<ReplicaToolbarControl, { readonly kind: 'select' }>,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const select = document.createElement('button');
  select.type = 'button';
  select.className =
    'styled__Wrap-wd3__sc-1ugiav3-1 EjwSf BaseTextSelect__SelectWrapper-wd3__sc-rj24z3-0 gXyqXa wd3-toolbar-item-select wd3-toolbar-item small wd3-select';
  select.style.width = `${control.width}px`;
  if (control.id) select.dataset['testid'] = control.id;
  select.innerHTML = `<span class="styled__NormalWrap-wd3__sc-1ugiav3-2 jjiXfJ wd3-select-normal"><span class="styled__NormalValue-wd3__sc-1ugiav3-3 hPsShN wd3-select-normal-value">${control.value}</span><span class="styled__Suffix-wd3__sc-1ugiav3-6 cbEZCC wd3_select_arrow">${arrowIcon}</span></span>`;
  select.addEventListener('click', function handleToolbarSelectClick(event) {
    event.stopPropagation();
    function handleToolbarSelectPopoverValue(label: string): void {
      updateSelectValue(select, label);
      onSelect?.(control.id, label);
    }
    if (!control.popoverKey || !openToolbarPopover(control.popoverKey, select, handleToolbarSelectPopoverValue)) {
      closePopovers();
      onUnavailableAction();
    }
  });
  return select;
}

function renderInputSelect(
  control: Extract<ReplicaToolbarControl, { readonly kind: 'input-select' }>,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const wrapper = document.createElement('button');
  wrapper.type = 'button';
  wrapper.className =
    'styled__Wrap-wd3__sc-1ugiav3-1 EjwSf BaseTextSelect__SelectWrapper-wd3__sc-rj24z3-0 gXyqXa wd3-toolbar-item-select wd3-toolbar-item small wd3-select';
  wrapper.style.width = `${control.width}px`;
  if (control.id) wrapper.dataset['testid'] = control.id;
  wrapper.innerHTML = `<span class="wd3-select-input-value">${control.value}</span><span class="styled__Suffix-wd3__sc-1ugiav3-6 cbEZCC wd3_select_arrow">${arrowIcon}</span>`;
  wrapper.addEventListener('click', function handleToolbarInputSelectClick(event) {
    event.stopPropagation();
    function handleToolbarInputSelectPopoverValue(label: string): void {
      updateSelectValue(wrapper, label);
      onSelect?.(control.id, label);
    }
    if (!control.popoverKey || !openToolbarPopover(control.popoverKey, wrapper, handleToolbarInputSelectPopoverValue)) {
      closePopovers();
      onUnavailableAction();
    }
  });
  return wrapper;
}

function renderSplitButton(
  control: Extract<ReplicaToolbarControl, { readonly kind: 'split' }>,
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'styled__Wrapper-wd3__sc-1b2x6cn-0 kunuWG wd3-toolbar-item small wd3-toolbar-split-btn-host';
  button.dataset['testid'] = control.id;
  nameIconButton(button, control.id);
  button.innerHTML = `<span class="wd3-toolbar-split-btn"><span class="wd3-toolbar-split-left">${namespaceSvgIds(
    control.icon,
  )}</span><span class="wd3-toolbar-split-btn-arrow">${arrowIcon}</span></span>`;
  button.addEventListener('click', function handleToolbarSplitButtonClick(event) {
    event.stopPropagation();
    const handleToolbarPopoverValue = (label: string, value?: string | null): void => {
      onSelect?.(control.id, label, value);
    };
    if (!control.popoverKey || !openToolbarPopover(control.popoverKey, button, handleToolbarPopoverValue)) {
      closePopovers();
      onUnavailableAction();
    }
  });
  return button;
}

function updateSelectValue(select: HTMLElement, label: string): void {
  const value =
    select.querySelector<HTMLElement>('.wd3-select-normal-value') ??
    select.querySelector<HTMLElement>('.wd3-select-input-value');
  if (value) value.textContent = label;
}

function renderTitle(label: string, nowrap = false): HTMLElement {
  const title = document.createElement('div');
  title.className = 'wd3-toolbar-title';
  const content = document.createElement('div');
  content.className = `wd3-tb-title-content${nowrap ? ' wd3-tb-title-content-nowrap' : ''}`;
  content.textContent = label;
  title.appendChild(content);
  return title;
}

function renderMoreButton(
  onUnavailableAction: () => void,
  onSelect: ReplicaToolbarSelectionHandler | undefined,
  closePopovers: () => void,
  openToolbarPopover: (
    key: string,
    anchor: HTMLElement,
    onSelect?: (label: string, value?: string | null) => void,
  ) => boolean,
): HTMLElement {
  const item = document.createElement('div');
  item.dataset['testid'] = 'ToolbarWrapper__more-button';
  item.className = 'style__MoreItemWrapper-wd3__sc-qvsygq-7 gxrpAE wd3-toolbar-more';
  item.appendChild(
    renderButton(
      { kind: 'button', id: 'toolbar-more', label: 'More', icon: ICONS.more, size: 'large', popoverKey: 'more' },
      onUnavailableAction,
      onSelect,
      closePopovers,
      closePopovers,
      closePopovers,
      openToolbarPopover,
    ),
  );
  return item;
}

function renderModeSwitch(onUnavailableAction: () => void, closeInsertMenu: () => void): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'wd3-toolbar-mode-switch-wrap';
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset['testid'] = 'ToolbarWrapper__mode-switch';
  button.setAttribute('aria-label', 'Collapse toolbar');
  button.title = 'Collapse toolbar';
  button.className = 'styled__Wrap-wd3__sc-xm0a0p-0 jVJGRp wd3-toolbar-layout-mode-switch wd3-icon-button';
  button.innerHTML = namespaceSvgIds(ICONS.collapse);
  button.addEventListener('click', function handleToolbarModeSwitchClick() {
    closeInsertMenu();
    onUnavailableAction();
  });
  wrapper.appendChild(button);
  return wrapper;
}

function nameIconButton(button: HTMLButtonElement, id: string | undefined): void {
  const name = id ? ICON_CONTROL_NAMES[id] : undefined;
  if (!name) return;
  button.setAttribute('aria-label', name);
  button.title = name;
}
