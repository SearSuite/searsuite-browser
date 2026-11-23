import type { SheetStatusBarModel } from './SheetBottomBarModels';

/** Platform-neutral lifecycle contract for a sheet status-bar renderer. */
export abstract class SheetStatusBarAdapter<TTarget = unknown> {
  public static readonly symbol: symbol = Symbol.for('SheetStatusBarAdapter');

  public abstract mount(target: TTarget, model: SheetStatusBarModel): void;
  public abstract update(model: SheetStatusBarModel): void;
  public abstract destroy(): void;
}
