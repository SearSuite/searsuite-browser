/** Platform-neutral lifecycle contract for a complete bottom-bar renderer. */
export abstract class SheetBottomBarAdapter<TTarget = unknown, TOptions = unknown> {
  public static readonly symbol: symbol = Symbol.for('SheetBottomBarAdapter');

  public abstract mount(target: TTarget, options?: TOptions): void;
  public abstract destroy(): void;
}
