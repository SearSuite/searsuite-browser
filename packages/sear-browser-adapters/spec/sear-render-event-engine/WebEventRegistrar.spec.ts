import { WebEventRegistrar } from '../../src';
import { EventRegistrar } from '@searsuite/sear-render-event-engine';

describe('WebEventRegistrar', () => {
  it('declares browser pointer events through the shared registrar contract', () => {
    const registrar = new WebEventRegistrar();
    expect(registrar).toBeInstanceOf(EventRegistrar);
    expect(registrar.registeredEvents).toEqual(expect.arrayContaining(['click', 'mouseDown', 'mouseMove', 'mouseUp']));
  });
});
