/**
* @author Benjas333
*/
import { config, database, changePanel, setStatus, hashObject, popup } from '../utils.js';

const { ipcRenderer } = require('electron');
let instancesList = await config.getInstanceList();

class Lobby {
        static id = "lobby";
        async init(config) {
                this.config = config;
                this.db = new database();
                this.instancesSelect();
                this.IniciarEstadoDiscord();
                this.setBackgroundImage();
        }

        async IniciarEstadoDiscord() {
                ipcRenderer.send('new-status-discord');
                document.querySelector('.lobby-settings-btn').addEventListener('click', e => changePanel('settings'));
        }

        async setBackgroundImage() {
                let body = document.body;
                let bg_path = 'assets/images/background/dark/1.png';
                let background = `url(${bg_path})`;
                
                let img = new Image();
                img.src = bg_path;
                
                const startTime = Date.now();
                
                img.onload = () => {
                        const elapsedTime = Date.now() - startTime;
                        const remainingTime = Math.max(0, 1000 - elapsedTime);
                        
                        setTimeout(() => {
                                body.style.backgroundImage = background;
                        }, remainingTime);
                };
        }

        async instancesSelect() {
                let instancePopup = document.querySelector('.lobby-instance-popup');
                
                instancePopup.addEventListener('click', async e => {
                        let configClient = await this.db.readData('configClient');
                        let instance = instancesList;
                        
                        let element = e.target.closest('.lobby-instance-elements')
                        if (!element) return;
                        let newInstanceSelect = element.id;
                        let activeInstanceSelect = document.querySelector('.active-instance');
                        
                        if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                        document.querySelector(`.instance-elements[id="${newInstanceSelect}"]`).classList.add('active-instance');
                        
                        configClient.instance_selct = newInstanceSelect;
                        await this.db.updateData('configClient', configClient);

                        let options = instance.find(i => i.name == configClient.instance_selct);
                        
                        let loadingPopup = document.getElementById('loading-popup');
                        loadingPopup.style.display = 'flex';

                        let img = document.querySelector('.background-video-container-img');
                        img.src = options.status.background;
                        let icon = document.querySelector('.info-starting-game-img');
                        icon.src = options.status.icon || './assets/images/icon.png';
                        
                        let videoPath = options.status.background;
                        let videoElement = document.getElementById('background-video');
                        videoElement.src = videoPath;
                        videoElement.play();
                        
                        videoElement.addEventListener('playing', () => {
                                loadingPopup.style.display = 'none';
                        });
                        
                        changePanel('home');
                        await setStatus(options.status);
                        loadingPopup.style.display = 'none';
                });
                document.querySelector('.log-out').addEventListener('click', async e => {
                        let popupAccount = new popup();
                        try {
                                // let id = e.target.id;
                                popupAccount.openPopup({
                                        title: 'AVISO',
                                        content: 'Cerrando sesión...',
                                        color: 'var(--color)'
                                });
                                let accountListElement = document.querySelector('.accounts-list');
                                Array.from(accountListElement.children).forEach(async child => {
                                        if (!child.classList.contains('account')) return;
                                        const id = child.id;
                                        try {
                                                console.log(`Eliminando cuenta: ${id}`);
                                                await this.db.deleteData('accounts', id);
                                        } catch (error) {
                                                console.error(error);
                                        }
                                        accountListElement.removeChild(child);
                                });
                                // await this.db.deleteData('accounts', id);
                                document.querySelector('.empty-instances').style.display = 'none';
                                // let deleteProfile = document.getElementById(`${id}`);
                                // accountListElement.removeChild(deleteProfile);
                                // if (accountListElement.children.length == 1)
                                return changePanel('login');
                                // let configClient = await this.db.readData('configClient');
        
                                // if (configClient?.account_selected == id) {
                                //         let allAccounts = await this.db.readAllData('accounts');
                                //         configClient.account_selected = allAccounts[0].ID
                                //         accountSelect(allAccounts[0]);
                                //         let newInstanceSelect = await this.setInstance(allAccounts[0]);
                                //         configClient.instance_selct = newInstanceSelect.instance_selct
                                //         return await this.db.updateData('configClient', configClient);
                                // }
                        } catch (err) {
                                console.error(err)
                        } finally {
                                popupAccount.closePopup();
                        }
                        
                });
                this.updateInstances(instancesList);
                this.keepInstancesUpdated();
        }

        async updateInstances(instancesListArg = []) {
                if (!instancesListArg) {
                        instancesListArg = instancesList;
                }
                let configClient = await this.db.readData('configClient');
                let auth = await this.db.readData('accounts', configClient?.account_selected);
                let instancesListPopup = document.querySelector('.lobby-instances-List');
                
                if (!!auth) {
                        document.querySelector('.empty-instances').style.display = instancesListArg.length > 0 ? 'none' : 'flex';
                        document.querySelector('.log-out').id = auth.ID;
                }

                instancesListPopup.innerHTML = '';
                for (let instance of instancesListArg) {
                        let background = instance.status.background;
                        let htmlContent = `<div id="${instance.name}" class="lobby-instance-elements"><img src="${background}"/><div class="tooltip"><span>${instance.status.nameServer}</span></div></div>`;
                        if (!instance.whitelistActive) {
                                instancesListPopup.innerHTML += htmlContent;
                                continue;
                        }
                        if (!instance.whitelist.includes(auth?.name)) continue;
                        instancesListPopup.innerHTML += htmlContent;
                }
        }

        async keepInstancesUpdated() {
                while (true) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        document.querySelector('.empty-instances').style.display = !document.querySelector(`.login.active`) && instancesList.length === 0 ? 'flex' : 'none';
                        let updatedList = await config.getInstanceList();
                        let updatedHash = await hashObject(updatedList);
                        let instancesHash = await hashObject(instancesList);
                        if (instancesHash === updatedHash) continue;
                        this.updateInstances(updatedList);
                        instancesList = updatedList;
                        console.log('Instancias actualizadas.');
                }
        }
}
export default Lobby;