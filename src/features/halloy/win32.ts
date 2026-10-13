// Main process only, Windows only. user32 calls needed to embed Halloy's native
// window inside Ferdium's window.
// Window styles and key states are bit fields in the Win32 API.
/* eslint-disable no-bitwise */
import koffi from 'koffi';

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');

// Types are registered by name; the func signatures below refer to them.
koffi.struct('HALLOY_POINT', { x: 'int32', y: 'int32' });
koffi.struct('HALLOY_RECT', {
  left: 'int32',
  top: 'int32',
  right: 'int32',
  bottom: 'int32',
});
koffi.proto('bool __stdcall HalloyEnumWindowsProc(intptr hwnd, intptr lParam)');

const EnumWindows = user32.func(
  'bool __stdcall EnumWindows(HalloyEnumWindowsProc *cb, intptr lParam)',
);
const GetWindowThreadProcessId = user32.func(
  'uint32 __stdcall GetWindowThreadProcessId(intptr hwnd, _Out_ uint32 *pid)',
);
const IsWindowVisible = user32.func(
  'bool __stdcall IsWindowVisible(intptr hwnd)',
);
const GetWindow = user32.func(
  'intptr __stdcall GetWindow(intptr hwnd, uint32 cmd)',
);
const SetParent = user32.func(
  'intptr __stdcall SetParent(intptr child, intptr parent)',
);
const GetWindowLongPtrW = user32.func(
  'intptr __stdcall GetWindowLongPtrW(intptr hwnd, int32 index)',
);
const SetWindowLongPtrW = user32.func(
  'intptr __stdcall SetWindowLongPtrW(intptr hwnd, int32 index, intptr value)',
);
const SetWindowPos = user32.func(
  'bool __stdcall SetWindowPos(intptr hwnd, intptr after, int32 x, int32 y, int32 cx, int32 cy, uint32 flags)',
);
const ShowWindow = user32.func(
  'bool __stdcall ShowWindow(intptr hwnd, int32 cmd)',
);
const SetFocus = user32.func('intptr __stdcall SetFocus(intptr hwnd)');
const AttachThreadInput = user32.func(
  'bool __stdcall AttachThreadInput(uint32 from, uint32 to, bool attach)',
);
const GetForegroundWindow = user32.func(
  'intptr __stdcall GetForegroundWindow()',
);
const GetAsyncKeyState = user32.func(
  'int16 __stdcall GetAsyncKeyState(int32 key)',
);
const GetCursorPos = user32.func(
  'bool __stdcall GetCursorPos(_Out_ HALLOY_POINT *point)',
);
const GetWindowRect = user32.func(
  'bool __stdcall GetWindowRect(intptr hwnd, _Out_ HALLOY_RECT *rect)',
);
const IsWindow = user32.func('bool __stdcall IsWindow(intptr hwnd)');
const GetCurrentThreadId = kernel32.func(
  'uint32 __stdcall GetCurrentThreadId()',
);

const GWL_STYLE = -16;
const GWL_EXSTYLE = -20;
const GW_OWNER = 4;
const WS_EX_TOOLWINDOW = 0x00_00_00_80n;
const WS_EX_APPWINDOW = 0x00_04_00_00n;
const WS_CHILD = 0x40_00_00_00n;
const WS_POPUP = 0x80_00_00_00n;
const WS_CAPTION = 0x00_c0_00_00n;
const WS_THICKFRAME = 0x00_04_00_00n;
const WS_SYSMENU = 0x00_08_00_00n;
const WS_MINIMIZEBOX = 0x00_02_00_00n;
const WS_MAXIMIZEBOX = 0x00_01_00_00n;
const HWND_TOP = 0;
const GW_CHILD = 5;
const SWP_NOSIZE = 0x1;
const SWP_NOMOVE = 0x2;
const SWP_NOZORDER = 0x4;
const SWP_NOACTIVATE = 0x10;
const SWP_SHOWWINDOW = 0x40;
const SWP_FRAMECHANGED = 0x20;
const SW_HIDE = 0;
const VK_LBUTTON = 0x01;

export type Hwnd = number | bigint;

export const handleFromBuffer = (buffer: Buffer): bigint =>
  buffer.readBigUInt64LE(0);

export const isWindow = (hwnd: Hwnd): boolean => IsWindow(hwnd);

export const sameHandle = (a: Hwnd, b: Hwnd): boolean =>
  BigInt(a) === BigInt(b);

// Before its main window, winit creates "Winit Thread Event Target": a layered
// tool window that also reports itself visible and unowned. Embedding that one
// instead left the real Halloy window floating on its own (seen 13/10/2026),
// so tool windows are skipped.
export const findMainWindowOfProcess = (pid: number): Hwnd | null => {
  let found: Hwnd | null = null;
  EnumWindows((hwnd: Hwnd) => {
    const owner = [0];
    GetWindowThreadProcessId(hwnd, owner);
    const exStyle = BigInt(GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    if (
      owner[0] === pid &&
      IsWindowVisible(hwnd) &&
      Number(GetWindow(hwnd, GW_OWNER)) === 0 &&
      (exStyle & WS_EX_TOOLWINDOW) === 0n
    ) {
      found = hwnd;
      return false;
    }
    return true;
  }, 0);
  return found;
};

export const embed = (child: Hwnd, parent: Hwnd): void => {
  const style = BigInt(GetWindowLongPtrW(child, GWL_STYLE));
  const removed =
    WS_POPUP |
    WS_CAPTION |
    WS_THICKFRAME |
    WS_SYSMENU |
    WS_MINIMIZEBOX |
    WS_MAXIMIZEBOX;
  SetWindowLongPtrW(child, GWL_STYLE, (style & ~removed) | WS_CHILD);
  // Without this Halloy keeps its own taskbar button while embedded.
  const exStyle = BigInt(GetWindowLongPtrW(child, GWL_EXSTYLE));
  ShowWindow(child, SW_HIDE);
  SetWindowLongPtrW(child, GWL_EXSTYLE, exStyle & ~WS_EX_APPWINDOW);
  SetParent(child, parent);
  SetWindowPos(child, HWND_TOP, 0, 0, 0, 0, SWP_NOZORDER | SWP_FRAMECHANGED);
};

// HWND_TOP matters: Electron's Chrome_RenderWidgetHostHWND is a sibling and,
// when it sits above Halloy, it swallows every mouse click (tested 13/10/2026).
export const showAt = (
  hwnd: Hwnd,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  SetWindowPos(hwnd, HWND_TOP, x, y, width, height, SWP_SHOWWINDOW);
};

export const hide = (hwnd: Hwnd): void => {
  ShowWindow(hwnd, SW_HIDE);
};

// Chromium raises its Chrome_RenderWidgetHostHWND back above Halloy on its own
// some time after showAt (seen in Ferdium 7.2.3, 13/10/2026), so the order has
// to be checked again while the IRC service is visible.
export const keepOnTop = (hwnd: Hwnd, parent: Hwnd): void => {
  if (!sameHandle(GetWindow(parent, GW_CHILD), hwnd)) {
    SetWindowPos(
      hwnd,
      HWND_TOP,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
    );
  }
};

// Clicking an embedded window from another process does not move Windows'
// keyboard focus to it; without an explicit SetFocus every key goes to
// Electron (tested 13/10/2026). SetFocus only works for windows attached to
// the calling thread's input queue, hence the attach/detach.
export const giveKeyboardFocus = (hwnd: Hwnd): void => {
  const target = GetWindowThreadProcessId(hwnd, [0]);
  const current = GetCurrentThreadId();
  AttachThreadInput(current, target, true);
  SetFocus(hwnd);
  AttachThreadInput(current, target, false);
};

export const foregroundWindow = (): Hwnd => GetForegroundWindow();

export const isLeftButtonDown = (): boolean =>
  (GetAsyncKeyState(VK_LBUTTON) & 0x80_00) !== 0;

export const isCursorInside = (hwnd: Hwnd): boolean => {
  const point = { x: 0, y: 0 };
  const rect = { left: 0, top: 0, right: 0, bottom: 0 };
  if (!GetCursorPos(point) || !GetWindowRect(hwnd, rect)) {
    return false;
  }
  return (
    point.x >= rect.left &&
    point.x < rect.right &&
    point.y >= rect.top &&
    point.y < rect.bottom
  );
};
