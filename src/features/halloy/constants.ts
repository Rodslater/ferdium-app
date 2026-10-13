export const HALLOY_RECIPE_ID = 'halloy-irc';

export const HALLOY_IPC = {
  show: 'halloy:show',
  hide: 'halloy:hide',
} as const;

// Bounds in physical pixels, relative to the main window's client area.
export interface HalloyBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
