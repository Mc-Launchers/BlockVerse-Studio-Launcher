// const { AZauth, Mojang } = require('minecraft-java-core');
const { AZauth, Mojang } = require('mc-java-core-333');
const { ipcRenderer } = require('electron');
import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    
    async init(config) {
        this.config = config;
        this.db = new database();

        if (typeof this.config.online === 'boolean') {
            if (this.config.online) {
                this.getMicrosoft();
            } else {
                this.getCrack();
                this.getMicrosoftOffline();
            }
        } else if (typeof this.config.online === 'string' && this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
            this.getAZauth();
        }

        document.querySelectorAll('.cancel-login').forEach(e => {
            e.addEventListener('click', () => {
                e.target.style.display = 'none';
                changePanel('settings');
            });
        });
    }

    async getMicrosoft() {
        this.setupLogin('.login-home', '.connect-home', 'Conectando con Microsoft', 'Esperando respuesta de la sesion...', 'Microsoft-window');
    }

    async getMicrosoftOffline() {
        this.setupLogin('', '.connect-microsoft', 'Conectando con Microsoft', 'Esperando respuesta de la sesion...', 'Microsoft-window');
    }

    async setupLogin(loginSelector, buttonSelector, popupTitle, popupContent, ipcEvent) {
        if (loginSelector) {
            document.querySelector(loginSelector).style.display = 'block';
        }

        let popupLogin = new popup();
        document.querySelector(buttonSelector).addEventListener('click', () => {
            popupLogin.openPopup({ title: popupTitle, content: popupContent, color: 'var(--color)' });

            ipcRenderer.invoke(ipcEvent, this.config.client_id).then(async account_connect => {
                console.logFile(account_connect);
                // popupLogin.closePopup();
                if (account_connect === 'cancel' || !account_connect) throw new Error('Inicio de sesión cancelado, interrumpido o timeout.');
                if (typeof account_connect !== 'object') throw new Error(`Unexpected response (${account_connect.constructor?.name}): ${account_connect}`);
                if (account_connect.error) throw new Error(`mc-java-core-333 response: ${JSON.stringify(account_connect)}`);
                await this.saveData(account_connect);
                popupLogin.closePopup();
            }).catch((error) => {
                // popupLogin.openPopup({ title: 'Error de Sesion', content: 'La cuenta que has puesto no tiene MINECRAFT comprado o has puesto una invalida.', options: true });
                popupLogin.openPopup({ title: 'Error de Sesión', content: `${error}`, options: true });
            });
        });
    }

    async getCrack() {
        console.log('Initializing offline login...');
        let popupLogin = new popup();
        let loginOffline = document.querySelector('.login-offline');
        loginOffline.style.display = 'block';

        let emailOffline = document.querySelector('.email-offline');
        document.querySelector('.connect-offline').addEventListener('click', async () => {
            if (this.validateOfflineEmail(emailOffline.value)) {
                let MojangConnect = await Mojang.login(emailOffline.value);
                if (MojangConnect.error) {
                    popupLogin.openPopup({ title: 'Error', content: MojangConnect.message, options: true });
                } else {
                    await this.saveData(MojangConnect);
                    popupLogin.closePopup();
                }
            }
        });
    }

    validateOfflineEmail(email) {
        let popupLogin = new popup();
        let format = /^[!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?]*$/;

        if (email.length < 3) {
            popupLogin.openPopup({ title: 'Error', content: 'Tienes que poner mas de 3 palabras.', options: true });
            return false;
        }
        if (email.match(/ /g)) {
            popupLogin.openPopup({ title: 'Error', content: 'Tu nombre no puede contener espacios.', options: true });
            return false;
        }
        if (email.match(format)) {
            popupLogin.openPopup({ title: 'Error', content: 'Votre pseudo doit contenir uniquement des caractères alphanumériques.', options: true });
            return false;
        }
        return true;
    }

    async getAZauth() {
        console.log('Initializing AZauth login...');
        let AZauthClient = new AZauth(this.config.online);
        let PopupLogin = new popup();

        let loginAZauth = document.querySelector('.login-AZauth');
        let loginAZauthA2F = document.querySelector('.login-AZauth-A2F');
        loginAZauth.style.display = 'block';

        let AZauthEmail = document.querySelector('.email-AZauth');
        let AZauthPassword = document.querySelector('.password-AZauth');
        let AZauthA2F = document.querySelector('.A2F-AZauth');

        document.querySelector('.connect-AZauth').addEventListener('click', async () => {
            PopupLogin.openPopup({ title: 'En Curso...', content: 'Esperando respuesta...', color: 'var(--color)' });

            if (!AZauthEmail.value || !AZauthPassword.value) {
                PopupLogin.openPopup({ title: 'Error de Sesion', content: 'Tienes que rellenar todos los campos.', options: true });
                return;
            }

            let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);
            await this.handleAZauthConnect(AZauthConnect, loginAZauth, loginAZauthA2F, PopupLogin, AZauthEmail, AZauthPassword, AZauthA2F, AZauthClient);
        });
    }

    async handleAZauthConnect(AZauthConnect, loginAZauth, loginAZauthA2F, PopupLogin, AZauthEmail, AZauthPassword, AZauthA2F, AZauthClient) {
        if (AZauthConnect.error) {
            PopupLogin.openPopup({ title: 'Error', content: AZauthConnect.message, options: true });
        } else if (AZauthConnect.A2F) {
            loginAZauthA2F.style.display = 'block';
            loginAZauth.style.display = 'none';
            PopupLogin.closePopup();

            document.querySelector('.cancel-AZauth-A2F').addEventListener('click', () => {
                loginAZauthA2F.style.display = 'none';
                loginAZauth.style.display = 'block';
            });

            document.querySelector('.connect-AZauth-A2F').addEventListener('click', async () => {
                PopupLogin.openPopup({ title: 'En Curso..', content: 'Esperando verificacion en 2 pasos...', color: 'var(--color)' });

                if (!AZauthA2F.value) {
                    PopupLogin.openPopup({ title: 'Error', content: 'Pon tu codigo de verificacion 2FA.', options: true });
                    return;
                }

                AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2F.value);
                if (AZauthConnect.error) {
                    PopupLogin.openPopup({ title: 'Error', content: AZauthConnect.message, options: true });
                } else {
                    await this.saveData(AZauthConnect);
                    PopupLogin.closePopup();
                }
            });
        } else {
            await this.saveData(AZauthConnect);
            PopupLogin.closePopup();
        }
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData);
        configClient.account_selected = account.ID;

        let instancesList = await config.getInstanceList();
        let instanceSelect = configClient.instance_selct;

        for (let instance of instancesList) {
            if (instance.whitelistActive && !instance.whitelist.includes(account.name)) {
                if (instance.name === instanceSelect) {
                    let newInstanceSelect = instancesList.find(i => !i.whitelistActive);
                    configClient.instance_selct = newInstanceSelect.name;
                    await setStatus(newInstanceSelect.status);
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('lobby');
    }
}
export default Login;
