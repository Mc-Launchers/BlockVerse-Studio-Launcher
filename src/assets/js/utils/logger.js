import { config, appdata } from '../utils.js';
const fs = require('fs');
const path = require('path');

let originalMethods = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    debug: console.debug,
    error: console.error
};

let instance = null;

const getFormattedDate = () => new Date().toISOString().replace(/[:.]/g, '-');

const sensitiveKeywords = [
    'token',
    'password',
    'api_key',
    'ssn',
    'secret',
    'creditCard',
    'scope',
    'url'
];

function censorSensitiveData(value) {
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) return value.map(censorSensitiveData);
        
        const censoredObject = {};
        for (const key in value) {
            if (!value.hasOwnProperty(key)) continue;
            censoredObject[key] = sensitiveKeywords.some(keyword => key.toLowerCase().includes(keyword)) && typeof value[key] === 'string' ? '[CENSORED]' : censorSensitiveData(value[key]);
        }
        return censoredObject;
    }
    return value;
}

function objectToString(value) {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== 'object') {
        return value.constructor && value.constructor.name ? `${value.constructor.name} ${String(value)}` : String(value);
    }
    const censoredValue = censorSensitiveData(value);
    if (value.constructor && value.constructor.name) {
        return `${value.constructor.name} ${JSON.stringify(censoredValue, null, 2)}`;
    }
    return JSON.stringify(censoredValue, null, 2);
}

class logger {
    constructor(name, color, logToFile = true) {
        if (!instance) {
            instance = this;
            this.initializeGlobalLogger();
        }
        
        instance.name = name;
        instance.color = color;
        instance.logToFile = logToFile;
        
        return instance;
    }
    
    async initializeGlobalLogger() {
        this.config = await config.GetConfig().catch(err => {
            throw new Error(`Failed to load configuration: ${err.message || err}`);
        });
        
        this.logDir = path.join(await appdata(), this.config.dataDirectory, 'logs');
        this.logFile = path.join(this.logDir, `latest.log`);

        this.createLogDirectory();
        this.handlePreviousLogFile();
        this.initializeLogFile();
        this.overrideConsoleMethods();
    }

    createLogDirectory() {
        fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    handlePreviousLogFile() {
        if (!fs.existsSync(this.logFile)) return;
        const firstLine = fs.readFileSync(this.logFile, 'utf-8').split('\n')[0] || '';
        const timestampMatch = firstLine.match(/\[(.*?)\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : getFormattedDate();
        const oldLogFile = path.join(this.logDir, `logs333_${timestamp.replace(/[:.]/g, '-')}.log`);
        
        fs.renameSync(this.logFile, oldLogFile);
    }
    
    initializeLogFile() {
        const header = `[${getFormattedDate()}] [${this.name}] Logger initialized.\n`;
        fs.writeFileSync(this.logFile, header, 'utf-8');
    }
    
    formatMessage(level, value) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${this.name}] [${level.toUpperCase()}]: ${value}`;
    }
    
    writeToFile(level, value) {
        const message = this.formatMessage(level, objectToString(value));
        fs.appendFileSync(this.logFile, `${message}\n`, 'utf-8');
    }
    
    overrideConsoleMethods() {
        Object.keys(originalMethods).forEach(level => {
            console[`${level}File`] = (value) => {
                this.writeToFile(level, value);
            };

            console[level] = (value) => {
                originalMethods[level].call(console, `%c[${this.name}]:`, `color: ${this.color}`, value);
                if (this.logToFile) this.writeToFile(level, value);
            };
        });
    }
}
new logger('INITIALIZING', '#086680');

export default logger;