/** Returns keyboard focus to this editor's Web rendering surface without scrolling it. */
export function focusWebSheetSurface(surface: unknown): boolean {
  if (!(surface instanceof HTMLElement || surface instanceof SVGElement) || !surface.isConnected) return false;
  const proxyId = surface.getAttribute('data-sear-grid-proxy');
  const proxy = proxyId ? surface.ownerDocument.getElementById(proxyId) : null;
  const target = proxy instanceof HTMLElement ? proxy : surface;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  return document.activeElement === target;
}
