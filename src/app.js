/**
 * @author 2K Studio
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain, nativeTheme, shell } = require('electron');
// const { Microsoft } = require('minecraft-java-core');
const { Microsoft } = require('mc-java-core-333');
const { autoUpdater } = require('electron-updater')
const path = require('path');
const fs = require('fs');
const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");
const rpc = require('discord-rpc');
const os = require('os');
const { exec, execSync } = require('child_process');

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('userData', appPath);
    app.setPath('appData', appdata);
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.whenReady().then(() => {
        if (dev) {
            MainWindow.createWindow();
        } else {
            UpdateWindow.createWindow();
        }
    });
}

const setupIpcMainHandlers = () => {
    ipcMain.on('main-window-open', MainWindow.createWindow);
    ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow()?.webContents.openDevTools({ mode: 'undocked', activate: false}));
    ipcMain.on('main-window-dev-tools-close', () => MainWindow.getWindow()?.webContents.closeDevTools());
    ipcMain.on('main-window-close', MainWindow.destroyWindow);
    ipcMain.on('main-window-reload', () => MainWindow.getWindow()?.reload());
    ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow()?.setProgressBar(options.progress / options.size));
    ipcMain.on('main-window-progress-reset', () => MainWindow.getWindow()?.setProgressBar(-1));
    ipcMain.on('main-window-progress-load', () => MainWindow.getWindow()?.setProgressBar(2));
    ipcMain.on('main-window-minimize', () => MainWindow.getWindow()?.minimize());
    ipcMain.on('main-window-maximize', () => {
        const window = MainWindow.getWindow();
        window.isMaximized() ? window.unmaximize() : window.maximize();
    });
    ipcMain.on('main-window-hide', () => MainWindow.getWindow()?.hide());
    ipcMain.on('main-window-show', () => MainWindow.getWindow()?.show());

    ipcMain.on('update-window-close', UpdateWindow.destroyWindow);
    ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow()?.webContents.openDevTools({ mode: 'undocked', activate: false}));
    ipcMain.on('update-window-progress', (event, options) => UpdateWindow.getWindow()?.setProgressBar(options.progress / options.size));
    ipcMain.on('update-window-progress-reset', () => UpdateWindow.getWindow()?.setProgressBar(-1));
    ipcMain.on('update-window-progress-load', () => UpdateWindow.getWindow()?.setProgressBar(2));

    ipcMain.handle('path-user-data', () => app.getPath('userData'));
    ipcMain.handle('appData', () => app.getPath('appData'));

    ipcMain.handle('Microsoft-window', async (_, client_id) => {
        return await new Microsoft(client_id, false).getAuth('', '', false);
    });

    ipcMain.handle('is-dark-theme', (_, theme) => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return nativeTheme.shouldUseDarkColors;
    });
};

const setupDiscordRPC = () => {
    let client = new rpc.Client({ transport: 'ipc' });
    let startedAppTime = Date.now();

    ipcMain.on('new-status-discord', async () => {
        client.login({ clientId: '1393456453918003251' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: 'En el Menú',
                    assets: {
                        large_image: 'logoBlockVerse',
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });

    ipcMain.on('new-status-discord-jugando', async (event, status, imginstancia) => {
        console.log(status);
        if (client) await client.destroy();
        client = new rpc.Client({ transport: 'ipc' });
        client.login({ clientId: '1393456453918003251' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: status,
                    assets: {
                        large_image: `${imginstancia}`,
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });

    ipcMain.on('delete-and-new-status-discord', async () => {
        if (client) client.destroy();
        client = new rpc.Client({ transport: 'ipc' });
        client.login({ clientId: '1393456453918003251' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: 'En el Menú',
                    assets: {
                        large_image: 'logoBlockVerse',
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });
};

const setupAutoUpdater = () => {
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'debug';
    const arch = os.arch();
    autoUpdater.logger.info(`Platform: ${os.platform()}`);
    autoUpdater.logger.info(`Arch: ${arch}`);
    switch (arch) {
        case 'x64':
        case 'arm64':
            break;
        case 'ia32':
        default:
            let err = `Unsupported architecture: ${arch}`;
            autoUpdater.logger.error(err);
            UpdateWindow.getWindow()?.webContents.send('update-error', err);
            break;
    }
    autoUpdater.autoDownload = false;
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'Mc-Launchers',
        repo: 'BlockVerse Studio-Launcher',
        token: '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',
        releaseType: 'release',
    });

    ipcMain.handle('update-app', async () => {
        try {
            const res = await autoUpdater.checkForUpdates();
            return res;
        } catch (error) {
            return { error: true, message: error.message };
        }
    });

    autoUpdater.on('update-available', () => {
        UpdateWindow.getWindow()?.webContents.send('updateAvailable');
    });

    ipcMain.on('start-update', () => {
        autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', () => {
        UpdateWindow.getWindow()?.webContents.send('update-not-available');
    });

    autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall(true, true);
    });

    autoUpdater.on('download-progress', (progress) => {
        UpdateWindow.getWindow()?.webContents.send('download-progress', progress);
    });

    autoUpdater.on('error', (error) => {
        autoUpdater.logger.error('Error en el auto-updater:', error);
        const updateWindow = UpdateWindow.getWindow();
        const message = error.message || '';

        if (!(process.platform === 'darwin' && (message.includes('code signature') || /did not pass validation/.test(message)))) {
            updateWindow?.webContents.send('update-error', error);
            return;
        }

        updateWindow?.webContents.send('unzip-start');
        autoUpdater.logger.warn('Fallback: extrayendo con ditto y limpiando cuarentena...');

        const cacheDir = path.join(autoUpdater.app.baseCachePath, `${autoUpdater.app.name}-updater`, 'pending');
        try {
            const zipFile = fs.readdirSync(cacheDir).find((file) => file.endsWith('.zip'));
            if (!zipFile) throw new Error('No zip file found in cache directory');

            const zipPath = path.join(cacheDir, zipFile);
            const destApp = `/Applications/${autoUpdater.app.name}.app`;

            if (fs.existsSync(destApp)) execSync(`rm -rf "${destApp}`);

            autoUpdater.logger.info(`Extrayendo: ${zipFile} (${zipPath}) a ${destApp}`);
            exec(`ditto -xk "${zipPath}" "${destApp}"`, (err) => {
                if (err) throw err;

                execSync(`xattr -dr com.apple.qurantine "${destApp}`);
                autoUpdater.logger.info('Extracción y limpieza completadas.');

                app.relaunch();
                app.exit(0);
            });
        } catch (err) {
            autoUpdater.logger.error('Error en fallback al descomprimir:', err);
            const enhancedError = {
                ...err,
                extraInfo: 'Instalación manual es requerida',
            };
            autoUpdater.logger.error(enhancedError.extraInfo);
            updateWindow?.webContents.send('unzip-error', enhancedError);

            const shellError = shell.openPath(cacheDir);
            if (shellError) autoUpdater.logger.error(shellError);
        }
    });
};

setupIpcMainHandlers();
setupDiscordRPC();
setupAutoUpdater();

app.on('window-all-closed', () => app.quit());

app.on('browser-window-created', (event, win) => {
    win.webContents.on('before-input-event', (event, input) => {
        if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'b') {
            event.preventDefault();
            win.webContents.closeDevTools();
            win.webContents.openDevTools({ mode: 'undocked', activate: false});
        }
    })
})
