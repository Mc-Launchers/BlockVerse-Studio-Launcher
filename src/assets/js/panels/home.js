
import { config, database, logger, changePanel, appdata, setStatus, pkg, hashObject } from '../utils.js'

// const { Launch } = require('minecraft-java-core')
const { Launch } = require('mc-java-core-333');
const { shell, ipcRenderer, BrowserWindow, Notification  } = require('electron')
const fs = require('fs');
const path = require('path');
const Swal = require("sweetalert2");
// const instanceElement = document.querySelector('.instance-elements');
let instancesList = await config.getInstanceList();
const webhookURL = "https://discord.com/api/webhooks/1296199642605686844/KYfJjfF-uzZrvrxSkHIJo3ww5hBfy-7vjfJWMCvISfrL9lXc-eTz6x5jnHHOFU6GLScb";



const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
});


const fetch = require("node-fetch");
let offlineMode = false;
fetch("https://google.com").then(async () => {
    offlineMode = false;
}).catch(async () => {
    offlineMode = true;
})

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        this.IniciarEstadoDiscord();
        this.setBackgroundImage();
    }

    async IniciarEstadoDiscord() {
        // ipcRenderer.send('new-status-discord');
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
        document.querySelector('.lobby-button').addEventListener('click', e => changePanel('lobby'));
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">ERROR</div>
                            <div class="month">ERROR</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No pudimos mostrarte las novedades.</br>Posiblemente tengas que hacer un reinicio al lanzador..</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author"><span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">ERROR</div>
                            <div class="month">ERROR</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No pudimos mostrarte las novedades.</br>Posiblemente tengas que hacer un reinicio al lanzador..</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }
    
    async setBackgroundImage(instanceName = null) {
        // let body = document.querySelector('.background-video-container');
        let configClient = await this.db.readData('configClient');
        // let instancesList = await config.getInstanceList();
        let comparator = instanceName || configClient?.instanceSelect;
        let instanceSelect = instancesList.find(i => i.name == comparator);
        if (!instanceSelect) {
            if (instancesList.length === 0) return;

            let newInstanceSelect = instancesList[0]
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect
            await this.db.updateData('configClient', configClient)
        }
        // let options = instancesList.find(i => i.name == configClient.instance_selct);
        // let background = `url(${options.status.background})`;
        
        // let img = new Image();
        let img = document.querySelector('.background-video-container-img');
        img.src = instanceSelect.status.background;
        let icon = document.querySelector('.info-starting-game-img');
        icon.src = instanceSelect.status.icon || './assets/images/icon.png';
        
        // const startTime = Date.now();
        
        // img.onload = () => {
        //     const elapsedTime = Date.now() - startTime;
        //     const remainingTime = Math.max(0, 1000 - elapsedTime);
            
        //     setTimeout(() => {
        //         body.style.backgroundImage = background;
        //     }, remainingTime);
        // };
    }
    
    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient?.account_selected)
        // let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct) ? configClient?.instance_selct : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        // let instanceCloseBTN = document.querySelector('.close-popup')

        // if (instancesList.length < 1) {
        //     document.querySelector('.instance-select').style.display = 'none'
        //     instanceBTN.style.paddingRight = '0'
        // }

        if (!instanceSelect && instancesList.length > 0) {
            let newInstanceSelect = instancesList[0]
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.name == instanceSelect) setStatus(instance.status)
            if (instance.whitelistActive) {
                console.log(`Iniciando instancia ${instance.status.nameServer}...`)
                continue;
            }
            let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
            if (whitelist === auth?.name) {
                continue;
            }
            if (instance.name != instanceSelect) {
                continue;
            }
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            setStatus(newInstanceSelect.status)
            await this.db.updateData('configClient', configClient)
        }

        instancePopup.addEventListener('click', async e => {
            // let body = document.querySelector('.background-video-container');
            let configClient = await this.db.readData('configClient');
            // let instance = await config.getInstanceList();
            let instance = instancesList;
            
            let element = e.target.closest('.instance-elements')
            if (element) {
                let newInstanceSelect = element.id;
                let activeInstanceSelect = document.querySelector('.active-instance');
        
                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                element.classList.add('active-instance');
                
                configClient.instance_selct = newInstanceSelect;
                await this.db.updateData('configClient', configClient);
                
                let options = instance.find(i => i.name == configClient.instance_selct);
                
                let loadingPopup = document.getElementById('loading-popup');
                loadingPopup.style.display = 'flex';
                
                // let background = `url(${options.status.background})`;
                
                // let img = new Image();
                let img = document.querySelector('.background-video-container-img');
                img.src = options.status.background;
                let icon = document.querySelector('.info-starting-game-img');
                icon.src = options.status.icon || './assets/images/icon.png';
                
                // const startTime = Date.now();
                
                // img.onload = () => {
                //     const elapsedTime = Date.now() - startTime;
                //     const remainingTime = Math.max(0, 2000 - elapsedTime);
        
                //     setTimeout(() => {
                //         body.style.backgroundImage = background;
                //     }, remainingTime);
                // };
                
                // instancePopup.style.display = 'none';
                
                let videoPath = options.status.background;
                let videoElement = document.getElementById('background-video');
                videoElement.src = videoPath;
                videoElement.play();
                
                videoElement.addEventListener('playing', () => {
                    loadingPopup.style.display = 'none';
                });
                
                await setStatus(options.status);
                loadingPopup.style.display = 'none';
            }
        });
        
        

        instanceBTN.addEventListener('click', async e => {
            // let configClient = await this.db.readData('configClient')
            // let instanceSelect = configClient.instance_selct
            // let auth = await this.db.readData('accounts', configClient?.account_selected)

            // if (e.target.classList.contains('instance-select')) {
            //     instancesListPopup.innerHTML = ''
            //     for (let instance of instancesList) {
            //         if (instance.whitelistActive) {
            //             instance.whitelist.map(whitelist => {
            //                 if (whitelist == auth?.name) {
            //                     if (instance.name == instanceSelect) {
            //                         instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
            //                     } else {
            //                         instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
            //                     }
            //                 }
            //             })
            //         } else {
            //             if (instance.name == instanceSelect) {
            //                 instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
            //             } else {
            //                 instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
            //             }
            //         }
            //     }

            //     instancePopup.style.display = 'flex'
            // }
            
            if (e.target.classList.contains('play-btn')) this.startGame()
        })

        // instanceCloseBTN.addEventListener('click', () => {
        //     instancePopup.classList.add('fade-out'); 
        //     setTimeout(() => {
        //       instancePopup.style.display = 'none'; 
        //       instancePopup.classList.remove('fade-out'); 
        //     }, 500); 
        //   });
    
        
        //   instancePopup.style.display = 'none';
        this.updateInstances(instancesList);
        // instancePopup.style.display = 'flex'
        //   instancePopup.classList.remove('fade-out');
        this.keepInstancesUpdated();
    }

    async updateInstances(instancesList) {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient?.account_selected)
        let instancesListPopup = document.querySelector('.instances-List');
        let instanceSelectName = instancesList.find(i => i.name == configClient?.instance_selct) ? configClient?.instance_selct : null;

        if (!instanceSelectName && instancesList.length > 0) {
            let newInstanceSelect = instancesList[0]
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelectName = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }
        
        instancesListPopup.innerHTML = ''
        for (let instance of instancesList) {
            let background = instance.status.icon || './assets/images/icon.png';
            let htmlContent = `<div id="${instance.name}" class="instance-elements${instance.name == instanceSelectName? ' active-instance' : ''}"><img src="${background}"/></div>`
            if (!instance.whitelistActive) {
                instancesListPopup.innerHTML += htmlContent
                continue;
            }
            // omg this is f*cking trash
            // instance.whitelist.map(whitelist => {
            //     if (!(whitelist == auth?.name)) return;
            //     instancesListPopup.innerHTML += htmlContent
            // })
            if (!instance.whitelist.includes(auth?.name)) continue;
            instancesListPopup.innerHTML += htmlContent;
        }
        this.setBackgroundImage(instanceSelectName);
    }

    async keepInstancesUpdated() {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            if (document.querySelector(".info-starting-game-text").innerHTML.startsWith("Jugando")) continue;
            let updatedList = await config.getInstanceList();
            let updatedHash = await hashObject(updatedList);
            let instancesHash = await hashObject(instancesList);
            if (instancesHash === updatedHash) continue;
            this.updateInstances(updatedList);
            instancesList = updatedList;
            console.log('Instancias actualizadas.');
        }
    }

    async startGame() {
        let instancesListPopup = document.querySelector('.instance-popup');
        let launch = new Launch()
        let configClient = await this.db.readData('configClient')
        let instance = await config.getInstanceList()
        let authenticator = await this.db.readData('accounts', configClient?.account_selected)
        let options = instance.find(i => i.name == configClient.instance_selct)

        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')
        let tooltip = document.querySelector('.progress-container .tooltip')
        let sub_infoStarting = document.querySelector(".info-starting-game-subtext")
        let sub_progressBar = document.querySelector('.sub-progress-bar')
        let sub_progressFill = document.querySelector('.sub-progress-fill')
        let percentage_text = document.querySelector('.info-starting-game-percentage')
        
        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${await appdata()}/${this.config.dataDirectory}`,
            instance: options.name,
            version: options.loadder.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loadder.loadder_type,
                build: options.loadder.loadder_version,
                enable: options.loadder.loadder_type == 'none' ? false : true
            },

            verify: options.verify,

            ignored: [...options.ignored],

            javaPath: configClient.java_config.java_path,

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },
            
            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }
        
        launch.Launch(opt);
        
        instancesListPopup.style.display = 'none';
        playInstanceBTN.style.display = "none"
        infoStartingBOX.style.display = "flex"
        progressBar.style.display = "";
        sub_progressBar.style.display = "";
        sub_infoStarting.style.display = "";
        percentage_text.style.display = "";
        
        const progressValues = {
            progress: 10,
            extract: 20,
            check: 30,
            patch: 40,
            data: 50,
        }
          
        let max_sub_progress_value = Math.max(...Object.values(progressValues));
        let get_sub_progress_percentage = (value) => {
            return `${value > 0 ? ((value / max_sub_progress_value) * 100).toFixed(0) : 0}%`
        };
        let mods_dir = path.join(opt.path, 'instances', opt.instance, 'mods');
        let count_patches = 0;
        sub_progressFill.style.width = '0%';
        ipcRenderer.send('main-window-progress-load')
        ipcRenderer.send('new-status-discord-jugando',  `Jugando a ${options.status.discord_info}`, `${options.status.discordrpc_icon}`)
        const mensajeDiscord = {
            embeds: [
                {
                    title: `${pkg.preductname} - Version: ${pkg.version}/Streamers`,
                    thumbnail: {
                        url: `https://minotar.net/helm/${authenticator.name}/600.png`,
                    },
                    fields: [
                        {
                            name: 'Instancia',
                            value: options.name,
                            inline: true,
                        },
                        {
                            name: 'Usuario',
                            value: `${authenticator.name}`,
                            inline: true,
                        },
                        {
                            name: 'RPC Mostrado',
                            value: options.status.discord_info,
                            inline: true,
                        },
                    ],
                    color: 16776960,
                },
            ],
        };
        
        fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mensajeDiscord),
        });

        const Toast = Swal.mixin({
            toast: true,
            position: "top-start",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });
        Toast.fire({
            icon: "info",
            title: "Preparando el juego.."
        });


        launch.on('extract', extract => {
            sub_progressFill.style.width = get_sub_progress_percentage(progressValues.extract);
            sub_infoStarting.innerHTML = `Extrayendo Forge...`;
            ipcRenderer.send('main-window-progress-load')
            console.log(extract);
        });

        launch.on('progress', (progress, size, element) => {
            sub_progressFill.style.width = get_sub_progress_percentage(progressValues.progress);
            sub_infoStarting.innerHTML = `Descargando archivos...`
            // const progressMB = Math.floor(progress / (1024 * 1024));
            // const sizeMB = Math.floor(size / (1024 * 1024));
            const percentage = size > 0 ? ((progress / size) * 100).toFixed(1) : 0;
            // infoStarting.innerHTML = `${options.name}`;
            // tooltip.innerHTML = `${progressMB} MB / ${sizeMB} MB`;
            percentage_text.innerHTML = `${percentage}%`;
            console.debugFile(`Descargando archivos... ${progress} / ${size} (${element})`);
            ipcRenderer.send('main-window-progress', { progress, size });
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('check', (progress, size, element) => {
            sub_progressFill.style.width = get_sub_progress_percentage(progressValues.check);
            sub_infoStarting.innerHTML = `Verificando librerías...`;
            percentage_text.innerHTML = `${((progress / size) * 100).toFixed(0)}%`;
            console.debugFile(`Verificando librerías... ${progress} / ${size} (${element})`);
            ipcRenderer.send('main-window-progress', { progress, size });
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            let estimated = `${hours}h ${minutes}m ${seconds}s`
            // console.log(estimated);
            infoStarting.innerHTML = estimated !== `0h 0m 0s` ? estimated : '';
        })

        launch.on('speed', (speed) => {
            let fixed = `${(speed / 1067008).toFixed(2)} Mb/s`;
            // console.log(fixed);
            tooltip.innerHTML = fixed;
        })

        launch.on('patch', patch => {
            sub_progressFill.style.width = get_sub_progress_percentage(progressValues.patch);
            sub_infoStarting.innerHTML = `Parcheando Forge...`;
            let max_value = count_patches + 500;
            progressBar.max = max_value;
            count_patches++;
            progressBar.value = count_patches;
            console.debug(`Parcheando Forge... ${count_patches} / ${max_value} (${patch})`);
            percentage_text.innerHTML = `${((count_patches / max_value) * 100).toFixed(0)}%`;
            ipcRenderer.send('main-window-progress-load')
        });

        launch.on('data', (e) => {
            if (e.startsWith('Launching with arguments')) this.copyFiles(path.join(opt.path, 'instances', opt.instance, 'libs'), mods_dir);
            // sub_progressFill.style.width = get_sub_progress_percentage(progressValues.data);
            progressBar.style.display = "none"
            sub_progressBar.style.display = "none"
            sub_infoStarting.style.display = "none"
            percentage_text.style.display = "none"
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030', false);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Jugando ${options.status.nameServer}`
            
            console.log(e);
        });

        launch.on('close', code => {
            this.cleanDirectory(mods_dir);
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "block"
            instancesListPopup.style.display = 'flex';
        
            sub_infoStarting.innerHTML = `Volviendo...`
            infoStarting.innerHTML = ''
            new logger('LAUNCHER', '#7289da');
            console.log('Close');
            
            ipcRenderer.send('delete-and-new-status-discord')
        });

        launch.on('error', err => {
            ipcRenderer.send('main-window-progress-reset')
            console.error(err);
        });
    }

    async copyFiles(sourceDir, targetDir) {
        if (!fs.existsSync(sourceDir)) {
            console.error(`No such directory: ${sourceDir}`);
            return;
        }
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filesToCopy = [];

        function findFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    findFiles(fullPath);
                } else {
                    filesToCopy.push(fullPath);
                }
            }
        }
        findFiles(sourceDir);

        for (const file of filesToCopy) {
            const targetPath = path.join(targetDir, path.basename(file));
            fs.copyFileSync(file, targetPath);
            console.log(`Copiado: ${file} -> ${targetPath}`);
        }
    }

    async cleanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        fs.readdirSync(dir).forEach((file) => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                this.cleanDirectory(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dir);
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}
export default Home;