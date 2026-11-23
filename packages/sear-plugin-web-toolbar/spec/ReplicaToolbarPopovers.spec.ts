import { createReplicaToolbarPopovers } from '../src/ReplicaToolbarPopovers';

describe('ReplicaToolbarPopovers keyboard navigation', () => {
  afterEach(() => document.body.replaceChildren());

  it('BUG-106 keeps arrow navigation inside the number-format menu and opens its submenu', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const controller = createReplicaToolbarPopovers();
    expect(controller.open('numberFormat', anchor)).toBe(true);
    const menu = document.querySelector<HTMLElement>('[data-testid="toolbar-popover-numberFormat"]')!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(document.activeElement?.textContent).toContain('Auto');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('Number');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.querySelector('[data-testid="toolbar-popover-numberFormat-number"]')?.getAttribute('role'))
      .toBe('menu');
    expect(document.activeElement?.textContent).toContain('Integer');
    controller.close();
  });

  it('BUG-251 lets keyboard users activate a more-menu item and close with Escape', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const onSelect = jest.fn();
    const controller = createReplicaToolbarPopovers();
    controller.open('more', anchor, onSelect);
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5);
    expect(document.activeElement?.textContent).toContain('Find and replace');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('Protect range');
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true');
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('Find and replace');
    expect(document.querySelector('.sear-toolbar-popovers')).toBeNull();

    controller.open('more', anchor, onSelect);
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.sear-toolbar-popovers')).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it('BUG-525 keeps validation menu arrows away from sheet input and closes on Escape', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const sheetKeydown = jest.fn();
    document.addEventListener('keydown', sheetKeydown);
    const controller = createReplicaToolbarPopovers();
    expect(controller.open('dataValidation', anchor)).toBe(true);
    expect(document.activeElement?.textContent).toContain('Set rule');

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    expect(document.activeElement?.textContent).toContain('View all rules');
    expect(sheetKeydown).not.toHaveBeenCalled();

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true,
    }));
    expect(document.querySelector('.sear-toolbar-popovers')).toBeNull();
    expect(document.activeElement).toBe(anchor);
    expect(sheetKeydown).not.toHaveBeenCalled();
    document.removeEventListener('keydown', sheetKeydown);
  });
});
