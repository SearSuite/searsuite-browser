/** Stable sheet item data shared by all tab-bar renderers. */
export interface SheetTabBarItem {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly color?: string;
}

/** Platform-neutral view model for the sheet tabs segment. */
export interface SheetTabBarModel {
  readonly sheets: readonly SheetTabBarItem[];
  readonly onAddSheetClick: () => void;
  readonly onActivateSheetClick: (sheetId: string) => void;
  readonly onRenameSheet?: (sheetId: string, name: string) => string | null;
  readonly onDeleteSheet?: (sheetId: string) => void;
  readonly onMoveSheet?: (sheetId: string, targetSheetId: string, before: boolean) => void;
}

/** Platform-neutral view model for status and zoom controls. */
export interface SheetStatusBarModel {
  readonly statusText: string;
  readonly zoomText: string;
  readonly onViewOptionsClick?: () => void;
  readonly zoomEnabled: boolean;
  readonly onZoomOutClick: () => void;
  readonly onZoomInClick: () => void;
}
