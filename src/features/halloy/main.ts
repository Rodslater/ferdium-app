// Main process side of the IRC service: runs Halloy (a native Rust IRC client)
// as a separate process and embeds its window into the area that the renderer
// reserves for the active IRC service. Windows only.
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { type BrowserWindow, app, ipcMain } from 'electron';
import { isWindows } from '../../environment';
import { userDataPath, userDataRecipesPath } from '../../environment-remote';
import { HALLOY_IPC, HALLOY_RECIPE_ID, type HalloyBounds } from './constants';

const debug = require('../../preload-safe-debug')('Ferdium:Halloy');

// While the IRC service is visible, Halloy has to stay above Chromium's own
// child window (see keepOnTop) and a left click inside it has to hand it the
// keyboard focus (see giveKeyboardFocus). Windows sends Electron no event for
// either, so both are polled.
const WATCH_MS = 100;

const halloyExecutable = (): string =>
  process.env.FERDIUM_HALLOY_PATH ??
  (app.isPackaged
    ? join(process.resourcesPath, 'halloy', 'halloy.exe')
    : join(app.getAppPath(), '..', 'halloy-bin', 'halloy.exe'));

const halloyDataDir = (): string => userDataPath('halloy');

// Halloy only runs in portable mode when config.toml exists in this folder;
// otherwise it would read and write %APPDATA%\halloy, shared with a standalone
// Halloy install.
const ensureHalloyConfig = (): void => {
  const dir = halloyDataDir();
  const configPath = join(dir, 'config.toml');
  if (existsSync(configPath)) {
    return;
  }
  mkdirSync(dir, { recursive: true });
  const nickname =
    userInfo().username.replaceAll(/[^\w[\\\]^{|}-]/g, '') || 'ferdium';
  // Without alternatives, a nickname already in use makes the server drop the
  // connection with "Registration Timeout" and Halloy retries forever
  // (happened with "Rodrigo" on irc.rodslater.com, 13/10/2026).
  const altNicks = [`${nickname}_`, `${nickname}__`, `${nickname}_hub`];
  writeFileSync(
    configPath,
    [
      '# Configuração do Halloy usada pelo Ferdium.',
      '# Referência: https://halloy.chat/configuration/',
      '',
      '[servers.rodschat]',
      `nickname = "${nickname}"`,
      `alt_nicks = [${altNicks.map(nick => `"${nick}"`).join(', ')}]`,
      'server = "irc.rodslater.com"',
      'port = 6697',
      'use_tls = true',
      'channels = ["#sergipe", "#brasil"]',
      '',
    ].join('\n'),
  );
};

const RECIPE_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      id: HALLOY_RECIPE_ID,
      name: 'IRC (Halloy)',
      version: '1.0.0',
      license: 'MIT',
      config: { serviceURL: 'about:blank' },
    },
    null,
    2,
  ),
  'index.js': 'module.exports = Ferdium => Ferdium;\n',
  'icon.svg':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f3542"/><text x="32" y="44" font-family="Segoe UI,Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#f5a524">#</text></svg>',
};

// Dev recipes are listed under "Custom services" when adding a service, which
// avoids touching the ferdium-recipes submodule. Rewritten on every start so a
// new Ferdium build also updates the recipe.
const installRecipe = (): void => {
  const dir = userDataRecipesPath('dev', HALLOY_RECIPE_ID);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(RECIPE_FILES)) {
    writeFileSync(join(dir, name), content);
  }
};

export default ({ mainWindow }: { mainWindow: BrowserWindow }): void => {
  if (!isWindows) {
    return;
  }
  installRecipe();

  // Loaded lazily: koffi is a native module and only exists on Windows builds.
  // eslint-disable-next-line global-require
  const win32 = require('./win32') as typeof import('./win32');

  const parent = win32.handleFromBuffer(mainWindow.getNativeWindowHandle());
  let child: ChildProcess | null = null;
  let hwnd: import('./win32').Hwnd | null = null;
  let embedding: Promise<void> | null = null;
  let bounds: HalloyBounds | null = null;
  let visible = false;
  let watcher: NodeJS.Timeout | null = null;
  let wasButtonDown = false;

  const focus = (): void => {
    if (hwnd && visible) {
      win32.giveKeyboardFocus(hwnd);
    }
  };

  const place = (): void => {
    if (!hwnd || !bounds) {
      return;
    }
    if (visible) {
      win32.showAt(hwnd, bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      win32.hide(hwnd);
    }
  };

  const watch = (): void => {
    if (!hwnd) {
      return;
    }
    win32.keepOnTop(hwnd, parent);
    const down = win32.isLeftButtonDown();
    if (
      down &&
      !wasButtonDown &&
      win32.sameHandle(win32.foregroundWindow(), parent) &&
      win32.isCursorInside(hwnd)
    ) {
      focus();
    }
    wasButtonDown = down;
  };

  const startWatching = (): void => {
    watcher ??= setInterval(watch, WATCH_MS);
  };

  const stopWatching = (): void => {
    if (watcher) {
      clearInterval(watcher);
      watcher = null;
    }
  };

  const waitForWindow = (pid: number): Promise<import('./win32').Hwnd> =>
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const found = win32.findMainWindowOfProcess(pid);
        if (found) {
          clearInterval(timer);
          resolve(found);
        } else if (Date.now() - startedAt > 20_000) {
          clearInterval(timer);
          reject(new Error('Halloy window did not appear within 20 s'));
        }
      }, 100);
    });

  const start = async (): Promise<void> => {
    ensureHalloyConfig();
    const executable = halloyExecutable();
    debug('Starting', executable);
    child = spawn(executable, [], {
      env: {
        ...process.env,
        HALLOY_PORTABLE_DIR: halloyDataDir(),
        // With the default Vulkan backend the embedded window cannot be
        // captured (screenshots, screen sharing) and shows up white.
        WGPU_BACKEND: 'dx12',
      },
      stdio: 'ignore',
    });
    child.on('exit', code => {
      debug('Halloy exited with code', code);
      child = null;
      hwnd = null;
      embedding = null;
      stopWatching();
    });
    const { pid } = child;
    if (pid === undefined) {
      throw new Error(`Could not start ${executable}`);
    }
    hwnd = await waitForWindow(pid);
    win32.embed(hwnd, parent);
    place();
    focus();
  };

  ipcMain.on(HALLOY_IPC.show, (_event, newBounds: HalloyBounds) => {
    const becameVisible = !visible;
    bounds = newBounds;
    visible = true;
    startWatching();
    if (hwnd && win32.isWindow(hwnd)) {
      place();
      if (becameVisible) {
        focus();
      }
      return;
    }
    embedding ??= start().catch(error => {
      console.error('Halloy:', error);
      embedding = null;
    });
  });

  ipcMain.on(HALLOY_IPC.hide, () => {
    visible = false;
    stopWatching();
    place();
  });

  mainWindow.on('focus', () => {
    // Give Electron a moment to finish its own focus handling first.
    setTimeout(focus, 50);
  });

  app.on('will-quit', () => {
    stopWatching();
    child?.kill();
  });
};
