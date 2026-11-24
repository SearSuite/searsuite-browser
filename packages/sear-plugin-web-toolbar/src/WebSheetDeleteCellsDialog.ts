export type SheetDeleteCellsMode = 'left' | 'up' | 'row' | 'column';

/** Browser dialog for choosing how a selected sheet range is removed. */
export class WebSheetDeleteCellsDialog {
  #dialog: HTMLDialogElement | null = null;

  public open(onApply: (mode: SheetDeleteCellsMode) => void): void {
    this.destroy();
    const dialog = document.createElement('dialog');
    dialog.className = 'sear-delete-cells-dialog';
    dialog.setAttribute('aria-label', 'Delete cells');
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Delete cells</h2>
        <fieldset>
          <legend>After deletion</legend>
          <label><input type="radio" name="delete-mode" value="left" checked>Shift cells left</label>
          <label><input type="radio" name="delete-mode" value="up">Shift cells up</label>
          <label><input type="radio" name="delete-mode" value="row">Entire row</label>
          <label><input type="radio" name="delete-mode" value="column">Entire column</label>
        </fieldset>
        <footer><button type="button" data-action="cancel">Cancel</button><button type="submit" data-action="apply">OK</button></footer>
      </form>`;
    document.body.appendChild(dialog);
    this.#dialog = dialog;
    dialog.querySelector<HTMLButtonElement>('[data-action="cancel"]')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => this.destroy());
    dialog.querySelector('form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const mode = dialog.querySelector<HTMLInputElement>('input[name="delete-mode"]:checked')?.value as SheetDeleteCellsMode;
      dialog.close();
      onApply(mode);
    });
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input[name="delete-mode"]')?.focus();
  }

  public destroy(): void {
    this.#dialog?.remove();
    this.#dialog = null;
  }
}
