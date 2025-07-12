
const pkg = require('../package.json');
const nodeFetch = require("node-fetch")
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

import { database, stringToHash } from "../utils.js";

let config = `${url}/launcher/config-launcher/config.json`;
let news = `${url}/launcher/news-launcher/news.json`;

class Config {
    GetConfig() {
        return new Promise((resolve, reject) => {
            nodeFetch(config).then(async config => {
                if (config.status === 200) return resolve(config.json());
                else return reject({ error: { code: config.statusText, message: 'Servidor no accesible.' } });
            }).catch(error => {
                return reject({ error });
            })
        })
    }
    
    async getInstanceList() {
        let db = new database();
        let configClient = await db.readData('configClient');
        let instancesList = [];
        let user = await db.readData('accounts', configClient?.account_selected);
        if (!user) return instancesList;
        let username = user.name;
        if (!username) return instancesList;
        let data = {
            mc_username: username,
        };
        let urlInstance = `${url}/launcher/2K/files/`;
        let instances = await nodeFetch(urlInstance, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).then(res => {
            document.querySelector('.blacklist').style.display = res.status === 403 ? 'flex' : 'none';
            return res.json();
        }).catch(err => { return { error: err, status: err.status } });
        if (instances.error) {
            console.log(instances.error);
            return instancesList;
        }
        if(!instances) return instancesList;
        instances = Object.entries(instances)

        for (let [name, data] of instances) {
            let instance = data
            instance.name = await stringToHash(name, "SHA-1")
            instancesList.push(instance)
        }
        return instancesList
    }

    async getNews() {
        return new Promise((resolve, reject) => {
            nodeFetch(news).then(async config => {
                if (config.status === 200) return resolve(config.json());
                else return reject({ error: { code: config.statusText, message: 'Internal server error, contacta con un staff para solucionar este error.' } });
            }).catch(error => {
                return reject({ error });
            })
        })
    }
}

export default new Config;