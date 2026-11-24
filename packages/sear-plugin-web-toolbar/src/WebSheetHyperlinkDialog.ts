export type SheetHyperlinkKind = 'web' | 'workbook' | 'email';

export interface SheetHyperlinkDraft {
  readonly kind: SheetHyperlinkKind;
  readonly label: string;
  readonly target: string;
}

/** Browser entry for creating a formula-backed hyperlink in the selected cell. */
export class WebSheetHyperlinkDialog {
  #dialog: HTMLDialogElement | null = null;

  public open(label: string, onApply: (draft: SheetHyperlinkDraft) => string | null, onClose: () => void): void {
    this.destroy();
    const dialog = document.createElement('dialog');
    dialog.className = 'sear-hyperlink-dialog';
    dialog.setAttribute('aria-label', 'Hyperlink');
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Hyperlink</h2>
        <div class="sear-hyperlink-dialog__tabs" role="tablist" aria-label="Link type">
          <button type="button" role="tab" aria-selected="true" data-kind="web">Web page</button>
          <button type="button" role="tab" aria-selected="false" data-kind="workbook">Place in this document</button>
          <button type="button" role="tab" aria-selected="false" data-kind="email">Email</button>
        </div>
        <label>Display text<input name="label" type="text" autocomplete="off"></label>
        <section data-panel="web"><label>URL<input name="web" type="url" placeholder="https://example.com" autocomplete="off"></label></section>
        <section data-panel="workbook" hidden>
          <label>Sheet<input name="sheet" type="text" placeholder="Current sheet" autocomplete="off"></label>
          <label>Cell<input name="cell" type="text" value="A1" autocomplete="off"></label>
        </section>
        <section data-panel="email" hidden>
          <label>Email address<input name="email" type="email" autocomplete="off"></label>
          <label>Subject<input name="subject" type="text" autocomplete="off"></label>
        </section>
        <p class="sear-hyperlink-dialog__error" role="alert" hidden></p>
        <footer><button type="button" data-action="cancel">Cancel</button><button type="submit">OK</button></footer>
      </form>`;
    document.body.appendChild(dialog);
    this.#dialog = dialog;
    dialog.querySelector<HTMLInputElement>('input[name="label"]')!.value = label;
    let kind: SheetHyperlinkKind = 'web';
    dialog.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((button) => button.addEventListener('click', () => {
      kind = button.dataset['kind'] as SheetHyperlinkKind;
      dialog.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((tab) =>
        tab.setAttribute('aria-selected', String(tab === button)));
      dialog.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset['panel'] !== kind; });
      dialog.querySelector<HTMLInputElement>(`[data-panel="${kind}"] input`)?.focus();
    }));
    dialog.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { this.destroy(); onClose(); });
    dialog.querySelector('form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = (name: string) => dialog.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value.trim();
      let target = '';
      if (kind === 'web') target = value('web');
      else if (kind === 'workbook') target = `#${value('sheet') ? `${value('sheet')}!` : ''}${value('cell').toUpperCase()}`;
      else target = `mailto:${value('email')}${value('subject') ? `?subject=${encodeURIComponent(value('subject'))}` : ''}`;
      const error = onApply({ kind, label: value('label'), target });
      const feedback = dialog.querySelector<HTMLElement>('.sear-hyperlink-dialog__error')!;
      feedback.hidden = !error;
      feedback.textContent = error;
      if (!error) dialog.close();
    });
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input[name="web"]')?.focus();
  }

  public destroy(): void {
    this.#dialog?.remove();
    this.#dialog = null;
  }
}
