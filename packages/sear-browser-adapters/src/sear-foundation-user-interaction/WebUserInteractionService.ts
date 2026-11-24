import { UserInteractionService, type UserConfirmationRequest } from '@searsuite/sear-foundation-user-interaction';
import { Injectable } from '@searsuite/sear-foundation-di';

interface PendingConfirmation {
  readonly request: UserConfirmationRequest;
  readonly resolve: (confirmed: boolean) => void;
  readonly reject: (error: unknown) => void;
}

interface ActiveConfirmation extends PendingConfirmation {
  readonly dialog: HTMLDialogElement;
  finish(confirmed: boolean): void;
}

const dialogStyle = `
  .sear-user-confirmation {
    width: min(420px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    box-sizing: border-box;
    padding: 24px;
    border: 1px solid #d5d9e0;
    border-radius: 8px;
    background: #fff;
    color: #202832;
    font: 14px/1.5 sans-serif;
    box-shadow: 0 16px 48px rgba(0, 0, 0, .18);
  }
  .sear-user-confirmation::backdrop { background: rgba(17, 24, 39, .42); }
  .sear-user-confirmation__title { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
  .sear-user-confirmation__message { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .sear-user-confirmation__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  .sear-user-confirmation__button {
    min-height: 34px;
    padding: 6px 12px;
    border: 1px solid #c9cfd8;
    border-radius: 4px;
    background: #fff;
    color: inherit;
    cursor: pointer;
  }
  .sear-user-confirmation__button--confirm { border-color: #bd3843; background: #bd3843; color: #fff; }
  .sear-user-confirmation__button:focus-visible { outline: 2px solid #1768a8; outline-offset: 2px; }
`;

/** Browser dialog adapter for explicit user confirmations. */
@Injectable()
export class WebUserInteractionService extends UserInteractionService {
  readonly #documentRef: Pick<Document, 'body' | 'createElement'>;

  readonly #queue: PendingConfirmation[] = [];
  #active: ActiveConfirmation | null = null;
  #destroyed = false;

  public constructor(documentRef: Pick<Document, 'body' | 'createElement'> = document) {
    super();
    this.#documentRef = documentRef;
  }

  public confirm(request: UserConfirmationRequest): Promise<boolean> {
    if (this.#destroyed) return Promise.resolve(false);
    return new Promise<boolean>((resolve, reject) => {
      this.#queue.push({ request, resolve, reject });
      this.#showNext();
    });
  }

  public destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#active?.finish(false);
    this.#queue.splice(0).forEach(({ resolve }) => resolve(false));
  }

  #showNext(): void {
    if (this.#destroyed || this.#active) return;
    const pending = this.#queue.shift();
    if (!pending) return;

    const dialog = this.#documentRef.createElement('dialog');
    dialog.className = 'sear-user-confirmation';
    const style = this.#documentRef.createElement('style');
    style.textContent = dialogStyle;
    const title = this.#documentRef.createElement('h2');
    title.className = 'sear-user-confirmation__title';
    title.textContent = pending.request.title;
    dialog.setAttribute('aria-label', pending.request.title);
    const message = this.#documentRef.createElement('p');
    message.className = 'sear-user-confirmation__message';
    message.textContent = pending.request.message;
    const actions = this.#documentRef.createElement('div');
    actions.className = 'sear-user-confirmation__actions';
    const cancel = this.#createButton(pending.request.cancelLabel);
    const confirm = this.#createButton(pending.request.confirmLabel);
    confirm.classList.add('sear-user-confirmation__button--confirm');
    actions.append(cancel, confirm);
    dialog.append(style, title, message, actions);

    let settled = false;
    const finish = (confirmed: boolean): void => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      this.#active = null;
      pending.resolve(confirmed);
      this.#showNext();
    };
    this.#active = { ...pending, dialog, finish };
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener('close', () => finish(false));
    this.#documentRef.body.appendChild(dialog);
    try {
      dialog.showModal();
      cancel.focus();
    } catch (error) {
      settled = true;
      dialog.remove();
      this.#active = null;
      pending.reject(error);
      this.#showNext();
    }
  }

  #createButton(label: string): HTMLButtonElement {
    const button = this.#documentRef.createElement('button');
    button.type = 'button';
    button.className = 'sear-user-confirmation__button';
    button.textContent = label;
    return button;
  }
}
