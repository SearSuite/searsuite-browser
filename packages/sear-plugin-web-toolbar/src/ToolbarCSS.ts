/** CSS injected by SearWebToolbar for the web toolbar and its popovers. */
export const TOOLBAR_CSS = `
.sear-sheet-context-menu { position: fixed; z-index: 10020; min-width: 148px; padding: 4px; background: #fff; color: #222; border: 1px solid #dcdde5; border-radius: 6px; box-shadow: 0 8px 24px #0002; font: 13px sans-serif; }
.sear-sheet-context-menu button { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 3px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.sear-sheet-context-menu button:hover, .sear-sheet-context-menu button:focus-visible { background: #eef3ff; outline: 0; }
.sear-cell-border-menu { position: fixed; z-index: 10000; display: flex; gap: 16px; box-sizing: border-box; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow-y: auto; padding: 12px; background: #fff; color: #222; border: 1px solid #dcdde5; border-radius: 8px; box-shadow: 0 8px 24px #0002; font: 14px sans-serif; }
.sear-cell-border-presets { display: grid; grid-template-columns: repeat(3, 42px); gap: 4px; }
.sear-cell-border-presets button { width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 4px; background: transparent; color: #303438; cursor: pointer; }
.sear-cell-border-presets button:hover { background: #eef0f2; }
.sear-cell-border-presets button svg { width: 28px; height: 28px; }
.sear-cell-border-presets button:focus-visible { outline: 2px solid #386ef6; }
.sear-cell-border-controls { width: 164px; display: flex; flex-direction: column; gap: 16px; }
.sear-cell-border-controls label { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sear-cell-border-controls input { width: 114px; height: 32px; padding: 3px; border: 1px solid #dcdde5; border-radius: 4px; background: white; cursor: pointer; }
.sear-cell-border-controls select { width: 114px; height: 32px; border: 1px solid #dcdde5; border-radius: 4px; background: white; color: #222; }
.sear-cell-border-preview { display: grid; place-items: center; height: 32px; border-top: 1px solid #eef0f2; }
@media (max-width: 360px) {
  .sear-cell-border-menu { flex-direction: column; box-sizing: border-box; width: calc(100vw - 16px); }
  .sear-cell-border-presets { grid-template-columns: repeat(5, 42px); }
  .sear-cell-border-controls { width: 100%; }
}
.sear-toolbar {
    --wd3-level-1: rgba(23, 24, 28, 0.94);
    --wd3-level-2: rgba(23, 24, 28, 0.62);
    --wd3-level-3: rgba(23, 24, 28, 0.4);
    --wd3-line: rgba(23, 26, 29, 0.08);
    --wd3-hover: rgba(23, 26, 29, 0.06);
    --wd3-active: rgba(63, 133, 255, 0.1);
    --wd3-blue: #256cfb;
    box-sizing: border-box;
    width: 100%;
    min-height: 80px;
    background: #fff;
    color: var(--wd3-level-1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 12px;
    user-select: none;
    overflow: hidden;
}

.sear-toolbar *,
.sear-toolbar *::before,
.sear-toolbar *::after {
    box-sizing: border-box;
}

.sear-toolbar .we-toolbar-wrapper {
    height: 80px;
    padding: 0;
    border-bottom: 1px solid var(--wd3-line);
    background: #fff;
    overflow: visible;
}

.sear-toolbar .style__LineWrap-wd3__sc-qvsygq-2 {
    display: flex;
    align-items: stretch;
    gap: 0;
    height: 80px;
    padding: 6px 8px 5px;
    overflow-x: auto;
    overflow-y: visible;
    white-space: nowrap;
}

.sear-toolbar .style__LineWrap-wd3__sc-qvsygq-2::-webkit-scrollbar {
    height: 3px;
}

.sear-toolbar .style__LineWrap-wd3__sc-qvsygq-2::-webkit-scrollbar-thumb {
    background: rgba(23, 26, 29, 0.18);
    border-radius: 2px;
}

.sear-toolbar .style__Group-wd3__sc-qvsygq-3,
.sear-toolbar .wd3-toolbar-more {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: max-content;
    padding: 0 8px;
}

.sear-toolbar .style__Group-wd3__sc-qvsygq-3::after,
.sear-toolbar .wd3-toolbar-more::after {
    content: "";
    position: absolute;
    top: 8px;
    right: 0;
    width: 1px;
    height: 52px;
    background: var(--wd3-line);
}

.sear-toolbar .style__GroupRows-wd3__sc-qvsygq-4 {
    flex-direction: column;
    justify-content: center;
    gap: 4px;
}

.sear-toolbar .style__Row-wd3__sc-qvsygq-5 {
    display: flex;
    align-items: center;
    height: 28px;
    gap: 2px;
}

.sear-toolbar .style__ItemWrap-wd3__sc-qvsygq-6 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 28px;
}

.sear-toolbar .render-items__MeasureWrap-wd3__sc-1etwew8-0,
.sear-toolbar .slot__TBItemSlotWrap-wd3__sc-1p9e5wr-0 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.sear-toolbar button,
.sear-toolbar .wd3-toolbar-item-select {
    border: 0;
    appearance: none;
    font: inherit;
    color: inherit;
}

.sear-toolbar .wd3-toolbar-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: transparent;
    color: var(--wd3-level-1);
    cursor: default;
    outline: none;
}

.sear-toolbar .wd3-toolbar-icon-button.small,
.sear-toolbar .wd3-toolbar-icon-menu.small {
    width: 24px;
    height: 24px;
}

.sear-toolbar .wd3-toolbar-split-btn-host {
    width: 34px;
    height: 24px;
}

.sear-toolbar .wd3-toolbar-icon-button.large,
.sear-toolbar .wd3-toolbar-icon-menu.large {
    min-width: 32px;
    height: 66px;
    padding: 4px 0 3px;
    flex-direction: column;
}

.sear-toolbar .wd3-toolbar-icon-menu.large {
    padding-left: 2px;
    padding-right: 2px;
}

.sear-toolbar .wd3-toolbar-item:not(.disabled):hover,
.sear-toolbar .wd3-toolbar-item-select:hover,
.sear-toolbar .wd3-icon-button:hover {
    background: var(--wd3-hover);
}

.sear-toolbar .wd3-toolbar-item:not(.disabled):active,
.sear-toolbar .wd3-toolbar-item-select:active,
.sear-toolbar .wd3-icon-button:active {
    background: var(--wd3-active);
}

.sear-toolbar .wd3-toolbar-item-active {
    background: var(--wd3-active);
    color: var(--wd3-blue);
}

.sear-toolbar .wd3-toolbar-item.disabled {
    color: var(--wd3-level-3);
    opacity: 0.38;
}

.sear-toolbar .styled__Content-wd3__sc-18mbnsa-2,
.sear-toolbar .styled__IconWithArrowWrap-wd3__sc-1vmuis-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 20px;
    line-height: 0;
}

.sear-toolbar .wd3-toolbar-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: currentColor;
}

.sear-toolbar .small .wd3-toolbar-icon,
.sear-toolbar .wd3-toolbar-split-left {
    width: 20px;
    height: 20px;
}

.sear-toolbar svg {
    display: block;
    flex: 0 0 auto;
}

.sear-toolbar .small .wd3-toolbar-icon > svg,
.sear-toolbar .wd3-toolbar-split-left > svg {
    width: 16px;
    height: 16px;
}

.sear-toolbar .wd3-toolbar-title {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 28px;
    padding-top: 2px;
    color: var(--wd3-level-2);
    font-size: 11px;
    line-height: 14px;
}

.sear-toolbar .wd3-tb-title-content {
    max-width: 54px;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: normal;
}

.sear-toolbar .wd3-tb-title-content-nowrap {
    white-space: nowrap;
}

.sear-toolbar .wd3-select {
    position: relative;
    justify-content: space-between;
    height: 24px;
    min-width: 0;
    padding: 0 4px 0 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    font-size: 12px;
    line-height: 22px;
}

.sear-toolbar .wd3-select-normal-value,
.sear-toolbar .wd3-select-input-value {
    min-width: 0;
    overflow: hidden;
    color: var(--wd3-level-1);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sear-toolbar .wd3_select_arrow,
.sear-toolbar .wd3-toolbar-split-btn-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 9px;
    margin-left: 3px;
    color: var(--wd3-level-3);
}

.sear-toolbar .wd3-toolbar-split-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 24px;
    overflow: visible;
    line-height: 0;
}

.sear-toolbar .wd3-toolbar-split-left {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.sear-toolbar .style__Grow-wd3__sc-qvsygq-0 {
    flex: 1 1 auto;
    min-width: 16px;
}

.sear-toolbar .wd3-toolbar-mode-switch-wrap {
    position: relative;
    display: flex;
    align-items: center;
    height: 28px;
    align-self: center;
}

.sear-toolbar .wd3-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
}

.sear-toolbar-insert-popovers {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
}

.sear-toolbar-popovers {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
}

.sear-toolbar-insert-popover {
    position: fixed;
    pointer-events: auto;
}

.sear-toolbar-popover {
    position: fixed;
    pointer-events: auto;
}

.sear-toolbar-insert-popover .wd3-popover,
.sear-toolbar-popover .wd3-popover {
    overflow: hidden;
    border: 1px solid rgba(23, 26, 29, 0.12);
    border-radius: 16px;
    background: #fff;
    box-shadow:
        0 14px 38px rgba(23, 26, 29, 0.14),
        0 2px 6px rgba(23, 26, 29, 0.08);
}

.sear-toolbar-insert-popover .wd3-menu,
.sear-toolbar-popover .wd3-menu {
    display: flex;
    flex-direction: column;
    padding: 4px 10px 4px 6px;
    color: rgba(23, 24, 28, 0.82);
    font-size: 13px;
    font-weight: 400;
    line-height: 1;
}
.sear-toolbar-popover .wd3-menu { max-height: calc(100vh - 16px); overflow-y: auto; }

.sear-toolbar-insert-popover .wd3-menu {
    width: 180px;
}

.sear-toolbar-insert-popover:nth-child(n + 2) .wd3-menu {
    width: 200px;
}

.sear-toolbar-insert-popover:nth-child(3) .wd3-menu {
    width: 202px;
}

.sear-toolbar-insert-popover .wd3-listitem,
.sear-toolbar-popover .wd3-listitem {
    display: flex;
    align-items: center;
    min-height: 28px;
    border-radius: 6px;
    cursor: default;
    font-weight: 400;
}

.sear-toolbar-popover button.wd3-listitem {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
}

.sear-toolbar-popover button[aria-disabled="true"] {
    color: #8b9297;
    cursor: not-allowed;
}

.sear-toolbar-insert-popover .wd3-listitem:hover,
.sear-toolbar-insert-popover .wd3-listitem-active,
.sear-toolbar-popover .wd3-listitem:hover,
.sear-toolbar-popover .wd3-listitem-active {
    background: rgba(23, 26, 29, 0.05);
}

.sear-toolbar-insert-popover .styled__Container-wd3__sc-2oqy5e-3,
.sear-toolbar-popover .styled__Container-wd3__sc-2oqy5e-3 {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
}

.sear-toolbar-insert-popover .styled__Prefix-wd3__sc-2oqy5e-4,
.sear-toolbar-popover .styled__Prefix-wd3__sc-2oqy5e-4 {
    display: inline-flex;
    flex: 0 0 32px;
    align-items: center;
    justify-content: center;
    color: rgba(23, 24, 28, 0.78);
}

.sear-toolbar-popover .sear-toolbar-popover-prefix {
    flex-basis: 24px;
}

.sear-toolbar-insert-popover .styled__Prefix-wd3__sc-2oqy5e-4 svg,
.sear-toolbar-popover .styled__Prefix-wd3__sc-2oqy5e-4 svg {
    width: 16px;
    height: 16px;
}

.sear-toolbar-insert-popover .styled__Content-wd3__sc-2oqy5e-6,
.sear-toolbar-popover .styled__Content-wd3__sc-2oqy5e-6 {
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sear-toolbar-insert-popover .styled__Suffix-wd3__sc-2oqy5e-5,
.sear-toolbar-popover .styled__Suffix-wd3__sc-2oqy5e-5 {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    margin-left: 6px;
    color: rgba(23, 24, 28, 0.66);
}

.sear-toolbar-popover .styled__Suffix-wd3__sc-2oqy5e-5 {
    font-size: 11px;
}

.sear-toolbar-insert-popover .styled__SuffixWrapper-wd3__sc-1p5lith-0 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 16px;
}

.sear-toolbar-popover .styled__Suffix-wd3__sc-2oqy5e-5 svg,
.sear-toolbar-insert-popover .styled__SuffixWrapper-wd3__sc-1p5lith-0 svg {
    width: 8px;
    height: 16px;
}

.sear-toolbar-insert-popover .styled__Divider-wd3__sc-2oqy5e-1,
.sear-toolbar-popover .styled__Divider-wd3__sc-2oqy5e-1 {
    height: 1px;
    margin: 4px 0;
    background: rgba(23, 26, 29, 0.12);
}

.sear-toolbar-popover .wd3-listitem-selected {
    color: rgba(37, 108, 251, 0.95);
}

.sear-toolbar-color-menu {
    padding: 10px;
    color: rgba(23, 24, 28, 0.82);
    font-size: 13px;
    font-weight: 400;
}

.sear-toolbar-color-title {
    height: 22px;
    padding: 0 2px;
    color: rgba(23, 24, 28, 0.62);
    font-size: 12px;
    line-height: 22px;
}

.sear-toolbar-color-grid {
    display: grid;
    grid-template-columns: repeat(8, 20px);
    gap: 6px;
    margin-top: 4px;
}

.sear-toolbar-color-swatch {
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid rgba(23, 26, 29, 0.14);
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
    cursor: default;
}

.sear-toolbar-color-swatch:hover {
    border-color: rgba(37, 108, 251, 0.82);
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.72),
        0 0 0 2px rgba(37, 108, 251, 0.12);
}

.sear-toolbar-color-swatch-selected {
    outline: 2px solid #256cfb;
    outline-offset: 1px;
}

.sear-toolbar-color-swatch-default {
    position: relative;
    background: #fff;
}

.sear-toolbar-color-swatch-default::after {
    position: absolute;
    top: 9px;
    left: 1px;
    width: 18px;
    height: 1px;
    background: #fe0300;
    content: '';
    transform: rotate(-45deg);
}

.sear-toolbar-insert-popover .wd3-shortcuts {
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

.sear-toolbar-insert-popover .wd3-shortcuts kbd {
    min-width: 19px;
    height: 19px;
    padding: 0 5px;
    border: 1px solid rgba(107, 114, 148, 0.24);
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(23, 26, 29, 0.12);
    color: rgba(107, 114, 148, 0.92);
    font: inherit;
    font-size: 10px;
    line-height: 17px;
    text-align: center;
}

.sear-toolbar-insert-popover .wd3-badge-new {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    margin-left: 7px;
    padding: 0 5px;
    border-radius: 3px;
    background: #ffe9dc;
    color: #ff7a45;
    font-size: 9px;
    line-height: 16px;
}

.sear-number-format-dialog {
    width: min(920px, calc(100vw - 32px));
    height: min(680px, calc(100vh - 32px));
    padding: 0;
    overflow: hidden;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
    color: #20242a;
    box-shadow: 0 18px 56px rgba(24, 31, 42, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}

.sear-delete-cells-dialog {
    width: min(360px, calc(100vw - 32px));
    padding: 24px;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
    color: #20242a;
    box-shadow: 0 18px 56px rgba(24, 31, 42, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}
.sear-delete-cells-dialog::backdrop { background: rgba(24, 31, 42, 0.36); }
.sear-delete-cells-dialog h2 { margin: 0 0 20px; font-size: 20px; }
.sear-delete-cells-dialog fieldset { display: grid; gap: 12px; margin: 0; padding: 0; border: 0; }
.sear-delete-cells-dialog legend { margin-bottom: 12px; font-size: 13px; color: #5c6370; }
.sear-delete-cells-dialog label { display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer; }
.sear-delete-cells-dialog footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.sear-delete-cells-dialog button { min-width: 72px; min-height: 32px; border: 1px solid #d9dde3; border-radius: 4px; background: #fff; cursor: pointer; }
.sear-delete-cells-dialog button[data-action="apply"] { border-color: #2665d8; background: #2665d8; color: #fff; }

.sear-go-to-dialog {
    width: min(440px, calc(100vw - 32px));
    padding: 24px;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
    color: #20242a;
    box-shadow: 0 18px 56px rgba(24, 31, 42, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}
.sear-go-to-dialog::backdrop { background: rgba(24, 31, 42, 0.36); }
.sear-go-to-dialog h2 { margin: 0 0 20px; font-size: 20px; }
.sear-go-to-dialog__address { display: grid; gap: 7px; margin-bottom: 20px; font-size: 13px; }
.sear-go-to-dialog__address input { height: 34px; padding: 0 9px; border: 1px solid #cbd1da; border-radius: 4px; font: inherit; }
.sear-go-to-dialog fieldset { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; padding: 0; border: 0; }
.sear-go-to-dialog legend { margin-bottom: 12px; font-size: 13px; color: #5c6370; }
.sear-go-to-dialog fieldset label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.sear-go-to-dialog__error { margin: 14px 0 0; color: #b42318; font-size: 13px; }
.sear-go-to-dialog footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.sear-go-to-dialog button { min-width: 72px; min-height: 32px; border: 1px solid #d9dde3; border-radius: 4px; background: #fff; cursor: pointer; }
.sear-go-to-dialog button[type="submit"] { border-color: #2665d8; background: #2665d8; color: #fff; }

.sear-hyperlink-dialog {
    width: min(480px, calc(100vw - 32px));
    padding: 24px;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
    color: #20242a;
    box-shadow: 0 18px 56px rgba(24, 31, 42, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}
.sear-hyperlink-dialog::backdrop { background: rgba(24, 31, 42, 0.36); }
.sear-hyperlink-dialog h2 { margin: 0 0 20px; font-size: 20px; }
.sear-hyperlink-dialog__tabs { display: flex; gap: 4px; margin-bottom: 22px; border-bottom: 1px solid #d9dde3; }
.sear-hyperlink-dialog__tabs button { min-height: 36px; padding: 0 9px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #5c6370; font-size: 13px; cursor: pointer; }
.sear-hyperlink-dialog__tabs button[aria-selected="true"] { border-bottom-color: #2665d8; color: #20242a; }
.sear-hyperlink-dialog label { display: grid; gap: 7px; margin-bottom: 16px; font-size: 13px; }
.sear-hyperlink-dialog input { height: 34px; padding: 0 9px; border: 1px solid #cbd1da; border-radius: 4px; font: inherit; }
.sear-hyperlink-dialog__error { margin: 0 0 14px; color: #b42318; font-size: 13px; }
.sear-hyperlink-dialog footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.sear-hyperlink-dialog footer button { min-width: 72px; min-height: 32px; border: 1px solid #d9dde3; border-radius: 4px; background: #fff; cursor: pointer; }
.sear-hyperlink-dialog footer button[type="submit"] { border-color: #2665d8; background: #2665d8; color: #fff; }

.sear-number-format-dialog::backdrop {
    background: rgba(24, 31, 42, 0.36);
}

.sear-number-format-dialog__tabs {
    display: flex;
    gap: 6px;
    padding: 0 24px;
    border-bottom: 1px solid #edf0f3;
    overflow-x: auto;
}

.sear-number-format-dialog__tabs button {
    min-width: 68px;
    min-height: 42px;
    padding: 0 10px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: #5d6570;
    font: inherit;
    cursor: pointer;
}

.sear-number-format-dialog__tabs button[aria-selected="true"] {
    border-bottom-color: #256cfb;
    color: #20242a;
}

.sear-number-format-dialog.is-full .sear-number-format-dialog__body {
    height: calc(100% - 180px);
}

.sear-number-format-dialog__body[hidden],
.sear-number-format-dialog__extra[hidden] { display: none; }

.sear-number-format-dialog__extra {
    box-sizing: border-box;
    height: calc(100% - 180px);
    padding: 28px 32px;
    overflow-y: auto;
    align-content: start;
}

.sear-number-format-dialog__field {
    display: grid;
    max-width: 440px;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 14px;
}

.sear-number-format-dialog__field input,
.sear-number-format-dialog__field select {
    box-sizing: border-box;
    width: 100%;
    min-height: 36px;
    padding: 6px 10px;
    border: 1px solid #cbd1d9;
    border-radius: 4px;
    background: #fff;
    color: #20242a;
    font: inherit;
}

.sear-number-format-dialog__field input[type="color"] {
    width: 64px;
    padding: 3px;
}

.sear-number-format-dialog__check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    cursor: pointer;
}

.sear-number-format-dialog > header,
.sear-number-format-dialog > footer {
    display: flex;
    align-items: center;
    padding: 18px 24px;
}

.sear-number-format-dialog > header {
    justify-content: space-between;
    border-bottom: 1px solid #edf0f3;
}

.sear-number-format-dialog > header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0;
}

.sear-number-format-dialog__close {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4f5660;
    font-size: 30px;
    font-weight: 300;
    line-height: 28px;
    cursor: pointer;
}

.sear-number-format-dialog__body {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    height: calc(100% - 137px);
    min-height: 0;
    padding: 18px 24px 0;
    gap: 28px;
}

.sear-number-format-dialog__categories {
    display: flex;
    min-height: 0;
    padding: 8px;
    overflow-y: auto;
    flex-direction: column;
    border: 1px solid #d9dde3;
    border-radius: 6px;
}

.sear-number-format-dialog__categories button {
    min-height: 38px;
    padding: 7px 12px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: #2d333b;
    font: inherit;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
}

.sear-number-format-dialog__categories button:hover {
    background: #f2f4f7;
}

.sear-number-format-dialog__categories button.is-active {
    background: #e9f1ff;
    color: #256cfb;
}

.sear-number-format-dialog__panel {
    display: grid;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    align-content: start;
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 0 4px 16px 0;
}

.sear-number-format-dialog__panel > label,
.sear-number-format-dialog__section-title {
    color: #5d6570;
    font-size: 13px;
    font-weight: 500;
}

.sear-number-format-dialog__preview {
    display: flex;
    min-height: 54px;
    align-items: center;
    padding: 0 16px;
    overflow: hidden;
    border: 1px solid #d6dae0;
    border-radius: 6px;
    background: #f7f8fa;
    color: #20242a;
    font-size: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sear-number-format-dialog__section-title {
    margin-top: 8px;
}

.sear-number-format-dialog__presets {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.sear-number-format-dialog__preset {
    display: grid;
    min-width: 0;
    min-height: 54px;
    padding: 8px 10px;
    border: 1px solid #d9dde3;
    border-radius: 6px;
    background: #fff;
    color: #282e36;
    text-align: left;
    cursor: pointer;
}

.sear-number-format-dialog__preset:hover {
    border-color: #9dbdff;
    background: #f7faff;
}

.sear-number-format-dialog__preset.is-active {
    border-color: #256cfb;
    background: #edf4ff;
    box-shadow: inset 0 0 0 1px #256cfb;
}

.sear-number-format-dialog__preset span {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sear-number-format-dialog__preset code {
    overflow: hidden;
    color: #69717d;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sear-number-format-dialog__custom {
    box-sizing: border-box;
    width: 100%;
    height: 38px;
    padding: 7px 10px;
    border: 1px solid #cbd1d9;
    border-radius: 5px;
    color: #20242a;
    font: 13px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.sear-number-format-dialog__custom[aria-invalid="true"] {
    border-color: #cb3636;
}

.sear-number-format-dialog__error:not(:empty) {
    color: #b42318;
    font-size: 12px;
}

.sear-number-format-dialog__button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.sear-number-format-dialog > footer {
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #edf0f3;
}

.sear-number-format-dialog__button {
    min-width: 82px;
    min-height: 38px;
    padding: 7px 18px;
    border: 1px solid #cbd1d9;
    border-radius: 5px;
    background: #fff;
    color: #2d333b;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
}

.sear-number-format-dialog__button.is-primary {
    border-color: #256cfb;
    background: #256cfb;
    color: #fff;
}

@media (max-width: 680px) {
    .sear-number-format-dialog__body {
        grid-template-columns: 126px minmax(0, 1fr);
        gap: 12px;
        padding-inline: 12px;
    }

    .sear-number-format-dialog__presets {
        grid-template-columns: 1fr;
    }

    .sear-number-format-dialog__preset code {
        overflow: visible;
        overflow-wrap: anywhere;
        text-overflow: clip;
        white-space: normal;
    }
}

.sear-toolbar__toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    z-index: 10000;
    padding: 9px 16px;
    border-radius: 6px;
    background: rgba(54, 55, 56, 0.96);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
    font-size: 13px;
    line-height: 18px;
    pointer-events: none;
    transform: translateX(-50%);
}

.sear-toolbar-duplicate-dialog {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(12, 16, 24, 0.18);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}

.sear-toolbar-duplicate-panel {
    position: relative;
    width: 360px;
    max-width: calc(100vw - 32px);
    padding: 22px 20px 18px;
    border: 1px solid rgba(23, 26, 29, 0.08);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 48px rgba(16, 24, 40, 0.18);
    color: rgba(23, 24, 28, 0.94);
}

.sear-toolbar-duplicate-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    color: rgba(23, 24, 28, 0.62);
    font: 26px/28px Arial, sans-serif;
}

.sear-toolbar-duplicate-title {
    margin: 0 36px 18px 0;
    font-size: 20px;
    font-weight: 600;
    line-height: 28px;
}

.sear-toolbar-duplicate-row,
.sear-toolbar-duplicate-column {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 34px;
    font-size: 15px;
}

.sear-toolbar-duplicate-row select {
    height: 28px;
    padding: 0 24px 0 8px;
    border: 1px solid #d7dce2;
    border-radius: 4px;
    background: #fff;
    font: inherit;
}

.sear-toolbar-duplicate-columns {
    max-height: 180px;
    margin: 12px 0;
    padding: 8px;
    overflow: auto;
    border: 1px solid rgba(23, 26, 29, 0.08);
    border-radius: 6px;
}

.sear-toolbar-duplicate-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
}

.sear-toolbar-duplicate-actions button {
    min-width: 76px;
    min-height: 36px;
    border: 1px solid #d7dce2;
    border-radius: 5px;
    background: #fff;
    color: rgba(23, 24, 28, 0.94);
    font: inherit;
    font-size: 14px;
}

.sear-toolbar-duplicate-actions [data-role="confirm"] {
    border-color: #256cfb;
    background: #256cfb;
    color: #fff;
}

.sear-cell-highlight-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    background: rgba(12, 16, 24, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Arial, sans-serif;
}
.sear-sheet-sort-overlay { position: fixed; inset: 0; z-index: 10020; display: grid; place-items: center; background: #1118; }
.sear-sheet-filter-overlay { position: fixed; inset: 0; z-index: 10020; display: grid; place-items: center; background: #1118; }
.sear-sheet-filter-panel { position: relative; box-sizing: border-box; width: min(400px, calc(100vw - 24px)); max-height: min(85vh, 700px); overflow: auto; padding: 20px; border: 1px solid #dfe3e9; border-radius: 6px; background: #fff; color: #202329; box-shadow: 0 18px 48px #0003; font: 14px sans-serif; }
.sear-sheet-filter-panel h2 { margin: 0 32px 16px 0; font-size: 17px; }
.sear-sheet-filter-close { position: absolute; top: 10px; right: 12px; width: 30px; height: 30px; border: 0; background: transparent; font-size: 22px; cursor: pointer; }
.sear-sheet-filter-panel > label { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sear-sheet-filter-panel select, .sear-sheet-filter-panel input[type="text"], .sear-sheet-filter-panel input[type="date"], .sear-sheet-filter-panel input[type="search"] { box-sizing: border-box; width: 100%; min-width: 0; height: 34px; padding: 5px 8px; border: 1px solid #cbd2da; border-radius: 4px; background: #fff; color: inherit; font: inherit; }
.sear-sheet-filter-panel > label select { width: 75%; }
.sear-sheet-filter-sorting { display: flex; gap: 8px; margin-top: 14px; }
.sear-sheet-filter-sorting button { flex: 1; min-height: 32px; border: 1px solid #dfe3e9; border-radius: 4px; background: #fff; cursor: pointer; }
.sear-sheet-filter-sorting button:hover { background: #f3f6fa; }
.sear-sheet-filter-tabs { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; border-bottom: 1px solid #dfe3e9; }
.sear-sheet-filter-tabs button { min-height: 36px; border: 0; border-bottom: 2px solid transparent; background: transparent; cursor: pointer; }
.sear-sheet-filter-tabs button[aria-selected="true"] { border-bottom-color: #256cfb; color: #1769d2; }
.sear-sheet-filter-body { display: grid; gap: 10px; padding-top: 14px; }
.sear-sheet-filter-value-controls { display: flex; gap: 14px; }
.sear-sheet-filter-value-controls button { border: 0; background: transparent; color: #1769d2; cursor: pointer; }
.sear-sheet-filter-values { max-height: 240px; overflow: auto; border: 1px solid #e5e8ed; border-radius: 4px; }
.sear-sheet-filter-values label { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 8px; }
.sear-sheet-filter-values label[hidden] { display: none; }
.sear-sheet-filter-values label span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sear-sheet-filter-values label small { color: #69717c; }
.sear-sheet-filter-values label button { border: 0; background: transparent; color: #1769d2; cursor: pointer; }
.sear-sheet-filter-limit { margin: 0; color: #69717c; font-size: 12px; }
.sear-sheet-filter-panel > .sear-sheet-filter-auto { display: inline-flex; justify-content: flex-start; align-items: center; gap: 7px; margin-top: 10px; }
.sear-sheet-filter-status { min-height: 16px; margin: 8px 0 0; color: #b42318; font-size: 12px; }
.sear-sheet-filter-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.sear-sheet-filter-actions button { min-height: 34px; padding: 0 10px; border: 1px solid #cbd2da; border-radius: 4px; background: #fff; cursor: pointer; }
.sear-sheet-filter-actions button:last-child { border-color: #256cfb; background: #256cfb; color: #fff; }
.sear-sheet-filter-actions button:disabled { opacity: .45; cursor: default; }
.sear-sheet-sort-panel { position: relative; box-sizing: border-box; width: min(520px, calc(100vw - 24px)); max-height: min(80vh, 680px); overflow: auto; padding: 22px; border: 1px solid #dfe3e9; border-radius: 6px; background: #fff; color: #202329; box-shadow: 0 18px 48px #0003; font: 14px sans-serif; }
.sear-sheet-sort-panel h2 { margin: 0 32px 18px 0; font-size: 17px; font-weight: 600; }
.sear-sheet-sort-close { position: absolute; top: 12px; right: 14px; width: 28px; height: 28px; border: 0; background: transparent; font-size: 23px; cursor: pointer; }
.sear-sheet-sort-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.sear-sheet-sort-criteria { display: grid; gap: 8px; }
.sear-sheet-sort-criterion { display: grid; grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1fr) 30px; align-items: center; gap: 8px; }
.sear-sheet-sort-criterion select, .sear-sheet-sort-criterion input { box-sizing: border-box; min-width: 0; width: 100%; height: 34px; padding: 4px 8px; border: 1px solid #cbd2da; border-radius: 4px; background: #fff; color: inherit; font: inherit; }
.sear-sheet-sort-criterion button { width: 30px; height: 30px; border: 0; background: transparent; font-size: 20px; cursor: pointer; }
.sear-sheet-sort-criterion button:disabled { color: #b8bec6; cursor: default; }
.sear-sheet-sort-add { margin-top: 14px; padding: 5px 0; border: 0; background: transparent; color: #1769d2; font: inherit; cursor: pointer; }
.sear-sheet-sort-status { min-height: 18px; margin: 8px 0 0; color: #b42318; font-size: 12px; }
.sear-sheet-sort-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.sear-sheet-sort-actions button { min-width: 72px; height: 34px; border: 1px solid #cbd2da; border-radius: 4px; background: #fff; color: inherit; font: inherit; cursor: pointer; }
.sear-sheet-sort-actions [data-role="confirm"] { border-color: #256cfb; background: #256cfb; color: #fff; }
@media (max-width: 440px) { .sear-sheet-sort-criterion { grid-template-columns: 1fr 1fr 30px; } .sear-sheet-sort-criterion span { grid-column: 1 / -1; } }

.sear-cell-highlight-panel {
    position: relative;
    box-sizing: border-box;
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 22px;
    border: 1px solid #dfe3e8;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 48px rgba(16, 24, 40, 0.18);
    color: #17181c;
    font-size: 14px;
}

.sear-cell-highlight-panel h2 { margin: 0 40px 18px 0; font-size: 18px; font-weight: 600; }
.sear-cell-highlight-close { position: absolute; top: 14px; right: 14px; border: 0; background: none; font-size: 24px; cursor: pointer; }
.sear-cell-highlight-panel select,
.sear-cell-highlight-range input,
.sear-cell-highlight-details input:not([type="checkbox"]) {
    box-sizing: border-box;
    width: 100%;
    height: 34px;
    padding: 0 9px;
    border: 1px solid #cbd2da;
    border-radius: 4px;
    background: #fff;
    color: inherit;
    font: inherit;
}
.sear-cell-highlight-range { display: block; margin-top: 12px; color: #4c5561; font-size: 13px; }
.sear-cell-highlight-range input { display: block; margin-top: 6px; }
.sear-cell-highlight-details { display: grid; gap: 10px; margin-top: 12px; }
.sear-cell-highlight-details input[hidden] { display: none; }
.sear-cell-highlight-details label { display: flex; align-items: center; gap: 8px; min-height: 28px; cursor: pointer; }
.sear-cell-highlight-details input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: #256cfb; }
.sear-cell-highlight-styles { margin: 18px 0 0; padding: 0; border: 0; }
.sear-cell-highlight-styles legend { margin-bottom: 8px; }
.sear-cell-highlight-styles label { display: flex; align-items: center; gap: 9px; min-height: 32px; cursor: pointer; }
.sear-cell-highlight-swatch { display: inline-block; flex: none; width: 32px; height: 20px; border: 1px solid #cbd2da; border-radius: 2px; }
.sear-cell-highlight-swatch.redFill { background: #fbc8cf; }
.sear-cell-highlight-swatch.yellowFill { background: #fce3a1; }
.sear-cell-highlight-swatch.greenFill { background: #c9edd1; }
.sear-cell-highlight-swatch.redBorder { border: 2px solid #bc0e1d; }
.sear-cell-highlight-swatch.redText { position: relative; }
.sear-cell-highlight-swatch.redText::after { content: "A"; display: block; color: #be0e1e; text-align: center; line-height: 18px; }
.sear-cell-highlight-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
.sear-cell-highlight-actions button { min-width: 72px; height: 34px; border: 1px solid #cbd2da; border-radius: 4px; background: #fff; color: inherit; font: inherit; cursor: pointer; }
.sear-cell-highlight-actions [data-role="confirm"] { border-color: #256cfb; background: #256cfb; color: #fff; }
.sear-cell-highlight-list { min-height: 100px; max-height: 300px; overflow: auto; margin-top: 12px; border-top: 1px solid #e6e9ed; }
.sear-cell-highlight-list p { color: #737984; }
.sear-cell-highlight-rule { display: flex; align-items: center; gap: 10px; min-height: 44px; border-bottom: 1px solid #e6e9ed; }
.sear-cell-highlight-rule span:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sear-cell-highlight-rule span.sear-validation-rule-summary { overflow: visible; white-space: pre-line; overflow-wrap: anywhere; line-height: 18px; padding: 6px 0; }
.sear-cell-highlight-rule button { width: 28px; height: 28px; border: 0; background: transparent; font-size: 19px; cursor: pointer; }
.sear-validation-panel { width: min(440px, calc(100vw - 24px)); }
.sear-validation-feedback { position: fixed; z-index: 9999; display: flex; align-items: flex-start; gap: 10px; width: min(270px, calc(100vw - 16px)); padding: 12px 14px; background: #fff; color: #30343a; border: 1px solid #e8eaed; border-radius: 7px; box-shadow: 0 3px 12px rgba(0, 0, 0, .12); pointer-events: none; box-sizing: border-box; }
.sear-validation-feedback__icon { display: grid; place-items: center; flex: 0 0 27px; width: 27px; height: 27px; border-radius: 50%; background: #ff873d; color: #fff; font-weight: 700; }
.sear-validation-feedback strong { display: block; margin: 0 0 2px; color: #fa5b2d; font-size: 15px; line-height: 22px; }
.sear-validation-feedback__message { margin: 0; font-size: 14px; line-height: 21px; overflow-wrap: anywhere; }
.sear-validation-feedback--hint { border-left: 3px solid #4b718f; }
.sear-validation-feedback--hint .sear-validation-feedback__icon { display: none; }
.sear-validation-feedback--hint strong { color: #365b77; }
.sear-validation-tabs { display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid #e6e9ed; }
.sear-validation-tabs button { min-height: 34px; padding: 0 10px; border: 0; background: transparent; color: #26313d; cursor: pointer; }
.sear-validation-tabs button[aria-selected="true"] { color: #12559a; box-shadow: inset 0 -2px #2b76d2; font-weight: 600; }
.sear-validation-tabs button:focus-visible { outline: 2px solid #2b76d2; outline-offset: -2px; }
.sear-validation-fields { display: grid; gap: 12px; }
.sear-validation-date-hint { margin: 0; color: #52616c; font-size: 12px; line-height: 18px; }
.sear-validation-fields[hidden], .sear-validation-field[hidden], .sear-validation-fields label[hidden] { display: none; }
.sear-validation-field { display: grid; gap: 5px; color: #28313b; }
.sear-validation-field input, .sear-validation-field select, .sear-validation-option input:not([type="color"]) {
  box-sizing: border-box; width: 100%; min-width: 0; height: 34px; padding: 4px 8px;
  border: 1px solid #cbd2da; border-radius: 4px; background: #fff; color: #17181c; font: inherit;
}
.sear-validation-fields > label:not(.sear-validation-field) { display: flex; align-items: center; gap: 7px; }
.sear-validation-options { display: grid; gap: 8px; max-height: 180px; overflow: auto; }
.sear-validation-options[hidden], .sear-validation-fields > button[hidden] { display: none; }
.sear-validation-option { display: grid; grid-template-columns: minmax(0, 1fr) 34px 28px; align-items: center; gap: 6px; }
.sear-validation-option input[type="color"] { width: 34px; height: 30px; padding: 2px; border: 1px solid #cbd2da; border-radius: 4px; }
.sear-validation-option button { width: 28px; height: 28px; border: 0; background: transparent; font-size: 20px; cursor: pointer; }
.sear-validation-fields > button { justify-self: start; border: 0; background: transparent; color: #1769d2; cursor: pointer; }
.sear-validation-panel .sear-cell-highlight-rule button { width: auto; min-width: 28px; padding: 0 4px; font-size: 13px; }
.sear-cell-data-visual-panel { max-height: min(80vh, 720px); overflow: auto; }
.sear-cell-data-visual-field { display: grid; grid-template-columns: 108px minmax(0, 1fr) auto; align-items: center; gap: 8px; margin: 10px 0; }
.sear-cell-data-visual-field select { min-width: 0; }
.sear-cell-data-visual-field input[type="number"] { width: 86px; min-width: 0; padding: 7px; border: 1px solid #cbd2da; border-radius: 4px; }
.sear-cell-data-visual-field input[type="color"] { width: 44px; height: 30px; padding: 1px; border: 1px solid #cbd2da; background: #fff; cursor: pointer; }
.sear-cell-data-visual-field[hidden] { display: none; }
.sear-freeze-menu { position: fixed; z-index: 10025; box-sizing: border-box; width: 212px; max-height: calc(100vh - 16px); overflow-y: auto; padding: 5px 0; background: #fff; color: #25272d; border: 1px solid #dedfe3; border-radius: 6px; box-shadow: 0 8px 22px rgba(0, 0, 0, .16); }
.sear-freeze-menu button { display: block; width: 100%; min-height: 34px; padding: 7px 14px; border: 0; background: transparent; color: inherit; font: 13px/20px inherit; text-align: left; white-space: nowrap; cursor: pointer; }
.sear-freeze-menu button:hover:not(:disabled), .sear-freeze-menu button:focus-visible { background: #f1f5fb; outline: 0; }
.sear-freeze-menu button:disabled { color: #a5a7ad; cursor: default; }
.sear-freeze-menu__divider { height: 1px; margin: 5px 0; background: #e8e9ec; }
`;
