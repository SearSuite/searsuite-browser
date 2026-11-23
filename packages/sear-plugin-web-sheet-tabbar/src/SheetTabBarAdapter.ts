import type { SheetTabBarModel } from './SheetBottomBarModels';

/** Platform-neutral lifecycle contract for a sheet tab-bar renderer. */
export abstract class SheetTabBarAdapter<TTarget = unknown> {
  public static readonly symbol: symbol = Symbol.for('SheetTabBarAdapter');

  public abstract mount(target: TTarget, model: SheetTabBarModel): void;
  public abstract update(model: SheetTabBarModel): void;
  public abstract destroy(): void;
}
