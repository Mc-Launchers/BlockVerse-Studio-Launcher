import { logger } from './utils.js';
new logger('LAUNCHER', '#7289da');

import Login from './panels/login.js';
import Home from './panels/home.js';
import Lobby from './panels/lobby.js';
import Settings from './panels/settings.js';

import { config, changePanel, database, popup, setBackground, accountSelect, addAccount, pkg } from './utils.js';
// const { AZauth, Mojang, Microsoft } = require('minecraft-java-core');
const { AZauth, Mojang, Microsoft } = require('mc-java-core-333');

const { ipcRenderer } = require('electron');
const fs = require('fs');

class Launcher {
    async init() {
        // this.initLog();
        console.log('Iniciando...');
        this.shortcut()
        await setBackground()
        if (process.platform == 'win32') this.initFrame();
        this.config = await config.GetConfig().then(res => res).catch(err => err);
        if (await this.config.error) return this.errorConnect()
        this.db = new database();
        await this.initConfigClient();
        this.createPanels(Login, Home, Lobby, Settings);
        this.startLauncher();
    }

    initLog() {
        // document.addEventListener('keydown', e => {
        //     if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
        //         ipcRenderer.send('main-window-dev-tools-close');
        //         ipcRenderer.send('main-window-dev-tools');
        //     }
        // })
        new logger('LAUNCHER', '#7289da')
    }

    shortcut() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.keyCode == 87) {
                ipcRenderer.send('main-window-close');
            }
        })
    }


    errorConnect() {
        new popup().openPopup({
            title: this.config.error.code,
            content: this.config.error.message,
            color: 'red',
            exit: true,
            options: true
        });
    }

    initFrame() {
        console.log('Iniciando Launcher...')
        document.querySelector('.frame').classList.toggle('hide')
        document.querySelector('.dragbar').classList.toggle('hide')

        document.querySelector('#minimize').addEventListener('click', () => {
            ipcRenderer.send('main-window-minimize');
        });

        let maximized = false;

        document.querySelector('#close').addEventListener('click', () => {
            ipcRenderer.send('main-window-close');
        })
    }

    async initConfigClient() {
        console.log('Iniciando la configuracion del Launcher...')
        let configClient = await this.db.readData('configClient')
        let defaultConfig = {
            account_selected: null,
            instance_selct: null,
            java_config: {
                java_path: null,
                java_memory: {
                    min: 5,
                    max: 7
                }
            },
            game_config: {
                screen_size: {
                    width: 1280,
                    height: 720
                }
            },
            launcher_config: {
                download_multi: 30,
                theme: 'dark',
                closeLauncher: 'close-launcher',
                intelEnabledMac: true
            },
            ...configClient,
        };
        if (!configClient) {
            await this.db.createData('configClient', defaultConfig);
        }
        await this.db.updateData('configClient', defaultConfig);
        configClient = await this.db.readData('configClient')
        console.log(configClient)
    }

    createPanels(...panels) {
        let panelsElem = document.querySelector('.panels')
        for (let panel of panels) {
            console.log(`Iniciando ${panel.name} Panel...`);
            let div = document.createElement('div');
            div.classList.add('panel', panel.id)
            div.innerHTML = fs.readFileSync(`${__dirname}/panels/${panel.id}.html`, 'utf8');
            panelsElem.appendChild(div);
            new panel().init(this.config);
        }
    }

    async startLauncher() {
        let accounts = await this.db.readAllData('accounts')
        console.logFile(accounts);
        let configClient = await this.db.readData('configClient')
        let account_selected = configClient ? configClient?.account_selected : null
        let popupRefresh = new popup();

        if (accounts?.length) {
            for (let account of accounts) {
                let account_ID = account.ID
                if (account.error) {
                    await this.db.deleteData('accounts', account_ID)
                    continue
                }
                if (account.meta.type === 'Xbox') {
                    console.log(`Accediendo con el Usuario: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'Conectando y verificando.',
                        content: `Accediendo con el Usuario: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });

                    let refresh_accounts = await new Microsoft(this.config.client_id).refresh(account);

                    if (refresh_accounts.error) {
                        await this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            await this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    console.logFile(refresh_accounts);
                    await this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else if (account.meta.type == 'AZauth') {
                    console.log(`Accediendo con el Usuario: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'Conectando y verificando.',
                        content: `Accediendo con el Usuario: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });
                    let refresh_accounts = await new AZauth(this.config.online).verify(account);

                    if (refresh_accounts.error) {
                        this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.message}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else if (account.meta.type == 'Mojang') {
                    console.log(`Accediendo con el Usuario: ${account.name}`);
                    popupRefresh.openPopup({
                        title: 'Conectando y verificando.',
                        content: `Accediendo con el Usuario: ${account.name}`,
                        color: 'var(--color)',
                        background: false
                    });
                    if (account.meta.online == false) {
                        let refresh_accounts = await Mojang.login(account.name);

                        refresh_accounts.ID = account_ID
                        await addAccount(refresh_accounts)
                        this.db.updateData('accounts', refresh_accounts, account_ID)
                        if (account_ID == account_selected) accountSelect(refresh_accounts)
                        continue;
                    }

                    let refresh_accounts = await Mojang.refresh(account);

                    if (refresh_accounts.error) {
                        this.db.deleteData('accounts', account_ID)
                        if (account_ID == account_selected) {
                            configClient.account_selected = null
                            this.db.updateData('configClient', configClient)
                        }
                        console.error(`[Account] ${account.name}: ${refresh_accounts.errorMessage}`);
                        continue;
                    }

                    refresh_accounts.ID = account_ID
                    this.db.updateData('accounts', refresh_accounts, account_ID)
                    await addAccount(refresh_accounts)
                    if (account_ID == account_selected) accountSelect(refresh_accounts)
                } else {
                    console.error(`[Account] ${account.name}: Tipo de cuenta no encontrada.`);
                    this.db.deleteData('accounts', account_ID)
                    if (account_ID == account_selected) {
                        configClient.account_selected = null
                        this.db.updateData('configClient', configClient)
                    }
                }
            }

            accounts = await this.db.readAllData('accounts')
            // console.log(accounts)
            configClient = await this.db.readData('configClient')
            account_selected = configClient ? configClient?.account_selected : null

            if (!account_selected) {
                let uuid = accounts[0].ID
                if (uuid) {
                    configClient.account_selected = uuid
                    await this.db.updateData('configClient', configClient)
                    accountSelect(uuid)
                }
            }

            if (!accounts.length) {
                config.account_selected = null
                await this.db.updateData('configClient', config);
                popupRefresh.closePopup()
                return changePanel("login");
            }

            popupRefresh.closePopup()
            changePanel("lobby");
        } else {
            popupRefresh.closePopup()
            changePanel('login');
        }
    }
}

new Launcher().init();
