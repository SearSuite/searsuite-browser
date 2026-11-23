import { Injectable } from '@searsuite/sear-foundation-di';
import { PlatformEventName } from '@searsuite/sear-foundation-platform';

import { EventRegistrar } from '@searsuite/sear-render-event-engine';
import { normalizeEventKey } from '@searsuite/sear-render-event-engine';

const mouseEvents = [
  PlatformEventName.Click,
  'dblClick',
  'mouseDown',
  'mouseUp',
  'mouseMove',
  'mouseEnter',
  'mouseLeave',
  'mouseOver',
  'mouseOut',
  // 'wheel',
].map(normalizeEventKey);

/** Browser event registrar with the built-in mouse event surface enabled. */
@Injectable()
export class WebEventRegistrar extends EventRegistrar {
  /** Normalized mouse events supported by the browser registrar. */
  public registeredEvents: string[] = mouseEvents;
}
