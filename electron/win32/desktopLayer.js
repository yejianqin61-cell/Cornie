import { execFile } from 'node:child_process'

function hwndToInt(hwndBuffer) {
  // Windows: getNativeWindowHandle() returns a Buffer containing HWND pointer value (little-endian)
  // Use BigInt to avoid truncation on x64.
  if (!hwndBuffer || hwndBuffer.length < 4) return null
  let val = 0n
  for (let i = 0; i < Math.min(8, hwndBuffer.length); i++) {
    val |= BigInt(hwndBuffer[i]) << (8n * BigInt(i))
  }
  return val
}

export function attachToDesktopViaWorkerW(hwndBuffer) {
  if (process.platform !== 'win32') return
  const hwnd = hwndToInt(hwndBuffer)
  if (!hwnd || hwnd === 0n) return

  const cs = `
using System;
using System.Runtime.InteropServices;
using System.Text;

public class DesktopLayer {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

  const uint WM_SPAWN_WORKERW = 0x052C;
  const int GWL_STYLE = -16;
  const int WS_CHILD = 0x40000000;
  const uint SWP_NOSIZE = 0x0001;
  const uint SWP_NOMOVE = 0x0002;
  const uint SWP_NOZORDER = 0x0004;
  const uint SWP_FRAMECHANGED = 0x0020;

  static IntPtr _found = IntPtr.Zero;

  public static IntPtr FindWorkerW() {
    IntPtr progman = FindWindow("Progman", null);
    if (progman != IntPtr.Zero) {
      IntPtr result;
      SendMessageTimeout(progman, WM_SPAWN_WORKERW, IntPtr.Zero, IntPtr.Zero, 0, 1000, out result);
    }

    EnumWindows((hWnd, lParam) => {
      var sb = new StringBuilder(256);
      GetClassName(hWnd, sb, sb.Capacity);
      if (sb.ToString() != "WorkerW") return true;

      IntPtr defView = FindWindowEx(hWnd, IntPtr.Zero, "SHELLDLL_DefView", null);
      if (defView != IntPtr.Zero) {
        // sibling WorkerW behind icons (often)
        IntPtr workerw = FindWindowEx(IntPtr.Zero, hWnd, "WorkerW", null);
        _found = workerw != IntPtr.Zero ? workerw : hWnd;
        return false;
      }
      return true;
    }, IntPtr.Zero);

    return _found;
  }

  public static void Attach(long hwndValue) {
    IntPtr hwnd = new IntPtr(hwndValue);
    IntPtr workerw = FindWorkerW();
    if (workerw == IntPtr.Zero) return;

    SetParent(hwnd, workerw);
    IntPtr style = GetWindowLongPtr(hwnd, GWL_STYLE);
    SetWindowLongPtr(hwnd, GWL_STYLE, new IntPtr(style.ToInt64() | WS_CHILD));
    SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
  }
}
`

  const ps = `
$ErrorActionPreference='SilentlyContinue';
Add-Type -TypeDefinition @'
${cs}
'@;
[DesktopLayer]::Attach(${hwnd.toString()});
`

  execFile(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
    { windowsHide: true, timeout: 2000 },
    () => {}
  )
}

