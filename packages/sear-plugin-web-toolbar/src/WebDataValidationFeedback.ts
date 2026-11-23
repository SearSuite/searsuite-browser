import { type SheetQueryRegistry } from '@searsuite/sear-assembly-commands';
import { type SearCoreSheet } from '@searsuite/sear-assembly-core';
import { type Platform } from '@searsuite/sear-foundation-platform';
import { ReadDataValidationCellRulesQuery, ReadDataValidationIssueQuery } from '@searsuite/sear-plugin-data-validation';
import { readSheetFreeze } from '@searsuite/sear-plugin-freeze';
import { getSheetRangePositionRect } from '@searsuite/sear-render';
import { readSheetColumnSizes, readSheetRowSizes } from '@searsuite/sear-render-engine';

type Selection = { anchor: [number, number]; focus: [number, number] };

/** Displays the current cell's validation failure next to its selection. */
export class WebDataValidationFeedback {
  private root: HTMLElement | null = null;
  private disposeWheel: (() => void) | null = null;
  private disposeResize: (() => void) | null = null;
  private active = true;

  public constructor(
    private readonly core: SearCoreSheet,
    private readonly queries: SheetQueryRegistry,
    private readonly getSelection: () => Selection | null,
    private readonly platform: Platform,
  ) {
    const target = core.renderEngine.renderContext.getRoot();
    if (target instanceof Element) {
      this.disposeWheel = platform.addEventListener(target, 'wheel', () => {
        platform.setTimeout(() => this.refresh(), 0);
      });
    }
    this.disposeResize = platform.addEventListener(window, 'resize', () => this.refresh());
  }

  public refresh(): void {
    if (!this.active) return;
    const selection = this.getSelection();
    if (!selection || selection.anchor[0] !== selection.focus[0] ||
      selection.anchor[1] !== selection.focus[1]) {
      this.hide();
      return;
    }
    const issue = this.queries.has(ReadDataValidationIssueQuery)
      ? this.queries.run(ReadDataValidationIssueQuery, selection.anchor) : null;
    const prompt = !issue && this.queries.has(ReadDataValidationCellRulesQuery)
      ? this.queries.run(ReadDataValidationCellRulesQuery, selection.anchor)
        .find(({ rule }) => rule.inputMessage?.trim())?.rule.inputMessage : null;
    const position = (issue || prompt) && this.position(selection.anchor);
    if (!position) { this.hide(); return; }
    if (!this.root) {
      const root = document.createElement('div');
      root.className = 'sear-validation-feedback';
      root.setAttribute('role', 'status');
      const icon = document.createElement('span'); icon.className = 'sear-validation-feedback__icon'; icon.textContent = '!';
      const content = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = 'Invalid data';
      const message = document.createElement('p'); message.className = 'sear-validation-feedback__message';
      content.append(title, message); root.append(icon, content);
      document.body.append(root);
      this.root = root;
    }
    this.root.classList.toggle('sear-validation-feedback--hint', !issue);
    this.root.querySelector('strong')!.textContent = issue ? 'Invalid data' : 'Input message';
    this.root.querySelector<HTMLElement>('.sear-validation-feedback__message')!.textContent = issue?.message ?? prompt ?? '';
    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;
    const left = position.left - width - 10 >= 8 ? position.left - width - 10 : position.right + 10;
    this.root.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    this.root.style.top = `${Math.max(8, Math.min(position.top, window.innerHeight - height - 8))}px`;
  }

  public destroy(): void {
    this.active = false;
    this.disposeWheel?.(); this.disposeWheel = null;
    this.disposeResize?.(); this.disposeResize = null;
    this.hide();
  }

  private hide(): void { this.root?.remove(); this.root = null; }

  private position([row, column]: readonly [number, number]): { left: number; right: number; top: number } | null {
    const dataEngine = this.core.getDataEngine();
    const rowSizes = readSheetRowSizes(dataEngine);
    const columnSizes = readSheetColumnSizes(dataEngine);
    const target = this.core.renderEngine.renderContext.getRoot();
    if (!rowSizes || !columnSizes || !(target instanceof Element)) return null;
    const config = this.core.configEngine.getDefaultConfig() as { sheetOffsetX?: number; sheetOffsetY?: number };
    const rect = getSheetRangePositionRect([row, column], [row, column], {
      rowSizes, columnSizes, offsetX: config.sheetOffsetX ?? 50, offsetY: config.sheetOffsetY ?? 24,
    });
    if (!rect) return null;
    const bounds = target.getBoundingClientRect();
    const scroll = this.core.renderEngine.scrollManager.getState();
    const freeze = readSheetFreeze(dataEngine);
    const [viewportWidth, viewportHeight] = this.core.renderEngine.scrollManager.getShape();
    const scaleX = viewportWidth ? bounds.width / viewportWidth : 1;
    const scaleY = viewportHeight ? bounds.height / viewportHeight : 1;
    const left = bounds.left + (rect.x - (column < freeze.columns ? 0 : scroll.x)) * scaleX;
    const right = left + rect.width * scaleX;
    const top = bounds.top + (rect.y - (row < freeze.rows ? 0 : scroll.y)) * scaleY;
    if (right < bounds.left || left > bounds.right || top > bounds.bottom ||
      top + rect.height * scaleY < bounds.top) return null;
    return { left, right, top };
  }
}
