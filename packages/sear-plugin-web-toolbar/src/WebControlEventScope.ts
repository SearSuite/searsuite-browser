import { type Platform } from '@searsuite/sear-foundation-platform';
/** Owns Web control listeners through the injected platform and releases detached controls. */
export class WebControlEventScope {
  private bindings: { target: EventTarget; dispose: () => void }[] = [];
  /** Receives the editor-owned event adapter explicitly. */
  constructor(private readonly platform: Platform) {}
  /** Registers a native control callback behind the platform event contract. */
  public listen<Name extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: Name,
    listener: (event: GlobalEventHandlersEventMap[Name]) => void,
  ): void {
    const dispose = this.platform.addEventListener(target, type, (event) =>
      listener(event as GlobalEventHandlersEventMap[Name]),
    );
    this.bindings.push({ target, dispose });
  }
  /** Releases callbacks within a rebuilt subtree in reverse acquisition order. */
  public release(root: Node): void {
    const removed = this.bindings.filter(
      ({ target }) => target instanceof Node && (root === target || root.contains(target)),
    );
    const selected = new Set(removed);
    this.bindings = this.bindings.filter((binding) => !selected.has(binding));
    removed.reverse().forEach((binding) => binding.dispose());
  }
  /** Releases every listener, idempotently, before host controls are removed. */
  public clear(): void {
    const bindings = this.bindings;
    this.bindings = [];
    bindings.reverse().forEach((binding) => binding.dispose());
  }
}
