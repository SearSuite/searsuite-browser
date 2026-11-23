/** Shared SVG attributes used by the inline toolbar icons. */
const svgAttrs = 'width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"';

/** Inline SVG icons used by the web toolbar. */
export const ICONS = {
  clipboard: `<svg ${svgAttrs}><rect x="4" y="2" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M6 2V1.5A1.5 1.5 0 0 1 7.5 0h1A1.5 1.5 0 0 1 10 1.5V2" stroke="currentColor" stroke-width="1.3"/><line x1="6.5" y1="6" x2="9.5" y2="6" stroke="currentColor" stroke-width="1.2"/><line x1="6.5" y1="8.5" x2="9.5" y2="8.5" stroke="currentColor" stroke-width="1.2"/></svg>`,

  cut: `<svg ${svgAttrs}><circle cx="5" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><line x1="6.5" y1="10.5" x2="11" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="9.5" y1="10.5" x2="5" y2="2" stroke="currentColor" stroke-width="1.3"/></svg>`,

  copy: `<svg ${svgAttrs}><rect x="5" y="5" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V2.5A1.5 1.5 0 0 1 4.5 1H9" stroke="currentColor" stroke-width="1.3"/></svg>`,

  paintBrush: `<svg ${svgAttrs}><path d="M3 13l3-3m0 0l5-5a2 2 0 0 0-2.83-2.83L3 7.34V10h3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,

  bold: `<svg ${svgAttrs}><path d="M4 2h5.5a3 3 0 0 1 0 6H4V2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M4 8h6.5a3 3 0 0 1 0 6H4V8z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,

  italic: `<svg ${svgAttrs}><line x1="9" y1="2" x2="6" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="2" x2="11" y2="2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="14" x2="8" y2="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,

  underline: `<svg ${svgAttrs}><path d="M4 2v7a4 4 0 0 0 8 0V2" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><line x1="3" y1="14.5" x2="13" y2="14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,

  strikethrough: `<svg ${svgAttrs}><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.3"/><path d="M5 4.5C5.5 3.2 7 2 8.5 2 10.3 2 11.5 3 11.5 4.5c0 .7-.3 1.3-.8 1.8M4.5 11c.3 1.5 1.8 3 4 3 2 0 3.5-1.2 3.5-3 0-.5-.1-1-.4-1.4" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,

  fontColor: `<svg ${svgAttrs}><path d="M5.5 11h5L8 4l-2.5 7z" fill="currentColor"/><line x1="3" y1="14" x2="13" y2="14" stroke="#e53935" stroke-width="2" stroke-linecap="round"/></svg>`,

  fillColor: `<svg ${svgAttrs}><path d="M8 2L3 9h10L8 2z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/><rect x="2" y="12" width="12" height="3" rx="0.5" fill="#fbbc04"/></svg>`,

  alignLeft: `<svg ${svgAttrs}><line x1="2" y1="3" x2="14" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  alignCenter: `<svg ${svgAttrs}><line x1="2" y1="3" x2="14" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="6" x2="12" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  alignRight: `<svg ${svgAttrs}><line x1="2" y1="3" x2="14" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  alignTop: `<svg ${svgAttrs}><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="5" x2="12" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  alignMiddle: `<svg ${svgAttrs}><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="9.5" x2="9" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  alignBottom: `<svg ${svgAttrs}><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="11" x2="9" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  wrapText: `<svg ${svgAttrs}><path d="M3 4h10M3 8h7a2 2 0 0 1 0 4H7" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M9 10l-2 2 2 2" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  mergeCells: `<svg ${svgAttrs}><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M5.5 8h5M8 5.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 6.5l1.5 1.5L5 9.5M11 6.5l-1.5 1.5L11 9.5" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  rowHeight: `<svg ${svgAttrs}><line x1="3" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="3" y1="13" x2="13" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 5v6M6 6l2-1 2 1M6 10l2 1 2-1" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  colWidth: `<svg ${svgAttrs}><line x1="3" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="13" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 8h6M6 6l-1 2 1 2M10 6l1 2-1 2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  autoSum: `<svg ${svgAttrs}><text x="3" y="13" font-size="14" font-weight="600" font-family="serif" fill="currentColor">&Sigma;</text></svg>`,

  find: `<svg ${svgAttrs}><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,

  freeze: `<svg ${svgAttrs}><line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="5" y1="5" x2="5" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  gridlines: `<svg ${svgAttrs}><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1"/><line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1"/><line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" stroke-width="1"/><line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1"/></svg>`,

  insert: `<svg ${svgAttrs}><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  delete: `<svg ${svgAttrs}><line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  sortAsc: `<svg ${svgAttrs}><path d="M3 4h10M3 8h7M3 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  clear: `<svg ${svgAttrs}><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.1" fill="none" opacity="0.4"/></svg>`,

  fill: `<svg ${svgAttrs}><path d="M8 3v10M5 6l3-3 3 3M5 10l3 3 3-3" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
