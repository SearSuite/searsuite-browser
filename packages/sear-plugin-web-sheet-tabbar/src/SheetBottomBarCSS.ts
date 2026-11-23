/** CSS injected by SearWebBottomBar for the browser sheet bottom bar. */
export const SHEET_BOTTOM_BAR_CSS = `
.sear-sheet-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 36px;
    padding: 0 10px 0 12px;
    border: 1px solid rgba(23, 26, 29, 0.08);
    border-bottom: 0;
    border-radius: 0;
    background: #f6f7fa;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
    color: rgba(23, 24, 28, 0.78);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 12px;
    line-height: 1;
    user-select: none;
}

.sear-sheet-bottom-bar button {
    border: 0;
    appearance: none;
    font: inherit;
    color: inherit;
}

.sear-sheet-bottom-bar__tabs-panel,
.sear-sheet-bottom-bar__status-panel {
    display: flex;
    align-items: center;
    height: 100%;
}

.sear-sheet-bottom-bar__tabs-panel {
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
}

.sear-sheet-bottom-bar__status-panel {
    gap: 6px;
    margin-left: auto;
}

.sear-sheet-bottom-bar__icon-button,
.sear-sheet-bottom-bar__grid,
.sear-sheet-bottom-bar__zoom-button,
.sear-sheet-bottom-bar__add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    cursor: default;
}

.sear-sheet-bottom-bar__icon-button {
    width: 22px;
    height: 22px;
    color: #79829a;
}

.sear-sheet-bottom-bar__add {
    width: 22px;
    height: 22px;
    color: #7a8297;
}

.sear-sheet-bottom-bar__tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
}

.sear-sheet-bottom-bar__tabs::-webkit-scrollbar {
    display: none;
}

.sear-sheet-bottom-bar__tab {
    min-width: 74px;
    max-width: 160px;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.66);
    box-shadow: 0 1px 2px rgba(23, 26, 29, 0.04);
    color: rgba(23, 24, 28, 0.72);
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-top: 2px solid var(--sear-sheet-tab-color, transparent);
}

.sear-sheet-bottom-bar__tab--active {
    background: #fff;
    color: #256cfb;
    font-weight: 600;
}

.sear-sheet-bottom-bar__tab--drop-before {
    box-shadow: inset 3px 0 #256cfb;
}

.sear-sheet-bottom-bar__tab--drop-after {
    box-shadow: inset -3px 0 #256cfb;
}

.sear-sheet-bottom-bar__rename {
    min-width: 74px;
    max-width: 160px;
    width: 120px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid #256cfb;
    border-radius: 4px;
    background: #fff;
    color: #17181c;
    font: inherit;
    user-select: text;
}

.sear-sheet-bottom-bar__context-menu {
    position: fixed;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 150px;
    padding: 5px;
    border: 1px solid #d9dce2;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 5px 18px rgba(23, 26, 29, 0.14);
    color: #17181c;
    font-size: 13px;
}

.sear-sheet-bottom-bar__context-menu button {
    border: 0;
    border-radius: 4px;
    padding: 7px 10px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.sear-sheet-bottom-bar__context-menu button:hover,
.sear-sheet-bottom-bar__context-menu button:focus-visible {
    background: #eef3ff;
}

.sear-sheet-bottom-bar__context-menu button:disabled {
    opacity: 0.45;
    cursor: default;
}

.sear-sheet-bottom-bar__context-menu span {
    padding: 7px 10px;
    line-height: 1.4;
}

.sear-sheet-bottom-bar__status {
    color: rgba(23, 24, 28, 0.48);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
}

.sear-sheet-bottom-bar__grid {
    width: 22px;
    height: 22px;
    color: #7182ac;
}

.sear-sheet-bottom-bar__divider {
    width: 1px;
    height: 20px;
    margin: 0 4px 0 6px;
    background: rgba(23, 26, 29, 0.08);
}

.sear-sheet-bottom-bar__zoom-button {
    width: 22px;
    height: 22px;
    color: rgba(23, 24, 28, 0.86);
}

.sear-sheet-bottom-bar__zoom-value {
    min-width: 46px;
    color: rgba(23, 24, 28, 0.86);
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
}

.sear-sheet-bottom-bar svg {
    display: block;
    flex: 0 0 14px;
    width: 14px;
    height: 14px;
}

.sear-sheet-bottom-bar button:hover {
    background: rgba(23, 26, 29, 0.05);
    border-radius: 5px;
}

.sear-sheet-bottom-bar button:disabled {
    cursor: default;
    opacity: 0.4;
}

.sear-sheet-bottom-bar button:disabled:hover {
    background: transparent;
}

.sear-sheet-bottom-bar__tab:hover {
    background: #fff;
}

.sear-sheet-bottom-bar__toast {
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

@media (max-width: 600px) {
    .sear-sheet-bottom-bar__tabs-panel {
        flex: 1 1 0;
    }

    .sear-sheet-bottom-bar__tabs {
        flex: 1 1 0;
        scrollbar-width: thin;
        touch-action: pan-x;
    }

    .sear-sheet-bottom-bar__tabs::-webkit-scrollbar {
        display: block;
        height: 4px;
    }

    .sear-sheet-bottom-bar__status-panel {
        flex: 0 0 auto;
        gap: 4px;
        margin-left: 4px;
    }

    .sear-sheet-bottom-bar__status {
        display: none;
    }
}
`;
