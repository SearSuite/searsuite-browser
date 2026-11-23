import { WebUserInteractionService } from '../../src';
import { type UserConfirmationRequest } from '@searsuite/sear-foundation-user-interaction';

const request: UserConfirmationRequest = {
  title: 'Merge cells?',
  message: 'Other values will be removed.',
  confirmLabel: 'Merge',
  cancelLabel: 'Cancel',
};

describe('WebUserInteractionService', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  });

  afterEach(() => {
    document.querySelectorAll('dialog.sear-user-confirmation').forEach((dialog) => dialog.remove());
  });

  it('displays request text and resolves an explicit confirmation', async () => {
    const service = new WebUserInteractionService(document);
    const result = service.confirm({ ...request, message: '<b>Other values</b> will be removed.' });
    const dialog = document.querySelector('dialog.sear-user-confirmation');
    expect(dialog?.textContent).toContain('<b>Other values</b>');
    expect(dialog?.querySelector('b')).toBeNull();

    dialog?.querySelectorAll('button')[1]?.click();
    await expect(result).resolves.toBe(true);
    expect(document.querySelector('dialog.sear-user-confirmation')).toBeNull();
    service.destroy();
  });

  it('cancels on Escape and handles one pending request at a time', async () => {
    const service = new WebUserInteractionService(document);
    const first = service.confirm(request);
    const second = service.confirm({ ...request, title: 'Second question' });
    expect(document.querySelectorAll('dialog.sear-user-confirmation')).toHaveLength(1);

    document.querySelector('dialog')?.dispatchEvent(new Event('cancel', { cancelable: true }));
    await expect(first).resolves.toBe(false);
    expect(document.querySelector('dialog')?.getAttribute('aria-label')).toBe('Second question');

    document.querySelector<HTMLButtonElement>('dialog button')?.click();
    await expect(second).resolves.toBe(false);
    service.destroy();
  });

  it('cancels active and queued requests on destroy', async () => {
    const service = new WebUserInteractionService(document);
    const first = service.confirm(request);
    const second = service.confirm(request);

    service.destroy();
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    await expect(service.confirm(request)).resolves.toBe(false);
    expect(document.querySelector('dialog.sear-user-confirmation')).toBeNull();
  });
});
