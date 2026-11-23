import {
  BorderLinePaint,
  SheetBorderLineStyle,
  SheetBorderPreset,
  type SheetBorderStroke,
} from '@searsuite/sear-plugin-cell-border';
import { DESIGNED_TOOLBAR_ICONS } from './DesignedToolbarIcons';

const PRESETS: readonly { preset: SheetBorderPreset; label: string; segments: readonly number[]; icon?: string }[] = [
  { preset: SheetBorderPreset.Outside, label: 'Outside borders', segments: [0, 1, 2, 3], icon: DESIGNED_TOOLBAR_ICONS.outerBorders },
  { preset: SheetBorderPreset.Inside, label: 'Inside borders', segments: [4, 5] },
  { preset: SheetBorderPreset.All, label: 'All borders', segments: [0, 1, 2, 3, 4, 5], icon: DESIGNED_TOOLBAR_ICONS.allBorders },
  { preset: SheetBorderPreset.Left, label: 'Left border', segments: [0] },
  { preset: SheetBorderPreset.Vertical, label: 'Inside vertical border', segments: [4] },
  { preset: SheetBorderPreset.Right, label: 'Right border', segments: [1] },
  { preset: SheetBorderPreset.Top, label: 'Top border', segments: [2] },
  { preset: SheetBorderPreset.Horizontal, label: 'Inside horizontal border', segments: [5] },
  { preset: SheetBorderPreset.Bottom, label: 'Bottom border', segments: [3] },
  { preset: SheetBorderPreset.None, label: 'No borders', segments: [], icon: DESIGNED_TOOLBAR_ICONS.noBorders },
];
const STYLE_LABELS: Readonly<Record<SheetBorderLineStyle, string>> = {
  thin: 'Thin solid',
  medium: 'Medium solid',
  thick: 'Thick solid',
  dashed: 'Dashed',
  dotted: 'Dotted',
  dashDot: 'Dash-dot',
  dashDotDot: 'Dash-dot-dot',
  hair: 'Hairline',
  mediumDashed: 'Medium dashed',
  mediumDashDot: 'Medium dash-dot',
  mediumDashDotDot: 'Medium dash-dot-dot',
  double: 'Double',
  slantedDashDot: 'Slanted dash-dot',
};

/** Border-only host popover; stroke choices remain local until a preset is applied. */
export class WebCellBorderMenu {
  private root: HTMLElement | null = null;
  private anchor: HTMLElement | null = null;
  private color = '#000000';
  private style: SheetBorderLineStyle = SheetBorderLineStyle.Thin;
  private readonly handleOutside = (event: PointerEvent): void => {
    if (!this.root?.contains(event.target as Node) && !this.anchor?.contains(event.target as Node)) this.close();
  };
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      const anchor = this.anchor;
      event.stopPropagation();
      this.close();
      anchor?.focus();
    }
  };

  /** Opens the border controls next to the toolbar button. */
  public open(anchor: HTMLElement, apply: (preset: SheetBorderPreset, stroke: SheetBorderStroke) => void): void {
    if (this.root && this.anchor === anchor) {
      this.close();
      return;
    }
    this.close();
    this.anchor = anchor;
    const root = document.createElement('div');
    this.root = root;
    root.className = 'sear-cell-border-menu';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Cell borders');
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    const grid = document.createElement('div');
    grid.className = 'sear-cell-border-presets';
    for (const item of PRESETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = item.label;
      button.setAttribute('aria-label', item.label);
      button.dataset['borderPreset'] = item.preset;
      button.innerHTML = item.icon ?? presetIcon(item.segments);
      button.addEventListener('click', () => {
        apply(item.preset, { color: this.color, style: this.style });
        this.close();
      });
      grid.appendChild(button);
    }
    const controls = document.createElement('div');
    controls.className = 'sear-cell-border-controls';
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    const color = document.createElement('input');
    color.type = 'color';
    color.value = this.color;
    color.setAttribute('aria-label', 'Border color');
    color.addEventListener('input', () => {
      this.color = color.value;
      updatePreview();
    });
    colorLabel.appendChild(color);
    const styleLabel = document.createElement('label');
    styleLabel.textContent = 'Line style';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Border line style');
    for (const style of Object.values(SheetBorderLineStyle)) {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = STYLE_LABELS[style];
      select.appendChild(option);
    }
    select.value = this.style;
    const preview = document.createElement('div');
    preview.className = 'sear-cell-border-preview';
    const updatePreview = (): void => {
      const paint = BorderLinePaint[this.style];
      const lines = paint.double ? [8, 12] : [10];
      preview.innerHTML = `<svg width="120" height="20" viewBox="0 0 120 20" aria-hidden="true">${lines
        .map(
          (y) =>
            `<line x1="4" y1="${y}" x2="116" y2="${y}" stroke="${this.color}" stroke-width="${
              paint.width
            }" stroke-dasharray="${paint.dash.join(' ')}"/>`,
        )
        .join('')}</svg>`;
    };
    select.addEventListener('change', () => {
      this.style = select.value as SheetBorderLineStyle;
      updatePreview();
    });
    styleLabel.appendChild(select);
    controls.append(colorLabel, styleLabel, preview);
    root.append(grid, controls);
    document.body.appendChild(root);
    const rect = anchor.getBoundingClientRect();
    root.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - root.offsetWidth - 8))}px`;
    root.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - root.offsetHeight - 8))}px`;
    document.addEventListener('pointerdown', this.handleOutside);
    document.addEventListener('keydown', this.handleKey, true);
    updatePreview();
    grid.querySelector<HTMLButtonElement>('button')?.focus();
  }

  /** Removes acquired nodes and event listeners on close or toolbar teardown. */
  public close(): void {
    this.root?.remove();
    this.root = null;
    this.anchor = null;
    document.removeEventListener('pointerdown', this.handleOutside);
    document.removeEventListener('keydown', this.handleKey, true);
  }
}

function presetIcon(segments: readonly number[]): string {
  const coordinates = ['4,4 4,28', '28,4 28,28', '4,4 28,4', '4,28 28,28', '16,4 16,28', '4,16 28,16'];
  return `<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">${coordinates
    .map(
      (points, index) =>
        `<polyline points="${points}" fill="none" stroke="${
          segments.includes(index) ? 'currentColor' : '#9ca3af'
        }" stroke-width="${segments.includes(index) ? 2 : 1}" ${
          segments.includes(index) ? '' : 'stroke-dasharray="1 3"'
        }/>`,
    )
    .join('')}</svg>`;
}
