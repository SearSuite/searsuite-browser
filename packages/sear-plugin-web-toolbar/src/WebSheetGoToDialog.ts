export type SheetGoToChoice = 'address' | 'constants' | 'formulas' | 'blanks' | 'region';

/** Browser-facing Go To dialog; selection and data reads stay with the caller. */
export class WebSheetGoToDialog {
  #dialog: HTMLDialogElement | null = null;

  public open(onApply: (choice: SheetGoToChoice, address: string) => string | null, onClose: () => void): void {
    this.destroy();
    const dialog = document.createElement('dialog');
    dialog.className = 'sear-go-to-dialog';
    dialog.setAttribute('aria-label', 'Go to');
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Go to</h2>
        <label class="sear-go-to-dialog__address">Reference<input type="text" name="address" autocomplete="off" placeholder="A1 or A1:B10"></label>
        <fieldset>
          <legend>Go to special</legend>
          <label><input type="radio" name="choice" value="address" checked>Reference</label>
          <label><input type="radio" name="choice" value="constants">Constants</label>
          <label><input type="radio" name="choice" value="formulas">Formulas</label>
          <label><input type="radio" name="choice" value="blanks">Blanks</label>
          <label><input type="radio" name="choice" value="region">Current data region</label>
        </fieldset>
        <p class="sear-go-to-dialog__error" role="alert" hidden></p>
        <footer><button type="button" data-action="cancel">Cancel</button><button type="submit">Go to</button></footer>
      </form>`;
    document.body.appendChild(dialog);
    this.#dialog = dialog;
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (dialog.open) dialog.close();
      this.destroy();
      onClose();
    };
    dialog.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', finish);
    dialog.addEventListener('close', finish);
    dialog.querySelector('form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const choice = dialog.querySelector<HTMLInputElement>('input[name="choice"]:checked')!.value as SheetGoToChoice;
      const address = dialog.querySelector<HTMLInputElement>('input[name="address"]')!.value;
      const error = onApply(choice, address);
      const feedback = dialog.querySelector<HTMLElement>('.sear-go-to-dialog__error')!;
      feedback.hidden = !error;
      feedback.textContent = error;
      if (!error) finish();
    });
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input[name="address"]')?.focus();
  }

  public destroy(): void {
    this.#dialog?.remove();
    this.#dialog = null;
  }
}
