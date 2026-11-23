import { WebCursorEngine } from '../../src/sear-render-cursor/WebCursorEngine';
import { CursorToken } from '@searsuite/sear-render-cursor';

describe('WebCursorEngine', () => {
  it('uses open and closed hands for range dragging', () => {
    const target = document.createElement('div');
    const engine = new WebCursorEngine();
    engine.mount(target);
    engine.apply(CursorToken.Grab);
    expect(target.style.cursor).toBe('grab');
    engine.override(CursorToken.Grabbing);
    expect(target.style.cursor).toBe('grabbing');
    engine.override(null);
    expect(target.style.cursor).toBe('default');
  });
  it('applies cursor presentation to an SVG render target', () => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const engine = new WebCursorEngine();

    engine.mount(target);
    engine.apply(CursorToken.Text);

    expect(target.style.cursor).toBe('text');
  });

  it.each([
    [CursorToken.Cell, '15 15'],
    [CursorToken.RowSelect, '21 14'],
    [CursorToken.ColumnSelect, '15 21'],
    [CursorToken.RowResize, '15 15'],
    [CursorToken.ColumnResize, '15 15'],
  ])('uses the SVG visual hotspot for %s', (token, hotspot) => {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const engine = new WebCursorEngine();

    engine.mount(target);
    engine.apply(token);

    expect(target.style.cursor).toContain(`") ${hotspot}, default`);
  });

  it('supports overriding the cursor', () => {
    const target = document.createElement('div');
    const engine = new WebCursorEngine();

    engine.override(CursorToken.Text); // No host element yet

    engine.mount(target);
    engine.override(CursorToken.Text);
    expect(target.style.cursor).toBe('text');

    // Test apply skips if overridden
    engine.apply(CursorToken.Default);
    expect(target.style.cursor).toBe('text'); // Still text

    engine.override(null); // Resets to default
    expect(target.style.cursor).toBe('default');
  });

  it('supports custom tokens and unmounts properly', () => {
    const target = document.createElement('div');
    const engine = new WebCursorEngine();
    engine.mount(target);

    engine.registerToken('custom' as CursorToken, 'help');
    engine.apply('custom' as CursorToken);
    expect(target.style.cursor).toBe('help');

    engine.unmount();
    expect(target.style.cursor).toBe('');

    // Applying without a host does nothing
    engine.apply(CursorToken.Text);
  });

  it('unmounts gracefully even if already unmounted', () => {
    const engine = new WebCursorEngine();
    expect(() => engine.unmount()).not.toThrow();
  });

  it('falls back to default cursor for unknown tokens in apply and override', () => {
    const target = document.createElement('div');
    const engine = new WebCursorEngine();
    engine.mount(target);

    // clear out the previous token to force apply
    target.style.cursor = '';
    engine.apply('unknown-token' as CursorToken);
    expect(target.style.cursor).toBe('default');

    engine.override('unknown-override-token' as CursorToken);
    expect(target.style.cursor).toBe('default');
  });
});
